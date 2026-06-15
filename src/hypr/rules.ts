import type { Rect } from "../window/grid.js";

/**
 * Lua para registrar una regla que, al abrirse una ventana de la clase dada, la
 * envia (en silencio, sin robar el foco) al workspace `workspace`, la hace
 * flotante y la coloca en `rect`. Se evalua antes de lanzar la ventana para que
 * nazca ya en su sitio.
 */
export function windowRuleLua(cls: string, rect: Rect, workspace: string): string {
  return (
    `hl.window_rule({ name="${cls}", match={ class="^${cls}$" }, ` +
    `workspace="name:${workspace} silent", ` +
    `float=true, move="${rect.x} ${rect.y}", size="${rect.width} ${rect.height}" })`
  );
}

/**
 * Lua para cerrar la ventana ACTIVA, pero solo si su clase empieza por `prefix`.
 *
 * Es una unica expresion (apta para `dispatchLua`) que lee la ventana activa y
 * decide de forma atomica: si no es una ventana de furina, devuelve nil y no se
 * cierra nada. El cierre actua siempre sobre la ventana activa y no acepta
 * selector, de ahi este enfoque. Usamos `kill()` (forzado): el `close()` gracil
 * lo ignora el terminal y no surte efecto.
 *
 * El guard es la garantia de seguridad: aunque el terminal del usuario tuviera
 * el foco, su clase no empieza por `prefix`, asi que es imposible cerrarlo. Usa
 * find con coincidencia literal (4o argumento) anclada al inicio (==1) para no
 * interpretar el prefijo como patron.
 */
export function killActiveIfPrefixLua(prefix: string): string {
  return (
    `(function() local w=hl.get_active_window(); ` +
    `if w and w.class and string.find(w.class, "${prefix}", 1, true)==1 ` +
    `then return hl.dsp.window.kill() end end)()`
  );
}

/** Lua para cambiar la vista al workspace indicado por su selector crudo. */
export function focusWorkspaceSelectorLua(selector: string): string {
  return `hl.dispatch(hl.dsp.focus({ workspace = "${selector}" }))`;
}

/** Lua para cambiar la vista al workspace named dado. */
export function focusWorkspaceLua(workspace: string): string {
  return focusWorkspaceSelectorLua(`name:${workspace}`);
}
