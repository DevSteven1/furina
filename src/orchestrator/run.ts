import { mkdir, readFile, writeFile, access, rm } from "node:fs/promises";
import { plan } from "./planner.js";
import { synthesize } from "./synth.js";
import type { AgentResult } from "./synth.js";
import { spawnAgents, killInstances, showWorkspace, currentWorkspace, focusWorkspaceRef } from "./manager.js";
import { runDir, agentResultPath, agentDonePath, planPath, summaryPath, parseDoneMarker } from "./runs.js";

/** Como termino un agente: bien, con error, o sin terminar a tiempo. */
export type AgentStatus = "ok" | "error" | "timeout";

export interface DoOptions {
  model?: string;
  gap?: number;
  /** Cierra las ventanas de los agentes al terminar. */
  kill?: boolean;
  /** Lleva la vista al workspace de furina mientras trabajan (por defecto si). */
  watch?: boolean;
  /** Tiempo maximo (ms) que se espera a que todos los agentes terminen. */
  timeoutMs?: number;
  /** Veces que se relanza un agente que fallo o expiro (por defecto 1). */
  retries?: number;
  /** Notifica el progreso (por defecto, nada). */
  onProgress?: (message: string) => void;
}

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_RETRIES = 1;
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
  /** Indices (1-based) de agentes que terminaron con error. */
  failed: number[];
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

  // Recordamos donde esta el usuario para llevarlo a ver a los agentes y, al
  // terminar, devolverlo a su sitio (donde se imprime la sintesis).
  const watch = options.watch !== false;
  const origin = watch ? await currentWorkspace() : null;

  const indices = agents.map((_, i) => i + 1);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.retries ?? DEFAULT_RETRIES;
  // Estado final conocido de cada agente; se va refinando ronda a ronda.
  const statuses: AgentStatus[] = indices.map(() => "timeout");

  // En cada ronda (re)lanzamos solo los agentes que aun no han terminado bien.
  let pending = indices;
  for (let round = 0; ; round++) {
    if (round > 0) {
      progress(`Reintentando ${pending.length} agente(s) (intento ${round + 1})...`);
      await clearMarkers(dir, pending);
    }
    await spawnAgents(pending.map((i) => specs[i - 1]!), { model: options.model, gap: options.gap });
    if (round === 0 && watch) {
      progress("Llevandote al workspace de furina para ver a los agentes...");
      await showWorkspace();
    }

    progress("Esperando a que los agentes terminen...");
    const timedOut = await waitForAgents(dir, pending, timeoutMs);
    for (const i of pending) {
      statuses[i - 1] = await readAgentStatus(dir, i, timedOut.includes(i));
    }

    const toRetry = retryable(statuses);
    if (toRetry.length === 0 || round >= maxRetries) break;
    pending = toRetry;
  }

  if (origin) await focusWorkspaceRef(origin);

  const results: AgentResult[] = [];
  for (let i = 0; i < agents.length; i++) {
    const status = statuses[i]!;
    const path = agentResultPath(dir, i + 1);
    const content =
      status === "timeout"
        ? "[sin resultado: el agente no termino a tiempo]"
        : await readFile(path, "utf8");
    results.push({ title: agents[i]!.title, content, status });
  }

  progress("Sintetizando la respuesta final...");
  const summary = await synthesize(task, results, { model: options.model });
  await writeFile(summaryPath(dir), summary, "utf8");

  if (options.kill) {
    progress("Cerrando las ventanas de los agentes...");
    await killInstances();
  }

  return {
    runId,
    dir,
    summary,
    timedOut: indices.filter((i) => statuses[i - 1] === "timeout"),
    failed: indices.filter((i) => statuses[i - 1] === "error"),
  };
}

/**
 * Indices (1-based) de los agentes que conviene reintentar: los que no
 * terminaron bien (error o timeout). Sobre el estado global, equivale a los que
 * siguen pendientes tras la ultima ronda.
 */
export function retryable(statuses: AgentStatus[]): number[] {
  return statuses
    .map((status, i) => ({ status, index: i + 1 }))
    .filter(({ status }) => status !== "ok")
    .map(({ index }) => index);
}

/** Borra el resultado y la marca `.done` de unos agentes antes de relanzarlos. */
async function clearMarkers(dir: string, indices: number[]): Promise<void> {
  for (const i of indices) {
    await rm(agentResultPath(dir, i), { force: true });
    await rm(agentDonePath(dir, i), { force: true });
  }
}

/** Clasifica como termino un agente leyendo su marca `.done` (o timeout si falta). */
async function readAgentStatus(dir: string, index: number, timedOut: boolean): Promise<AgentStatus> {
  if (timedOut) return "timeout";
  const donePath = agentDonePath(dir, index);
  if (!(await exists(donePath))) return "timeout";
  return parseDoneMarker(await readFile(donePath, "utf8"));
}

/**
 * Espera a que aparezca la marca `.done` de los agentes dados, hasta el timeout.
 * Devuelve los indices que seguian sin terminar al agotarse el tiempo.
 */
async function waitForAgents(dir: string, indices: number[], timeoutMs: number): Promise<number[]> {
  const pendingNow = async (): Promise<number[]> => {
    const pending: number[] = [];
    for (const i of indices) {
      if (!(await exists(agentDonePath(dir, i)))) pending.push(i);
    }
    return pending;
  };

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pending = await pendingNow();
    if (pending.length === 0) return [];
    await delay(POLL_INTERVAL_MS);
  }
  return pendingNow();
}
