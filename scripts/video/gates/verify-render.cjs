#!/usr/bin/env node
'use strict';
/**
 * scripts/video/gates/verify-render.cjs — THE KEYSTONE GATE (capability video-platform)
 *
 * Verifies a FINISHED mp4. This is the only gate that catches the failure class that
 * `hyperframes check` and `hyperframes snapshot` both pass:
 *
 *   Multiple <video> sharing one HyperFrames stage wrapper must be position:absolute.
 *   In normal flow each height:100% box stacks vertically and overflow:hidden clips
 *   every clip after the first — they render COMPLETELY BLANK. check ✓ snapshot ✓ render ✗.
 *
 * Two deterministic tells, both derived empirically from the reference production
 * (ritsu-product-launch, 2026-07-29):
 *
 *   1. BITRATE FLOOR.  58 MB / 175 s ≈ 2.6 Mbps (broken, stages blank)
 *                      93 MB / 175 s ≈ 4.3 Mbps (correct)
 *      A heuristic — stated as such — but it is the tell that actually fired, and it
 *      costs one ffprobe call.
 *
 *   2. BLANK-SEGMENT DETECTION.  Sample frames inside time ranges that MUST carry live
 *      video, crop to the region, and measure luminance std-dev. Measured on the real
 *      render: product window with UI = 19.64 / 19.35; flat control (letterbox bar) = 3.77.
 *      ~5x separation; the registry's min_region_stddev (default 8) separates cleanly.
 *
 * Environment notes (this machine): ffmpeg has NO `drawtext`; `ffprobe -f lavfi -i movie=`
 * returned nothing, so the reliable route is an ffmpeg rawvideo pipe → std-dev in Node.
 *
 * Usage:
 *   node scripts/video/gates/verify-render.cjs --render=out/film.mp4 --type=explainer
 *        [--regions=regions.json] [--filmstrip=out/filmstrip.jpg] [--json] [--no-filmstrip-required]
 *
 *   regions.json: [{ "label":"b4 product window", "t":47, "rect":"1600:900:160:92" }, ...]
 *   rect is ffmpeg crop geometry  w:h:x:y.  Omit --regions and the gate samples the
 *   full frame at evenly spaced points (catches an all-blank render, not a partial one).
 *
 * Exit 0 = pass, 1 = fail, 2 = usage/environment error.
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const { GATE_DEFAULTS } = require('../lib/params.cjs');

// ── arg parsing ────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { json: false, filmstripRequired: null };
  for (const a of argv) {
    if (a === '--json') out.json = true;
    else if (a === '--no-filmstrip-required') out.filmstripRequired = false;
    else if (a.startsWith('--render=')) out.render = a.slice(9);
    else if (a.startsWith('--type=')) out.type = a.slice(7);
    else if (a.startsWith('--regions=')) out.regions = a.slice(10);
    else if (a.startsWith('--filmstrip=')) out.filmstrip = a.slice(12);
    else if (a.startsWith('--min-bitrate-kbps=')) out.minBitrate = Number(a.slice(19));
    else if (a.startsWith('--min-region-stddev=')) out.minStddev = Number(a.slice(20));
  }
  return out;
}

// ── registry ───────────────────────────────────────────────────────────────
function loadTypeGates(typeId) {
  if (!typeId) return { ...GATE_DEFAULTS };
  let yaml;
  try { yaml = require('js-yaml'); } catch { return { ...GATE_DEFAULTS }; }
  const fp = path.join(REPO_ROOT, 'knowledge', 'video-types.yaml');
  if (!fs.existsSync(fp)) return { ...GATE_DEFAULTS };
  let doc;
  try { doc = yaml.load(fs.readFileSync(fp, 'utf-8')) || {}; } catch { return { ...GATE_DEFAULTS }; }
  const list = Array.isArray(doc.types) ? doc.types : [];
  const t = list.find((e) => e && (e.id === typeId || (Array.isArray(e.aliases) && e.aliases.includes(typeId))));
  if (!t || !t.gates) return { ...GATE_DEFAULTS };
  return { ...GATE_DEFAULTS, ...t.gates };
}

// ── ffprobe / ffmpeg ───────────────────────────────────────────────────────
function haveBin(bin) {
  const r = spawnSync(bin, ['-version'], { encoding: 'utf-8' });
  return !r.error && r.status === 0;
}

function probe(file) {
  const r = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration,size',
    '-show_entries', 'stream=codec_type,width,height,r_frame_rate',
    '-of', 'json', file,
  ], { encoding: 'utf-8', maxBuffer: 1 << 22 });
  if (r.error || r.status !== 0) return null;
  try { return JSON.parse(r.stdout); } catch { return null; }
}

/**
 * Luminance std-dev of one frame region, via an ffmpeg rawvideo pipe.
 * Downscaling to 160x90 keeps this O(14k bytes) per sample and is scale-invariant
 * for the "is this region flat?" question.
 */
function regionStddev(file, t, rect) {
  const vf = [rect ? `crop=${rect}` : null, 'scale=160:90', 'format=gray'].filter(Boolean).join(',');
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error',
    '-ss', String(t), '-i', file, '-frames:v', '1',
    '-vf', vf, '-f', 'rawvideo', '-',
  ], { encoding: 'buffer', maxBuffer: 1 << 24 });
  if (r.error || r.status !== 0 || !r.stdout || r.stdout.length === 0) return null;
  const b = r.stdout;
  let sum = 0;
  for (let i = 0; i < b.length; i++) sum += b[i];
  const mean = sum / b.length;
  let acc = 0;
  for (let i = 0; i < b.length; i++) { const d = b[i] - mean; acc += d * d; }
  return { stddev: Math.sqrt(acc / b.length), mean, samples: b.length };
}

function buildFilmstrip(file, outPath, frames, duration) {
  const cols = Math.min(6, Math.max(1, Math.round(Math.sqrt(frames))));
  const rows = Math.ceil(frames / cols);
  const fps = frames / Math.max(duration, 0.001);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const r = spawnSync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', file,
    '-vf', `fps=${fps.toFixed(6)},scale=320:-1,tile=${cols}x${rows}`,
    '-frames:v', '1', outPath,
  ], { encoding: 'utf-8', maxBuffer: 1 << 22 });
  return !r.error && r.status === 0 && fs.existsSync(outPath);
}

// ── main ───────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const findings = [];
  const checks = [];

  if (!args.render) {
    console.error('usage: verify-render.cjs --render=<mp4> [--type=<id>] [--regions=<json>] [--json]');
    process.exit(2);
  }
  if (!haveBin('ffprobe') || !haveBin('ffmpeg')) {
    console.error('[ERROR] ffmpeg/ffprobe not on PATH — cannot verify a render.');
    process.exit(2);
  }

  const renderPath = path.isAbsolute(args.render) ? args.render : path.resolve(process.cwd(), args.render);
  if (!fs.existsSync(renderPath)) {
    console.error(`[FAIL] render not found: ${args.render}`);
    process.exit(1);
  }

  const gates = loadTypeGates(args.type);
  if (Number.isFinite(args.minBitrate)) gates.min_bitrate_kbps = args.minBitrate;
  if (Number.isFinite(args.minStddev)) gates.min_region_stddev = args.minStddev;
  const filmstripRequired = args.filmstripRequired === null ? !!gates.require_filmstrip : args.filmstripRequired;

  // ── 1. probe ──
  const meta = probe(renderPath);
  if (!meta || !meta.format) {
    console.error('[FAIL] ffprobe could not read the render (corrupt or not a media file).');
    process.exit(1);
  }
  const duration = Number(meta.format.duration) || 0;
  const bytes = Number(meta.format.size) || fs.statSync(renderPath).size;
  const vStream = (meta.streams || []).find((s) => s.codec_type === 'video');
  const hasAudio = (meta.streams || []).some((s) => s.codec_type === 'audio');

  if (duration <= 0) { findings.push('duration is zero — the render produced no timeline'); }
  if (!vStream) { findings.push('no video stream in the render'); }
  checks.push({ id: 'probe', pass: duration > 0 && !!vStream, duration_s: +duration.toFixed(3), bytes, has_audio: hasAudio });

  // ── 2. bitrate floor (tell #1) ──
  const bitrateKbps = duration > 0 ? (bytes * 8) / duration / 1000 : 0;
  const bitratePass = bitrateKbps >= gates.min_bitrate_kbps;
  if (!bitratePass) {
    findings.push(
      `bitrate ${Math.round(bitrateKbps)} kbps is below the floor ${gates.min_bitrate_kbps} kbps — ` +
      'a strong tell that stages rendered blank (reference: 2.6 Mbps broken vs 4.3 Mbps correct)'
    );
  }
  checks.push({ id: 'bitrate-floor', pass: bitratePass, measured_kbps: Math.round(bitrateKbps), floor_kbps: gates.min_bitrate_kbps });

  // ── 3. blank-segment detection (tell #2 — the keystone) ──
  let regions = [];
  if (args.regions) {
    const rp = path.isAbsolute(args.regions) ? args.regions : path.resolve(process.cwd(), args.regions);
    if (!fs.existsSync(rp)) { console.error(`[FAIL] regions file not found: ${args.regions}`); process.exit(1); }
    try { regions = JSON.parse(fs.readFileSync(rp, 'utf-8')); } catch (e) {
      console.error(`[FAIL] regions file is not valid JSON: ${e.message}`); process.exit(1);
    }
    if (!Array.isArray(regions)) { console.error('[FAIL] regions file must contain an array'); process.exit(1); }
  } else if (duration > 0) {
    // No declared regions: sample the full frame. Catches an all-blank render;
    // a PARTIAL blank (one stage of many) needs declared regions to be caught.
    const n = Math.max(3, Math.min(12, Math.round(duration / 15)));
    for (let i = 0; i < n; i++) {
      const t = ((i + 0.5) / n) * duration;
      regions.push({ label: `auto t=${t.toFixed(1)}s`, t: +t.toFixed(2), rect: null, full_frame: true });
    }
  }

  const regionResults = [];
  let blankCount = 0;
  for (const r of regions) {
    const t = Number(r.t);
    if (!Number.isFinite(t) || t < 0 || (duration > 0 && t > duration)) {
      regionResults.push({ label: r.label || '?', t: r.t, error: 'timestamp outside the render' });
      continue;
    }
    const m = regionStddev(renderPath, t, r.rect || null);
    if (!m) { regionResults.push({ label: r.label || '?', t, error: 'could not sample frame' }); continue; }
    const pass = m.stddev >= gates.min_region_stddev;
    if (!pass) blankCount += 1;
    regionResults.push({
      label: r.label || '?', t, rect: r.rect || 'full-frame',
      stddev: +m.stddev.toFixed(2), mean: +m.mean.toFixed(1), pass,
    });
  }
  if (blankCount > 0) {
    findings.push(
      `${blankCount} sampled region(s) are visually FLAT (std-dev < ${gates.min_region_stddev}) — ` +
      'these ranges should carry live video. This is the stacked-<video> blank-render signature.'
    );
  }
  checks.push({ id: 'blank-segment', pass: blankCount === 0, sampled: regionResults.length, blank: blankCount, threshold: gates.min_region_stddev, regions: regionResults });

  // ── 4. filmstrip (QC evidence) ──
  const filmstripPath = args.filmstrip
    ? (path.isAbsolute(args.filmstrip) ? args.filmstrip : path.resolve(process.cwd(), args.filmstrip))
    : path.join(path.dirname(renderPath), 'filmstrip.jpg');
  let filmstripOk = fs.existsSync(filmstripPath);
  if (!filmstripOk && duration > 0) {
    filmstripOk = buildFilmstrip(renderPath, filmstripPath, gates.filmstrip_frames || 30, duration);
  }
  if (filmstripRequired && !filmstripOk) {
    findings.push('filmstrip is required but missing and could not be generated — QC evidence is mandatory');
  }
  checks.push({ id: 'filmstrip', pass: !filmstripRequired || filmstripOk, path: path.relative(process.cwd(), filmstripPath), generated: filmstripOk });

  // ── report ──
  const pass = findings.length === 0;
  const result = {
    ok: pass,
    render: path.relative(process.cwd(), renderPath),
    type: args.type || '(none)',
    duration_s: +duration.toFixed(3),
    bytes,
    bitrate_kbps: Math.round(bitrateKbps),
    gates,
    checks,
    findings,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const L = [];
    L.push(`render      ${result.render}`);
    L.push(`type        ${result.type}`);
    L.push(`duration    ${result.duration_s}s   bytes ${bytes}   bitrate ${result.bitrate_kbps} kbps (floor ${gates.min_bitrate_kbps})`);
    L.push(`regions     ${regionResults.length} sampled, ${blankCount} flat (threshold std-dev ${gates.min_region_stddev})`);
    for (const r of regionResults.slice(0, 12)) {
      if (r.error) L.push(`   ?  ${String(r.label).padEnd(26)} ${r.error}`);
      else L.push(`   ${r.pass ? '✓' : '✗'}  ${String(r.label).padEnd(26)} std-dev ${String(r.stddev).padStart(6)}  @${r.t}s`);
    }
    L.push(`filmstrip   ${filmstripOk ? 'present' : 'MISSING'}  ${result.checks.find((c) => c.id === 'filmstrip').path}`);
    console.log(L.join('\n'));
    if (pass) console.log('\n[PASS] render verified');
    else {
      console.error(`\n[FAIL] ${findings.length} finding(s):`);
      for (const f of findings) console.error('  - ' + f);
    }
  }
  process.exit(pass ? 0 : 1);
}

if (require.main === module) main();
module.exports = { parseArgs, loadTypeGates, regionStddev, probe };
