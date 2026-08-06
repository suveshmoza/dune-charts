import { describe, expect, it } from 'vitest';

import {
  computePixelRadarLayout,
  pointInPolygon,
  polarToScreen,
  radarSpokeAngles,
  rimRadiusAtAngle,
  type PixelRadarVertex,
} from './pixelRadarEngine';
import type { PixelWaveBands, PixelWaveSeries } from './pixelWaveEngine';

const BANDS: PixelWaveBands = ['#111', '#333', '#555', '#777', '#999'];

function makeSeries(
  partial: Partial<PixelWaveSeries> & Pick<PixelWaveSeries, 'name' | 'values'>,
): PixelWaveSeries {
  return { bands: BANDS, ...partial };
}

describe('radarSpokeAngles', () => {
  it('spaces angles evenly', () => {
    expect(radarSpokeAngles(4)).toEqual([0, 90, 180, 270]);
    expect(radarSpokeAngles(0)).toEqual([]);
  });
});

describe('polarToScreen', () => {
  it('maps 0° to +x and 90° to -y (screen up)', () => {
    expect(polarToScreen(50, 50, 10, 0)).toEqual({ x: 60, y: 50 });
    expect(polarToScreen(50, 50, 10, 90).x).toBeCloseTo(50, 5);
    expect(polarToScreen(50, 50, 10, 90).y).toBeCloseTo(40, 5);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];

  it('detects inside and outside', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
    expect(pointInPolygon(15, 5, square)).toBe(false);
    expect(pointInPolygon(5, 5, [])).toBe(false);
  });
});

describe('rimRadiusAtAngle', () => {
  it('returns vertex radius on a spoke', () => {
    const cx = 50;
    const cy = 50;
    const verts: PixelRadarVertex[] = [0, 90, 180, 270].map((angle) => {
      const radius = 20;
      const { x, y } = polarToScreen(cx, cy, radius, angle);
      return { angle, radius, x, y };
    });
    expect(rimRadiusAtAngle(cx, cy, verts, 0)).toBeCloseTo(20, 1);
    expect(rimRadiusAtAngle(cx, cy, verts, 90)).toBeCloseTo(20, 1);
  });
});

describe('computePixelRadarLayout', () => {
  const plot = { x: 0, y: 0, width: 120, height: 120 };

  it('returns null for empty inputs', () => {
    expect(computePixelRadarLayout([], plot, 4)).toBeNull();
    expect(
      computePixelRadarLayout(
        [makeSeries({ name: 'a', values: [1, 1, 1, 1] })],
        { ...plot, width: 0 },
        4,
      ),
    ).toBeNull();
  });

  it('places vertices at equal angles', () => {
    const layout = computePixelRadarLayout(
      [makeSeries({ name: 'ops', values: [10, 10, 10, 10] })],
      plot,
      4,
      { pixel: 4, domainMax: 10 },
    );
    expect(layout).not.toBeNull();
    if (layout == null) return;
    const verts = layout.paths[0]?.vertices ?? [];
    expect(verts).toHaveLength(4);
    expect(verts.map((v) => v.angle)).toEqual([0, 90, 180, 270]);
    expect(verts.every((v) => Math.abs(v.radius - layout.outerRadius) < 1e-6)).toBe(true);
  });

  it('fills cells inside a full-domain diamond and crestRow 0 near rim', () => {
    const layout = computePixelRadarLayout(
      [makeSeries({ name: 'ops', values: [10, 10, 10, 10] })],
      plot,
      4,
      { pixel: 4, domainMax: 10 },
    );
    expect(layout).not.toBeNull();
    if (layout == null) return;
    const path = layout.paths[0];
    expect(path).toBeDefined();
    if (path == null) return;
    expect(path.cells.length).toBeGreaterThan(10);

    const nearCenter = path.cells.find((c) => {
      const mx = c.x + 2;
      const my = c.y + 2;
      return Math.hypot(mx - layout.cx, my - layout.cy) < 8;
    });
    expect(nearCenter).toBeDefined();
    expect(nearCenter!.crestRow).toBeGreaterThan(0);

    const { cells, cx, cy } = { cells: path.cells, cx: layout.cx, cy: layout.cy };
    const outerish = cells.reduce<(typeof cells)[number] | null>((best, c) => {
      const dist = Math.hypot(c.x + 2 - cx, c.y + 2 - cy);
      if (best == null) return c;
      const bestDist = Math.hypot(best.x + 2 - cx, best.y + 2 - cy);
      return dist > bestDist ? c : best;
    }, null);
    expect(outerish?.crestRow).toBe(0);
  });

  it('emits one path per series', () => {
    const layout = computePixelRadarLayout(
      [
        makeSeries({ name: 'a', values: [8, 6, 7, 5] }),
        makeSeries({ name: 'b', values: [4, 9, 3, 8] }),
      ],
      plot,
      4,
      { pixel: 4 },
    );
    expect(layout).not.toBeNull();
    if (layout == null) return;
    expect(layout.paths).toHaveLength(2);
    expect(layout.paths.map((p) => p.seriesName)).toEqual(['a', 'b']);
  });
});
