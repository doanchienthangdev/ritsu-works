#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-resolver-v3-index-consistency.cjs
 *
 * L1 validator for resolver-v3-jit-loading capability:
 *   - INDEX.md exists
 *   - INDEX.md content matches what generator would produce (no stale drift)
 *   - INDEX.md size under hard cap (15K tokens)
 *   - INDEX.md mtime ≥ max(recipients/*.md mtime) — catches manual edits
 *
 * Triggered by: pre-commit hook (when recipients/*.md changes) + pnpm check
 *
 * Exit 0 = pass. 1 = fail.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');
const INDEX_PATH = path.join(RECIPIENTS_DIR, 'INDEX.md');

const { generate, TOKEN_HARD_CAP } = require(
  path.join(REPO_ROOT, 'scripts/resolver-v3/index-generator.cjs')
);

const SOURCE_FILES = [
  'skills.md', 'commands.md', 'agents.md', 'personas.md', 'mcps.md',
  'wikis.md', 'sops.md', 'capabilities.md', 'workflows.md', 'schedules.md', 'hooks.md',
  'pages.md', 'views.md', 'metrics.md', 'runbooks.md', 'external-sources.md',
];

function main() {
  // 1. INDEX.md must exist
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('[FAIL] knowledge/recipients/INDEX.md missing. Run: pnpm resolver:index');
    process.exit(1);
  }

  // 2. mtime check — INDEX should be at least as new as any source file
  const indexMtime = fs.statSync(INDEX_PATH).mtimeMs;
  let staleSrc = null;
  for (const f of SOURCE_FILES) {
    const fp = path.join(RECIPIENTS_DIR, f);
    if (!fs.existsSync(fp)) continue;
    const m = fs.statSync(fp).mtimeMs;
    if (m > indexMtime + 1) {  // +1ms grace for filesystem precision
      staleSrc = f;
      break;
    }
  }
  if (staleSrc) {
    console.error(
      `[FAIL] INDEX.md is older than knowledge/recipients/${staleSrc}.\n` +
      `Source files changed after last index regen. Run: pnpm resolver:index`
    );
    process.exit(1);
  }

  // 3. Content match — INDEX.md must equal what generator would produce
  let regenerated;
  try {
    regenerated = generate();
  } catch (e) {
    console.error(`[FAIL] generator threw: ${e.message}`);
    process.exit(1);
  }

  const current = fs.readFileSync(INDEX_PATH, 'utf-8');
  // Strip timestamp for diff (timestamp changes every run)
  const stripTs = (s) => s.replace(/<!-- Generated at: [^>]+ -->/g, '<!-- Generated at: STRIPPED -->');
  if (stripTs(current) !== stripTs(regenerated.content)) {
    console.error(
      `[FAIL] INDEX.md content doesn't match generator output.\n` +
      `Either INDEX.md was hand-edited or generator logic changed.\n` +
      `Run: pnpm resolver:index`
    );
    process.exit(1);
  }

  // 4. Size cap check
  if (regenerated.estimatedTokens > TOKEN_HARD_CAP) {
    console.error(
      `[FAIL] INDEX.md is ${regenerated.estimatedTokens} tokens — exceeds hard cap ${TOKEN_HARD_CAP}`
    );
    process.exit(1);
  }

  console.log(
    `[PASS] INDEX.md current (${regenerated.totalActive} active recipients, ` +
    `${regenerated.estimatedTokens} tokens, mtime OK)`
  );
  process.exit(0);
}

main();
