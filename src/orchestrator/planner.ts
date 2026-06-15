import { query } from "../claude/client.js";

export interface AgentTask {
  /** Titulo corto de la subtarea (sirve de etiqueta de la ventana). */
  title: string;
  /** Prompt autonomo que ejecutara el agente de esta subtarea. */
  prompt: string;
}

/** Instrucciones que convierten a claude en el planificador de furina. */
export const PLANNER_SYSTEM = `Eres el planificador de furina. Recibes una tarea de alto nivel y la divides en subtareas independientes, cada una asignada a un agente que trabajara en paralelo y por separado (no se ven entre si).

Reglas:
- Cada subtarea debe ser autonoma: su prompt tiene que contener todo el contexto necesario para resolverla sin depender de las demas.
- Crea entre 2 y 6 agentes. Usa menos si la tarea es simple; no inventes trabajo.
- El prompt de cada agente va dirigido directamente a ese agente, en imperativo.

Responde UNICAMENTE con un objeto JSON valido, sin texto antes ni despues, sin markdown, con esta forma exacta:
{"agents":[{"title":"...","prompt":"..."}]}`;

/** Construye el prompt del planner para una tarea concreta. */
export function buildPlannerPrompt(task: string): string {
  return `Tarea a dividir:\n\n${task}`;
}

/**
 * Extrae y valida el plan del texto devuelto por claude. Tolera que el JSON
 * venga envuelto en vallas de codigo o con texto alrededor: toma el primer
 * objeto `{...}` equilibrado que encuentre.
 */
export function parsePlan(text: string): AgentTask[] {
  const json = extractJsonObject(text);
  if (!json) throw new Error("el planner no devolvio un objeto JSON");

  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("el JSON del planner no se pudo parsear");
  }

  const agents = (data as { agents?: unknown }).agents;
  if (!Array.isArray(agents) || agents.length === 0) {
    throw new Error("el plan no contiene una lista 'agents' no vacia");
  }

  return agents.map((raw, i) => {
    const a = raw as { title?: unknown; prompt?: unknown };
    if (typeof a.prompt !== "string" || a.prompt.trim() === "") {
      throw new Error(`el agente ${i + 1} no tiene un 'prompt' valido`);
    }
    const title = typeof a.title === "string" && a.title.trim() !== "" ? a.title : `Agente ${i + 1}`;
    return { title, prompt: a.prompt };
  });
}

/** Devuelve el primer objeto JSON equilibrado del texto, o null. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export interface PlanOptions {
  model?: string;
  claudePath?: string;
}

/**
 * Pide a claude que divida la tarea en subtareas. Si la respuesta no es un plan
 * valido, reintenta una vez con una instruccion mas estricta.
 */
export async function plan(task: string, options: PlanOptions = {}): Promise<AgentTask[]> {
  const base = {
    model: options.model,
    claudePath: options.claudePath,
    appendSystemPrompt: PLANNER_SYSTEM,
  };

  const first = await query(buildPlannerPrompt(task), base);
  try {
    return parsePlan(first.text);
  } catch {
    const retry = await query(
      `${buildPlannerPrompt(task)}\n\nIMPORTANTE: responde solo con el objeto JSON, sin nada mas.`,
      base,
    );
    return parsePlan(retry.text);
  }
}
