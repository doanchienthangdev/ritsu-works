// ============================================================================
// scripts/write/lib/frameworks.cjs — /write framework library resolver
// ============================================================================
// Reads knowledge/write-frameworks.yaml + resolves --framework (by id) to its
// structure + when-to-use. A framework is a STRUCTURE/formula the writer applies,
// composable with --type/--template/--author-style. I/O confined to loadFrameworks;
// the resolve/filter functions are pure over a loaded doc.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'write-frameworks.yaml');

class FrameworksError extends Error {
  constructor(message) { super(message); this.name = 'FrameworksError'; }
}

function loadFrameworks(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) throw new FrameworksError(`write-frameworks registry not found: ${registryPath}`);
  let doc;
  try { doc = yaml.load(fs.readFileSync(registryPath, 'utf8')); }
  catch (e) { throw new FrameworksError(`write-frameworks YAML parse error: ${e.message}`); }
  if (!doc || !Array.isArray(doc.frameworks)) throw new FrameworksError('write-frameworks.yaml: missing frameworks[]');
  return doc;
}

/** Resolve a --framework id (case-insensitive) to its entry. Pure. @returns {object|null} */
function resolveFramework(id, doc) {
  if (!id || !doc || !Array.isArray(doc.frameworks)) return null;
  const q = String(id).trim().toLowerCase();
  return doc.frameworks.find((f) => f.id === q) || null;
}

/** Frameworks that fit a given type id (advisory ordering by rank). Pure. */
function frameworksForType(typeId, doc) {
  if (!typeId || !doc || !Array.isArray(doc.frameworks)) return [];
  const q = String(typeId).toLowerCase();
  return doc.frameworks
    .filter((f) => Array.isArray(f.applies_to_types) && f.applies_to_types.map((t) => String(t).toLowerCase()).includes(q))
    .sort((a, b) => (a.rank || 999) - (b.rank || 999));
}

/** Frameworks in a family (rank-ordered). Pure. */
function frameworksInFamily(family, doc) {
  if (!family || !doc || !Array.isArray(doc.frameworks)) return [];
  const q = String(family).toLowerCase();
  return doc.frameworks.filter((f) => f.family === q).sort((a, b) => (a.rank || 999) - (b.rank || 999));
}

function listFrameworkIds(doc) {
  return Array.isArray(doc.frameworks) ? doc.frameworks.map((f) => f.id) : [];
}

module.exports = {
  loadFrameworks, resolveFramework, frameworksForType, frameworksInFamily,
  listFrameworkIds, FrameworksError, DEFAULT_REGISTRY,
};
