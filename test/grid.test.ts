import { describe, it, expect } from "vitest";
import { computeGrid, gridShape, usableArea } from "../src/window/grid.js";
import type { MonitorBox, Rect } from "../src/window/grid.js";

describe("gridShape", () => {
  it("uses a square-ish layout that fits the count", () => {
    expect(gridShape(1)).toEqual({ cols: 1, rows: 1 });
    expect(gridShape(2)).toEqual({ cols: 2, rows: 1 });
    expect(gridShape(4)).toEqual({ cols: 2, rows: 2 });
    expect(gridShape(6)).toEqual({ cols: 3, rows: 2 });
    expect(gridShape(9)).toEqual({ cols: 3, rows: 3 });
  });

  it("returns an empty shape for non-positive counts", () => {
    expect(gridShape(0)).toEqual({ cols: 0, rows: 0 });
  });
});

describe("usableArea", () => {
  it("subtracts reserved bars and applies the scale", () => {
    const monitor: MonitorBox = {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scale: 1,
      reserved: [0, 34, 0, 0],
    };
    expect(usableArea(monitor)).toEqual({ x: 0, y: 34, width: 1920, height: 1046 });
  });

  it("converts physical pixels to logical ones with a fractional scale", () => {
    const monitor: MonitorBox = {
      x: 0,
      y: 0,
      width: 3840,
      height: 2160,
      scale: 2,
      reserved: [10, 40, 10, 0],
    };
    expect(usableArea(monitor)).toEqual({ x: 10, y: 40, width: 1900, height: 1040 });
  });

  it("offsets by the monitor position for multi-monitor setups", () => {
    const monitor: MonitorBox = {
      x: 1920,
      y: 0,
      width: 1920,
      height: 1080,
      scale: 1,
      reserved: [0, 0, 0, 0],
    };
    expect(usableArea(monitor)).toEqual({ x: 1920, y: 0, width: 1920, height: 1080 });
  });
});

describe("computeGrid", () => {
  const area: Rect = { x: 0, y: 0, width: 1000, height: 1000 };

  it("returns no rectangles for a non-positive count", () => {
    expect(computeGrid(area, 0, 10)).toEqual([]);
  });

  it("returns one rectangle inset by the gap for a single window", () => {
    expect(computeGrid(area, 1, 10)).toEqual([
      { x: 10, y: 10, width: 980, height: 980 },
    ]);
  });

  it("lays a 2x2 grid for four windows", () => {
    const rects = computeGrid(area, 4, 10);
    expect(rects).toHaveLength(4);
    // cellWidth = floor((1000 - 10*3) / 2) = 485
    expect(rects[0]).toEqual({ x: 10, y: 10, width: 485, height: 485 });
    expect(rects[1]).toEqual({ x: 505, y: 10, width: 485, height: 485 });
    expect(rects[2]).toEqual({ x: 10, y: 505, width: 485, height: 485 });
    expect(rects[3]).toEqual({ x: 505, y: 505, width: 485, height: 485 });
  });

  it("keeps every rectangle inside the area", () => {
    const rects = computeGrid({ x: 0, y: 34, width: 1920, height: 1046 }, 5, 12);
    expect(rects).toHaveLength(5);
    for (const r of rects) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(34);
      expect(r.x + r.width).toBeLessThanOrEqual(1920);
      expect(r.y + r.height).toBeLessThanOrEqual(34 + 1046);
    }
  });
});
