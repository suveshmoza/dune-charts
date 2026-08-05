/** Theme ids for `data-dune-theme`. CSS custom properties remain source of truth. */
export const DUNE_THEMES = ['dune', 'night-dune'] as const;

export type DuneTheme = (typeof DUNE_THEMES)[number];

/** CSS custom property names (without `--`) shared by every dune theme. */
export const DUNE_TOKEN_KEYS = [
  'dune-bg',
  'dune-ink',
  'dune-muted-text',
  'dune-grid',
  'dune-tick',
  'dune-border',
  'dune-1',
  'dune-2',
  'dune-3',
  'dune-4',
  'dune-5',
  'dune-accent',
  'dune-tooltip-bg',
  'dune-tooltip-ink',
  'dune-tooltip-border',
  'dune-tooltip-shadow',
] as const;

export type DuneTokenKey = (typeof DUNE_TOKEN_KEYS)[number];

function cssVar<K extends DuneTokenKey>(key: K): `var(--${K})` {
  return `var(--${key})`;
}

export const DUNE_CSS_VARS = {
  'dune-bg': cssVar('dune-bg'),
  'dune-ink': cssVar('dune-ink'),
  'dune-muted-text': cssVar('dune-muted-text'),
  'dune-grid': cssVar('dune-grid'),
  'dune-tick': cssVar('dune-tick'),
  'dune-border': cssVar('dune-border'),
  'dune-1': cssVar('dune-1'),
  'dune-2': cssVar('dune-2'),
  'dune-3': cssVar('dune-3'),
  'dune-4': cssVar('dune-4'),
  'dune-5': cssVar('dune-5'),
  'dune-accent': cssVar('dune-accent'),
  'dune-tooltip-bg': cssVar('dune-tooltip-bg'),
  'dune-tooltip-ink': cssVar('dune-tooltip-ink'),
  'dune-tooltip-border': cssVar('dune-tooltip-border'),
  'dune-tooltip-shadow': cssVar('dune-tooltip-shadow'),
} as const satisfies { [K in DuneTokenKey]: `var(--${K})` };
