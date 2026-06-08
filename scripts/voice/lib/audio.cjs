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

/**
 * Concatenate `parts` (in order) into one `format` file at outPath via the ffmpeg
 * concat demuxer (re-encoded clean). A single part is just transcoded. Empty → error.
 * @returns {{ok:boolean, file?:string, error?:string}}
 */
function stitchAudio(parts, outPath, format) {
  const list = Array.isArray(parts) ? parts.filter((p) => typeof p === 'string' && fs.existsSync(p)) : [];
  if (!list.length) return { ok: false, error: 'no input audio parts to stitch' };
  if (!ffmpegAvailable()) return { ok: false, error: 'ffmpeg not found on PATH (needed to stitch audio parts)' };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  if (list.length === 1) return convertAudio(list[0], outPath, format);

  const listFile = path.join(os.tmpdir(), `voice-concat-${process.pid}-${list.length}.txt`);
  const body = list.map((p) => `file '${path.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listFile, `${body}\n`, 'utf-8');
  try {
    const res = runFfmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, ...outputArgsFor(format), outPath]);
    return res.ok ? { ok: true, file: outPath } : res;
  } finally {
    try { fs.unlinkSync(listFile); } catch (_e) { /* best effort */ }
  }
}

module.exports = {
  pcmToWav, ffmpegAvailable, convertAudio, stitchAudio, outputArgsFor,
  PCM_RATE, PCM_CHANNELS, PCM_BIT_DEPTH,
};
