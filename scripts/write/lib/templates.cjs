// ============================================================================
// scripts/write/lib/templates.cjs — /write template resolver
// ============================================================================
// Reads knowledge/write-templates.yaml + resolves --template to a skeleton file.
// Accepts a REGISTERED id OR a direct repo-relative/absolute path (so users can
// point at any .md skeleton). I/O confined to load + readTemplate.
// ============================================================================

'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const DEFAULT_REGISTRY = path.join(REPO_ROOT, 'knowledge', 'write-templates.yaml');

class TemplatesError extends Error {
  constructor(message) { super(message); this.name = 'TemplatesError'; }
}

function loadTemplates(registryPath = DEFAULT_REGISTRY) {
  if (!fs.existsSync(registryPath)) throw new TemplatesError(`write-templates registry not found: ${registryPath}`);
  let doc;
  try { doc = yaml.load(fs.readFileSync(registryPath, 'utf8')); }
  catch (e) { throw new TemplatesError(`write-templates YAML parse error: ${e.message}`); }
  if (!doc || !Array.isArray(doc.templates)) throw new TemplatesError('write-templates.yaml: missing templates[]');
  return doc;
}

/**
 * Resolve --template (id or path) to {id, path, exists}. Pure over (doc, repoRoot)
 * except the existence check. Returns null only when nothing was requested.
 * @param {string} idOrPath
 * @param {object} doc  loaded write-templates doc (may be null when a path is given)
 * @returns {{ id:string|null, path:string, abs:string, exists:boolean, source:'registry'|'path' }|null}
 */
function resolveTemplate(idOrPath, doc, repoRoot = REPO_ROOT) {
  if (!idOrPath) return null;
  const q = String(idOrPath).trim();

  // registry id?
  if (doc && Array.isArray(doc.templates)) {
    const hit = doc.templates.find((t) => t.id === q.toLowerCase());
    if (hit) {
      const abs = path.isAbsolute(hit.path) ? hit.path : path.join(repoRoot, hit.path);
      return { id: hit.id, path: hit.path, abs, exists: fs.existsSync(abs), source: 'registry' };
    }
  }

  // direct path (absolute or repo-relative)
  const abs = path.isAbsolute(q) ? q : path.join(repoRoot, q);
  return { id: null, path: q, abs, exists: fs.existsSync(abs), source: 'path' };
}

/** Read a resolved template's content, or '' if absent. */
function readTemplate(resolved) {
  if (!resolved || !resolved.exists) return '';
  return fs.readFileSync(resolved.abs, 'utf8');
}

function listTemplateIds(doc) {
  return Array.isArray(doc.templates) ? doc.templates.map((t) => t.id) : [];
}

module.exports = { loadTemplates, resolveTemplate, readTemplate, listTemplateIds, TemplatesError, DEFAULT_REGISTRY };
