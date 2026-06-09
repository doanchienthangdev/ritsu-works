// ============================================================================
// scripts/voice/lib/audio.cjs — PCM→WAV wrapping + ffmpeg convert/stitch (edge)
// ============================================================================
// Capability `voice-platform` v0.1. The impure audio edge, isolated from the pure
// param/chunk/cost layer. Two responsibilities:
//   1. pcmToWav() — wrap raw 16-bit-LE/24kHz/mono PCM (what the Gemini Developer
//      API returns, base64-decoded) in a 44-byte RIFF/WAV header. PURE (testable).
//   2. ffmpeg shells — convertAudio() (transcode one file) + stitchAudio()
//      (concat-demuxer many parts → one file, re-encoded clean). ffmpeg is a soft
//      dependency: ffmpegAvailable() lets the caller pick a no-ffmpeg path when the
//      provider can emit the target format directly (OpenAI mp3) and there's one part.
// ============================================================================

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PCM_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BIT_DEPTH = 16;

/**
 * Wrap raw little-endian signed-16-bit PCM in a canonical 44-byte WAV header. Pure.
 * @param {Buffer} pcm
 * @param {{sampleRate?:number, channels?:number, bitDepth?:number}} [opts]
 * @returns {Buffer}
 */
function pcmToWav(pcm, opts = {}) {
  const sampleRate = opts.sampleRate || PCM_RATE;
  const channels = opts.channels || PCM_CHANNELS;
  const bitDepth = opts.bitDepth || PCM_BIT_DEPTH;
  const data = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm || []);
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

let _ffmpegChecked;
/** True if an `ffmpeg` binary is on PATH (memoized). */
function ffmpegAvailable() {
  if (_ffmpegChecked === undefined) {
    try { _ffmpegChecked = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; }
    catch (_e) { _ffmpegChecked = false; }
  }
  return _ffmpegChecked;
}

/** ffmpeg output args for a given container/codec, inferred from the target format. */
function outputArgsFor(format) {
  if (format === 'pcm') return ['-f', 's16le', '-ar', String(PCM_RATE), '-ac', String(PCM_CHANNELS)];
  if (format === 'opus' || format === 'ogg') return ['-c:a', 'libopus'];
  if (format === 'm4a' || format === 'aac') return ['-c:a', 'aac'];
  return []; // mp3/wav/flac → let ffmpeg pick the codec from the extension.
}

function runFfmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { encoding: 'utf-8' });
  if (r.error) return { ok: false, error: String(r.error.message || r.error) };
  if (r.status !== 0) return { ok: false, error: (r.stderr || `ffmpeg exited ${r.status}`).trim().slice(0, 400) };
  return { ok: true };
}

/**
 * Transcode a single audio file to `format` at outPath via ffmpeg.
 * @returns {{ok:boolean, file?:string, error?:string}}
 */
function convertAudio(inPath, outPath, format) {
  if (!ffmpegAvailable()) return { ok: false, error: 'ffmpeg not found on PATH (needed to convert audio formats)' };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const res = runFfmpeg(['-i', inPath, ...outputArgsFor(format), outPath]);
  return res.ok ? { ok: true, file: outPath } : res;
}

// EBU R128 loudness targets — audiobook/podcast standard. The CONSISTENCY fix for
// long-form / multi-chunk content: normalizing every chunk to the SAME integrated
// loudness is the only reliable cure for the "lúc to lúc nhỏ" volume drift that
// independent TTS requests produce (each request self-normalizes differently).
const DEFAULT_LUFS = Object.freeze({ i: -16, tp: -2, lra: 11 });

/** Parse the last JSON object out of mixed ffmpeg stderr/stdout text. */
function lastJson(text) {
  const m = String(text || '').match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch (_e) { return null; }
}

/**
 * Measure a file's loudness (loudnorm analysis pass, print_format=json). Returns the
 * parsed { input_i, input_tp, input_lra, input_thresh, target_offset, ... } or null.
 */
function measureLoudness(inPath, opts = {}) {
  const I = opts.i ?? DEFAULT_LUFS.i; const TP = opts.tp ?? DEFAULT_LUFS.tp; const LRA = opts.lra ?? DEFAULT_LUFS.lra;
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', inPath, '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`, '-f', 'null', '-'], { encoding: 'utf-8' });
  if (r.error) return null;
  return lastJson(`${r.stderr || ''}${r.stdout || ''}`);
}

/**
 * Two-pass EBU R128 loudness-normalize a file to a uniform target (measure → linear apply).
 * This is what makes every chunk play at the SAME volume. Falls back to single-pass if the
 * measure pass yields nothing usable (e.g. near-silence). Output format inferred from outPath.
 * @returns {{ok:boolean, file?:string, measured?:object, error?:string}}
 */
function normalizeLoudness(inPath, outPath, opts = {}) {
  if (!ffmpegAvailable()) return { ok: false, error: 'ffmpeg not found on PATH (needed for loudness normalization)' };
  const I = opts.i ?? DEFAULT_LUFS.i; const TP = opts.tp ?? DEFAULT_LUFS.tp; const LRA = opts.lra ?? DEFAULT_LUFS.lra;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const m = measureLoudness(inPath, { i: I, tp: TP, lra: LRA });
  const usable = m && m.input_i !== undefined && m.input_i !== '-inf' && Number.isFinite(Number(m.input_i));
  const af = usable
    ? `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`
    : `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}`;
  const fmt = path.extname(outPath).slice(1).toLowerCase() || 'wav';
  // Force the source PCM contract on the intermediate so every normalized part concatenates cleanly.
  const rateArgs = (fmt === 'wav' || fmt === 'pcm') ? ['-ar', String(PCM_RATE), '-ac', String(PCM_CHANNELS)] : [];
  const res = runFfmpeg(['-i', inPath, '-af', af, ...rateArgs, ...outputArgsFor(fmt), outPath]);
  return res.ok ? { ok: true, file: outPath, measured: m } : res;
}

/**
 * Concatenate `parts` (in order) into one `format` file at outPath.
 * CONSISTENCY (default): each part is first loudness-normalized to an identical target
 * (lossless WAV intermediate) so the whole result plays at one steady volume; then the
 * normalized parts are concatenated and encoded once. Pass {normalize:false} to skip.
 * A single part is just transcoded (still normalized unless disabled). Empty → error.
 * @param {string[]} parts
 * @param {string} outPath
 * @param {string} format
 * @param {{normalize?:boolean, targetLufs?:number, tp?:number}} [opts]
 * @returns {{ok:boolean, file?:string, normalized?:boolean, warnings?:string[], error?:string}}
 */
function stitchAudio(parts, outPath, format, opts = {}) {
  const list = Array.isArray(parts) ? parts.filter((p) => typeof p === 'string' && fs.existsSync(p)) : [];
  if (!list.length) return { ok: false, error: 'no input audio parts to stitch' };
  if (!ffmpegAvailable()) return { ok: false, error: 'ffmpeg not found on PATH (needed to stitch audio parts)' };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const normalize = opts.normalize !== false;
  const target = { i: opts.targetLufs ?? DEFAULT_LUFS.i, tp: opts.tp ?? DEFAULT_LUFS.tp, lra: DEFAULT_LUFS.lra };
  const warnings = [];

  if (list.length === 1 && !normalize) return convertAudio(list[0], outPath, format);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voice-stitch-'));
  try {
    let stitchList = list;
    if (normalize) {
      stitchList = list.map((p, i) => {
        const tmp = path.join(tmpDir, `${String(i).padStart(4, '0')}.wav`);
        const r = normalizeLoudness(p, tmp, target);
        if (r.ok) return tmp;
        warnings.push(`loudness-normalize failed for ${path.basename(p)} (${r.error || 'unknown'}) → using raw part`);
        return p;
      });
    }
    if (stitchList.length === 1) {
      const r = convertAudio(stitchList[0], outPath, format);
      return r.ok ? { ok: true, file: outPath, normalized: normalize, warnings } : { ...r, warnings };
    }
    const listFile = path.join(tmpDir, 'concat.txt');
    fs.writeFileSync(listFile, `${stitchList.map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n')}\n`, 'utf-8');
    const res = runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, ...outputArgsFor(format), outPath]);
    return res.ok ? { ok: true, file: outPath, normalized: normalize, warnings } : { ...res, warnings };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (_e) { /* best effort */ }
  }
}

module.exports = {
  pcmToWav, ffmpegAvailable, convertAudio, stitchAudio, outputArgsFor,
  measureLoudness, normalizeLoudness, DEFAULT_LUFS,
  PCM_RATE, PCM_CHANNELS, PCM_BIT_DEPTH,
};
