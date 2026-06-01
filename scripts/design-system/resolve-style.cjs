// ============================================================================
// scripts/design-system/resolve-style.cjs — the universal --style resolver
// ============================================================================
// Capability `design-system-styling` v1.0, Sprint 1. THE helper every output-
// producing command calls to turn `--style=<name>` into design context. The only
// genuinely new surface in this capability (per @cto Phase-2 lens — attack it first).
//
// Contract (spec §4.8):
//   resolveStyle(undefined|null|'')        → { mode: 'plain', ... }        (the default)
//   resolveStyle(name) [file present, valid]  → { mode: 'styled', tokens, ... }
//   resolveStyle(name) [file present, unusable] → { mode: 'plain', warning, ... }  (never crash)
//   resolveStyle(name) [miss, interactive] → { mode: 'needs-download', ... }
//   resolveStyle(name) [miss, non-interactive] → THROWS StyleResolveError    (AD-3)
//
// A "present but unusable" DESIGN.md (a tokenless prose file from getdesign, a
// malformed-beyond-recovery frontmatter, non-sRGB colors, or a {ref} cycle) must NOT
// hard-crash the consuming command. The file IS present, so this is a clean "no usable
// tokens" miss — distinct from the AD-3 cache-miss that hard-fails — and degrades to
// plain + a logged `warning`. sRGB / ref-cycle validation stays strict: an invalid
// system is refused (plain), never silently accepted.
//
// AD-3 (CI/offline determinism): in non-interactive mode the resolver reads only
// already-present files (owned 00-core/ + materialized cache) and HARD-FAILS on a
// miss — it NEVER silently shells `npx`. Interactive callers get 'needs-download'
// and run the download flow, then re-resolve.
//
// Resolution order: registry → owned path → cache path → (miss + interactive) download.
// Paths are injectable (opts.ownedRoot/cacheRoot/registryPath/fileExists/readFile)
// so the All-Edge-Cases tests run against fixtures with no real filesystem coupling.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const { findSystem, MATERIALIZED_STATUSES } = require('./registry-io.cjs');
const { parseDesignMd, DesignMdParseError } = require('./parse-design-md.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

class StyleResolveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StyleResolveError';
  }
}

const PLAIN = Object.freeze({
  mode: 'plain',
  name: null,
  designMdPath: null,
  tokens: null,
  previewPath: null,
  origin: null,
});

/**
 * Resolve a --style name to design context (or plain / needs-download / throw).
 *
 * @param {string|undefined|null} name  the --style value (omitted/empty → plain).
 * @param {object} [opts]
 * @param {boolean} [opts.interactive=false]  interactive session may fetch on miss;
 *        non-interactive (CI/cron/edge) HARD-FAILS on a miss (AD-3).
 * @param {string}  [opts.registryPath]  override design-systems.yaml path (tests).
 * @param {string}  [opts.ownedRoot]     override 00-core/design-system root (tests).
 * @param {string}  [opts.cacheRoot]     override runtime/design-systems root (tests).
 * @param {function}[opts.fileExists]    (absPath)→bool, defaults to fs.existsSync.
 * @param {function}[opts.readFile]      (absPath)→string, defaults to fs.readFileSync.
 * @returns {{mode:'plain'|'styled'|'needs-download', name, designMdPath, tokens, previewPath, origin, source?, warning?}}
 * @throws {StyleResolveError} bad name type, or a miss in non-interactive mode.
 */
function resolveStyle(name, opts = {}) {
  if (opts === null || typeof opts !== 'object') {
    throw new StyleResolveError('opts must be an object');
  }
  const {
    interactive = false,
    registryPath,
    fileExists = (p) => fs.existsSync(p),
    readFile = (p) => fs.readFileSync(p, 'utf-8'),
  } = opts;

  // Default: omitted / null / empty → plain (no style). This is the zero-cost early return.
  if (name === undefined || name === null || name === '') return { ...PLAIN };
  if (typeof name !== 'string') {
    throw new StyleResolveError(`style name must be a string or undefined, got ${typeof name}`);
  }

  const entry = findSystem(name, registryPath);
  if (!entry) {
    if (interactive) {
      return { mode: 'needs-download', name, designMdPath: null, tokens: null, previewPath: null, origin: null, source: 'search' };
    }
    throw new StyleResolveError(
      `style "${name}" is not in the registry, and this is a non-interactive context ` +
        `(no silent download in CI/cron — AD-3). Run \`/design-system add ${name}\` first.`,
    );
  }

  const designMdPath = path.isAbsolute(entry.path) ? entry.path : path.join(REPO_ROOT, entry.path);

  // Present on disk → parse → styled. A present-but-UNUSABLE DESIGN.md degrades to
  // plain + warning rather than propagating the parse throw to the consuming command.
  if (fileExists(designMdPath)) {
    let tokens;
    try {
      tokens = parseDesignMd(readFile(designMdPath));
    } catch (e) {
      if (!(e instanceof DesignMdParseError)) throw e; // a real read/IO error still propagates
      return {
        mode: 'plain',
        name,
        designMdPath,
        tokens: null,
        previewPath: null,
        origin: entry.origin,
        warning: `style "${name}" is present at ${designMdPath} but has no usable design tokens (${e.message}); rendering plain.`,
      };
    }
    const previewPath = derivePreview(designMdPath, fileExists);
    return { mode: 'styled', name, designMdPath, tokens, previewPath, origin: entry.origin };
  }

  // Missing on disk.
  const isOwned = entry.origin === 'owned';
  if (isOwned) {
    if (MATERIALIZED_STATUSES.includes(entry.status)) {
      // owned + claims installed/vendored but file absent → broken install (not downloadable).
      throw new StyleResolveError(
        `owned style "${name}" claims status="${entry.status}" but its DESIGN.md is missing at ${entry.path} (broken install).`,
      );
    }
    // owned + pending/not_cached → registered but not yet installed (sprint in-between).
    throw new StyleResolveError(
      `owned style "${name}" is registered (status="${entry.status}") but not yet installed at ${entry.path}. ` +
        `Owned systems are committed in 00-core/ — they are not downloaded.`,
    );
  }

  // downloaded / built-from-repo + cache miss.
  if (interactive) {
    return { mode: 'needs-download', name, designMdPath, tokens: null, previewPath: null, origin: entry.origin, source: entry.source };
  }
  throw new StyleResolveError(
    `style "${name}" (origin="${entry.origin}", status="${entry.status}") is not materialized at ${entry.path}, ` +
      `and this is a non-interactive context — no silent npx in CI (AD-3). Run \`/design-system add ${name}\` (or vendor it) first.`,
  );
}

/** Light preview sibling next to the DESIGN.md, if present. */
function derivePreview(designMdPath, fileExists) {
  const light = path.join(path.dirname(designMdPath), 'preview.html');
  return fileExists(light) ? light : null;
}

module.exports = { resolveStyle, StyleResolveError, PLAIN };
