import { useId, useMemo, type ReactElement } from 'react';
import { usePlotArea, useXAxisScale, useYAxisScale } from 'recharts';

import {
  bandIndexFromCrestRow,
  buildBayerTile,
  computePixelWavePlotLayout,
  ditherDensityForBand,
  ditherPairFromBands,
  hashString,
  sortDrawOrder,
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

const DITHER_SUBPIXEL = 2;

/**
 * Draws chunky pixel-wave fills inside the Recharts plot area.
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
  const reactId = useId().replace(/:/g, '');

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

  const ditherPatterns = useMemo(() => {
    if (fill !== 'dither') return null;
    return series.flatMap((s) => {
      const seriesKey = hashString(s.name).toString(36);
      return ([0, 1, 2, 3, 4] as const).map((band) => {
        const [hi, lo] = ditherPairFromBands(s.bands, band);
        const density = ditherDensityForBand(band);
        const tile = buildBayerTile(hi, lo, density, DITHER_SUBPIXEL);
        const id = `dune-dither-${reactId}-${seriesKey}-${band}`;
        return { id, seriesName: s.name, band, tile };
      });
    });
  }, [fill, series, reactId]);

  if (layout == null) return null;

  const drawOrder = sortDrawOrder(series);
  const cells: ReactElement[] = [];
  const patternByKey = new Map(
    ditherPatterns?.map((p) => [`${p.seriesName}:${p.band}`, p.id] as const) ?? [],
  );

  drawOrder.forEach((s) => {
    for (const col of layout.columns) {
      const topY = col.topY[s.name] ?? 0;
      const cellCount = col.cellCount[s.name] ?? 0;

      for (let row = 0; row < cellCount; row += 1) {
        const band = bandIndexFromCrestRow(row);
        const patternId = patternByKey.get(`${s.name}:${band}`);
        const cellFill =
          fill === 'dither' && patternId != null ? `url(#${patternId})` : s.bands[band];

        cells.push(
          <rect
            key={`${s.name}-${col.x}-${row}`}
            x={col.x}
            y={topY + row * layout.pixel}
            width={layout.pixel}
            height={layout.pixel}
            fill={cellFill}
            shapeRendering="crispEdges"
          />,
        );
      }
    }
  });

  return (
    <g className="dune-pixel-wave-layer" pointerEvents="none" aria-hidden>
      {ditherPatterns != null && ditherPatterns.length > 0 ? (
        <defs>
          {ditherPatterns.map((pattern) => {
            const tileSize = 4 * DITHER_SUBPIXEL;
            return (
              <pattern
                key={pattern.id}
                id={pattern.id}
                width={tileSize}
                height={tileSize}
                patternUnits="userSpaceOnUse"
              >
                {pattern.tile.map((cell) => (
                  <rect
                    key={`${pattern.id}-${cell.x}-${cell.y}`}
                    x={cell.x}
                    y={cell.y}
                    width={cell.size}
                    height={cell.size}
                    fill={cell.fill}
                    shapeRendering="crispEdges"
                  />
                ))}
              </pattern>
            );
          })}
        </defs>
      ) : null}
      {cells}
    </g>
  );
}
