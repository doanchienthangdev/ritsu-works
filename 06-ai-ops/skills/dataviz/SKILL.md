---
name: dataviz
description: |
  Umbrella for the data-visualization capability — the /dataviz command's brain. From a
  data source + a one-sentence MESSAGE, produce a McKinsey-caliber chart across 60 built
  chart types (all six families). Chart SELECTION is LLM-native (v0.4): the calling agent
  reads a generated catalog (catalog.md, from lib/taxonomy.cjs) + the situation (message +
  data-shape + audience, Zelazny) and picks the best chart itself; a deterministic regex
  selector (select.cjs) is the headless fallback. Renders byte-stable SVG with the McKinsey
  aesthetic (one-highlight, data-ink minimalism, direct labels, action-title, source footer),
  branded via the SAME --style design-system + --art-style axes as /image. Pluggable renderer
  (--use); default svg-native (zero-dep, pure-Node). Pure/offline — no API key. Dispatches to
  scripts/dataviz/gen.cjs.
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
5. **Select the chart — LLM-native (v0.4).** Selecting a chart is a JUDGMENT task, so the **calling agent** is the selector: read the catalog `06-ai-ops/skills/dataviz/catalog.md` (generated from `lib/taxonomy.cjs` — 60 types × when-to-use + data-shape + McKinsey stance + the selection sequence), reason over the MESSAGE + data-shape + `--audience`, then render with `--chart=<pick> --selected-by=agent --select-reason="…"` (records `select_mode=agent` in `run.json`). This mirrors resolver v2/v3 (give the in-session model a catalog, not a regex). **Deterministic fallback:** `--chart=auto` (or none) runs `select.cjs` (PURE regex selector) for headless/out-of-band callers — honest heuristic, English-keyword based. A bare `--chart=<type>` is a hard force; cataloged → nearest built + reason.
6. **Render** (`render.cjs`) — `renderChart(type, data, spec, theme) -> svgString` (PURE).
7. **Inline** (return the SVG) or **write** `.archives/dataviz/<date>-<slug>/` + `run.json`.

## Pick the renderer (`--use`)

`knowledge/dataviz-renderers.yaml` (split registry, mirror image-adapters): **`svg-native`** (default, installed — the zero-dep pure-Node SVG renderer); `echarts-ssr` + `vega-lite` are registered-not-built stubs (the engine fallbacks). Adding a renderer = a registry row + a generator + a skill — no command-code change.

## The chart-type set (v0.3 — 60 built across all six families)

The full taxonomy + per-type metadata is `scripts/dataviz/lib/taxonomy.cjs` (the source of truth for `BUILT`; 74 types catalogued, every type from the Datylon catalog). The agent-facing **selection catalog** `06-ai-ops/skills/dataviz/catalog.md` is generated from it (`scripts/dataviz/gen-catalog.cjs`) — that is what YOU read to pick a chart (LLM-native).

- **Comparison (14):** `bar` `column` `grouped` `lollipop` `dot` `dumbbell` `slope` `radar` `quadrant` (2×2) `bullet` (vs-target) `small-multiples` `range` `matrix-chart` `table-chart`
- **Correlation (5):** `scatter` `bubble` (3 measures) `heatmap` `connected-scatter` `hexbin`
- **Part-to-whole (14):** `stacked` `stacked100` `pie` `donut` `marimekko` (mekko) `diverging` (Likert) `funnel` `waffle` `treemap` `population-pyramid` `sunburst` `dendrogram` `venn` `semicircle-donut`
- **Change over time (11):** `line` `area` `stacked-area` `waterfall` (bridge) `bump` `spline` `step-line` `gantt` `candlestick` `ohlc` `barcode`
- **Distribution (9):** `histogram` `box` `density` `ridgeline` `violin` `strip` `jitter` `beeswarm` `horizon`
- **Flow (6):** `sankey` `chord` `arc` `network` `flowchart` `tile-map`
- **KPI (1):** `kpi` (big-number callout)

**Only 14 stay cataloged-but-not-built** (selector maps to the nearest built + an honest reason): **10 anti-McKinsey** (radial-bar, nightingale, pictogram, icon-chart, icon-array, word-cloud, gauge, stream, parallel-coordinates, radial-histogram) + **4 infeasible in a pure zero-dep renderer** (choropleth/geo-heatmap need real boundary polygons; contour needs a continuous-field/marching-squares engine; euler needs general set geometry). **pie/donut are built but McKinsey-DEMOTED** — auto-mode renders a ranked bar; force with `--chart=pie`. **Output wordmark = the Ritsu brand** (the "McKinsey" label is the design *discipline*, not the output brand); `--style=<ds>` overrides it with the design-system name.

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

`scripts/dataviz/{gen,select,render,gen-catalog}.cjs` + `lib/{params,theme,svg,taxonomy,catalog}.cjs` · the agent-facing **`06-ai-ops/skills/dataviz/catalog.md`** (generated; the LLM-native selection substrate) · `knowledge/dataviz-renderers.yaml` · `06-ai-ops/skills/dataviz/{select,renderers/svg-native}/SKILL.md` · `06-ai-ops/sops/SOP-AIOPS-011-dataviz-runtime-contract/flow.yaml` · the grounding: Gene Zelazny *Say It With Charts*; `wiki/cracked-it/concepts/quantitative-chart-typology.md`; the dataviz-design-brief (3 real McKinsey reports).
