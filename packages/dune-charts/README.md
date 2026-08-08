# @suveshmoza/dune-charts

Pixel-art charts built on [Recharts](https://recharts.org) — area, bar, line, pie, radar, and radial, with dithered crest→depth fills and chunky cells.

## Install

```bash
pnpm add @suveshmoza/dune-charts recharts
```

`react`, `react-dom`, and `recharts` are peer dependencies.

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

Charts are built from **parts, not props**. The root owns data, theme, and loading; axes, tooltip, legend, and series are children. Omit a part to hide it.

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

## Composition

| Concern                                          | Where                                                           |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `theme`                                          | `DuneChartProvider` — `dune` \| `night-dune`                    |
| `data` / `config` / `fill` / `pixel` / `loading` | Chart root                                                      |
| Index / category axis                            | `<….XAxis dataKey="…" />` or `<….PolarAngleAxis dataKey="…" />` |
| Series                                           | `<….Area />`, `<….Bar />`, `<….Line />`, `<….Radar dataKey />`  |
| Pie / radial geometry                            | `<….Pie />` / `<….RadialBar dataKey nameKey />`                 |
| Tooltip / legend / grid                          | Opt-in children                                                 |
| Escape hatch                                     | Root `chartProps` for Recharts chart-level props                |

## Charts

- `DuneAreaChart` — pixel-wave fills (`bands` | `dither`), stacking via `stackId`
- `DuneBarChart` — pixel-block bars (stacked / grouped); horizontal via `layout="vertical"`
- `DuneLineChart` — pixel line drawn as linear segments
- `DunePieChart` — pixel wedges / donut (`innerRadius` / `outerRadius` on `<DunePieChart.Pie />`)
- `DuneRadarChart` — pixel polar fill (`bands` | `dither`)
- `DuneRadialChart` — pixel ring arcs (`bands` | `dither`)

## Fills

`fill="bands"` (default) renders solid crest→depth ribbons. `fill="dither"` renders a continuous 8×8 Bayer mesh with an opaque crest→depth underpaint. `pixel` controls cell size (default `2`).

## Theming

Wrap charts in `DuneChartProvider` with `theme="dune"` or `theme="night-dune"`. Series colors come from `config[key].color` or the built-in palette; theme tokens are exposed as CSS variables (`DUNE_CSS_VARS`, `DUNE_THEMES`).

## Loading & empty states

Pass `loading` on the chart root to render pixel skeletons; entrance animations respect `prefers-reduced-motion`. An empty `data` array renders an accessible empty state (`emptyMessage`).

## License

MIT © Suvesh Moza
