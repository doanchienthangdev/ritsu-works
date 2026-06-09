// ============================================================================
// scripts/write/lib/types.cjs — /write type + medium resolver
// ============================================================================
// Reads knowledge/write-types.yaml and resolves --type (by id or alias) + --medium
// (validated against the type's mediums[]). I/O confined to loadTypes(); the resolve
// functions are pure over a loaded doc, so they're unit-testable with a fixture doc.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'write-types.yaml');

class TypesError extends Error {
  constructor(message) { super(message); this.name = 'TypesError'; }
}

/** Read + shallow-validate the write-types registry. */
function loadTypes(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) throw new TypesError(`write-types registry not found: ${registryPath}`);
  let doc;
  try { doc = yaml.load(fs.readFileSync(registryPath, 'utf8')); }
  catch (e) { throw new TypesError(`write-types YAML parse error: ${e.message}`); }
  if (!doc || !Array.isArray(doc.types)) throw new TypesError('write-types.yaml: missing types[]');
  return doc;
}

/**
 * Resolve a --type value (id or alias) to its type object. Pure.
 * @returns {object|null}
 */
function resolveType(idOrAlias, doc) {
  if (!idOrAlias || !doc || !Array.isArray(doc.types)) return null;
  const q = String(idOrAlias).trim().toLowerCase();
  for (const t of doc.types) {
    if (t.id === q) return t;
    if (Array.isArray(t.aliases) && t.aliases.map((a) => String(a).toLowerCase()).includes(q)) return t;
  }
  return null;
}

/**
 * Resolve --medium against a type's mediums[]. Unknown medium → the type's default_medium + a warning.
 * @returns {{ medium:string, warnings:string[] }}
 */
function resolveMedium(type, medium) {
  const warnings = [];
  if (!type) return { medium: medium || null, warnings };
  if (medium === undefined || medium === null || medium === '') {
    return { medium: type.default_medium, warnings };
  }
  const q = String(medium).trim().toLowerCase();
  const mediums = Array.isArray(type.mediums) ? type.mediums : [];
  if (mediums.map((m) => String(m).toLowerCase()).includes(q)) {
    return { medium: q, warnings };
  }
  warnings.push(`--medium "${medium}" is not a known medium for type "${type.id}" (have: ${mediums.join(', ')}) → using default "${type.default_medium}"`);
  return { medium: type.default_medium, warnings };
}

/** List all type ids (for `/write types` and validation). */
function listTypeIds(doc) {
  return Array.isArray(doc.types) ? doc.types.map((t) => t.id) : [];
}

module.exports = { loadTypes, resolveType, resolveMedium, listTypeIds, TypesError, DEFAULT_REGISTRY };
