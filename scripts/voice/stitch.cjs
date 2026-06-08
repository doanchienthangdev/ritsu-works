// ============================================================================
// scripts/voice/stitch.cjs — voice-platform concat CLI (Workflow final step)
// ============================================================================
// Capability `voice-platform` v0.1. Thin CLI over audio.stitchAudio for the
// PARALLEL Workflow path: after the per-chunk gen.cjs jobs land their part files,
// this concatenates them (in order) into the single final audio. The deterministic
// run.cjs stitches in-process; this is the same primitive exposed for a Workflow
// agent / shell to call directly.
//
// CLI (one of --parts | --in-dir):
//   node scripts/voice/stitch.cjs --parts=001.mp3,002.mp3,... --out=final.mp3 [--format=mp3]
//   node scripts/voice/stitch.cjs --in-dir=<parts dir> --out=final.mp3 [--format=mp3]
//     (--in-dir concatenates every audio part in that dir, sorted by filename)
// Output: one JSON line { ok, file, parts, error }.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { stitchAudio } = require('./lib/audio.cjs');
const { normalizeFormat } = require('./lib/params.cjs');

const AUDIO_EXT = new Set(['.mp3', '.wav', '.flac', '.opus', '.aac', '.m4a', '.ogg', '.pcm']);

function parseArgs(argv) {
  const out = {};
  for (const raw of Array.isArray(argv) ? argv : []) {
    if (typeof raw !== 'string' || !raw.startsWith('--')) continue;
    const eq = raw.indexOf('=');
    out[raw.slice(2, eq === -1 ? undefined : eq)] = eq === -1 ? true : raw.slice(eq + 1);
  }
  return out;
}

/** List audio parts in a dir, sorted by filename (the NNN. zero-padded order). */
function partsFromDir(dir) {
  return fs.readdirSync(dir)
    .filter((f) => AUDIO_EXT.has(path.extname(f).toLowerCase()))
    .sort()
    .map((f) => path.join(dir, f));
}

function run(argv) {
  const opts = parseArgs(argv);
  if (!opts.out) return { ok: false, error: '--out=<final path> is required' };
  const format = normalizeFormat(opts.format || path.extname(String(opts.out)).slice(1) || 'mp3');

  let parts = [];
  if (typeof opts.parts === 'string') parts = opts.parts.split(',').map((s) => s.trim()).filter(Boolean);
  else if (typeof opts['in-dir'] === 'string') {
    const dir = path.resolve(opts['in-dir']);
    if (!fs.existsSync(dir)) return { ok: false, error: `--in-dir not found: ${opts['in-dir']}` };
    parts = partsFromDir(dir);
  } else return { ok: false, error: 'pass --parts=a,b,... or --in-dir=<dir>' };

  if (!parts.length) return { ok: false, error: 'no audio parts to stitch' };
  const res = stitchAudio(parts, path.resolve(opts.out), format);
  return res.ok ? { ok: true, file: res.file, parts } : { ok: false, error: res.error, parts };
}

module.exports = { run, parseArgs, partsFromDir };

if (require.main === module) {
  const r = run(process.argv.slice(2));
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
