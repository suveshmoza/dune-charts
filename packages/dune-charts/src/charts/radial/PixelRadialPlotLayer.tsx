import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import type { PixelWaveFill } from '../shared/pixelWaveEngine';
import { paintPixelRadial, type DitherTileCache } from './paintPixelRadial';
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
  /** Full ring domain for gray remainders (chart start/end angles). */
  trackStartAngle?: number;
  trackEndAngle?: number;
  /** Resolved concrete color for unfilled track remainder. */
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
  /** When `false`, omit unfilled track remainders (loading skeletons). */
  paintTracks?: boolean;
};

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
  paintTracks = true,
}: PixelRadialPlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());
  const bakeRef = useRef<HTMLCanvasElement | null>(null);

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
    paintPixelRadial(bakeCtx, {
      layout,
      bars,
      fill,
      trackColor,
      paintTracks,
      ditherTiles: ditherTilesRef.current,
    });

    if (!shimmer) {
      const ctx = canvas.getContext('2d');
      if (ctx == null) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bake, 0, 0);
    }
  }, [layout, bars, fill, trackColor, paintTracks, shimmer]);

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
