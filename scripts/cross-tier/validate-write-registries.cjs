#!/usr/bin/env node
'use strict';
/**
 * scripts/cross-tier/validate-write-registries.cjs
 *
 * L2-CRITICAL validator for capability `write-platform`. Cross-checks the three
 * write registries beyond what the JSON schemas (validate-tier1.cjs) enforce:
 *
 *   write-types.yaml
 *     - unique type ids; valid slug; category ∈ categories[]
 *     - mediums[] non-empty; default_medium ∈ mediums[]
 *     - recommends.{image,dataviz,research} ∈ {true,false,auto,on,off} (if present)
 *
 *   author-styles.yaml
 *     - unique slugs; valid slug; path == 06-ai-ops/write/author-styles/<slug>/
 *     - status=installed ⇒ STYLE.md + voice-card.md exist on disk
 *       (planned|pending need NO files — registration != materialization)
 *
 *   write-templates.yaml
 *     - unique ids; valid slug; category subfolder matches path
 *     - every template path exists on disk
 *     - applies_to_types[] entries ∈ write-types ids (advisory → warn, not fail)
 *
 * Registered in BOTH scripts/check-consistency.cjs (local `pnpm check`) AND
 * .github/workflows/cross-tier-consistency.yml (the two-edit rule). Exit 0 = pass, 1 = drift.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const K = path.join(REPO_ROOT, 'knowledge');
const TYPES = path.join(K, 'write-types.yaml');
const AUTHORS = path.join(K, 'author-styles.yaml');
const TEMPLATES = path.join(K, 'write-templates.yaml');

const SLUG_RE = /^[a-z][a-z0-9-]*$/;
const AUTHOR_DIR = '06-ai-ops/write/author-styles';
const TEMPLATE_DIR = '06-ai-ops/write/templates';
const TRISTATE = new Set(['true', 'false', 'auto', 'on', 'off']);

function loadYaml(p, errs, label) {
  if (!fs.existsSync(p)) { errs.push(`[FAIL] ${label} missing: ${path.relative(REPO_ROOT, p)}`); return null; }
  try { return yaml.load(fs.readFileSync(p, 'utf-8')) || {}; }
  catch (e) { errs.push(`[FAIL] ${label} YAML parse error: ${e.message}`); return null; }
}

function validateTypes(doc, errs) {
  if (!doc) return new Set();
  const ids = new Set();
  const categories = new Set(Array.isArray(doc.categories) ? doc.categories : []);
  if (!Array.isArray(doc.types) || doc.types.length === 0) { errs.push('[FAIL] write-types.yaml: types[] missing/empty'); return ids; }
  for (const t of doc.types) {
    const tag = `write-types[${t && t.id}]`;
    if (!t || !t.id) { errs.push(`[FAIL] ${tag}: missing id`); continue; }
    if (!SLUG_RE.test(t.id)) errs.push(`[FAIL] ${tag}: id not a slug`);
    if (ids.has(t.id)) errs.push(`[FAIL] ${tag}: duplicate id`);
    ids.add(t.id);
    if (categories.size && !categories.has(t.category)) errs.push(`[FAIL] ${tag}: category "${t.category}" ∉ categories[]`);
    if (!Array.isArray(t.mediums) || t.mediums.length === 0) { errs.push(`[FAIL] ${tag}: mediums[] empty`); continue; }
    if (!t.mediums.includes(t.default_medium)) errs.push(`[FAIL] ${tag}: default_medium "${t.default_medium}" ∉ mediums[]`);
    if (t.recommends && typeof t.recommends === 'object') {
      for (const k of ['image', 'dataviz', 'research']) {
        if (t.recommends[k] !== undefined && !TRISTATE.has(String(t.recommends[k]))) {
          errs.push(`[FAIL] ${tag}: recommends.${k}="${t.recommends[k]}" not in {true,false,auto,on,off}`);
        }
      }
    }
  }
  return ids;
}

function validateAuthors(doc, errs) {
  if (!doc) return;
  const slugs = new Set();
  if (!Array.isArray(doc.author_styles)) { errs.push('[FAIL] author-styles.yaml: author_styles[] missing'); return; }
  for (const a of doc.author_styles) {
    const tag = `author-styles[${a && a.slug}]`;
    if (!a || !a.slug) { errs.push(`[FAIL] ${tag}: missing slug`); continue; }
    if (!SLUG_RE.test(a.slug)) errs.push(`[FAIL] ${tag}: slug not a slug`);
    if (slugs.has(a.slug)) errs.push(`[FAIL] ${tag}: duplicate slug`);
    slugs.add(a.slug);
    const expectPath = `${AUTHOR_DIR}/${a.slug}/`;
    if (String(a.path).replace(/\/+$/, '/') !== expectPath) errs.push(`[FAIL] ${tag}: path "${a.path}" != "${expectPath}"`);
    if (a.status === 'installed') {
      const dir = path.join(REPO_ROOT, AUTHOR_DIR, a.slug);
      for (const f of ['STYLE.md', 'voice-card.md']) {
        if (!fs.existsSync(path.join(dir, f))) errs.push(`[FAIL] ${tag}: status=installed but ${f} missing on disk`);
      }
    }
  }
}

function validateTemplates(doc, typeIds, errs, warns) {
  if (!doc) return;
  const ids = new Set();
  if (!Array.isArray(doc.templates)) { errs.push('[FAIL] write-templates.yaml: templates[] missing'); return; }
  for (const t of doc.templates) {
    const tag = `write-templates[${t && t.id}]`;
    if (!t || !t.id) { errs.push(`[FAIL] ${tag}: missing id`); continue; }
    if (!SLUG_RE.test(t.id)) errs.push(`[FAIL] ${tag}: id not a slug`);
    if (ids.has(t.id)) errs.push(`[FAIL] ${tag}: duplicate id`);
    ids.add(t.id);
    const expectPrefix = `${TEMPLATE_DIR}/${t.category}/`;
    if (!String(t.path).startsWith(expectPrefix)) errs.push(`[FAIL] ${tag}: path "${t.path}" not under "${expectPrefix}"`);
    if (!fs.existsSync(path.join(REPO_ROOT, t.path))) errs.push(`[FAIL] ${tag}: template file missing: ${t.path}`);
    if (Array.isArray(t.applies_to_types)) {
      for (const ty of t.applies_to_types) {
        if (typeIds.size && !typeIds.has(ty)) warns.push(`[warn] ${tag}: applies_to_types "${ty}" ∉ write-types ids`);
      }
    }
  }
}

function main() {
  const errs = [];
  const warns = [];
  const typesDoc = loadYaml(TYPES, errs, 'write-types.yaml');
  const authorsDoc = loadYaml(AUTHORS, errs, 'author-styles.yaml');
  const templatesDoc = loadYaml(TEMPLATES, errs, 'write-templates.yaml');

  const typeIds = validateTypes(typesDoc, errs);
  validateAuthors(authorsDoc, errs);
  validateTemplates(templatesDoc, typeIds, errs, warns);

  for (const w of warns) console.log(w);
  if (errs.length) {
    for (const e of errs) console.error(e);
    console.error(`\n[FAIL] validate-write-registries: ${errs.length} error(s).`);
    process.exit(1);
  }
  console.log(`[OK] write-platform registries clean (${typeIds.size} types, ${(authorsDoc && authorsDoc.author_styles || []).length} authors, ${(templatesDoc && templatesDoc.templates || []).length} templates).`);
  process.exit(0);
}

main();
