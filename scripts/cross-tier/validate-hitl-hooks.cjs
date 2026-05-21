#!/usr/bin/env node
// L2 validator: every Tier D action listed in governance/HITL.md should have
// either an enforcement hook in .claude/hooks/ OR an explicit `not_enforced:`
// marker comment.
//
// Heuristic in v1.0a — looks for the "Tier D" sections and lists items;
// emits warn-severity drift, false positives acceptable.
//
// Invariant enforced: hitl-tier-d-actions-have-hook-or-exemption.

'use strict';

const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('../lib/load-invariants.cjs');

const HITL_PATH = path.join(REPO_ROOT, 'governance', 'HITL.md');
const HOOKS_DIR = path.join(REPO_ROOT, '.claude', 'hooks');

function existingHooks() {
  if (!fs.existsSync(HOOKS_DIR)) return [];
  return fs
    .readdirSync(HOOKS_DIR)
    .filter((f) => f.endsWith('.md') && f.startsWith('pre-'));
}

// Extract Tier D action bullets from HITL.md. Looks for `## Tier D` section
// and lists bullets within it.
function extractTierDActions() {
  if (!fs.existsSync(HITL_PATH)) return [];
  const text = fs.readFileSync(HITL_PATH, 'utf8');
  const lines = text.split('\n');
  const actions = [];
  let inTierD = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^##\s+Tier D/.test(line)) {
      inTierD = true;
      continue;
    }
    if (inTierD && /^##\s+\S/.test(line)) {
      inTierD = false;
      continue;
    }
    if (inTierD) {
      // Match bullet items but skip the meta description lines.
      const m = line.match(/^-\s+\*?\*?(.+?)\*?\*?(?:\s*[—:].*)?$/);
      if (m && line.length < 200) {
        actions.push({ text: m[1].trim(), line: i + 1 });
      }
    }
  }
  return actions;
}

// Each action should match at least one hook by keyword overlap. Returns
// true if the action description contains a keyword that maps to any hook.
function actionHasHookCoverage(action, hooks) {
  const lower = action.text.toLowerCase();
  const keywords = {
    'pre-bash-dangerous.md': ['bash', 'destructive', 'rm', 'drop', 'force', 'reset'],
    'pre-edit-tier1.md': ['00-core', 'governance', 'manifest', 'tier 1', 'tier1', 'pillar sop'],
    'pre-tool-publish.md': ['publish', 'social', 'blog', 'send email', 'post'],
    'pre-tool-customer-message.md': ['customer', 'support ticket', 'reply'],
    'pre-tool-secrets.md': ['secret', 'credential', 'key', 'token'],
    'pre-tool-supabase-product.md': ['product supabase', 'product database', 'ritsu (product'],
    'pre-llm-call-budget.md': ['llm', 'budget', 'cost'],
    'pre-delegate-check.md': ['delegate', 'subagent'],
  };
  for (const hook of hooks) {
    const words = keywords[hook] || [];
    if (words.some((w) => lower.includes(w))) return hook;
  }
  return null;
}

function main() {
  const actions = extractTierDActions();
  const hooks = existingHooks();
  const errors = [];

  for (const a of actions) {
    // Skip headers and empty-ish entries
    if (a.text.length < 8) continue;
    if (/^(rule of thumb|when this|examples|notes?)/i.test(a.text)) continue;
    if (!actionHasHookCoverage(a, hooks)) {
      errors.push(`HITL.md:${a.line} Tier D action has no obvious hook coverage: "${a.text.slice(0, 80)}"`);
    }
  }

  if (errors.length === 0) {
    console.log(`✓ hitl-hooks: clean (${actions.length} Tier D actions, all covered by heuristic match)`);
    process.exit(0);
  }
  console.error('⚠️  hitl-hooks coverage gaps (warn severity — heuristic, false positives expected in v1.0a):');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(`\n${errors.length} action(s). Add a hook OR add an explicit not_enforced marker to HITL.md.`);
  // warn-severity invariant — exit 0 in v1.0a so it doesn't block PR; surface in CI output.
  process.exit(0);
}

if (require.main === module) main();

module.exports = { main, extractTierDActions, actionHasHookCoverage };
