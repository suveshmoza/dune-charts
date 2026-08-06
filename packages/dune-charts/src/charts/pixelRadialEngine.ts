import type { DuneSeriesConfig } from '../types';
import {
  angleInSector,
  buildPieSliceList,
  cellAngleDeg,
  normalizeDeg,
  resolveCenter,
  resolveRadius,
  type PixelPieSlice,
} from './pixelPieEngine';
import type { PixelWaveBands, PlotRect } from './pixelWaveEngine';

const DEFAULT_PIXEL = 4;
const DEFAULT_INNER = '30%';
const DEFAULT_OUTER = '80%';

/** Same row shape as pie slices — one concentric ring arc per bar. */
export type PixelRadialBar = PixelPieSlice;

export type PixelRadialCell = {
  /** Absolute chart X of the cell’s top-left corner. */
  x: number;
  /** Absolute chart Y of the cell’s top-left corner. */
  y: number;
  barName: string;
  /** Rows inward from that track’s outer rim (crest = 0). */
  crestRow: number;
};

export type PixelRadialTrack = {
  name: string;
  value: number;
  /** Sweep start (degrees, Recharts convention). */
  startAngle: number;
  /** Sweep end (degrees) — may be less than start for clockwise sweeps. */
  endAngle: number;
  rInner: number;
  rOuter: number;
};

export type PixelRadialPlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  pixel: number;
  tracks: PixelRadialTrack[];
  cells: PixelRadialCell[];
};

export type PixelRadialLayoutOptions = {
  pixel?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  /** Degrees; Recharts default 0. */
  startAngle?: number;
  /** Degrees; Recharts default 360. */
  endAngle?: number;
  cx?: number | string;
  cy?: number | string;
  /**
   * Fixed radial thickness per track in CSS px.
   * When omitted, the annulus is split evenly across bars (minus 1-cell gaps).
   */
  barSize?: number;
};

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

/**
 * Sector membership along the signed sweep from `start` → `end`
 * (supports clockwise Recharts semis where end < start).
 * Interval is half-open: start inclusive, end exclusive.
 */
export function angleInDirectedSector(angle: number, start: number, end: number): boolean {
  const span = end - start;
  if (!Number.isFinite(span) || Math.abs(span) < 1e-9) return false;
  if (Math.abs(Math.abs(span) - 360) < 1e-6 || Math.abs(span) > 360 - 1e-6) return true;

  if (span > 0) return angleInSector(angle, start, end);

  const a = normalizeDeg(angle);
  const s = normalizeDeg(start);
  let delta = a - s;
  if (delta > 0) delta -= 360;
  return delta <= 0 && delta > span;
}

/**
 * Concentric tracks from outer → inner (first bar = outermost).
 * Equal thickness with a 1-pixel gap between tracks, unless `barSize` is set.
 */
export function computeRadialTracks(
  bars: readonly { name: string; value: number }[],
  options: {
    innerRadius: number;
    outerRadius: number;
    pixel: number;
    startAngle?: number;
    endAngle?: number;
    barSize?: number;
  },
): PixelRadialTrack[] {
  const startAngle = options.startAngle ?? 0;
  const endAngle = options.endAngle ?? 360;
  const sweep = endAngle - startAngle;
  const positive = bars.filter((b) => b.value > 0 && Number.isFinite(b.value));
  if (positive.length === 0 || !Number.isFinite(sweep) || Math.abs(sweep) < 1e-9) {
    return [];
  }

  const maxVal = Math.max(...positive.map((b) => b.value));
  if (!(maxVal > 0)) return [];

  const { innerRadius, outerRadius, pixel } = options;
  const annulus = outerRadius - innerRadius;
  if (annulus < pixel) return [];

  const n = positive.length;
  const gap = pixel;
  const gapsTotal = (n - 1) * gap;
  let thickness: number;
  if (options.barSize != null && Number.isFinite(options.barSize) && options.barSize > 0) {
    thickness = Math.min(options.barSize, annulus);
  } else {
    const usable = annulus - gapsTotal;
    if (usable < pixel) return [];
    thickness = usable / n;
  }

  const tracks: PixelRadialTrack[] = [];
  let rOuter = outerRadius;
  for (const bar of positive) {
    const rInner = Math.max(innerRadius, rOuter - thickness);
    if (rOuter - rInner < pixel * 0.5) break;

    const delta = (bar.value / maxVal) * sweep;
    tracks.push({
      name: bar.name,
      value: bar.value,
      startAngle,
      endAngle: startAngle + delta,
      rInner,
      rOuter,
    });
    rOuter = rInner - gap;
    if (rOuter <= innerRadius) break;
  }
  return tracks;
}

/** Alias — same row construction as pie. */
export function buildRadialBarList(
  data: readonly Record<string, unknown>[],
  dataKey: string,
  nameKey: string,
  config: Partial<Record<string, DuneSeriesConfig>> | undefined,
  baseColors: readonly string[],
): PixelRadialBar[] {
  return buildPieSliceList(data, dataKey, nameKey, config, baseColors);
}

/**
 * Discrete pixel radial-bar arcs in the plot rect.
 */
export function computePixelRadialLayout(
  bars: readonly PixelRadialBar[],
  plot: PlotRect,
  options: PixelRadialLayoutOptions = {},
): PixelRadialPlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || bars.length === 0) {
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
  const innerRadius = Math.min(
    outerRadius,
    resolveRadius(
      options.innerRadius,
      maxRadius,
      resolveRadius(DEFAULT_INNER, maxRadius, maxRadius * 0.3),
    ),
  );

  if (outerRadius - innerRadius < pixel) return null;

  const tracks = computeRadialTracks(bars, {
    innerRadius,
    outerRadius,
    pixel,
    startAngle: options.startAngle,
    endAngle: options.endAngle,
    barSize: options.barSize,
  });
  if (tracks.length === 0) return null;

  const cells: PixelRadialCell[] = [];
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
      const track = tracks.find(
        (t) =>
          dist <= t.rOuter &&
          dist >= t.rInner &&
          angleInDirectedSector(ang, t.startAngle, t.endAngle),
      );
      if (track == null) continue;

      const crestRow = Math.max(0, Math.floor((track.rOuter - dist) / pixel));
      cells.push({ x, y, barName: track.name, crestRow });
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
    tracks,
    cells,
  };
}

export type { PixelWaveBands };
