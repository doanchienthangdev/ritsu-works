#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-command-arg-substitution.cjs
 *
 * L2-CRITICAL validator for the `.claude/commands/*.md` surface:
 *   - no command doc may contain a token the slash-command argument-substitution
 *     engine would rewrite when the command is invoked WITH arguments.
 *
 * WHY THIS EXISTS
 * ---------------
 * Claude Code substitutes positional arguments into a command's markdown before the
 * model reads it. The engine's rule (verified against the shipped binary, v2.1.158):
 *
 *     if (args === undefined || args === null) return text;   // no args → no substitution
 *     text = text.replace(/\$ARGUMENTS\[(\d+)\]/g, ...)       // indexed form
 *     text = text.replace(/\$(\d+)(?!\w)/g, ...)              // POSITIONAL — 0-indexed
 *     text = text.replaceAll('$ARGUMENTS', ...)               // whole arg string
 *
 * `$` + digits NOT followed by a word char is therefore consumed as a positional
 * placeholder. A dollar amount written naturally in prose — `$0.50`, `$1.50`, `$100` —
 * matches that rule, so on every argument-carrying invocation:
 *
 *     write-orchestration $0.50   ->   write-orchestration <entire first argument>.50
 *     gbrain cap $100             ->   gbrain cap                (args[100] is undefined -> "")
 *
 * This silently corrupts the governance/cost text the model reads, on every run.
 * It is invisible in review — the source looks perfectly correct.
 *
 * THERE IS NO ESCAPE. The engine has no escape handling: `\$0.50` still substitutes
 * (the backslash is just a preceding character), `$$0.50` still substitutes, and code
 * fences / backticks are NOT respected (the regex runs over the raw text). The only
 * fixes are to drop the `$` sigil (`USD 0.50`) or to separate it from the digits.
 *
 * Safe by construction (all verified against the regex above): `$ARGUMENTS`,
 * `$ARGUMENTS[0]` (handled by the engine), `$X.XX`, `$<placeholder>`, `$ 0.50`.
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (the two-edit rule). Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const COMMANDS_DIR = path.join(REPO_ROOT, '.claude', 'commands');

// The engine's positional rule, verbatim. Keep these two in lockstep.
const POSITIONAL_RE = /\$(\d+)(?!\w)/g;
const INDEXED_RE = /\$ARGUMENTS\[(\d+)\]/g;   // engine-handled; listed for documentation only

function scan(text) {
  const hits = [];
  text.split('\n').forEach((line, i) => {
    // $ARGUMENTS[N] is a first-class engine form, not drift — take it out before scanning.
    const scrubbed = line.replace(INDEXED_RE, (m) => ' '.repeat(m.length));
    POSITIONAL_RE.lastIndex = 0;
    let m;
    while ((m = POSITIONAL_RE.exec(scrubbed)) !== null) {
      hits.push({ line: i + 1, token: m[0], text: line.trim() });
    }
  });
  return hits;
}

function main() {
  if (!fs.existsSync(COMMANDS_DIR)) {
    console.log('[PASS] command arg-substitution (no .claude/commands/ dir)');
    process.exit(0);
  }
  const files = fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.md')).sort();
  const errs = [];
  for (const f of files) {
    for (const h of scan(fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8'))) {
      errs.push(`.claude/commands/${f}:${h.line}: "${h.token}" is consumed as a positional argument → ${h.text}`);
    }
  }

  if (errs.length) {
    console.error(`[FAIL] command arg-substitution: ${errs.length} corrupting token(s):`);
    for (const x of errs) console.error('  - ' + x);
    console.error('');
    console.error('  A `$` followed by digits is rewritten as a positional argument on every');
    console.error('  invocation that passes args. Backslash-escaping does NOT work and code');
    console.error('  fences do NOT protect. Write money as `USD 0.50` (not `$0.50`).');
    process.exit(1);
  }
  console.log(`[PASS] command arg-substitution (${files.length} command doc${files.length === 1 ? '' : 's'})`);
  process.exit(0);
}

main();
