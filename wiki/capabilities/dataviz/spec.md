# Capability spec — `dataviz` (v0.3)

> **Status:** operating · **Version:** 0.3.0 · **Pillar:** 06-ai-ops · **Tier:** A (pure
> compute; no money, no external surface, no secret/API key) · **Cost-bucket:** `ai-ops-dataviz`
> · **Decision:** `ops.decisions` slug `dataviz-v0.2-chart-library-and-smart-select`
> (extend; v0.1 = `dataviz-capability-v0.1`).

`/dataviz` is a general, reused-many-times data-visualization platform — like `/image`, but
for **data → chart**. From a data source + a one-sentence **MESSAGE** it picks the BEST chart
type, renders a McKinsey-grade exhibit as byte-stable SVG, and brands it via the same
`--style`/`--art-style` axes as `/image` + `/deepask`. **Pure / offline** — the render path is
in-process Node with zero dependencies (no d3 [ESM-only], no canvas/DOM, no network); the only
LLM cost is the *calling* agent authoring `--message`/`--data` (its own budgeted task_kind).

## 1. What v0.3 adds (the extend) — and the v0.2 baseline

**v0.3 (this version):** **+33 built chart types → 60 total** (the remaining feasible,
non-anti-McKinsey Datylon forms), so only **14 stay cataloged** (10 anti-McKinsey + 4
infeasible in a pure zero-dep renderer) — see §3. New `lib/svg.cjs` primitives
(`splinePath`, `bezierH`, `hexPath`, `squarify`, `jitterOffset`) + selector auto-trigger
rules for the new types + a `dispatch-coverage` invariant (every built type must have a
real renderer). **De-branded** the default output wordmark (`McKinsey & Company` → `Ritsu`;
`--style=<ds>` still overrides it with the design-system name) — the McKinsey name stays the
design *discipline*, never the output brand.

**v0.2 baseline (carried forward):**
1. **The intelligent, context-aware selector** (the emphasized deliverable) — a complete chart
   taxonomy + a multi-factor decision engine that returns the best chart **with an explained
   rationale, runner-up alternatives, anti-pattern warnings, and a confidence** — see §4.
2. **5 flags** — `--explain --audience --target --x-label --y-label` — see §5.

Backward compatible: the 27 prior types render byte-identically; the McKinsey discipline is
unchanged; `--chart=auto` still demotes pie→bar (a *selector discipline*, since pie is
buildable).

## 2. Architecture (components)

| Component | Role |
|---|---|
| `.claude/commands/dataviz.md` | thin orchestrator (the `/dataviz` front door) |
| `scripts/dataviz/gen.cjs` | the impure edge — parse, load `--data`, resolve `--style`, select, render, emit; `buildHints` + `--explain` |
| `scripts/dataviz/select.cjs` | **the intelligent selector** (PURE) — intent → data-shape → audience → guard-rails → built type + explain |
| `scripts/dataviz/render.cjs` | the McKinsey-grade SVG renderer (PURE) — `renderChart(type,data,spec,theme)->svg`, 27-entry dispatch |
| `scripts/dataviz/lib/taxonomy.cjs` | **the chart taxonomy** (PURE) — source of truth for `BUILT` + per-type metadata (family, intents, needs, McKinsey stance, fallback) |
| `scripts/dataviz/lib/svg.cjs` | byte-stable SVG primitives + scales (+ v0.2 polar/arc: `polarToCartesian`, `arcPath`, `ringPath`, `polygonD`) |
| `scripts/dataviz/lib/theme.cjs` | the McKinsey theme + `--style` brand override (structure ⊥ brand) |
| `scripts/dataviz/lib/params.cjs` | `UNIVERSAL_PARAMS` + arg parsing + consequence-honest warnings |
| `knowledge/dataviz-renderers.yaml` | split renderer registry (svg-native installed; echarts-ssr/vega-lite stubs) |
| `scripts/cross-tier/validate-dataviz-renderers.cjs` | L2 validator (supports ⊆ UNIVERSAL_PARAMS; installed ⇒ generator on disk) |
| `06-ai-ops/sops/SOP-AIOPS-011-dataviz-runtime-contract/flow.yaml` | the runtime contract (6 stages) |
| `tests/dataviz/{select,render,params,theme,taxonomy}.test.ts` | exhaustive unit tests (byte-stable `toBe`/`toEqual`, no snapshots) |

**Byte-stability contract:** every coordinate/number routes through `fmt()` (2-dp, trailing
zeros stripped, `-0` normalized, locale-independent); attribute order fixed; no
`Date.now()`/`Math.random()` → identical bytes every run → asserted with `toBe`/`toEqual`.

## 3. The chart-type taxonomy (`lib/taxonomy.cjs`)

~74 types catalogued (every type from the Datylon catalog), each tagged `family · built ·
fallback · mckinsey-stance · intents · needs`. **60 BUILT (v0.3):**

- **Comparison (14):** bar · column · grouped · lollipop · dot · dumbbell · slope · radar · quadrant · bullet · small-multiples · range · matrix-chart · table-chart
- **Correlation (5):** scatter · bubble · heatmap · connected-scatter · hexbin
- **Part-to-whole (14):** stacked · stacked100 · pie · donut · marimekko · diverging · funnel · waffle · treemap · population-pyramid · sunburst · dendrogram · venn · semicircle-donut
- **Change over time (11):** line · area · stacked-area · waterfall · bump · spline · step-line · gantt · candlestick · ohlc · barcode
- **Distribution (9):** histogram · box · density · ridgeline · violin · strip · jitter · beeswarm · horizon
- **Flow (6):** sankey · chord · arc · network · flowchart · tile-map
- **KPI (1):** kpi

**14 CATALOGED-but-not-built (v0.3)** (named; the selector maps to the nearest built type + an
honest reason): **10 anti-McKinsey** (radial-bar, nightingale, pictogram, icon-chart, icon-array,
word-cloud, gauge, stream, parallel-coordinates, radial-histogram) + **4 infeasible in a pure
zero-dep renderer** (choropleth + geo-heatmap need real boundary polygons; contour needs a
continuous-field/marching-squares engine; euler needs general set geometry). This is the honest,
documented non-goal boundary — everything else (33 types) was built in v0.3.

## 4. The intelligent selector — the "smart" core

`selectChart(message, hints, context) -> { chartType, ideal, family, intent, reason,
alternatives[], warnings[], confidence }`. PURE, deterministic, taxonomy-driven; **no LLM in
the path** (the calling agent supplies the message + data — this is the disciplined mapping).

1. **Intent** — 18 ordered first-match trigger rules → a Zelazny comparison kind.
2. **Data shape** (`hints`) disambiguates within the family.
3. **Context** (`audience`) nudges (exec → simpler; long ranking → lollipop).
4. **McKinsey guard-rails** — entity-x ⇒ Item (not trend); pie/donut demote → bar; warns on
   >6 pie slices, >5 grouped series, radar >8 axes.
5. **Map ideal → built** (taxonomy fallback + honest reason).
6. **Explain** — `reason`, `alternatives[]` (runner-ups + why), `warnings[]` (anti-patterns),
   `confidence` (high/medium/low). `--explain` surfaces it; always in `run.json`.

This is what matters for ritsu-works exhibits **and** the `/think mckinsey` engine: pick the
chart that makes the point, and be able to defend it — the analyst's craft, made deterministic.

## 5. Parameters (delta — full list in the command)

`--explain` (print the rationale) · `--audience exec|analyst|general` (selection modifier) ·
`--target <n>` (bullet/reference) · `--x-label`/`--y-label` (axis labels). All ⊆
`UNIVERSAL_PARAMS`; consequence-honest warnings unchanged.

Data shapes (the IR): bar/column/line/area/stacked*/grouped/marimekko/lollipop/dot/slope/
diverging/funnel/histogram = `{categories, series:[{name,values}]}` (funnel also `{stages:[{label,value}]}`,
histogram also `{values:[...]}` or `{bins:[{label,count}]}`); scatter/bubble/quadrant =
`{points:[{x,y,size?,label?,highlight?}]}` (+`{quadrants:[4]}`); heatmap = `{categories(cols),
series:[{name(row),values}]}`; bullet = `{measures:[{label,value,target,max?}]}`; box =
`{boxes:[5-num]}` or `{samples:[{label,values}]}`; radar = `{axes:[...], series}`; waterfall =
`{steps:[{label,delta,total?}]}`; kpi = `{stats:[{value,label,sub?}]}`.

## 6. Composition

- **`/think mckinsey` (`mckinsey-sell`)** calls `/dataviz` per exhibit; the action-title is the
  `--message` (the selector picks the exhibit form from it).
- **`/deepask`** routes its `chart` format here.
- **`--style`/`--art-style`** are the SAME design context tokens `/image` + `deepask/aesthetic` consume.

## 7. Testing + non-goals

All-Edge-Cases unit tests (188 dataviz cases): each of the 60 renderers (valid SVG, no-NaN on
empty/degenerate/wrong-shape data, byte-stability, source-footer); a `dispatch-coverage`
invariant (every built type maps to a real renderer — caught `beeswarm` silently falling back
to bar); each selector intent + guard-rail + alternatives + confidence + context + boundaries;
taxonomy invariants (built/cataloged, fallbacks built, families, stances); the polar/arc/
spline/hex/squarify primitives; the new params.

Non-goals (honest): no text-measurement engine → dense-label de-collision is out of scope;
PNG/PDF raster is a stretch (svg/html/inline now); the **14 cataloged** types are not rendered
(map to nearest built + warn) — 10 anti-McKinsey + 4 infeasible in a pure zero-dep byte-stable
renderer (choropleth/geo-heatmap need boundary polygons; contour needs a continuous-field
engine; euler needs general set geometry). Graph/flow topology now renders deterministically
(sankey/chord/arc/network/flowchart via fixed layouts — no force simulation).

## 8. Versioning

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-06-04 | Initial — 9 chart types, the Zelazny selector, the pure byte-stable renderer, the McKinsey discipline. |
| 0.2.0 | 2026-06-04 | **Extend** — 27 built chart types (all six families) + the intelligent, context-aware, explainable selector (taxonomy-driven) + 5 flags. wiki spec promoted (v0.1 gap filled). |
| 0.3.0 | 2026-06-04 | **Extend** — 60 built chart types (+33: the remaining feasible, non-anti-McKinsey Datylon forms); only 14 stay cataloged (10 anti-McKinsey + 4 infeasible-in-pure-renderer). New svg primitives (spline/bezier/hex/squarify/jitter) + selector auto-rules + dispatch-coverage invariant. **De-branded** the default output wordmark to the Ritsu brand. 188 tests. |
