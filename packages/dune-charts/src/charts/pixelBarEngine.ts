import {
  sampleSeriesAt,
  type PixelWaveSeries,
  type PixelWaveXScale,
  type PlotRect,
} from './pixelWaveEngine';

const DEFAULT_PIXEL = 2;
/** Fraction of category band used by the bar block (rest is gap). */
const BAR_BAND_FILL = 0.62;

/**
 * Recharts `BarChart` layout:
 * - `horizontal` (default) — categories on X, vertical bars
 * - `vertical` — categories on Y, horizontal bars
 */
export type PixelBarChartLayout = 'horizontal' | 'vertical';

export type PixelBarSegment = {
  seriesName: string;
  /** Left edge of the bar rectangle (chart coords). */
  x: number;
  /** Top edge of the bar rectangle (chart coords). */
  y: number;
  /** Full rect width. */
  width: number;
  /** Full rect height. */
  height: number;
  /** Cells along the value axis (crest → baseline). */
  cellCount: number;
  /** Outer rim for crest→depth banding. */
  crest: 'top' | 'right';
};

export type PixelBarGroup = {
  dataIndex: number;
  segments: PixelBarSegment[];
};

export type PixelBarPlotLayout = {
  plotX: number;
  plotY: number;
  plotW: number;
  plotH: number;
  baseline: number;
  pixel: number;
  layout: PixelBarChartLayout;
  groups: PixelBarGroup[];
};

function snapDown(n: number, pixel: number) {
  return Math.floor(n / pixel) * pixel;
}

/** Snap so distance from baseline is an integer pixel count (Y grows down). */
function snapYFromBaseline(y: number, baseline: number, pixel: number) {
  return baseline - Math.round((baseline - y) / pixel) * pixel;
}

/** Snap so distance from baseline is an integer pixel count (X grows right). */
function snapXFromBaseline(x: number, baseline: number, pixel: number) {
  return baseline + Math.round((x - baseline) / pixel) * pixel;
}

function buildCategoryCenters(
  indexValues: readonly unknown[],
  categoryScale: PixelWaveXScale,
): number[] | null {
  const centers: number[] = [];
  for (const value of indexValues) {
    const mid = categoryScale(value, { position: 'middle' });
    const c = mid ?? categoryScale(value);
    if (c == null || !Number.isFinite(c)) return null;
    centers.push(c);
  }
  return centers.length > 0 ? centers : null;
}

function bandWidthAt(centers: readonly number[], index: number, span: number): number {
  const n = centers.length;
  if (n <= 1) return span;
  if (index === 0) {
    const a = centers[0] ?? 0;
    const b = centers[1] ?? a + span;
    return Math.max(1, b - a);
  }
  if (index === n - 1) {
    const a = centers[n - 2] ?? 0;
    const b = centers[n - 1] ?? a;
    return Math.max(1, b - a);
  }
  const prev = centers[index - 1] ?? 0;
  const next = centers[index + 1] ?? prev;
  return Math.max(1, (next - prev) / 2);
}

function layoutVerticalBar(
  s: PixelWaveSeries,
  dataIndex: number,
  valueScale: (value: number) => number,
  baseline: number,
  pixel: number,
  maxCells: number,
  barX: number,
  barWidth: number,
): PixelBarSegment {
  const upper = sampleSeriesAt(s.values, dataIndex);
  const lower = s.bases ? sampleSeriesAt(s.bases, dataIndex) : 0;
  if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
    return {
      seriesName: s.name,
      x: barX,
      y: baseline,
      width: barWidth,
      height: 0,
      cellCount: 0,
      crest: 'top',
    };
  }

  const crestRaw = valueScale(upper);
  const floorRaw = valueScale(lower);
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
  const minCells = s.bases != null ? 0 : 1;
  const cells = Math.max(minCells, Math.min(maxCells, baseCells));
  const topY = dataBottom - cells * pixel;

  return {
    seriesName: s.name,
    x: barX,
    y: topY,
    width: barWidth,
    height: cells * pixel,
    cellCount: cells,
    crest: 'top',
  };
}

function layoutHorizontalBar(
  s: PixelWaveSeries,
  dataIndex: number,
  valueScale: (value: number) => number,
  baseline: number,
  pixel: number,
  maxCells: number,
  barY: number,
  barHeight: number,
): PixelBarSegment {
  const upper = sampleSeriesAt(s.values, dataIndex);
  const lower = s.bases ? sampleSeriesAt(s.bases, dataIndex) : 0;
  if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
    return {
      seriesName: s.name,
      x: baseline,
      y: barY,
      width: 0,
      height: barHeight,
      cellCount: 0,
      crest: 'right',
    };
  }

  const crestRaw = valueScale(upper);
  const floorRaw = valueScale(lower);
  const crestX = Number.isFinite(crestRaw) ? crestRaw : baseline;
  const floorX = Number.isFinite(floorRaw) ? floorRaw : baseline;

  let dataRight = snapXFromBaseline(Math.max(crestX, floorX), baseline, pixel);
  let dataLeft = snapXFromBaseline(Math.min(crestX, floorX), baseline, pixel);
  if (dataRight < dataLeft) {
    const swap = dataRight;
    dataRight = dataLeft;
    dataLeft = swap;
  }

  const baseCells = Math.max(0, Math.round((dataRight - dataLeft) / pixel));
  const minCells = s.bases != null ? 0 : 1;
  const cells = Math.max(minCells, Math.min(maxCells, baseCells));
  const leftX = dataRight - cells * pixel;

  return {
    seriesName: s.name,
    x: leftX,
    y: barY,
    width: cells * pixel,
    height: barHeight,
    cellCount: cells,
    crest: 'right',
  };
}

/**
 * Snap a desired bar thickness down to the pixel grid (at least one cell).
 */
export function snapBarWidth(rawWidth: number, pixel: number): number {
  return Math.max(pixel, snapDown(rawWidth, pixel));
}

export type ComputePixelBarPlotLayoutOptions = {
  pixel?: number;
  indexValues?: readonly unknown[];
  /** Category-axis scale (X for vertical bars, Y for horizontal bars). */
  categoryScale?: PixelWaveXScale;
  /** @deprecated Alias for `categoryScale`. */
  xScale?: PixelWaveXScale;
  /** Recharts BarChart layout. Default `horizontal` (vertical bars). */
  layout?: PixelBarChartLayout;
};

/**
 * Discrete pixel bars at category centers. Stacked series share the category
 * slot; unstacked multi-series are grouped side-by-side within the band.
 */
export function computePixelBarPlotLayout(
  series: readonly PixelWaveSeries[],
  plot: PlotRect,
  valueScale: (value: number) => number,
  pointCount: number,
  options: ComputePixelBarPlotLayoutOptions = {},
): PixelBarPlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || series.length === 0 || pointCount === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const layout: PixelBarChartLayout = options.layout ?? 'horizontal';
  const categoryScale = options.categoryScale ?? options.xScale;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const plotH = Math.max(pixel, snapDown(plot.height, pixel));

  const baselineRaw = valueScale(0);
  const baseline =
    Number.isFinite(baselineRaw)
      ? baselineRaw
      : layout === 'horizontal'
        ? plot.y + plot.height
        : plot.x;

  const maxCells =
    layout === 'horizontal'
      ? Math.max(1, Math.floor((baseline - plot.y) / pixel))
      : Math.max(1, Math.floor((plot.x + plotW - baseline) / pixel));

  const stacked = series.some((s) => s.stackIndex != null);
  const categoryCenters =
    categoryScale != null && options.indexValues != null && options.indexValues.length > 0
      ? buildCategoryCenters(options.indexValues, categoryScale)
      : null;

  const categorySpan = layout === 'horizontal' ? plotW : plotH;
  const groups: PixelBarGroup[] = [];

  for (let i = 0; i < pointCount; i += 1) {
    let center: number;
    let band: number;
    if (categoryCenters != null) {
      center = categoryCenters[i] ?? (layout === 'horizontal' ? plot.x + plotW / 2 : plot.y + plotH / 2);
      band = bandWidthAt(categoryCenters, i, categorySpan);
    } else if (layout === 'horizontal') {
      const slot = plotW / pointCount;
      center = plot.x + slot * (i + 0.5);
      band = slot;
    } else {
      const slot = plotH / pointCount;
      center = plot.y + slot * (i + 0.5);
      band = slot;
    }

    const usable = Math.max(pixel, band * BAR_BAND_FILL);
    const segments: PixelBarSegment[] = [];

    if (layout === 'horizontal') {
      if (stacked || series.length === 1) {
        const width = snapBarWidth(usable, pixel);
        const x = snapDown(center - width / 2, pixel);
        for (const s of series) {
          segments.push(layoutVerticalBar(s, i, valueScale, baseline, pixel, maxCells, x, width));
        }
      } else {
        const gap = pixel;
        const totalGaps = Math.max(0, series.length - 1) * gap;
        const rawEach = (usable - totalGaps) / series.length;
        const width = snapBarWidth(rawEach, pixel);
        const groupWidth = series.length * width + totalGaps;
        let x = snapDown(center - groupWidth / 2, pixel);
        for (const s of series) {
          segments.push(layoutVerticalBar(s, i, valueScale, baseline, pixel, maxCells, x, width));
          x += width + gap;
        }
      }
    } else if (stacked || series.length === 1) {
      const height = snapBarWidth(usable, pixel);
      const y = snapDown(center - height / 2, pixel);
      for (const s of series) {
        segments.push(layoutHorizontalBar(s, i, valueScale, baseline, pixel, maxCells, y, height));
      }
    } else {
      const gap = pixel;
      const totalGaps = Math.max(0, series.length - 1) * gap;
      const rawEach = (usable - totalGaps) / series.length;
      const height = snapBarWidth(rawEach, pixel);
      const groupHeight = series.length * height + totalGaps;
      let y = snapDown(center - groupHeight / 2, pixel);
      for (const s of series) {
        segments.push(layoutHorizontalBar(s, i, valueScale, baseline, pixel, maxCells, y, height));
        y += height + gap;
      }
    }

    groups.push({ dataIndex: i, segments });
  }

  return {
    plotX: plot.x,
    plotY: plot.y,
    plotW,
    plotH: plot.height,
    baseline,
    pixel,
    layout,
    groups,
  };
}
