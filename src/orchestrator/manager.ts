import { getFocusedMonitor, evalLua, dispatchLua, getClients } from "../hypr/client.js";
import type { HyprWorkspaceRef } from "../hypr/client.js";
import { killActiveIfPrefixLua, focusWorkspaceLua, focusWorkspaceSelectorLua } from "../hypr/rules.js";
import { computeGrid, usableArea } from "../window/grid.js";
import { spawnWindow } from "../window/spawn.js";
import { selfCommand } from "../self.js";

export interface SpawnOptions {
  /** Prompt que ejecutara cada instancia. Si falta, se usa uno de demo. */
  prompt?: string;
  /** Hueco en pixeles entre ventanas y contra los bordes. */
  gap?: number;
  /** Modelo a usar en cada instancia. */
  model?: string;
}

const DEFAULT_GAP = 12;

/** Margen para que un cierre de Hyprland (asincrono) se aplique de verdad. */
const CLOSE_SETTLE_MS = 250;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Prefijo de clase comun a toda ventana gestionada por furina. */
export const WORKER_CLASS_PREFIX = "furina-worker-";

/** Workspace (named) dedicado donde viven las instancias. */
export const WORKSPACE = "furina";

/** Identificador corto y unico por tanda de spawn, para no chocar clases. */
function makeRunId(): string {
  return Date.now().toString(36).slice(-5);
}

/** Una ventana a abrir: su titulo y los argumentos con que se relanza furina. */
export interface PlannedWindow {
  title: string;
  workerArgs: string[];
}

/**
 * Reparte las ventanas dadas en rejilla sobre el workspace dedicado, sin tocar
 * el workspace actual. Cada una se relanza como `furina <workerArgs>`.
 */
export async function spawnGrid(windows: PlannedWindow[], gap?: number): Promise<void> {
  const monitor = await getFocusedMonitor();
  const area = usableArea(monitor);
  const rects = computeGrid(area, windows.length, gap ?? DEFAULT_GAP);
  const runId = makeRunId();

  for (let i = 0; i < windows.length; i++) {
    const rect = rects[i];
    const win = windows[i];
    if (!rect || !win) continue;

    const cls = `${WORKER_CLASS_PREFIX}${runId}-${i + 1}`;
    const self = selfCommand(win.workerArgs);

    await spawnWindow({
      cls,
      title: win.title,
      rect,
      workspace: WORKSPACE,
      command: self.command,
      cwd: self.cwd,
    });
  }
}

/**
 * Lanza `count` instancias de claude, cada una en su ventana, repartidas en
 * rejilla sobre el workspace dedicado, sin tocar el workspace actual.
 */
export async function spawnInstances(count: number, options: SpawnOptions = {}): Promise<void> {
  const windows: PlannedWindow[] = [];
  for (let i = 0; i < count; i++) {
    const id = i + 1;
    const prompt = options.prompt ?? `Eres la instancia ${id} de ${count}. Saluda en una frase breve.`;
    const workerArgs = ["worker", "--id", String(id), "--prompt", prompt];
    if (options.model) workerArgs.push("--model", options.model);
    windows.push({ title: `furina #${id}`, workerArgs });
  }
  await spawnGrid(windows, options.gap);
}

/** Un agente a lanzar: su subtarea y el archivo donde volcara el resultado. */
export interface AgentSpawn {
  title: string;
  prompt: string;
  /** Ruta donde el worker escribira su resultado. */
  out: string;
}

/** Lanza un agente por subtarea, cada uno en su ventana, con su archivo de salida. */
export async function spawnAgents(
  agents: AgentSpawn[],
  options: { model?: string; gap?: number } = {},
): Promise<void> {
  const windows: PlannedWindow[] = agents.map((agent, i) => {
    const workerArgs = [
      "worker",
      "--id",
      String(i + 1),
      "--prompt",
      agent.prompt,
      "--out",
      agent.out,
    ];
    if (options.model) workerArgs.push("--model", options.model);
    return { title: agent.title, workerArgs };
  });
  await spawnGrid(windows, options.gap);
}

/** Cuantas ventanas gestionadas por furina siguen abiertas. */
async function countWorkers(): Promise<number> {
  const clients = await getClients();
  return clients.filter((c) => c.class.startsWith(WORKER_CLASS_PREFIX)).length;
}

/** Selector de workspace para devolver el foco a donde estaba el usuario. */
function workspaceSelector(ws: HyprWorkspaceRef): string {
  // Los workspaces named tienen id negativo; los normales, su numero.
  return ws.id > 0 ? String(ws.id) : `name:${ws.name}`;
}

/**
 * Cierra todas las ventanas gestionadas por furina.
 *
 * El cierre de Hyprland solo actua sobre la ventana ACTIVA y se aplica de forma
 * asincrona (~200ms). Por eso nos movemos al workspace dedicado (donde el
 * terminal del usuario nunca esta), cerramos la activa, damos tiempo a que
 * aplique y repetimos. Cada cierre va protegido por clase
 * (`killActiveIfPrefixLua`): aunque el foco escapara a otra ventana, es
 * imposible cerrar nada que no sea de furina. Al terminar devolvemos la vista
 * al workspace de origen.
 */
export async function killInstances(): Promise<number> {
  const before = await countWorkers();
  if (before === 0) return 0;

  const monitor = await getFocusedMonitor();
  const origin = monitor.activeWorkspace;

  let remaining = before;
  for (let attempt = 0; attempt < before * 2 + 3 && remaining > 0; attempt++) {
    // Reafirmamos el workspace para que la activa sea una ventana de furina.
    await evalLua(focusWorkspaceLua(WORKSPACE));
    await delay(CLOSE_SETTLE_MS);
    await dispatchLua(killActiveIfPrefixLua(WORKER_CLASS_PREFIX));
    await delay(CLOSE_SETTLE_MS);
    remaining = await countWorkers();
  }

  await evalLua(focusWorkspaceSelectorLua(workspaceSelector(origin)));
  return before - remaining;
}

/** Cambia la vista al workspace dedicado para ver las instancias. */
export async function showWorkspace(): Promise<void> {
  await evalLua(focusWorkspaceLua(WORKSPACE));
}
