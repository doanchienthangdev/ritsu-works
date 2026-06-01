// ============================================================================
// scripts/deepask/gen-art-styles-registry.cjs — one-time bootstrap generator
// ============================================================================
// Capability `deepask` v1.2-image (artistic genre axis). Transforms the founder-
// supplied 80-style seed JSON into knowledge/art-styles.yaml (the committed,
// hand-maintained-thereafter Tier-1 registry — like design-systems.yaml is NOT
// re-generated in CI). Run ONCE to bootstrap; the YAML is authoritative after.
//
// Orthogonality-by-construction (@cto R5 / spec §3): a genre entry carries
// `secondary_palette` + `display_type` PROSE (accent + headline guidance only),
// NEVER a structured `colors`/`background`/`primary` token that could shadow the
// brand --style palette. The brand axis owns `colors`; the genre axis cannot.
//
// CLI:  node scripts/deepask/gen-art-styles-registry.cjs --seed=<path> --out=<path>
// Default seed: .archives/cla/deepask-image-uplift/styles-library.seed.json
// Default out:  knowledge/art-styles.yaml
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..', '..');
function arg(name, def) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(`--${name}=`.length) : def;
}

const seedPath = path.resolve(REPO, arg('seed', '.archives/cla/deepask-image-uplift/styles-library.seed.json'));
const outPath = path.resolve(REPO, arg('out', 'knowledge/art-styles.yaml'));

// kebab slug; NAME_RE (shared with the resolver/validator) forbids dots, mirrors design-systems.
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[''"().,/]/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// YAML string escaper for a double-quoted scalar.
function q(s) {
  return '"' + String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
if (!Array.isArray(seed)) throw new Error('seed must be a JSON array');

const ids = new Set();
const entries = seed.map((s) => {
  let id = slugify(s.name);
  if (ids.has(id)) id = `${id}-${s.id}`; // guard against rare slug collision
  ids.add(id);
  return {
    id,
    seed_id: s.id,
    name: s.name,
    tone: s.tone || '',
    layout: s.layout || '',
    secondary_palette: s.colors || '', // RENAMED from `colors` — accent guidance only; brand palette wins.
    display_type: s.typography || '',  // RENAMED from `typography` — display-headline character only.
    assets: s.assets || '',            // THE illustration lever (no brand-axis counterpart).
  };
});

const header = `# ============================================================================
# art-styles.yaml — deepask artistic-genre registry (capability deepask v1.2-image)
# ============================================================================
# The SECOND, orthogonal aesthetic axis for deepask image formats (img-slide,
# infographics). Multiplies AGAINST the brand --style axis (knowledge/design-
# systems.yaml): brand owns palette/logo/body-type; a genre owns composition
# (layout) + material/motifs (assets) + mood (tone) + a SECONDARY accent
# (secondary_palette) + display-headline character (display_type).
#
# Orthogonality is STRUCTURAL: a genre has NO \`colors\`/\`background\`/\`primary\`
# token — only \`secondary_palette\` PROSE — so it can never shadow the brand core
# palette (@cto Phase-5 R5; the merge precedence brand > legibility > genre is in
# 06-ai-ops/skills/deepask/image-compose + aesthetic). Resolved by
# scripts/deepask/art-style.cjs (resolveArtStyle, AD-3 non-interactive hard-fail).
#
# Seeded from the founder-supplied 80-style library (all 80; the founder elected
# the full corpus over the Muse "ship 3" restraint — ops.decisions
# 'deepask-image-uplift-v1-2-artistic-genre-axis'). This YAML is the source of
# truth and is hand-maintained thereafter (NOT re-generated in CI), exactly like
# design-systems.yaml. Bootstrap: scripts/deepask/gen-art-styles-registry.cjs.
#
# Schema:    knowledge/schemas/art-styles.schema.json
# Validator: scripts/cross-tier/validate-art-styles.cjs (L2 critical; wired into
#            check-consistency.cjs AND .github/workflows/cross-tier-consistency.yml)
# ============================================================================

version: "1.0.0"
schema: knowledge/schemas/art-styles.schema.json

art_styles:
`;

const body = entries
  .map(
    (e) =>
      `  - id: ${e.id}\n` +
      `    seed_id: ${e.seed_id}\n` +
      `    name: ${q(e.name)}\n` +
      `    tone: ${q(e.tone)}\n` +
      `    layout: ${q(e.layout)}\n` +
      `    secondary_palette: ${q(e.secondary_palette)}\n` +
      `    display_type: ${q(e.display_type)}\n` +
      `    assets: ${q(e.assets)}\n`
  )
  .join('');

fs.writeFileSync(outPath, header + body);
console.log(`[OK] wrote ${path.relative(REPO, outPath)} — ${entries.length} art-styles`);
