'use strict';
// Resolver engine — load + index module.
// Per .archives/cla/resolver/spec.md §11.5.
//
// Reads knowledge/resolvers/registry.yaml → walks routes/ + overrides/ files →
// applies adapters → builds in-memory index. mtime-invalidates cache.

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const E = require('./errors.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_RESOLVERS_DIR = path.join(REPO_ROOT, 'knowledge', 'resolvers');
const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0'];

// In-memory cache (per-process)
let _cache = null;

function nowMs() { return Date.now(); }

function mtimeOf(p) {
  try { return fs.statSync(p).mtimeMs; }
  catch (e) { return null; }
}

function loadYaml(p) {
  if (!fs.existsSync(p)) return null;
  try { return yaml.load(fs.readFileSync(p, 'utf8')); }
  catch (e) { throw new E.RouteFileParseError(p, e.message); }
}

/**
 * Apply adapter template to source YAML data → array of route entries.
 * Adapter shape:
 *   source: <relative-path>
 *   projected_recipient_kind: <kind>
 *   projected_route_template: { id, triggers, recipient, invocation, ... }
 *
 * Template field values may contain {field_name} placeholders that get
 * substituted from source iteration scope.
 */
function applyAdapter(adapterPath, resolversDir) {
  const adapter = loadYaml(adapterPath);
  if (!adapter) return [];
  if (!adapter.source || !adapter.projected_recipient_kind || !adapter.projected_route_template) {
    return []; // Skeleton adapter; nothing to project yet
  }

  const sourcePath = path.resolve(REPO_ROOT, adapter.source);
  if (!fs.existsSync(sourcePath)) {
    throw new E.AdapterSourceMissing(adapterPath, adapter.source);
  }

  const source = loadYaml(sourcePath);
  if (!source) return [];

  const iterPath = adapter.iterate_over; // e.g. 'routes' or 'tools' or 'personas'
  const items = iterPath ? source[iterPath] : source;
  if (!items) return [];

  const out = [];
  const itemArray = Array.isArray(items) ? items.map((v, i) => ({ key: String(i), value: v })) : Object.entries(items).map(([k, v]) => ({ key: k, value: v }));

  for (const { key, value } of itemArray) {
    try {
      const route = JSON.parse(JSON.stringify(adapter.projected_route_template));
      walkAndSubstitute(route, key, value);
      route.metadata = route.metadata || {};
      route.metadata.derived = true;
      route.metadata.adapter = path.basename(adapterPath);
      out.push(route);
    } catch (e) {
      throw new E.AdapterOutputInvalid(adapterPath, e.message);
    }
  }
  return out;
}

function walkAndSubstitute(obj, sourceKey, sourceValue) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      obj[i] = substituteOne(obj[i], sourceKey, sourceValue);
    }
  } else if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      obj[k] = substituteOne(obj[k], sourceKey, sourceValue);
    }
  }
}

function substituteOne(v, sourceKey, sourceValue) {
  if (typeof v === 'string') {
    // Single-placeholder pattern: preserve raw value type (array, object, number)
    // e.g. "{keywords}" → actual array, not stringified
    const m = v.match(/^\{([\w.]+)\}$/);
    if (m) {
      const field = m[1];
      if (field === 'key') return sourceKey;
      if (sourceValue && typeof sourceValue === 'object' && field in sourceValue) {
        return sourceValue[field];
      }
      return v;
    }
    // Multi-placeholder or mixed-with-text: string substitution
    return v.replace(/\{([\w.]+)\}/g, (whole, field) => {
      if (field === 'key') return sourceKey;
      if (sourceValue && typeof sourceValue === 'object' && field in sourceValue) {
        const sv = sourceValue[field];
        return typeof sv === 'string' ? sv : (sv == null ? '' : String(sv));
      }
      return whole; // leave placeholder as-is if unresolved
    });
  } else if (Array.isArray(v) || (v && typeof v === 'object')) {
    walkAndSubstitute(v, sourceKey, sourceValue);
    return v;
  }
  return v;
}

/**
 * Load full resolver index. Cached per-process; rebuilds on mtime change.
 *
 * Returns: {
 *   schema_version, config, routes: Array<Route>,
 *   triggerKeywordIndex: Map<normalized_keyword, Set<route_id>>,
 *   routeById: Map<id, Route>,
 *   loadedAt, registryMtime, routesMtimes
 * }
 */
function loadIndex(opts = {}) {
  const resolversDir = opts.resolversDir || DEFAULT_RESOLVERS_DIR;
  const registryPath = path.join(resolversDir, 'registry.yaml');

  if (!fs.existsSync(resolversDir)) {
    throw new E.ResolverDown(`knowledge/resolvers/ absent at ${resolversDir}`);
  }
  if (!fs.existsSync(registryPath)) {
    throw new E.RegistryNotFound(registryPath);
  }

  // Cache check
  const registryMtime = mtimeOf(registryPath);
  if (_cache && _cache.registryPath === registryPath && _cache.registryMtime === registryMtime) {
    // Also check route file mtimes
    let allFresh = true;
    for (const [fp, mtime] of Object.entries(_cache.routesMtimes)) {
      if (mtimeOf(fp) !== mtime) { allFresh = false; break; }
    }
    if (allFresh) return _cache;
  }

  let registry;
  try {
    registry = yaml.load(fs.readFileSync(registryPath, 'utf8'));
  } catch (e) {
    throw new E.RegistryParseError(registryPath, e.message);
  }
  if (!registry || typeof registry !== 'object') {
    throw new E.RegistryParseError(registryPath, 'empty or non-object');
  }
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(registry.schema_version)) {
    throw new E.RegistrySchemaMismatch(registry.schema_version, SUPPORTED_SCHEMA_VERSIONS);
  }

  // Collect routes from routes/ + overrides/ + adapters
  const allRoutes = [];
  const routesMtimes = {};

  // 1. routes/ files
  for (const fileEntry of (registry.files && registry.files.routes) || []) {
    const fp = path.join(resolversDir, fileEntry.path);
    routesMtimes[fp] = mtimeOf(fp);
    const doc = loadYaml(fp);
    if (doc && Array.isArray(doc.routes)) {
      for (const r of doc.routes) {
        allRoutes.push({ ...r, _source: { kind: 'routes', file: fileEntry.path, priority: 50 } });
      }
    }
    // Apply adapter if declared
    if (fileEntry.adapter) {
      const adapterPath = path.join(resolversDir, fileEntry.adapter);
      try {
        const adapted = applyAdapter(adapterPath, resolversDir);
        for (const r of adapted) {
          allRoutes.push({ ...r, _source: { kind: 'adapter', file: fileEntry.adapter, priority: 30 } });
        }
      } catch (e) {
        // Log + continue per spec §11.5
        if (process.env.RESOLVER_DEBUG) console.error('[resolver] adapter error:', e.message);
      }
    }
  }

  // 2. overrides/ files (higher priority)
  for (const fileEntry of (registry.files && registry.files.overrides) || []) {
    const fp = path.join(resolversDir, fileEntry.path);
    routesMtimes[fp] = mtimeOf(fp);
    const doc = loadYaml(fp);
    if (doc && Array.isArray(doc.routes)) {
      for (const r of doc.routes) {
        allRoutes.push({ ...r, _source: { kind: 'overrides', file: fileEntry.path, priority: fileEntry.priority || 100 } });
      }
    }
  }

  // Detect ID collisions; prefer higher priority
  const routeById = new Map();
  const seenIds = new Set();
  for (const r of allRoutes) {
    if (!r.id) continue;
    const existing = routeById.get(r.id);
    if (existing) {
      // Higher priority wins (overrides > routes > adapter)
      if ((r._source.priority || 0) > (existing._source.priority || 0)) {
        routeById.set(r.id, r);
      }
      seenIds.add(r.id);
    } else {
      routeById.set(r.id, r);
    }
  }

  const finalRoutes = Array.from(routeById.values());

  // Build trigger keyword index
  const triggerKeywordIndex = new Map();
  for (const r of finalRoutes) {
    if (!r.triggers || !Array.isArray(r.triggers.keywords)) continue;
    for (const kw of r.triggers.keywords) {
      const n = normalizeKeyword(kw);
      if (!n) continue;
      if (!triggerKeywordIndex.has(n)) triggerKeywordIndex.set(n, new Set());
      triggerKeywordIndex.get(n).add(r.id);
    }
  }

  _cache = {
    registryPath,
    registryMtime,
    schema_version: registry.schema_version,
    config: registry.config || {},
    routes: finalRoutes,
    triggerKeywordIndex,
    routeById,
    routesMtimes,
    loadedAt: nowMs(),
  };

  return _cache;
}

function normalizeKeyword(s) {
  if (typeof s !== 'string') return '';
  return s.normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
}

function invalidateCache() { _cache = null; }

module.exports = { loadIndex, invalidateCache, normalizeKeyword, applyAdapter };
