---
name: dataviz
description: |
  Umbrella for the data-visualization capability — the /dataviz command's brain. From
  a data source + a one-sentence MESSAGE, produce a McKinsey-caliber chart: an intelligent,
  taxonomy-driven selector picks the BEST of 27 built chart types (all six families) from
  the message + data-shape + audience (Zelazny), explains the choice + alternatives +
  anti-pattern warnings, then renders byte-stable SVG with the McKinsey aesthetic
  (one-highlight, data-ink minimalism, direct labels, action-title, source footer), branded
  via the SAME --style design-system + --art-style axes as /image. Pluggable renderer layer
  (--use); default svg-native (zero-dep, pure-Node). Pure/offline — no API key. Dispatches
  to scripts/dataviz/gen.cjs.
allowed-tools: [Read, Write, Bash, Skill]
disable-model-invocation: false
---

# dataviz — turn data into a McKinsey-grade chart

> A general, reused-many-times platform like `/image`, but for **data → chart**. The novel core is a **zero-dependency, pure-Node, byte-stable SVG renderer** that encodes the McKinsey data-viz house style; the chart TYPE is chosen from the message, not the data (Gene Zelazny, *Say It With Charts*).

## The flow (scripts/dataviz/gen.cjs orchestrates)

1. **Parse** the args (`scripts/dataviz/lib/params.cjs` — the dataviz `UNIVERSAL_PARAMS`).
2. **Resolve `--style`** via `scripts/design-system/resolve-style.cjs` (the SAME resolver `/image` uses); a registry miss → classic McKinsey theme + warn (never crash).
3. **Build the theme** (`lib/theme.cjs`) — classic McKinsey tokens by default; `--style` brand palette/type OVERRIDES them (structure ⊥ brand). Tokens read from `resolved.tokens.colors`/`.typography` with guarded fallbacks (arbitrary design-system keys).
4. **Load `--data`** (path/.json/.csv/inline) → the series-data IR.
5. **Select the chart** (`select.cjs`) if `--chart=auto` — the intelligent, taxonomy-driven selector (intent + data-shape + `--audience` → best chart + `reason` + `alternatives` + anti-pattern `warnings` + `confidence`; `--explain` surfaces it); or honor `--chart=<type>` (cataloged → nearest built + reason).
6. **Render** (`render.cjs`) — `renderChart(type, data, spec, theme) -> svgString` (PURE).
7. **Inline** (return the SVG) or **write** `.archives/dataviz/<date>-<slug>/` + `run.json`.

## Pick the renderer (`--use`)

`knowledge/dataviz-renderers.yaml` (split registry, mirror image-adapters): **`svg-native`** (default, installed — the zero-dep pure-Node SVG renderer); `echarts-ssr` + `vega-lite` are registered-not-built stubs (the engine fallbacks). Adding a renderer = a registry row + a generator + a skill — no command-code change.

## The chart-type set (v0.2 — 27 built across all six families)

The full taxonomy + per-type metadata is `scripts/dataviz/lib/taxonomy.cjs` (the source of truth for `BUILT` + the selector's knowledge base; ~74 types catalogued, every type from the Datylon catalog).

- **Comparison:** `bar` `column` `grouped` `lollipop` `dot` `dumbbell` `slope` `radar` `quadrant` (2×2) `bullet` (vs-target)
- **Correlation:** `scatter` `bubble` (3 measures) `heatmap`
- **Part-to-whole:** `stacked` `stacked100` `pie` `donut` `marimekko` (mekko) `diverging` (Likert) `funnel`
- **Change over time:** `line` `area` `stacked-area` (+ `waterfall` bridge)
- **Distribution:** `histogram` `box`
- **KPI:** `kpi` (big-number callout)

**Cataloged-but-not-built** (named in the taxonomy; the selector maps to the nearest built type + an honest reason): treemap, sankey, sunburst, gantt, small-multiples, waffle, candlestick, choropleth, violin, … (47 in total — anti-McKinsey decorations, heavy graph/map topology, or v-next renderers). **pie/donut are built but McKinsey-DEMOTED** — auto-mode renders a ranked bar; force with `--chart=pie`.

## The McKinsey discipline (the renderer encodes; do NOT override)

One-highlight-only · data-ink minimalism (no gridlines/legend/3D/fill) · bar value-axis FROM ZERO · direct data labels · one message per exhibit · action-title ON the chart (`--title-style action`; `topic` for survey/trend genre) · **source footer on EVERY exhibit** (`Source: <data>; McKinsey analysis` OR the survey form `Source: <survey>, <dates>, n=<N>; <countries>`) · the `Note: …rounding` line on stacked · serif-title/sans-body. **`--style` overrides palette + type only** (precedence brand > legibility > McKinsey art-direction > decoration).

## Data shapes (the IR)

- bar/column/line/stacked/stacked100/grouped: `{ categories: [...], series: [{ name, values: [...] }] }`
- scatter: `{ points: [{ x, y, label?, highlight? }], xLabel? }`
- waterfall: `{ steps: [{ label, delta, total? }] }` (running cumulative; `total:true` = an absolute total bar)
- kpi: `{ stats: [{ value, label, sub? }] }` (or `{ value, label }`)

## Composition + guards

- **`/think mckinsey`** (`mckinsey-sell`) calls this per exhibit (the action-title → `--message`+`--title`; the survey/analysis line → `--source`). **`/deepask`** routes its `chart` format here.
- **Pure/offline:** no secret, no API, no network. Byte-stable output (every number through `fmt()`); deterministic → unit-tested with `toBe`/`toEqual` (NOT vitest snapshots — the repo forbids them).
- **HITL Tier A.** Cost ~$0. Label de-collision on dense data is a documented v0.1 non-goal (no text-measurement engine).

## References

`scripts/dataviz/{gen,select,render}.cjs` + `lib/{params,theme,svg,taxonomy}.cjs` · `knowledge/dataviz-renderers.yaml` · `06-ai-ops/skills/dataviz/{select,renderers/svg-native}/SKILL.md` · `06-ai-ops/sops/SOP-AIOPS-011-dataviz-runtime-contract/flow.yaml` · the grounding: Gene Zelazny *Say It With Charts*; `wiki/cracked-it/concepts/quantitative-chart-typology.md`; the dataviz-design-brief (3 real McKinsey reports).
