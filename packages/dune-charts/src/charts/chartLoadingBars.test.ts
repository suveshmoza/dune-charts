import { describe, expect, it } from 'vitest';

import {
  buildLoadingBarRows,
  buildLoadingRadialBars,
  getLoadingBarHeights,
  LOADING_BAR_INDEX_KEY,
  LOADING_BAR_VALUE_KEY,
  loadingBandsFromColor,
} from './chartLoadingBars';

describe('getLoadingBarHeights', () => {
  it('is stable for the same count and epoch', () => {
    expect(getLoadingBarHeights(8, 0)).toEqual(getLoadingBarHeights(8, 0));
  });

  it('stays within the requested range', () => {
    for (const h of getLoadingBarHeights(16, 0, 22, 88)) {
      expect(h).toBeGreaterThanOrEqual(22);
      expect(h).toBeLessThanOrEqual(88);
    }
  });
});

describe('buildLoadingBarRows', () => {
  it('maps heights onto loading keys', () => {
    const rows = buildLoadingBarRows(3, 0);
    expect(rows).toHaveLength(3);
    expect(rows[0]?.[LOADING_BAR_INDEX_KEY]).toBe('0');
    expect(typeof rows[0]?.[LOADING_BAR_VALUE_KEY]).toBe('number');
  });
});

describe('loadingBandsFromColor', () => {
  it('returns a five-stop muted ramp for near-neutral colors', () => {
    const bands = loadingBandsFromColor('#eceae4');
    expect(bands).toHaveLength(5);
  });
});

describe('buildLoadingRadialBars', () => {
  it('builds stable muted arcs for a given count', () => {
    const bars = buildLoadingRadialBars(4, '#eceae4');
    expect(bars).toHaveLength(4);
    expect(bars[0]?.bands).toHaveLength(5);
    expect(bars.every((b) => b.value > 0)).toBe(true);
  });
});
