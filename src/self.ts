import { resolve, dirname, join } from "node:path";

export interface SelfCommand {
  /** Programa + argumentos para relanzar furina con un subcomando. */
  command: string[];
  /** Directorio de trabajo desde donde ejecutarlo. */
  cwd: string;
}

/**
 * Calcula como volver a invocar furina (p. ej. para abrir un worker en otra
 * ventana). Soporta tanto el modo dev (entrada .ts via tsx) como el binario
 * compilado (.js con node).
 */
export function selfCommand(args: string[]): SelfCommand {
  const entry = process.argv[1] ?? "";
  const projectRoot = resolve(dirname(entry), "..");

  if (entry.endsWith(".ts")) {
    // En desarrollo invocamos tsx directamente para evitar que el reenvio de
    // argumentos de pnpm se trague o duplique el separador "--".
    const tsx = join(projectRoot, "node_modules", ".bin", "tsx");
    return { command: [tsx, entry, ...args], cwd: projectRoot };
  }
  return { command: [process.execPath, entry, ...args], cwd: projectRoot };
}
