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

  it("marks agents that failed or timed out so the synthesizer is warned", () => {
    const prompt = buildSynthPrompt("tarea", [
      { title: "Ok", content: "bien", status: "ok" },
      { title: "Roto", content: "[ERROR]\nboom", status: "error" },
      { title: "Lento", content: "[sin resultado]", status: "timeout" },
    ]);
    expect(prompt).toContain("este agente fallo");
    expect(prompt).toContain("no termino a tiempo");
    // El agente correcto no lleva nota de advertencia.
    const okBlock = prompt.split("## Agente 1: Ok")[1]!.split("## Agente 2")[0]!;
    expect(okBlock).not.toContain("furina:");
  });
});
