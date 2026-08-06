import { ensureDitherTileCache, type DitherTileCache } from './paintPixelWave';
import type { PixelRadialBar, PixelRadialPlotLayout } from './pixelRadialEngine';
import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  ditherDensityForBand,
  ditherPairFromBands,
  type PixelWaveFill,
  type PixelWaveSeries,
} from './pixelWaveEngine';

export type PaintPixelRadialOptions = {
  layout: PixelRadialPlotLayout;
  bars: readonly PixelRadialBar[];
  fill?: PixelWaveFill;
  ditherTiles?: DitherTileCache;
};

function barsAsSeries(bars: readonly PixelRadialBar[]): PixelWaveSeries[] {
  return bars.map((b) => ({
    name: b.name,
    values: [b.value],
    bands: b.bands,
  }));
}

/**
 * Paint pixel radial-bar cells into a plot-local canvas context.
 * Cell coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelRadial(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelRadialOptions,
): void {
  const { layout, bars, fill = 'bands' } = options;
  const { pixel, plotX, plotY, plotW, plotH, cells } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(bars.map((b) => [b.name, b]));
  const ditherTiles =
    fill === 'dither'
      ? ensureDitherTileCache(barsAsSeries(bars), options.ditherTiles ?? new Map())
      : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const cell of cells) {
    const bar = byName.get(cell.barName);
    if (bar == null) continue;

    const band =
      fill === 'dither'
        ? bandIndexFromCrestRowDither(cell.crestRow)
        : bandIndexFromCrestRow(cell.crestRow);
    const localX = cell.x - plotX;
    const localY = cell.y - plotY;

    if (fill === 'dither' && ditherTiles != null) {
      const [hi, lo] = ditherPairFromBands(bar.bands, band);
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

    ctx.fillStyle = bar.bands[band] ?? bar.bands[0] ?? '#888888';
    ctx.fillRect(localX, localY, pixel, pixel);
  }
}

export { ensureDitherTileCache, type DitherTileCache };
