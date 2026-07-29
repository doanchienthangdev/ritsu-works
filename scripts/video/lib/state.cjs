#!/usr/bin/env node
'use strict';
/**
 * scripts/video/lib/state.cjs — run.json, the SLOT-level pipeline state
 * (capability video-platform, Sprint 2)
 *
 * WHY SLOT-LEVEL, NOT STAGE-LEVEL. A coarse `stage: "composing"` enum does not
 * survive the hand-off, because the blocking condition is per-ASSET, not
 * per-stage: "waiting on 4 of 22 screen captures". Stage is kept for display
 * only; slots carry the truth.
 *
 * WHY RECONCILE INSTEAD OF TRUST. The founder's sync contract commits the text
 * artifacts and gitignores assets/ build/ out/. So a teammate who clones the
 * repo sees `stage: "composed"` with ZERO media on disk. Recorded state is a
 * hint; the disk is the authority. reconcile() re-probes every slot, compares
 * checksums, and downgrades anything that is no longer there.
 *
 * NO ops.* TABLE IN v0.1 — the same Option A+ precedent /voice and /image took
 * (SOP-AIOPS-014 observability.v0_1). These fields are a forward-compatible
 * superset of a future ops.video_runs, so promoting it later is INSERT-wiring,
 * not rework. Cost attribution is already served by ops.cost_attributions plus
 * the ai-ops-video bucket.
 *
 * run.json IS COMMITTED (a few KB). Without it a teammate opening the repo has
 * no idea what stage a production is in.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const RUN_FILE = 'run.json';
const STATE_VERSION = 1;

/** Slot lifecycle. Ordered — later states imply the earlier ones held. */
const SLOT_STATES = Object.freeze(['requested', 'supplied', 'prepped', 'placed']);

/** Coarse pipeline stage. Display only; never the basis of a resume decision. */
const STAGES = Object.freeze(['scaffolded', 'scripted', 'gathering', 'composing', 'rendered', 'verified', 'published']);

function nowIso() { return new Date().toISOString(); }

function sha256(file) {
  try {
    const h = crypto.createHash('sha256');
    h.update(fs.readFileSync(file));
    return h.digest('hex');
  } catch { return null; }
}

/** Media duration in seconds via ffprobe; null when unavailable. */
function probeDuration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf-8' });
  if (r.error || r.status !== 0) return null;
  const v = Number(String(r.stdout).trim());
  return Number.isFinite(v) ? +v.toFixed(3) : null;
}

function runPath(projectDir) { return path.join(projectDir, RUN_FILE); }

function create({ slug, type, typeSpec = {}, style = 'ritsu' }) {
  return {
    state_version: STATE_VERSION,
    slug,
    type,
    style,
    created_at: nowIso(),
    updated_at: nowIso(),
    stage: 'scaffolded',
    resolution: typeSpec.resolution || null,
    fps: typeSpec.fps || null,
    aspect: typeSpec.aspect || null,
    beats: [],
    slots: [],
    gates: [],
    renders: [],
    cost: { spent_usd: 0, entries: [] },
  };
}

function load(projectDir) {
  const fp = runPath(projectDir);
  if (!fs.existsSync(fp)) return null;
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); } catch { return null; }
}

function save(projectDir, state) {
  state.updated_at = nowIso();
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(runPath(projectDir), `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
  return state;
}

/** Add or replace a slot by code. */
function upsertSlot(state, slot) {
  const i = state.slots.findIndex((s) => s.code === slot.code);
  const base = {
    code: slot.code,
    kind: slot.kind,
    beat: slot.beat ?? null,
    state: 'requested',
    spec: slot.spec || {},
    source_path: null,
    prepped_path: null,
    sha256: null,
    bytes: null,
    duration_s: null,
    supplied_at: null,
    prepped_at: null,
  };
  const merged = i === -1 ? { ...base, ...slot } : { ...state.slots[i], ...slot };
  if (i === -1) state.slots.push(merged); else state.slots[i] = merged;
  return merged;
}

function recordGate(state, id, passed, evidence = {}) {
  const entry = { id, state: passed ? 'pass' : 'fail', evidence, at: nowIso() };
  const i = state.gates.findIndex((g) => g.id === id);
  if (i === -1) state.gates.push(entry); else state.gates[i] = entry;
  return entry;
}

function recordCost(state, { stage, usd, detail }) {
  state.cost.entries.push({ stage, usd: +Number(usd || 0).toFixed(4), detail: detail || null, at: nowIso() });
  state.cost.spent_usd = +state.cost.entries.reduce((a, e) => a + e.usd, 0).toFixed(4);
  return state.cost.spent_usd;
}

/**
 * RECONCILE — the heart of --resume. Never trusts recorded state.
 *
 * For every slot: probe the recorded path. If the file is gone, downgrade to
 * `requested`. If it is present but its checksum changed, re-stamp it and
 * downgrade `placed`/`prepped` back to `supplied` so downstream stages re-run.
 * A render verdict survives only while its mp4 checksum still matches.
 */
function reconcile(projectDir, state, { rehash = true } = {}) {
  const changes = [];

  for (const slot of state.slots) {
    const target = slot.prepped_path || slot.source_path;
    if (!target) {
      if (slot.state !== 'requested') { changes.push(`${slot.code}: ${slot.state} → requested (no path recorded)`); slot.state = 'requested'; }
      continue;
    }
    const abs = path.isAbsolute(target) ? target : path.join(projectDir, target);
    if (!fs.existsSync(abs)) {
      if (slot.state !== 'requested') {
        changes.push(`${slot.code}: ${slot.state} → requested (file missing: ${target})`);
        slot.state = 'requested';
        slot.prepped_path = null;
        slot.sha256 = null;
      }
      continue;
    }
    if (rehash) {
      const h = sha256(abs);
      if (slot.sha256 && h && h !== slot.sha256) {
        changes.push(`${slot.code}: content changed on disk → re-prep required`);
        slot.state = 'supplied';
        slot.prepped_path = null;
      }
      slot.sha256 = h;
      try { slot.bytes = fs.statSync(abs).size; } catch { /* keep */ }
    }
  }

  for (const r of state.renders) {
    const abs = path.isAbsolute(r.path) ? r.path : path.join(projectDir, r.path);
    if (!fs.existsSync(abs)) {
      if (r.verdict !== 'stale') { changes.push(`render ${r.path}: verdict invalidated (file missing)`); r.verdict = 'stale'; }
      continue;
    }
    const h = sha256(abs);
    if (r.sha256 && h && h !== r.sha256) {
      changes.push(`render ${r.path}: verdict invalidated (content changed)`);
      r.verdict = 'stale';
    }
  }

  return { state, changes };
}

/** What is blocking progress right now, grouped by slot kind. */
function blockers(state) {
  const missing = state.slots.filter((s) => s.state === 'requested');
  const byKind = new Map();
  for (const s of missing) {
    if (!byKind.has(s.kind)) byKind.set(s.kind, []);
    byKind.get(s.kind).push(s.code);
  }
  return {
    total: state.slots.length,
    ready: state.slots.length - missing.length,
    missing: missing.length,
    by_kind: Object.fromEntries([...byKind].map(([k, v]) => [k, v])),
  };
}

/** Human-readable resume plan — printed by `/video --resume`. */
function resumePlan(state) {
  const b = blockers(state);
  const lines = [];
  lines.push(`${state.slug} · type=${state.type} · stage=${state.stage}`);
  lines.push(`assets  ${b.ready}/${b.total} present, ${b.missing} missing`);
  for (const [kind, codes] of Object.entries(b.by_kind)) {
    lines.push(`   ${kind.padEnd(8)} missing: ${codes.join(', ')}`);
  }
  const failed = state.gates.filter((g) => g.state === 'fail');
  if (failed.length) lines.push(`gates   ${failed.length} failing: ${failed.map((g) => g.id).join(', ')}`);
  const good = state.renders.filter((r) => r.verdict === 'pass');
  lines.push(`renders ${good.length} verified, ${state.renders.length - good.length} stale/failed`);
  return lines.join('\n');
}

module.exports = {
  RUN_FILE, STATE_VERSION, SLOT_STATES, STAGES,
  create, load, save, runPath,
  upsertSlot, recordGate, recordCost,
  reconcile, blockers, resumePlan,
  sha256, probeDuration,
};
