#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stream, ClaudeError } from "./claude/client.js";
import type { AssistantEvent, ResultEvent } from "./claude/events.js";
import { runChat } from "./chat.js";
import { runWorker } from "./worker.js";
import { spawnInstances, killInstances, showWorkspace, WORKSPACE } from "./orchestrator/manager.js";
import { runDo } from "./orchestrator/run.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkgPath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

const HELP = `furina - specialized AI assistant built on top of Claude Code

Usage:
  furina                  Start an interactive chat session
  furina chat             Start an interactive chat session
  furina ask <prompt>     Ask once and stream the answer
  furina <prompt>         Shorthand for "furina ask <prompt>"
  furina do <task>        Plan, split into agents, run them and synthesize
  furina spawn <n>        Open n claude instances in a dedicated workspace
  furina show             Switch to the furina workspace to watch the instances
  furina kill             Close every furina-managed window

Options:
  -h, --help     Show this help message
  -v, --version  Show the version

Do options:
  --model <id>     Model to use for the planner, agents and synthesis
  --gap <px>       Gap in pixels between windows (default 12)
  --kill           Close the agent windows when finished
  --background     Do not switch to the furina workspace while agents run
  --timeout <ms>   Max time to wait for all agents (default 600000)

Spawn options:
  --prompt <text>  Prompt to run in every instance
  --model <id>     Model to use in every instance
  --gap <px>       Gap in pixels between windows (default 12)
  --background     Do not switch to the furina workspace after spawning
`;

/** Ejecuta una consulta y escribe la respuesta del asistente en stdout. */
async function runAsk(prompt: string): Promise<number> {
  let sawText = false;
  try {
    for await (const event of stream(prompt, { cwd: process.cwd() })) {
      if (event.type === "assistant") {
        for (const block of (event as AssistantEvent).message.content) {
          if (block.type === "text" && typeof block.text === "string") {
            process.stdout.write(block.text);
            sawText = true;
          }
        }
      } else if (event.type === "result") {
        const result = event as ResultEvent;
        if (result.is_error) {
          process.stderr.write(`\nError: ${result.result}\n`);
          return 1;
        }
      }
    }
  } catch (error) {
    if (error instanceof ClaudeError) {
      process.stderr.write(`\nError: ${error.message}\n`);
      if (error.stderr) process.stderr.write(`${error.stderr}\n`);
      return 1;
    }
    throw error;
  }

  if (sawText) process.stdout.write("\n");
  return 0;
}

/** Abre n instancias de claude, cada una en su propia ventana. */
async function runSpawn(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      prompt: { type: "string" },
      model: { type: "string" },
      gap: { type: "string" },
      background: { type: "boolean" },
    },
    allowPositionals: true,
  });

  const count = Number(positionals[0]);
  if (!Number.isInteger(count) || count < 1) {
    process.stderr.write("Error: spawn requires a positive integer count\n");
    return 1;
  }

  const gap = values.gap !== undefined ? Number(values.gap) : undefined;
  if (gap !== undefined && (!Number.isFinite(gap) || gap < 0)) {
    process.stderr.write("Error: --gap must be a non-negative number\n");
    return 1;
  }

  try {
    await spawnInstances(count, { prompt: values.prompt, model: values.model, gap });
    if (!values.background) await showWorkspace();
  } catch (error) {
    process.stderr.write(`Error: ${(error as Error).message}\n`);
    return 1;
  }
  const hint = values.background ? ' Run "furina show" to watch them.' : "";
  process.stdout.write(`Spawned ${count} instance(s) in workspace "${WORKSPACE}".${hint}\n`);
  return 0;
}

/** Orquesta una tarea: planifica, reparte en agentes y sintetiza el resultado. */
async function runDoCommand(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      model: { type: "string" },
      gap: { type: "string" },
      kill: { type: "boolean" },
      background: { type: "boolean" },
      timeout: { type: "string" },
    },
    allowPositionals: true,
  });

  const task = positionals.join(" ").trim();
  if (!task) {
    process.stderr.write('Error: do requires a task, e.g. furina do "investiga X"\n');
    return 1;
  }

  const gap = values.gap !== undefined ? Number(values.gap) : undefined;
  if (gap !== undefined && (!Number.isFinite(gap) || gap < 0)) {
    process.stderr.write("Error: --gap must be a non-negative number\n");
    return 1;
  }

  const timeoutMs = values.timeout !== undefined ? Number(values.timeout) : undefined;
  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    process.stderr.write("Error: --timeout must be a positive number of milliseconds\n");
    return 1;
  }

  try {
    const result = await runDo(task, {
      model: values.model,
      gap,
      kill: values.kill,
      watch: !values.background,
      timeoutMs,
      onProgress: (message) => process.stderr.write(`[furina] ${message}\n`),
    });
    if (result.failed.length > 0) {
      process.stderr.write(`[furina] agentes con error: ${result.failed.join(", ")}\n`);
    }
    if (result.timedOut.length > 0) {
      process.stderr.write(`[furina] agentes sin terminar: ${result.timedOut.join(", ")}\n`);
    }
    process.stdout.write(`${result.summary}\n`);
    process.stderr.write(`[furina] detalles en ${result.dir}\n`);
  } catch (error) {
    if (error instanceof ClaudeError) {
      process.stderr.write(`\nError: ${error.message}\n`);
      if (error.stderr) process.stderr.write(`${error.stderr}\n`);
      return 1;
    }
    process.stderr.write(`Error: ${(error as Error).message}\n`);
    return 1;
  }
  return 0;
}

async function main(argv: string[]): Promise<number> {
  // Subcomandos con sus propias opciones: se enrutan antes del parseo general.
  if (argv[0] === "worker") return runWorker(argv.slice(1));
  if (argv[0] === "do") return runDoCommand(argv.slice(1));
  if (argv[0] === "spawn") return runSpawn(argv.slice(1));
  if (argv[0] === "show") {
    try {
      await showWorkspace();
    } catch (error) {
      process.stderr.write(`Error: ${(error as Error).message}\n`);
      return 1;
    }
    return 0;
  }
  if (argv[0] === "kill") {
    try {
      const closed = await killInstances();
      process.stdout.write(`Closed ${closed} furina window(s).\n`);
    } catch (error) {
      process.stderr.write(`Error: ${(error as Error).message}\n`);
      return 1;
    }
    return 0;
  }

  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
    allowPositionals: true,
  });

  if (values.version) {
    process.stdout.write(`${getVersion()}\n`);
    return 0;
  }

  if (values.help) {
    process.stdout.write(HELP);
    return 0;
  }

  // Sin argumentos o "furina chat" abre el chat interactivo.
  if (positionals.length === 0 || positionals[0] === "chat") {
    return runChat();
  }

  // Acepta tanto "furina ask <prompt>" como "furina <prompt>".
  const args = positionals[0] === "ask" ? positionals.slice(1) : positionals;
  const prompt = args.join(" ").trim();

  if (!prompt) {
    process.stderr.write("Error: missing prompt\n\n");
    process.stdout.write(HELP);
    return 1;
  }

  return runAsk(prompt);
}

process.exit(await main(process.argv.slice(2)));
