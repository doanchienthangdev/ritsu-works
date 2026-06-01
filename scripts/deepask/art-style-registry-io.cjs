// ============================================================================
// scripts/deepask/art-style-registry-io.cjs — knowledge/art-styles.yaml read/validate
// ============================================================================
// Capability `deepask` v1.2-image (artistic genre axis). The single module that
// reads + validates knowledge/art-styles.yaml. Source of truth for the name
// pattern + the required-fields + the FORBIDDEN brand-palette keys (the resolver
// `art-style.cjs` AND the validator `validate-art-styles.cjs` both import these —
// DRY, @cto Phase-5 R6; mirrors scripts/design-system/registry-io.cjs).
//
// Orthogonality guard (@cto R5): a genre entry MUST NOT carry a structured
// `colors`/`background`/`primary`/`surface` token (only `secondary_palette` prose),
// so it can never shadow the brand --style core palette. Enforced here once.
// ============================================================================
'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'art-styles.yaml');

// ids may start with a digit (e.g. 8-bit-pixel-adventure); no dots (mirrors design-systems).
const NAME_RE = /^[a-z0-9][a-z0-9-]*$/;
// The load-bearing genre fields (must be non-empty prose).
const REQUIRED_PROSE = ['tone', 'layout', 'assets'];
const OPTIONAL_PROSE = ['secondary_palette', 'display_type'];
// Brand-axis-only keys that a genre must NEVER carry (would shadow --style palette).
const FORBIDDEN_BRAND_KEYS = ['colors', 'background', 'primary', 'surface'];

class ArtStyleRegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ArtStyleRegistryError';
  }
}

/** Read + shallow-validate the registry document. */
function readRegistry(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) {
    throw new ArtStyleRegistryError(`art-styles registry not found: ${registryPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(registryPath, 'utf-8')) || {};
  } catch (e) {
    throw new ArtStyleRegistryError(`art-styles.yaml YAML parse error: ${e.message}`);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new ArtStyleRegistryError('art-styles.yaml root must be a mapping');
  }
  const list = doc.art_styles === undefined ? [] : doc.art_styles;
  if (!Array.isArray(list)) {
    throw new ArtStyleRegistryError('art_styles must be an array');
  }
  return {
    version: doc.version || '1.0.0',
    schema: doc.schema || 'knowledge/schemas/art-styles.schema.json',
    art_styles: list,
  };
}

/** Structural validation of one entry. Returns an array of error strings (empty = valid). */
function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['entry must be an object'];
  }
  const errs = [];
  if (typeof entry.id !== 'string' || !NAME_RE.test(entry.id)) {
    errs.push(`id invalid (must match ${NAME_RE}): ${JSON.stringify(entry.id)}`);
  }
  if (typeof entry.name !== 'string' || !entry.name) {
    errs.push('name required (non-empty string)');
  }
  for (const k of REQUIRED_PROSE) {
    if (typeof entry[k] !== 'string' || !entry[k].trim()) {
      errs.push(`${k} required (non-empty prose)`);
    }
  }
  for (const k of OPTIONAL_PROSE) {
    if (entry[k] !== undefined && typeof entry[k] !== 'string') {
      errs.push(`${k} must be a string when present`);
    }
  }
  for (const k of FORBIDDEN_BRAND_KEYS) {
    if (k in entry) {
      errs.push(`genre must NOT carry brand-axis key "${k}" (would shadow --style palette; use secondary_palette prose) [@cto R5]`);
    }
  }
  return errs;
}

/** Find an art-style by exact id. Returns the entry object or null. */
function findArtStyle(id, registryPath = DEFAULT_REGISTRY) {
  if (typeof id !== 'string' || !id) return null;
  const { art_styles } = readRegistry(registryPath);
  return art_styles.find((s) => s && s.id === id) || null;
}

module.exports = {
  readRegistry,
  findArtStyle,
  validateEntry,
  NAME_RE,
  REQUIRED_PROSE,
  OPTIONAL_PROSE,
  FORBIDDEN_BRAND_KEYS,
  DEFAULT_REGISTRY,
  ArtStyleRegistryError,
};
