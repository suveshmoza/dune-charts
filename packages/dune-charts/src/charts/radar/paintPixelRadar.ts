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
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';
import type { PixelRadarPlotLayout } from './pixelRadarEngine';

export type PaintPixelRadarOptions = {
  layout: PixelRadarPlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
};

/**
 * Paint pixel radar polygons into a plot-local canvas context.
 * Cell coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelRadar(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelRadarOptions,
): void {
  const { layout, series, fill = 'bands' } = options;
  const { pixel, plotX, plotY, plotW, plotH, paths: layoutPaths } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(series.map((s) => [s.name, s]));

  if (fill === 'dither') {
    const patternCache: DitherPatternCache = new Map();

    for (const layoutPath of layoutPaths) {
      const seriesDef = byName.get(layoutPath.seriesName);
      if (seriesDef == null) continue;

      const paths = createEmptyLevelPaths();
      for (const cell of layoutPath.cells) {
        const level = ditherLevelForCrestRow(cell.crestRow);
        const path = ensureLevelPath(paths, level);
        path.rect(cell.x - plotX, cell.y - plotY, pixel, pixel);
      }

      fillDitherLevelPaths(
        ctx,
        paths,
        patternCache,
        ditherToneFromBands(seriesDef.bands),
        plotX,
        plotY,
      );
    }
    return;
  }

  for (const layoutPath of layoutPaths) {
    const seriesDef = byName.get(layoutPath.seriesName);
    if (seriesDef == null) continue;

    for (const cell of layoutPath.cells) {
      const band = bandIndexFromCrestRow(cell.crestRow);
      ctx.fillStyle = seriesDef.bands[band] ?? seriesDef.bands[0] ?? '#888888';
      ctx.fillRect(cell.x - plotX, cell.y - plotY, pixel, pixel);
    }
  }
}
