import { describe, it, expect } from "vitest";
import { buildArgs } from "../src/claude/client.js";

describe("buildArgs", () => {
  it("always uses headless stream-json mode", () => {
    const args = buildArgs("hello");
    expect(args).toEqual([
      "-p",
      "hello",
      "--output-format",
      "stream-json",
      "--verbose",
    ]);
  });

  it("adds --resume when a session id is given", () => {
    const args = buildArgs("hi", { resume: "abc-123" });
    expect(args).toContain("--resume");
    expect(args[args.indexOf("--resume") + 1]).toBe("abc-123");
  });

  it("maps every option to its flag", () => {
    const args = buildArgs("hi", {
      model: "claude-opus-4-8",
      permissionMode: "plan",
      appendSystemPrompt: "be terse",
      allowedTools: ["Read", "Bash(git *)"],
    });
    expect(args[args.indexOf("--model") + 1]).toBe("claude-opus-4-8");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("plan");
    expect(args[args.indexOf("--append-system-prompt") + 1]).toBe("be terse");
    expect(args[args.indexOf("--allowed-tools") + 1]).toBe("Read,Bash(git *)");
  });

  it("omits optional flags when not provided", () => {
    const args = buildArgs("hi");
    expect(args).not.toContain("--resume");
    expect(args).not.toContain("--model");
    expect(args).not.toContain("--permission-mode");
    expect(args).not.toContain("--allowed-tools");
  });

  it("omits --allowed-tools for an empty tool list", () => {
    const args = buildArgs("hi", { allowedTools: [] });
    expect(args).not.toContain("--allowed-tools");
  });

  it("passes the prompt as a single literal argument (no shell injection)", () => {
    const dangerous = '"; rm -rf / #';
    const args = buildArgs(dangerous);
    // El prompt es un unico argumento intacto; se ejecuta via spawn sin shell,
    // asi que los metacaracteres nunca se interpretan.
    expect(args[args.indexOf("-p") + 1]).toBe(dangerous);
    expect(args.filter((a) => a === dangerous)).toHaveLength(1);
  });
});
