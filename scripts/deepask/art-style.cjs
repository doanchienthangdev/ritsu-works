// ============================================================================
// scripts/deepask/art-style.cjs — the --art-style resolver (genre axis)
// ============================================================================
// Capability `deepask` v1.2-image. Turns `--art-style=<id>` into genre design
// context for the image branch (deepask/image-compose injects it as the GENRE
// block BETWEEN the brand STYLE block and the aesthetic Part-3 art-direction
// block). Orthogonal to scripts/design-system/resolve-style.cjs (the BRAND axis);
// on conflict the brand wins (precedence enforced in image-compose, not here).
//
// Contract (mirrors resolve-style.cjs shape):
//   resolveArtStyle(undefined|null|'')    → { mode: 'plain', genre: null }   (default)
//   resolveArtStyle(id) [in registry]     → { mode: 'styled', genre: {...} }
//   resolveArtStyle(id) [miss]            → THROWS ArtStyleResolveError
//
// AD-3: art-styles are a CLOSED, fully-committed registry (all entries live in
// knowledge/art-styles.yaml — there is NO download path, unlike brand systems).
// So a registry miss is a HARD error in BOTH interactive AND non-interactive
// contexts (deterministic for CI/cron/edge). Pure registry read; no I/O beyond it.
// ============================================================================
'use strict';

const { findArtStyle } = require('./art-style-registry-io.cjs');

class ArtStyleResolveError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArtStyleResolveError';
  }
}

const PLAIN = Object.freeze({ mode: 'plain', name: null, genre: null });

/**
 * Resolve a --art-style id to genre design context (or plain / throw).
 *
 * @param {string|undefined|null} name  the --art-style value (omitted/empty → plain).
 * @param {object} [opts]
 * @param {string} [opts.registryPath]  override art-styles.yaml path (tests).
 * @returns {{mode:'plain'|'styled', name:(string|null), genre:(object|null)}}
 * @throws {ArtStyleResolveError} bad name type, or a registry miss (closed registry, AD-3).
 */
function resolveArtStyle(name, opts = {}) {
  if (opts === null || typeof opts !== 'object') {
    throw new ArtStyleResolveError('opts must be an object');
  }
  // Default: omitted / null / empty → plain (no genre). Zero-cost early return.
  if (name === undefined || name === null || name === '') return { ...PLAIN };
  if (typeof name !== 'string') {
    throw new ArtStyleResolveError(`art-style name must be a string or undefined, got ${typeof name}`);
  }

  const entry = findArtStyle(name, opts.registryPath);
  if (!entry) {
    throw new ArtStyleResolveError(
      `art-style "${name}" is not in knowledge/art-styles.yaml (closed registry — no download path, AD-3). ` +
        `Pick a known --art-style id, or add it to the registry first.`,
    );
  }

  return {
    mode: 'styled',
    name: entry.id,
    genre: {
      id: entry.id,
      name: entry.name,
      tone: entry.tone,
      layout: entry.layout,
      secondary_palette: entry.secondary_palette || null,
      display_type: entry.display_type || null,
      assets: entry.assets,
    },
  };
}

module.exports = { resolveArtStyle, ArtStyleResolveError, PLAIN };
