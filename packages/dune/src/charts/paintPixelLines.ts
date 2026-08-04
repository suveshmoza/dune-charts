import type { PixelLinePlotLayout } from './pixelLineEngine';
import type { PixelWaveSeries } from './pixelWaveEngine';

export type PaintPixelLinesOptions = {
  layout: PixelLinePlotLayout;
  series: readonly PixelWaveSeries[];
};

/**
 * Paint stepped pixel line cells into a plot-local canvas context.
 * Cell coords are chart-absolute; this subtracts plot origin.
 */
export function paintPixelLines(
  ctx: CanvasRenderingContext2D,
  options: PaintPixelLinesOptions,
): void {
  const { layout, series } = options;
  const { pixel, plotX, plotY, plotW, plotH, paths } = layout;

  ctx.clearRect(0, 0, plotW, plotH);
  ctx.imageSmoothingEnabled = false;

  const byName = new Map(series.map((s) => [s.name, s]));

  for (const path of paths) {
    const seriesDef = byName.get(path.seriesName);
    const color = seriesDef?.bands[0] ?? '#888888';
    ctx.fillStyle = color;

    for (const cell of path.cells) {
      ctx.fillRect(cell.x - plotX, cell.y - plotY, pixel, pixel);
    }
  }
}
