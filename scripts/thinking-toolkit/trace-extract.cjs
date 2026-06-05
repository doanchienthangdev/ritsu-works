#!/usr/bin/env node
'use strict';
/**
 * scripts/thinking-toolkit/trace-extract.cjs
 *
 * The deterministic core of capability `thinking-toolkit` v3.3 (Reasoning Trace).
 * Reads a COMPLETED /think mckinsey run folder (the 9 persisted artifacts) and
 * reconstructs a STRUCTURED, ordered TRACE of the reasoning journey — the
 * timeline of team-session checkpoints, the data pulls + their tools + certainty,
 * the workplan routing, and the HITL receipts — into a single `trace.json`.
 *
 * This is the machine-readable backbone that `thinking-toolkit/reasoning-trace`
 * (the skill) narrates and `scripts/thinking-toolkit/trace-build.py` (the local
 * renderer) turns into a 4S flow/tree diagram + timeline + PDF "thinking journal".
 *
 * It is PURE PARSING — no judgment, no LLM. It reuses the engine's own markdown
 * table parser (mckinsey-run.cjs) so the trace stays coherent with the run-folder
 * format. `extractTrace(runDir)` is exported pure for tests.
 *
 * Usage:
 *   node trace-extract.cjs <slug>            # → .archives/mckinsey/<slug>/trace.json
 *   node trace-extract.cjs <path/to/run>     # explicit run-folder path
 */

const fs = require('fs');
const path = require('path');
const { parseFirstTable, colIndex, isDataRow, RUN_BASE } = require('./mckinsey-run.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEGREE_RE = /\d+/;

function readTable(dir, name) {
  const p = path.join(dir, name);
  if (!fs.existsSync(p)) return null;
  return parseFirstTable(fs.readFileSync(p, 'utf8'));
}

/** Map a parsed table to row-objects keyed by `cols` ({ key: [header-aliases] }). */
function rows(t, cols) {
  if (!t) return [];
  const idx = {};
  for (const [k, aliases] of Object.entries(cols)) idx[k] = colIndex(t.headers, aliases);
  return t.rows.filter(isDataRow).map((r) => {
    const o = {};
    for (const [k, i] of Object.entries(idx)) o[k] = i >= 0 ? (r[i] || '').trim() : '';
    return o;
  });
}

/** Classify a provenance / source-of-data string into a data-tool bucket. */
function toolOf(s) {
  const x = (s || '').toLowerCase();
  if (/ask[\s-]?user/.test(x)) return 'ask-user';
  if (/supabase-analytics|\blive\./.test(x)) return 'supabase-analytics';
  if (/supabase-ops|\bops\.|metrics\./.test(x)) return 'supabase-ops';
  if (/websearch|web search|deep-research|deepask|https?:/.test(x)) return 'web/deep-research';
  if (/wiki/.test(x)) return 'wiki_ask';
  if (/gbrain|\bbrain\b/.test(x)) return 'gbrain';
  if (/\/think|driver-tree|\bmece\b|model/.test(x)) return '/think';
  if (/assumption|benchmark/.test(x)) return 'assumption/benchmark';
  if (/\.mcp\.json|manifest|\brepo\b|index\.md|roles\.md/.test(x)) return 'repo';
  return 'other';
}

/** Pure: parse a run folder into the structured trace object. */
function extractTrace(runDir) {
  const checkpoints = rows(readTable(runDir, 'checkpoint-log.md'), {
    id: ['id'], stage: ['stage'], kind: ['kind'],
    presented: ['presented'], consensus: ['team input', 'consensus'], decision: ['decision'],
  });

  const analyses = rows(readTable(runDir, 'analysis-log.md'), {
    hypothesis: ['hypothesis'], data: ['data pulled', 'data'],
    provenance: ['provenance', 'tool', 'source'],
    degree: ['degree', 'certainty'], verdict: ['validation verdict', 'verdict'],
  }).map((a) => ({
    ...a,
    degree_num: parseInt((a.degree || '').match(DEGREE_RE)?.[0] || '', 10) || null,
    tool: toolOf(a.provenance),
  }));

  const workplan = rows(readTable(runDir, 'workplan.md'), {
    issue: ['issue'], hypothesis: ['hypothesis'], analysis: ['analysis'],
    source: ['source-of-data', 'source'], owner: ['owner'],
    end_product: ['end-product', 'end product'], status: ['status'],
  }).map((w) => ({ ...w, tool: toolOf(w.source) }));

  const hitl = rows(readTable(runDir, 'hitl-log.md'), {
    id: ['id'], stage: ['stage'], question: ['question asked', 'question'],
    answer: ['founder answer', 'answer'], feeds: ['feeds datum', 'feeds'],
  });

  // tool-usage tally across the data pulls
  const tools_used = {};
  for (const a of analyses) tools_used[a.tool] = (tools_used[a.tool] || 0) + 1;

  // 4S bands for the flow/tree diagram (checkpoints grouped by their stage; the
  // analysis pulls live in Solve).
  const bands = { state: [], structure: [], solve: [], sell: [] };
  for (const c of checkpoints) {
    const b = (c.stage || '').toLowerCase();
    if (bands[b]) bands[b].push({ kind: 'checkpoint', id: c.id, label: c.kind, decision: c.decision });
  }
  bands.solve.push(
    ...analyses.map((a, i) => ({ kind: 'analysis', id: `A${i + 1}`, label: a.hypothesis, degree: a.degree_num, tool: a.tool }))
  );

  const porpoises = checkpoints.filter((c) => /porpoise/i.test(c.kind)).length;
  const external_data = analyses.filter((a) => a.tool === 'web/deep-research' || a.tool === 'assumption/benchmark');

  return {
    slug: path.basename(runDir),
    checkpoints, analyses, workplan, hitl, bands, tools_used, external_data,
    stats: {
      checkpoints: checkpoints.length,
      analyses: analyses.length,
      hitl_receipts: hitl.length,
      workplan_rows: workplan.length,
      porpoises,
      external_numbers: external_data.length,
    },
  };
}

/** Resolve a CLI arg (slug OR path) to an existing run-folder absolute path. */
function resolveRunDir(arg) {
  if (!arg) return null;
  if (arg.includes('/') || arg.includes(path.sep)) {
    const abs = path.isAbsolute(arg) ? arg : path.join(REPO_ROOT, arg);
    return fs.existsSync(abs) ? abs : null;
  }
  const abs = path.join(REPO_ROOT, RUN_BASE, arg);
  return fs.existsSync(abs) ? abs : null;
}

function main() {
  const arg = process.argv[2];
  const runDir = resolveRunDir(arg);
  if (!runDir) { console.error(`[FAIL] run folder not found for: ${arg || '(missing arg)'}`); process.exit(1); }
  const trace = extractTrace(runDir);
  const out = path.join(runDir, 'trace.json');
  fs.writeFileSync(out, JSON.stringify(trace, null, 2));
  const s = trace.stats;
  console.log(`[OK] trace → ${out} (${s.checkpoints} checkpoints · ${s.analyses} analyses · ${s.hitl_receipts} receipts · ${s.porpoises} porpoise · ${s.external_numbers} external numbers)`);
}

if (require.main === module) main();

module.exports = { extractTrace, toolOf, resolveRunDir, REPO_ROOT };
