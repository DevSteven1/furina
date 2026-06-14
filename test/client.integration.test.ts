import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { stream, query, ClaudeError } from "../src/claude/client.js";
import type { ClaudeEvent } from "../src/claude/events.js";

const here = dirname(fileURLToPath(import.meta.url));
const FAKE_CLAUDE = join(here, "fixtures", "fake-claude.mjs");

async function collect(prompt: string, options = {}): Promise<ClaudeEvent[]> {
  const events: ClaudeEvent[] = [];
  for await (const event of stream(prompt, { claudePath: FAKE_CLAUDE, ...options })) {
    events.push(event);
  }
  return events;
}

describe("stream", () => {
  it("yields the init, assistant and result events in order", async () => {
    const events = await collect("hello");
    expect(events.map((e) => e.type)).toEqual(["system", "assistant", "result"]);
  });

  it("ignores non-JSON noise lines", async () => {
    const events = await collect("hello");
    // El binario falso emite una linea "not-json-noise" que debe descartarse.
    expect(events).toHaveLength(3);
  });

  it("throws ClaudeError when the process exits non-zero", async () => {
    await expect(collect("please CRASH now")).rejects.toBeInstanceOf(ClaudeError);
  });

  it("exposes the exit code and stderr on the error", async () => {
    try {
      await collect("CRASH");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ClaudeError);
      const err = error as ClaudeError;
      expect(err.code).toBe(2);
      expect(err.stderr).toContain("simulated crash");
    }
  });
});

describe("query", () => {
  it("returns the final result fields", async () => {
    const result = await query("hello world", { claudePath: FAKE_CLAUDE });
    expect(result.text).toBe("echo:hello world");
    expect(result.sessionId).toBe("test-session-0001");
    expect(result.isError).toBe(false);
    expect(result.numTurns).toBe(1);
    expect(result.costUsd).toBeCloseTo(0.001);
  });

  it("reports is_error without throwing", async () => {
    const result = await query("make it FAIL", { claudePath: FAKE_CLAUDE });
    expect(result.isError).toBe(true);
    expect(result.text).toBe("Not logged in");
  });

  it("passes the resume id so context can continue", async () => {
    const result = await query("again", {
      claudePath: FAKE_CLAUDE,
      resume: "test-session-0001",
    });
    // El binario falso refleja el --resume recibido en la respuesta.
    expect(result.text).toBe("echo:again|resumed:test-session-0001");
    expect(result.sessionId).toBe("test-session-0001");
  });
});
