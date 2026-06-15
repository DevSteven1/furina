import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { selfCommand } from "../src/self.js";

const originalEntry = process.argv[1];

afterEach(() => {
  process.argv[1] = originalEntry;
});

describe("selfCommand", () => {
  it("invokes tsx directly when running from a .ts entry", () => {
    process.argv[1] = "/home/u/furina/src/index.ts";
    const self = selfCommand(["worker", "--id", "1"]);

    expect(self.cwd).toBe("/home/u/furina");
    expect(self.command).toEqual([
      join("/home/u/furina", "node_modules", ".bin", "tsx"),
      "/home/u/furina/src/index.ts",
      "worker",
      "--id",
      "1",
    ]);
  });

  it("invokes node on the compiled entry when running from a .js file", () => {
    process.argv[1] = "/home/u/furina/dist/index.js";
    const self = selfCommand(["worker", "--id", "2"]);

    expect(self.cwd).toBe("/home/u/furina");
    expect(self.command).toEqual([
      process.execPath,
      "/home/u/furina/dist/index.js",
      "worker",
      "--id",
      "2",
    ]);
  });
});
