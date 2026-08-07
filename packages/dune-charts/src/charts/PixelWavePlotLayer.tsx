import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { paintPixelWave, type DitherTileCache } from './paintPixelWave';
import {
  computePixelWavePlotLayout,
  type PixelWaveFill,
  type PixelWaveSeries,
} from './pixelWaveEngine';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from './loadingShimmerMask';

export type PixelWavePlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  /** Category / index values aligned with `pointCount` for X-scale mapping. */
  indexValues?: readonly unknown[];
  pixel?: number;
  /** `bands` = solid crest→depth ribbons (default). `dither` = Bayer mesh inside cells. */
  fill?: PixelWaveFill;
  /**
   * Traveling opacity mask over a baked paint (loading skeleton).
   * Cheap: area painted once; each frame only composites the sweep.
   */
  shimmer?: boolean;
};

/**
 * Draws chunky pixel-wave fills inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Area series for tooltip / legend.
 */
export function PixelWavePlotLayer({
  series,
  pointCount,
  indexValues,
  pixel = 2,
  fill = 'bands',
  shimmer = false,
}: PixelWavePlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());
  const bakeRef = useRef<HTMLCanvasElement | null>(null);

  const layout = useMemo(() => {
    if (plot == null || yScale == null) return null;
    return computePixelWavePlotLayout(series, plot, (value) => Number(yScale(value)), pointCount, {
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

  // Bake (and static paint) whenever geometry / series change — without restarting shimmer.
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
    paintPixelWave(bakeCtx, {
      layout,
      series,
      fill,
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
  }, [layout, series, fill, shimmer]);

  // Shimmer loop — size-stable; re-bake above updates pixels mid-sweep.
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
    // Only restart when shimmer toggles or plot size changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- layout read for size; keyed via plotSizeKey
  }, [shimmer, plotSizeKey]);

  if (layout == null || plot == null) return null;

  const { plotW, plotH } = layout;

  return (
    <g className="dune-pixel-wave-layer" pointerEvents="none" aria-hidden>
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
