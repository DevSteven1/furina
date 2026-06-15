import { describe, it, expect } from "vitest";
import { buildSynthPrompt } from "../src/orchestrator/synth.js";

describe("buildSynthPrompt", () => {
  it("includes the original task and every agent result", () => {
    const prompt = buildSynthPrompt("tarea original", [
      { title: "Investigar", content: "hallazgo 1" },
      { title: "Comparar", content: "hallazgo 2" },
    ]);
    expect(prompt).toContain("tarea original");
    expect(prompt).toContain("Investigar");
    expect(prompt).toContain("hallazgo 1");
    expect(prompt).toContain("Comparar");
    expect(prompt).toContain("hallazgo 2");
  });
});
