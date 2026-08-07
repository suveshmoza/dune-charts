/** Shared canvas loading shimmer (soft traveling beam). */

export const SHIMMER_MS = 2000;
export const SHIMMER_TRAVEL_START = -1;
export const SHIMMER_TRAVEL_END = 2;

const SHIMMER_ROTATE = (25 * Math.PI) / 180;
/** Beam width as a fraction of plot width — soft peak only, no flat skirts. */
const SHIMMER_BEAM_FRACTION = 0.38;

/** Sine² opacity mask; `travel` is in plot-widths (-1…2). */
export function fillShimmerMask(
  ctx: CanvasRenderingContext2D,
  plotW: number,
  plotH: number,
  travel: number,
): void {
  const beamW = Math.max(1, plotW * SHIMMER_BEAM_FRACTION);

  ctx.save();
  ctx.translate(plotW * travel, plotH * 0.5);
  ctx.rotate(SHIMMER_ROTATE);
  ctx.translate(-beamW * 0.5, -plotH * 0.5);

  const g = ctx.createLinearGradient(0, 0, beamW, 0);
  const steps = 17;
  for (let i = 0; i < steps; i += 1) {
    const t = i / (steps - 1);
    const eased = Math.sin(t * Math.PI) ** 2;
    g.addColorStop(t, `rgba(255,255,255,${(eased * 0.95).toFixed(3)})`);
  }
  ctx.fillStyle = g;
  // Paint only the beam band — extending past the gradient creates sharp skirts.
  ctx.fillRect(0, -plotH, beamW, plotH * 3);
  ctx.restore();
}
