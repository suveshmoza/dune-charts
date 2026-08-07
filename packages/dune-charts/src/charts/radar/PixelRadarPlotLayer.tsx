import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { DUNE_DURATION } from '../shared/chartShell';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveFill, PixelWaveSeries } from '../shared/pixelWaveEngine';
import { paintPixelRadar, type DitherTileCache } from './paintPixelRadar';
import { computePixelRadarLayout } from './pixelRadarEngine';

export type PixelRadarPlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  pixel?: number;
  fill?: PixelWaveFill;
  domainMax?: number;
  /**
   * Traveling opacity mask over baked dither polygons (loading skeleton).
   * Same soft beam as area/bar/pie loading.
   * When true, entrance wipe is skipped.
   */
  shimmer?: boolean;
  /**
   * One-shot radial grow from center.
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

function blitRadialGrow(
  ctx: CanvasRenderingContext2D,
  bake: HTMLCanvasElement,
  dpr: number,
  cssW: number,
  cssH: number,
  lcx: number,
  lcy: number,
  revealR: number,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bake, 0, 0);

  if (revealR <= 0) {
    ctx.clearRect(0, 0, cssW, cssH);
    return;
  }

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(lcx, lcy, revealR, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Draws chunky pixel radar polygons inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Radar series for tooltip / legend.
 */
export function PixelRadarPlotLayer({
  series,
  pointCount,
  pixel = 2,
  fill = 'bands',
  domainMax,
  shimmer = false,
  animate = true,
}: PixelRadarPlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());
  const bakeRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(() => {
    if (plot == null) return null;
    return computePixelRadarLayout(series, plot, pointCount, { pixel, domainMax });
  }, [plot, series, pointCount, pixel, domainMax]);

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
    paintPixelRadar(bakeCtx, {
      layout,
      series,
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
    const maxR = outerRadius + pixel * 2;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const liveBake = bakeRef.current;
      if (liveBake == null) return;

      const t = Math.min(1, (now - start) / DUNE_DURATION);
      blitRadialGrow(ctx, liveBake, dpr, cssW, cssH, lcx, lcy, maxR * easeOutCubic(t));

      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        blitFull(ctx, liveBake, dpr, cssW, cssH);
      }
    };

    raf = requestAnimationFrame(tick);
    // oxlint-disable-next-line typescript/consistent-return
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [layout, series, fill, shimmer, animate, pixel]);

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
    <g className="dune-pixel-radar-layer" pointerEvents="none" aria-hidden>
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
