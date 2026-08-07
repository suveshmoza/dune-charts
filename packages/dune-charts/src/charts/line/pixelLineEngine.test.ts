import { describe, expect, it } from 'vitest';

import {
  appendHorizontalRun,
  appendVerticalRun,
  computePixelLinePlotLayout,
  rasterizeStepAfter,
  type PixelLineCell,
} from './pixelLineEngine';
import type { PixelWaveBands, PixelWaveSeries } from '../shared/pixelWaveEngine';

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

describe('rasterizeStepAfter', () => {
  it('draws H then V between consecutive points', () => {
    const cells = rasterizeStepAfter(
      [
        { x: 0, y: 40 },
        { x: 12, y: 20 },
      ],
      4,
    );
    const keys = new Set(sortedKeys(cells));
    // horizontal at y=40 from x=0..12
    expect(keys.has('0,40')).toBe(true);
    expect(keys.has('12,40')).toBe(true);
    // vertical at x=12 from y=40..20
    expect(keys.has('12,20')).toBe(true);
    expect(keys.has('12,36')).toBe(true);
    // no diagonal shortcut
    expect(keys.has('4,36')).toBe(false);
  });

  it('keeps a single point as one cell', () => {
    expect(rasterizeStepAfter([{ x: 8, y: 16 }], 4)).toEqual([{ x: 8, y: 16 }]);
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

  it('builds a continuous step-after path across category centers', () => {
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

    // snapped centers: 20→20, 60→60, 100→100; y for 40→60, 20→80, 40→60
    expect(keys.has('20,60')).toBe(true);
    expect(keys.has('60,60')).toBe(true); // end of first H
    expect(keys.has('60,80')).toBe(true); // end of first V
    expect(keys.has('100,80')).toBe(true); // end of second H
    expect(keys.has('100,60')).toBe(true); // end of second V
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
