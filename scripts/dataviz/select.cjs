// ============================================================================
// scripts/dataviz/select.cjs — the Zelazny message→chart-type selector
// ============================================================================
// Capability `dataviz` v0.1. PURE, deterministic. selectChart(message, hints) ->
// { chartType, ideal, reason }. The governing principle (Gene Zelazny, "Say It
// With Charts"; seeded from wiki/cracked-it/concepts/quantitative-chart-typology.md):
// CHOOSE THE CHART FROM THE MESSAGE, NOT THE DATA. The message's trigger words pick
// ONE comparison type; the type maps to a chart form; data hints are tie-breakers only.
//
// Top-down FIRST-MATCH (order resolves overlaps). Two HARD guard-rails:
//   #1 entity x-axis ⇒ Item (never time-series) — only a real date/period axis is time.
//   #2 >~max_pie_slices ⇒ demote component(pie) → Item(bar).
// `vs.`/`%` are overloaded → disambiguated by operand TYPE, not the token.
//
// v0.1 BUILT set: bar column line stacked stacked100 grouped scatter waterfall kpi.
// Deferred ideals map to the nearest built type + an honest `reason` (@cto must-fix #9).
// ============================================================================

'use strict';

const BUILT = Object.freeze(['bar', 'column', 'line', 'stacked', 'stacked100', 'grouped', 'scatter', 'waterfall', 'kpi']);

// Deferred ideal → nearest built type (v0.2 will build these natively).
const DEFER_MAP = Object.freeze({
  marimekko: 'stacked100', bubble: 'scatter', histogram: 'column', area: 'line',
  pie: 'bar', dumbbell: 'grouped', diverging: 'stacked', statstack: 'kpi', heatmap: 'grouped', treemap: 'bar',
});

const has = (m, re) => re.test(m);

// Ordered rules → an IDEAL category. First match wins.
const RULES = [
  // 1. NEGATIVE-BUILDUP / bridge → waterfall. NB: a bare "from X to Y" is NOT a
  //    trigger (it catches time ranges like "from 2020 to 2025"); require explicit
  //    bridge vocabulary OR has_negatives. "how did we get from $X to $Y" still fires.
  { id: 'waterfall', fn: (m, h) => h.has_negatives || has(m, /\b(bridge|waterfall|build[-\s]?up|contribution to (the )?change|drivers? of (the )?change|inflows?|outflows?|reconcil|how (did|do) we (get|got)\b)\b/) },
  // 2. TWO SHARE DIMENSIONS (size × share) → marimekko (deferred).
  { id: 'marimekko', fn: (m, h) => has(m, /\b(size\s+(and|x|×|by)\s+share|market size.*share|by segment and by (player|competitor|region)|both.*and.*(axis|dimension)|two (share )?dimensions)\b/) },
  // 3. THREE MEASURES → bubble (deferred); EXACTLY two measures → scatter.
  { id: 'bubble', fn: (m, h) => h.n_measures >= 3 },
  // 4. CORRELATION (two measures on shared subjects) → scatter.
  { id: 'scatter', fn: (m, h) => h.n_measures === 2 || has(m, /\b(correlat|relationship between|relates to|varies with|the more.*the (more|less)|as\s+\S+\s+(rises|increases|grows).*(rises|falls|increases|decreases)|driven by)\b/) },
  // 5. FREQUENCY distribution → histogram (deferred → column).
  { id: 'histogram', fn: (m, h) => has(m, /\b(distribution|frequency|how many.*(fall|lie).*(within|between)|ranges|buckets?|bins?|histogram|brackets)\b/) },
  // 6. COMPONENT-OVER-TIME (share-word AND time) → 100%-stacked.
  { id: 'stacked100', fn: (m, h) => (h.has_time_axis || has(m, /\b(over time|since|trend|by (year|quarter|month)|\b(19|20)\d{2}\b)\b/)) && has(m, /\b(share|%|percent|proportion|composition|breakdown|mix|split)\b/) },
  // 7. LEADER-vs-LAGGARD triad → grouped/paired bars (a McKinsey signature).
  { id: 'grouped', fn: (m, h) => (h.n_series || 1) >= 2 && has(m, /\b(winners?|laggards?|high[-\s]?performers?|leaders?|top performers?|best[-\s]?in[-\s]?class).*(vs\.?|versus|compared|against|than)|(vs\.?|versus).*(others?|laggards?|rest|all)\b/) },
  // 8. COMPONENT (part-to-whole, single period) → pie (deferred → bar).
  { id: 'component', fn: (m, h) => has(m, /\b(share|%|percent|of total|composition|portion|accounts for|makes up|breakdown|split of|proportion)\b/) },
  // 9. TIME-SERIES (real time axis) → column (few) | line (many/multi-series).
  { id: 'timeseries', fn: (m, h) => h.has_time_axis || has(m, /\b(change|grow|grew|rise|rose|declin|fell|drop|trend|over time|since|year[-\s]over[-\s]year|yoy|q[1-4]\b|from\s+(19|20)\d{2}|to\s+(19|20)\d{2}|monthly|quarterly|annual)\b/) },
  // 10. ITEM (ranking / one-metric compare) → horizontal bar sorted.
  { id: 'item', fn: (m, h) => has(m, /\b(rank|larger|smaller|greater|less than|more than|top \d|bottom \d|leads?|trails?|highest|lowest|most|least|#1|biggest|largest|vs\.?|versus|compared)\b/) },
];

/** Resolve an IDEAL category + hints → a concrete BUILT chartType (+ reason). */
function resolve(cat, m, h) {
  let ideal = cat;
  let reason = '';

  if (cat === 'bubble') { ideal = 'bubble'; }
  else if (cat === 'marimekko') { ideal = 'marimekko'; }
  else if (cat === 'histogram') { ideal = 'histogram'; }
  else if (cat === 'component') {
    // Guard-rail #2 + component-over-time: time → stacked100; many cats → bar; ≤slices → pie (demoted).
    if (h.has_time_axis) { ideal = 'stacked100'; }
    else if (h.n_categories > (h.max_pie_slices || 6)) { ideal = 'pie'; reason = `>${h.max_pie_slices || 6} slices → McKinsey demotes pie to a ranked bar`; }
    else { ideal = 'pie'; reason = 'McKinsey demotes pie to a ranked bar (clearer comparison)'; }
  } else if (cat === 'timeseries') {
    // Guard-rail #1: only a REAL time axis is time-series; else it's an Item compare.
    if (!h.has_time_axis && /\b(by|across|per)\s+(salesperson|product|region|segment|company|industry|country|team)\b/.test(m)) {
      ideal = 'bar'; reason = 'entity x-axis (not a date axis) → Item comparison, not a trend';
    } else if ((h.n_series || 1) >= 2 || (h.n_periods || 0) > 7) { ideal = 'line'; }
    else { ideal = 'column'; }
  } else if (cat === 'item') { ideal = 'bar'; }

  // Map a deferred ideal to the nearest built type.
  let chartType = ideal;
  if (!BUILT.includes(chartType)) {
    const mapped = DEFER_MAP[chartType] || 'bar';
    reason = reason || `${ideal} is a v0.2 chart → rendered as the nearest built type (${mapped})`;
    chartType = mapped;
  }
  return { chartType, ideal, reason };
}

/**
 * @param {string} message  the one-sentence message (the action-title).
 * @param {object} hints    { n_categories, n_periods, n_series, n_measures, has_negatives, has_time_axis, max_pie_slices }.
 * @returns {{ chartType:string, ideal:string, reason:string }}
 */
function selectChart(message, hints = {}) {
  const m = String(message == null ? '' : message).toLowerCase();
  const h = {
    n_categories: 0, n_periods: 0, n_series: 1, n_measures: 0,
    has_negatives: false, has_time_axis: false, max_pie_slices: 6,
    ...(hints && typeof hints === 'object' ? hints : {}),
  };
  let cat = null;
  for (const r of RULES) { if (r.fn(m, h)) { cat = r.id; break; } }
  if (!cat) cat = 'item'; // Zelazny safe default → bar.
  return resolve(cat, m, h);
}

module.exports = { selectChart, resolve, BUILT, DEFER_MAP, RULES };
