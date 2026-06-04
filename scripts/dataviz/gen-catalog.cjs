#!/usr/bin/env node
'use strict';
// ============================================================================
// scripts/dataviz/gen-catalog.cjs — regenerate the agent-facing chart catalog
// ----------------------------------------------------------------------------
// Capability `dataviz` v0.4. Writes 06-ai-ops/skills/dataviz/catalog.md from
// scripts/dataviz/lib/catalog.cjs (which renders FROM taxonomy.cjs — the single
// source of truth). Idempotent + byte-stable. A test asserts the on-disk file
// equals renderCatalogMarkdown() so the catalog can never drift from the built
// types. Run:  node scripts/dataviz/gen-catalog.cjs   (or --check for CI).
// ============================================================================

const fs = require('fs');
const path = require('path');
const { renderCatalogMarkdown } = require('./lib/catalog.cjs');

const OUT = path.resolve(__dirname, '..', '..', '06-ai-ops', 'skills', 'dataviz', 'catalog.md');

function main() {
  const md = renderCatalogMarkdown();
  const check = process.argv.includes('--check');
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (check) {
    if (current === md) { console.log('[dataviz gen-catalog] catalog.md in sync ✓'); return; }
    console.error('[dataviz gen-catalog] DRIFT: catalog.md is out of sync with taxonomy. Run `node scripts/dataviz/gen-catalog.cjs`.');
    process.exit(1);
  }
  if (current === md) { console.log('[dataviz gen-catalog] catalog.md already up to date.'); return; }
  fs.writeFileSync(OUT, md);
  console.log(`[dataviz gen-catalog] wrote ${OUT} (${md.length} bytes)`);
}

if (require.main === module) main();
module.exports = { OUT };
