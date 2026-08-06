import { cellAngleDeg, normalizeDeg } from './pixelPieEngine';
import type { PixelWaveSeries, PlotRect } from './pixelWaveEngine';

const DEFAULT_PIXEL = 4;
/** Match Recharts radar default outer feel (~80% of half-min plot). */
const OUTER_FRACTION = 0.8;

export type PixelRadarVertex = {
  angle: number;
  radius: number;
  x: number;
  y: number;
};

export type PixelRadarCell = {
  /** Absolute chart X of the cell’s top-left corner. */
  x: number;
  /** Absolute chart Y of the cell’s top-left corner. */
  y: number;
  seriesName: string;
  /** Rows inward from polygon rim (crest = 0). */
  crestRow: number;
};

export type PixelRadarSeriesPath = {
  seriesName: string;
  vertices: PixelRadarVertex[];
  cells: PixelRadarCell[];
};

export type PixelRadarPlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  cx: number;
  cy: number;
  outerRadius: number;
  domainMax: number;
  pixel: number;
  paths: PixelRadarSeriesPath[];
};

export type PixelRadarLayoutOptions = {
  pixel?: number;
  /** Override radius domain max (default: max of all series values). */
  domainMax?: number;
};

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

/** Polar → screen (0° at +x, CCW with +y up / screen y down). */
export function polarToScreen(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy - radius * Math.sin(rad),
  };
}

/** Evenly spaced angles for `count` spokes (degrees). */
export function radarSpokeAngles(count: number): number[] {
  if (count <= 0) return [];
  const step = 360 / count;
  return Array.from({ length: count }, (_, i) => i * step);
}

/**
 * Classic even-odd / ray-cast point-in-polygon (vertices in order, closed implicitly).
 */
export function pointInPolygon(
  px: number,
  py: number,
  vertices: readonly { x: number; y: number }[],
): boolean {
  const n = vertices.length;
  if (n < 3) return false;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i, i += 1) {
    const vi = vertices[i];
    const vj = vertices[j];
    if (vi == null || vj == null) continue;
    const intersect =
      vi.y > py !== vj.y > py &&
      px < ((vj.x - vi.x) * (py - vi.y)) / (vj.y - vi.y + Number.EPSILON) + vi.x;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Radius of the polygon rim along a ray from the center at `angleDeg`
 * (intersection with the closed polyline of vertices).
 */
export function rimRadiusAtAngle(
  cx: number,
  cy: number,
  vertices: readonly PixelRadarVertex[],
  angleDeg: number,
): number {
  const n = vertices.length;
  if (n === 0) return 0;
  if (n === 1) return vertices[0]?.radius ?? 0;

  const a = normalizeDeg(angleDeg);
  const rad = (a * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = -Math.sin(rad);

  let best = 0;
  for (let i = 0; i < n; i += 1) {
    const v0 = vertices[i];
    const v1 = vertices[(i + 1) % n];
    if (v0 == null || v1 == null) continue;

    const ex = v1.x - v0.x;
    const ey = v1.y - v0.y;
    // Solve: (cx,cy) + t*(dx,dy) = (v0.x,v0.y) + u*(ex,ey), t>=0, u in [0,1]
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const ox = v0.x - cx;
    const oy = v0.y - cy;
    const t = (ox * ey - oy * ex) / den;
    const u = (ox * dy - oy * dx) / den;
    if (t >= 0 && u >= 0 && u <= 1) {
      best = Math.max(best, t);
    }
  }
  return best;
}

function domainMaxOf(series: readonly PixelWaveSeries[]): number {
  let max = 0;
  for (const s of series) {
    for (const v of s.values) {
      if (Number.isFinite(v) && v > max) max = v;
    }
  }
  return max > 0 ? max : 1;
}

/**
 * Discrete pixel-filled radar polygons in the plot rect.
 */
export function computePixelRadarLayout(
  series: readonly PixelWaveSeries[],
  plot: PlotRect,
  pointCount: number,
  options: PixelRadarLayoutOptions = {},
): PixelRadarPlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || series.length === 0 || pointCount === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const plotH = Math.max(pixel, snapDown(plot.height, pixel));
  const plotX = plot.x;
  const plotY = plot.y;
  const cx = plotX + plotW / 2;
  const cy = plotY + plotH / 2;
  const outerRadius = (Math.min(plotW, plotH) / 2) * OUTER_FRACTION;
  if (outerRadius < pixel) return null;

  const domainMax =
    options.domainMax != null && Number.isFinite(options.domainMax) && options.domainMax > 0
      ? options.domainMax
      : domainMaxOf(series);

  const angles = radarSpokeAngles(pointCount);
  const paths: PixelRadarSeriesPath[] = [];

  const x0 = snapDown(cx - outerRadius, pixel);
  const y0 = snapDown(cy - outerRadius, pixel);
  const x1 = cx + outerRadius;
  const y1 = cy + outerRadius;

  for (const s of series) {
    const vertices: PixelRadarVertex[] = [];
    for (let i = 0; i < pointCount; i += 1) {
      const raw = s.values[i] ?? 0;
      const value = Number.isFinite(raw) ? Math.max(0, raw) : 0;
      const angle = angles[i] ?? 0;
      const radius = (value / domainMax) * outerRadius;
      const { x, y } = polarToScreen(cx, cy, radius, angle);
      vertices.push({ angle, radius, x, y });
    }

    const cells: PixelRadarCell[] = [];
    if (vertices.length >= 3) {
      for (let x = x0; x <= x1; x += pixel) {
        for (let y = y0; y <= y1; y += pixel) {
          const mx = x + pixel / 2;
          const my = y + pixel / 2;
          if (!pointInPolygon(mx, my, vertices)) continue;

          const dist = Math.hypot(mx - cx, my - cy);
          const ang = cellAngleDeg(cx, cy, mx, my);
          const rim = rimRadiusAtAngle(cx, cy, vertices, ang);
          const crestRow = Math.max(0, Math.floor((rim - dist) / pixel));
          cells.push({ x, y, seriesName: s.name, crestRow });
        }
      }
    }

    paths.push({ seriesName: s.name, vertices, cells });
  }

  return {
    plotX,
    plotY,
    plotW,
    plotH,
    cx,
    cy,
    outerRadius,
    domainMax,
    pixel,
    paths,
  };
}
