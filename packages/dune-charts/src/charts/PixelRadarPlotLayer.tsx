import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { paintPixelRadar, type DitherTileCache } from './paintPixelRadar';
import { computePixelRadarLayout } from './pixelRadarEngine';
import type { PixelWaveFill, PixelWaveSeries } from './pixelWaveEngine';

export type PixelRadarPlotLayerProps = {
  series: readonly PixelWaveSeries[];
  pointCount: number;
  pixel?: number;
  fill?: PixelWaveFill;
  domainMax?: number;
};

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
}: PixelRadarPlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());

  const layout = useMemo(() => {
    if (plot == null) return null;
    return computePixelRadarLayout(series, plot, pointCount, { pixel, domainMax });
  }, [plot, series, pointCount, pixel, domainMax]);

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
    paintPixelRadar(ctx, {
      layout,
      series,
      fill,
      ditherTiles: ditherTilesRef.current,
    });
  }, [layout, series, fill]);

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
