// ============================================================================
// scripts/dataviz/lib/catalog.cjs — the LLM-native chart-selection catalog
// ============================================================================
// Capability `dataviz` v0.4 (extend). PURE, deterministic, zero-dependency.
//
// WHY THIS EXISTS: the selection of a chart from a situation (message + data +
// audience) is a JUDGMENT task. The best judge is the calling agent (Claude Code /
// Codex) — an intelligent LLM that reads natural language in any language and
// reasons about nuance — NOT a regex keyword-matcher. So `/dataviz` selection is
// LLM-NATIVE: the command hands the agent THIS catalog, the agent reads it + the
// situation and PICKS the chart, then renders with `--chart=<pick> --selected-by=
// agent`. This mirrors resolver v2/v3 (the in-session model reads an ambient
// catalog instead of a hardcoded matcher). `select.cjs` (the v0.2 regex selector)
// is retained ONLY as the deterministic fallback for headless / out-of-band callers.
//
// This module renders the agent-facing catalog FROM taxonomy.cjs (the single source
// of truth), so the catalog can never drift from the built types. `gen-catalog.cjs`
// writes it to `06-ai-ops/skills/dataviz/catalog.md`; a test asserts in-sync.
// NO Date.now()/Math.random() → byte-stable → unit-tested with toBe/toEqual.
// ============================================================================

'use strict';

const T = require('./taxonomy.cjs');

const GENERATED_MARKER = '<!-- generated-by: dataviz gen-catalog.cjs (from scripts/dataviz/lib/taxonomy.cjs) — do not hand-edit -->';

// Family-level "reach for this family when…" — the first cut an analyst makes.
const FAMILY_GUIDE = Object.freeze({
  comparison: 'Compare or rank values across discrete items — who is bigger, the ranking, leader-vs-laggard, a 2×2 position, actual-vs-target.',
  correlation: 'Show a RELATIONSHIP between 2-3 measures over shared subjects — does X move with Y.',
  'part-to-whole': 'Show composition / share / a stage drop-off — parts of a whole, the mix, a Likert split, a conversion funnel.',
  'change-over-time': 'Show how a value moves across a REAL date/period axis — a trend, a bridge (A→B), a ranking shift, a schedule, OHLC.',
  distribution: 'Show the SHAPE or spread of a single variable — frequency, quartiles, density, the individual points.',
  'flow-geospatial': 'Show flow between nodes or a topology/grid map — where value goes, who links to whom, the process steps.',
  kpi: 'State ONE number that matters — a big-number callout.',
});

/** A compact "data it needs" string from a taxonomy entry's `needs`. PURE. */
function shapeHint(m) {
  const n = (m && m.needs) || {};
  const parts = [];
  if (n.series) parts.push(`≥${n.series} series`);
  if (n.measures) parts.push(`${n.measures} measures`);
  if (n.periods) parts.push(`${n.periods} periods`);
  if (n.dims) parts.push(`${n.dims}+ dimensions`);
  if (n.target) parts.push('a target value');
  if (n.matrix) parts.push('a row×column matrix');
  if (n.likert) parts.push('a sentiment/Likert split');
  if (n.maxSlices) parts.push(`≤${n.maxSlices} parts`);
  if (n.time) parts.push('a date/period axis');
  return parts.join(', ');
}

/** Agent-readable catalog rows for the BUILT types (built-dispatch order). PURE. */
function buildCatalog() {
  return T.BUILT.map((type) => {
    const m = T.meta(type) || {};
    return {
      type,
      family: m.family || 'comparison',
      stance: m.mckinsey || T.STANCE.ACCEPTABLE,
      when: m.note || '',
      shape: shapeHint(m),
      aka: Array.isArray(m.aka) ? m.aka : [],
      intents: Array.isArray(m.intents) ? m.intents : [],
    };
  });
}

/** Render the agent-facing selection catalog as deterministic markdown. PURE. */
function renderCatalogMarkdown() {
  const rows = buildCatalog();
  const L = [];
  L.push(GENERATED_MARKER);
  L.push('');
  L.push('# /dataviz chart catalog — the LLM-native selection substrate');
  L.push('');
  L.push('> **You (the calling agent) are the chart selector.** Read this catalog + the situation');
  L.push('> (the one-sentence MESSAGE + the data shape + the audience), then pick the chart that');
  L.push('> makes the point — the way a McKinsey analyst would. Gene Zelazny, *Say It With Charts*:');
  L.push('> **choose the chart from the MESSAGE, not the data.** Then render with');
  L.push('> `node scripts/dataviz/gen.cjs --chart=<your-pick> --selected-by=agent --select-reason="<one line>" --data=… --source=…`.');
  L.push('> Generated from `scripts/dataviz/lib/taxonomy.cjs` — do not hand-edit.');
  L.push('');
  L.push('## How to choose (the analyst’s sequence)');
  L.push('');
  L.push('1. **What does the MESSAGE assert?** The verb decides the family — *rank/compare/leads* → comparison · *relates to/drives/correlates* → correlation · *share/mix/of-total/composition/funnel/drop-off* → part-to-whole · *grew/fell/trend/over time/bridge/since* → change-over-time · *spread/distribution/quartiles/frequency* → distribution · *flows/links/process/from→to* → flow-geospatial · *one number* → kpi.');
  L.push('2. **Pick within the family by the data shape** (the *data it needs* column).');
  L.push('3. **Apply the McKinsey discipline.** Prefer `preferred` forms. `pie`/`donut` are **DEMOTED** — use a ranked `bar` unless the message truly is a single-share callout (then pass `--chart=pie` explicitly + accept the warning). Never reach for an `avoid`/cataloged form. One highlight only, zero-baseline bars, direct labels, a source footer on every exhibit.');
  L.push('4. **Nudge by audience.** `exec` → simpler, fewer marks (a long ranking reads better as a `lollipop`); `analyst` → more detail is fine; `general` → the safe default.');
  L.push('5. **Render** with `--chart=<pick> --selected-by=agent --select-reason="why this beats the runner-up"` (optionally `--select-confidence=high|medium|low`). If you are genuinely unsure, omit `--chart` (or pass `--chart=auto`) and the deterministic fallback selector picks a safe default — but you, the agent, should almost always be able to choose better.');
  L.push('');
  L.push('## Worked examples');
  L.push('');
  L.push('- *"Reddit dẫn đầu các kênh acquisition"* → ranking of items → **`bar`** (the Zelazny safe default; this is the multilingual win — a Vietnamese message the old regex could not read).');
  L.push('- *"hoạt động nhiều hơn thì retention cao hơn"* (2 measures) → a relationship → **`scatter`**.');
  L.push('- *"cơ cấu doanh thu theo gói thay đổi theo từng quý"* (share + time) → **`stacked100`**.');
  L.push('- *"60% người dùng rớt qua từng bước trước quiz đầu tiên"* → stage drop-off → **`funnel`**.');
  L.push('- *"xếp hạng 20 trường theo số người dùng"*, audience `exec` → long ranking → **`lollipop`**.');
  L.push('- *"dòng người dùng chảy từ kênh acquisition sang gói trả phí"* → flow between nodes → **`sankey`**.');
  L.push('');
  for (const fam of T.FAMILIES) {
    const inFam = rows.filter((r) => r.family === fam);
    if (!inFam.length) continue;
    L.push(`## ${fam} (${inFam.length})`);
    L.push('');
    L.push(`*Reach for this family when:* ${FAMILY_GUIDE[fam] || ''}`);
    L.push('');
    L.push('| chart | when to use | data it needs | McKinsey | also called |');
    L.push('|---|---|---|---|---|');
    for (const r of inFam) {
      L.push(`| \`${r.type}\` | ${r.when} | ${r.shape || '—'} | ${r.stance} | ${r.aka.join(', ') || '—'} |`);
    }
    L.push('');
  }
  L.push('## Not built (cataloged) — do NOT pass these as `--chart`');
  L.push('');
  L.push('They map to the nearest built type + an honest warning. **10 anti-McKinsey** (radial-bar, nightingale, pictogram, icon-chart, icon-array, word-cloud, gauge, stream, parallel-coordinates, radial-histogram) + **4 infeasible in a pure zero-dep renderer** (choropleth, geo-heatmap, contour, euler). If a situation truly calls for one, use the nearest built form and say so in `--select-reason`.');
  L.push('');
  return L.join('\n');
}

module.exports = { GENERATED_MARKER, FAMILY_GUIDE, shapeHint, buildCatalog, renderCatalogMarkdown };
