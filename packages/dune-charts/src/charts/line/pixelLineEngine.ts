import {
  sampleSeriesAt,
  type PixelWaveSeries,
  type PixelWaveXScale,
  type PlotRect,
} from '../shared/pixelWaveEngine';

const DEFAULT_PIXEL = 2;

export type PixelLineCell = {
  /** Absolute chart X of the cell’s top-left corner. */
  x: number;
  /** Absolute chart Y of the cell’s top-left corner. */
  y: number;
};

export type PixelLinePath = {
  seriesName: string;
  cells: PixelLineCell[];
};

export type PixelLinePlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  baseline: number;
  pixel: number;
  paths: PixelLinePath[];
};

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

function snapYFromBaseline(y: number, baseline: number, pixel: number) {
  return baseline - Math.round((baseline - y) / pixel) * pixel;
}

function buildCategoryCenters(
  indexValues: readonly unknown[],
  xScale: PixelWaveXScale,
): number[] | null {
  const centers: number[] = [];
  for (const value of indexValues) {
    const mid = xScale(value, { position: 'middle' });
    const x = mid ?? xScale(value);
    if (x == null || !Number.isFinite(x)) return null;
    centers.push(x);
  }
  return centers.length > 0 ? centers : null;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Append a horizontal run of 1-cell-thick pixels (inclusive). */
export function appendHorizontalRun(
  cells: Map<string, PixelLineCell>,
  x0: number,
  x1: number,
  y: number,
  pixel: number,
): void {
  const left = Math.min(x0, x1);
  const right = Math.max(x0, x1);
  for (let x = left; x <= right; x += pixel) {
    cells.set(cellKey(x, y), { x, y });
  }
}

/** Append a vertical run of 1-cell-thick pixels (inclusive). */
export function appendVerticalRun(
  cells: Map<string, PixelLineCell>,
  y0: number,
  y1: number,
  x: number,
  pixel: number,
): void {
  const top = Math.min(y0, y1);
  const bottom = Math.max(y0, y1);
  for (let y = top; y <= bottom; y += pixel) {
    cells.set(cellKey(x, y), { x, y });
  }
}

/**
 * Bresenham line on the pixel grid between two snapped points (inclusive).
 * Matches Recharts `type="linear"` connectivity while staying 1 cell thick.
 */
export function appendBresenhamRun(
  cells: Map<string, PixelLineCell>,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  pixel: number,
): void {
  let gx0 = Math.round(x0 / pixel);
  let gy0 = Math.round(y0 / pixel);
  const gx1 = Math.round(x1 / pixel);
  const gy1 = Math.round(y1 / pixel);

  const dx = Math.abs(gx1 - gx0);
  const dy = Math.abs(gy1 - gy0);
  const sx = gx0 < gx1 ? 1 : -1;
  const sy = gy0 < gy1 ? 1 : -1;
  let err = dx - dy;

  for (;;) {
    const x = gx0 * pixel;
    const y = gy0 * pixel;
    cells.set(cellKey(x, y), { x, y });
    if (gx0 === gx1 && gy0 === gy1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      gx0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      gy0 += sy;
    }
  }
}

/**
 * Linear (diagonal) path between snapped points — Recharts-style polyline.
 */
export function rasterizeLinear(
  points: readonly { x: number; y: number }[],
  pixel: number,
): PixelLineCell[] {
  const cells = new Map<string, PixelLineCell>();
  if (points.length === 0) return [];

  const first = points[0];
  if (first != null) {
    cells.set(cellKey(first.x, first.y), { x: first.x, y: first.y });
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (a == null || b == null) continue;
    appendBresenhamRun(cells, a.x, a.y, b.x, b.y, pixel);
  }

  return [...cells.values()];
}

/**
 * Discrete pixel lines at category centers (linear segments, 1 cell thick).
 */
export function computePixelLinePlotLayout(
  series: readonly PixelWaveSeries[],
  plot: PlotRect,
  yScale: (value: number) => number,
  pointCount: number,
  options: {
    pixel?: number;
    indexValues?: readonly unknown[];
    xScale?: PixelWaveXScale;
  } = {},
): PixelLinePlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || series.length === 0 || pointCount === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const baselineRaw = yScale(0);
  const baseline = Number.isFinite(baselineRaw) ? baselineRaw : plot.y + plot.height;

  const categoryCenters =
    options.xScale != null && options.indexValues != null && options.indexValues.length > 0
      ? buildCategoryCenters(options.indexValues, options.xScale)
      : null;

  const paths: PixelLinePath[] = [];

  for (const s of series) {
    const points: { x: number; y: number }[] = [];

    for (let i = 0; i < pointCount; i += 1) {
      let center: number;
      if (categoryCenters != null) {
        center = categoryCenters[i] ?? plot.x + plotW / 2;
      } else {
        const slot = plotW / pointCount;
        center = plot.x + slot * (i + 0.5);
      }

      const value = sampleSeriesAt(s.values, i);
      if (!Number.isFinite(value)) continue;

      const rawY = yScale(value);
      if (!Number.isFinite(rawY)) continue;

      const x = snapDown(center, pixel);
      const y = snapYFromBaseline(rawY, baseline, pixel);
      points.push({ x, y });
    }

    paths.push({
      seriesName: s.name,
      cells: rasterizeLinear(points, pixel),
    });
  }

  return {
    plotX: plot.x,
    plotY: plot.y,
    plotW,
    plotH: plot.height,
    baseline,
    pixel,
    paths,
  };
}
