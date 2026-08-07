import {
  createEmptyLevelPaths,
  ensureLevelPath,
  fillDitherLevelPaths,
  type DitherPatternCache,
} from '../shared/ditherTiles';
import {
  bandIndexFromCrestRow,
  ditherLevelForCrestRow,
  ditherToneFromBands,
  sortDrawOrder,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';
import type { PixelBarPlotLayout, PixelBarSegment } from './pixelBarEngine';

export type PaintPixelBarsOptions = {
  layout: PixelBarPlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
};

function paintSegmentBands(
  ctx: CanvasRenderingContext2D,
  seg: PixelBarSegment,
  seriesDef: PixelWaveSeries,
  pixel: number,
  plotX: number,
  plotY: number,
): void {
  if (seg.cellCount <= 0) return;

  if (seg.crest === 'top') {
    const cols = Math.max(1, Math.floor(seg.width / pixel));
    const localX0 = seg.x - plotX;
    const width = cols * pixel;
    for (let row = 0; row < seg.cellCount; row += 1) {
      const band = bandIndexFromCrestRow(row);
      const localY = seg.y + row * pixel - plotY;
      ctx.fillStyle = seriesDef.bands[band] ?? seriesDef.bands[0] ?? '#888888';
      ctx.fillRect(localX0, localY, width, pixel);
    }
    return;
  }

  // crest === 'right' — horizontal bars; crest at the free (right) end
  const rows = Math.max(1, Math.floor(seg.height / pixel));
  const localY0 = seg.y - plotY;
  const height = rows * pixel;
  for (let col = 0; col < seg.cellCount; col += 1) {
    const band = bandIndexFromCrestRow(col);
    const localX = seg.x + seg.width - (col + 1) * pixel - plotX;
    ctx.fillStyle = seriesDef.bands[band] ?? seriesDef.bands[0] ?? '#888888';
    ctx.fillRect(localX, localY0, pixel, height);
  }
}

function appendSegmentDitherRuns(
  paths: (Path2D | null)[],
  seg: PixelBarSegment,
  pixel: number,
  plotX: number,
  plotY: number,
): void {
  if (seg.cellCount <= 0) return;

  if (seg.crest === 'top') {
    const cols = Math.max(1, Math.floor(seg.width / pixel));
    const localX0 = seg.x - plotX;
    const width = cols * pixel;

    let runLevel = -1;
    let runStart = 0;
    for (let row = 0; row <= seg.cellCount; row += 1) {
      const level = row < seg.cellCount ? ditherLevelForCrestRow(row) : -1;
      if (level === runLevel) continue;
      if (runLevel >= 0) {
        const path = ensureLevelPath(paths, runLevel);
        path.rect(localX0, seg.y + runStart * pixel - plotY, width, (row - runStart) * pixel);
      }
      runLevel = level;
      runStart = row;
    }
    return;
  }

  // crest === 'right'
  const rows = Math.max(1, Math.floor(seg.height / pixel));
  const localY0 = seg.y - plotY;
  const height = rows * pixel;

  let runLevel = -1;
  let runStart = 0;
  for (let col = 0; col <= seg.cellCount; col += 1) {
    const level = col < seg.cellCount ? ditherLevelForCrestRow(col) : -1;
    if (level === runLevel) continue;
    if (runLevel >= 0) {
      const path = ensureLevelPath(paths, runLevel);
      const runCols = col - runStart;
      // Crest is on the right; runStart is near crest (right), later cols go left.
      const localX = seg.x + seg.width - col * pixel - plotX;
      path.rect(localX, localY0, runCols * pixel, height);
    }
    runLevel = level;
    runStart = col;
  }
}

/**
 * Paint discrete pixel bars into a plot-local canvas context.
 * Segment coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelBars(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelBarsOptions,
): void {
  const { layout, series, fill = 'bands' } = options;
  const { pixel, plotX, plotY, plotW, plotH } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(series.map((s) => [s.name, s]));
  const drawOrder = sortDrawOrder(series);

  if (fill === 'dither') {
    const patternCache: DitherPatternCache = new Map();

    for (const s of drawOrder) {
      const seriesDef = byName.get(s.name);
      if (seriesDef == null) continue;
      const tone = ditherToneFromBands(seriesDef.bands);
      const paths = createEmptyLevelPaths();

      for (const group of layout.groups) {
        for (const seg of group.segments) {
          if (seg.seriesName !== s.name) continue;
          appendSegmentDitherRuns(paths, seg, pixel, plotX, plotY);
        }
      }

      fillDitherLevelPaths(ctx, paths, patternCache, tone, plotX, plotY);
    }
    return;
  }

  for (const s of drawOrder) {
    for (const group of layout.groups) {
      for (const seg of group.segments) {
        if (seg.seriesName !== s.name) continue;
        const seriesDef = byName.get(s.name);
        if (seriesDef == null) continue;
        paintSegmentBands(ctx, seg, seriesDef, pixel, plotX, plotY);
      }
    }
  }
}
