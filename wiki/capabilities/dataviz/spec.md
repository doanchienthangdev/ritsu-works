# Capability spec — `dataviz` (v0.4)

> **Status:** operating · **Version:** 0.4.0 · **Pillar:** 06-ai-ops · **Tier:** A (pure
> compute; no money, no external surface, no secret/API key) · **Cost-bucket:** `ai-ops-dataviz`
> · **Decision:** `ops.decisions` slug `dataviz-v0.4-llm-native-selection`
> (extend; v0.3 = `dataviz-v0.3-full-chart-library-and-debrand`; v0.1 = `dataviz-capability-v0.1`).

`/dataviz` is a general, reused-many-times data-visualization platform — like `/image`, but
for **data → chart**. From a data source + a one-sentence **MESSAGE** it picks the BEST chart
type, renders a McKinsey-grade exhibit as byte-stable SVG, and brands it via the same
`--style`/`--art-style` axes as `/image` + `/deepask`. **Pure / offline** — the render path is
in-process Node with zero dependencies (no d3 [ESM-only], no canvas/DOM, no network); chart
selection uses the **session model** (no API key), not an external call.

## 1. What v0.4 adds (the extend) — and the baseline

**v0.4 (this version): chart SELECTION is LLM-native.** Picking the chart that makes the point
is a JUDGMENT task — and the calling agent (Claude Code / Codex) is an intelligent LLM that
reads any language and reasons about nuance far better than a regex matcher. So the agent IS the
selector: it reads a generated **catalog** (`06-ai-ops/skills/dataviz/catalog.md`, from
`lib/taxonomy.cjs` — 60 types × when-to-use + data-shape + McKinsey stance + the analyst's
selection sequence), reasons over the message + data + audience, and renders with
`--chart=<pick> --selected-by=agent --select-reason="…"`. This mirrors resolver v2/v3 (give the
in-session model a catalog, not a hardcoded matcher) and is **multilingual** (the v0.2 regex
missed non-English messages — see §4). `gen.cjs` records `select_mode ∈ {agent, deterministic,
forced}` + the agent's reasoning in `run.json`. The deterministic `select.cjs` (the v0.2 regex
selector) is **retained UNCHANGED** as the fallback for headless/out-of-band callers (CRON, Edge
functions). NO API key — selection is the session model's reasoning, not an external call.

**Baseline carried forward (v0.1→v0.3):** 60 built chart types across all six families (§3);
the McKinsey discipline (one-highlight, data-ink, zero-baseline, direct labels, source footer,
structure ⊥ brand); the de-branded `Ritsu` wordmark; the pure/byte-stable renderer; the
deterministic selector's taxonomy + guard-rails (now the fallback). Backward compatible: every
prior type renders byte-identically; `--chart=<type>` still forces; `--chart=auto` still works.

## 2. Architecture (components)

| Component | Role |
|---|---|
| `.claude/commands/dataviz.md` | thin orchestrator (the `/dataviz` front door) + the **LLM-native selection protocol** + the readable 60-chart list |
| `06-ai-ops/skills/dataviz/catalog.md` | **the agent-facing selection catalog** (generated) — what the agent READS to pick a chart (LLM-native, v0.4) |
| `scripts/dataviz/lib/catalog.cjs` | **the catalog renderer** (PURE) — `buildCatalog()`/`renderCatalogMarkdown()` from `taxonomy.cjs` (single source of truth) |
| `scripts/dataviz/gen-catalog.cjs` | regenerates `catalog.md`; `--check` is the in-sync drift guard |
| `scripts/dataviz/gen.cjs` | the impure edge — parse, load `--data`, resolve `--style`, select, render, emit; records `select_mode ∈ {agent, deterministic, forced}` + the agent's reason in `run.json` |
| `scripts/dataviz/select.cjs` | the **deterministic FALLBACK** selector (PURE, ~50 regex rules → intent → data-shape → guard-rails → built type) — for headless/out-of-band callers only |
| `scripts/dataviz/render.cjs` | the McKinsey-grade SVG renderer (PURE) — `renderChart(type,data,spec,theme)->svg`, 60-entry dispatch |
| `scripts/dataviz/lib/taxonomy.cjs` | **the chart taxonomy** (PURE) — source of truth for `BUILT` + per-type metadata (family, intents, needs, McKinsey stance, fallback) |
| `scripts/dataviz/lib/svg.cjs` | byte-stable SVG primitives + scales (polar/arc + v0.3 spline/bezier/hex/squarify/jitter) |
| `scripts/dataviz/lib/theme.cjs` | the McKinsey theme + `--style` brand override (structure ⊥ brand) |
| `scripts/dataviz/lib/params.cjs` | `UNIVERSAL_PARAMS` (+ v0.4 selection-provenance flags) + arg parsing + consequence-honest warnings |
| `knowledge/dataviz-renderers.yaml` | split renderer registry (svg-native installed; echarts-ssr/vega-lite stubs) |
| `scripts/cross-tier/validate-dataviz-renderers.cjs` | L2 validator (supports ⊆ UNIVERSAL_PARAMS; installed ⇒ generator on disk) |
| `06-ai-ops/sops/SOP-AIOPS-011-dataviz-runtime-contract/flow.yaml` | the runtime contract (6 stages) |
| `tests/dataviz/{select,render,params,theme,taxonomy,catalog}.test.ts` | exhaustive unit tests (byte-stable `toBe`/`toEqual`, no snapshots) |

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

## 4. Chart selection — LLM-native (v0.4, the "smart" core)

**The selector is the calling agent.** Choosing the chart that makes the point is a JUDGMENT
task, and an in-session LLM (Claude Code / Codex) reads natural language in any language and
reasons about nuance far better than a regex keyword-matcher. So selection is **LLM-native** —
the same architectural move resolver v2/v3 made (hand the in-session model an ambient catalog
instead of hardcoding a matcher). The path:

1. The command/skill hands the agent the **catalog** (`06-ai-ops/skills/dataviz/catalog.md`,
   generated from `taxonomy.cjs`): 60 built types × when-to-use + data-shape fit + McKinsey
   stance, grouped by family, with the analyst's selection sequence + worked examples.
2. The agent reads the **MESSAGE** (Zelazny: chart-from-message), the **data shape**, and
   **`--audience`**, applies the McKinsey discipline, and picks.
3. It renders with `--chart=<pick> --selected-by=agent --select-reason="…"` — `gen.cjs` records
   `select_mode=agent` + the reasoning in `run.json` (the audit trail).

**Why this beats the v0.2 regex selector:** it is *multilingual* (a Vietnamese message like
"Reddit dẫn đầu các kênh acquisition" the regex could not read, the agent ranks → `bar`),
*context-aware* (it weighs the whole situation, not keyword presence), and *defensible* (the
reason is the agent's, in `run.json`).

**Deterministic fallback (`select.cjs`, retained UNCHANGED).** `--chart=auto` (or no `--chart`)
runs the v0.2 PURE selector: `selectChart(message, hints, context) -> { chartType, ideal,
family, intent, reason, alternatives[], warnings[], confidence }` — ~50 ordered first-match
regex rules → intent → data-shape (`hints`) → audience nudge → McKinsey guard-rails (entity-x ⇒
Item; pie/donut demote → bar; warn on >6 pie slices, >5 grouped series, radar >8 axes) → map
ideal → built. This is the path for **headless / out-of-band callers** (CRON, Edge functions, a
non-agent script). It is honest about being an English-keyword heuristic (low `confidence` when
it falls through to the safe default) — which is exactly why the in-session path is LLM-native.

A bare `--chart=<type>` is a hard force (`select_mode=forced`); a cataloged type maps to the
nearest built + an honest warning. `run.json` always carries `select_mode`, `intent`, `reason`,
`confidence`; `--explain` prints it.

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

All-Edge-Cases unit tests (224 dataviz cases): each of the 60 renderers (valid SVG, no-NaN on
empty/degenerate/wrong-shape data, byte-stability, source-footer); a `dispatch-coverage`
invariant (every built type maps to a real renderer — caught `beeswarm` silently falling back
to bar); each selector intent + guard-rail + alternatives + confidence + context + boundaries;
taxonomy invariants (built/cataloged, fallbacks built, families, stances); the polar/arc/
spline/hex/squarify primitives; the params. **v0.4:** the catalog (`buildCatalog` covers exactly
the BUILT set; `renderCatalogMarkdown` mentions all 60 + the cataloged boundary; the **on-disk
`catalog.md` byte-equals the generator** — the drift guard); `gen.cjs` selection provenance
(`select_mode ∈ {agent, deterministic, forced}`, confidence defaulting, cataloged-pick remap,
the provenance flags never warn).

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
| 0.4.0 | 2026-06-04 | **Extend** — chart SELECTION made **LLM-native**: the calling agent reads a generated catalog (`catalog.md` ← `lib/catalog.cjs` ← `taxonomy.cjs`) + the situation and picks the chart itself (multilingual, context-aware), recording `select_mode=agent` + reason in `run.json`; `select.cjs` retained UNCHANGED as the deterministic headless fallback. NEW `lib/catalog.cjs` + `gen-catalog.cjs` + `catalog.md` (in-sync drift guard) + 4 selection-provenance flags. Command content gains the readable 60-chart list. NO API key (session model selects). |
