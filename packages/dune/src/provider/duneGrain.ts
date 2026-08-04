export const DUNE_GRAINS = ['subtle'] as const;

export type DuneGrain = (typeof DUNE_GRAINS)[number];
