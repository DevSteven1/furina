import { describe, it, expect } from "vitest";
import { retryable } from "../src/orchestrator/run.js";

describe("retryable", () => {
  it("returns nothing when every agent finished ok", () => {
    expect(retryable(["ok", "ok"])).toEqual([]);
  });

  it("selects the agents that errored or timed out", () => {
    expect(retryable(["ok", "error", "ok", "timeout"])).toEqual([2, 4]);
  });

  it("uses 1-based indices matching the run artifacts", () => {
    // agent-1.md es el indice 1; un solo agente fallido en cabeza es [1].
    expect(retryable(["error", "ok"])).toEqual([1]);
  });
});
