import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { parsePlan, buildPlannerPrompt, plan } from "../src/orchestrator/planner.js";

const here = dirname(fileURLToPath(import.meta.url));
const FAKE_CLAUDE = join(here, "fixtures", "fake-claude.mjs");

describe("buildPlannerPrompt", () => {
  it("includes the task", () => {
    expect(buildPlannerPrompt("resume X")).toContain("resume X");
  });
});

describe("parsePlan", () => {
  it("parses a bare JSON object", () => {
    const tasks = parsePlan('{"agents":[{"title":"A","prompt":"do a"}]}');
    expect(tasks).toEqual([{ title: "A", prompt: "do a" }]);
  });

  it("extracts JSON wrapped in code fences and surrounding text", () => {
    const text = 'Aqui tienes el plan:\n```json\n{"agents":[{"title":"A","prompt":"do a"}]}\n```\nListo.';
    const tasks = parsePlan(text);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]).toEqual({ title: "A", prompt: "do a" });
  });

  it("handles braces inside string values", () => {
    const tasks = parsePlan('{"agents":[{"title":"A","prompt":"usa {curly} braces"}]}');
    expect(tasks[0]!.prompt).toBe("usa {curly} braces");
  });

  it("defaults the title when missing", () => {
    const tasks = parsePlan('{"agents":[{"prompt":"do a"}]}');
    expect(tasks[0]!.title).toBe("Agente 1");
  });

  it("throws when there is no JSON object", () => {
    expect(() => parsePlan("no json here")).toThrow();
  });

  it("throws when agents is empty", () => {
    expect(() => parsePlan('{"agents":[]}')).toThrow();
  });

  it("throws when an agent has no prompt", () => {
    expect(() => parsePlan('{"agents":[{"title":"A"}]}')).toThrow();
  });
});

describe("plan", () => {
  it("returns the parsed tasks from claude", async () => {
    const tasks = await plan("PLAN_OK divide esto", { claudePath: FAKE_CLAUDE });
    expect(tasks).toEqual([
      { title: "A", prompt: "do a" },
      { title: "B", prompt: "do b" },
    ]);
  });
});
