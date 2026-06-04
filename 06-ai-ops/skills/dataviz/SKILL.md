---
name: dataviz
description: |
  Umbrella for the data-visualization capability — the /dataviz command's brain. From
  a data source + a one-sentence MESSAGE, produce a McKinsey-caliber chart: choose the
  chart type FROM THE MESSAGE (Zelazny), render it byte-stable SVG with the McKinsey
  aesthetic (one-highlight, data-ink minimalism, direct labels, action-title, source
  footer), and brand via the SAME --style design-system + --art-style axes as /image.
  Pluggable renderer layer (--use); default svg-native (zero-dep, pure-Node). Pure/
  offline — no API key. Dispatches to scripts/dataviz/gen.cjs.
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
5. **Select the chart** (`select.cjs`) if `--chart=auto` — the Zelazny message→type matcher; or honor `--chart=<type>`.
6. **Render** (`render.cjs`) — `renderChart(type, data, spec, theme) -> svgString` (PURE).
7. **Inline** (return the SVG) or **write** `.archives/dataviz/<date>-<slug>/` + `run.json`.

## Pick the renderer (`--use`)

`knowledge/dataviz-renderers.yaml` (split registry, mirror image-adapters): **`svg-native`** (default, installed — the zero-dep pure-Node SVG renderer); `echarts-ssr` + `vega-lite` are registered-not-built stubs (the engine fallbacks). Adding a renderer = a registry row + a generator + a skill — no command-code change.

## The chart-type set (v0.1, from real McKinsey reports)

Built: `bar` (horizontal sorted — Item default), `column`, `line`, `stacked`, `stacked100`, `grouped` (leader-vs-laggard), `scatter`, **`waterfall`** (bridge), `kpi` (big-number callout). Deferred to v0.2 (the selector names them then maps to the nearest built + warns): marimekko, dumbbell, diverging, bubble, heatmap, bubble-matrix, histogram, area, pie (McKinsey demotes >~6-slice pies to bars).

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

`scripts/dataviz/{gen,select,render}.cjs` + `lib/{params,theme,svg}.cjs` · `knowledge/dataviz-renderers.yaml` · `06-ai-ops/skills/dataviz/{select,renderers/svg-native}/SKILL.md` · `06-ai-ops/sops/SOP-AIOPS-011-dataviz-runtime-contract/flow.yaml` · the grounding: Gene Zelazny *Say It With Charts*; `wiki/cracked-it/concepts/quantitative-chart-typology.md`; the dataviz-design-brief (3 real McKinsey reports).
