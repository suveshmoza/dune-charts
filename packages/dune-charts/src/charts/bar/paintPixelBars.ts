import { ensureDitherTileCache, type DitherTileCache } from '../shared/ditherTiles';
import type { PixelBarPlotLayout, PixelBarSegment } from './pixelBarEngine';
import {
  bandIndexFromCrestRow,
  bandIndexFromCrestRowDither,
  ditherDensityForBand,
  ditherPairFromBands,
  sortDrawOrder,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';

export type PaintPixelBarsOptions = {
  layout: PixelBarPlotLayout;
  series: readonly PixelWaveSeries[];
  fill?: PixelWaveFill;
  ditherTiles?: DitherTileCache;
};

function paintBarCell(
  ctx: CanvasRenderingContext2D,
  seriesDef: PixelWaveSeries,
  localX: number,
  localY: number,
  pixel: number,
  band: 0 | 1 | 2 | 3 | 4,
  fill: PixelWaveFill,
  ditherTiles: DitherTileCache | null,
  patternCache: Map<string, CanvasPattern | null>,
  plotX: number,
  plotY: number,
): void {
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
      return;
    }
  }

  ctx.fillStyle = seriesDef.bands[band] ?? seriesDef.bands[0] ?? '#888888';
  ctx.fillRect(localX, localY, pixel, pixel);
}

function paintSegment(
  ctx: CanvasRenderingContext2D,
  seg: PixelBarSegment,
  seriesDef: PixelWaveSeries,
  pixel: number,
  plotX: number,
  plotY: number,
  fill: PixelWaveFill,
  ditherTiles: DitherTileCache | null,
  patternCache: Map<string, CanvasPattern | null>,
): void {
  if (seg.cellCount <= 0) return;

  const bandFor = (row: number) =>
    fill === 'dither' ? bandIndexFromCrestRowDither(row) : bandIndexFromCrestRow(row);

  if (seg.crest === 'top') {
    const cols = Math.max(1, Math.floor(seg.width / pixel));
    const localX0 = seg.x - plotX;
    for (let row = 0; row < seg.cellCount; row += 1) {
      const band = bandFor(row);
      const localY = seg.y + row * pixel - plotY;
      for (let c = 0; c < cols; c += 1) {
        paintBarCell(
          ctx,
          seriesDef,
          localX0 + c * pixel,
          localY,
          pixel,
          band,
          fill,
          ditherTiles,
          patternCache,
          plotX,
          plotY,
        );
      }
    }
    return;
  }

  // crest === 'right' — horizontal bars; crest at the free (right) end
  const rows = Math.max(1, Math.floor(seg.height / pixel));
  const localY0 = seg.y - plotY;
  for (let col = 0; col < seg.cellCount; col += 1) {
    const band = bandFor(col);
    const localX = seg.x + seg.width - (col + 1) * pixel - plotX;
    for (let r = 0; r < rows; r += 1) {
      paintBarCell(
        ctx,
        seriesDef,
        localX,
        localY0 + r * pixel,
        pixel,
        band,
        fill,
        ditherTiles,
        patternCache,
        plotX,
        plotY,
      );
    }
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
  const ditherTiles =
    fill === 'dither' ? ensureDitherTileCache(series, options.ditherTiles ?? new Map()) : null;
  const patternCache = new Map<string, CanvasPattern | null>();

  for (const s of drawOrder) {
    for (const group of layout.groups) {
      for (const seg of group.segments) {
        if (seg.seriesName !== s.name) continue;
        const seriesDef = byName.get(s.name);
        if (seriesDef == null) continue;
        paintSegment(ctx, seg, seriesDef, pixel, plotX, plotY, fill, ditherTiles, patternCache);
      }
    }
  }
}

export { ensureDitherTileCache, type DitherTileCache };
