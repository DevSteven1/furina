import { parseArgs } from "node:util";
import { stdin, stdout, stderr } from "node:process";
import { writeFile } from "node:fs/promises";
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

/** Vuelca el resultado al archivo de salida y crea la marca `.done`. */
async function report(out: string, content: string): Promise<void> {
  await writeFile(out, content, "utf8");
  await writeFile(`${out}.done`, "", "utf8");
}

/**
 * Punto de entrada de una instancia. Ejecuta un prompt contra claude en modo
 * headless y vuelca la respuesta en esta ventana, en vivo. Si se pasa `--out`,
 * ademas escribe el resultado en ese archivo y crea una marca `.done` para que
 * el orquestador sepa que termino.
 */
export async function runWorker(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      id: { type: "string" },
      prompt: { type: "string" },
      model: { type: "string" },
      out: { type: "string" },
    },
    allowPositionals: true,
  });

  const id = values.id ?? "?";
  const prompt = values.prompt ?? "Saluda.";
  const out = values.out;

  const bar = "-".repeat(48);
  stdout.write(`\x1b[1mfurina worker #${id}\x1b[0m\n${bar}\n${prompt}\n${bar}\n\n`);

  let collected = "";
  let failed = false;

  try {
    for await (const event of stream(prompt, { cwd: process.cwd(), model: values.model })) {
      if (event.type === "assistant") {
        for (const block of (event as AssistantEvent).message.content) {
          if (block.type === "text" && typeof block.text === "string") {
            stdout.write(block.text);
            collected += block.text;
          }
        }
      } else if (event.type === "result") {
        const result = event as ResultEvent;
        if (result.is_error) {
          failed = true;
          stderr.write(`\nError: ${result.result}`);
          collected = result.result;
        }
      }
    }
  } catch (error) {
    failed = true;
    if (error instanceof ClaudeError) {
      stderr.write(`\nError: ${error.message}\n`);
      if (error.stderr) stderr.write(`${error.stderr}\n`);
      collected = `${error.message}\n${error.stderr}`.trim();
    } else {
      collected = (error as Error).message;
      throw error;
    }
  } finally {
    // Pase lo que pase, dejamos constancia para no colgar al orquestador.
    if (out) await report(out, failed ? `[ERROR]\n${collected}` : collected);
  }

  stdout.write("\n\n\x1b[2m[furina] instancia terminada. Pulsa Enter para cerrar.\x1b[0m");
  await waitForEnter();
  return failed ? 1 : 0;
}
