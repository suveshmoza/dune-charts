export const PIXEL_WAVE_BAND_COUNT = 5;

export const PIXEL_WAVE_FILLS = ['bands', 'dither'] as const;
export type PixelWaveFill = (typeof PIXEL_WAVE_FILLS)[number];

/** Crest → depth fills generated from one base hue (or an explicit override). */
export type PixelWaveBands = readonly [string, string, string, string, string];

/** Classic 4×4 Bayer matrix for ordered dither (values 0–15). */
export const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** Threshold in 0..1 for ordered dither at integer grid coords. */
export function ditherThreshold(x: number, y: number): number {
  const row = BAYER_4[y & 3];
  const cell = row?.[x & 3] ?? 0;
  return (cell + 0.5) / 16;
}

/**
 * Crest→depth dither density for a band ribbon.
 * Higher near the crest so the series color reads denser at the edge.
 */
export function ditherDensityForBand(bandIndex: 0 | 1 | 2 | 3 | 4): number {
  return [0.82, 0.7, 0.58, 0.46, 0.34][bandIndex] ?? 0.5;
}

/** Darken a CSS color for the dither mesh shadow tone. */
function darkenForDither(color: string, amount = 0.55): string {
  const parsed = parseCssColor(color);
  if (parsed == null) return color;
  return hslToCss(parsed.h, Math.min(parsed.s, 70), Math.max(10, parsed.l * (1 - amount)));
}

/** Band color + darkened sibling used as the dither hi/lo tones. */
export function ditherPairFromBands(
  bands: PixelWaveBands,
  bandIndex: 0 | 1 | 2 | 3 | 4,
): readonly [string, string] {
  const hi = bands[bandIndex] ?? bands[0] ?? '#888888';
  // Strong charcoal twin (same hue) so Bayer reads like the reference mesh.
  const lo = darkenForDither(hi);
  return [hi, lo];
}

export type DitherPatternCell = {
  x: number;
  y: number;
  size: number;
  fill: string;
};

/** Build one Bayer tile of solid subpixels between `hi` and `lo`. */
export function buildBayerTile(
  hi: string,
  lo: string,
  density: number,
  subpixel = 2,
): DitherPatternCell[] {
  const cells: DitherPatternCell[] = [];
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      cells.push({
        x: x * subpixel,
        y: y * subpixel,
        size: subpixel,
        fill: density > ditherThreshold(x, y) ? hi : lo,
      });
    }
  }
  return cells;
}

export type PixelWaveSeries = {
  name: string;
  /** Upper bound in data space (crest). */
  values: readonly number[];
  /** Lower bound in data space. Defaults to 0 (from chart baseline). */
  bases?: readonly number[];
  bands: PixelWaveBands;
  /** Groups series that stack together; seams chain within a stack. */
  stackId?: string;
  /** When set, draw in stack order (bottom → top) instead of span sort. */
  stackIndex?: number;
};

/** Default hues aligned with `--dune-1…5` palette intent. */
export const DUNE_SERIES_HUES = [18, 43, 28, 168, 210] as const;

const LIGHTNESS_START = 50;
const LIGHTNESS_END = 68;
const SAT_START = 70;
const SAT_END = 58;

type Hsl = { h: number; s: number; l: number };

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function hslToCss(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function parseHexColor(input: string): Hsl | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return rgbToHsl(r, g, b);
}

function parseCssColor(input: string): Hsl | null {
  const value = input.trim();
  const hex = parseHexColor(value);
  if (hex) return hex;

  const hslMatch = value.match(
    /^hsla?\(\s*([+-]?\d*\.?\d+)(?:deg)?\s*[, ]\s*([+-]?\d*\.?\d+)%?\s*[, ]\s*([+-]?\d*\.?\d+)%?/i,
  );
  if (hslMatch) {
    return {
      h: Number(hslMatch[1]),
      s: Number(hslMatch[2]),
      l: Number(hslMatch[3]),
    };
  }

  const rgbMatch = value.match(
    /^rgba?\(\s*([+-]?\d*\.?\d+)\s*[, ]\s*([+-]?\d*\.?\d+)\s*[, ]\s*([+-]?\d*\.?\d+)/i,
  );
  if (rgbMatch) {
    return rgbToHsl(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
  }

  return null;
}

/**
 * Build 5 crest→depth bands from a single hue.
 * Fill eases dark → brighter (~50% → ~68%).
 */
export function bandsFromHue(hue: number, baseSaturation?: number): PixelWaveBands {
  const h = ((hue % 360) + 360) % 360;
  const satStart =
    baseSaturation == null ? SAT_START : clamp(Math.max(baseSaturation * 1.05, 58), 58, 82);
  const satEnd = baseSaturation == null ? SAT_END : clamp(baseSaturation * 0.85, 48, 70);

  const at = (i: number) => {
    const t = i / (PIXEL_WAVE_BAND_COUNT - 1);
    return hslToCss(
      h,
      satStart + (satEnd - satStart) * t,
      LIGHTNESS_START + (LIGHTNESS_END - LIGHTNESS_START) * t,
    );
  };

  return [at(0), at(1), at(2), at(3), at(4)];
}

/** Derive band ramp from a CSS color (hex / rgb / hsl). Falls back to hue index 0. */
export function bandsFromColor(
  color: string,
  fallbackHue: number = DUNE_SERIES_HUES[0],
): PixelWaveBands {
  const parsed = parseCssColor(color);
  if (parsed == null) return bandsFromHue(fallbackHue);
  return bandsFromHue(parsed.h, parsed.s);
}

/** Series band ramp: explicit bands → color hue → default series hue. */
export function resolveSeriesBands(
  seriesIndex: number,
  options?: { color?: string; bands?: PixelWaveBands },
): PixelWaveBands {
  if (options?.bands) return options.bands;
  const fallbackHue =
    DUNE_SERIES_HUES[seriesIndex % DUNE_SERIES_HUES.length] ?? DUNE_SERIES_HUES[0];
  if (options?.color) return bandsFromColor(options.color, fallbackHue);
  return bandsFromHue(fallbackHue);
}

export type PixelWaveColumn = {
  x: number;
  dataIndex: number;
  topY: Record<string, number>;
  cellCount: Record<string, number>;
};

export type PixelWavePlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  columns: PixelWaveColumn[];
  baseline: number;
  pixel: number;
};

export type PlotRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Recharts-compatible X scale (category → pixel). */
export type PixelWaveXScale = (
  value: unknown,
  options?: { position?: 'start' | 'middle' | 'end' },
) => number | undefined;

const DEFAULT_PIXEL = 4;

export function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function sampleSeries(values: readonly number[], t: number): number {
  const n = values.length;
  if (n <= 1) return sampleSeriesAt(values, 0);
  return sampleSeriesAt(values, t * (n - 1));
}

/** Sample series at a fractional data index (0 … n-1). */
export function sampleSeriesAt(values: readonly number[], index: number): number {
  const n = values.length;
  if (n === 0) return 0;
  const first = values[0];
  if (n === 1) return first ?? 0;
  const x = Math.min(Math.max(index, 0), n - 1);
  const i = Math.floor(x);
  const j = Math.min(i + 1, n - 1);
  return lerp(values[i] ?? 0, values[j] ?? 0, x - i);
}

/** Map a plot X to a fractional data index using category band centers. */
export function fractionalIndexFromX(x: number, centers: readonly number[]): number {
  const n = centers.length;
  if (n === 0) return 0;
  if (n === 1) return 0;
  const first = centers[0];
  const last = centers[n - 1];
  if (first == null || last == null) return 0;
  if (x <= first) return 0;
  if (x >= last) return n - 1;
  for (let i = 0; i < n - 1; i += 1) {
    const a = centers[i];
    const b = centers[i + 1];
    if (a == null || b == null) continue;
    if (x <= b) {
      if (b === a) return i;
      return i + (x - a) / (b - a);
    }
  }
  return n - 1;
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

/** Fixed-thickness contour ribbons from crest (not % of column height). */
export function bandIndexFromCrestRow(row: number): 0 | 1 | 2 | 3 | 4 {
  if (row < 2) return 0;
  if (row < 5) return 1;
  if (row < 9) return 2;
  if (row < 14) return 3;
  return 4;
}

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

/** Snap a plot Y so its distance from baseline is an integer pixel count. */
function snapYFromBaseline(y: number, baseline: number, pixel: number) {
  return baseline - Math.round((baseline - y) / pixel) * pixel;
}

function seriesSpan(s: PixelWaveSeries) {
  return Math.max(...s.values) - Math.min(...s.values);
}

export function sortDrawOrder(series: readonly PixelWaveSeries[]): PixelWaveSeries[] {
  const stacked = series.some((s) => s.stackIndex != null);
  if (stacked) {
    return series.toSorted((a, b) => (a.stackIndex ?? 0) - (b.stackIndex ?? 0));
  }
  return series.toSorted((a, b) => seriesSpan(b) - seriesSpan(a));
}

function layoutSeriesColumn(
  s: PixelWaveSeries,
  dataIndex: number,
  yScale: (value: number) => number,
  baseline: number,
  pixel: number,
  maxCells: number,
): { topY: number; cells: number } {
  const upper = sampleSeriesAt(s.values, dataIndex);
  const lower = s.bases ? sampleSeriesAt(s.bases, dataIndex) : 0;
  const crestRaw = yScale(upper);
  const floorRaw = yScale(lower);
  const crestY = Number.isFinite(crestRaw) ? crestRaw : baseline;
  const floorY = Number.isFinite(floorRaw) ? floorRaw : baseline;

  let dataBottom = snapYFromBaseline(Math.max(crestY, floorY), baseline, pixel);
  let dataTop = snapYFromBaseline(Math.min(crestY, floorY), baseline, pixel);
  if (dataBottom < dataTop) {
    const swap = dataBottom;
    dataBottom = dataTop;
    dataTop = swap;
  }

  const baseCells = Math.max(0, Math.round((dataBottom - dataTop) / pixel));
  // Stacked bands may be zero-height at a point; unstacked keep a 1px presence.
  const minCells = s.bases != null ? 0 : 1;
  const cells = Math.max(minCells, Math.min(maxCells, baseCells));
  return { cells, topY: dataBottom - cells * pixel };
}

/**
 * Pixel-wave columns aligned to Recharts plot rect + X/Y scales
 * so crests track axis ticks and data values.
 */
export function computePixelWavePlotLayout(
  series: readonly PixelWaveSeries[],
  plot: PlotRect,
  yScale: (value: number) => number,
  pointCount: number,
  options: {
    pixel?: number;
    indexValues?: readonly unknown[];
    xScale?: PixelWaveXScale;
  } = {},
): PixelWavePlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || series.length === 0 || pointCount === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const cols = Math.max(1, Math.floor(plotW / pixel));
  const baselineRaw = yScale(0);
  const baseline = Number.isFinite(baselineRaw) ? baselineRaw : plot.y + plot.height;
  const maxCells = Math.max(1, Math.floor((baseline - plot.y) / pixel));

  const categoryCenters =
    options.xScale != null && options.indexValues != null && options.indexValues.length > 0
      ? buildCategoryCenters(options.indexValues, options.xScale)
      : null;

  const columns: PixelWaveColumn[] = [];
  for (let c = 0; c < cols; c += 1) {
    const x = plot.x + c * pixel;
    const xCenter = x + pixel / 2;
    let dataIndex: number;
    if (categoryCenters != null) {
      dataIndex = fractionalIndexFromX(xCenter, categoryCenters);
    } else {
      const t = cols === 1 ? 0 : c / (cols - 1);
      dataIndex = t * Math.max(pointCount - 1, 0);
    }

    const col: PixelWaveColumn = {
      x,
      dataIndex: Math.round(dataIndex),
      topY: {},
      cellCount: {},
    };

    for (const s of series) {
      const { cells, topY } = layoutSeriesColumn(s, dataIndex, yScale, baseline, pixel, maxCells);
      col.cellCount[s.name] = cells;
      col.topY[s.name] = topY;
    }
    columns.push(col);
  }

  return {
    plotX: plot.x,
    plotY: plot.y,
    plotW,
    plotH: plot.height,
    columns,
    baseline,
    pixel,
  };
}

/** @deprecated Prefer `bandsFromHue` / `resolveSeriesBands`. */
export const DUNE_BAND_RAMPS: readonly PixelWaveBands[] = DUNE_SERIES_HUES.map((hue) =>
  bandsFromHue(hue),
);
