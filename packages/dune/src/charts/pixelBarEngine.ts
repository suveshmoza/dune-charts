import {
  sampleSeriesAt,
  type PixelWaveSeries,
  type PixelWaveXScale,
  type PlotRect,
} from './pixelWaveEngine';

const DEFAULT_PIXEL = 4;
/** Fraction of category band used by the bar block (rest is gap). */
const BAR_BAND_FILL = 0.62;

export type PixelBarSegment = {
  seriesName: string;
  x: number;
  width: number;
  topY: number;
  cellCount: number;
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
  groups: PixelBarGroup[];
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

function bandWidthAt(centers: readonly number[], index: number, plotW: number): number {
  const n = centers.length;
  if (n <= 1) return plotW;
  if (index === 0) {
    const a = centers[0] ?? 0;
    const b = centers[1] ?? a + plotW;
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

function layoutBarHeight(
  s: PixelWaveSeries,
  dataIndex: number,
  yScale: (value: number) => number,
  baseline: number,
  pixel: number,
  maxCells: number,
): { topY: number; cells: number } {
  const upper = sampleSeriesAt(s.values, dataIndex);
  const lower = s.bases ? sampleSeriesAt(s.bases, dataIndex) : 0;
  if (!Number.isFinite(upper) || !Number.isFinite(lower)) {
    return { cells: 0, topY: baseline };
  }

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
  const minCells = s.bases != null ? 0 : 1;
  const cells = Math.max(minCells, Math.min(maxCells, baseCells));
  return { cells, topY: dataBottom - cells * pixel };
}

/**
 * Snap a desired bar width down to the pixel grid (at least one cell).
 */
export function snapBarWidth(rawWidth: number, pixel: number): number {
  return Math.max(pixel, snapDown(rawWidth, pixel));
}

/**
 * Discrete pixel bars at category centers. Stacked series share x;
 * unstacked multi-series are grouped side-by-side within the band.
 */
export function computePixelBarPlotLayout(
  series: readonly PixelWaveSeries[],
  plot: PlotRect,
  yScale: (value: number) => number,
  pointCount: number,
  options: {
    pixel?: number;
    indexValues?: readonly unknown[];
    xScale?: PixelWaveXScale;
  } = {},
): PixelBarPlotLayout | null {
  if (plot.width <= 0 || plot.height <= 0 || series.length === 0 || pointCount === 0) {
    return null;
  }

  const pixel = options.pixel ?? DEFAULT_PIXEL;
  const plotW = Math.max(pixel, snapDown(plot.width, pixel));
  const baselineRaw = yScale(0);
  const baseline = Number.isFinite(baselineRaw) ? baselineRaw : plot.y + plot.height;
  const maxCells = Math.max(1, Math.floor((baseline - plot.y) / pixel));

  const stacked = series.some((s) => s.stackIndex != null);
  const categoryCenters =
    options.xScale != null && options.indexValues != null && options.indexValues.length > 0
      ? buildCategoryCenters(options.indexValues, options.xScale)
      : null;

  const groups: PixelBarGroup[] = [];

  for (let i = 0; i < pointCount; i += 1) {
    let center: number;
    let band: number;
    if (categoryCenters != null) {
      center = categoryCenters[i] ?? plot.x + plotW / 2;
      band = bandWidthAt(categoryCenters, i, plotW);
    } else {
      const slot = plotW / pointCount;
      center = plot.x + slot * (i + 0.5);
      band = slot;
    }

    const usable = Math.max(pixel, band * BAR_BAND_FILL);
    const segments: PixelBarSegment[] = [];

    if (stacked || series.length === 1) {
      const width = snapBarWidth(usable, pixel);
      const x = snapDown(center - width / 2, pixel);
      for (const s of series) {
        const { cells, topY } = layoutBarHeight(s, i, yScale, baseline, pixel, maxCells);
        segments.push({ seriesName: s.name, x, width, topY, cellCount: cells });
      }
    } else {
      const gap = pixel;
      const totalGaps = Math.max(0, series.length - 1) * gap;
      const rawEach = (usable - totalGaps) / series.length;
      const width = snapBarWidth(rawEach, pixel);
      const groupWidth = series.length * width + totalGaps;
      let x = snapDown(center - groupWidth / 2, pixel);
      for (const s of series) {
        const { cells, topY } = layoutBarHeight(s, i, yScale, baseline, pixel, maxCells);
        segments.push({ seriesName: s.name, x, width, topY, cellCount: cells });
        x += width + gap;
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
    groups,
  };
}
