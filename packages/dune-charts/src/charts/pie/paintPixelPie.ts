import { ensureDitherTileCache, type DitherTileCache } from '../shared/ditherTiles';
import type { PixelPiePlotLayout, PixelPieSlice } from './pixelPieEngine';
import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  ditherDensityForBand,
  ditherPairFromBands,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';

export type PaintPixelPieOptions = {
  layout: PixelPiePlotLayout;
  slices: readonly PixelPieSlice[];
  fill?: PixelWaveFill;
  ditherTiles?: DitherTileCache;
};

function slicesAsSeries(slices: readonly PixelPieSlice[]): PixelWaveSeries[] {
  return slices.map((s) => ({
    name: s.name,
    values: [s.value],
    bands: s.bands,
  }));
}

/**
 * Paint pixel pie / donut cells into a plot-local canvas context.
 * Cell coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelPie(ctx: CanvasRenderingContext2D, options: PaintPixelPieOptions): void {
  const { layout, slices, fill = 'bands' } = options;
  const { pixel, plotX, plotY, plotW, plotH, cells } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(slices.map((s) => [s.name, s]));
  const ditherTiles =
    fill === 'dither'
      ? ensureDitherTileCache(slicesAsSeries(slices), options.ditherTiles ?? new Map())
      : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const cell of cells) {
    const slice = byName.get(cell.sliceName);
    if (slice == null) continue;

    const band =
      fill === 'dither'
        ? bandIndexFromCrestRowDither(cell.crestRow)
        : bandIndexFromCrestRow(cell.crestRow);
    const localX = cell.x - plotX;
    const localY = cell.y - plotY;

    if (fill === 'dither' && ditherTiles != null) {
      const [hi, lo] = ditherPairFromBands(slice.bands, band);
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

    ctx.fillStyle = slice.bands[band] ?? slice.bands[0] ?? '#888888';
    ctx.fillRect(localX, localY, pixel, pixel);
  }
}

export { ensureDitherTileCache, type DitherTileCache };
