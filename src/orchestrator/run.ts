import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { plan } from "./planner.js";
import { synthesize } from "./synth.js";
import type { AgentResult } from "./synth.js";
import { spawnAgents, killInstances } from "./manager.js";
import { runDir, agentResultPath, agentDonePath, planPath, summaryPath } from "./runs.js";

export interface DoOptions {
  model?: string;
  gap?: number;
  /** Cierra las ventanas de los agentes al terminar. */
  kill?: boolean;
  /** Tiempo maximo (ms) que se espera a que todos los agentes terminen. */
  timeoutMs?: number;
  /** Notifica el progreso (por defecto, nada). */
  onProgress?: (message: string) => void;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 500;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export interface DoResult {
  runId: string;
  dir: string;
  summary: string;
  /** Indices (1-based) de agentes que no llegaron a terminar a tiempo. */
  timedOut: number[];
}

/**
 * Flujo completo de orquestacion: planifica la division de la tarea, lanza un
 * agente por subtarea, espera a que todos terminen y sintetiza una respuesta
 * final. Devuelve la sintesis y la deja escrita en el directorio de la run.
 */
export async function runDo(task: string, options: DoOptions = {}): Promise<DoResult> {
  const progress = options.onProgress ?? (() => {});
  const runId = Date.now().toString(36);
  const dir = runDir(runId);
  await mkdir(dir, { recursive: true });

  progress("Planificando la division en agentes...");
  const agents = await plan(task, { model: options.model });
  await writeFile(planPath(dir), JSON.stringify({ task, agents }, null, 2), "utf8");
  progress(`Plan: ${agents.length} agente(s). Lanzando ventanas...`);

  const specs = agents.map((agent, i) => ({
    title: agent.title,
    prompt: agent.prompt,
    out: agentResultPath(dir, i + 1),
  }));
  await spawnAgents(specs, { model: options.model, gap: options.gap });

  progress("Esperando a que los agentes terminen...");
  const timedOut = await waitForAgents(dir, agents.length, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  const results: AgentResult[] = [];
  for (let i = 0; i < agents.length; i++) {
    const path = agentResultPath(dir, i + 1);
    const content = (await exists(path)) ? await readFile(path, "utf8") : "[sin resultado: el agente no termino a tiempo]";
    results.push({ title: agents[i]!.title, content });
  }

  progress("Sintetizando la respuesta final...");
  const summary = await synthesize(task, results, { model: options.model });
  await writeFile(summaryPath(dir), summary, "utf8");

  if (options.kill) {
    progress("Cerrando las ventanas de los agentes...");
    await killInstances();
  }

  return { runId, dir, summary, timedOut };
}

/** Espera a que aparezca la marca `.done` de cada agente, hasta el timeout. */
async function waitForAgents(dir: string, count: number, timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pending: number[] = [];
    for (let i = 1; i <= count; i++) {
      if (!(await exists(agentDonePath(dir, i)))) pending.push(i);
    }
    if (pending.length === 0) return [];
    await delay(POLL_INTERVAL_MS);
  }
  const stillPending: number[] = [];
  for (let i = 1; i <= count; i++) {
    if (!(await exists(agentDonePath(dir, i)))) stillPending.push(i);
  }
  return stillPending;
}
