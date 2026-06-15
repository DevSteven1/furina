import { parseArgs } from "node:util";
import { stdin, stdout, stderr } from "node:process";
import { createInterface } from "node:readline/promises";
import { stream, ClaudeError } from "./claude/client.js";
import type { AssistantEvent, ResultEvent } from "./claude/events.js";

/** Espera a que el usuario pulse Enter para no cerrar la ventana al instante. */
async function waitForEnter(): Promise<void> {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    await rl.question("");
  } catch {
    // Ctrl+C / Ctrl+D tambien cierran.
  } finally {
    rl.close();
  }
}

/**
 * Punto de entrada de una instancia. Ejecuta un prompt contra claude en modo
 * headless y vuelca la respuesta en esta ventana, en vivo.
 */
export async function runWorker(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      id: { type: "string" },
      prompt: { type: "string" },
      model: { type: "string" },
    },
    allowPositionals: true,
  });

  const id = values.id ?? "?";
  const prompt = values.prompt ?? "Saluda.";

  const bar = "-".repeat(48);
  stdout.write(`\x1b[1mfurina worker #${id}\x1b[0m\n${bar}\n${prompt}\n${bar}\n\n`);

  try {
    for await (const event of stream(prompt, { cwd: process.cwd(), model: values.model })) {
      if (event.type === "assistant") {
        for (const block of (event as AssistantEvent).message.content) {
          if (block.type === "text" && typeof block.text === "string") {
            stdout.write(block.text);
          }
        }
      } else if (event.type === "result") {
        const result = event as ResultEvent;
        if (result.is_error) stderr.write(`\nError: ${result.result}`);
      }
    }
  } catch (error) {
    if (error instanceof ClaudeError) {
      stderr.write(`\nError: ${error.message}\n`);
      if (error.stderr) stderr.write(`${error.stderr}\n`);
    } else {
      throw error;
    }
  }

  stdout.write("\n\n\x1b[2m[furina] instancia terminada. Pulsa Enter para cerrar.\x1b[0m");
  await waitForEnter();
  return 0;
}
