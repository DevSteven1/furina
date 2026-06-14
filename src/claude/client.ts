import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { ClaudeEvent, ResultEvent, SystemInitEvent } from "./events.js";

export interface QueryOptions {
  /** Directorio de trabajo para la sesion de claude. */
  cwd?: string;
  /** Modelo a usar (ej. "claude-opus-4-8"). */
  model?: string;
  /** Lista de herramientas permitidas (ej. ["Read", "Bash(git *)"]). */
  allowedTools?: string[];
  /** Texto que se anade al system prompt por defecto. */
  appendSystemPrompt?: string;
  /** Modo de permisos de la sesion. */
  permissionMode?: "default" | "acceptEdits" | "plan" | "bypassPermissions";
  /** ID de sesion a reanudar para continuar una conversacion previa. */
  resume?: string;
  /** Ruta al binario de claude. Por defecto "claude" en el PATH. */
  claudePath?: string;
  /** Permite cancelar la consulta. */
  signal?: AbortSignal;
}

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

export function buildArgs(prompt: string, options: QueryOptions = {}): string[] {
  const args = [
    "-p",
    prompt,
    "--output-format",
    "stream-json",
    "--verbose",
  ];
  if (options.resume) args.push("--resume", options.resume);
  if (options.model) args.push("--model", options.model);
  if (options.permissionMode) {
    args.push("--permission-mode", options.permissionMode);
  }
  if (options.appendSystemPrompt) {
    args.push("--append-system-prompt", options.appendSystemPrompt);
  }
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push("--allowed-tools", options.allowedTools.join(","));
  }
  return args;
}

/**
 * Spawnea el CLI de claude en modo headless y emite cada evento del stream
 * JSONL a medida que llega.
 */
export async function* stream(
  prompt: string,
  options: QueryOptions = {},
): AsyncGenerator<ClaudeEvent> {
  const child = spawn(options.claudePath ?? "claude", buildArgs(prompt, options), {
    cwd: options.cwd,
    stdio: ["ignore", "pipe", "pipe"],
    signal: options.signal,
  });

  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
  });

  const exited = new Promise<number>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 0));
  });

  const lines = createInterface({ input: child.stdout });
  try {
    for await (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        yield JSON.parse(trimmed) as ClaudeEvent;
      } catch {
        // Ignora lineas que no sean JSON valido (ruido del proceso).
      }
    }
  } finally {
    lines.close();
  }

  const code = await exited;
  if (code !== 0) {
    throw new ClaudeError(`claude exited with code ${code}`, code, stderr.trim());
  }
}

export interface QueryResult {
  /** Texto final de la respuesta. */
  text: string;
  /** ID de la sesion, util para continuarla despues. */
  sessionId: string;
  /** Indica si claude reporto un error en el resultado. */
  isError: boolean;
  numTurns: number;
  durationMs: number;
  costUsd: number;
}

/**
 * Ejecuta una consulta completa y devuelve el resultado final, descartando los
 * eventos intermedios. Para streaming en tiempo real, usa `stream`.
 */
export async function query(
  prompt: string,
  options: QueryOptions = {},
): Promise<QueryResult> {
  let result: ResultEvent | undefined;
  let sessionId = "";

  for await (const event of stream(prompt, options)) {
    if (event.type === "system" && event.subtype === "init") {
      sessionId = (event as SystemInitEvent).session_id;
    } else if (event.type === "result") {
      result = event as ResultEvent;
    }
  }

  if (!result) {
    throw new ClaudeError("claude did not return a result event", null, "");
  }

  return {
    text: result.result,
    sessionId: result.session_id || sessionId,
    isError: result.is_error,
    numTurns: result.num_turns,
    durationMs: result.duration_ms,
    costUsd: result.total_cost_usd,
  };
}
