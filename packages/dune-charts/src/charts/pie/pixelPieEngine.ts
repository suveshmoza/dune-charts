import type { DuneSeriesConfig } from '../../types';
import { bandsFromColor, type PixelWaveBands, type PlotRect } from '../shared/pixelWaveEngine';
import {
  angleInSector,
  cellAngleDeg,
  resolveCenter,
  resolveRadius,
} from '../shared/polarMath';

export {
  angleInSector,
  cellAngleDeg,
  normalizeDeg,
  resolveCenter,
  resolveRadius,
} from '../shared/polarMath';

const DEFAULT_PIXEL = 2;
const DEFAULT_OUTER = '80%';

export type PixelPieSlice = {
  name: string;
  value: number;
  bands: PixelWaveBands;
};

export type PixelPieCell = {
  /** Absolute chart X of the cell’s top-left corner. */
  x: number;
  /** Absolute chart Y of the cell’s top-left corner. */
  y: number;
  sliceName: string;
  /** Rows inward from outer rim (crest = 0). */
  crestRow: number;
};

export type PixelPieSector = {
  name: string;
  value: number;
  startAngle: number;
  endAngle: number;
};

export type PixelPiePlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  pixel: number;
  sectors: PixelPieSector[];
  cells: PixelPieCell[];
};

export type PixelPieLayoutOptions = {
  pixel?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  /** Degrees; Recharts default 0. */
  startAngle?: number;
  /** Degrees; Recharts default 360. */
  endAngle?: number;
  /** Degrees between sectors; Recharts default 0. */
  paddingAngle?: number;
  cx?: number | string;
  cy?: number | string;
};

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

/**
 * Build sector angle spans from slice values (Recharts-style degrees).
 */
export function computePieSectors(
  slices: readonly { name: string; value: number }[],
  options: {
    startAngle?: number;
    endAngle?: number;
    paddingAngle?: number;
  } = {},
): PixelPieSector[] {
  const startAngle = options.startAngle ?? 0;
  const endAngle = options.endAngle ?? 360;
  const paddingAngle = options.paddingAngle ?? 0;
  const sweep = endAngle - startAngle;
  const positive = slices.filter((s) => s.value > 0 && Number.isFinite(s.value));
  const total = positive.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0 || positive.length === 0 || !Number.isFinite(sweep)) return [];

  const n = positive.length;
  const usable = sweep - paddingAngle * n;
  if (usable <= 0) return [];

  let cursor = startAngle + paddingAngle / 2;
  const sectors: PixelPieSector[] = [];
  for (const s of positive) {
    const delta = (s.value / total) * usable;
    sectors.push({
      name: s.name,
      value: s.value,
      startAngle: cursor,
      endAngle: cursor + delta,
    });
    cursor += delta + paddingAngle;
  }
  return sectors;
}

function sliceFieldToString(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return fallback;
}

/**
 * Build colored pie slices from Recharts-style rows.
 */
export function buildPieSliceList(
  data: readonly Record<string, unknown>[],
  dataKey: string,
  nameKey: string,
  config: Partial<Record<string, DuneSeriesConfig>> | undefined,
  baseColors: readonly string[],
): PixelPieSlice[] {
  return data.map((row, i) => {
    const name = sliceFieldToString(row[nameKey], `slice-${i}`);
    const n = Number(row[dataKey]);
    const value = Number.isFinite(n) ? Math.max(0, n) : 0;
    const entry = config?.[name];
    const bands: PixelWaveBands =
      entry?.bands ??
      (baseColors[i]
        ? bandsFromColor(baseColors[i] ?? '#888888')
        : bandsFromColor(entry?.color ?? '#888888'));
    return { name, value, bands };
  });
}

/**
 * Discrete pixel pie / donut in the plot rect.
 */
export function computePixelPieLayout(
  slices: readonly PixelPieSlice[],
  plot: PlotRect,
  options: PixelPieLayoutOptions = {},
): PixelPiePlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || slices.length === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const plotH = Math.max(pixel, snapDown(plot.height, pixel));
  const plotX = plot.x;
  const plotY = plot.y;

  const cx = resolveCenter(options.cx, plotX, plotW);
  const cy = resolveCenter(options.cy, plotY, plotH);
  const maxRadius = Math.min(plotW, plotH) / 2;
  const outerRadius = resolveRadius(
    options.outerRadius,
    maxRadius,
    resolveRadius(DEFAULT_OUTER, maxRadius, maxRadius * 0.8),
  );
  const innerRadius = Math.min(outerRadius, resolveRadius(options.innerRadius, maxRadius, 0));

  if (outerRadius < pixel) return null;

  const sectors = computePieSectors(slices, {
    startAngle: options.startAngle,
    endAngle: options.endAngle,
    paddingAngle: options.paddingAngle,
  });
  if (sectors.length === 0) return null;

  const cells: PixelPieCell[] = [];
  const x0 = snapDown(cx - outerRadius, pixel);
  const y0 = snapDown(cy - outerRadius, pixel);
  const x1 = cx + outerRadius;
  const y1 = cy + outerRadius;

  for (let x = x0; x <= x1; x += pixel) {
    for (let y = y0; y <= y1; y += pixel) {
      const mx = x + pixel / 2;
      const my = y + pixel / 2;
      const dist = Math.hypot(mx - cx, my - cy);
      if (dist > outerRadius || dist < innerRadius) continue;

      const ang = cellAngleDeg(cx, cy, mx, my);
      const sector = sectors.find((s) => angleInSector(ang, s.startAngle, s.endAngle));
      if (sector == null) continue;

      const crestRow = Math.max(0, Math.floor((outerRadius - dist) / pixel));
      cells.push({ x, y, sliceName: sector.name, crestRow });
    }
  }

  return {
    plotX,
    plotY,
    plotW,
    plotH,
    cx,
    cy,
    innerRadius,
    outerRadius,
    pixel,
    sectors,
    cells,
  };
}
