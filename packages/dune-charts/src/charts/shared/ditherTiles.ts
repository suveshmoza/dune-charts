import {
  buildBayerTile,
  ditherDensityForBand,
  ditherPairFromBands,
  type PixelWaveSeries,
} from './pixelWaveEngine';

const DITHER_SUBPIXEL = 2;
const DITHER_TILE_SIZE = 4 * DITHER_SUBPIXEL;

/** Build (or reuse) an offscreen canvas with one Bayer tile. */
export function createDitherTileCanvas(
  hi: string,
  lo: string,
  density: number,
  subpixel = DITHER_SUBPIXEL,
): HTMLCanvasElement {
  const size = 4 * subpixel;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx == null) return canvas;

  const cells = buildBayerTile(hi, lo, density, subpixel);
  for (const cell of cells) {
    ctx.fillStyle = cell.fill;
    ctx.fillRect(cell.x, cell.y, cell.size, cell.size);
  }
  return canvas;
}

export type DitherTileCache = Map<string, HTMLCanvasElement>;

export function ditherTileKey(hi: string, lo: string, density: number): string {
  return `${hi}|${lo}|${density}`;
}

/** Ensure dither tiles exist for every series × band; returns the cache. */
export function ensureDitherTileCache(
  series: readonly PixelWaveSeries[],
  cache: DitherTileCache = new Map(),
): DitherTileCache {
  for (const s of series) {
    for (const band of [0, 1, 2, 3, 4] as const) {
      const [hi, lo] = ditherPairFromBands(s.bands, band);
      const density = ditherDensityForBand(band);
      const key = ditherTileKey(hi, lo, density);
      if (!cache.has(key)) {
        cache.set(key, createDitherTileCanvas(hi, lo, density));
      }
    }
  }
  return cache;
}

export { DITHER_SUBPIXEL, DITHER_TILE_SIZE };
