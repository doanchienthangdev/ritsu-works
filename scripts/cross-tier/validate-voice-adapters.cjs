#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-voice-adapters.cjs
 *
 * L2-CRITICAL validator for capability `voice-platform`:
 *   - knowledge/voice-adapters.yaml exists + parses + root is a mapping
 *   - each adapter: valid id (slug), unique; valid status enum
 *   - supports[] ∪ unsupported_warn[] ⊆ UNIVERSAL_PARAMS
 *     (kept in sync with scripts/voice/lib/params.cjs — the single source of truth)
 *   - file-existence: status=installed ⇒ the `generator` path MUST exist on disk
 *   - preset_of ⇒ the target adapter id exists
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (the two-edit rule). Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO_ROOT, 'knowledge', 'voice-adapters.yaml');

const { UNIVERSAL_PARAMS } = require('../voice/lib/params.cjs');

const NAME_RE = /^[a-z][a-z0-9.-]*$/;
const VALID_STATUSES = ['installed', 'registered-not-built'];
const MATERIALIZED_STATUSES = ['installed'];
const UNIVERSAL = new Set(UNIVERSAL_PARAMS);

function checkSubset(listName, list, tag, errs) {
  if (list === undefined) return;
  if (!Array.isArray(list)) { errs.push(`${tag}: ${listName} must be an array`); return; }
  for (const p of list) {
    if (!UNIVERSAL.has(p)) errs.push(`${tag}: ${listName} contains "${p}" which is not a UNIVERSAL_PARAM (voice/lib/params.cjs)`);
  }
}

function main() {
  if (!fs.existsSync(REGISTRY)) {
    console.error('[FAIL] knowledge/voice-adapters.yaml missing. (capability voice-platform)');
    process.exit(1);
  }

  let doc;
  try {
    doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {};
  } catch (e) {
    console.error(`[FAIL] voice-adapters.yaml YAML parse error: ${e.message}`);
    process.exit(1);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('[FAIL] voice-adapters.yaml root must be a mapping');
    process.exit(1);
  }
  const list = doc.adapters === undefined ? [] : doc.adapters;
  if (!Array.isArray(list)) {
    console.error('[FAIL] voice-adapters.yaml: adapters must be an array');
    process.exit(1);
  }

  const errs = [];
  const seen = new Set();
  const ids = new Set(list.filter((e) => e && typeof e === 'object' && e.id).map((e) => e.id));

  for (const e of list) {
    const tag = e && typeof e === 'object' && e.id ? e.id : JSON.stringify(e);
    if (e === null || typeof e !== 'object' || Array.isArray(e)) { errs.push(`entry not an object: ${tag}`); continue; }

    if (typeof e.id !== 'string' || !NAME_RE.test(e.id)) {
      errs.push(`${tag}: invalid id (must match ${NAME_RE})`);
    } else {
      if (seen.has(e.id)) errs.push(`${e.id}: duplicate id`);
      seen.add(e.id);
    }
    if (!VALID_STATUSES.includes(e.status)) {
      errs.push(`${tag}: invalid status "${e.status}" (one of ${VALID_STATUSES.join('|')})`);
    }

    checkSubset('supports', e.supports, tag, errs);
    checkSubset('unsupported_warn', e.unsupported_warn, tag, errs);

    if (e.preset_of !== undefined && !ids.has(e.preset_of)) {
      errs.push(`${tag}: preset_of "${e.preset_of}" does not match any adapter id`);
    }

    if (MATERIALIZED_STATUSES.includes(e.status)) {
      if (typeof e.generator !== 'string' || !e.generator) {
        errs.push(`${tag}: status="installed" requires a generator path`);
      } else {
        const fp = path.isAbsolute(e.generator) ? e.generator : path.join(REPO_ROOT, e.generator);
        if (!fs.existsSync(fp)) errs.push(`${e.id}: status="installed" but generator ${e.generator} is missing on disk`);
      }
    }
  }

  if (errs.length) {
    console.error(`[FAIL] voice-adapters.yaml: ${errs.length} issue(s):`);
    for (const x of errs) console.error('  - ' + x);
    process.exit(1);
  }
  console.log(`[PASS] voice-adapters.yaml (${list.length} adapter${list.length === 1 ? '' : 's'})`);
  process.exit(0);
}

main();
