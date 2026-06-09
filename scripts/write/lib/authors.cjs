// ============================================================================
// scripts/write/lib/authors.cjs — /write author-style resolver
// ============================================================================
// Reads knowledge/author-styles.yaml + resolves --author-style to its committed
// artifact folder (06-ai-ops/write/author-styles/<slug>/). I/O confined to the
// load + readVoiceCard functions; resolveAuthor is pure over a loaded doc.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'author-styles.yaml');

class AuthorsError extends Error {
  constructor(message) { super(message); this.name = 'AuthorsError'; }
}

function loadAuthors(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) throw new AuthorsError(`author-styles registry not found: ${registryPath}`);
  let doc;
  try { doc = yaml.load(fs.readFileSync(registryPath, 'utf8')); }
  catch (e) { throw new AuthorsError(`author-styles YAML parse error: ${e.message}`); }
  if (!doc || !Array.isArray(doc.author_styles)) throw new AuthorsError('author-styles.yaml: missing author_styles[]');
  return doc;
}

/** Resolve a --author-style slug to its registry entry. Pure. @returns {object|null} */
function resolveAuthor(slug, doc) {
  if (!slug || !doc || !Array.isArray(doc.author_styles)) return null;
  const q = String(slug).trim().toLowerCase();
  return doc.author_styles.find((a) => a.slug === q) || null;
}

/** The 6 artifact file paths for an author entry (absolute). */
function authorArtifactPaths(entry, repoRoot = REPO_ROOT) {
  const dir = path.join(repoRoot, entry.path.replace(/\/+$/, ''));
  return {
    dir,
    style: path.join(dir, 'STYLE.md'),
    voiceCard: path.join(dir, 'voice-card.md'),
    signatureMoves: path.join(dir, 'signature-moves.md'),
    samples: path.join(dir, 'samples.md'),
    doAndDont: path.join(dir, 'do-and-dont.md'),
    meta: path.join(dir, 'meta.yaml'),
  };
}

/** True when the artifact is materialized (STYLE.md + voice-card.md exist). */
function isInstalled(entry, repoRoot = REPO_ROOT) {
  if (!entry) return false;
  const p = authorArtifactPaths(entry, repoRoot);
  return fs.existsSync(p.style) && fs.existsSync(p.voiceCard);
}

/** Read the voice-card (the load-every-run artifact). Returns '' if absent. */
function readVoiceCard(entry, repoRoot = REPO_ROOT) {
  const p = authorArtifactPaths(entry, repoRoot);
  return fs.existsSync(p.voiceCard) ? fs.readFileSync(p.voiceCard, 'utf8') : '';
}

function listAuthorSlugs(doc) {
  return Array.isArray(doc.author_styles) ? doc.author_styles.map((a) => a.slug) : [];
}

module.exports = {
  loadAuthors, resolveAuthor, authorArtifactPaths, isInstalled, readVoiceCard,
  listAuthorSlugs, AuthorsError, DEFAULT_REGISTRY,
};
