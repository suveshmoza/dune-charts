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

Charts are built from **parts, not props**. The root owns data/theme/loading; axes, tooltip, legend, and series are children.

```tsx
<DuneChartProvider theme="dune">
  <DuneAreaChart
    data={data}
    config={{
      melange: { label: 'Melange', color: '#c45c26' },
      water: { label: 'Water' },
    }}
    fill="dither"
    pixel={2}
  >
    <DuneAreaChart.Grid />
    <DuneAreaChart.XAxis dataKey="month" />
    <DuneAreaChart.YAxis />
    <DuneAreaChart.Tooltip />
    <DuneAreaChart.Legend />
    <DuneAreaChart.Area dataKey="melange" stackId="ops" />
    <DuneAreaChart.Area dataKey="water" stackId="ops" />
  </DuneAreaChart>
</DuneChartProvider>
```

| Concern                                          | Where                                                           |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `theme`                                          | `DuneChartProvider` — `dune` \| `night-dune`                    |
| `data` / `config` / `fill` / `pixel` / `loading` | Chart root                                                      |
| Index / category axis                            | `<….XAxis dataKey="…" />` or `<….PolarAngleAxis dataKey="…" />` |
| Series                                           | `<….Area />`, `<….Bar />`, `<….Line />`, `<….Radar dataKey />`  |
| Pie / radial geometry                            | `<….Pie />` / `<….RadialBar dataKey nameKey />`                 |
| Tooltip / legend / grid                          | Opt-in children                                                 |
| Escape hatch                                     | Root `chartProps` for Recharts chart-level props                |

Omit a part (e.g. `<Legend />`) to hide it. Horizontal bars: `layout="vertical"` on `DuneBarChart`. Donut: `innerRadius` / `outerRadius` on `<DunePieChart.Pie />`.

## Repo

```bash
pnpm install
pnpm --filter @suveshmoza/dune-charts build
pnpm dev                 # playground
pnpm test
```

Chart sources live under [`packages/dune-charts/src/charts/<family>/`](packages/dune-charts/src/charts) (`area`, `bar`, `line`, `pie`, `radar`, `radial`) plus `shared/` for composition, wave/bands core, dither tiles, polar math, loading helpers, and series builders.

Docs site later. Playground: [`apps/playground`](apps/playground).
