import { spawn } from "node:child_process";
import { evalLua } from "../hypr/client.js";
import { windowRuleLua } from "../hypr/rules.js";
import type { Rect } from "./grid.js";

export interface WindowSpec {
  /** app-id unico de la ventana; sirve para que Hyprland la identifique. */
  cls: string;
  /** Titulo visible de la ventana. */
  title: string;
  /** Posicion y tamano objetivo en pixeles logicos. */
  rect: Rect;
  /** Workspace destino (named) al que se envia la ventana en silencio. */
  workspace: string;
  /** Programa + argumentos a ejecutar dentro de la terminal. */
  command: string[];
  /** Directorio de trabajo del proceso. */
  cwd?: string;
}

/**
 * Abre una ventana de kitty ya flotante, colocada en su celda y enviada en
 * silencio al workspace dedicado. Registra una regla por clase via Lua y luego
 * lanza la terminal: la ventana nace en su sitio sin robar el foco.
 */
export async function spawnWindow(spec: WindowSpec): Promise<void> {
  await evalLua(windowRuleLua(spec.cls, spec.rect, spec.workspace));

  const child = spawn(
    "kitty",
    ["--class", spec.cls, "--title", spec.title, "--", ...spec.command],
    { cwd: spec.cwd, detached: true, stdio: "ignore" },
  );
  child.unref();
}
