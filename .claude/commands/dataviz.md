---
description: |
  Turn a data source into a McKinsey-caliber chart — model-agnostic front door with
  a pluggable renderer layer (--use=<renderer>). Default backend svg-native (in-repo,
  zero-dependency, pure-Node, byte-stable SVG). 60 built chart types across all six
  chart families. v0.4: chart SELECTION is LLM-NATIVE — the calling agent (Claude
  Code/Codex) reads a chart catalog + the situation (message + data-shape + audience)
  and picks the BEST chart itself (multilingual, context-aware, Zelazny "Say It With
  Charts"), then renders with --chart=<pick> --selected-by=agent; a deterministic regex
  selector remains the fallback for headless/out-of-band callers. Encodes the McKinsey
  aesthetic (one-highlight, data-ink minimalism, direct labels, action-title-on-the-chart,
  source footer); brands via the SAME --style design-system + --art-style axes as /image
  + /deepask. Pure/offline (NO API key — selection uses the session model). Tier A;
  artifacts to .archives/dataviz/<date>-<slug>/. Thin orchestrator over the `dataviz`
  umbrella skill (scripts/dataviz/gen.cjs).
argument-hint: "<message> --data=<path|json|csv> [--chart=<type> --selected-by=agent --select-reason=...] [--style=<ds>] [--source=...] [--audience=exec|analyst] [--format=svg|html|inline]"
---

# /dataviz

Project-scoped command for ritsu-works. Front-end for the **dataviz** capability
(v0.4) — a general, reused-many-times data-visualization platform like `/image`, but
for **data → chart**. Capability spec: `wiki/capabilities/dataviz/spec.md`.

The command is a **thin orchestrator**. The brains live in `scripts/dataviz/`
(all PURE + unit-tested): the **chart catalog** `06-ai-ops/skills/dataviz/catalog.md`
(generated from `lib/taxonomy.cjs` — the substrate YOU, the agent, read to select),
`render.cjs` (the McKinsey-grade SVG renderer), `select.cjs` (the deterministic
fallback selector), `lib/{theme,params,svg,catalog}.cjs`. The umbrella skill
`06-ai-ops/skills/dataviz/SKILL.md` documents the flow.

Per `governance/HITL.md`, `/dataviz` is **Tier A** — pure compute, no money, no
external surface, no user impact, **no secret/API key** (the renderer is pure/offline,
unlike `/image`'s `OPENAI_API_KEY`). Cost-bucket `ai-ops-dataviz`; the per-run cost is
~$0 (deterministic; the only LLM cost is the *calling* agent authoring `--message`/`--data`).

## Run

```bash
node scripts/dataviz/gen.cjs --message="<one-sentence message>" --data=<path|json|csv> [flags]
```

The agent runs `gen.cjs` and reports the typed outcome (`inline` returns the SVG into
the conversation; file modes write to `.archives/dataviz/<date>-<slug>/`).

## Parameters

| Flag | Values | Default | Effect |
|---|---|---|---|
| `<message>` / `--message` | one sentence | — | the MESSAGE (Zelazny: drives the chart choice AND becomes the action-title) |
| `--data` | path (.json/.csv) \| inline JSON \| inline CSV | — | the series-data (NOT pixels) |
| `--chart` | `auto` \| one of 60 built types | `auto` | force a type, or let the intelligent selector pick from `--message` + data + `--audience`. **60 built across 6 families** — Comparison: `bar column grouped lollipop dot dumbbell slope radar quadrant bullet small-multiples range matrix-chart table-chart`; Correlation: `scatter bubble heatmap connected-scatter hexbin`; Part-to-whole: `stacked stacked100 pie donut marimekko diverging funnel waffle treemap population-pyramid sunburst dendrogram venn semicircle-donut`; Change-over-time: `line area stacked-area waterfall bump spline step-line gantt candlestick ohlc barcode`; Distribution: `histogram box density ridgeline violin strip jitter beeswarm horizon`; Flow: `sankey chord arc network flowchart tile-map`; plus `kpi`. The 14 cataloged forms (anti-McKinsey: radial-bar/nightingale/pictogram/icon-chart/icon-array/word-cloud/gauge/stream/parallel-coordinates/radial-histogram; + infeasible-in-pure-renderer: choropleth/geo-heatmap/contour/euler) map to the nearest built + an honest note. |
| `--title` / `--title-style` | string / `action`\|`topic` | `--message` / `action` | exhibit caption override; topic labels for survey/trend genre |
| `--source` | string | — | the mandatory source footer (`Source: <data>; McKinsey analysis` or survey form) |
| `--footnotes` | `a \| b \| c` | — | footnote lines (incl. the `Note: …rounding` line on stacked) |
| `--highlight` | series name \| index | first series | the ONE loud series (one-highlight rule) |
| `--style` | design-system \| `auto` | classic mckinsey | brand palette/type override (reuse `/image`+`/deepask`) |
| `--theme` | `mckinsey` \| `mckinsey-rebrand` | `mckinsey` | the built-in McKinsey palette |
| `--art-style` | genre | — | secondary accent only (honest no-op on a pure data chart) |
| `--format` | `inline` \| `svg` \| `html` | `inline` | output medium (png/pdf raster = v0.2 stretch) |
| `--ar` / `--width` / `--height` | `W:H` / px / px | `4:3` / 720 | exhibit size (aspect is SEMANTIC — never auto-stretched) |
| `--unit` / `--decimals` / `--percent` / `--thousands` | … | — | number formatting (stated once, consistent per exhibit) |
| `--use` | `svg-native` \| (stubs) | `svg-native` | pluggable renderer (`knowledge/dataviz-renderers.yaml`) |
| `--audience` | `exec` \| `analyst` \| `general` | `general` | the audience — the agent (and the fallback selector) simplifies for `exec` (e.g. a long ranking → lollipop) |
| `--selected-by` | `agent` | — | **v0.4 — the LLM-native path.** Set when YOU (the agent) chose `--chart` by reading the catalog + the situation; records `select_mode=agent` in `run.json` (vs the deterministic fallback or a hard force) |
| `--select-reason` | string | — | your one-line rationale for the pick (logged to `run.json` for the audit; surfaced by `--explain`) |
| `--select-intent` / `--select-confidence` | string / `high`\|`medium`\|`low` | `llm-native` / `high` | optional: the intent label you inferred + your confidence in the pick |
| `--explain` | flag | — | print the selection rationale: chart + ideal + family + intent + select_mode + reason + alternatives + anti-pattern warnings + confidence |
| `--target` | number | — | target / reference value (bullet chart marker; reference line) |
| `--x-label` / `--y-label` | string | — | axis labels (scatter / bubble / quadrant / box) |
| `--out` / `--dry-run` / `--max-cost-usd` | path / — / usd | — | output path / plan-only / breaker (symmetry with /image) |

## What makes it McKinsey-grade

1. **Chart from the MESSAGE, not the data** (Zelazny). 2. **One highlight only** (the rest neutral gray). 3. **Data-ink minimalism** (no gridlines/legend/3D/fill). 4. **Direct data labels** (no legend). 5. **Bar value-axis from zero** (no truncation). 6. **Action-title ON the chart** + a **source footer on every exhibit**. 7. **Structure ⊥ brand** — `--style` overrides the palette/type, never the structure. Grounded in 3 real McKinsey reports (see `06-ai-ops/skills/dataviz/renderers/svg-native/SKILL.md` + the dataviz-design-brief).

## Selecting the chart — LLM-native (v0.4 — the "smart" core)

**YOU, the calling agent, are the chart selector.** Picking the chart that makes the point is a JUDGMENT task — and you (Claude Code / Codex) read natural language in any language and reason about nuance far better than a regex keyword-matcher could. So `/dataviz` selection is **LLM-native** (the same move resolver v2/v3 made: hand the in-session model a catalog instead of hardcoding a matcher). When the request does NOT already name a chart type:

1. **Read the chart catalog** — `06-ai-ops/skills/dataviz/catalog.md` (generated from `lib/taxonomy.cjs`: all 60 built types × when-to-use + data-shape fit + McKinsey stance, grouped by family, with the analyst's selection sequence + worked examples).
2. **Reason about THIS situation** — the one-sentence MESSAGE (Zelazny: the chart follows the message, not the data), the data shape, and `--audience`. Apply the McKinsey discipline: prefer the `preferred` forms; do NOT reach for `pie`/`donut` (demoted → use a ranked `bar`) or any `avoid`/cataloged form; one highlight, zero-baseline bars, direct labels.
3. **Render with your pick + your reasoning:**
   ```bash
   node scripts/dataviz/gen.cjs --chart=<your-pick> --selected-by=agent \
     --select-reason="why this beats the runner-up" [--select-confidence=high|medium|low] \
     --message="..." --data=... --source=...
   ```
   `--selected-by=agent` records `select_mode=agent` + your reason in `run.json` (the audit trail), distinct from the deterministic fallback and from a bare hard-force.

**Deterministic fallback (Mode C).** Omit `--chart` (or pass `--chart=auto`) and `scripts/dataviz/select.cjs` (PURE, ~50 ordered regex rules → intent → data-shape → guard-rails → built type) picks a safe default. This path exists for **headless / out-of-band callers** (CRON, Edge functions, a non-agent script) — it is honest about being a heuristic (English-keyword based, so it misses non-English messages; that is exactly why the in-session path is LLM-native). When YOU are running the command, prefer Mode A — you will almost always choose better.

This is what matters for ritsu-works exhibits and the `/think mckinsey` engine: the smartest available reasoner picks the chart that makes the point, not just *a* chart.

## The 60 chart types

Full when-to-use guidance is in the catalog (`06-ai-ops/skills/dataviz/catalog.md`); the source of truth is `scripts/dataviz/lib/taxonomy.cjs`. Pass any of these as `--chart=<type>`:

- **Comparison (14)** — `bar` (rank/compare; the safe default) · `column` (few ordered/short-time) · `grouped` (2-3 series/category) · `lollipop` (many categories) · `dot` (no-zero-baseline range) · `dumbbell` (paired delta/gap, before/after) · `slope` (two-period rank shift) · `radar` (multi-dimensional profile) · `quadrant` (2×2 positioning) · `bullet` (actual-vs-target) · `small-multiples` (one panel per slice) · `range` (low–high per item) · `matrix-chart` (presence/strength) · `table-chart` (conditionally-formatted table)
- **Correlation (5)** — `scatter` (2 measures) · `bubble` (3 measures: x,y,size) · `heatmap` (row×col matrix) · `connected-scatter` (time-linked points) · `hexbin` (density of many points)
- **Part-to-whole (14)** — `stacked` (absolute sub-parts) · `stacked100` (share across categories/time) · `pie` *(demoted→bar)* · `donut` *(demoted→bar)* · `marimekko` (size×share — a McKinsey signature) · `diverging` (Likert/sentiment) · `funnel` (stage drop-off) · `waffle` (grid of squares) · `treemap` (nested rectangles by size) · `population-pyramid` (age/sex) · `sunburst` (radial hierarchy) · `dendrogram` (clustering tree) · `venn` (set overlap) · `semicircle-donut` (half-circle)
- **Change over time (11)** — `line` (trend, many periods/multi-series) · `area` (single-series magnitude) · `stacked-area` (composition over time) · `waterfall` (bridge A→B) · `bump` (ranking shifts) · `spline` (smoothed) · `step-line` (discrete steps) · `gantt` (project schedule) · `candlestick` / `ohlc` (financial) · `barcode` (temporal ticks)
- **Distribution (9)** — `histogram` (frequency bins) · `box` (quartiles/outliers) · `density` (probability curve) · `ridgeline` (stacked densities) · `violin` (mirrored density) · `strip` (individual values) · `jitter` / `beeswarm` (categorical points) · `horizon` (compact banded deviations)
- **Flow / geospatial (6)** — `sankey` (flow between nodes) · `chord` (circular entity links) · `arc` (linear nodes + arcs) · `network` (node-link graph) · `flowchart` (process steps) · `tile-map` (equal-size grid map)
- **KPI (1)** — `kpi` (big-number callout)

**14 cataloged-but-not-built** (the selector/agent maps to the nearest built form + an honest note — do NOT pass them): **10 anti-McKinsey** (`radial-bar` `nightingale` `pictogram` `icon-chart` `icon-array` `word-cloud` `gauge` `stream` `parallel-coordinates` `radial-histogram`) + **4 infeasible in a pure zero-dep renderer** (`choropleth` `geo-heatmap` need boundary polygons; `contour` needs a continuous-field engine; `euler` needs general set geometry). **Output wordmark = the Ritsu brand** (the "McKinsey" label is the design *discipline*, not the output brand); `--style=<ds>` overrides it.

## Composition

- **`/think mckinsey` (`mckinsey-sell`)** calls `/dataviz` per exhibit — the exhibit's action-title is the `--message`+`--title`, the survey/analysis line is `--source`. (v2.2 integration.)
- **`/deepask`** can route its `chart` format here (the repo's only deterministic McKinsey-grade SVG chart renderer).
- **`--style`/`--art-style`** flow through as the SAME design context tokens `/image` + `deepask/aesthetic` consume.

## Related
`/image` (raster generation — the sibling platform this mirrors) · `/deepask` (federated synthesis; routes charts here) · `/think mckinsey` (the McKinsey engine; consumes this for exhibits) · `/design-system` (the `--style` registry).
