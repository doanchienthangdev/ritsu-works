// ============================================================================
// scripts/design-system/registry-io.cjs — design-systems.yaml read/write/validate
// ============================================================================
// Capability `design-system-styling` v1.0, Sprint 1. The single module that
// reads, validates, and upserts entries in knowledge/design-systems.yaml. Source
// of truth for the origin/status enums + name pattern (the validator + resolver
// import these — DRY: defined once here).
//
// I/O confined to this module so resolve-style.cjs + the /design-system command
// share one registry contract. Mirrors scripts/deepask/*.cjs throw-on-bad-input.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'design-systems.yaml');

const VALID_ORIGINS = ['owned', 'downloaded', 'built-from-repo'];
const VALID_STATUSES = ['pending', 'installed', 'cached', 'not_cached', 'cache-pending-key', 'vendored'];
// status values that REQUIRE the DESIGN.md file to exist on disk:
const MATERIALIZED_STATUSES = ['installed', 'cached', 'vendored'];
const NAME_RE = /^[a-z][a-z0-9-]*$/;

class RegistryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RegistryError';
  }
}

/** Read + shallow-validate the registry document. */
function readRegistry(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) {
    throw new RegistryError(`registry not found: ${registryPath}`);
  }
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(registryPath, 'utf-8')) || {};
  } catch (e) {
    throw new RegistryError(`registry YAML parse error: ${e.message}`);
  }
  if (doc === null || typeof doc !== 'object' || Array.isArray(doc)) {
    throw new RegistryError('registry root must be a mapping');
  }
  const list = doc.design_systems === undefined ? [] : doc.design_systems;
  if (!Array.isArray(list)) {
    throw new RegistryError('design_systems must be an array');
  }
  return {
    version: doc.version || '1.0.0',
    schema: doc.schema || 'knowledge/schemas/design-systems.schema.json',
    design_systems: list,
  };
}

/** Structural validation of one entry. Returns an array of error strings (empty = valid). */
function validateEntry(entry) {
  if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
    return ['entry must be an object'];
  }
  const errs = [];
  if (typeof entry.name !== 'string' || !NAME_RE.test(entry.name)) {
    errs.push(`name invalid (must match ${NAME_RE}): ${JSON.stringify(entry.name)}`);
  }
  if (!VALID_ORIGINS.includes(entry.origin)) {
    errs.push(`origin must be one of [${VALID_ORIGINS.join(', ')}]: ${JSON.stringify(entry.origin)}`);
  }
  if (typeof entry.source !== 'string' || !entry.source) {
    errs.push('source required (non-empty string)');
  }
  if (typeof entry.path !== 'string' || !entry.path) {
    errs.push('path required (non-empty string)');
  }
  if (!VALID_STATUSES.includes(entry.status)) {
    errs.push(`status must be one of [${VALID_STATUSES.join(', ')}]: ${JSON.stringify(entry.status)}`);
  }
  return errs;
}

/** Find a system by exact name. Returns the entry object or null. */
function findSystem(name, registryPath = DEFAULT_REGISTRY) {
  if (typeof name !== 'string' || !name) return null;
  const { design_systems } = readRegistry(registryPath);
  return design_systems.find((d) => d && d.name === name) || null;
}

/** Insert-or-update an entry (merge by name). Writes the registry back. Returns the new doc. */
function upsertSystem(entry, registryPath = DEFAULT_REGISTRY) {
  const errs = validateEntry(entry);
  if (errs.length) throw new RegistryError(`invalid entry: ${errs.join('; ')}`);
  const reg = readRegistry(registryPath);
  const idx = reg.design_systems.findIndex((d) => d && d.name === entry.name);
  if (idx >= 0) reg.design_systems[idx] = { ...reg.design_systems[idx], ...entry };
  else reg.design_systems.push(entry);
  writeRegistry(reg, registryPath);
  return reg;
}

/** Serialize + write the registry document. */
function writeRegistry(reg, registryPath = DEFAULT_REGISTRY) {
  if (reg === null || typeof reg !== 'object' || !Array.isArray(reg.design_systems)) {
    throw new RegistryError('writeRegistry: reg.design_systems must be an array');
  }
  const doc = {
    version: reg.version || '1.0.0',
    schema: reg.schema || 'knowledge/schemas/design-systems.schema.json',
    design_systems: reg.design_systems,
  };
  fs.writeFileSync(
    registryPath,
    yaml.dump(doc, { lineWidth: -1, noRefs: true, sortKeys: false }),
    'utf-8',
  );
}

module.exports = {
  readRegistry,
  findSystem,
  upsertSystem,
  writeRegistry,
  validateEntry,
  VALID_ORIGINS,
  VALID_STATUSES,
  MATERIALIZED_STATUSES,
  NAME_RE,
  DEFAULT_REGISTRY,
  RegistryError,
};
