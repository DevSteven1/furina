import { query } from "../claude/client.js";

export interface AgentResult {
  /** Titulo de la subtarea que produjo este resultado. */
  title: string;
  /** Texto que devolvio el agente. */
  content: string;
}

/** Instrucciones que convierten a claude en el sintetizador de furina. */
export const SYNTH_SYSTEM = `Eres el sintetizador de furina. Recibes la tarea original y los resultados de varios agentes que trabajaron por separado en subtareas. Combinalos en una unica respuesta final, coherente y sin repeticiones, que resuelva la tarea original. Senala los desacuerdos o huecos si los hay.`;

/** Construye el prompt de sintesis a partir de la tarea y los resultados. */
export function buildSynthPrompt(task: string, results: AgentResult[]): string {
  const blocks = results
    .map((r, i) => `## Agente ${i + 1}: ${r.title}\n\n${r.content}`)
    .join("\n\n");
  return `Tarea original:\n\n${task}\n\nResultados de los agentes:\n\n${blocks}`;
}

export interface SynthOptions {
  model?: string;
  claudePath?: string;
}

/** Junta los resultados de los agentes en una respuesta final unificada. */
export async function synthesize(
  task: string,
  results: AgentResult[],
  options: SynthOptions = {},
): Promise<string> {
  const result = await query(buildSynthPrompt(task, results), {
    model: options.model,
    claudePath: options.claudePath,
    appendSystemPrompt: SYNTH_SYSTEM,
  });
  return result.text;
}
