#!/usr/bin/env node
'use strict';
/**
 * scripts/video/gates/check-loudness.cjs — narration loudness gate (capability video-platform)
 *
 * LESSON #1, mechanised. On the reference production HeyGen avatar audio arrived
 * 2–4.6 LU quieter than ElevenLabs TTS (worst seam: VO-11 −13.1 vs AV-03 −17.7).
 * The film audibly jumped at every avatar↔voice-over cut. The founder heard it
 * before any tool did — this gate is that ear, made deterministic.
 *
 * REUSE, DO NOT REIMPLEMENT. scripts/voice/lib/audio.cjs already exports
 * measureLoudness / normalizeLoudness / stitchAudio / LEVELING_CHAIN and its
 * DEFAULT_LUFS is literally { i: -16, tp: -1.5, lra: 4 } — the exact target this
 * lesson demands, built for /voice v0.3.1. This file is a thin gate over it; the
 * same in-place-require pattern /image uses on the deepask helpers.
 *
 * Usage:
 *   node scripts/video/gates/check-loudness.cjs --files=a.mp3,b.mp3 [--type=explainer] [--json]
 *   node scripts/video/gates/check-loudness.cjs --dir=video/projects/<slug>/assets/voice [--json]
 *   node scripts/video/gates/check-loudness.cjs --master=out/film.mp4 [--json]
 *
 * Exit 0 = every source within tolerance, 1 = drift, 2 = usage/environment error.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const {
  NARRATION_TARGET_LUFS, NARRATION_MAX_TRUE_PEAK, LOUDNESS_TOLERANCE_LU,
} = require('../lib/params.cjs');

// The reuse. If this require ever breaks, fix the seam — do not inline a copy.
const { measureLoudness, ffmpegAvailable, DEFAULT_LUFS } = require('../../voice/lib/audio.cjs');

const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.opus', '.ogg', '.mp4', '.mov', '.webm']);

function parseArgs(argv) {
  const out = { json: false, files: [] };
  for (const a of argv) {
    if (a === '--json') out.json = true;
    else if (a.startsWith('--files=')) out.files = a.slice(8).split(',').map((s) => s.trim()).filter(Boolean);
    else if (a.startsWith('--dir=')) out.dir = a.slice(6);
    else if (a.startsWith('--master=')) out.master = a.slice(9);
    else if (a.startsWith('--type=')) out.type = a.slice(7);
    else if (a.startsWith('--target-lufs=')) out.target = Number(a.slice(14));
    else if (a.startsWith('--true-peak=')) out.tp = Number(a.slice(12));
    else if (a.startsWith('--tolerance=')) out.tol = Number(a.slice(12));
  }
  return out;
}

function loadTypeNarration(typeId) {
  const fallback = { target_lufs: NARRATION_TARGET_LUFS, true_peak: NARRATION_MAX_TRUE_PEAK };
  if (!typeId) return fallback;
  let yaml; try { yaml = require('js-yaml'); } catch { return fallback; }
  const fp = path.join(REPO_ROOT, 'knowledge', 'video-types.yaml');
  if (!fs.existsSync(fp)) return fallback;
  let doc; try { doc = yaml.load(fs.readFileSync(fp, 'utf-8')) || {}; } catch { return fallback; }
  const list = Array.isArray(doc.types) ? doc.types : [];
  const t = list.find((e) => e && (e.id === typeId || (Array.isArray(e.aliases) && e.aliases.includes(typeId))));
  return t && t.narration ? { target_lufs: t.narration.target_lufs, true_peak: t.narration.true_peak } : fallback;
}

function collect(args) {
  const files = [];
  for (const f of args.files) files.push(path.resolve(process.cwd(), f));
  if (args.dir) {
    const d = path.resolve(process.cwd(), args.dir);
    if (fs.existsSync(d) && fs.statSync(d).isDirectory()) {
      for (const n of fs.readdirSync(d).sort()) {
        if (AUDIO_EXT.has(path.extname(n).toLowerCase())) files.push(path.join(d, n));
      }
    }
  }
  if (args.master) files.push(path.resolve(process.cwd(), args.master));
  return files;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.files.length && !args.dir && !args.master) {
    console.error('usage: check-loudness.cjs (--files=a,b | --dir=<d> | --master=<f>) [--type=<id>] [--json]');
    process.exit(2);
  }
  if (!ffmpegAvailable()) {
    console.error('[ERROR] ffmpeg not on PATH — cannot measure loudness.');
    process.exit(2);
  }

  const spec = loadTypeNarration(args.type);
  const target = Number.isFinite(args.target) ? args.target : spec.target_lufs;
  const maxTp = Number.isFinite(args.tp) ? args.tp : spec.true_peak;
  const tol = Number.isFinite(args.tol) ? args.tol : LOUDNESS_TOLERANCE_LU;

  const files = collect(args);
  if (!files.length) { console.error('[FAIL] no audio files found to measure.'); process.exit(1); }

  const rows = [];
  const findings = [];
  for (const f of files) {
    const rel = path.relative(process.cwd(), f);
    if (!fs.existsSync(f)) { findings.push(`${rel}: file not found`); rows.push({ file: rel, error: 'not found' }); continue; }
    const m = measureLoudness(f, { i: target, tp: maxTp, lra: DEFAULT_LUFS.lra });
    if (!m || !Number.isFinite(Number(m.input_i))) {
      findings.push(`${rel}: loudness measurement failed (no audio stream?)`);
      rows.push({ file: rel, error: 'measure failed' });
      continue;
    }
    const I = Number(m.input_i);
    const TP = Number(m.input_tp);
    const dI = I - target;
    const iOk = Math.abs(dI) <= tol;
    const tpOk = !Number.isFinite(TP) || TP <= maxTp + 0.05; // 0.05 dB measurement slack
    if (!iOk) findings.push(`${rel}: ${I.toFixed(1)} LUFS is ${dI > 0 ? '+' : ''}${dI.toFixed(1)} LU off the ${target} target (tolerance ±${tol})`);
    if (!tpOk) findings.push(`${rel}: true peak ${TP.toFixed(1)} dBTP exceeds ${maxTp}`);
    rows.push({ file: rel, lufs: +I.toFixed(1), true_peak: Number.isFinite(TP) ? +TP.toFixed(1) : null, delta_lu: +dI.toFixed(1), pass: iOk && tpOk });
  }

  // The seam check: even if every file is individually in tolerance, a wide SPREAD
  // between sources is what the ear catches at a cut.
  const measured = rows.filter((r) => Number.isFinite(r.lufs)).map((r) => r.lufs);
  let spread = null;
  if (measured.length > 1) {
    spread = +(Math.max(...measured) - Math.min(...measured)).toFixed(1);
    if (spread > tol * 2) {
      findings.push(`sources span ${spread} LU (${Math.min(...measured)} … ${Math.max(...measured)}) — the film will jump at cuts between them`);
    }
  }

  const pass = findings.length === 0;
  const result = { ok: pass, target_lufs: target, max_true_peak: maxTp, tolerance_lu: tol, spread_lu: spread, sources: rows, findings };

  if (args.json) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`target ${target} LUFS / ≤${maxTp} dBTP  (tolerance ±${tol} LU)`);
    for (const r of rows) {
      if (r.error) console.log(`   ?  ${r.file.padEnd(46)} ${r.error}`);
      else console.log(`   ${r.pass ? '✓' : '✗'}  ${r.file.padEnd(46)} ${String(r.lufs).padStart(6)} LUFS  tp ${String(r.true_peak).padStart(5)}  Δ${r.delta_lu > 0 ? '+' : ''}${r.delta_lu}`);
    }
    if (spread !== null) console.log(`spread ${spread} LU across ${measured.length} sources`);
    if (pass) console.log('\n[PASS] narration loudness within tolerance');
    else {
      console.error(`\n[FAIL] ${findings.length} finding(s):`);
      for (const f of findings) console.error('  - ' + f);
    }
  }
  process.exit(pass ? 0 : 1);
}

if (require.main === module) main();
module.exports = { parseArgs, loadTypeNarration, collect };
