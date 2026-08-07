import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { playRafEntrance } from '../shared/chartMotion';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveFill } from '../shared/pixelWaveEngine';
import { paintPixelRadial } from './paintPixelRadial';
import {
  computePixelRadialLayout,
  computePixelRadialLayoutFromHits,
  type PixelRadialBar,
  type PixelRadialHitSector,
  type PixelRadialLayoutOptions,
} from './pixelRadialEngine';

export type PixelRadialPlotLayerProps = {
  bars: readonly PixelRadialBar[];
  /** Recharts RadialBar sector geometry — required for paint/hit alignment. */
  hits?: readonly PixelRadialHitSector[];
  pixel?: number;
  fill?: PixelWaveFill;
  /** Full ring domain (chart start/end angles) used for layout / optional tracks. */
  trackStartAngle?: number;
  trackEndAngle?: number;
  /** Resolved concrete color for unfilled track remainder when `paintTracks`. */
  trackColor?: string;
  /**
   * Independent layout when hit geometry is unavailable (loading skeletons).
   * Ignored when `hits` are present.
   */
  layoutOptions?: Omit<PixelRadialLayoutOptions, 'pixel'>;
  /**
   * Traveling opacity mask over baked dither arcs (loading skeleton).
   * Same soft beam as area/bar/pie/radar loading.
   */
  shimmer?: boolean;
  /** When `true`, paint unfilled gray track remainders. Default `false`. */
  paintTracks?: boolean;
  /**
   * One-shot angular sweep reveal (mount only).
   * Ignored while `shimmer` is active. Default `true`.
   */
  animate?: boolean;
};

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

/** Same CCW angle convention as pie entrance. */
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
  if (Math.abs(sweepDeg) >= 360 - 1e-3) {
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
 * Draws chunky pixel radial-bar arcs inside the Recharts plot area via Canvas2D.
 * Pointer events stay on RadialBar sectors for tooltip / legend.
 * Live charts paint from hit geometry; loading uses computed layout + shimmer.
 */
export function PixelRadialPlotLayer({
  bars,
  hits,
  pixel = 2,
  fill = 'bands',
  trackStartAngle = 0,
  trackEndAngle = 360,
  trackColor,
  layoutOptions,
  shimmer = false,
  paintTracks = false,
  animate = true,
}: PixelRadialPlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakeRef = useRef<HTMLCanvasElement | null>(null);
  const entranceDoneRef = useRef(false);

  const layout = useMemo(() => {
    if (plot == null) return null;
    if (hits != null && hits.length > 0) {
      return computePixelRadialLayoutFromHits(hits, plot, pixel, {
        startAngle: trackStartAngle,
        endAngle: trackEndAngle,
      });
    }
    // Loading skeletons: independent layout (pie-style) without waiting on hits.
    if (layoutOptions != null) {
      return computePixelRadialLayout(bars, plot, {
        pixel,
        startAngle: trackStartAngle,
        endAngle: trackEndAngle,
        ...layoutOptions,
      });
    }
    return null;
  }, [plot, hits, bars, pixel, trackStartAngle, trackEndAngle, layoutOptions]);

  const totalSweep = trackEndAngle - trackStartAngle;

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
    paintPixelRadial(bakeCtx, {
      layout,
      bars,
      fill,
      trackColor,
      paintTracks,
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

    const lcx = cx - plotX;
    const lcy = cy - plotY;
    const maskR = outerRadius + pixel * 2;
    const sweepSpan = Number.isFinite(totalSweep) && Math.abs(totalSweep) > 0 ? totalSweep : 360;

    const handle = playRafEntrance(
      (eased) => {
        const liveBake = bakeRef.current;
        if (liveBake == null) return;
        if (eased >= 1) {
          blitFull(ctx, liveBake, dpr, cssW, cssH);
          return;
        }
        blitAngularSweep(
          ctx,
          liveBake,
          dpr,
          cssW,
          cssH,
          lcx,
          lcy,
          maskR,
          trackStartAngle,
          sweepSpan * eased,
        );
      },
      () => {
        entranceDoneRef.current = true;
      },
    );
    return () => {
      handle.cancel();
    };
  }, [
    layout,
    bars,
    fill,
    trackColor,
    paintTracks,
    shimmer,
    animate,
    trackStartAngle,
    totalSweep,
    pixel,
  ]);

  const plotSizeKey = layout == null ? '' : `${layout.plotW}x${layout.plotH}`;
  useLayoutEffect(() => {
    if (!shimmer) return;
    const canvas = canvasRef.current;
    const bake = bakeRef.current;
    if (canvas == null || bake == null || layout == null) return;

    const { plotW, plotH } = layout;
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

  if (layout == null || plot == null) return null;

  const { plotW, plotH } = layout;

  return (
    <g className="dune-pixel-radial-layer" pointerEvents="none" aria-hidden>
      <foreignObject
        x={plot.x}
        y={plot.y}
        width={plotW}
        height={plotH}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            width: plotW,
            height: plotH,
            margin: 0,
            padding: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ display: 'block', width: plotW, height: plotH, pointerEvents: 'none' }}
          />
        </div>
      </foreignObject>
    </g>
  );
}
