import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  buildBayerTile,
  ditherDensityForBand,
  ditherPairFromBands,
  sortDrawOrder,
  type PixelWaveFill,
  type PixelWavePlotLayout,
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

function ditherTileKey(hi: string, lo: string, density: number): string {
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

export type PaintPixelWaveOptions = {
  layout: PixelWavePlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
  /** Mutable cache of Bayer tile canvases (keyed by hi|lo|density). */
  ditherTiles?: DitherTileCache;
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
  const ditherTiles =
    fill === 'dither' ? ensureDitherTileCache(series, options.ditherTiles ?? new Map()) : null;

  const patternCache = new Map<string, CanvasPattern | null>();

  for (const s of drawOrder) {
    for (const col of layout.columns) {
      const topY = col.topY[s.name] ?? 0;
      const cellCount = col.cellCount[s.name] ?? 0;
      const localX = col.x - plotX;

      for (let row = 0; row < cellCount; row += 1) {
        const band =
          fill === 'dither' ? bandIndexFromCrestRowDither(row) : bandIndexFromCrestRow(row);
        const localY = topY + row * pixel - plotY;

        if (fill === 'dither' && ditherTiles != null) {
          const [hi, lo] = ditherPairFromBands(s.bands, band);
          const density = ditherDensityForBand(band);
          const key = ditherTileKey(hi, lo, density);
          let pattern = patternCache.get(key);
          if (pattern === undefined) {
            const tile = ditherTiles.get(key);
            pattern = tile != null ? ctx.createPattern(tile, 'repeat') : null;
            if (pattern != null && 'setTransform' in pattern) {
              // Align pattern to SVG user space (canvas origin = plot origin).
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

        ctx.fillStyle = s.bands[band] ?? s.bands[0] ?? '#888888';
        ctx.fillRect(localX, localY, pixel, pixel);
      }
    }
  }
}

export { DITHER_SUBPIXEL, DITHER_TILE_SIZE };
