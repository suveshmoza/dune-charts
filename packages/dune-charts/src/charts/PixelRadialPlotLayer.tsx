import { useLayoutEffect, useMemo, useRef } from 'react';
import { usePlotArea } from 'recharts';

import { paintPixelRadial, type DitherTileCache } from './paintPixelRadial';
import {
  computePixelRadialLayoutFromHits,
  type PixelRadialBar,
  type PixelRadialHitSector,
} from './pixelRadialEngine';
import type { PixelWaveFill } from './pixelWaveEngine';

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
};

/**
 * Draws chunky pixel radial-bar arcs inside the Recharts plot area via Canvas2D.
 * Pointer events stay on RadialBar sectors for tooltip / legend.
 * Paints only when `hits` mirror Recharts sector geometry.
 */
export function PixelRadialPlotLayer({
  bars,
  hits,
  pixel = 2,
  fill = 'bands',
  trackStartAngle = 0,
  trackEndAngle = 360,
  trackColor,
}: PixelRadialPlotLayerProps) {
  const plot = usePlotArea();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ditherTilesRef = useRef<DitherTileCache>(new Map());

  const layout = useMemo(() => {
    if (plot == null) return null;
    // Independent fallback is centered on the plot box and drifts from
    // RadialBar sectors — only paint once hit geometry is available.
    if (hits == null || hits.length === 0) return null;
    return computePixelRadialLayoutFromHits(hits, plot, pixel, {
      startAngle: trackStartAngle,
      endAngle: trackEndAngle,
    });
  }, [plot, hits, pixel, trackStartAngle, trackEndAngle]);

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
    paintPixelRadial(ctx, {
      layout,
      bars,
      fill,
      trackColor,
      ditherTiles: ditherTilesRef.current,
    });
  }, [layout, bars, fill, trackColor]);

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
