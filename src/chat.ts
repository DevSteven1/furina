import { createInterface } from "node:readline/promises";
import { stdin, stdout, stderr } from "node:process";
import { stream, ClaudeError } from "./claude/client.js";
import type { AssistantEvent, ResultEvent, SystemInitEvent } from "./claude/events.js";

const WELCOME = `furina - chat interactivo
Escribe tu mensaje y pulsa Enter. Comandos:
  /new    inicia una conversacion nueva (olvida el contexto)
  /help   muestra esta ayuda
  /exit   salir (tambien Ctrl+C o Ctrl+D)
`;

/** Inicia un chat interactivo manteniendo el contexto via sessionId. */
export async function runChat(): Promise<number> {
  stdout.write(WELCOME);

  const rl = createInterface({ input: stdin, output: stdout });
  let sessionId: string | undefined;

  try {
    while (true) {
      let input: string;
      try {
        input = (await rl.question("\nfurina> ")).trim();
      } catch {
        // Ctrl+C / Ctrl+D cierran el readline y lanzan aqui.
        break;
      }

      if (!input) continue;
      if (input === "/exit" || input === "/quit") break;
      if (input === "/help") {
        stdout.write(WELCOME);
        continue;
      }
      if (input === "/new") {
        sessionId = undefined;
        stdout.write("Conversacion nueva iniciada.\n");
        continue;
      }

      sessionId = await askTurn(input, sessionId);
    }
  } finally {
    rl.close();
  }

  return 0;
}

/** Ejecuta un turno y devuelve el sessionId actualizado para el siguiente. */
async function askTurn(prompt: string, sessionId: string | undefined): Promise<string | undefined> {
  let nextSession = sessionId;
  try {
    for await (const event of stream(prompt, { cwd: process.cwd(), resume: sessionId })) {
      if (event.type === "system" && event.subtype === "init") {
        nextSession = (event as SystemInitEvent).session_id;
      } else if (event.type === "assistant") {
        for (const block of (event as AssistantEvent).message.content) {
          if (block.type === "text" && typeof block.text === "string") {
            stdout.write(block.text);
          }
        }
      } else if (event.type === "result") {
        const result = event as ResultEvent;
        if (result.session_id) nextSession = result.session_id;
        if (result.is_error) stderr.write(`\nError: ${result.result}`);
      }
    }
    stdout.write("\n");
  } catch (error) {
    if (error instanceof ClaudeError) {
      stderr.write(`\nError: ${error.message}\n`);
      if (error.stderr) stderr.write(`${error.stderr}\n`);
    } else {
      throw error;
    }
  }
  return nextSession;
}
