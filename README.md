# dune

Pixel-wave area, pixel-block bar, stepped line, and pixel pie charts on a Recharts shell. Themes, crest→depth fills, chunky cells.

## Install

Peers: `react`, `react-dom`, `recharts` ^3.

```bash
pnpm add dune recharts
```

Until publish, use the workspace package from this monorepo (`packages/dune`).

```ts
import { DuneChartProvider, DuneAreaChart, DuneBarChart, DuneLineChart, DunePieChart } from 'dune';
import 'dune/styles.css';
```

## Quick start

```tsx
<DuneChartProvider theme="dune">
  <DuneAreaChart
    data={data}
    index="month"
    categories={['melange', 'water']}
    config={{
      melange: { label: 'Melange', color: '#c45c26' },
      water: { label: 'Water' },
    }}
    fill="dither"
    pixel={4}
    seriesProps={{
      melange: { stackId: 'ops' },
      water: { stackId: 'ops' },
    }}
  />
</DuneChartProvider>
```

| Prop                         | Notes                                                 |
| ---------------------------- | ----------------------------------------------------- |
| `theme` (provider)           | `dune` \| `night-dune`                                |
| `fill`                       | Area/bar/pie: `bands` (default) \| `dither`           |
| `pixel`                      | Cell size in CSS px (default `4`)                     |
| `config`                     | Per-series / slice `label`, `color`, optional `bands` |
| `seriesProps` / `chartProps` | Recharts pass-throughs (`stackId`, `stackOffset`, …)  |
| pie `dataKey` / `nameKey`    | Recharts-style slice rows                             |

## Repo

```bash
pnpm install
pnpm --filter dune build
pnpm dev                 # playground
pnpm test
```

Docs site later. Playground: [`apps/playground`](apps/playground).

`DuneAreaChart` / `DuneBarChart` / `DunePieChart` share `fill` / `pixel` / `config`. `DuneLineChart` is stepped pixel stroke only (no fill wave). Pie uses Recharts `dataKey` / `nameKey` slice rows. Pass `title` / `description` for the chart region; series `config.label` for legend and tooltip text.
