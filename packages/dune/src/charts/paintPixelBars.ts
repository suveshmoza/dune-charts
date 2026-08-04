import { ensureDitherTileCache, type DitherTileCache } from './paintPixelWave';
import type { PixelBarPlotLayout } from './pixelBarEngine';
import {
  bandIndexFromCrestRow,
  ditherDensityForBand,
  ditherPairFromBands,
  sortDrawOrder,
  type PixelWaveFill,
  type PixelWaveSeries,
} from './pixelWaveEngine';

export type PaintPixelBarsOptions = {
  layout: PixelBarPlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
  ditherTiles?: DitherTileCache;
};

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
  const ditherTiles =
    fill === 'dither' ? ensureDitherTileCache(series, options.ditherTiles ?? new Map()) : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const s of drawOrder) {
    for (const group of layout.groups) {
      for (const seg of group.segments) {
        if (seg.seriesName !== s.name) continue;
        const seriesDef = byName.get(s.name);
        if (seriesDef == null || seg.cellCount <= 0) continue;

        const cols = Math.max(1, Math.floor(seg.width / pixel));
        const localX0 = seg.x - plotX;

        for (let row = 0; row < seg.cellCount; row += 1) {
          const band = bandIndexFromCrestRow(row);
          const localY = seg.topY + row * pixel - plotY;

          for (let c = 0; c < cols; c += 1) {
            const localX = localX0 + c * pixel;

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
    }
  }
}

export { ensureDitherTileCache, type DitherTileCache };
