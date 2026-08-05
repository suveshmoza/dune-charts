import type { CSSProperties } from 'react';

import type { DuneSeriesConfig } from '../types';

/** Indexed series color: custom `--dune-series-N` with palette fallback. */
export function getSeriesVar(index: number): string {
  return `var(--dune-series-${index}, var(--dune-${(index % 5) + 1}))`;
}

/**
 * Builds container style with `--dune-series-0…N` only (never from raw data keys).
 * Custom `config[key].color` wins; otherwise falls back to `--dune-1…5`.
 */
export function buildSeriesStyle(
  categories: readonly string[],
  config?: Partial<Record<string, DuneSeriesConfig>>,
): CSSProperties {
  const style: Record<string, string | number> = {};

  for (let index = 0; index < categories.length; index += 1) {
    const key = categories[index];
    if (key == null) continue;
    style[`--dune-series-${index}`] = config?.[key]?.color ?? `var(--dune-${(index % 5) + 1})`;
  }

  return style;
}

/**
 * Resolve a CSS color (including `var(--dune-…)`) against an element’s cascade
 * into a concrete `rgb(…)` / `rgba(…)` string browsers can parse.
 */
export function resolveCssColor(host: Element, cssColor: string): string {
  const probe = document.createElement('span');
  probe.style.color = cssColor;
  probe.style.position = 'absolute';
  probe.style.width = '0';
  probe.style.height = '0';
  probe.style.overflow = 'hidden';
  probe.style.pointerEvents = 'none';
  host.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  host.removeChild(probe);
  return resolved;
}

/** Resolve each series’ Recharts base color (`getSeriesVar`) from the chart host. */
export function resolveSeriesBaseColors(host: Element, seriesCount: number): string[] {
  const colors: string[] = [];
  for (let i = 0; i < seriesCount; i += 1) {
    colors.push(resolveCssColor(host, getSeriesVar(i)));
  }
  return colors;
}
