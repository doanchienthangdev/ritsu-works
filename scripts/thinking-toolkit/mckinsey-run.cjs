#!/usr/bin/env node
'use strict';
/**
 * scripts/thinking-toolkit/mckinsey-run.cjs
 *
 * Deterministic run-scaffolder + discipline-checker for the /think mckinsey
 * engine (capability thinking-toolkit v1.6). This is the MECHANICAL half of the
 * engine — it converts the prose discipline in the SKILL.md (a run folder, the
 * 6-column + status workplan, per-datum provenance, the knock-out gate, the
 * product firewall) into a STRUCTURE that is enforced by a script instead of
 * trusted to the LLM. It deliberately checks STRUCTURE + DISCIPLINE-PRESENCE,
 * never JUDGMENT (it does not judge whether an analysis is good — only whether
 * the engine recorded WHERE each datum came from, tagged its certainty, and
 * closed every workplan row before Sell). Judgment stays with the agent running
 * the playbook (the v1.4 principle); this guards the scaffolding around it.
 *
 * Usage:
 *   node mckinsey-run.cjs scaffold <slug>            # create .archives/mckinsey/<slug>/ templates (idempotent — never clobbers)
 *   node mckinsey-run.cjs check <slug> [--before-sell]
 *       # validate the run folder. --before-sell additionally enforces the
 *       # stopping gate: no workplan row may still be `open`.
 *
 * Exit 0 = pass, 1 = discipline broken (prints errors). Pure helpers
 * (scaffoldRun / checkRun) are exported for tests.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RUN_BASE = '.archives/mckinsey';
const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

// The 7 persisted artifacts — names MUST match knowledge/mckinsey-workflow.yaml
// artifacts.files (the engine spec) so catalog ↔ run-folder ↔ checker agree.
const ARTIFACTS = ['problem-statement', 'decomposition', 'workplan', 'analysis-log', 'one-day-answer', 'synthesis', 'communication'];
// The 6 book columns (Bulletproof Exhibit 4.3) + the v1.4 status ledger column.
const WORKPLAN_COLUMNS = ['issue', 'hypothesis', 'analysis', 'source-of-data', 'owner', 'end-product', 'status'];
const STATUS_VALUES = ['open', 'pulled', 'validated', 'knocked-out', 'spawned'];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- templates (fil-able; the structural requirements are baked in) --------
const TEMPLATES = {
  'problem-statement.md': `# Problem statement (STATE)\n\n<!-- TOSCA — fill each slot; ASK the founder (AskUserQuestion) for any owner-only input; never fabricate. -->\n- **Trouble** (a symptom, not a diagnosis; passes "Why now?"):\n- **Owner** (whose problem + who judges "good enough"):\n- **Success criteria** (time-bound + quantified; NOT the proposed solution):\n- **Constraints** (provisional — revisit in Solve):\n- **Actors**:\n\n**Core Question:**\n\n**5-check:** addresses Trouble? / from Owner's view? / meets Success? / recognizes Constraints? / considers Actors?\n`,
  'decomposition.md': `# Decomposition (STRUCTURE)\n\n<!-- MECE issue tree (default) OR hypothesis pyramid (strong prior / time-starved). Each leaf = a falsifiable hypothesis. Try multiple cleaves. -->\n`,
  'workplan.md': `# Workplan (STRUCTURE) — 6 book columns + status ledger\n\n<!-- One row per surviving leaf. Order knock-out-first. status ∈ open|pulled|validated|knocked-out|spawned. source-of-data routes to a real tool (data_routing) — NEVER product.* (firewall: metrics.* only). -->\n\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| <leaf> | <falsifiable claim> | <what proves/disproves it> | <tool — e.g. supabase-ops metrics.* / deepask / wiki_ask / gbrain / ask-user> | <who> | <dummy exhibit> | open |\n`,
  'analysis-log.md': `# Analysis log (SOLVE) — provenance + certainty per datum\n\n<!-- One row per analysis. provenance = the tool/source it was PULLED from, OR "ask-user" / "assumption" — every datum must be grounded or explicitly labeled. degree 1-8 (given-fact … judgment-call). NEVER assert a number you did not fetch. -->\n\n| hypothesis | data pulled | provenance (tool/source ∨ ask-user ∨ assumption) | degree (1-8) | validation verdict |\n|---|---|---|---|---|\n`,
  'one-day-answer.md': `# One-day answer (LIVING STATE — seeded at STATE, updated every analysis)\n\n<!-- "If forced to answer today, we'd say X, because Y." Rewrite after every analysis as Situation → Observation → Resolution. This re-ranks the open workplan rows. -->\n\n**Situation:**\n**Observation:**\n**Resolution:**\n`,
  'synthesis.md': `# Synthesis — the LOGIC (SELL, step 6)\n\n<!-- Pyramid: governing thought (top-line) → MECE key line → support. The argument must stand on its own before any storytelling. -->\n`,
  'communication.md': `# Communication — the STORY (SELL, step 7)\n\n<!-- Render the synthesis for THIS audience: grouping vs SCR/SCQA, action titles, pre-wire. APK guard: lead with the answer; never tell the story-of-the-search. -->\n`,
};

/** Create the run folder + 7 artifact templates. Idempotent: never overwrites an existing file. */
function scaffoldRun(repoRoot, slug) {
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) {
    return { created: [], skipped: [], errors: [`slug must be kebab-case (^[a-z0-9][a-z0-9-]*$): ${JSON.stringify(slug)}`] };
  }
  const dir = path.join(repoRoot, RUN_BASE, slug);
  fs.mkdirSync(dir, { recursive: true });
  const created = [];
  const skipped = [];
  for (const [name, body] of Object.entries(TEMPLATES)) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) { skipped.push(name); continue; }
    fs.writeFileSync(p, body);
    created.push(name);
  }
  return { created, skipped, errors: [] };
}

/** Parse the first markdown table in `text` → { headers: string[], rows: string[][] } | null. */
function parseFirstTable(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!/^\s*\|/.test(lines[i])) continue;
    // candidate header; next line must be a separator (---)
    const sep = lines[i + 1] || '';
    if (!/^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(sep) || !sep.includes('-')) continue;
    const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    const headers = cells(lines[i]);
    const rows = [];
    for (let j = i + 2; j < lines.length; j++) {
      if (!/^\s*\|/.test(lines[j])) break;
      rows.push(cells(lines[j]));
    }
    return { headers, rows };
  }
  return null;
}

/**
 * Find the column index for `keys` (priority-ordered). EXACT normalized match
 * first (across all headers, for every key), THEN key-major substring. This
 * prevents a decoy header from stealing the match — e.g. a `data source` column
 * must NOT win the `provenance` lookup over the real `provenance` column, and a
 * `status-note` column must NOT win over `status`. (@cto v1.6 must-fix.)
 */
function colIndex(headers, keys) {
  const H = headers.map(norm);
  for (const k of keys) { const e = H.indexOf(norm(k)); if (e !== -1) return e; } // exact, key-priority
  for (const k of keys) { const nk = norm(k); for (let i = 0; i < H.length; i++) if (H[i].includes(nk)) return i; } // then substring, key-major
  return -1;
}

/**
 * Is a parsed row a real data row (vs the pristine scaffold template row)?
 * A row is "filler" only if EVERY non-empty cell is either a `<...>` placeholder
 * OR a status keyword (the template ships a default `open`). So the pristine
 * template row (placeholders + `open`) is skipped, but a HALF-FILLED real row
 * (any real, non-status cell) IS counted — closing the @cto v1.6 should-fix
 * where a 3/6-placeholder row escaped the gate.
 */
function isDataRow(cells) {
  const nonEmpty = cells.filter((c) => c.trim());
  if (!nonEmpty.length) return false;
  const isFiller = (c) => /^<.*>$/.test(c.trim()) || STATUS_VALUES.map(norm).includes(norm(c));
  if (nonEmpty.every(isFiller)) return false; // pristine template row → not data
  return true;
}

/**
 * Validate a run folder's discipline. Returns { errors: string[], warnings: string[] }.
 * @param opts.beforeSell  also enforce the stopping gate (no `open` workplan row).
 */
function checkRun(repoRoot, slug, opts = {}) {
  const errors = [];
  const warnings = [];
  if (typeof slug !== 'string' || !SLUG_RE.test(slug)) return { errors: [`slug must be kebab-case: ${JSON.stringify(slug)}`], warnings };

  const dir = path.join(repoRoot, RUN_BASE, slug);
  if (!fs.existsSync(dir)) return { errors: [`run folder not found: ${RUN_BASE}/${slug}/ (run \`scaffold ${slug}\` first)`], warnings };

  // 1. all 7 artifacts present
  for (const a of ARTIFACTS) {
    if (!fs.existsSync(path.join(dir, `${a}.md`))) errors.push(`missing artifact: ${a}.md`);
  }

  // 2. workplan: 7 columns, valid status, firewall on source-of-data
  const wpPath = path.join(dir, 'workplan.md');
  let openRows = 0;
  if (fs.existsSync(wpPath)) {
    const t = parseFirstTable(fs.readFileSync(wpPath, 'utf8'));
    if (!t) {
      errors.push('workplan.md: no markdown table found (need the 6 book columns + status)');
    } else {
      for (const col of WORKPLAN_COLUMNS) {
        if (colIndex(t.headers, [col]) === -1) errors.push(`workplan.md: missing column "${col}"`);
      }
      const si = colIndex(t.headers, ['status']);
      const sdi = colIndex(t.headers, ['source-of-data', 'sourceofdata', 'source']);
      for (const row of t.rows) {
        if (!isDataRow(row)) continue;
        if (si >= 0) {
          const st = norm(row[si] || '');
          if (st && !STATUS_VALUES.map(norm).includes(st)) errors.push(`workplan.md: invalid status "${row[si]}" (allowed: ${STATUS_VALUES.join('|')})`);
          if (st === norm('open')) openRows++;
        }
        if (sdi >= 0 && /\bproduct\./i.test(row[sdi] || '')) {
          errors.push(`workplan.md: source-of-data references product.* — FIREWALL violation (metrics.* only): "${row[sdi]}"`);
        }
      }
    }
  }

  // 3. analysis-log: every datum has provenance + degree(1-8)
  const alPath = path.join(dir, 'analysis-log.md');
  if (fs.existsSync(alPath)) {
    const t = parseFirstTable(fs.readFileSync(alPath, 'utf8'));
    if (!t) {
      warnings.push('analysis-log.md: no table yet (expected once Solve begins)');
    } else {
      const pi = colIndex(t.headers, ['provenance', 'tool', 'source']);
      const di = colIndex(t.headers, ['degree', 'certainty']);
      if (pi === -1) errors.push('analysis-log.md: missing a provenance column (tool/source ∨ ask-user ∨ assumption)');
      if (di === -1) errors.push('analysis-log.md: missing a degree (1-8) column');
      const dataRows = t.rows.filter(isDataRow);
      for (const row of dataRows) {
        if (pi >= 0 && !(row[pi] || '').trim()) errors.push('analysis-log.md: a datum row is missing provenance (where was it pulled? or ask-user/assumption)');
        if (di >= 0) {
          const d = parseInt((row[di] || '').match(/\d+/)?.[0], 10);
          if (Number.isNaN(d) || d < 1 || d > 8) errors.push(`analysis-log.md: degree must be 1-8 (got "${row[di]}")`);
        }
      }
    }
  }

  // 4. stopping gate (before Sell): no row still open
  if (opts.beforeSell && openRows > 0) {
    errors.push(`stopping gate: ${openRows} workplan row(s) still \`open\` — cannot move to Sell. Validate or knock-out every row first (SKILL §SOLVE).`);
  }

  return { errors, warnings };
}

function main() {
  const [cmd, slug, ...rest] = process.argv.slice(2);
  if (cmd === 'scaffold') {
    const r = scaffoldRun(REPO_ROOT, slug);
    if (r.errors.length) { r.errors.forEach((e) => console.error(`[FAIL] ${e}`)); process.exit(1); }
    console.log(`[OK] scaffolded ${RUN_BASE}/${slug}/ — created: ${r.created.join(', ') || '(none)'}${r.skipped.length ? ` · kept: ${r.skipped.join(', ')}` : ''}`);
    process.exit(0);
  }
  if (cmd === 'check') {
    const r = checkRun(REPO_ROOT, slug, { beforeSell: rest.includes('--before-sell') });
    r.warnings.forEach((w) => console.warn(`[warn] ${w}`));
    if (r.errors.length) { console.error(`[FAIL] ${slug}: ${r.errors.length} discipline issue(s):`); r.errors.forEach((e) => console.error(`  - ${e}`)); process.exit(1); }
    console.log(`[OK] ${RUN_BASE}/${slug}/ — discipline checks pass${rest.includes('--before-sell') ? ' (stopping gate clear)' : ''}.`);
    process.exit(0);
  }
  console.error('usage: mckinsey-run.cjs (scaffold|check) <slug> [--before-sell]');
  process.exit(2);
}

if (require.main === module) main();

module.exports = { scaffoldRun, checkRun, parseFirstTable, colIndex, isDataRow, ARTIFACTS, WORKPLAN_COLUMNS, STATUS_VALUES, RUN_BASE };
