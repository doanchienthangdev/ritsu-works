// ============================================================================
// scripts/design-system/style-asset.cjs — design-system brand-asset resolver
// ============================================================================
// Capability `design-system-styling` + `deepask` v1.1, 2026-06-01. Resolves a
// resolved style's brand assets (logo / mark / favicon) and inlines them as
// **base64 data URIs** so code-rendered artifacts (deepask --format=html /
// dashboard / canvas) embed the logo SELF-CONTAINED — no relative-path breakage.
//
// WHY: the html adapter previously referenced `<img src="ritsu-mark.png">` and
// relied on a sibling file being staged — which broke whenever the artifact was
// opened from a different base (preview panel, moved file, email). A data URI
// has no path dependency and always renders. (Fixes the founder-reported
// "logo bị mất / lỗi đường dẫn" on --format=html --style=ritsu.)
//
// Convention: assets live in `<dir(designMdPath)>/assets/` (verified for the
// owned ritsu system: ritsu-logo.png, ritsu-mark.png, favicon.ico). Filenames
// are matched heuristically (mark/icon vs logo vs favicon), case-insensitive.
//
// Pure-ish: fs is injectable (opts.fileExists/readDir/readFileBuffer) so the
// All-Edge-Cases tests run against fixtures with no real filesystem coupling.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');

const MIME_BY_EXT = Object.freeze({
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
});
const IMAGE_EXTS = Object.freeze(Object.keys(MIME_BY_EXT));

/** MIME for a path by extension, or null if not a known image type. */
function mimeForPath(p) {
  if (typeof p !== 'string') throw new TypeError(`style-asset: path must be a string, got ${typeof p}`);
  return MIME_BY_EXT[path.extname(p).toLowerCase()] || null;
}

/** Read an image file → a `data:<mime>;base64,<...>` URI. Throws if not an image ext. */
function toDataUri(absPath, opts = {}) {
  const readFileBuffer = opts.readFileBuffer || ((p) => fs.readFileSync(p));
  const mime = mimeForPath(absPath);
  if (!mime) throw new TypeError(`style-asset: unsupported image extension for ${JSON.stringify(absPath)}`);
  const buf = readFileBuffer(absPath);
  const b64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64');
  return `data:${mime};base64,${b64}`;
}

/**
 * Find brand assets in `<dir(designMdPath)>/assets/`. Heuristic, case-insensitive.
 * @returns {{ assetsDir:string|null, mark:string|null, logo:string|null, favicon:string|null, all:string[] }}
 */
function findBrandAssets(designMdPath, opts = {}) {
  if (typeof designMdPath !== 'string' || designMdPath.length === 0) {
    throw new TypeError(`style-asset: designMdPath must be a non-empty string, got ${JSON.stringify(designMdPath)}`);
  }
  const fileExists = opts.fileExists || ((p) => fs.existsSync(p));
  const readDir = opts.readDir || ((p) => fs.readdirSync(p));

  const assetsDir = path.join(path.dirname(designMdPath), 'assets');
  if (!fileExists(assetsDir)) {
    return { assetsDir: null, mark: null, logo: null, favicon: null, all: [] };
  }
  const all = readDir(assetsDir)
    .filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const abs = (f) => path.join(assetsDir, f);
  const byRe = (re, exts) =>
    all.find((f) => re.test(f) && (!exts || exts.includes(path.extname(f).toLowerCase())));

  // mark: prefer a raster/vector "mark" or "icon" (NOT the .ico favicon); fall back to favicon.
  const mark =
    byRe(/mark/i, ['.png', '.svg', '.webp']) ||
    byRe(/icon/i, ['.png', '.svg', '.webp']) ||
    byRe(/favicon/i, ['.png', '.svg']) ||
    byRe(/\.(png|svg|webp)$/i) ||
    null;
  const logo = byRe(/logo/i, ['.png', '.svg', '.webp']) || mark;
  const favicon = byRe(/favicon/i) || byRe(/\.ico$/i) || mark;

  return {
    assetsDir,
    mark: mark ? abs(mark) : null,
    logo: logo ? abs(logo) : null,
    favicon: favicon ? abs(favicon) : null,
    all: all.map(abs),
  };
}

/**
 * Resolve the brand logo for a resolved style as an embeddable data URI.
 * @param {object} resolved  the result of resolveStyle() ({mode, designMdPath, ...}).
 * @param {object} [opts]  prefer:'mark'|'logo' (default 'mark') + injectable fs.
 * @returns {null | { kind:string, path:string, dataUri:string, faviconDataUri:string|null }}
 *          null when style is plain / not styled / has no assets (caller renders without a logo).
 */
function resolveStyleLogo(resolved, opts = {}) {
  if (!resolved || typeof resolved !== 'object') return null;
  if (resolved.mode !== 'styled' || typeof resolved.designMdPath !== 'string') return null;

  const prefer = opts.prefer === 'logo' ? 'logo' : 'mark';
  const assets = findBrandAssets(resolved.designMdPath, opts);
  const pick = prefer === 'logo' ? assets.logo || assets.mark : assets.mark || assets.logo;
  if (!pick) return null;

  return {
    kind: prefer,
    path: pick,
    dataUri: toDataUri(pick, opts),
    faviconDataUri: assets.favicon ? toDataUri(assets.favicon, opts) : null,
  };
}

module.exports = {
  mimeForPath,
  toDataUri,
  findBrandAssets,
  resolveStyleLogo,
  MIME_BY_EXT,
  IMAGE_EXTS,
};
