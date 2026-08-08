# Changelog

## 0.1.0

### Breaking

- Compound components are now the primary API (`DuneAreaChart.Area`, `.XAxis`, `.YAxis`, `.Tooltip`, …); the legacy prop-based API (`categories` / `index`) has been removed
- Removed deprecated exports: `DuneAreaChartProps` and `DUNE_BAND_RAMPS`
- Removed the deprecated `xScale` option from the bar layout engine (use `categoryScale`)
- `DuneLineChart` now draws linear segments instead of stepped lines

### Added

- Entrance animations across all charts (area, bar, line, pie, radar, radial), respecting `prefers-reduced-motion`
- Loading state with pixel skeletons for every chart
- Horizontal bars in `DuneBarChart`
- `DuneRadialChart` track color and hit-sector support

### Changed

- Reworked `dither` fill into a continuous 8×8 Bayer mesh with an opaque crest→depth underpaint (no background bleed-through)
- Standardized `CartesianGrid` styling across area, bar, and line charts
- Grouped charts by family and extracted a shared rendering core

### Fixed

- Restored horizontal bar painting and removed hover/focus chart borders

## 0.0.2

- `DuneRadarChart` — pixel polar fill (`bands` | `dither`)
- `DuneRadialChart` — pixel ring arcs (`bands` | `dither`)

## 0.0.1

- Initial public release
- `DuneChartProvider` with `dune` and `night-dune` themes
- `DuneAreaChart` — pixel-wave fills (`bands` | `dither`)
- `DuneBarChart` — pixel-block bars (stacked / grouped)
- `DuneLineChart` — stepped pixel line (no fill wave)
- `DunePieChart` — pixel wedges / donut (`bands` | `dither`)
- `pixel` prop, Recharts pass-throughs, a11y (empty state, tooltip live region)
