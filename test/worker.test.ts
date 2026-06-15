import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { report } from "../src/worker.js";

describe("worker report", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "furina-worker-"));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("writes the result and an ok marker when the agent succeeded", async () => {
    const out = join(dir, "agent-1.md");
    await report(out, "resultado", true);
    expect(await readFile(out, "utf8")).toBe("resultado");
    expect(await readFile(`${out}.done`, "utf8")).toBe("ok");
  });

  it("writes an error marker when the agent failed", async () => {
    const out = join(dir, "agent-1.md");
    await report(out, "[ERROR]\nboom", false);
    expect(await readFile(out, "utf8")).toBe("[ERROR]\nboom");
    expect(await readFile(`${out}.done`, "utf8")).toBe("error");
  });
});
