// Calculo de la rejilla de ventanas. Logica pura y sin efectos para poder
// probarla de forma aislada.

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Datos minimos de un monitor de Hyprland que necesita el layout. */
export interface MonitorBox {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  /** Reservado por barras/paneles: [left, top, right, bottom]. */
  reserved: [number, number, number, number];
}

/**
 * Area utilizable del monitor en pixeles logicos, descontando lo reservado por
 * barras y el factor de escala.
 */
export function usableArea(monitor: MonitorBox): Rect {
  const [left, top, right, bottom] = monitor.reserved;
  const logicalWidth = Math.round(monitor.width / monitor.scale);
  const logicalHeight = Math.round(monitor.height / monitor.scale);
  return {
    x: monitor.x + left,
    y: monitor.y + top,
    width: logicalWidth - left - right,
    height: logicalHeight - top - bottom,
  };
}

/** Numero de columnas y filas para repartir `count` ventanas en una rejilla. */
export function gridShape(count: number): { cols: number; rows: number } {
  if (count < 1) return { cols: 0, rows: 0 };
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
}

/**
 * Reparte `count` rectangulos en una rejilla dentro de `area`, dejando un hueco
 * de `gap` pixeles entre celdas y contra los bordes.
 */
export function computeGrid(area: Rect, count: number, gap: number): Rect[] {
  if (count < 1) return [];

  const { cols, rows } = gridShape(count);
  const cellWidth = Math.floor((area.width - gap * (cols + 1)) / cols);
  const cellHeight = Math.floor((area.height - gap * (rows + 1)) / rows);

  const rects: Rect[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    rects.push({
      x: area.x + gap + col * (cellWidth + gap),
      y: area.y + gap + row * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    });
  }
  return rects;
}
