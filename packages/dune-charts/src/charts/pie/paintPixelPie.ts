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
} from '../shared/pixelWaveEngine';
import type { PixelPiePlotLayout, PixelPieSlice } from './pixelPieEngine';

export type PaintPixelPieOptions = {
  layout: PixelPiePlotLayout;
  slices: readonly PixelPieSlice[];
  fill?: PixelWaveFill;
};

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

  if (fill === 'dither') {
    const patternCache: DitherPatternCache = new Map();
    const pathsBySlice = new Map<string, (Path2D | null)[]>();

    for (const cell of cells) {
      const slice = byName.get(cell.sliceName);
      if (slice == null) continue;

      let paths = pathsBySlice.get(cell.sliceName);
      if (paths == null) {
        paths = createEmptyLevelPaths();
        pathsBySlice.set(cell.sliceName, paths);
      }

      const level = ditherLevelForCrestRow(cell.crestRow);
      const path = ensureLevelPath(paths, level);
      path.rect(cell.x - plotX, cell.y - plotY, pixel, pixel);
    }

    for (const [name, paths] of pathsBySlice) {
      const slice = byName.get(name);
      if (slice == null) continue;
      fillDitherLevelPaths(
        ctx,
        paths,
        patternCache,
        ditherToneFromBands(slice.bands),
        plotX,
        plotY,
      );
    }
    return;
  }

  for (const cell of cells) {
    const slice = byName.get(cell.sliceName);
    if (slice == null) continue;

    const band = bandIndexFromCrestRow(cell.crestRow);
    ctx.fillStyle = slice.bands[band] ?? slice.bands[0] ?? '#888888';
    ctx.fillRect(cell.x - plotX, cell.y - plotY, pixel, pixel);
  }
}
