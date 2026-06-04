# CHANGELOG — capability `dataviz`

## v0.4.0 — 2026-06-04 (extend, SOP-AIOPS-001-extend)

**"LLM-native chart selection."** `/cla extend dataviz`, self-shipped. The founder's insight:
when the caller is already an intelligent LLM (Claude Code / Codex), give it a catalog + the
situation and let it reason — don't keyword-match. The resolver v2/v3 pattern, applied to chart
choice.

### Added
- **`scripts/dataviz/lib/catalog.cjs`** — `buildCatalog()` + `renderCatalogMarkdown()`, rendered
  FROM `taxonomy.cjs` (the single source of truth), so the catalog can never drift from the built
  types. PURE, byte-stable.
- **`scripts/dataviz/gen-catalog.cjs`** — writes `06-ai-ops/skills/dataviz/catalog.md`; `--check`
  is the in-sync drift guard (a test asserts the on-disk file equals `renderCatalogMarkdown()`).
- **`06-ai-ops/skills/dataviz/catalog.md`** (generated) — the agent-facing selection substrate:
  60 built types × when-to-use + data-shape fit + McKinsey stance, grouped by family, with the
  analyst's selection sequence + worked examples (incl. multilingual ones).
- **4 selection-provenance flags** — `--selected-by=agent`, `--select-reason`, `--select-intent`,
  `--select-confidence`. `gen.cjs` records `select_mode ∈ {agent, deterministic, forced}` + the
  agent's reasoning in `run.json`.
- The readable **60-chart list** in the command content (founder ask: the command doc was missing it).

### Changed
- **Selection is now LLM-native by default.** The command/skill instruct the calling agent to read
  `catalog.md` + the situation and pick the chart itself (multilingual, context-aware), then render
  with `--chart=<pick> --selected-by=agent`. This is the "smart" core, moved from regex to reasoning.
- `select.cjs` (the v0.2 regex selector) is **retained UNCHANGED**, reframed as the **deterministic
  fallback** for headless / out-of-band callers (`--chart=auto`, CRON, Edge functions).
- Fixed `gen.cjs` `runJson.version` (was stale `0.2.0` → `0.4.0`).

### Unchanged
- The 60 renderers, the McKinsey discipline, the de-branded `Ritsu` wordmark, pure/offline, Tier A,
  ~$0, byte-stability. NO API key — selection uses the session model's reasoning, not an external call.


## v0.3.0 — 2026-06-04 (extend, SOP-AIOPS-001-extend)

**"Near-complete chart library + de-branded output."** `/cla extend dataviz`, self-shipped.

### Added
- **+33 built chart types → 60 total** (the remaining feasible, non-anti-McKinsey Datylon
  forms): `small-multiples`, `range`, `matrix-chart`, `table-chart`, `connected-scatter`,
  `hexbin`, `waffle`, `treemap`, `population-pyramid`, `sunburst`, `dendrogram`, `venn`,
  `semicircle-donut`, `bump`, `spline`, `step-line`, `gantt`, `candlestick`, `ohlc`,
  `barcode`, `density`, `ridgeline`, `violin`, `strip`, `jitter`, `beeswarm`, `horizon`,
  `sankey`, `chord`, `arc`, `network`, `flowchart`, `tile-map`. All pure, byte-stable,
  never-throw, deterministic-layout.
- New `lib/svg.cjs` primitives: `splinePath`, `bezierH`, `hexPath`, `squarify`, `jitterOffset`.
- Selector auto-trigger rules for the new types (+ a `dispatch-coverage` invariant test:
  every built type must have a real renderer — caught `beeswarm` silently falling back to bar).
- +~50 tests (188 dataviz total).

### Changed
- **De-branded the default output wordmark**: `McKinsey & Company` → `Ritsu` (`render.cjs`
  `frame()`). The "McKinsey" name remains the design *discipline*, never the output brand;
  `--style=<ds>` still overrides the wordmark with the design-system name.
- Taxonomy: flipped the 33 from `cataloged` → `built`; only **14 stay cataloged** — 10
  anti-McKinsey (radial-bar/nightingale/pictogram/icon-chart/icon-array/word-cloud/gauge/
  stream/parallel-coordinates/radial-histogram) + 4 infeasible in a pure zero-dep renderer
  (choropleth/geo-heatmap need boundary polygons; contour needs a continuous-field engine;
  euler needs general set geometry). Infeasible fallbacks repointed (choropleth/geo-heatmap→
  tile-map, euler→venn). `dataviz-renderers.yaml` 1.1.0→1.2.0.

### Unchanged
- The 27 prior types render byte-identically; the McKinsey discipline (one-highlight, data-ink,
  zero-baseline, direct labels, source-footer, structure ⊥ brand); pure/offline, Tier A, ~$0.


## v0.2.0 — 2026-06-04 (extend, SOP-AIOPS-001-extend)

**"Many charts + an intelligent, context-aware selector."** `/cla extend dataviz`,
self-shipped (the `/image` + `/forge` autonomous pattern). Tier A runtime; extend ceremony
Tier C (Section-4 component adds). Reversibility 5/5 (additive pure code).

### Added
- **18 new built chart types → 27 total**, across all six Datylon families: `area`,
  `stacked-area`, `pie`, `donut`, `marimekko`, `bubble`, `heatmap`, `dumbbell`, `lollipop`,
  `dot`, `slope`, `bullet`, `diverging`, `histogram`, `funnel`, `quadrant`, `radar`, `box`.
- **`scripts/dataviz/lib/taxonomy.cjs`** — the chart-type knowledge base: every type from the
  Datylon catalog (~74), tagged family/built/fallback/McKinsey-stance/intents/needs. Source of
  truth for `BUILT`.
- **An intelligent, context-aware selector** (`select.cjs` rewrite): message-intent →
  data-shape → audience → McKinsey guard-rails → built type, returning `{chartType, ideal,
  family, intent, reason, alternatives[], warnings[], confidence}`. Explainable + anti-pattern-aware.
- **5 flags**: `--explain`, `--audience`, `--target`, `--x-label`, `--y-label`.
- **Polar/arc SVG primitives** (`lib/svg.cjs`): `polarToCartesian`, `arcPath`, `ringPath`, `polygonD`.
- **`wiki/capabilities/dataviz/spec.md`** (the v0.1 promotion gap, filled) + this CHANGELOG.
- **~90 new unit tests** (`tests/dataviz/{select,render,params,taxonomy}.test.ts`).

### Changed (intentional, backward-compatible)
- `--chart=auto` selection of marimekko/bubble/histogram now renders those types **natively**
  (v0.1 fell back to stacked100/scatter/column). Three select tests updated to the stronger
  assertion (never weakened).
- pie/donut are now **buildable** (`--chart=pie`) but **auto-demoted to a ranked bar** — the
  McKinsey discipline moved from "not built" to "selector-demoted". The `BUILT`-not-contain-pie
  guard test became an auto-demotion test.
- `knowledge/dataviz-renderers.yaml` `chart_types`/`deferred_chart_types`/`supports` updated;
  registry `version` 1.0.0 → 1.1.0. `SOP-AIOPS-011` `version` 1.0.0 → 1.1.0.

### Unchanged
- The 9 v0.1 chart types render byte-identically. The McKinsey discipline (one-highlight,
  data-ink minimalism, zero-baseline, direct labels, action-title, source-footer,
  structure ⊥ brand). Pure/offline, no secret/API key, Tier A, ~$0.

## v0.1.0 — 2026-06-04 (initial, /cla propose-then-execute)

9 chart types (bar/column/line/stacked/stacked100/grouped/scatter/waterfall/kpi), the Zelazny
message→type selector (10 rules + 2 guard-rails), the zero-dependency pure-Node byte-stable SVG
renderer encoding the McKinsey house style, `--style` brand override, the split renderer
registry + L2 validator + SOP-AIOPS-011. Decision `dataviz-capability-v0.1`. PR #235.
