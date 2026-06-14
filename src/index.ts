#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  const pkgPath = join(__dirname, "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

const HELP = `furina - specialized AI assistant built on top of Claude Code

Usage:
  furina [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show the version
`;

function main(argv: string[]): number {
  const { values } = parseArgs({
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

  process.stdout.write(HELP);
  return 0;
}

process.exit(main(process.argv.slice(2)));
