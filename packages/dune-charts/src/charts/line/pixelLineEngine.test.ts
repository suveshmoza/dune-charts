import { describe, expect, it } from 'vitest';

import type { PixelWaveBands, PixelWaveSeries } from '../shared/pixelWaveEngine';
import {
  appendBresenhamRun,
  appendHorizontalRun,
  appendVerticalRun,
  computePixelLinePlotLayout,
  rasterizeLinear,
  type PixelLineCell,
} from './pixelLineEngine';

const BANDS: PixelWaveBands = ['#111', '#333', '#555', '#777', '#999'];

function makeSeries(
  partial: Partial<PixelWaveSeries> & Pick<PixelWaveSeries, 'name' | 'values'>,
): PixelWaveSeries {
  return { bands: BANDS, ...partial };
}

function linearYScale(plotBottom: number, pixelsPerUnit: number) {
  return (value: number) => plotBottom - value * pixelsPerUnit;
}

function sortedKeys(cells: readonly PixelLineCell[]): string[] {
  return cells.map((c) => `${c.x},${c.y}`).toSorted();
}

describe('appendHorizontalRun / appendVerticalRun', () => {
  it('fills inclusive pixel runs on the grid', () => {
    const cells = new Map<string, PixelLineCell>();
    appendHorizontalRun(cells, 0, 12, 40, 4);
    expect(sortedKeys([...cells.values()])).toEqual(['0,40', '12,40', '4,40', '8,40']);

    appendVerticalRun(cells, 40, 52, 12, 4);
    expect(cells.has('12,40')).toBe(true);
    expect(cells.has('12,44')).toBe(true);
    expect(cells.has('12,48')).toBe(true);
    expect(cells.has('12,52')).toBe(true);
  });
});

describe('rasterizeLinear / appendBresenhamRun', () => {
  it('draws a diagonal between consecutive points', () => {
    const cells = rasterizeLinear(
      [
        { x: 0, y: 40 },
        { x: 12, y: 20 },
      ],
      4,
    );
    const keys = new Set(sortedKeys(cells));
    expect(keys.has('0,40')).toBe(true);
    expect(keys.has('12,20')).toBe(true);
    // Diagonal visits mid cells (not pure H-then-V step corner at 12,40 alone as the only bridge)
    expect(keys.has('4,36') || keys.has('4,32') || keys.has('8,28') || keys.has('8,24')).toBe(true);
  });

  it('keeps a single point as one cell', () => {
    expect(rasterizeLinear([{ x: 8, y: 16 }], 4)).toEqual([{ x: 8, y: 16 }]);
  });

  it('fills a pure horizontal via Bresenham', () => {
    const cells = new Map<string, PixelLineCell>();
    appendBresenhamRun(cells, 0, 20, 12, 20, 4);
    expect(sortedKeys([...cells.values()])).toEqual(['0,20', '12,20', '4,20', '8,20']);
  });
});

describe('computePixelLinePlotLayout', () => {
  const plot = { x: 0, y: 0, width: 120, height: 100 };
  const yScale = linearYScale(100, 1);

  it('returns null for empty inputs', () => {
    expect(computePixelLinePlotLayout([], plot, yScale, 3)).toBeNull();
    expect(
      computePixelLinePlotLayout(
        [makeSeries({ name: 'a', values: [1, 2, 3] })],
        { ...plot, width: 0 },
        yScale,
        3,
      ),
    ).toBeNull();
  });

  it('snaps Y to the pixel grid from baseline', () => {
    const layout = computePixelLinePlotLayout(
      [makeSeries({ name: 'melange', values: [41] })],
      plot,
      yScale,
      1,
      { pixel: 4 },
    );
    expect(layout).not.toBeNull();
    // value 41 → y=59; snap from baseline 100: round((100-59)/4)*4 = 40 → y=60
    expect(layout!.paths[0]?.cells).toEqual([{ x: 60, y: 60 }]);
  });

  it('builds a continuous linear path across category centers', () => {
    const indexValues = ['a', 'b', 'c'];
    const centers = [20, 60, 100];
    const xScale = (value: unknown) => {
      const i = indexValues.indexOf(String(value));
      return i >= 0 ? centers[i] : undefined;
    };

    const layout = computePixelLinePlotLayout(
      [makeSeries({ name: 'melange', values: [40, 20, 40] })],
      plot,
      yScale,
      3,
      { pixel: 4, indexValues, xScale },
    );

    expect(layout).not.toBeNull();
    const path = layout!.paths[0];
    expect(path).toBeDefined();
    const keys = new Set(sortedKeys(path.cells));

    // snapped centers: 20, 60, 100; y for 40→60, 20→80, 40→60
    expect(keys.has('20,60')).toBe(true);
    expect(keys.has('60,80')).toBe(true);
    expect(keys.has('100,60')).toBe(true);
    // Linear path should include diagonal midpoints, not only H-then-V corners
    expect(path.cells.length).toBeGreaterThan(3);
  });

  it('emits one path per series', () => {
    const layout = computePixelLinePlotLayout(
      [makeSeries({ name: 'a', values: [40, 40] }), makeSeries({ name: 'b', values: [20, 20] })],
      plot,
      yScale,
      2,
      { pixel: 4 },
    );
    expect(layout!.paths).toHaveLength(2);
    expect(layout!.paths.map((p) => p.seriesName)).toEqual(['a', 'b']);
  });
});
