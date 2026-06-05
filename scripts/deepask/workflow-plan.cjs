// ============================================================================
// scripts/deepask/workflow-plan.cjs — deepask × Workflow orchestration (v1.5)
// ============================================================================
// Capability `deepask` v1.5. For COMPLEX deepasks (or when the operator opts in
// explicitly via --workflow), the orchestrator runs the 5-stage loop as a
// deterministic multi-agent **Workflow** (the harness Workflow tool) instead of the
// in-session loop: decompose → PARALLEL fan-out of resolve+execute per sub-need →
// synthesize → completeness-critic → hand the IR back for the Format Engine
// (charts via /dataviz §2.7, images via /image §2.8). Parallel fan-out = far faster
// + more thorough on big reports/dashboards; the in-session loop stays the default
// for simple questions.
//
// This module is PURE (assessComplexity / resolveWorkflowMode / buildWorkflowScript)
// and unit-tested. The orchestrator skill (Stage 0.5) invokes the Workflow tool with
// the script buildWorkflowScript() returns. The Workflow tool requires explicit
// opt-in — the --workflow flag (and the founder's request to integrate it) IS that
// opt-in; deepask never silently spawns a fleet.
// ============================================================================

'use strict';

// Rich, multi-section deliverables that benefit from parallel section-building.
const RICH_FORMATS = Object.freeze(['dashboard', 'pdf', 'docx', 'pptx', 'html', 'interactive', 'report']);

/**
 * PURE: score a deepask's complexity from its shape. Returns
 * { complex, score, reasons[] }. complex ⇔ score >= threshold (default 3).
 * Signals: many sub-needs · exhaustive/deep depth · a rich multi-section format ·
 * many IA sources. None of these alone forces a fleet; together they do.
 */
function assessComplexity({ subNeedCount = 0, depth = 'standard', format = 'inline', sourcesCount = 0 } = {}, { threshold = 3 } = {}) {
  const reasons = [];
  let score = 0;
  const n = Number(subNeedCount) || 0;
  if (n >= 8) { score += 3; reasons.push(`${n} sub-needs (≥8) → wide parallel fan-out pays off`); }
  else if (n >= 5) { score += 1; reasons.push(`${n} sub-needs (≥5)`); }
  const d = String(depth || 'standard').toLowerCase();
  if (d === 'exhaustive') { score += 2; reasons.push('depth=exhaustive'); }
  else if (d === 'deep') { score += 1; reasons.push('depth=deep'); }
  const f = String(format || 'inline').toLowerCase();
  if (RICH_FORMATS.includes(f)) { score += 1; reasons.push(`format=${f} (rich multi-section deliverable)`); }
  const s = Number(sourcesCount) || 0;
  if (s >= 4) { score += 1; reasons.push(`${s} IA source types`); }
  return { complex: score >= threshold, score, reasons };
}

/**
 * PURE: resolve the effective execution mode. Explicit --workflow wins; `auto`
 * (default) defers to complexity. Returns { mode:'workflow'|'inline', why }.
 */
function resolveWorkflowMode({ workflow = 'auto', complexity } = {}) {
  const w = String(workflow == null ? 'auto' : workflow).toLowerCase();
  if (w === 'off' || w === 'false' || w === 'no') return { mode: 'inline', why: 'workflow disabled (--workflow=off)' };
  if (w === 'on' || w === 'true' || w === 'yes' || w === 'force') return { mode: 'workflow', why: 'workflow forced (--workflow=on)' };
  // auto
  const c = complexity || assessComplexity({});
  return c.complex
    ? { mode: 'workflow', why: `auto → complex (${c.reasons.join('; ')})` }
    : { mode: 'inline', why: 'auto → not complex; in-session loop' };
}

/** Escape a string for safe single-quote embedding in the generated JS. PURE. */
function jsStr(s) { return String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '); }

/**
 * PURE: build the deepask-orchestrated Workflow script (the harness Workflow DSL).
 * The orchestrator passes this to Workflow({script}). It encodes the 5-stage loop with
 * the execute stage fanned out in parallel. Deterministic string (no Date/random).
 * @param {object} o { question, format='inline', style?, artStyle?, depth='deep', subNeedHint=8 }
 */
function buildWorkflowScript(o = {}) {
  const question = jsStr(o.question);
  const format = jsStr(o.format || 'inline');
  const style = o.style ? jsStr(o.style) : '';
  const depth = jsStr(o.depth || 'deep');
  const cap = Math.max(2, Math.min(12, Number(o.subNeedHint) || 8));
  const styleNote = style ? ` Brand --style=${style} + any --art-style flow to dataviz charts (§2.7) and /image illustrations (§2.8).` : '';
  return `export const meta = {
  name: 'deepask-orchestrated',
  description: 'deepask ${format} for: ${question}',
  phases: [
    { title: 'Decompose' },
    { title: 'Resolve+Execute' },
    { title: 'Synthesize' },
    { title: 'Critic' },
  ],
}
// deepask v1.5 orchestrated run — the 5-stage loop with a PARALLEL execute fan-out.
// Firewall/breaker/HITL identical to the in-session loop (product only via metrics.*;
// resolver SESSION_HARD_CAP; Tier-B+ legs surfaced not auto-run).${styleNote}
phase('Decompose')
const decomp = await agent('deepask/decompose — split into MECE sub-needs (≤${cap}), IA-type A/B/C/D tags, depth=${depth}, for: ${question}', { schema: { type: 'object', properties: { subNeeds: { type: 'array', items: { type: 'object', properties: { sub_need: { type: 'string' }, ia_type: { type: 'string' } }, required: ['sub_need'] } } }, required: ['subNeeds'] } })
const subNeeds = (decomp.subNeeds || []).slice(0, ${cap})
phase('Resolve+Execute')
// one agent per sub-need: resolve via resolver-plan → execute (READ content_axis; RUN Tier-A only; surface Tier-B+); cite everything.
const evidence = (await parallel(subNeeds.map((sn) => () =>
  agent('deepask/execute — resolve ResolverPlan v1 + execute sub-need (read-only content_axis + Tier-A capability_axis; author concrete SQL/wiki_ask grounded in grounding_ref, never invent columns): ' + sn.sub_need, { schema: { type: 'object', properties: { findings: { type: 'array' }, source_refs: { type: 'array' }, got_data: { type: 'boolean' } } } })
    .then((r) => ({ sub_need: sn.sub_need, ...r }))
))).filter(Boolean)
phase('Synthesize')
const ir = await agent('deepask/synthesize — Pyramid, every claim cited, authority-ranked, conflict-flagged, freshness-tagged, adversarial-verified; emit the format-agnostic IR (sections/claims/tables/charts[]/diagrams/conflicts/coverage/sources) from: ' + JSON.stringify(evidence), { schema: { type: 'object' } })
phase('Critic')
const critic = await agent('deepask/completeness-critic — coverage matrix + MECE re-check + live-probe → COMPLETE or PARTIAL-with-honest-gaps + remedy, for IR: ' + JSON.stringify(ir).slice(0, 4000), { schema: { type: 'object', properties: { verdict: { type: 'string' }, gaps: { type: 'array' } } } })
return { ir, verdict: critic.verdict, gaps: critic.gaps || [], subNeedCount: subNeeds.length }
`;
}

module.exports = { RICH_FORMATS, assessComplexity, resolveWorkflowMode, buildWorkflowScript, jsStr };
