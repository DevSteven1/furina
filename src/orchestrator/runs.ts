import { homedir } from "node:os";
import { join } from "node:path";

/** Raiz donde furina guarda el estado de cada ejecucion orquestada. */
export const FURINA_HOME = join(homedir(), ".furina");

/** Directorio de una ejecucion concreta. */
export function runDir(runId: string): string {
  return join(FURINA_HOME, "runs", runId);
}

/** Archivo donde un agente vuelca su resultado. */
export function agentResultPath(dir: string, index: number): string {
  return join(dir, `agent-${index}.md`);
}

/**
 * Marca que un agente crea al terminar; el orquestador la espera (poll). Por
 * convencion es el archivo de resultado con sufijo `.done` (el worker escribe
 * `${out}.done`), asi ambos lados coinciden.
 */
export function agentDonePath(dir: string, index: number): string {
  return `${agentResultPath(dir, index)}.done`;
}

/** Plan generado por el planner, guardado para inspeccion. */
export function planPath(dir: string): string {
  return join(dir, "plan.json");
}

/** Sintesis final de la ejecucion. */
export function summaryPath(dir: string): string {
  return join(dir, "summary.md");
}

/** Estado que un agente deja escrito dentro de su marcador `.done`. */
export type DoneStatus = "ok" | "error";

const DONE_OK = "ok";
const DONE_ERROR = "error";

/**
 * Texto que el worker escribe en el marcador `.done` segun como termino. El
 * orquestador lo interpreta con `parseDoneMarker`; ambos viven aqui para no
 * desincronizarse, igual que la convencion del propio nombre `.done`.
 */
export function doneMarker(ok: boolean): string {
  return ok ? DONE_OK : DONE_ERROR;
}

/** Interpreta el contenido de un marcador `.done`. Vacio cuenta como ok (compat). */
export function parseDoneMarker(raw: string): DoneStatus {
  return raw.trim() === DONE_ERROR ? "error" : "ok";
}
