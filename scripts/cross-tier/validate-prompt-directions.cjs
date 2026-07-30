#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-prompt-directions.cjs
 *
 * L2 validator for capability `prompt-platform` v0.1 (mirrors
 * validate-dataviz-renderers.cjs / validate-video-types.cjs):
 *   - knowledge/prompt-directions.yaml exists + parses + root mapping
 *   - the four vocabulary axes (modes / outputs / verbs / realism_levels) each have
 *     unique kebab ids and EXACTLY ONE default
 *   - realism_anchors PINS all three AI giveaways (skin · situational-lighting ·
 *     camera-background) with unique ranks — a direction cannot silently drop one,
 *     because the whole realism claim of this capability rests on them
 *   - banned_phrases is non-empty and contains the four phrases the source lesson
 *     names explicitly (cinematic masterpiece / hyper-detailed / ultra-glossy /
 *     perfect lighting)
 *   - each direction: unique kebab id, valid status, supported_modes ⊆ modes,
 *     supported_outputs ⊆ INSTALLED outputs (you cannot advertise an output that
 *     is registered-not-built)
 *   - status=installed ⇒ skill + library_index + realism_playbook MUST exist on
 *     disk, and models[] must carry EXACTLY ONE default
 *   - status=registered-not-built ⇒ reason_not_built required (honest refusal)
 *   - exactly one default direction
 *   - param_count, when declared, MUST match the number of per-parameter files
 *     actually on disk in library_path (catches a library that drifted from its
 *     own index)
 *
 * Registered in scripts/check-consistency.cjs (local `pnpm check`) AND as an explicit
 * job in .github/workflows/cross-tier-consistency.yml (GitHub CI runs the hand-listed
 * validator jobs, NOT check-consistency.cjs — the GitHub-CI≠check gotcha). BOTH required.
 * Exit 0 = pass, 1 = drift. `checkDirections` exported pure for tests.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_REL = 'knowledge/prompt-directions.yaml';

const NAME_RE = /^[a-z][a-z0-9-]*$/;
const MODEL_ID_RE = /^[a-z][a-z0-9.-]*$/;
const VALID_STATUSES = ['installed', 'registered-not-built'];
const VOCAB_AXES = ['modes', 'outputs', 'verbs', 'realism_levels'];

/** The three AI giveaways, pinned. Order is the priority order taught in the lesson. */
const REQUIRED_ANCHORS = ['skin', 'situational-lighting', 'camera-background'];

/** Phrases the source framework names explicitly as pushing images into fake territory. */
const REQUIRED_BANNED = ['cinematic masterpiece', 'hyper-detailed', 'ultra-glossy', 'perfect lighting'];

/** Per-parameter library files look like `NN-<slug>.md`; the index is `00-MASTER-REFERENCE.md`. */
const PARAM_FILE_RE = /^(?!00-)\d{2}-[a-z0-9-]+\.md$/;

function checkVocab(doc, axis, errs) {
  const list = doc[axis];
  if (!Array.isArray(list) || list.length === 0) { errs.push(`${axis}: must be a non-empty array`); return new Set(); }
  const ids = new Set();
  let defaults = 0;
  for (const e of list) {
    if (!e || typeof e !== 'object' || Array.isArray(e)) { errs.push(`${axis}: entry must be a mapping`); continue; }
    const id = typeof e.id === 'string' ? e.id : JSON.stringify(e.id);
    if (typeof e.id !== 'string' || !NAME_RE.test(e.id)) errs.push(`${axis} "${id}": id must be kebab-case`);
    else if (ids.has(e.id)) errs.push(`${axis} "${id}": duplicate id`);
    else ids.add(e.id);
    if (e.default === true) defaults += 1;
    if (axis === 'outputs') {
      if (!VALID_STATUSES.includes(e.status)) errs.push(`${axis} "${id}": status must be one of ${VALID_STATUSES.join('|')}`);
      if (e.status === 'registered-not-built' && (typeof e.reason !== 'string' || e.reason.length < 10)) {
        errs.push(`${axis} "${id}": registered-not-built requires a "reason" (honest refusal)`);
      }
    }
  }
  if (defaults !== 1) errs.push(`${axis}: must declare exactly one default (found ${defaults})`);
  return ids;
}

function checkAnchors(doc, errs) {
  const list = doc.realism_anchors;
  if (!Array.isArray(list)) { errs.push('realism_anchors: must be an array'); return; }
  if (list.length < REQUIRED_ANCHORS.length) {
    errs.push(`realism_anchors: must declare at least the ${REQUIRED_ANCHORS.length} pinned anchors (found ${list.length})`);
    // Do NOT return — fall through so the per-anchor loop below names WHICH anchor
    // is missing. "one of them is gone" is not actionable; "situational-lighting is
    // gone" is.
  }
  const ids = new Set();
  const ranks = new Set();
  for (const a of list) {
    if (!a || typeof a !== 'object' || Array.isArray(a)) { errs.push('realism_anchors: entry must be a mapping'); continue; }
    const id = typeof a.id === 'string' ? a.id : JSON.stringify(a.id);
    if (typeof a.id !== 'string' || !NAME_RE.test(a.id)) errs.push(`realism_anchors "${id}": id must be kebab-case`);
    else if (ids.has(a.id)) errs.push(`realism_anchors "${id}": duplicate id`);
    else ids.add(a.id);
    if (!Number.isInteger(a.rank) || a.rank < 1) errs.push(`realism_anchors "${id}": rank must be a positive integer`);
    else if (ranks.has(a.rank)) errs.push(`realism_anchors "${id}": duplicate rank ${a.rank}`);
    else ranks.add(a.rank);
    if (!Array.isArray(a.remedy_params) || a.remedy_params.length === 0) {
      errs.push(`realism_anchors "${id}": remedy_params must be a non-empty array`);
    }
  }
  for (const req of REQUIRED_ANCHORS) {
    if (!ids.has(req)) errs.push(`realism_anchors: missing pinned anchor "${req}" — the realism contract requires all of ${REQUIRED_ANCHORS.join(', ')}`);
  }
}

/**
 * Types are fixed-structure templates with slots. The load-bearing check is
 * SLOT COHERENCE: every slot the registry declares must actually exist as {{SLOT}}
 * in the template on disk, and the template must not carry a slot the registry
 * does not know about. A drifted slot means the skill silently emits a template
 * with an unfilled placeholder — a defect the user only discovers in the output.
 */
function checkTypes(doc, repoRoot, errs) {
  const list = doc.types;
  if (!Array.isArray(list) || list.length === 0) { errs.push('types: must be a non-empty array'); return new Set(); }

  const directionIds = new Set((Array.isArray(doc.directions) ? doc.directions : []).map((d) => d && d.id).filter(Boolean));
  const modeIds = new Set((Array.isArray(doc.modes) ? doc.modes : []).map((m) => m && m.id).filter(Boolean));
  const realismIds = new Set((Array.isArray(doc.realism_levels) ? doc.realism_levels : []).map((r) => r && r.id).filter(Boolean));
  const anchorIds = new Set((Array.isArray(doc.realism_anchors) ? doc.realism_anchors : []).map((a) => a && a.id).filter(Boolean));

  const ids = new Set();
  for (const t of list) {
    if (!t || typeof t !== 'object' || Array.isArray(t)) { errs.push('types: entry must be a mapping'); continue; }
    const id = typeof t.id === 'string' ? t.id : JSON.stringify(t.id);
    const tag = `type "${id}"`;

    if (typeof t.id !== 'string' || !NAME_RE.test(t.id)) errs.push(`${tag}: id must be kebab-case`);
    else if (ids.has(t.id)) errs.push(`${tag}: duplicate id`);
    else ids.add(t.id);

    if (!VALID_STATUSES.includes(t.status)) errs.push(`${tag}: status must be one of ${VALID_STATUSES.join('|')}`);

    for (const d of Array.isArray(t.directions) ? t.directions : []) {
      if (!directionIds.has(d)) errs.push(`${tag}: directions contains "${d}" which is not a registered direction`);
    }
    for (const m of Array.isArray(t.compatible_modes) ? t.compatible_modes : []) {
      if (!modeIds.has(m)) errs.push(`${tag}: compatible_modes contains "${m}" which is not a registered mode`);
    }
    if (t.realism_override !== undefined && !realismIds.has(t.realism_override)) {
      errs.push(`${tag}: realism_override "${t.realism_override}" is not a registered realism level`);
    }
    for (const a of Array.isArray(t.waives_anchors) ? t.waives_anchors : []) {
      if (!anchorIds.has(a)) errs.push(`${tag}: waives_anchors contains "${a}" which is not a pinned realism anchor`);
    }
    if (Array.isArray(t.waives_anchors) && t.waives_anchors.length > 0
      && (typeof t.waiver_reason !== 'string' || t.waiver_reason.trim().length < 20)) {
      errs.push(`${tag}: waives_anchors requires a substantive "waiver_reason" — silently dropping a pinned anchor is exactly what this registry exists to prevent`);
    }

    if (t.status === 'registered-not-built') {
      if (typeof t.reason_not_built !== 'string' || t.reason_not_built.length < 10) {
        errs.push(`${tag}: registered-not-built requires "reason_not_built" (honest refusal)`);
      }
      continue;
    }

    // ── installed ⇒ template + skill on disk, and slots must agree ──────────
    for (const key of ['template', 'skill']) {
      const rel = t[key];
      if (typeof rel !== 'string' || rel.length === 0) { errs.push(`${tag}: status=installed requires "${key}"`); continue; }
      if (!fs.existsSync(path.join(repoRoot, rel))) errs.push(`${tag}: ${key} not found on disk: ${rel} (status=installed ⇒ file must exist)`);
    }

    if (typeof t.template === 'string' && fs.existsSync(path.join(repoRoot, t.template))) {
      const body = fs.readFileSync(path.join(repoRoot, t.template), 'utf-8');
      const found = new Set((body.match(/\{\{([A-Z][A-Z0-9_]*)\}\}/g) || []).map((s) => s.slice(2, -2)));
      const declared = new Set(Array.isArray(t.slots) ? t.slots : []);
      for (const s of declared) {
        if (!found.has(s)) errs.push(`${tag}: declared slot {{${s}}} does not appear in ${t.template}`);
      }
      for (const s of found) {
        if (!declared.has(s)) errs.push(`${tag}: template contains slot {{${s}}} which the registry does not declare in slots[]`);
      }
      if (declared.size === 0) errs.push(`${tag}: status=installed requires a non-empty slots[]`);
    }
  }
  return ids;
}

function checkBanned(doc, errs) {
  const list = doc.banned_phrases;
  if (!Array.isArray(list) || list.length === 0) { errs.push('banned_phrases: must be a non-empty array'); return; }
  const lower = new Set(list.filter((p) => typeof p === 'string').map((p) => p.toLowerCase()));
  for (const req of REQUIRED_BANNED) {
    if (!lower.has(req)) errs.push(`banned_phrases: missing "${req}" — named explicitly by the source framework`);
  }
}

function countLibraryParamFiles(repoRoot, libraryPath) {
  const abs = path.join(repoRoot, libraryPath);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) return null;
  return fs.readdirSync(abs).filter((f) => PARAM_FILE_RE.test(f)).length;
}

/** Pure validation. Returns string[] (empty = valid). */
function checkDirections(doc, repoRoot) {
  const errs = [];
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) return ['prompt-directions.yaml root must be a mapping'];

  const vocab = {};
  for (const axis of VOCAB_AXES) vocab[axis] = checkVocab(doc, axis, errs);
  checkAnchors(doc, errs);
  checkBanned(doc, errs);
  const installedTypes = new Set(
    (Array.isArray(doc.types) ? doc.types : []).filter((t) => t && t.status === 'installed').map((t) => t.id),
  );
  const typeIds = checkTypes(doc, repoRoot, errs);

  // Outputs a direction may advertise = only those actually installed.
  const installedOutputs = new Set(
    (Array.isArray(doc.outputs) ? doc.outputs : []).filter((o) => o && o.status === 'installed').map((o) => o.id),
  );

  const list = doc.directions;
  if (!Array.isArray(list)) return errs.concat(['prompt-directions.yaml: directions must be an array']);
  if (list.length === 0) return errs.concat(['prompt-directions.yaml: directions is empty']);

  const seen = new Set();
  let defaultDirections = 0;

  for (const d of list) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) { errs.push('directions: entry must be a mapping'); continue; }
    const id = typeof d.id === 'string' ? d.id : JSON.stringify(d.id);
    const tag = `direction "${id}"`;

    if (typeof d.id !== 'string' || !NAME_RE.test(d.id)) errs.push(`${tag}: id must be kebab-case`);
    else if (seen.has(d.id)) errs.push(`${tag}: duplicate id`);
    else seen.add(d.id);

    if (!VALID_STATUSES.includes(d.status)) errs.push(`${tag}: status must be one of ${VALID_STATUSES.join('|')}`);
    if (d.default === true) defaultDirections += 1;

    for (const m of Array.isArray(d.supported_modes) ? d.supported_modes : []) {
      if (!vocab.modes.has(m)) errs.push(`${tag}: supported_modes contains "${m}" which is not a registered mode`);
    }
    for (const o of Array.isArray(d.supported_outputs) ? d.supported_outputs : []) {
      if (!vocab.outputs.has(o)) errs.push(`${tag}: supported_outputs contains "${o}" which is not a registered output`);
      else if (!installedOutputs.has(o)) errs.push(`${tag}: supported_outputs advertises "${o}" but that output is registered-not-built`);
    }
    // supported_types must be reciprocal: the direction lists the type AND the type
    // lists the direction. A one-sided link means /prompt refuses a --type the
    // command doc advertises.
    for (const ty of Array.isArray(d.supported_types) ? d.supported_types : []) {
      if (!typeIds.has(ty)) errs.push(`${tag}: supported_types contains "${ty}" which is not a registered type`);
      else if (!installedTypes.has(ty)) errs.push(`${tag}: supported_types advertises "${ty}" but that type is registered-not-built`);
      else {
        const t = doc.types.find((x) => x.id === ty);
        if (t && Array.isArray(t.directions) && !t.directions.includes(d.id)) {
          errs.push(`${tag}: supported_types lists "${ty}" but type "${ty}" does not list direction "${d.id}" — the link must be reciprocal`);
        }
      }
    }

    if (d.status === 'registered-not-built') {
      if (typeof d.reason_not_built !== 'string' || d.reason_not_built.length < 10) {
        errs.push(`${tag}: registered-not-built requires "reason_not_built" (honest refusal)`);
      }
      continue; // stubs need nothing on disk
    }

    // ── installed ⇒ everything must exist on disk ──────────────────────────
    for (const key of ['skill', 'library_index', 'realism_playbook']) {
      const rel = d[key];
      if (typeof rel !== 'string' || rel.length === 0) { errs.push(`${tag}: status=installed requires "${key}"`); continue; }
      if (!fs.existsSync(path.join(repoRoot, rel))) errs.push(`${tag}: ${key} not found on disk: ${rel} (status=installed ⇒ file must exist)`);
    }
    if (typeof d.library_path !== 'string' || !fs.existsSync(path.join(repoRoot, d.library_path))) {
      errs.push(`${tag}: library_path not found on disk: ${d.library_path}`);
    } else if (Number.isInteger(d.param_count)) {
      const onDisk = countLibraryParamFiles(repoRoot, d.library_path);
      if (onDisk !== null && onDisk !== d.param_count) {
        errs.push(`${tag}: param_count=${d.param_count} but ${onDisk} per-parameter file(s) on disk in ${d.library_path} — library drifted from its declared count`);
      }
    }

    const models = d.models;
    if (!Array.isArray(models) || models.length === 0) {
      errs.push(`${tag}: status=installed requires a non-empty models[]`);
    } else {
      const mIds = new Set();
      let mDefaults = 0;
      for (const m of models) {
        if (!m || typeof m !== 'object' || Array.isArray(m)) { errs.push(`${tag}: models entry must be a mapping`); continue; }
        const mid = typeof m.id === 'string' ? m.id : JSON.stringify(m.id);
        if (typeof m.id !== 'string' || !MODEL_ID_RE.test(m.id)) errs.push(`${tag} model "${mid}": id must be kebab-case`);
        else if (mIds.has(m.id)) errs.push(`${tag} model "${mid}": duplicate id`);
        else mIds.add(m.id);
        if (!['prose', 'prose-plus-params'].includes(m.syntax)) errs.push(`${tag} model "${mid}": syntax must be prose|prose-plus-params`);
        if (m.syntax === 'prose-plus-params' && (!Array.isArray(m.param_flags) || m.param_flags.length === 0)) {
          errs.push(`${tag} model "${mid}": syntax=prose-plus-params requires param_flags[]`);
        }
        if (m.realism_keyword !== undefined && !['start', 'end'].includes(m.keyword_position)) {
          errs.push(`${tag} model "${mid}": realism_keyword requires keyword_position start|end`);
        }
        if (m.default === true) mDefaults += 1;
      }
      if (mDefaults !== 1) errs.push(`${tag}: models must declare exactly one default (found ${mDefaults})`);
    }
  }

  if (defaultDirections !== 1) errs.push(`directions: must declare exactly one default (found ${defaultDirections})`);
  return errs;
}

function main() {
  const REGISTRY = path.join(REPO_ROOT, REGISTRY_REL);
  if (!fs.existsSync(REGISTRY)) { console.error(`[FAIL] ${REGISTRY_REL} missing. (capability prompt-platform v0.1)`); process.exit(1); }
  let doc;
  try { doc = yaml.load(fs.readFileSync(REGISTRY, 'utf-8')) || {}; } catch (e) { console.error(`[FAIL] prompt-directions.yaml YAML parse error: ${e.message}`); process.exit(1); }
  const errs = checkDirections(doc, REPO_ROOT);
  if (errs.length) { console.error(`[FAIL] prompt-directions.yaml: ${errs.length} error(s):`); errs.forEach((m) => console.error(`  - ${m}`)); process.exit(1); }
  const nt = doc.types.length;
  const it = doc.types.filter((t) => t.status === 'installed').length;
  const n = doc.directions.length;
  const installed = doc.directions.filter((d) => d.status === 'installed').length;
  const anchors = doc.realism_anchors.length;
  console.log(`[OK] prompt-directions.yaml — ${n} direction(s) (${installed} installed), ${anchors} realism anchors pinned, ${doc.banned_phrases.length} banned phrases, skills + library on disk, ${nt} type(s) (${it} installed) with slots matching their templates.`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { checkDirections, checkTypes, REQUIRED_ANCHORS, REQUIRED_BANNED, VALID_STATUSES, VOCAB_AXES, REGISTRY_REL };
