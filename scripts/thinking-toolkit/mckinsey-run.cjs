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

// The 9 persisted artifacts — names MUST match knowledge/mckinsey-workflow.yaml
// artifacts.files (the engine spec) so catalog ↔ run-folder ↔ checker agree.
// v1.8: +'hitl-log' (the HITL receipt ledger — every founder question actually
// asked + answered; reconciled against ask-user rows in analysis-log).
// v2.0: +'checkpoint-log' (the McKinsey team-session milestone ledger — frame /
// hypothesize / plan / prioritize / porpoise / dissent / pre-wire).
const ARTIFACTS = ['problem-statement', 'decomposition', 'workplan', 'analysis-log', 'hitl-log', 'checkpoint-log', 'one-day-answer', 'synthesis', 'communication'];
// The 6 book columns (Bulletproof Exhibit 4.3) + the v1.4 status ledger column.
const WORKPLAN_COLUMNS = ['issue', 'hypothesis', 'analysis', 'source-of-data', 'owner', 'end-product', 'status'];
const STATUS_VALUES = ['open', 'pulled', 'validated', 'knocked-out', 'spawned'];

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ---- templates (fil-able; the structural requirements are baked in) --------
const TEMPLATES = {
  'problem-statement.md': `# Problem statement (STATE)\n\n<!-- TOSCA — fill each slot; ASK the founder (AskUserQuestion) for any owner-only input; never fabricate. -->\n- **Trouble** (a symptom, not a diagnosis; passes "Why now?"):\n- **Owner** (whose problem + who judges "good enough"):\n- **Success criteria** (time-bound + quantified; NOT the proposed solution):\n- **Constraints** (provisional — revisit in Solve):\n- **Actors**:\n\n**Core Question:**\n\n**5-check:** addresses Trouble? / from Owner's view? / meets Success? / recognizes Constraints? / considers Actors?\n`,
  'decomposition.md': `# Decomposition (STRUCTURE)\n\n<!-- MECE issue tree (default) OR hypothesis pyramid (strong prior / time-starved). Each leaf = a falsifiable hypothesis. Try multiple cleaves. -->\n`,
  'workplan.md': `# Workplan (STRUCTURE) — 6 book columns + status ledger\n\n<!-- One row per surviving leaf. Order knock-out-first. status ∈ open|pulled|validated|knocked-out|spawned. source-of-data routes to a real tool (data_routing) — NEVER product.* (firewall: metrics.* only). -->\n\n| issue | hypothesis | analysis | source-of-data | owner | end-product | status |\n|---|---|---|---|---|---|---|\n| <leaf> | <falsifiable claim> | <what proves/disproves it> | <tool — e.g. supabase-ops metrics.* / deepask / wiki_ask / gbrain / ask-user> | <who> | <dummy exhibit> | open |\n`,
  'analysis-log.md': `# Analysis log (SOLVE) — provenance + certainty per datum\n\n<!-- One row per analysis. provenance = the tool/source it was PULLED from, OR "ask-user" / "assumption" — every datum must be grounded or explicitly labeled. degree 1-8 (given-fact … judgment-call). NEVER assert a number you did not fetch. RECEIPT RULE (v1.8): if provenance is "ask-user", you MUST tag the row with a [H<n>] receipt resolving to a row in hitl-log.md (e.g. "ask-user (founder) [H1]"); a bare "ask-user" with no receipt FAILS the gate. If you did not actually ask, label it "assumption" (degree >=6 + a sensitivity note) instead. -->\n\n| hypothesis | data pulled | provenance (tool/source ∨ ask-user [H#] ∨ assumption) | degree (1-8) | validation verdict |\n|---|---|---|---|---|\n`,
  'hitl-log.md': `# HITL log (receipts) — every founder question ACTUALLY asked + answered\n\n<!-- One row per REAL AskUserQuestion you put to the founder. id = H1, H2, … referenced from analysis-log.md as \`ask-user (founder) [H1]\`. The Solve loop's reconciliation gate REFUSES any analysis-log "ask-user" datum whose [H<n>] tag has no matching row here. DISCIPLINE, NOT PROOF: a checker cannot see the conversation, so this does not PROVE you asked — it makes SKIPPING the ask a gate failure and gives the founder an auditable trail to spot-check. If you did NOT ask, do not invent a row — label the datum "assumption" in analysis-log instead. Keep each answer to ONE LINE — use <br> for line breaks; a multi-line table cell breaks the parser and fails the gate. -->\n\n| id | stage | question asked (AskUserQuestion) | founder answer (verbatim, one line) | feeds datum | assumption-if-unanswered |\n|---|---|---|---|---|---|\n| <H1> | <state/solve> | <the exact question put to the founder> | <their verbatim answer, one line> | <hypothesis or TOSCA slot it feeds> | <interim assumption + degree if unanswered> |\n`,
  'checkpoint-log.md': `# Checkpoint log (McKinsey team sessions) — the milestone ledger\n\n<!-- One row per team problem-solving SESSION. kind ∈ frame | hypothesize | plan | prioritize | porpoise | dissent | pre-wire. The Solve→Sell gate (mckinsey-run.cjs --before-sell) REQUIRES a \`pre-wire\` row (the close) + a \`dissent\` row (red-team the ANALYSIS — name the one analysis that, if wrong, flips the answer), and WARNS if \`frame\`/\`prioritize\` are missing. Present STATE + THINKING (which frameworks + WHY) + PROPOSAL, then in interactive mode ask the founder-as-team-member "what would have to be true for this to be WRONG?" and record consensus. Keep each cell ONE LINE — use <br> for breaks. DISCIPLINE, NOT PROOF: a checker can't see the session; it makes skipping the closing sessions a failure + leaves an auditable trail. -->\n\n| id | stage | kind | presented (state + thinking + proposal) | team input / consensus | decision |\n|---|---|---|---|---|---|\n| <C1> | <state/structure/solve/sell> | <frame/hypothesize/plan/prioritize/porpoise/dissent/pre-wire> | <what was presented, one line> | <founder/team challenge + consensus> | <decision or redirection> |\n`,
  'one-day-answer.md': `# One-day answer (LIVING STATE — seeded at STATE, updated every analysis)\n\n<!-- "If forced to answer today, we'd say X, because Y." Rewrite after every analysis as Situation → Observation → Resolution. This re-ranks the open workplan rows. v2.0: also carry the COMPETING candidates you are disconfirming + the DISCONFIRMATION test (the single analysis that would prove this answer WRONG — it MUST appear as a workplan row; an answer no evidence could overturn is a belief, not an answer). The CP-DISSENT checkpoint red-teams exactly this. -->\n\n**Situation:**\n**Observation:**\n**Resolution:**\n**Competing hypotheses (being disconfirmed):**\n**Disconfirmation (what would prove this wrong — must be a workplan row):**\n`,
  'synthesis.md': `# Synthesis — the LOGIC (SELL, step 6)\n\n<!-- Pyramid: governing thought (top-line) → MECE key line → support. The argument must stand on its own before any storytelling. -->\n`,
  'communication.md': `# Communication — the STORY (SELL, step 7)\n\n<!-- Render the synthesis for THIS audience: grouping vs SCR/SCQA, action titles, pre-wire. APK guard: lead with the answer; never tell the story-of-the-search. -->\n`,
};

/** Create the run folder + 9 artifact templates. Idempotent: never overwrites an existing file. */
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

  // 4. HITL receipt reconciliation (v1.8) — one-way: analysis-log ask-user → hitl-log.
  //    Closes the honor-system hole where a fabricated "ask-user (founder)" datum
  //    passed identically to a real pull. Every ask-user datum must carry a [H<n>]
  //    receipt tag IN ITS PROVENANCE CELL that resolves to a real data row in
  //    hitl-log.md. Receipt DISCIPLINE, not proof-of-ask (a checker can't see the
  //    conversation) — but skipping the ask, or faking the label without a logged
  //    Q&A, now fails. hitl-log rows with no matching datum are allowed (one-way).
  const hlPath = path.join(dir, 'hitl-log.md');
  const validHitlIds = new Set();
  if (fs.existsSync(hlPath)) {
    const ht = parseFirstTable(fs.readFileSync(hlPath, 'utf8'));
    if (ht) {
      const idi = colIndex(ht.headers, ['id']);
      if (idi >= 0) {
        for (const row of ht.rows) {
          if (!isDataRow(row)) continue;                    // skip the pristine <H1> template row
          const id = (row[idi] || '').trim().toUpperCase();
          if (/^H\d+$/.test(id)) validHitlIds.add(id);      // anchored: "<H1>" can't sneak in
        }
      }
    }
  }
  if (fs.existsSync(alPath)) {
    const t = parseFirstTable(fs.readFileSync(alPath, 'utf8'));
    const pi = t ? colIndex(t.headers, ['provenance', 'tool', 'source']) : -1;
    if (t && pi >= 0) {
      for (const row of t.rows) {
        if (!isDataRow(row)) continue;
        const prov = row[pi] || '';                          // read provenance cell ONLY (decoy-proof)
        if (!/ask-user/i.test(prov)) continue;               // only ask-user provenance needs a receipt
        const tags = (prov.match(/\[H\d+\]/gi) || []).map((s) => s.slice(1, -1).toUpperCase());
        if (tags.length === 0) {
          errors.push(`hitl gate: an analysis-log datum has 'ask-user' provenance but no [H<n>] receipt tag — emit a real AskUserQuestion + log it in hitl-log.md, or relabel provenance as 'assumption'. Provenance cell: "${prov.trim()}"`);
          continue;
        }
        for (const tag of tags) {
          if (!validHitlIds.has(tag)) {
            errors.push(`hitl gate: analysis-log cites [${tag}] but hitl-log.md has no data row with id ${tag} (log the real question + founder answer, or relabel as 'assumption').`);
          }
        }
      }
    }
  }

  // 5. stopping gate (before Sell): no row still open
  if (opts.beforeSell && openRows > 0) {
    errors.push(`stopping gate: ${openRows} workplan row(s) still \`open\` — cannot move to Sell. Validate or knock-out every row first (SKILL §SOLVE).`);
  }

  // 6. McKinsey team-session checkpoint gate (v2.0, before Sell). The closing
  //    sessions must be logged in checkpoint-log.md. ERROR: a `pre-wire` row (the
  //    close) + a `dissent` row (the analysis was red-teamed — its template names
  //    the falsifier, the EM disconfirmation discipline). WARNING: `frame` +
  //    `prioritize`. Same robustness as the v1.8 hitl gate: isDataRow-filtered
  //    (so the pristine all-placeholder <C1> template row is skipped) + decoy-proof
  //    colIndex on the `kind` column + norm-anchored match.
  if (opts.beforeSell) {
    const cpPath = path.join(dir, 'checkpoint-log.md');
    const kinds = new Set();
    if (fs.existsSync(cpPath)) {
      const ct = parseFirstTable(fs.readFileSync(cpPath, 'utf8'));
      if (ct) {
        const ki = colIndex(ct.headers, ['kind']);
        if (ki >= 0) {
          for (const row of ct.rows) {
            if (!isDataRow(row)) continue;            // pristine <C1> all-placeholder row skipped
            const k = norm(row[ki] || '');
            if (k) kinds.add(k);
          }
        }
      }
    }
    if (!kinds.has(norm('pre-wire'))) {
      errors.push("checkpoint gate: no `pre-wire` session logged in checkpoint-log.md — run the closing McKinsey-team session (present the final one-day answer + synthesis + completeness/coverage critic + pre-mortem, reach consensus) and log it before Sell.");
    }
    if (!kinds.has(norm('dissent'))) {
      errors.push("checkpoint gate: no `dissent` session logged in checkpoint-log.md — red-team the ANALYSIS (name the one analysis that, if wrong, flips the answer; hunt disconfirming evidence) before Sell.");
    }
    if (!kinds.has(norm('frame'))) {
      warnings.push("checkpoint gate: no `frame` session logged (CP-FRAME: align TOSCA + core question + day-one answer before structuring).");
    }
    if (!kinds.has(norm('prioritize'))) {
      warnings.push("checkpoint gate: no `prioritize` session logged (CP-PRIORITIZE: the impact×influence cut — record what was dropped and why).");
    }
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
