import { ensureDitherTileCache, type DitherTileCache } from '../shared/ditherTiles';
import type { PixelRadarPlotLayout } from './pixelRadarEngine';
import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  ditherDensityForBand,
  ditherPairFromBands,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';

export type PaintPixelRadarOptions = {
  layout: PixelRadarPlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
  ditherTiles?: DitherTileCache;
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
  const { pixel, plotX, plotY, plotW, plotH, paths } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(series.map((s) => [s.name, s]));
  const ditherTiles =
    fill === 'dither' ? ensureDitherTileCache(series, options.ditherTiles ?? new Map()) : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const path of paths) {
    const seriesDef = byName.get(path.seriesName);
    if (seriesDef == null) continue;

    for (const cell of path.cells) {
      const band =
        fill === 'dither'
          ? bandIndexFromCrestRowDither(cell.crestRow)
          : bandIndexFromCrestRow(cell.crestRow);
      const localX = cell.x - plotX;
      const localY = cell.y - plotY;

      if (fill === 'dither' && ditherTiles != null) {
        const [hi, lo] = ditherPairFromBands(seriesDef.bands, band);
        const density = ditherDensityForBand(band);
        const key = `${hi}|${lo}|${density}`;
        let pattern = patternCache.get(key);
        if (pattern === undefined) {
          const tile = ditherTiles.get(key);
          pattern = tile != null ? ctx.createPattern(tile, 'repeat') : null;
          if (pattern != null && 'setTransform' in pattern) {
            pattern.setTransform(new DOMMatrix().translateSelf(-plotX, -plotY));
          }
          patternCache.set(key, pattern);
        }
        if (pattern != null) {
          ctx.fillStyle = pattern;
          ctx.fillRect(localX, localY, pixel, pixel);
          continue;
        }
      }

      ctx.fillStyle = seriesDef.bands[band] ?? seriesDef.bands[0] ?? '#888888';
      ctx.fillRect(localX, localY, pixel, pixel);
    }
  }
}

export { ensureDitherTileCache, type DitherTileCache };
