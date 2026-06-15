import { describe, it, expect } from "vitest";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  FURINA_HOME,
  runDir,
  agentResultPath,
  agentDonePath,
  planPath,
  summaryPath,
  doneMarker,
  parseDoneMarker,
} from "../src/orchestrator/runs.js";

describe("run paths", () => {
  it("roots everything under ~/.furina", () => {
    expect(FURINA_HOME).toBe(join(homedir(), ".furina"));
  });

  it("builds per-run artifact paths", () => {
    const dir = runDir("abc");
    expect(dir).toBe(join(FURINA_HOME, "runs", "abc"));
    expect(agentResultPath(dir, 2)).toBe(join(dir, "agent-2.md"));
    expect(agentDonePath(dir, 2)).toBe(join(dir, "agent-2.md.done"));
    expect(planPath(dir)).toBe(join(dir, "plan.json"));
    expect(summaryPath(dir)).toBe(join(dir, "summary.md"));
  });

  it("keeps the done marker as the result path plus .done", () => {
    // El worker escribe `${out}.done`; esta igualdad evita que orquestador y
    // worker se desincronicen como paso en la primera prueba real.
    const dir = runDir("abc");
    expect(agentDonePath(dir, 3)).toBe(`${agentResultPath(dir, 3)}.done`);
  });
});

describe("done marker status", () => {
  it("writes ok or error depending on how the agent finished", () => {
    expect(doneMarker(true)).toBe("ok");
    expect(doneMarker(false)).toBe("error");
  });

  it("parses the marker back into a status", () => {
    expect(parseDoneMarker("ok")).toBe("ok");
    expect(parseDoneMarker("error")).toBe("error");
    expect(parseDoneMarker("  error\n")).toBe("error");
  });

  it("treats an empty marker as ok for backward compatibility", () => {
    expect(parseDoneMarker("")).toBe("ok");
  });

  it("round-trips writer and reader", () => {
    expect(parseDoneMarker(doneMarker(true))).toBe("ok");
    expect(parseDoneMarker(doneMarker(false))).toBe("error");
  });
});
