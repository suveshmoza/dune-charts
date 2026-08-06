import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import { paintPixelBars, type DitherTileCache } from './paintPixelBars';
import { computePixelBarPlotLayout, type PixelBarChartLayout } from './pixelBarEngine';
import type { PixelWaveFill, PixelWaveSeries } from './pixelWaveEngine';

export type PixelBarPlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  indexValues?: readonly unknown[];
  pixel?: number;
  fill?: PixelWaveFill;
  /** Recharts BarChart layout. Default `horizontal` (vertical bars). */
  layout?: PixelBarChartLayout;
};

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
}: PixelBarPlotLayerProps) {
  const plot = usePlotArea();
  const yScale = useYAxisScale();
  const xScale = useXAxisScale();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());

  const barLayout = useMemo(() => {
    if (plot == null) return null;

    if (layout === 'horizontal') {
      if (yScale == null) return null;
      return computePixelBarPlotLayout(
        series,
        plot,
        (value) => Number(yScale(value)),
        pointCount,
        {
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
        },
      );
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

    const ctx = canvas.getContext('2d');
    if (ctx == null) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintPixelBars(ctx, {
      layout: barLayout,
      series,
      fill,
      ditherTiles: ditherTilesRef.current,
    });
  }, [barLayout, series, fill]);

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
