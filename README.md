# dune

Pixel-wave area, bar, line, pie, radar, and radial charts on a Recharts shell. Themes, crest→depth fills, chunky cells.

## Install

```bash
pnpm add @suveshmoza/dune-charts recharts
```

```ts
import {
  DuneChartProvider,
  DuneAreaChart,
  DuneBarChart,
  DuneLineChart,
  DunePieChart,
  DuneRadarChart,
  DuneRadialChart,
} from '@suveshmoza/dune-charts';
import '@suveshmoza/dune-charts/styles.css';
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
    pixel={2}
    seriesProps={{
      melange: { stackId: 'ops' },
      water: { stackId: 'ops' },
    }}
  />
</DuneChartProvider>
```

| Prop                                | Notes                                                             |
| ----------------------------------- | ----------------------------------------------------------------- |
| `theme` (provider)                  | `dune` \| `night-dune`                                            |
| `fill`                              | Area/bar/pie/radar/radial: `bands` (default) \| `dither`          |
| `pixel`                             | Cell size in CSS px (default `2`)                                 |
| `loading`                           | All charts: pixel skeleton + soft shimmer + spinner badge         |
| `loadingMessage` / `loadingIndicator` | Optional copy / custom badge mark                               |
| `config`                            | Per-series / slice `label`, `color`, optional `bands`             |
| `seriesProps` / `chartProps`        | Recharts pass-throughs (`stackId`, `stackOffset`, …)              |
| pie / radial `dataKey` / `nameKey`  | Recharts-style row data                                           |

## Repo

```bash
pnpm install
pnpm --filter @suveshmoza/dune-charts build
pnpm dev                 # playground
pnpm test
```

Docs site later. Playground: [`apps/playground`](apps/playground).

`DuneAreaChart` / `DuneBarChart` / `DunePieChart` / `DuneRadarChart` / `DuneRadialChart` share `fill` / `pixel` / `config`. `DuneLineChart` is stepped pixel stroke only (no fill wave). Pie and radial use Recharts `dataKey` / `nameKey` rows. Horizontal bars: `chartProps={{ layout: 'vertical' }}` on `DuneBarChart`. Loading: `loading` / `loadingMessage` / `loadingIndicator` on every chart — pixel skeletons with a shared soft traveling shimmer plus floating spinner badge (line is a muted stepped path; fill charts use dither). Pass `title` / `description` for the chart region; series `config.label` for legend and tooltip text.
