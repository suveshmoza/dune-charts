import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { paintPixelPie, type DitherTileCache } from './paintPixelPie';
import {
  computePixelPieLayout,
  type PixelPieLayoutOptions,
  type PixelPieSlice,
} from './pixelPieEngine';
import type { PixelWaveFill } from './pixelWaveEngine';

export type PixelPiePlotLayerProps = {
  slices: readonly PixelPieSlice[];
  pixel?: number;
  fill?: PixelWaveFill;
  layoutOptions?: Omit<PixelPieLayoutOptions, 'pixel'>;
};

/**
 * Draws chunky pixel pie wedges inside the Recharts plot area via Canvas2D.
 * Pointer events stay on Pie sectors for tooltip / legend.
 */
export function PixelPiePlotLayer({
  slices,
  pixel = 2,
  fill = 'bands',
  layoutOptions,
}: PixelPiePlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());

  const layout = useMemo(() => {
    if (plot == null) return null;
    return computePixelPieLayout(slices, plot, {
      pixel,
      ...layoutOptions,
    });
  }, [plot, slices, pixel, layoutOptions]);

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
    paintPixelPie(ctx, {
      layout,
      slices,
      fill,
      ditherTiles: ditherTilesRef.current,
    });
  }, [layout, slices, fill]);

  if (layout == null || plot == null) return null;

  const { plotW, plotH } = layout;

  return (
    <g className="dune-pixel-pie-layer" pointerEvents="none" aria-hidden>
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
