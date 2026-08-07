import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { DUNE_DURATION } from '../shared/chartShell';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveSeries } from '../shared/pixelWaveEngine';
import { paintPixelLines } from './paintPixelLines';
import { computePixelLinePlotLayout } from './pixelLineEngine';

export type PixelLinePlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  indexValues?: readonly unknown[];
  pixel?: number;
  /**
   * Traveling opacity mask over baked stepped lines (loading skeleton).
   * Same soft beam as area/bar/pie loading.
   * When true, entrance wipe is skipped.
   */
  shimmer?: boolean;
  /**
   * One-shot left→right wipe reveal of the baked pixels.
   * Ignored while `shimmer` is active. Default `true`.
   */
  animate?: boolean;
};

function easeOutCubic(t: number): number {
  const u = 1 - t;
  return 1 - u * u * u;
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

function blitWipe(
  ctx: CanvasRenderingContext2D,
  bake: HTMLCanvasElement,
  dpr: number,
  cssW: number,
  cssH: number,
  revealW: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bake, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, Math.max(0, revealW), cssH);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draws stepped pixel lines inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Line series for tooltip / legend.
 */
export function PixelLinePlotLayer({
  series,
  pointCount,
  indexValues,
  pixel = 2,
  shimmer = false,
  animate = true,
}: PixelLinePlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakeRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(() => {
    if (plot == null || yScale == null) return null;
    return computePixelLinePlotLayout(series, plot, (value) => Number(yScale(value)), pointCount, {
      pixel,
      indexValues,
      xScale:
        xScale == null
          ? undefined
          : (value, options) => {
              const result = xScale(value, options);
              return result == null ? undefined : result;
            },
    });
  }, [plot, yScale, xScale, series, pointCount, pixel, indexValues]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null || layout == null) return;

    const { plotW, plotH } = layout;
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
    paintPixelLines(bakeCtx, { layout, series });

    if (shimmer) return;

    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

    if (!animate) {
      blitFull(ctx, bake, dpr, cssW, cssH);
      return;
    }

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const liveBake = bakeRef.current;
      if (liveBake == null) return;

      const t = Math.min(1, (now - start) / DUNE_DURATION);
      blitWipe(ctx, liveBake, dpr, cssW, cssH, cssW * easeOutCubic(t));

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
  }, [layout, series, shimmer, animate]);

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
    <g className="dune-pixel-line-layer" pointerEvents="none" aria-hidden>
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
