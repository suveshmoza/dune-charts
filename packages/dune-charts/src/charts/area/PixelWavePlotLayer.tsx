import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { playRafEntrance } from '../shared/chartMotion';
import {
  fillShimmerMask,
  SHIMMER_MS,
  SHIMMER_TRAVEL_END,
  SHIMMER_TRAVEL_START,
} from '../shared/loadingShimmerMask';
import {
  computePixelWavePlotLayout,
  type PixelWaveFill,
  type PixelWaveSeries,
} from '../shared/pixelWaveEngine';
import { paintPixelWave } from './paintPixelWave';

export type PixelWavePlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  /** Category / index values aligned with `pointCount` for X-scale mapping. */
  indexValues?: readonly unknown[];
  pixel?: number;
  /** `bands` = solid crest→depth ribbons (default). `dither` = continuous Bayer mesh. */
  fill?: PixelWaveFill;
  /**
   * Traveling opacity mask over a baked paint (loading skeleton).
   * Cheap: area painted once; each frame only composites the sweep.
   * When true, entrance wipe is skipped.
   */
  shimmer?: boolean;
  /**
   * One-shot left→right wipe reveal of the baked pixels (plays until complete).
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
  animate = true,
}: PixelWavePlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bakeRef = useRef<HTMLCanvasElement | null>(null);
  const entranceDoneRef = useRef(false);

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

    const handle = playRafEntrance(
      (eased) => {
        const liveBake = bakeRef.current;
        if (liveBake == null) return;
        if (eased >= 1) {
          blitFull(ctx, liveBake, dpr, cssW, cssH);
          return;
        }
        blitWipe(ctx, liveBake, dpr, cssW, cssH, cssW * eased);
      },
      () => {
        entranceDoneRef.current = true;
      },
    );
    return () => {
      handle.cancel();
    };
  }, [layout, series, fill, shimmer, animate]);

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
