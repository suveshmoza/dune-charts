import type { PixelWaveFill } from '@suveshmoza/dune-charts';

export const CHARTS = [
  { id: 'area', label: 'Area' },
  { id: 'bar', label: 'Bar' },
  { id: 'line', label: 'Line' },
  { id: 'pie', label: 'Pie' },
  { id: 'radar', label: 'Radar' },
  { id: 'radial', label: 'Radial' },
] as const;

export type ChartId = (typeof CHARTS)[number]['id'];

export const VARIANTS: Record<ChartId, readonly { id: string; label: string }[]> = {
  area: [
    { id: 'simple', label: 'Simple' },
    { id: 'stacked', label: 'Stacked' },
    { id: 'expand', label: '100% stacked' },
  ],
  bar: [
    { id: 'simple', label: 'Simple' },
    { id: 'stacked', label: 'Stacked' },
    { id: 'horizontal', label: 'Horizontal' },
  ],
  line: [
    { id: 'simple', label: 'Simple' },
    { id: 'multi', label: 'Multi-series' },
  ],
  pie: [
    { id: 'pie', label: 'Pie' },
    { id: 'donut', label: 'Donut' },
  ],
  radar: [{ id: 'simple', label: 'Simple' }],
  radial: [
    { id: 'full', label: 'Full ring' },
    { id: 'semi', label: 'Semi ring' },
  ],
};

export type PlaygroundControls = {
  fill: PixelWaveFill;
  pixel: number;
  loading: boolean;
  empty: boolean;
  variant: string;
};
