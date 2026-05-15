#!/usr/bin/env node
// L1/L2 validator: workforce persona registry ↔ ROLES.md ↔ runtime files.
//
// Invariants enforced (critical):
//   1. Schema valid is delegated to validate-tier1.cjs; here we trust schema.
//   2. For EVERY persona in knowledge/workforce-personas.yaml:
//      - binds_to.primary MUST exist as a `role: <name>` block in
//        governance/ROLES.md.
//      - If a role in ROLES.md has `personas_bound: [...]`, every entry there
//        must match a persona in the registry. Bidirectional check.
//      - The persona's `default_hitl_max` MUST NOT exceed the bound role's
//        `hitl_max_tier`. Narrowing OK, broadening forbidden.
//   3. naming policy: slug pattern matches `^[a-z]{3,5}$`.
//   4. status enum: one of active|planned|deferred|retired.
//
// Conditional checks (only when persona is `status: active`):
//   5. Folder 06-ai-ops/workforce-personas/<slug>/ exists.
//   6. .claude/agents/<slug>.md exists.
//   7. .claude/commands/<slug>.md exists.
//
// Active-persona file checks emit a "drift detected" failure ONLY when:
//   - the persona is active, AND
//   - the runtime files are missing.
// They DO NOT fail when status is planned (those personas are by design not
// yet wired up).
//
// Exit codes:
//   0 — all clean
//   1 — at least one critical drift
//
// See: .archives/workforces/00-architecture-decisions/ADR-003-mapping-csuite-to-roles.md
//      knowledge/workforce-personas.yaml
//      governance/ROLES.md
//      .archives/workforces/05-integration-with-existing.md §8

'use strict';

const fs = require('fs');
const path = require('path');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('js-yaml not installed. Run: pnpm install');
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REGISTRY_PATH = path.join(REPO_ROOT, 'knowledge', 'workforce-personas.yaml');
const ROLES_PATH = path.join(REPO_ROOT, 'governance', 'ROLES.md');
const PERSONA_HOME_DIR = path.join(REPO_ROOT, '06-ai-ops', 'workforce-personas');
const AGENTS_DIR = path.join(REPO_ROOT, '.claude', 'agents');
const COMMANDS_DIR = path.join(REPO_ROOT, '.claude', 'commands');

const HITL_TIER_ORDER = ['A', 'B', 'C', 'D-Std', 'D-MAX'];
const STATUS_ENUM = new Set(['active', 'planned', 'deferred', 'retired']);
const SLUG_PATTERN = /^[a-z]{3,5}$/;

const errors = [];
const warnings = [];

function loadRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    errors.push(`registry missing at ${REGISTRY_PATH}`);
    return null;
  }
  try {
    return yaml.load(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {
    errors.push(`registry parse error: ${e.message}`);
    return null;
  }
}

// Parse ROLES.md to extract { roleName: { hitl_max_tier, personas_bound } }
// Roles are defined in markdown ```yaml blocks introduced by `role: <name>`.
// We do a light parse: scan for `role: ` lines, capture the YAML block until
// the closing ``` and extract the two fields we need.
function parseRolesMd() {
  if (!fs.existsSync(ROLES_PATH)) {
    errors.push(`ROLES.md missing at ${ROLES_PATH}`);
    return {};
  }
  const text = fs.readFileSync(ROLES_PATH, 'utf8');
  const roles = {};
  const blockRegex = /```yaml\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = blockRegex.exec(text)) !== null) {
    const blockText = m[1];
    // Quick filter: only consider blocks that look like role definitions
    if (!/^role:\s*/m.test(blockText)) continue;
    try {
      const obj = yaml.load(blockText);
      if (!obj || typeof obj !== 'object' || !obj.role) continue;
      roles[obj.role] = {
        hitl_max_tier: obj.hitl_max_tier || null,
        personas_bound: Array.isArray(obj.personas_bound) ? obj.personas_bound : [],
      };
    } catch {
      // Skip malformed blocks; the YAML schema-validation pipeline catches them.
    }
  }
  return roles;
}

function tierRank(t) {
  if (t == null) return -1;
  return HITL_TIER_ORDER.indexOf(t);
}

function checkSlugPattern(slug) {
  if (!SLUG_PATTERN.test(slug)) {
    errors.push(`persona slug "${slug}" violates naming policy ^[a-z]{3,5}$`);
  }
}

function checkStatus(slug, status) {
  if (!STATUS_ENUM.has(status)) {
    errors.push(`persona ${slug}: status "${status}" not in {active|planned|deferred|retired}`);
  }
}

function checkBindingExists(slug, persona, roles) {
  if (!persona.binds_to || !persona.binds_to.primary) {
    errors.push(`persona ${slug}: missing binds_to.primary`);
    return null;
  }
  const primaryRole = persona.binds_to.primary;
  if (primaryRole === 'TBD') {
    // Deferred personas may have TBD bindings; allowed only when status is deferred.
    if (persona.status !== 'deferred') {
      errors.push(`persona ${slug}: binds_to.primary='TBD' requires status='deferred' (got '${persona.status}')`);
    }
    return null;
  }
  if (!(primaryRole in roles)) {
    // Planned personas may reference roles that haven't been added to ROLES.md yet
    // (e.g., cdo → design-lead, added when CDO ships in Phase 3). For active
    // personas this MUST be a real role; for planned this is a warning only.
    if (persona.status === 'active') {
      errors.push(
        `persona ${slug} (status=active): binds_to.primary='${primaryRole}' is NOT a role in governance/ROLES.md`
      );
    } else {
      warnings.push(
        `persona ${slug} (status=${persona.status}): binds_to.primary='${primaryRole}' not yet in governance/ROLES.md (add before flipping to active)`
      );
    }
    return null;
  }
  return primaryRole;
}

function checkNarrowing(slug, persona, primaryRole, roles) {
  if (!primaryRole) return;
  const role = roles[primaryRole];
  if (!role.hitl_max_tier) {
    warnings.push(`role ${primaryRole}: hitl_max_tier not parseable; cannot verify narrowing for persona ${slug}`);
    return;
  }
  const personaTier = persona.default_hitl_max;
  if (tierRank(personaTier) > tierRank(role.hitl_max_tier)) {
    errors.push(
      `persona ${slug} default_hitl_max='${personaTier}' BROADENS bound role ${primaryRole} hitl_max_tier='${role.hitl_max_tier}' — forbidden per ADR-003`
    );
  }
}

function checkBackReference(slug, persona, primaryRole, roles) {
  if (!primaryRole) return;
  const role = roles[primaryRole];
  if (!role.personas_bound.includes(slug)) {
    // Back-reference required for active personas only. Planned personas
    // get their back-ref atomically with the status→active flip in a future PR.
    if (persona.status === 'active') {
      errors.push(
        `role ${primaryRole}: governance/ROLES.md missing back-reference personas_bound: [${slug}] (registry says active persona ${slug} binds here)`
      );
    } else {
      warnings.push(
        `role ${primaryRole}: governance/ROLES.md does not yet list personas_bound: [${slug}] — add when flipping ${slug} to active`
      );
    }
  }
}

function checkReverseBackReferences(roles, registry) {
  const personaSlugs = new Set(Object.keys(registry.personas || {}));
  for (const [roleName, info] of Object.entries(roles)) {
    for (const slug of info.personas_bound) {
      if (!personaSlugs.has(slug)) {
        // A role lists personas_bound: [<slug>] but no such persona in registry.
        // Always critical: this is a real drift bug regardless of phase.
        errors.push(
          `role ${roleName}: governance/ROLES.md lists personas_bound: [${slug}] but no such persona in registry`
        );
      } else {
        // Verify the persona's binds_to.primary points back to this role
        // (contextual ok; primary is the strict check).
        const persona = registry.personas[slug];
        const primary = persona.binds_to && persona.binds_to.primary;
        const contextual = (persona.binds_to && persona.binds_to.contextual) || [];
        if (primary !== roleName && !contextual.includes(roleName)) {
          errors.push(
            `role ${roleName}: personas_bound: [${slug}] but persona's binds_to does not reference ${roleName} (primary='${primary}', contextual=${JSON.stringify(contextual)})`
          );
        }
      }
    }
  }
}

function checkRuntimeFilesForActive(slug, persona) {
  if (persona.status !== 'active') return;

  const personaDir = path.join(PERSONA_HOME_DIR, slug);
  const agentFile = path.join(AGENTS_DIR, `${slug}.md`);
  const commandFile = path.join(COMMANDS_DIR, `${slug}.md`);

  if (!fs.existsSync(personaDir)) {
    errors.push(`persona ${slug} status=active but folder missing: 06-ai-ops/workforce-personas/${slug}/`);
  } else {
    const required = ['README.md', 'PERSONA.md', 'playbook.md', 'routing-matrix.md', 'kpis.md', 'agent.md', 'command.md'];
    for (const f of required) {
      if (!fs.existsSync(path.join(personaDir, f))) {
        errors.push(`persona ${slug} status=active but missing spec file: 06-ai-ops/workforce-personas/${slug}/${f}`);
      }
    }
  }

  if (!fs.existsSync(agentFile)) {
    errors.push(`persona ${slug} status=active but missing .claude/agents/${slug}.md`);
  }
  if (!fs.existsSync(commandFile)) {
    errors.push(`persona ${slug} status=active but missing .claude/commands/${slug}.md`);
  }
}

function main() {
  const registry = loadRegistry();
  if (!registry) {
    finish();
    return;
  }
  const roles = parseRolesMd();

  for (const [slug, persona] of Object.entries(registry.personas || {})) {
    checkSlugPattern(slug);
    checkStatus(slug, persona.status);
    const primaryRole = checkBindingExists(slug, persona, roles);
    checkNarrowing(slug, persona, primaryRole, roles);
    checkBackReference(slug, persona, primaryRole, roles);
    checkRuntimeFilesForActive(slug, persona);
  }

  checkReverseBackReferences(roles, registry);

  finish();
}

function finish() {
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✓ workforce-personas: registry ↔ ROLES.md ↔ runtime all consistent');
    process.exit(0);
  }
  for (const w of warnings) console.log(`  ⚠ ${w}`);
  for (const e of errors) console.log(`  ✗ ${e}`);
  if (errors.length > 0) {
    console.log(`\n${errors.length} critical drift detected.`);
    process.exit(1);
  }
  console.log(`\n${warnings.length} warnings (non-blocking).`);
  process.exit(0);
}

main();
