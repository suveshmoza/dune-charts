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
  type PixelWavePlotLayout,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';

export type PaintPixelWaveOptions = {
  layout: PixelWavePlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
};

/**
 * Paint pixel-wave cells into a plot-local canvas context.
 * Layout column coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelWave(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelWaveOptions,
): void {
  const { layout, series, fill = 'bands' } = options;
  const { pixel, plotX, plotY, plotW, plotH } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const drawOrder = sortDrawOrder(series);

  if (fill === 'dither') {
    const patternCache: DitherPatternCache = new Map();

    for (const s of drawOrder) {
      const tone = ditherToneFromBands(s.bands);
      const paths = createEmptyLevelPaths();

      for (const col of layout.columns) {
        const topY = col.topY[s.name] ?? 0;
        const cellCount = col.cellCount[s.name] ?? 0;
        if (cellCount <= 0) continue;
        const localX = col.x - plotX;

        let runLevel = -1;
        let runStart = 0;
        for (let row = 0; row <= cellCount; row += 1) {
          const level = row < cellCount ? ditherLevelForCrestRow(row) : -1;
          if (level === runLevel) continue;
          if (runLevel >= 0) {
            const path = ensureLevelPath(paths, runLevel);
            path.rect(localX, topY + runStart * pixel - plotY, pixel, (row - runStart) * pixel);
          }
          runLevel = level;
          runStart = row;
        }
      }

      fillDitherLevelPaths(ctx, paths, patternCache, tone, plotX, plotY);
    }
    return;
  }

  for (const s of drawOrder) {
    for (const col of layout.columns) {
      const topY = col.topY[s.name] ?? 0;
      const cellCount = col.cellCount[s.name] ?? 0;
      const localX = col.x - plotX;

      for (let row = 0; row < cellCount; row += 1) {
        const band = bandIndexFromCrestRow(row);
        const localY = topY + row * pixel - plotY;
        ctx.fillStyle = s.bands[band] ?? s.bands[0] ?? '#888888';
        ctx.fillRect(localX, localY, pixel, pixel);
      }
    }
  }
}

export {
  createDitherTileCanvas,
  getDitherPattern,
  DITHER_SUBPIXEL,
  DITHER_TILE_SIZE,
} from '../shared/ditherTiles';
