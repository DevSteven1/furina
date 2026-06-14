#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stream, ClaudeError } from "./claude/client.js";
import type { AssistantEvent, ResultEvent } from "./claude/events.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkgPath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

const HELP = `furina - specialized AI assistant built on top of Claude Code

Usage:
  furina ask <prompt>   Ask the assistant and stream the answer
  furina <prompt>       Shorthand for "furina ask <prompt>"

Options:
  -h, --help     Show this help message
  -v, --version  Show the version
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

async function main(argv: string[]): Promise<number> {
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

  if (values.help || positionals.length === 0) {
    process.stdout.write(HELP);
    return values.help ? 0 : 1;
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
