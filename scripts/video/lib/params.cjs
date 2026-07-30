#!/usr/bin/env node
'use strict';
/**
 * scripts/video/lib/params.cjs — the SINGLE SOURCE OF TRUTH for /video's
 * universal vocabulary (capability `video-platform`, Sprint 1).
 *
 * Mirrors scripts/voice/lib/params.cjs's role, but deliberately holds ONLY the
 * universal/enumerable vocabulary. Per-TYPE data (durations, beats, gates,
 * framing bands, loudness targets) lives in knowledge/video-types.yaml — the
 * /write YAML model, NOT /voice's in-code TYPES constants.
 *
 *   Registry-vs-code test: if a GATE or a FLAG DEFAULT reads it → YAML.
 *                          if only an LLM reads it → the type SKILL.md.
 *                          if it is the closed vocabulary both sides agree on → here.
 *
 * scripts/cross-tier/validate-video-types.cjs imports these sets and asserts the
 * registry is a subset (the supports⊆universal pattern). Without that check the
 * registry becomes decorative.
 */

// ── Asset slots ────────────────────────────────────────────────────────────
// One slot kind = one assets/<dir>/ + one asset-code prefix. The code system is
// the actual invention of the reference production (ritsu-product-launch).
const UNIVERSAL_SLOTS = Object.freeze([
  'screen',   // SC — screen recordings of the real product (the proof)
  'footage',  // LA — live-action b-roll (Veo / stock)
  'voice',    // VO — narration (delegated to /voice)
  'avatar',   // AV — talking-head (delegated to HeyGen via media-use)
  'music',    // MUS — score bed (HeyGen catalog via media-use)
  'sfx',      // SFX — whoosh / impact / riser / tick
  'brand',    // BR — logo, lockup, mark
  'mg',       // MG — motion-graphics (usually built inline, file only if pre-rendered)
]);

// slot kind → asset-code prefix. Codes are <PREFIX>-<NN>-b<BEAT>.<ext>.
const SLOT_CODE_PREFIX = Object.freeze({
  screen: 'SC', footage: 'LA', voice: 'VO', avatar: 'AV',
  music: 'MUS', sfx: 'SFX', brand: 'BR', mg: 'MG',
});

// Slots a human must supply. A type declares its own subset via `handoff:`;
// this is the closed set those may be drawn from.
const HANDOFF_CAPABLE_SLOTS = Object.freeze(['screen', 'footage']);

// ── Artifacts ──────────────────────────────────────────────────────────────
// The standard bundle. TEXT is committed; assets/ build/ out/ are gitignored
// (founder decision, 2026-07-29) EXCEPT out/filmstrip.jpg — the one committed
// binary, because it is the only auditable evidence a render was verified.
const KNOWN_ARTIFACTS = Object.freeze([
  'SCRIPT.md',      // production bible — beats, VO, on-screen
  'FOOTAGE.md',     // checksummed asset manifest (code → path → sha256 → bytes → duration)
  'TIMELINE.md',    // beat sheet + post decisions
  'TIMELINE.html',  // interactive timeline view
  'YOUTUBE.md',     // publishing kit
  'index.html',     // the HyperFrames composition
  'run.json',       // SLOT-level pipeline state (committed — see spec §4.4)
]);

const KNOWN_TARGETS = Object.freeze(['youtube', 'x', 'linkedin', 'tiktok', 'instagram', 'none']);

// ── CLI surface ────────────────────────────────────────────────────────────
const UNIVERSAL_PARAMS = Object.freeze([
  'type', 'script', 'style', 'duration', 'aspect', 'voice', 'engine', 'avatar',
  'music', 'lang', 'assets', 'stage', 'resume', 'dry-run', 'max-cost-usd',
  'publish', 'out', 'slug', 'force',
]);

const STAGES = Object.freeze(['script', 'assets', 'compose', 'render', 'qc', 'publish']);

// ── Non-negotiable floors (lesson #1) ──────────────────────────────────────
// Every type in the registry MUST declare these exact values; the validator
// pins them so a future video line cannot silently opt out of the loudness
// discipline that cost us an audible seam on the reference film.
const NARRATION_TARGET_LUFS = -16;
const NARRATION_MAX_TRUE_PEAK = -1.5;
const LOUDNESS_TOLERANCE_LU = 1.0;   // |measured I − target| must be ≤ this

// ── Gate defaults (lessons #2, #3) ─────────────────────────────────────────
// Empirically derived from the reference production, 2026-07-29:
//   bitrate   — 58 MB/175 s ≈ 2.6 Mbps (BROKEN, stages rendered blank)
//               93 MB/175 s ≈ 4.3 Mbps (CORRECT)
//   stddev    — product window with real UI: 19.64 / 19.35
//               flat control (letterbox bar): 3.77   → ~5× separation
const GATE_DEFAULTS = Object.freeze({
  min_bitrate_kbps: 3500,
  require_filmstrip: true,
  filmstrip_frames: 30,
  min_region_stddev: 8,
});

const VALID_STATUSES = Object.freeze(['installed', 'registered-not-built']);
const VALID_FPS = Object.freeze([24, 25, 30, 60]);
const RESOLUTION_RE = /^\d{2,5}x\d{2,5}$/;
// Identifier slug — a video TYPE id in knowledge/video-types.yaml. Flat, always.
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

// PROJECT slug — the folder under video/projects/. Accepts a flat project
// (`ritsu-product-launch`) OR one level of series nesting
// (`ritsu-getting-started/ep01-what-is-ritsu`).
//
// Deliberately a SEPARATE regex from SLUG_RE. The two are validated by different
// callers — scaffold.cjs checks project slugs, validate-video-types.cjs checks
// type ids — and loosening the shared one would have silently allowed a type id
// like `explainer/foo`.
//
// EXACTLY ONE level of nesting. Two reasons, both load-bearing:
//   1. video/.gitignore enumerates the media dirs per depth (`projects/*/assets/`
//      and `projects/*/*/assets/`). Arbitrary depth would silently un-ignore
//      gigabytes of source media — the ignore file is the real constraint here,
//      not this regex.
//   2. A series of episodes is the actual use case. Deeper trees are a filing
//      system, not a production.
const PROJECT_SLUG_RE = /^[a-z][a-z0-9-]*(\/[a-z][a-z0-9-]*)?$/;

/** Split a project slug into its series (or null) and leaf name. */
function splitProjectSlug(slug) {
  if (typeof slug !== 'string' || !PROJECT_SLUG_RE.test(slug)) return null;
  const i = slug.indexOf('/');
  return i === -1
    ? { series: null, leaf: slug, depth: 1 }
    : { series: slug.slice(0, i), leaf: slug.slice(i + 1), depth: 2 };
}

/** Asset-code filename for a slot. `<PREFIX>-<NN>-b<BEAT>.<ext>` */
function assetCode(slotKind, ordinal, beat) {
  const p = SLOT_CODE_PREFIX[slotKind];
  if (!p) throw new Error(`unknown slot kind: ${slotKind}`);
  const n = String(ordinal).padStart(2, '0');
  return `${p}-${n}-b${beat}`;
}

/** Is a camera zoom factor inside the forbidden band? (lesson #5) */
function inForbiddenZoomBand(zoom, band) {
  if (!Array.isArray(band) || band.length !== 2) return false;
  const [lo, hi] = band;
  return zoom > lo && zoom < hi;
}

module.exports = {
  UNIVERSAL_SLOTS, SLOT_CODE_PREFIX, HANDOFF_CAPABLE_SLOTS,
  KNOWN_ARTIFACTS, KNOWN_TARGETS, UNIVERSAL_PARAMS, STAGES,
  NARRATION_TARGET_LUFS, NARRATION_MAX_TRUE_PEAK, LOUDNESS_TOLERANCE_LU,
  GATE_DEFAULTS, VALID_STATUSES, VALID_FPS, RESOLUTION_RE, SLUG_RE,
  PROJECT_SLUG_RE, splitProjectSlug,
  assetCode, inForbiddenZoomBand,
};
