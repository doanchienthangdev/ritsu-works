// ============================================================================
// scripts/dataviz/lib/taxonomy.cjs — the /dataviz chart-type knowledge base
// ============================================================================
// Capability `dataviz` v0.2 (extend). PURE, deterministic, zero-dependency. The
// SOURCE OF TRUTH for: which chart types exist (the full Datylon taxonomy), which
// are BUILT (rendered natively) vs CATALOGED (named but mapped to the nearest built
// type + an honest reason), and the per-type metadata the intelligent selector
// (select.cjs) reasons over — family, message-intents, data-shape needs, McKinsey
// stance, anti-patterns, and the fallback.
//
// WHY CODE, NOT YAML: select.cjs is PURE (no file reads, no js-yaml). The taxonomy
// is consumed in that pure path, so it lives as a frozen data module require()'d at
// load time — byte-stable, unit-tested with toBe/toEqual, and it adds NO resolver
// `page` recipient (the INDEX is at its 15K-token cap). The human-facing catalog is
// rendered FROM this module (the umbrella SKILL.md + spec.md cite it).
//
// Grounded in: Gene Zelazny "Say It With Charts" (message→type); the Datylon chart
// taxonomy (datylon.com/blog/types-of-charts-graphs); the McKinsey data-viz
// discipline (the dataviz-design-brief, 3 real reports).
// ============================================================================

'use strict';

// The six functional families a message can fall into (+ kpi as a degenerate "one number").
const FAMILIES = Object.freeze([
  'comparison', 'correlation', 'part-to-whole', 'change-over-time',
  'distribution', 'flow-geospatial', 'kpi',
]);

// McKinsey stance toward a chart form (drives auto-mode demotion + warnings).
//   preferred  — a McKinsey-signature form, pick freely.
//   acceptable — fine when the data calls for it.
//   demoted    — renderable, but auto-mode prefers a clearer form (e.g. pie→bar).
//   avoid      — anti-McKinsey decoration; only on explicit --chart, with a warning.
const STANCE = Object.freeze({ PREFERRED: 'preferred', ACCEPTABLE: 'acceptable', DEMOTED: 'demoted', AVOID: 'avoid' });

// ── The taxonomy. BUILT entries first (insertion order == render-dispatch order),
//    grouped by family; CATALOGED-only entries (built:false + a built `fallback`) after.
//    `needs` is informational data-shape guidance the selector uses to disambiguate.
const CHARTS = Object.freeze({
  // ── COMPARISON (built) ──────────────────────────────────────────────────
  bar:        { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['ranking', 'comparison', 'item'], aka: ['horizontal bar'], note: 'Rank/compare values across categories. The Zelazny safe default.' },
  column:     { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['comparison', 'change-over-time'], aka: ['vertical bar'], note: 'Compare across a few ordered categories or short time periods (zero-baseline).' },
  grouped:    { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['comparison', 'leader-laggard'], needs: { series: 2 }, aka: ['clustered bar', 'paired bar'], note: 'Compare 2-3 series per category (leader-vs-laggard).' },
  lollipop:   { family: 'comparison', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['ranking', 'comparison'], note: 'Space-efficient bar alternative for many categories.' },
  dot:        { family: 'comparison', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['ranking', 'comparison'], aka: ['dot plot'], note: 'Compare values without forcing a zero baseline; zoom into a range.' },
  dumbbell:   { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['paired-delta', 'before-after', 'gap'], needs: { series: 2 }, aka: ['connected dot plot', 'barbell'], note: 'Emphasize the delta between two paired values per category (gap, before/after).' },
  slope:      { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['change-two-period', 'before-after', 'reordering'], needs: { periods: 2 }, aka: ['slopegraph'], note: 'Two-period change with the slope as the message (rank shifts).' },
  radar:      { family: 'comparison', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['profile', 'multi-dimensional'], needs: { dims: 3 }, aka: ['spider', 'web', 'star'], note: 'Side-by-side multi-dimensional profile (approximate, not precise).' },
  quadrant:   { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['two-dimensional', 'positioning', 'segmentation'], needs: { measures: 2 }, aka: ['2x2 matrix', 'BCG matrix'], note: 'Position items on two dimensions (the consulting 2×2).' },
  bullet:     { family: 'comparison', built: true, mckinsey: STANCE.PREFERRED, intents: ['target', 'performance-vs-goal'], needs: { target: true }, aka: ['bullet graph'], note: 'Actual-vs-target performance in a compact bar (dashboard KPI).' },

  // ── CORRELATION (built) ─────────────────────────────────────────────────
  scatter:    { family: 'correlation', built: true, mckinsey: STANCE.PREFERRED, intents: ['correlation', 'relationship'], needs: { measures: 2 }, aka: ['scattergram'], note: 'Relationship between two measures over shared subjects.' },
  bubble:     { family: 'correlation', built: true, mckinsey: STANCE.PREFERRED, intents: ['correlation', 'three-measures'], needs: { measures: 3 }, aka: ['bubble plot'], note: 'Three measures: x, y, and size — clusters + outliers.' },
  heatmap:    { family: 'correlation', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['matrix', 'density', 'sensitivity'], needs: { matrix: true }, aka: ['heat table', 'matrix'], note: 'Color a row×column matrix by value (sensitivity tables, density).' },

  // ── PART-TO-WHOLE / HIERARCHICAL (built) ─────────────────────────────────
  stacked:    { family: 'part-to-whole', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['composition', 'part-to-whole'], needs: { series: 2 }, note: 'Total per category + how sub-parts contribute (absolute).' },
  stacked100: { family: 'part-to-whole', built: true, mckinsey: STANCE.PREFERRED, intents: ['composition', 'composition-over-time', 'share'], needs: { series: 2 }, aka: ['100% stacked'], note: 'Component share across categories/time (never multiple pies).' },
  pie:        { family: 'part-to-whole', built: true, mckinsey: STANCE.DEMOTED, intents: ['part-to-whole', 'share'], needs: { maxSlices: 6 }, note: 'Parts of a whole; McKinsey demotes >~5 slices to a ranked bar.' },
  donut:      { family: 'part-to-whole', built: true, mckinsey: STANCE.DEMOTED, intents: ['part-to-whole', 'share'], needs: { maxSlices: 6 }, aka: ['ring chart'], note: 'Pie variant with a center hole (often a center KPI).' },
  marimekko:  { family: 'part-to-whole', built: true, mckinsey: STANCE.PREFERRED, intents: ['two-dimensional-share', 'size-and-share'], needs: { series: 2 }, aka: ['mekko', 'mosaic'], note: 'Variable-width stacked columns: width = segment size, height = share. A McKinsey signature.' },
  diverging:  { family: 'part-to-whole', built: true, mckinsey: STANCE.PREFERRED, intents: ['sentiment', 'likert', 'pos-neg'], needs: { likert: true }, aka: ['diverging stacked bar'], note: 'Sentiment/Likert split around a center (agree/disagree).' },
  funnel:     { family: 'part-to-whole', built: true, mckinsey: STANCE.PREFERRED, intents: ['funnel', 'stage-conversion', 'drop-off'], aka: ['pyramid', 'conversion funnel'], note: 'Progressive reduction through ordered stages (signup→activation→paid).' },

  // ── CHANGE OVER TIME (built) ─────────────────────────────────────────────
  line:        { family: 'change-over-time', built: true, mckinsey: STANCE.PREFERRED, intents: ['change-over-time', 'trend'], needs: { time: true }, note: 'Trend across many periods or multiple series.' },
  area:        { family: 'change-over-time', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['change-over-time', 'magnitude'], needs: { time: true }, note: 'Magnitude over time (single series, filled under the line).' },
  'stacked-area': { family: 'change-over-time', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['composition-over-time'], needs: { time: true, series: 2 }, aka: ['stacked area'], note: 'Composition changing over time (absolute stacked).' },

  // ── DISTRIBUTION (built) ─────────────────────────────────────────────────
  histogram:  { family: 'distribution', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['distribution', 'frequency'], aka: ['frequency chart'], note: 'Frequency across binned ranges of a continuous variable.' },
  box:        { family: 'distribution', built: true, mckinsey: STANCE.ACCEPTABLE, intents: ['distribution', 'spread', 'quartiles'], aka: ['box plot', 'box-and-whisker'], note: 'Quartiles, median, and outliers — distribution summary across groups.' },

  // ── KPI (built) ──────────────────────────────────────────────────────────
  waterfall:  { family: 'change-over-time', built: true, mckinsey: STANCE.PREFERRED, intents: ['bridge', 'build-up', 'contribution-to-change'], needs: { negatives: true }, aka: ['bridge', 'cascade'], note: 'How you got from A to B (positive/negative contributions).' },
  kpi:        { family: 'kpi', built: true, mckinsey: STANCE.PREFERRED, intents: ['single-number', 'callout'], note: 'Big-number callout(s) — one metric that matters.' },

  // ── CATALOGED ONLY (named in the taxonomy; mapped to the nearest built type) ──
  // comparison
  'small-multiples':      { family: 'comparison', built: true, fallback: 'bar', mckinsey: STANCE.PREFERRED, aka: ['trellis', 'panel'], note: 'Grid of simple charts, one per slice. (v-next renderer.)' },
  range:                  { family: 'comparison', built: true, fallback: 'dumbbell', mckinsey: STANCE.ACCEPTABLE, note: 'Range between two values per category.' },
  pictogram:              { family: 'comparison', built: false, fallback: 'bar', mckinsey: STANCE.AVOID, note: 'Icon-as-value; good for lay audiences, not data-savvy ones.' },
  'icon-chart':           { family: 'comparison', built: false, fallback: 'bar', mckinsey: STANCE.AVOID, note: 'Proportional-area icons.' },
  'radial-bar':           { family: 'comparison', built: false, fallback: 'bar', mckinsey: STANCE.AVOID, aka: ['circular bar'], note: 'Bars wrapped on a circle — attention over readability.' },
  nightingale:            { family: 'comparison', built: false, fallback: 'column', mckinsey: STANCE.AVOID, aka: ['rose', 'coxcomb', 'polar area'], note: 'Polar-area pie variant.' },
  'parallel-coordinates': { family: 'comparison', built: false, fallback: 'line', mckinsey: STANCE.AVOID, aka: ['parallel plot'], note: 'Multi-dimensional categories on parallel axes.' },
  'matrix-chart':         { family: 'comparison', built: true, fallback: 'heatmap', mckinsey: STANCE.ACCEPTABLE, note: 'Presence/strength between two categorical sets.' },
  'word-cloud':           { family: 'comparison', built: false, fallback: 'bar', mckinsey: STANCE.AVOID, aka: ['tag cloud'], note: 'Word frequency; imprecise.' },
  'table-chart':          { family: 'comparison', built: true, fallback: 'heatmap', mckinsey: STANCE.ACCEPTABLE, note: 'Conditionally-formatted table.' },
  // correlation
  'connected-scatter':    { family: 'correlation', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Scatter with points linked in time order.' },
  hexbin:                 { family: 'correlation', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, aka: ['hexagonal binning'], note: 'Density bins for huge scatters.' },
  contour:                { family: 'correlation', built: false, fallback: 'heatmap', mckinsey: STANCE.ACCEPTABLE, note: 'Continuous-surface iso-lines.' },
  // part-to-whole / hierarchical
  waffle:                 { family: 'part-to-whole', built: true, fallback: 'stacked100', mckinsey: STANCE.ACCEPTABLE, note: 'Grid of squares as a part-to-whole.' },
  treemap:                { family: 'part-to-whole', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Nested rectangles sized by value. (v-next renderer.)' },
  'population-pyramid':   { family: 'part-to-whole', built: true, fallback: 'diverging', mckinsey: STANCE.ACCEPTABLE, aka: ['age-sex pyramid'], note: 'Back-to-back bars by age/gender.' },
  'icon-array':           { family: 'part-to-whole', built: false, fallback: 'stacked100', mckinsey: STANCE.AVOID, aka: ['pictograph'], note: 'Each icon = one unit.' },
  sunburst:               { family: 'part-to-whole', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Radial nested hierarchy.' },
  dendrogram:             { family: 'part-to-whole', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Hierarchical clustering tree.' },
  venn:                   { family: 'part-to-whole', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Set intersections.' },
  euler:                  { family: 'part-to-whole', built: false, fallback: 'venn', mckinsey: STANCE.ACCEPTABLE, note: 'Actual-overlap sets.' },
  gauge:                  { family: 'part-to-whole', built: false, fallback: 'bullet', mckinsey: STANCE.AVOID, aka: ['circular gauge'], note: 'Single metric on a dial; bullet is clearer.' },
  'semicircle-donut':     { family: 'part-to-whole', built: true, fallback: 'donut', mckinsey: STANCE.ACCEPTABLE, note: 'Half-circle donut.' },
  // change over time
  bump:                   { family: 'change-over-time', built: true, fallback: 'line', mckinsey: STANCE.ACCEPTABLE, note: 'Ranking changes over periods.' },
  stream:                 { family: 'change-over-time', built: false, fallback: 'stacked-area', mckinsey: STANCE.AVOID, aka: ['streamgraph'], note: 'Flowing stacked area.' },
  spline:                 { family: 'change-over-time', built: true, fallback: 'line', mckinsey: STANCE.ACCEPTABLE, note: 'Smoothed line.' },
  'step-line':            { family: 'change-over-time', built: true, fallback: 'line', mckinsey: STANCE.ACCEPTABLE, note: 'Right-angle steps for discrete intervals.' },
  gantt:                  { family: 'change-over-time', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Project timeline bars. (v-next renderer.)' },
  candlestick:            { family: 'change-over-time', built: true, fallback: 'column', mckinsey: STANCE.ACCEPTABLE, note: 'Financial OHLC per period.' },
  ohlc:                   { family: 'change-over-time', built: true, fallback: 'column', mckinsey: STANCE.ACCEPTABLE, note: 'Open/high/low/close bars.' },
  barcode:                { family: 'change-over-time', built: true, fallback: 'column', mckinsey: STANCE.ACCEPTABLE, note: 'Vertical ticks for temporal anomalies.' },
  // distribution
  density:                { family: 'distribution', built: true, fallback: 'area', mckinsey: STANCE.ACCEPTABLE, note: 'Probability density curve.' },
  ridgeline:              { family: 'distribution', built: true, fallback: 'area', mckinsey: STANCE.ACCEPTABLE, note: 'Stacked density curves.' },
  violin:                 { family: 'distribution', built: true, fallback: 'box', mckinsey: STANCE.ACCEPTABLE, note: 'Mirrored density (box-plus-shape).' },
  strip:                  { family: 'distribution', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Individual values on one axis.' },
  jitter:                 { family: 'distribution', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Jittered categorical scatter.' },
  beeswarm:               { family: 'distribution', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Non-overlapping value swarm.' },
  horizon:                { family: 'distribution', built: true, fallback: 'area', mckinsey: STANCE.ACCEPTABLE, note: 'Compact banded temporal deviations.' },
  'radial-histogram':     { family: 'distribution', built: false, fallback: 'column', mckinsey: STANCE.AVOID, note: 'Polar histogram.' },
  // flow / geospatial
  sankey:                 { family: 'flow-geospatial', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Flow quantities between nodes. (Needs graph layout — v-next.)' },
  chord:                  { family: 'flow-geospatial', built: true, fallback: 'heatmap', mckinsey: STANCE.ACCEPTABLE, note: 'Circular entity-to-entity links.' },
  arc:                    { family: 'flow-geospatial', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Linear nodes with arc links.' },
  network:                { family: 'flow-geospatial', built: true, fallback: 'scatter', mckinsey: STANCE.ACCEPTABLE, note: 'Node-link graph.' },
  flowchart:              { family: 'flow-geospatial', built: true, fallback: 'bar', mckinsey: STANCE.ACCEPTABLE, note: 'Process/decision diagram.' },
  choropleth:             { family: 'flow-geospatial', built: false, fallback: 'tile-map', mckinsey: STANCE.ACCEPTABLE, note: 'Regions colored by value. (Needs map topology — out of scope.)' },
  'tile-map':             { family: 'flow-geospatial', built: true, fallback: 'heatmap', mckinsey: STANCE.ACCEPTABLE, note: 'Equal-size grid map.' },
  'geo-heatmap':          { family: 'flow-geospatial', built: false, fallback: 'tile-map', mckinsey: STANCE.ACCEPTABLE, note: 'Spatial density map.' },
});

// Built chart-type ids in insertion order (== render-dispatch order). Deterministic.
const BUILT = Object.freeze(Object.keys(CHARTS).filter((id) => CHARTS[id].built));

// Cataloged (named-but-not-built) ids.
const CATALOGED = Object.freeze(Object.keys(CHARTS).filter((id) => !CHARTS[id].built));

// Deferred-ideal → nearest built type (back-compat shape for select.cjs DEFER_MAP).
const DEFER_MAP = Object.freeze(
  CATALOGED.reduce((acc, id) => { acc[id] = CHARTS[id].fallback || 'bar'; return acc; }, {}),
);

function meta(id) { return CHARTS[id] || null; }
function isBuilt(id) { return !!(CHARTS[id] && CHARTS[id].built); }
/** Resolve any chart id to a BUILT type: itself if built, else its fallback (default bar). */
function toBuilt(id) {
  if (isBuilt(id)) return id;
  const f = CHARTS[id] && CHARTS[id].fallback;
  return f && isBuilt(f) ? f : 'bar';
}
function familyOf(id) { return CHARTS[id] ? CHARTS[id].family : null; }
function stanceOf(id) { return CHARTS[id] ? CHARTS[id].mckinsey : null; }
/** All chart ids serving a given intent label, built-first. */
function byIntent(intent) {
  const ids = Object.keys(CHARTS).filter((id) => Array.isArray(CHARTS[id].intents) && CHARTS[id].intents.includes(intent));
  return ids.sort((a, b) => (CHARTS[b].built ? 1 : 0) - (CHARTS[a].built ? 1 : 0));
}
/** Human-facing catalog rows (for the skill/spec + a future `/dataviz catalog`). */
function catalog() {
  return Object.keys(CHARTS).map((id) => ({
    id, family: CHARTS[id].family, built: !!CHARTS[id].built,
    fallback: CHARTS[id].built ? null : (CHARTS[id].fallback || 'bar'),
    mckinsey: CHARTS[id].mckinsey, note: CHARTS[id].note || '',
  }));
}

module.exports = {
  FAMILIES, STANCE, CHARTS, BUILT, CATALOGED, DEFER_MAP,
  meta, isBuilt, toBuilt, familyOf, stanceOf, byIntent, catalog,
};
