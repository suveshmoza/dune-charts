import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { DUNE_DURATION } from '../shared/chartShell';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveFill } from '../shared/pixelWaveEngine';
import { paintPixelPie, type DitherTileCache } from './paintPixelPie';
import {
  computePixelPieLayout,
  type PixelPieLayoutOptions,
  type PixelPieSlice,
} from './pixelPieEngine';

export type PixelPiePlotLayerProps = {
  slices: readonly PixelPieSlice[];
  pixel?: number;
  fill?: PixelWaveFill;
  layoutOptions?: Omit<PixelPieLayoutOptions, 'pixel'>;
  /**
   * Traveling opacity mask over baked dither wedges (loading skeleton).
   * Same soft beam as area/bar loading.
   * When true, entrance wipe is skipped.
   */
  shimmer?: boolean;
  /**
   * One-shot angular sweep reveal from `startAngle`.
   * Ignored while `shimmer` is active. Default `true`.
   */
  animate?: boolean;
};

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function blitFull(
  ctx: CanvasRenderingContext2D,
  bake: HTMLCanvasElement,
  dpr: number,
  cssW: number,
  cssH: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bake, 0, 0);
}

/**
 * Reveal baked pie with a growing wedge.
 * Recharts: 0° at +x, CCW (via cos(-θ)/sin(-θ)). Canvas: 0° at +x, CW+.
 * Map rechartsDeg → -canvasRad and sweep with anticlockwise=true.
 */
function blitAngularSweep(
  ctx: CanvasRenderingContext2D,
  bake: HTMLCanvasElement,
  dpr: number,
  cssW: number,
  cssH: number,
  lcx: number,
  lcy: number,
  radius: number,
  startAngleDeg: number,
  sweepDeg: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bake, 0, 0);

  if (sweepDeg <= 0) {
    ctx.clearRect(0, 0, cssW, cssH);
    return;
  }

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  if (sweepDeg >= 360 - 1e-3) {
    ctx.arc(lcx, lcy, radius, 0, Math.PI * 2);
  } else {
    const start = degToRad(-startAngleDeg);
    const end = degToRad(-(startAngleDeg + sweepDeg));
    ctx.moveTo(lcx, lcy);
    ctx.arc(lcx, lcy, radius, start, end, true);
    ctx.closePath();
  }
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draws chunky pixel pie wedges inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Pie sectors for tooltip / legend.
 */
export function PixelPiePlotLayer({
  slices,
  pixel = 2,
  fill = 'bands',
  layoutOptions,
  shimmer = false,
  animate = true,
}: PixelPiePlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());
  const bakeRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(() => {
    if (plot == null) return null;
    return computePixelPieLayout(slices, plot, {
      pixel,
      ...layoutOptions,
    });
  }, [plot, slices, pixel, layoutOptions]);

  const startAngle = layoutOptions?.startAngle ?? 0;
  const endAngle = layoutOptions?.endAngle ?? 360;
  const totalSweep = endAngle - startAngle;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null || layout == null) return;

    const { plotW, plotH, plotX, plotY, cx, cy, outerRadius } = layout;
    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const cssW = Math.max(1, plotW);
    const cssH = Math.max(1, plotH);

    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;

    let bake = bakeRef.current;
    if (bake == null) {
      bake = document.createElement('canvas');
      bakeRef.current = bake;
    }
    if (bake.width !== cssW || bake.height !== cssH) {
      bake.width = cssW;
      bake.height = cssH;
    }

    const bakeCtx = bake.getContext('2d');
    if (bakeCtx == null) return;
    bakeCtx.setTransform(1, 0, 0, 1, 0, 0);
    paintPixelPie(bakeCtx, {
      layout,
      slices,
      fill,
      ditherTiles: ditherTilesRef.current,
    });

    if (shimmer) return;

    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

    if (!animate) {
      blitFull(ctx, bake, dpr, cssW, cssH);
      return;
    }

    const lcx = cx - plotX;
    const lcy = cy - plotY;
    const maskR = outerRadius + pixel * 2;
    const sweepSpan = Number.isFinite(totalSweep) && Math.abs(totalSweep) > 0 ? totalSweep : 360;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const liveBake = bakeRef.current;
      if (liveBake == null) return;

      const t = Math.min(1, (now - start) / DUNE_DURATION);
      const sweep = sweepSpan * easeOutCubic(t);
      blitAngularSweep(ctx, liveBake, dpr, cssW, cssH, lcx, lcy, maskR, startAngle, sweep);

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        blitFull(ctx, liveBake, dpr, cssW, cssH);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [layout, slices, fill, shimmer, animate, startAngle, totalSweep, pixel]);

  const plotSizeKey = layout == null ? '' : `${layout.plotW}x${layout.plotH}`;
  useLayoutEffect(() => {
    if (!shimmer) return undefined;
    const canvas = canvasRef.current;
    const bake = bakeRef.current;
    if (canvas == null || bake == null || layout == null) return undefined;

    const { plotW, plotH } = layout;
    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const cssW = Math.max(1, plotW);
    const cssH = Math.max(1, plotH);
    const ctx = canvas.getContext('2d');
    if (ctx == null) return undefined;

    let raf = 0;
    const start = performance.now();
    const travelSpan = SHIMMER_TRAVEL_END - SHIMMER_TRAVEL_START;

    const tick = (now: number) => {
      const loopT = ((now - start) % SHIMMER_MS) / SHIMMER_MS;
      const travel = SHIMMER_TRAVEL_START + loopT * travelSpan;

      const liveBake = bakeRef.current;
      if (liveBake == null) {
        raf = requestAnimationFrame(tick);
        return;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(liveBake, 0, 0);
      ctx.globalCompositeOperation = 'destination-in';
      fillShimmerMask(ctx, cssW, cssH, travel);
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- size keyed via plotSizeKey
  }, [shimmer, plotSizeKey]);

  if (layout == null || plot == null) return null;

  const { plotW, plotH } = layout;

  return (
    <g className="dune-pixel-pie-layer" pointerEvents="none" aria-hidden>
      <foreignObject x={plot.x} y={plot.y} width={plotW} height={plotH}>
        <div style={{ width: plotW, height: plotH, margin: 0 }}>
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ display: 'block', width: plotW, height: plotH }}
          />
        </div>
      </foreignObject>
    </g>
  );
}
