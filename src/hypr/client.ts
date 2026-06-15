import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { MonitorBox } from "../window/grid.js";

const run = promisify(execFile);

export interface HyprWorkspaceRef {
  id: number;
  name: string;
}

export interface HyprMonitor extends MonitorBox {
  name: string;
  focused: boolean;
  activeWorkspace: HyprWorkspaceRef;
}

export interface HyprClient {
  address: string;
  class: string;
  initialClass: string;
  title: string;
  pid: number;
  floating: boolean;
}

/** Lanza un comando de hyprctl y devuelve su stdout. */
async function hyprctl(args: string[]): Promise<string> {
  const { stdout } = await run("hyprctl", args);
  return stdout;
}

/**
 * Ejecuta un fragmento Lua en Hyprland. Este build (0.55, parser Lua) expone su
 * API por `hl.*`; `hyprctl keyword`/`dispatch` con sintaxis clasica ya no
 * funcionan, asi que todo el control de ventanas pasa por aqui.
 *
 * Sirve para reglas de ventana y para cambiar de workspace. Ojo: por esta via
 * los dispatch de CIERRE de ventana no surten efecto; para eso usa
 * `dispatchLua`.
 */
export async function evalLua(lua: string): Promise<void> {
  await hyprctl(["eval", lua]);
}

/**
 * Ejecuta un dispatcher de Hyprland. `hyprctl dispatch <expr>` envuelve la
 * entrada como `return hl.dispatch(<expr>)`, asi que `expr` debe evaluar a un
 * dispatcher (o a nil para no hacer nada). A diferencia de `evalLua`, por aqui
 * el cierre de ventanas si surte efecto. Hyprland responde con codigo 0 aunque
 * el dispatcher sea nil, por lo que un guard que decide no actuar es un no-op
 * inofensivo.
 */
export async function dispatchLua(expr: string): Promise<void> {
  await hyprctl(["dispatch", expr]);
}

export async function getMonitors(): Promise<HyprMonitor[]> {
  return JSON.parse(await hyprctl(["monitors", "-j"])) as HyprMonitor[];
}

/** Monitor con foco; cae al primero si ninguno reporta foco. */
export async function getFocusedMonitor(): Promise<HyprMonitor> {
  const monitors = await getMonitors();
  const focused = monitors.find((m) => m.focused) ?? monitors[0];
  if (!focused) throw new Error("hyprctl no reporto ningun monitor");
  return focused;
}

export async function getClients(): Promise<HyprClient[]> {
  return JSON.parse(await hyprctl(["clients", "-j"])) as HyprClient[];
}
