import { describe, expect, it } from 'vitest';

import { colorsForKeys, composeSeriesKeys } from './composeSeriesKeys';

describe('composeSeriesKeys', () => {
  it('orders areas then bars then lines', () => {
    expect(
      composeSeriesKeys(['a'], ['b', 'c'], ['d']),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedupes with first partition winning', () => {
    expect(composeSeriesKeys(['shared'], ['shared', 'bar'], ['shared', 'line'])).toEqual([
      'shared',
      'bar',
      'line',
    ]);
  });

  it('handles empty partitions', () => {
    expect(composeSeriesKeys(undefined, ['x'], undefined)).toEqual(['x']);
    expect(composeSeriesKeys(undefined, undefined, undefined)).toEqual([]);
  });
});

describe('colorsForKeys', () => {
  it('maps partition keys to global color slots', () => {
    expect(colorsForKeys(['a', 'b', 'c'], ['#111', '#222', '#333'], ['c', 'a'])).toEqual([
      '#333',
      '#111',
    ]);
  });
});
