import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { paintPixelWave, type DitherTileCache } from './paintPixelWave';
import {
  computePixelWavePlotLayout,
  type PixelWaveFill,
  type PixelWaveSeries,
} from './pixelWaveEngine';

export type PixelWavePlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  /** Category / index values aligned with `pointCount` for X-scale mapping. */
  indexValues?: readonly unknown[];
  pixel?: number;
  /** `bands` = solid crest→depth ribbons (default). `dither` = Bayer mesh inside cells. */
  fill?: PixelWaveFill;
};

/**
 * Draws chunky pixel-wave fills inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Area series for tooltip / legend.
 */
export function PixelWavePlotLayer({
  series,
  pointCount,
  indexValues,
  pixel = 4,
  fill = 'bands',
}: PixelWavePlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());

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

    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintPixelWave(ctx, {
      layout,
      series,
      fill,
      ditherTiles: ditherTilesRef.current,
    });
  }, [layout, series, fill]);

  if (layout == null || plot == null) return null;

  const { plotW, plotH } = layout;

  return (
    <g className="dune-pixel-wave-layer" pointerEvents="none" aria-hidden>
      <foreignObject x={plot.x} y={plot.y} width={plotW} height={plotH}>
        <div style={{ width: plotW, height: plotH, margin: 0 }}>
          <canvas ref={canvasRef} style={{ display: 'block', width: plotW, height: plotH }} />
        </div>
      </foreignObject>
    </g>
  );
}
