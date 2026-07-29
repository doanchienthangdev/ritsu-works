#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-video-types.cjs
 *
 * L2-CRITICAL validator for capability `video-platform`:
 *   - knowledge/video-types.yaml exists + parses + root is a mapping
 *   - each type: valid slug id, unique (ids AND aliases share one namespace)
 *   - valid status enum; status=installed ⇒ the `skill` path MUST exist on disk
 *   - asset_slots[] ⊆ UNIVERSAL_SLOTS and handoff[] ⊆ asset_slots[]
 *     (kept in sync with scripts/video/lib/params.cjs — the single source of truth).
 *     Without this check the registry becomes decorative.
 *   - artifacts[] ⊆ KNOWN_ARTIFACTS; publish_targets[] ⊆ KNOWN_TARGETS
 *   - write_type ∈ knowledge/write-types.yaml ids  (the /write join — reference, don't restate)
 *   - design_system resolves: knowledge/design-systems.yaml OR video/design-systems/<n>/frame.md
 *   - resolution WxH; fps ∈ {24,25,30,60}; duration/beats internally coherent
 *   - exactly one type with default: true
 *
 *   PINS THE NON-NEGOTIABLES so no future video line can silently opt out:
 *     · narration.target_lufs == -16 AND narration.true_peak <= -1.5   (lesson #1)
 *     · gates.min_bitrate_kbps > 0 AND gates.require_filmstrip == true (lessons #2/#3)
 *       for EVERY installed type.
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (the two-edit rule — CI runs a
 * hand-picked per-job subset, so missing the second edit leaves CI blind).
 * Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY = path.join(REPO_ROOT, 'knowledge', 'video-types.yaml');
const WRITE_TYPES = path.join(REPO_ROOT, 'knowledge', 'write-types.yaml');
const DESIGN_SYSTEMS = path.join(REPO_ROOT, 'knowledge', 'design-systems.yaml');

const {
  UNIVERSAL_SLOTS, KNOWN_ARTIFACTS, KNOWN_TARGETS,
  NARRATION_TARGET_LUFS, NARRATION_MAX_TRUE_PEAK,
  VALID_STATUSES, VALID_FPS, RESOLUTION_RE, SLUG_RE,
} = require('../video/lib/params.cjs');

const SLOTS = new Set(UNIVERSAL_SLOTS);
const ARTIFACTS = new Set(KNOWN_ARTIFACTS);
const TARGETS = new Set(KNOWN_TARGETS);
const MATERIALIZED_STATUSES = ['installed'];

function loadYaml(fp, label, errs) {
  if (!fs.existsSync(fp)) { errs.push(`${label} missing at ${path.relative(REPO_ROOT, fp)}`); return null; }
  try { return yaml.load(fs.readFileSync(fp, 'utf-8')) || {}; }
  catch (e) { errs.push(`${label} YAML parse error: ${e.message}`); return null; }
}

/** Collect ids from a registry that may be {types:[]} / {adapters:[]} / a bare list. */
function idsOf(doc, key) {
  if (!doc) return new Set();
  const list = Array.isArray(doc) ? doc : (Array.isArray(doc[key]) ? doc[key] : []);
  return new Set(list.filter((e) => e && typeof e === 'object' && typeof e.id === 'string').map((e) => e.id));
}

function checkSubset(listName, list, allowed, allowedLabel, tag, errs, { required = false } = {}) {
  if (list === undefined) {
    if (required) errs.push(`${tag}: ${listName} is required`);
    return;
  }
  if (!Array.isArray(list)) { errs.push(`${tag}: ${listName} must be an array`); return; }
  for (const v of list) {
    if (!allowed.has(v)) errs.push(`${tag}: ${listName} contains "${v}" which is not a ${allowedLabel}`);
  }
}

function main() {
  const errs = [];

  const doc = loadYaml(REGISTRY, 'knowledge/video-types.yaml', errs);
  if (!doc) { report(errs, 0); return; }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    console.error('[FAIL] video-types.yaml root must be a mapping');
    process.exit(1);
  }

  const list = doc.types === undefined ? [] : doc.types;
  if (!Array.isArray(list)) {
    console.error('[FAIL] video-types.yaml: types must be an array');
    process.exit(1);
  }

  // Cross-file joins (soft — a missing peer registry is reported, not fatal-by-crash)
  const writeIds = idsOf(loadYaml(WRITE_TYPES, 'knowledge/write-types.yaml', errs), 'types');
  const dsDoc = fs.existsSync(DESIGN_SYSTEMS) ? loadYaml(DESIGN_SYSTEMS, 'knowledge/design-systems.yaml', []) : null;
  const dsIds = idsOf(dsDoc, 'systems');
  const dsNames = new Set([
    ...dsIds,
    ...((dsDoc && Array.isArray(dsDoc.systems) ? dsDoc.systems : [])
      .filter((e) => e && typeof e === 'object' && typeof e.name === 'string').map((e) => e.name)),
  ]);

  const seen = new Set();      // ids AND aliases share one namespace
  let defaults = 0;

  for (const e of list) {
    const tag = e && typeof e === 'object' && e.id ? e.id : JSON.stringify(e);
    if (e === null || typeof e !== 'object' || Array.isArray(e)) { errs.push(`entry not an object: ${tag}`); continue; }

    // id + alias uniqueness
    if (typeof e.id !== 'string' || !SLUG_RE.test(e.id)) {
      errs.push(`${tag}: invalid id (must match ${SLUG_RE})`);
    } else {
      if (seen.has(e.id)) errs.push(`${e.id}: duplicate id`);
      seen.add(e.id);
    }
    if (e.aliases !== undefined) {
      if (!Array.isArray(e.aliases)) errs.push(`${tag}: aliases must be an array`);
      else for (const a of e.aliases) {
        if (typeof a !== 'string' || !SLUG_RE.test(a)) errs.push(`${tag}: invalid alias "${a}"`);
        else if (seen.has(a)) errs.push(`${tag}: alias "${a}" collides with an existing id/alias`);
        else seen.add(a);
      }
    }

    if (!VALID_STATUSES.includes(e.status)) {
      errs.push(`${tag}: invalid status "${e.status}" (one of ${VALID_STATUSES.join('|')})`);
    }
    if (e.default === true) defaults += 1;

    // format
    if (typeof e.resolution !== 'string' || !RESOLUTION_RE.test(e.resolution)) {
      errs.push(`${tag}: resolution must match WxH (got ${JSON.stringify(e.resolution)})`);
    }
    if (!VALID_FPS.includes(e.fps)) {
      errs.push(`${tag}: fps must be one of ${VALID_FPS.join('|')} (got ${JSON.stringify(e.fps)})`);
    }

    // coherence
    const d = e.duration;
    if (d && typeof d === 'object') {
      if (!(d.min_s <= d.target_s && d.target_s <= d.max_s)) {
        errs.push(`${tag}: duration incoherent (need min_s ≤ target_s ≤ max_s, got ${d.min_s}/${d.target_s}/${d.max_s})`);
      }
    }
    const b = e.beats;
    if (b && typeof b === 'object') {
      if (!(b.min <= b.default && b.default <= b.max)) {
        errs.push(`${tag}: beats incoherent (need min ≤ default ≤ max, got ${b.min}/${b.default}/${b.max})`);
      }
    }

    // vocabulary subsets — the checks that keep registry and code from drifting
    checkSubset('asset_slots', e.asset_slots, SLOTS, 'UNIVERSAL_SLOT (video/lib/params.cjs)', tag, errs, { required: true });
    checkSubset('artifacts', e.artifacts, ARTIFACTS, 'KNOWN_ARTIFACT (video/lib/params.cjs)', tag, errs, { required: true });
    checkSubset('publish_targets', e.publish_targets, TARGETS, 'KNOWN_TARGET (video/lib/params.cjs)', tag, errs, { required: true });

    if (e.handoff !== undefined) {
      if (!Array.isArray(e.handoff)) errs.push(`${tag}: handoff must be an array`);
      else {
        const declared = new Set(Array.isArray(e.asset_slots) ? e.asset_slots : []);
        for (const h of e.handoff) {
          if (!declared.has(h)) errs.push(`${tag}: handoff "${h}" is not in this type's asset_slots`);
        }
      }
    }

    // ── PINNED NON-NEGOTIABLES ────────────────────────────────────────────
    // lesson #1 — loudness. Every type, not just installed ones: a stub that
    // ships later must already carry the floor.
    const n = e.narration;
    if (!n || typeof n !== 'object') {
      errs.push(`${tag}: narration block is required`);
    } else {
      if (n.target_lufs !== NARRATION_TARGET_LUFS) {
        errs.push(`${tag}: narration.target_lufs must be ${NARRATION_TARGET_LUFS} (got ${n.target_lufs}) — the loudness floor is not negotiable per type`);
      }
      if (!(typeof n.true_peak === 'number' && n.true_peak <= NARRATION_MAX_TRUE_PEAK)) {
        errs.push(`${tag}: narration.true_peak must be ≤ ${NARRATION_MAX_TRUE_PEAK} (got ${n.true_peak})`);
      }
    }

    // lessons #2/#3 — render gates. Enforced for installed types (a stub may
    // still be tuning its floor, but must declare the block).
    const g = e.gates;
    if (!g || typeof g !== 'object') {
      errs.push(`${tag}: gates block is required`);
    } else if (MATERIALIZED_STATUSES.includes(e.status)) {
      if (!(typeof g.min_bitrate_kbps === 'number' && g.min_bitrate_kbps > 0)) {
        errs.push(`${tag}: installed type requires gates.min_bitrate_kbps > 0 (blank-render bitrate tell)`);
      }
      if (g.require_filmstrip !== true) {
        errs.push(`${tag}: installed type requires gates.require_filmstrip: true (QC evidence is mandatory)`);
      }
      if (!(typeof g.min_region_stddev === 'number' && g.min_region_stddev > 0)) {
        errs.push(`${tag}: installed type requires gates.min_region_stddev > 0 (blank-segment detection)`);
      }
    }

    // framing band (lesson #5) must be ordered
    const f = e.framing;
    if (f && Array.isArray(f.forbidden_zoom_band)) {
      const [lo, hi] = f.forbidden_zoom_band;
      if (!(lo < hi)) errs.push(`${tag}: framing.forbidden_zoom_band must be [lo, hi] with lo < hi`);
    }

    // cross-file joins
    if (typeof e.write_type === 'string' && writeIds.size && !writeIds.has(e.write_type)) {
      errs.push(`${tag}: write_type "${e.write_type}" is not an id in knowledge/write-types.yaml`);
    }
    if (typeof e.design_system === 'string') {
      const framePath = path.join(REPO_ROOT, 'video', 'design-systems', e.design_system, 'frame.md');
      if (!dsNames.has(e.design_system) && !fs.existsSync(framePath)) {
        errs.push(`${tag}: design_system "${e.design_system}" resolves neither in knowledge/design-systems.yaml nor at video/design-systems/${e.design_system}/frame.md`);
      }
    }

    // installed ⇒ skill on disk
    if (MATERIALIZED_STATUSES.includes(e.status)) {
      if (typeof e.skill !== 'string' || !e.skill) {
        errs.push(`${tag}: status="installed" requires a skill path`);
      } else {
        const sp = path.isAbsolute(e.skill) ? e.skill : path.join(REPO_ROOT, e.skill);
        if (!fs.existsSync(sp)) errs.push(`${e.id}: status="installed" but skill ${e.skill} is missing on disk`);
      }
    }
  }

  if (defaults !== 1) {
    errs.push(`exactly one type must carry default: true (found ${defaults})`);
  }

  report(errs, list.length);
}

function report(errs, n) {
  if (errs.length) {
    console.error(`[FAIL] video-types.yaml: ${errs.length} issue(s):`);
    for (const x of errs) console.error('  - ' + x);
    process.exit(1);
  }
  console.log(`[PASS] video-types.yaml (${n} type${n === 1 ? '' : 's'})`);
  process.exit(0);
}

main();
