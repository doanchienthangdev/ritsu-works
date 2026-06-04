// ============================================================================
// scripts/dataviz/select.cjs — the intelligent, context-aware chart selector
// ============================================================================
// Capability `dataviz` v0.2 (extend). PURE, deterministic, taxonomy-driven.
//   selectChart(message, hints, context) ->
//     { chartType, ideal, family, intent, reason, alternatives[], warnings[], confidence }
//
// The governing principle (Gene Zelazny, "Say It With Charts"): CHOOSE THE CHART
// FROM THE MESSAGE, NOT THE DATA. v0.2 makes that choice SMART: a complete chart
// taxonomy (lib/taxonomy.cjs) + a multi-factor pipeline —
//   1) detect the message INTENT (ordered first-match trigger rules),
//   2) resolve the IDEAL chart using the DATA SHAPE (hints),
//   3) nudge by CONTEXT (audience),
//   4) apply the McKinsey GUARD-RAILS (entity-x⇒item, pie-demote, series caps),
//   5) map the ideal → a BUILT type (honest fallback + reason),
//   6) attach ALTERNATIVES (runner-ups), WARNINGS (anti-patterns), CONFIDENCE.
// No LLM in the path — the calling agent supplies the message + data; this is the
// disciplined, explainable mapping. Byte-stable → unit-tested with toBe/toEqual.
// ============================================================================

'use strict';

const T = require('./lib/taxonomy.cjs');
const BUILT = T.BUILT;
const DEFER_MAP = T.DEFER_MAP;

const has = (m, re) => re.test(m);

// ── 1. INTENT rules (ordered first-match; id == the ideal category). ──────────
// Order = specificity. New v0.2 rules are gated on words/hints absent from the
// v0.1 cases so the existing behavior is preserved; the 3 "deferred-now-built"
// outcomes (marimekko/bubble/histogram) intentionally change (see tests).
const RULES = [
  // bridge / build-up / contribution-to-change → waterfall. A bare "from X to Y" is
  // NOT a trigger (catches time ranges); require bridge vocab OR has_negatives.
  { id: 'waterfall', fn: (m, h) => h.has_negatives || has(m, /\b(bridge|waterfall|build[-\s]?up|contribution to (the )?change|drivers? of (the )?change|inflows?|outflows?|reconcil|how (did|do) we (get|got)\b)\b/) },
  // ordered-stage drop-off → funnel.
  { id: 'funnel', fn: (m, h) => has(m, /\b(funnel|conversion (rate|funnel|path)|drop[-\s]?off|stage[-\s]?by[-\s]?stage|through the (stages|pipeline)|signup.*(activation|paid)|step[-\s]?through)\b/) },
  // actual-vs-target performance → bullet.
  { id: 'bullet', fn: (m, h) => h.has_target || has(m, /\b((vs\.?|versus|against|to) target|performance (vs|against|to) (goal|target|plan)|actual vs\.? (target|plan|budget)|attainment|% of (goal|target|quota)|on track (to|against))\b/) },
  // Likert / sentiment split around a center → diverging. (Bare "satisfaction"/"sentiment"
  // are too broad — require an explicit opposing-pair signal or is_likert.)
  { id: 'diverging', fn: (m, h) => h.is_likert || has(m, /\b(agree|disagree|favora|unfavora|likert|approve.*disapprove|positive.*negative responses|net (promoter|sentiment)|strongly (agree|disagree))\b/) },
  // 2x2 / positioning / prioritization matrix → quadrant (before scatter).
  { id: 'quadrant', fn: (m, h) => has(m, /\b(2\s?[x×]\s?2|two[-\s]by[-\s]two|quadrant|positioning (map|matrix)|priorit\w* matrix|bcg matrix|magic quadrant|attractiveness vs|impact vs effort|map(ped)? on two)\b/) },
  // two share dimensions (size × share) → marimekko (built in v0.2). (Dropped the loose
  // "both…and…axis/dimension" clause — it caught ordinary two-period comparisons.)
  { id: 'marimekko', fn: (m, h) => has(m, /\b(size\s+(and|x|×|by)\s+share|market size.*share|by segment and by (player|competitor|region)|two (share|size) dimensions|mekko|marimekko)\b/) },
  // three measures → bubble; exactly two → scatter.
  { id: 'bubble', fn: (m, h) => h.n_measures >= 3 || h.has_size || has(m, /\bbubble\b/) },
  { id: 'scatter', fn: (m, h) => h.n_measures === 2 || has(m, /\b(correlat|relationship between|relates to|varies with|the more.*the (more|less)|as\s+\S+\s+(rises|increases|grows).*(rises|falls|increases|decreases)|driven by|scatter)\b/) },
  // multi-dimensional profile → radar.
  { id: 'radar', fn: (m, h) => has(m, /\b(radar|spider chart|across (several |multiple )?(dimensions|attributes|criteria|capabilities)|capability profile|strengths? and weakness|multi[-\s]?dimensional profile|on \d+ (dimensions|criteria|attributes))\b/) },
  // spread / quartiles / outliers → box.
  { id: 'box', fn: (m, h) => has(m, /\b(quartiles?|interquartile|box[-\s]?plot|spread|variability|dispersion|median and range|outliers?|whisker)\b/) },
  // frequency distribution → histogram (built in v0.2).
  { id: 'histogram', fn: (m, h) => has(m, /\b(distribution|frequency|how many.*(fall|lie).*(within|between)|ranges|buckets?|bins?|histogram|brackets)\b/) },
  // two-snapshot change with reordering → slope.
  { id: 'slope', fn: (m, h) => has(m, /\b(slope ?graph|slope chart|before and after|before vs\.? after|two snapshots|rank (shift|change)|reorder)\b/) || (h.n_periods === 2 && (h.n_series || 1) >= 4) },
  // paired gap / disparity between two values → dumbbell.
  { id: 'dumbbell', fn: (m, h) => (h.n_series === 2 && has(m, /\b(gap|disparity|difference between|pay gap|change from .* to|closed the gap|widened)\b/)) || has(m, /\b(dumbbell|barbell)\b/) },
  // component over time (share-word AND time) → 100%-stacked / stacked-area.
  { id: 'stacked100', fn: (m, h) => (h.has_time_axis || has(m, /\b(over time|since|trend|by (year|quarter|month)|\b(19|20)\d{2}\b)\b/)) && has(m, /\b(share|%|percent|proportion|composition|breakdown|mix|split)\b/) },
  // leader-vs-laggard triad → grouped/paired bars.
  { id: 'grouped', fn: (m, h) => (h.n_series || 1) >= 2 && has(m, /\b(winners?|laggards?|high[-\s]?performers?|leaders?|top performers?|best[-\s]?in[-\s]?class).*(vs\.?|versus|compared|against|than)|(vs\.?|versus).*(others?|laggards?|rest|all)\b/) },
  // part-to-whole, single period → pie (auto-demoted to bar by the guard-rail).
  { id: 'component', fn: (m, h) => has(m, /\b(share|%|percent|of total|composition|portion|accounts for|makes up|breakdown|split of|proportion|part of (the )?whole)\b/) },
  // real time axis → column (few) | line (many/multi) | area (magnitude).
  { id: 'timeseries', fn: (m, h) => h.has_time_axis || has(m, /\b(change|grow|grew|rise|rose|declin|fell|drop|trend|over time|since|year[-\s]over[-\s]year|yoy|q[1-4]\b|from\s+(19|20)\d{2}|to\s+(19|20)\d{2}|monthly|quarterly|annual)\b/) },
  // ranking / one-metric compare → horizontal bar (Zelazny safe default).
  { id: 'item', fn: (m, h) => has(m, /\b(rank|larger|smaller|greater|less than|more than|top \d|bottom \d|leads?|trails?|highest|lowest|most|least|#1|biggest|largest|vs\.?|versus|compared)\b/) },
];

function detectIntent(m, h) {
  for (const r of RULES) { if (r.fn(m, h)) return r.id; }
  return 'item';
}

// ── 2/3. Resolve a detected category → a concrete IDEAL chart (data-shape + context). ──
function resolveIdeal(cat, m, h, ctx) {
  let ideal = cat; let reason = '';
  const many = (h.n_categories || 0) > (h.max_pie_slices || 6);

  if (cat === 'component') {
    // single-period part-to-whole: ideal is pie, but auto-mode demotes (guard-rail).
    if (h.has_time_axis) { ideal = 'stacked100'; }
    else { ideal = 'pie'; reason = many ? `>${h.max_pie_slices || 6} slices → McKinsey demotes pie to a ranked bar` : 'McKinsey demotes pie to a ranked bar (clearer comparison)'; }
  } else if (cat === 'stacked100') {
    // composition-over-time: relative (share/%) → 100%-stacked; absolute (volume/count) → stacked-area.
    if (has(m, /\b(volume|absolute|count|number of|units|total amount)\b/) && !has(m, /\b(share|%|percent|proportion)\b/)) { ideal = 'stacked-area'; }
    else { ideal = 'stacked100'; }
  } else if (cat === 'timeseries') {
    // GUARD #1: only a REAL date/period axis is a trend; an entity x-axis is an Item compare.
    if (!h.has_time_axis && /\b(by|across|per)\s+(salesperson|product|region|segment|company|industry|country|team|rep|store|channel)\b/.test(m)) {
      ideal = 'bar'; reason = 'entity x-axis (not a date axis) → Item comparison, not a trend';
    } else if (has(m, /\b(magnitude|volume|cumulative|area under|total over)\b/) && (h.n_series || 1) === 1) {
      ideal = 'area';
    } else if ((h.n_series || 1) >= 2 || (h.n_periods || 0) > 7) { ideal = 'line'; }
    else { ideal = 'column'; }
  } else if (cat === 'item') {
    // context nudge: a long ranking is more legible as a lollipop (exec) — but bar is the safe default.
    ideal = (ctx.audience === 'exec' && (h.n_categories || 0) > 12) ? 'lollipop' : 'bar';
  }
  // marimekko/bubble/scatter/radar/box/histogram/slope/dumbbell/funnel/bullet/diverging/quadrant/waterfall: ideal == cat.
  return { ideal, reason };
}

// ── 5. Map ideal → a BUILT type (honest fallback). ──
function resolve(cat, m, h, ctx) {
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const { ideal, reason } = resolveIdeal(cat, m, h, c);
  let chartType = ideal;
  let why = reason;
  if (!T.isBuilt(chartType)) {
    const mapped = T.toBuilt(chartType);
    why = why || `${ideal} is a cataloged (not-yet-built) type → rendered as the nearest built type (${mapped})`;
    chartType = mapped;
  }
  return { chartType, ideal, reason: why, family: T.familyOf(ideal) || T.familyOf(chartType) || 'comparison' };
}

// ── 4. McKinsey guard-rails + anti-pattern warnings (may remap chartType). ──
function guardRails(state, m, h) {
  const warnings = [];
  let { chartType, ideal } = state;
  const stance = T.stanceOf(ideal);
  // pie/donut are DEMOTED in auto mode → render as a ranked bar (the discipline).
  if (stance === T.STANCE.DEMOTED && (chartType === 'pie' || chartType === 'donut' || ideal === 'pie' || ideal === 'donut')) {
    chartType = 'bar';
    warnings.push(`${ideal} demoted to a ranked bar — McKinsey avoids pie/donut (a bar compares parts more precisely; use --chart=${ideal} to force it)`);
  }
  // too many slices, even if forced.
  if ((ideal === 'pie' || ideal === 'donut') && (h.n_categories || 0) > (h.max_pie_slices || 6)) {
    warnings.push(`${h.n_categories} slices is too many for a pie (>${h.max_pie_slices || 6}) — a ranked bar is far more legible`);
  }
  // grouped bars with many series get unreadable.
  if (chartType === 'grouped' && (h.n_series || 0) > 5) warnings.push(`${h.n_series} series on grouped bars is hard to read — consider small-multiples or a line chart`);
  // radar with many axes gets unreadable.
  if (chartType === 'radar' && (h.n_categories || h.n_axes || 0) > 8) warnings.push(`radar with >8 axes is hard to read — consider a grouped bar or small-multiples`);
  // a "trend" on an entity x-axis was already remapped to bar in resolveIdeal; note it.
  return { chartType, warnings };
}

// ── 6. Alternatives (runner-up built types for the chosen ideal). ──
const ALTS = Object.freeze({
  bar: ['column', 'lollipop', 'dot'], column: ['bar', 'line'], line: ['area', 'column', 'slope'],
  area: ['line', 'stacked-area'], 'stacked-area': ['stacked100', 'line'],
  scatter: ['bubble', 'quadrant'], bubble: ['scatter', 'quadrant'], quadrant: ['scatter', 'bubble'],
  pie: ['bar', 'stacked100', 'donut'], donut: ['pie', 'bar'],
  stacked100: ['stacked', 'marimekko', 'stacked-area'], stacked: ['stacked100', 'bar'], marimekko: ['stacked100', 'stacked'],
  grouped: ['bar', 'dumbbell', 'slope'], dumbbell: ['grouped', 'slope', 'bar'], slope: ['line', 'dumbbell', 'bar'],
  waterfall: ['column', 'bar'], histogram: ['box', 'column'], box: ['histogram', 'column'],
  funnel: ['bar', 'column'], diverging: ['stacked100', 'bar'], bullet: ['bar', 'column'],
  radar: ['grouped', 'bar'], lollipop: ['bar', 'dot'], dot: ['bar', 'lollipop'], kpi: ['bullet', 'column'],
});
function alternativesFor(ideal, chartType) {
  const seed = ALTS[ideal] || ALTS[chartType] || ['bar', 'column'];
  return seed.filter((a) => a !== chartType && T.isBuilt(a)).slice(0, 3).map((type) => ({ type, why: (T.meta(type) && T.meta(type).note) || '' }));
}

/**
 * @param {string} message  the one-sentence message (the action-title).
 * @param {object} hints    data-shape signals (see DEFAULTS below).
 * @param {object} context  { audience: 'exec'|'analyst'|'general' } selection modifiers.
 * @returns {{ chartType, ideal, family, intent, reason, alternatives, warnings, confidence }}
 */
function selectChart(message, hints = {}, context = {}) {
  const m = String(message == null ? '' : message).toLowerCase();
  const h = {
    n_categories: 0, n_periods: 0, n_series: 1, n_measures: 0, n_axes: 0,
    has_negatives: false, has_time_axis: false, has_target: false, has_size: false,
    is_likert: false, max_pie_slices: 6,
    ...(hints && typeof hints === 'object' ? hints : {}),
  };
  const ctx = { audience: 'general', ...(context && typeof context === 'object' ? context : {}) };

  const intent = detectIntent(m, h);
  const r = resolve(intent, m, h, ctx);                       // { chartType, ideal, reason, family }
  const guarded = guardRails(r, m, h);                         // { chartType, warnings }
  const chartType = guarded.chartType;
  const warnings = guarded.warnings.slice();
  if (r.reason && (r.ideal === 'pie' || r.ideal === 'donut')) {
    // the demote reason already lives in warnings; keep `reason` as the headline rationale.
  }

  const fellBack = intent === 'item' && !RULES.some((rule) => rule.id === 'item' && rule.fn(m, h));
  const confidence = fellBack ? 'low' : (chartType === r.ideal ? 'high' : 'medium');
  const reason = r.reason || `message intent "${intent}" → ${chartType} (${T.familyOf(chartType)})`;

  return {
    chartType, ideal: r.ideal, family: r.family, intent, reason,
    alternatives: alternativesFor(r.ideal, chartType), warnings, confidence,
  };
}

module.exports = { selectChart, resolve, detectIntent, guardRails, alternativesFor, BUILT, DEFER_MAP, RULES };
