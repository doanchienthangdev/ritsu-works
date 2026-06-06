#!/usr/bin/env node
'use strict';
/**
 * scripts/dataviz/flow-render.cjs — the LLM-authored flowchart/workflow renderer
 * ============================================================================
 * Capability `dataviz` v0.5 (extend). The Flow/workflow family's PRO renderer.
 *
 * WHY this exists: the pure-Node svg-native renderer draws bar/line/etc. beautifully,
 * but auto-LAYING-OUT a flowchart/workflow/decision-tree is the hard problem code
 * can't do well by hand. So this renderer splits the job the right way:
 *   - LAYOUT  → Graphviz `dot` (the gold-standard DAG/flowchart layout engine, native).
 *   - DRAWING → Claude Code authors the GRAPH (nodes/edges/structure/sub-variety) —
 *               the thing an LLM is genuinely great at — guided by the
 *               flow-graphviz skill, in brand-themed DOT.
 * "Claude Code draws it + exports the file," robustly. svg-native's `flowchart`
 * stays as the deterministic headless/CRON fallback (dataviz's two-tier philosophy).
 *
 * TWO input modes (both → themed DOT → `dot -T{svg,png,pdf}` → file + run.json):
 *   --dot=<file|inline|->   LLM-authored DOT (the PRO path). A brand theme preamble
 *                           is injected as graph/node/edge DEFAULTS (per-element attrs
 *                           the author sets still win).
 *   --spec=<file|inline>    structured flow JSON → deterministically built themed DOT
 *                           (the headless/test path — no LLM, byte-stable DOT).
 *
 * NO secret / NO API key (the render is local `dot`; authoring is in-session/subscription).
 * Graceful when `dot` is absent: writes the .dot + a clear install hint (never throws raw).
 *
 *   node scripts/dataviz/flow-render.cjs --spec=flow.json --out=dir/ --format=svg
 *   node scripts/dataviz/flow-render.cjs --dot=graph.dot --out=dir/ --format=png --style=ritsu
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const { parseDatavizArgs, normalizeTheme } = require('./lib/params.cjs');
const { buildTheme } = require('./lib/theme.cjs');
let resolveStyle;
try { ({ resolveStyle } = require('../design-system/resolve-style.cjs')); } catch (_) { resolveStyle = null; }

const FLOW_FORMATS = ['svg', 'png', 'pdf'];

function slugify(s) {
  return String(s || 'flow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'flow';
}
function firstFont(stack, fallback) {
  const f = String(stack || '').split(',')[0].replace(/["']/g, '').trim();
  return f || fallback;
}
function esc(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n'); }

/** Mix a hex color toward white by `t` (0..1). Used to make swimlane lanes PALE so the
 *  nodes inside pop, instead of a saturated block that muddles everything. */
function tint(hex, t) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
  if (!m) return '#EEF2F6';
  const n = parseInt(m[1], 16);
  const k = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.88));
  const mix = (c) => Math.round(c + (255 - c) * k);
  return '#' + [mix((n >> 16) & 255), mix((n >> 8) & 255), mix(n & 255)].map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Harmonious, distinguishable accent ramp for swimlanes when a cluster gives no `color`
// (calm blue→teal sequence + one warm amber close — reads as a journey, stays on-tone).
const CLUSTER_RAMP = ['#1F5C8B', '#2E86A8', '#3FA0A8', '#5B8AC0', '#B5781F', '#6F6BA8', '#4E9A6B'];

/** Map the dataviz theme (+ semantic flow colors) → a Graphviz palette. */
function flowPalette(theme) {
  return {
    body: firstFont(theme.bodyFont, 'Helvetica'),
    head: firstFont(theme.headingFont, 'Georgia'),
    ink: theme.ink || '#222222',
    inkMuted: theme.inkMuted || '#6B7280',
    bg: theme.bg || '#FFFFFF',
    highlight: theme.highlight || '#005EB8',
    neutral1: theme.neutral1 || '#A2AAAD',
    neutral2: theme.neutral2 || '#C0C5C9',
    accent: theme.accent || '#418FDE',
    // semantic flow colors (not in the stat-chart theme; brand-consistent with the McKinsey/Ritsu reports)
    amber: '#E8A33D', amberFill: '#FCEBD2', amberLine: '#B5781F',
    green: '#1F7A4D', greenFill: '#E4F3E9', greenInk: '#0B3D26',
    red: '#C0392B', redFill: '#FBEAE7', redInk: '#7A1F14',
    edge: theme.styled ? (theme.accent || '#418FDE') : '#5E6B75',
    stepBorder: theme.styled ? (theme.neutral1 || '#A2AAAD') : '#9AA6B2',
  };
}

/** Graph/node/edge DEFAULT preamble — injected so unthemed authored DOT still lands on-brand. */
function themePreamble(p, rankdir) {
  return [
    `  graph [rankdir=${rankdir}, bgcolor="${p.bg}", fontname="${p.head}", fontsize=15, fontcolor="${p.ink}", labelloc=t, nodesep=0.45, ranksep=0.55, pad=0.35, splines=true];`,
    `  node  [shape=box, style="rounded,filled", fillcolor="white", color="${p.stepBorder}", penwidth=1.4, fontname="${p.body}", fontsize=11, fontcolor="${p.ink}", margin="0.20,0.11"];`,
    `  edge  [color="${p.edge}", penwidth=1.3, arrowsize=0.8, fontname="${p.body}", fontsize=9.5, fontcolor="${p.inkMuted}"];`,
  ].join('\n');
}

/** role → node attribute object (the McKinsey flow vocabulary). */
function roleAttrs(role, p) {
  switch (String(role || 'step')) {
    case 'start': case 'end': case 'terminal':
      return { shape: 'box', style: 'rounded,filled', fillcolor: p.ink, fontcolor: '#FFFFFF', color: p.ink, penwidth: 1.4 };
    case 'moment': case 'highlight': case 'key':
      return { shape: 'box', style: 'rounded,filled', fillcolor: p.highlight, fontcolor: '#FFFFFF', color: p.highlight, penwidth: 1.6 };
    case 'decision': case 'gate':
      return { shape: 'diamond', style: 'filled', fillcolor: p.amberFill, color: p.amberLine, fontcolor: p.ink, penwidth: 1.6 };
    case 'success': case 'win': case 'paid':
      return { shape: 'box', style: 'rounded,filled', fillcolor: p.greenFill, color: p.green, fontcolor: p.greenInk, penwidth: 1.5 };
    case 'risk': case 'drop': case 'fail': case 'reject':
      return { shape: 'box', style: 'rounded,filled', fillcolor: p.redFill, color: p.red, fontcolor: p.redInk, penwidth: 1.4 };
    case 'data': case 'store':
      return { shape: 'cylinder', style: 'filled', fillcolor: 'white', color: p.stepBorder, fontcolor: p.ink };
    case 'io': case 'input': case 'output':
      return { shape: 'parallelogram', style: 'filled', fillcolor: 'white', color: p.stepBorder, fontcolor: p.ink };
    default: // step
      return { shape: 'box', style: 'rounded,filled', fillcolor: 'white', color: p.stepBorder, fontcolor: p.ink };
  }
}
function edgeColor(c, p) {
  return ({ red: p.red, amber: p.amberLine, green: p.green, highlight: p.highlight, muted: p.inkMuted })[String(c || '')] || p.edge;
}
function attrStr(o) { return Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(', '); }

/** PURE: structured flow spec → brand-themed DOT. Byte-stable (no Date/random). */
function specToDot(spec, theme, opts) {
  const p = flowPalette(theme);
  const s = spec && typeof spec === 'object' ? spec : {};
  const rankdir = /^(LR|TB|RL|BT)$/.test(String(opts.rankdir || s.rankdir || '').toUpperCase())
    ? String(opts.rankdir || s.rankdir).toUpperCase() : 'TB';
  const nodes = Array.isArray(s.nodes) ? s.nodes : [];
  const edges = Array.isArray(s.edges) ? s.edges : [];
  const clusters = Array.isArray(s.clusters) ? s.clusters : [];
  const title = opts.title || s.title || '';

  const L = [];
  L.push('digraph flow {');
  L.push(themePreamble(p, rankdir));
  if (title) L.push(`  label="${esc(title)}";`);

  const nodeLine = (n) => {
    const a = { ...roleAttrs(n.role, p), label: n.label == null ? n.id : n.label };
    return `    "${esc(n.id)}" [${attrStr(a)}];`;
  };
  const clusterOf = {};
  for (const n of nodes) if (n && n.cluster != null) (clusterOf[n.cluster] = clusterOf[n.cluster] || []).push(n);
  const ungrouped = nodes.filter((n) => n && n.cluster == null);

  clusters.forEach((c, i) => {
    const cid = c && c.id != null ? c.id : `c${i}`;
    // accent = the lane's identity color (label + thin border); the FILL is a PALE tint of it
    // so the nodes inside stay legible and the lanes read as harmonious bands, not solid blocks.
    const accent = (c && c.color) || CLUSTER_RAMP[i % CLUSTER_RAMP.length];
    const fill = tint(accent, 0.88);
    L.push(`  subgraph "cluster_${esc(cid)}" {`);
    L.push(`    label="${esc((c && c.label) || cid)}"; labeljust=l; fontname="${p.body}"; fontsize=10.5; fontcolor="${accent}";`);
    L.push(`    style="filled,rounded"; color="${accent}"; fillcolor="${fill}"; penwidth=1.2; margin=12;`);
    (clusterOf[cid] || []).forEach((n) => L.push(nodeLine(n)));
    L.push('  }');
  });
  ungrouped.forEach((n) => L.push(nodeLine(n)));

  edges.forEach((e) => {
    if (!e || e.from == null || e.to == null) return;
    const a = {};
    if (e.label) a.label = e.label;
    if (e.style === 'dashed' || e.style === 'dotted') a.style = e.style;
    const ec = edgeColor(e.color, p);
    if (ec !== p.edge) { a.color = ec; a.fontcolor = ec; }
    const tail = Object.keys(a).length ? ` [${attrStr(a)}]` : '';
    L.push(`  "${esc(e.from)}" -> "${esc(e.to)}"${tail};`);
  });

  L.push('}');
  return L.join('\n');
}

/** Inject the theme preamble into authored DOT (after the first `{`) so unthemed DOT is on-brand. */
function injectTheme(dot, theme, opts) {
  const p = flowPalette(theme);
  const rankdir = /^(LR|TB|RL|BT)$/.test(String(opts.rankdir || '').toUpperCase()) ? String(opts.rankdir).toUpperCase() : 'TB';
  const i = dot.indexOf('{');
  if (i < 0) return dot;
  // don't double-inject if the author already set graph/node/edge defaults heavily — but injecting
  // DEFAULTS is safe (graphviz: later/per-element attrs override these), so always prepend.
  return dot.slice(0, i + 1) + '\n' + themePreamble(p, rankdir) + '\n' + dot.slice(i + 1);
}

function readInput(opts) {
  // --spec wins if present; else --dot; else stdin.
  if (opts.spec != null && opts.spec !== true) {
    const raw = String(opts.spec);
    const asPath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    const text = (/\.json$/i.test(raw) && fs.existsSync(asPath)) ? fs.readFileSync(asPath, 'utf-8') : raw;
    let spec; try { spec = JSON.parse(text); } catch (e) { return { error: `--spec is not valid JSON: ${e.message}` }; }
    return { mode: 'spec', spec };
  }
  if (opts.dot != null && opts.dot !== true) {
    const raw = String(opts.dot);
    if (raw === '-') { return { mode: 'dot', dot: fs.readFileSync(0, 'utf-8') }; }
    const asPath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    const dot = (/\.(dot|gv)$/i.test(raw) && fs.existsSync(asPath)) ? fs.readFileSync(asPath, 'utf-8') : raw;
    return { mode: 'dot', dot };
  }
  try { const stdin = fs.readFileSync(0, 'utf-8'); if (stdin.trim()) return { mode: 'dot', dot: stdin }; } catch (_) { /* no stdin */ }
  return { error: 'no input — pass --spec=<json> or --dot=<file|inline> (or pipe DOT on stdin)' };
}

function run(argv) {
  const { options } = parseDatavizArgs(argv);
  const warnings = [];
  const format = FLOW_FORMATS.includes(options.format) ? options.format : 'svg';

  // theme (reuse the dataviz --style → buildTheme pipeline).
  let resolved = null;
  if (typeof options.style === 'string' && options.style && options.style !== 'auto' && resolveStyle) {
    try { resolved = resolveStyle(options.style, { interactive: false }); }
    catch (e) { warnings.push(`--style "${options.style}" → classic McKinsey theme (${e && e.message ? e.message.split('\n')[0] : 'error'})`); resolved = { mode: 'plain' }; }
  }
  const { theme, warnings: tw } = buildTheme(resolved, normalizeTheme(options.theme));
  warnings.push(...tw);

  const input = readInput(options);
  if (input.error) return { ok: false, outcome: 'error', error: input.error, warnings };

  let dot;
  try { dot = input.mode === 'spec' ? specToDot(input.spec, theme, options) : injectTheme(input.dot, theme, options); }
  catch (e) { return { ok: false, outcome: 'error', error: `failed to build DOT: ${e && e.message}`, warnings }; }

  const title = options.title || options.message || (input.spec && input.spec.title) || 'flow';
  const runJson = {
    capability: 'dataviz', version: '0.5.0', renderer: 'flow-graphviz', engine: 'graphviz-dot',
    mode: input.mode, format, theme: theme.name, styled: theme.styled, styleName: theme.styleName,
    title, source: options.source || '', warnings, generated_at: new Date().toISOString(),
  };

  if (options['dry-run']) return { ok: true, outcome: 'dry_run', dot, runJson, warnings, plan: { renderer: 'flow-graphviz', mode: input.mode, format, theme: theme.name } };

  // render via `dot`.
  let rendered;
  try { rendered = execFileSync('dot', [`-T${format}`], { input: dot, maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) {
    const noDot = e && (e.code === 'ENOENT' || /ENOENT|not found/i.test(String(e.message)));
    // graceful: persist the .dot so the diagram is not lost; clear remediation.
    const date = new Date().toISOString().slice(0, 10);
    const dir = options.out && /\/$/.test(String(options.out)) ? path.resolve(process.cwd(), options.out) : path.join(REPO_ROOT, '.archives', 'dataviz', `${date}-${slugify(title)}`);
    try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, `${slugify(title)}.dot`), dot); } catch (_) {}
    return {
      ok: false, outcome: 'error', warnings,
      error: noDot
        ? `Graphviz \`dot\` not found — install it (\`brew install graphviz\` / \`apt-get install graphviz\`). The DOT was saved to ${dir} so nothing is lost; re-run after install, or render at https://dreampuf.github.io/GraphvizOnline.`
        : `dot failed: ${e && e.message ? e.message.split('\n')[0] : 'error'} (DOT saved to ${dir})`,
      dot, runJson,
    };
  }

  // write output + sidecars.
  const date = new Date().toISOString().slice(0, 10);
  const dir = options.out && /\/$/.test(String(options.out)) ? path.resolve(process.cwd(), options.out) : path.join(REPO_ROOT, '.archives', 'dataviz', `${date}-${slugify(title)}`);
  fs.mkdirSync(dir, { recursive: true });
  const outPath = options.out && !/\/$/.test(String(options.out)) ? path.resolve(process.cwd(), options.out) : path.join(dir, `${slugify(title)}.${format}`);
  fs.writeFileSync(outPath, rendered);
  fs.writeFileSync(outPath.replace(new RegExp(`\\.${format}$`), '.dot'), dot);   // keep the editable source next to the export
  const runPath = path.join(path.dirname(outPath), 'run.json'); fs.writeFileSync(runPath, JSON.stringify(runJson, null, 2));
  return { ok: true, outcome: 'written', files: [outPath, runPath], dot, runJson, warnings };
}

function main() {
  const r = run(process.argv.slice(2));
  if (r.outcome === 'dry_run') { console.log(JSON.stringify(r.plan, null, 2)); }
  else if (r.outcome === 'written') { console.log(`[OK] dataviz flow-graphviz (${r.runJson.mode}) → ${r.files.join(', ')}`); }
  else if (r.outcome === 'error') { console.error(`[FAIL] ${r.error}`); }
  if (r.warnings && r.warnings.length) r.warnings.forEach((w) => console.error(`[warn] ${w}`));
  if (r.outcome === 'error') process.exit(1);
}

if (require.main === module) main();

module.exports = { run, specToDot, injectTheme, flowPalette, roleAttrs, themePreamble, FLOW_FORMATS };
