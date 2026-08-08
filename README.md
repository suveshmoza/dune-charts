# dune

Monorepo for **[@suveshmoza/dune-charts](packages/dune-charts)**.

Pixel-art charts built on [Recharts](https://recharts.org) — area, bar, line, pie, radar, and radial, with dithered crest→depth fills and chunky cells.

Usage, install, and API docs live in the package README: [`packages/dune-charts/README.md`](packages/dune-charts/README.md).

## Example

```tsx
import { DuneChartProvider, DuneAreaChart } from '@suveshmoza/dune-charts';
import '@suveshmoza/dune-charts/styles.css';

<DuneChartProvider theme="dune">
  <DuneAreaChart data={data} fill="dither" pixel={2}>
    <DuneAreaChart.XAxis dataKey="month" />
    <DuneAreaChart.YAxis />
    <DuneAreaChart.Area dataKey="melange" />
  </DuneAreaChart>
</DuneChartProvider>;
```

## Develop

```bash
pnpm install
pnpm dev                 # playground
pnpm build               # build the library
pnpm test
```

## Layout

- [`packages/dune-charts`](packages/dune-charts) — the charts library
- [`apps/playground`](apps/playground) — local playground and showcase
