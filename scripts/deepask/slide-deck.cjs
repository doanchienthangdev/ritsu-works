// ============================================================================
// scripts/deepask/slide-deck.cjs — deepask img-slide PDF assembler
// ============================================================================
// Capability `deepask` v1.1 (extend: image formats), 2026-06-01. Combines the
// generated slide PNGs (slides/01-*.png, 02-*.png, ...) into ONE slides.pdf,
// cropping each page to a true 16:9 (the founder's spec; gpt-image native sizes
// don't include 16:9, so img-slide gens 1536x1024 and this crops to 1536x864).
//
// Reuses the repo's existing PDF substrate convention (anaconda python3 + a
// Pillow image→PDF merge — same interpreter family the playbook-builder uses for
// WeasyPrint). Pillow confirmed present (10.4.0). GRACEFUL DEGRADE per the
// Format-Engine rule: if python/Pillow is unavailable, DO NOT fail the run —
// leave the slides/ folder, skip the PDF, and report degraded:true so the
// orchestrator tells the operator "images written; PDF merge unavailable".
//
// CLI:
//   node scripts/deepask/slide-deck.cjs --images-dir=<dir> --out=<pdf> \
//     [--crop=16:9] [--glob=*.png] [--python=/opt/anaconda3/bin/python3]
// Output: one JSON line {ok,outPdf,pages,cropped,degraded,reason?}.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DEFAULT_PYTHON_CANDIDATES = ['/opt/anaconda3/bin/python3', 'python3', 'python'];

function parseArgs(argv) {
  const out = { crop: '16:9', glob: '*.png' };
  for (const a of argv) {
    if (a.startsWith('--images-dir=')) out.imagesDir = a.slice('--images-dir='.length);
    else if (a.startsWith('--out=')) out.out = a.slice('--out='.length);
    else if (a.startsWith('--crop=')) out.crop = a.slice('--crop='.length);
    else if (a.startsWith('--glob=')) out.glob = a.slice('--glob='.length);
    else if (a.startsWith('--python=')) out.python = a.slice('--python='.length);
  }
  return out;
}

/** "16:9" → {w:16,h:9}; "none"/"" → null (no crop). Pure. */
function parseCropRatio(crop) {
  if (!crop || crop === 'none') return null;
  const m = /^(\d+):(\d+)$/.exec(crop);
  if (!m) throw new TypeError(`slide-deck: --crop must be "W:H" or "none", got ${JSON.stringify(crop)}`);
  return { w: Number(m[1]), h: Number(m[2]) };
}

/** List PNGs in dir matching the glob's extension, lexically sorted (compose zero-pads → correct order). Pure-ish (reads dir). */
function listSlideImages(dir, glob = '*.png') {
  const ext = (glob.split('.').pop() || 'png').toLowerCase();
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(`.${ext}`))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((f) => path.join(dir, f));
}

function findPython(explicit) {
  const cands = explicit ? [explicit, ...DEFAULT_PYTHON_CANDIDATES] : DEFAULT_PYTHON_CANDIDATES;
  for (const p of cands) {
    try {
      execFileSync(p, ['-c', 'import PIL'], { stdio: 'ignore' });
      return p;
    } catch (_e) {
      /* try next */
    }
  }
  return null;
}

// Python that crops each image to the target ratio (centered) and merges → PDF.
const PY_MERGE = `
import sys, json
from PIL import Image
out_pdf = sys.argv[1]
ratio = sys.argv[2]  # "16:9" or "none"
paths = sys.argv[3:]
rw = rh = None
if ratio != "none":
    a, b = ratio.split(":"); rw, rh = int(a), int(b)
def prep(p):
    im = Image.open(p).convert("RGB")
    if rw:
        w, h = im.size
        tar = rw / rh
        if w / h > tar:
            nw = int(round(h * tar)); l = (w - nw) // 2; im = im.crop((l, 0, l + nw, h))
        else:
            nh = int(round(w / tar)); t = (h - nh) // 2; im = im.crop((0, t, w, t + nh))
    return im
ims = [prep(p) for p in paths]
if not ims:
    print(json.dumps({"ok": False, "error": "no images"})); sys.exit(1)
ims[0].save(out_pdf, "PDF", save_all=True, append_images=ims[1:], resolution=150.0)
print(json.dumps({"ok": True, "pages": len(ims)}))
`;

function assembleDeckPdf({ imagesDir, out, crop = '16:9', glob = '*.png', python }) {
  parseCropRatio(crop); // validate early
  const images = listSlideImages(imagesDir, glob);
  if (images.length === 0) {
    return { ok: false, degraded: false, reason: 'no_images', outPdf: null, pages: 0, cropped: false };
  }
  const py = findPython(python);
  if (!py) {
    return { ok: false, degraded: true, reason: 'pillow_unavailable', outPdf: null, pages: 0, cropped: false, images };
  }
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  try {
    const stdout = execFileSync(py, ['-c', PY_MERGE, out, crop, ...images], { encoding: 'utf-8' });
    const res = JSON.parse(stdout.trim().split('\n').pop());
    return { ok: Boolean(res.ok), degraded: false, reason: res.ok ? null : res.error || 'merge_failed', outPdf: res.ok ? out : null, pages: res.pages || 0, cropped: crop !== 'none' };
  } catch (e) {
    return { ok: false, degraded: true, reason: `merge_error: ${String(e.message || e).slice(0, 200)}`, outPdf: null, pages: 0, cropped: false, images };
  }
}

module.exports = { parseArgs, parseCropRatio, listSlideImages, findPython, assembleDeckPdf };

if (require.main === module) {
  const args = parseArgs(process.argv.slice(2));
  if (!args.imagesDir || !args.out) {
    console.log(JSON.stringify({ ok: false, error: '--images-dir and --out are required' }));
    process.exit(1);
  }
  const r = assembleDeckPdf(args);
  console.log(JSON.stringify(r));
  if (!r.ok && !r.degraded) process.exit(1);
}
