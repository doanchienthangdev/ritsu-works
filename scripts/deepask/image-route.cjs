// ============================================================================
// scripts/deepask/image-route.cjs — deepask × /image platform routing (v1.4)
// ============================================================================
// Capability `deepask` v1.4. Routes deepask's image generation through the
// `/image` PLATFORM (scripts/image/gen.cjs) instead of the low-level
// scripts/deepask/image-gen.cjs. deepask thereby gains, for free: the pluggable
// adapter registry (--use → gpt-image-2 today, nano-banana/midjourney/flux later),
// reference-guided generation (--ref/--mask — the deepask helper is /generations-only),
// the governed run.json + ai-ops-image cost-bucket, and the per-run cost breaker.
//
// TWO callers:
//   1) infographics / img-slide  — prompts are AUTHORED by deepask/image-compose
//      (IR-grounded: brand block + genre block + focal illustration + exact cited
//      text + honesty invariant). The composed prompt is passed AS-IS with
//      composed:true → we do NOT pass --style/--art-style (the brand+genre are
//      ALREADY in the prompt; passing them would make /image RE-compose on top).
//   2) intelligent ILLUSTRATION (NEW v1.4) — a hero/section image for a rich
//      format (article/pdf/html/dashboard) when it raises quality. Here deepask
//      passes a short brief + composed:false → /image composes brand+genre itself.
//
// PURE (unit-tested): sizeToAr · buildImagePlatformInvocation · parseImageResult ·
// shouldIllustrate. The actual spawn + the file move-to-named-slot are the
// side-effecting edges (documented in deepask/format §2.8); image gen is OUT-OF-BAND
// (OPENAI_API_KEY) and BUDGET-GATED (--max-cost-usd, explicit-only) — never silent spend.
// ============================================================================

'use strict';

const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const IMAGE_GEN = path.join(REPO_ROOT, 'scripts', 'image', 'gen.cjs');

// ── PURE: reduce a "WxH" pixel size → an "A:B" aspect ratio (/image takes --ar). ──
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = b; b = a % b; a = t; } return a || 1; }
function sizeToAr(size) {
  const m = /^(\d+)\s*[x×]\s*(\d+)$/.exec(String(size || ''));
  if (!m) return '16:9';
  const w = Number(m[1]); const h = Number(m[2]);
  if (!w || !h) return '16:9';
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}

// ── PURE: which rich formats can carry an intelligent illustration. ──
// Illustration is the GENRE/concept image (a hero, a section motif) — NOT a chart
// (charts go through dataviz, v1.3). It spends $, so it is EXPLICIT-ONLY + budget-gated.
const ILLUSTRABLE = Object.freeze(['article', 'pdf', 'html', 'dashboard', 'interactive', 'canvas']);
function shouldIllustrate(format, { illustrate = 'off' } = {}) {
  const mode = String(illustrate || 'off').toLowerCase();
  if (mode === 'off') return false;                       // default: no spend
  if (!ILLUSTRABLE.includes(String(format || '').toLowerCase())) return false;
  return mode === 'on' || mode === 'hero' || mode === 'auto';
}

/**
 * PURE: build the `/image` platform argv for one deepask image request.
 * req: {
 *   prompt? | promptFile?  — the image prompt (composed by image-compose, or a brief),
 *   composed?  — true ⇒ prompt is already brand+genre-composed (omit --style/--art-style),
 *   size? | ar?            — "2048x1152" or "16:9",
 *   quality?, model?,      — gpt-image quality + the model id,
 *   outDir,                — /image writes NN.<ext> INTO this dir (then caller renames),
 *   style?, artStyle?,     — only applied when composed !== true (the illustration path),
 *   ref?, mask?,           — reference-guided (NEW for deepask via /image),
 *   dryRun?,
 * }
 * @param {object} opts { use='gpt-image-2', maxCostUsd=1.0 }
 */
function buildImagePlatformInvocation(req, { use = 'gpt-image-2', maxCostUsd = 1.0 } = {}) {
  const r = req && typeof req === 'object' ? req : {};
  const argv = [IMAGE_GEN];
  if (r.promptFile) argv.push(`--prompt-file=${r.promptFile}`);
  else if (r.prompt) argv.push(`--prompt=${r.prompt}`);
  argv.push(`--use=${r.use || use}`);
  argv.push(`--ar=${r.ar || sizeToAr(r.size)}`);
  if (r.quality) argv.push(`--quality=${r.quality}`);
  if (r.model) argv.push(`--model=${r.model}`);
  argv.push('--count=1');                                 // deepask drives N at the piece level
  // composed prompts already carry brand+genre → do NOT re-compose (would double the blocks).
  if (!r.composed) {
    if (r.style && r.style !== 'plain') argv.push(`--style=${r.style}`);
    if (r.artStyle && r.artStyle !== 'plain') argv.push(`--art-style=${r.artStyle}`);
  }
  if (r.ref) argv.push(`--ref=${r.ref}`);
  if (r.mask) argv.push(`--mask=${r.mask}`);
  if (r.outDir) argv.push(`--out=${r.outDir.replace(/\/?$/, '/')}`); // trailing slash ⇒ /image treats it as a DIR
  argv.push(`--max-cost-usd=${Number.isFinite(Number(r.maxCostUsd)) ? r.maxCostUsd : maxCostUsd}`);
  if (r.dryRun) argv.push('--dry-run');
  return argv;
}

/**
 * PURE: parse /image gen.cjs's one-line JSON stdout into a normalized result.
 * /image emits { ok, outcome, files[], model, cost_usd, warnings[], runJson, error }.
 */
function parseImageResult(stdout) {
  let j;
  try { j = JSON.parse(String(stdout || '').trim().split('\n').filter(Boolean).pop() || '{}'); }
  catch (_) { return { ok: false, outcome: 'parse_error', files: [], cost_usd: 0, warnings: [], error: 'could not parse /image JSON output' }; }
  return {
    ok: !!j.ok,
    outcome: j.outcome || (j.ok ? 'success' : 'error'),
    files: Array.isArray(j.files) ? j.files : [],
    cost_usd: Number(j.cost_usd) || 0,
    warnings: Array.isArray(j.warnings) ? j.warnings : [],
    runJson: j.runJson || null,
    error: j.error || null,
  };
}

module.exports = {
  IMAGE_GEN, REPO_ROOT, ILLUSTRABLE,
  gcd, sizeToAr, shouldIllustrate, buildImagePlatformInvocation, parseImageResult,
};
