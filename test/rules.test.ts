import { describe, it, expect } from "vitest";
import {
  windowRuleLua,
  killActiveIfPrefixLua,
  focusWorkspaceLua,
  focusWorkspaceSelectorLua,
} from "../src/hypr/rules.js";

describe("windowRuleLua", () => {
  it("builds a silent, floating, placed rule on the dedicated workspace", () => {
    const lua = windowRuleLua("furina-worker-ab12-1", { x: 10, y: 34, width: 940, height: 500 }, "furina");
    expect(lua).toBe(
      'hl.window_rule({ name="furina-worker-ab12-1", match={ class="^furina-worker-ab12-1$" }, ' +
        'workspace="name:furina silent", ' +
        'float=true, move="10 34", size="940 500" })',
    );
  });
});

describe("focusWorkspaceSelectorLua", () => {
  it("focuses a raw workspace selector", () => {
    expect(focusWorkspaceSelectorLua("1")).toBe('hl.dispatch(hl.dsp.focus({ workspace = "1" }))');
  });
});

describe("focusWorkspaceLua", () => {
  it("focuses the named workspace", () => {
    expect(focusWorkspaceLua("furina")).toBe('hl.dispatch(hl.dsp.focus({ workspace = "name:furina" }))');
  });
});

describe("killActiveIfPrefixLua", () => {
  it("kills the active window only when its class starts with the prefix", () => {
    const lua = killActiveIfPrefixLua("furina-worker-");
    expect(lua).toContain("hl.get_active_window()");
    expect(lua).toContain('string.find(w.class, "furina-worker-", 1, true)==1');
    expect(lua).toContain("return hl.dsp.window.kill()");
  });

  it("guards the kill so foreign windows can never match", () => {
    // El cierre solo se devuelve dentro del if del prefijo, anclado (==1) y
    // literal (4o argumento true): un terminal "kitty" o cualquier clase ajena
    // nunca entra al branch, asi que es imposible cerrarlo.
    const lua = killActiveIfPrefixLua("furina-worker-");
    expect(lua).toContain(", 1, true)==1");
    expect(lua).not.toContain('string.find(w.class, "kitty"');
    // El kill va detras del guard, no suelto.
    const guardIdx = lua.indexOf('string.find(w.class, "furina-worker-"');
    const killIdx = lua.indexOf("hl.dsp.window.kill()");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(killIdx).toBeGreaterThan(guardIdx);
  });
});
