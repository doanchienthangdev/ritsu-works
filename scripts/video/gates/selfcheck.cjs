#!/usr/bin/env node
'use strict';
/**
 * scripts/video/gates/selfcheck.cjs — /video toolchain doctor (capability video-platform)
 *
 * The probe that stops the broken promise: without it a co-founder runs
 * /install-ritsu-works, watches /test-ritsu-works report SUCCESS, and still has a
 * machine where /video cannot run — because the HyperFrames skills live OUTSIDE the
 * repo (~/.claude/skills, installed globally by `npx skills add`) and nothing pinned,
 * installed or verified them.
 *
 * Also probes ffmpeg FILTER capability rather than assuming: this machine's build has
 * no `drawtext`, which we discovered mid-production. /video selects a text strategy
 * from what is actually present.
 *
 * `/video` runs this at start and fails LOUDLY rather than half-running.
 * The local-install `video` test group runs it too.
 *
 * Usage: node scripts/video/gates/selfcheck.cjs [--json] [--strict]
 *   default : hard requirements must pass; optional ones report as notes
 *   --strict : optional requirements (HeyGen auth) also become failures
 *
 * Exit 0 = usable, 1 = a hard requirement is missing.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf-8', timeout: 60000, ...opts });
  return { ok: !r.error && r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}`, status: r.status };
}

const checks = [];
function record(id, label, hard, ok, detail, remedy) {
  checks.push({ id, label, hard, ok, detail, remedy });
}

// ── 1. Node >= 22 (hyperframes-cli requires it) ────────────────────────────
{
  const major = Number(process.versions.node.split('.')[0]);
  record('node', 'Node >= 22', true, major >= 22,
    `node ${process.versions.node}`,
    'Install Node 22+ (nvm install 22 / brew install node).');
}

// ── 2. ffmpeg + ffprobe ────────────────────────────────────────────────────
{
  const f = sh('ffmpeg', ['-version']);
  const p = sh('ffprobe', ['-version']);
  const ver = f.ok ? (f.out.split('\n')[0] || '').replace('ffmpeg version ', '').split(' ')[0] : 'absent';
  record('ffmpeg', 'ffmpeg + ffprobe', true, f.ok && p.ok,
    f.ok ? `ffmpeg ${ver}${p.ok ? ' + ffprobe' : ' (ffprobe MISSING)'}` : 'not on PATH',
    'brew install ffmpeg  (or apt-get install ffmpeg).');
}

// ── 3. ffmpeg FILTER capability — probe, do not assume ─────────────────────
// `drawtext` is genuinely absent on this machine. /video must know, not remember.
{
  const r = sh('ffmpeg', ['-hide_banner', '-filters']);
  const have = (name) => new RegExp(`^\\s*[A-Z.]+\\s+${name}\\s`, 'm').test(r.out);
  const required = ['scale', 'crop', 'format'];
  const optional = ['drawtext', 'signalstats', 'blackdetect', 'tile', 'loudnorm'];
  const missingRequired = r.ok ? required.filter((f) => !have(f)) : required;
  const presentOptional = r.ok ? optional.filter((f) => have(f)) : [];
  const absentOptional = r.ok ? optional.filter((f) => !have(f)) : optional;
  record('ffmpeg-filters', 'ffmpeg filters (scale/crop/format required)', true,
    r.ok && missingRequired.length === 0,
    r.ok
      ? `present: ${presentOptional.join(', ') || '(none of the optional set)'}` +
        (absentOptional.length ? ` · absent: ${absentOptional.join(', ')}` : '')
      : 'could not list filters',
    'Reinstall ffmpeg with a fuller build (brew install ffmpeg).');
}

// ── 4. HyperFrames CLI ─────────────────────────────────────────────────────
{
  const r = sh('npx', ['--yes', 'hyperframes', '--version'], { cwd: REPO_ROOT });
  const ver = (r.out.match(/\d+\.\d+\.\d+/) || [])[0] || null;
  record('hyperframes-cli', 'HyperFrames CLI', true, r.ok && !!ver,
    ver ? `hyperframes ${ver}` : 'not resolvable via npx',
    'npx --yes skills add heygen-com/hyperframes');
}

// ── 5. HyperFrames authoring skills (the out-of-repo dependency) ───────────
{
  const roots = [
    path.join(os.homedir(), '.claude', 'skills'),
    path.join(os.homedir(), '.agents', 'skills'),
  ];
  const needed = ['hyperframes', 'hyperframes-core', 'hyperframes-cli'];
  let found = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    found = needed.filter((n) => fs.existsSync(path.join(root, n, 'SKILL.md')));
    if (found.length === needed.length) break;
  }
  record('hyperframes-skills', 'HyperFrames authoring skills', true, found.length === needed.length,
    found.length ? `${found.length}/${needed.length} present (${found.join(', ')})` : 'none found in ~/.claude/skills',
    'npx --yes skills add heygen-com/hyperframes');
}

// ── 6. HeyGen CLI + auth (optional — degrades to hand-off) ─────────────────
{
  const bin = sh('heygen', ['--version']);
  let authed = false, detail = 'heygen CLI not on PATH';
  if (bin.ok) {
    const a = sh('heygen', ['auth', 'status']);
    authed = a.ok && /"email"|"plan"/.test(a.out);
    detail = authed ? 'CLI present + authenticated' : 'CLI present, NOT authenticated';
  }
  record('heygen', 'HeyGen CLI (avatar + audio catalog)', false, bin.ok && authed, detail,
    'Install from https://heygen.com then: heygen auth login --oauth . Without it, /video hands off avatar + music stages instead of generating them.');
}

// ── 7. The gates themselves are present ────────────────────────────────────
{
  const gates = ['check-loudness.cjs', 'lint-stage-video.cjs', 'verify-render.cjs'];
  const missing = gates.filter((g) => !fs.existsSync(path.join(__dirname, g)));
  record('gates', '/video QC gates on disk', true, missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : `${gates.length}/3 present`,
    'Re-pull the repo (/update-ritsu-works).');
}

// ── 8. The type registry resolves ──────────────────────────────────────────
{
  let ok = false, detail = 'knowledge/video-types.yaml unreadable';
  try {
    const yaml = require('js-yaml');
    const doc = yaml.load(fs.readFileSync(path.join(REPO_ROOT, 'knowledge', 'video-types.yaml'), 'utf-8')) || {};
    const types = Array.isArray(doc.types) ? doc.types : [];
    const installed = types.filter((t) => t && t.status === 'installed');
    ok = installed.length > 0;
    detail = `${types.length} types (${installed.length} installed)`;
  } catch (e) { detail = String(e.message || e); }
  record('registry', 'video-types registry', true, ok, detail, 'Re-pull the repo (/update-ritsu-works).');
}

// ── report ─────────────────────────────────────────────────────────────────
const strict = process.argv.includes('--strict');
const json = process.argv.includes('--json');
const failed = checks.filter((c) => !c.ok && (c.hard || strict));
const notes = checks.filter((c) => !c.ok && !c.hard && !strict);

if (json) {
  console.log(JSON.stringify({ ok: failed.length === 0, checks, failed: failed.map((f) => f.id) }, null, 2));
} else {
  for (const c of checks) {
    const mark = c.ok ? '✓' : (c.hard || strict ? '✗' : '○');
    console.log(`  ${mark} ${c.label.padEnd(46)} ${c.detail}`);
  }
  if (failed.length) {
    console.error(`\n[FAIL] ${failed.length} requirement(s) missing — /video cannot run:`);
    for (const f of failed) console.error(`  · ${f.label}\n      → ${f.remedy}`);
  } else {
    if (notes.length) {
      console.log(`\n[NOTE] ${notes.length} optional capability absent — those stages will hand off instead of generating:`);
      for (const n of notes) console.log(`  · ${n.label} — ${n.remedy}`);
    }
    console.log('\n[PASS] /video toolchain usable');
  }
}
process.exit(failed.length ? 1 : 0);
