import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { playRafEntrance } from '../shared/chartMotion';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveFill, PixelWaveSeries } from '../shared/pixelWaveEngine';
import { paintPixelBars } from './paintPixelBars';
import { computePixelBarPlotLayout, type PixelBarChartLayout } from './pixelBarEngine';

export type PixelBarPlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  indexValues?: readonly unknown[];
  pixel?: number;
  fill?: PixelWaveFill;
  /** Recharts BarChart layout. Default `horizontal` (vertical bars). */
  layout?: PixelBarChartLayout;
  /**
   * Traveling opacity mask over baked dither bars (loading skeleton).
   * Same beam as area loading — soft peak, no flat skirts.
   * When true, entrance wipe is skipped.
   */
  shimmer?: boolean;
  /**
   * One-shot entrance reveal of baked pixels (plays until complete).
   * Vertical bars grow up from the baseline; horizontal bars grow right from the origin.
   * Ignored while `shimmer` is active. Default `true`.
   */
  animate?: boolean;
};

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

/** Vertical bars: reveal height grows upward from the bottom (baseline). */
function blitGrowVertical(
  ctx: CanvasRenderingContext2D,
  bake: HTMLCanvasElement,
  dpr: number,
  cssW: number,
  cssH: number,
  revealH: number,
): void {
  const h = Math.max(0, revealH);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bake, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, cssH - h, cssW, h);
  ctx.globalCompositeOperation = 'source-over';
}

/** Horizontal bars: reveal width grows rightward from the left (baseline). */
function blitGrowHorizontal(
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
 * Draws chunky pixel bars inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Bar series for tooltip / legend.
 */
export function PixelBarPlotLayer({
  series,
  pointCount,
  indexValues,
  pixel = 2,
  fill = 'bands',
  layout = 'horizontal',
  shimmer = false,
  animate = true,
}: PixelBarPlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakeRef = useRef<HTMLCanvasElement | null>(null);
  const entranceDoneRef = useRef(false);

  const barLayout = useMemo(() => {
    if (plot == null) return null;

    if (layout === 'horizontal') {
      if (yScale == null) return null;
      return computePixelBarPlotLayout(series, plot, (value) => Number(yScale(value)), pointCount, {
        pixel,
        indexValues,
        layout,
        categoryScale:
          xScale == null
            ? undefined
            : (value, options) => {
                const result = xScale(value, options);
                return result == null ? undefined : result;
              },
      });
    }

    if (xScale == null) return null;
    return computePixelBarPlotLayout(series, plot, (value) => Number(xScale(value)), pointCount, {
      pixel,
      indexValues,
      layout,
      categoryScale:
        yScale == null
          ? undefined
          : (value, options) => {
              const result = yScale(value, options);
              return result == null ? undefined : result;
            },
    });
  }, [plot, yScale, xScale, series, pointCount, pixel, indexValues, layout]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (canvas == null || barLayout == null) return;

    const { plotW, plotH } = barLayout;
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
    paintPixelBars(bakeCtx, {
      layout: barLayout,
      series,
      fill,
    });

    if (shimmer) return;

    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

    if (!animate) {
      blitFull(ctx, bake, dpr, cssW, cssH);
      entranceDoneRef.current = true;
      return;
    }
    if (entranceDoneRef.current) {
      blitFull(ctx, bake, dpr, cssW, cssH);
      return;
    }

    // Recharts: `horizontal` = vertical bars; `vertical` = horizontal bars.
    const verticalBars = layout === 'horizontal';
    const handle = playRafEntrance(
      (eased) => {
        const liveBake = bakeRef.current;
        if (liveBake == null) return;
        if (eased >= 1) {
          blitFull(ctx, liveBake, dpr, cssW, cssH);
          return;
        }
        if (verticalBars) {
          blitGrowVertical(ctx, liveBake, dpr, cssW, cssH, cssH * eased);
        } else {
          blitGrowHorizontal(ctx, liveBake, dpr, cssW, cssH, cssW * eased);
        }
      },
      () => {
        entranceDoneRef.current = true;
      },
    );
    return () => {
      handle.cancel();
    };
  }, [barLayout, series, fill, shimmer, animate, layout]);

  const plotSizeKey = barLayout == null ? '' : `${barLayout.plotW}x${barLayout.plotH}`;
  useLayoutEffect(() => {
    if (!shimmer) return;
    const canvas = canvasRef.current;
    const bake = bakeRef.current;
    if (canvas == null || bake == null || barLayout == null) return;

    const { plotW, plotH } = barLayout;
    const dpr = typeof window !== 'undefined' ? Math.max(1, window.devicePixelRatio || 1) : 1;
    const cssW = Math.max(1, plotW);
    const cssH = Math.max(1, plotH);
    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

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

  if (barLayout == null || plot == null) return null;

  const { plotW, plotH } = barLayout;

  return (
    <g className="dune-pixel-bar-layer" pointerEvents="none" aria-hidden>
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
