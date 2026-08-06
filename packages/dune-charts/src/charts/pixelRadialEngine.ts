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
  /** `value` = filled sweep; `track` = unfilled remainder of the ring. */
  kind: 'value' | 'track';
};

export type PixelRadialTrack = {
  name: string;
  value: number;
  /** Value-sweep start (degrees, Recharts convention). */
  startAngle: number;
  /** Value-sweep end (degrees) — may be less than start for clockwise sweeps. */
  endAngle: number;
  /** Full track domain start (degrees) for the unfilled remainder. */
  trackStartAngle: number;
  /** Full track domain end (degrees). */
  trackEndAngle: number;
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

/** Recharts RadialBar sector geometry used for paint/hit alignment. */
export type PixelRadialHitSector = {
  barName: string;
  value: number;
  cx: number;
  cy: number;
  rInner: number;
  rOuter: number;
  startAngle: number;
  endAngle: number;
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
 * Concentric tracks from inner → outer (first bar = innermost), matching
 * Recharts RadialBar category bands on the radius axis.
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
  let rInner = innerRadius;
  for (const bar of positive) {
    const rOuter = Math.min(outerRadius, rInner + thickness);
    if (rOuter - rInner < pixel * 0.5) break;

    const delta = (bar.value / maxVal) * sweep;
    tracks.push({
      name: bar.name,
      value: bar.value,
      startAngle,
      endAngle: startAngle + delta,
      trackStartAngle: startAngle,
      trackEndAngle: endAngle,
      rInner,
      rOuter,
    });
    rInner = rOuter + gap;
    if (rInner >= outerRadius) break;
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

function layoutFromTracks(
  tracks: readonly PixelRadialTrack[],
  plot: PlotRect,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  pixel: number,
): PixelRadialPlotLayout {
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const plotH = Math.max(pixel, snapDown(plot.height, pixel));
  const plotX = plot.x;
  const plotY = plot.y;

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

      const track = tracks.find((t) => dist <= t.rOuter && dist >= t.rInner);
      if (track == null) continue;

      const ang = cellAngleDeg(cx, cy, mx, my);
      const inValue = angleInDirectedSector(ang, track.startAngle, track.endAngle);
      const inTrack = angleInDirectedSector(ang, track.trackStartAngle, track.trackEndAngle);
      if (!inValue && !inTrack) continue;

      const crestRow = Math.max(0, Math.floor((track.rOuter - dist) / pixel));
      cells.push({
        x,
        y,
        barName: track.name,
        crestRow,
        kind: inValue ? 'value' : 'track',
      });
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
    tracks: [...tracks],
    cells,
  };
}

/**
 * Paint layout from Recharts RadialBar sector props (exact hit-target alignment).
 * `trackStartAngle` / `trackEndAngle` define the full ring domain for gray remainders.
 */
export function computePixelRadialLayoutFromHits(
  hits: readonly PixelRadialHitSector[],
  plot: PlotRect,
  pixel: number = DEFAULT_PIXEL,
  trackDomain: { startAngle?: number; endAngle?: number } = {},
): PixelRadialPlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || hits.length === 0) return null;

  const trackStartAngle = trackDomain.startAngle ?? 0;
  const trackEndAngle = trackDomain.endAngle ?? 360;

  const tracks: PixelRadialTrack[] = [];
  let cx = 0;
  let cy = 0;
  let innerRadius = Infinity;
  let outerRadius = -Infinity;

  for (const hit of hits) {
    if (
      !Number.isFinite(hit.cx) ||
      !Number.isFinite(hit.cy) ||
      !Number.isFinite(hit.rInner) ||
      !Number.isFinite(hit.rOuter) ||
      hit.rOuter - hit.rInner < pixel * 0.25
    ) {
      continue;
    }

    cx = hit.cx;
    cy = hit.cy;
    innerRadius = Math.min(innerRadius, hit.rInner);
    outerRadius = Math.max(outerRadius, hit.rOuter);

    const hasValue = Math.abs(hit.endAngle - hit.startAngle) >= 1e-6;
    tracks.push({
      name: hit.barName,
      value: hit.value,
      startAngle: hasValue ? hit.startAngle : trackStartAngle,
      endAngle: hasValue ? hit.endAngle : trackStartAngle,
      trackStartAngle,
      trackEndAngle,
      rInner: hit.rInner,
      rOuter: hit.rOuter,
    });
  }

  if (tracks.length === 0 || !(outerRadius > innerRadius)) return null;

  return layoutFromTracks(tracks, plot, cx, cy, innerRadius, outerRadius, pixel);
}

/** Stable signature for hit-sector lists (skip redundant React state updates). */
export function radialHitsSignature(hits: readonly PixelRadialHitSector[]): string {
  return hits
    .map(
      (h) =>
        `${h.barName}:${h.cx.toFixed(2)},${h.cy.toFixed(2)},${h.rInner.toFixed(2)},${h.rOuter.toFixed(2)},${h.startAngle.toFixed(2)},${h.endAngle.toFixed(2)}`,
    )
    .join('|');
}

/**
 * Discrete pixel radial-bar arcs in the plot rect (fallback when hit sectors
 * are not yet available). Prefer `computePixelRadialLayoutFromHits`.
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

  return layoutFromTracks(tracks, plot, cx, cy, innerRadius, outerRadius, pixel);
}

export type { PixelWaveBands };
