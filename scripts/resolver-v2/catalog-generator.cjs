#!/usr/bin/env node
'use strict';
/**
 * scripts/resolver-v2/catalog-generator.cjs — one-time + idempotent catalog generator.
 *
 * Walks source frontmatter (SKILL.md, command.md, agent.md, persona.md, mcp-tools.yaml)
 * and emits knowledge/recipients/{skills,commands,agents,personas,mcps}.md in v2 format.
 *
 * Strategy:
 *   - Read frontmatter description as "When to use" (the primary trigger signal for LLM)
 *   - Fall back to body H1 + first paragraph if no description
 *   - Compose `Invoke:` from kind conventions
 *   - Preserve manual overrides via `<!-- override-start --> ... <!-- override-end -->` markers
 *
 * Usage:
 *   node scripts/resolver-v2/catalog-generator.cjs [--dry-run] [--kind=skill|command|agent|persona|mcp]
 *
 * Exit:
 *   0 — success
 *   1 — error
 *   2 — would-write but --dry-run
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// resolver-plan v1.0 (Sprint 1): deterministic per-entry enrichment (axis +
// hitl_tier/side_effect for capability kinds; authority/freshness/grounding/
// columns for content kinds). NO LLM, NO network — pure static derivation.
const { enrichEntry } = require('./enrichment.cjs');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const KINDS = ['skill', 'command', 'agent', 'persona', 'mcp', 'wiki', 'sop', 'capability', 'workflow', 'schedule', 'hook', 'page', 'view', 'metric', 'runbook', 'external-source'];

const CONFIG = {
  skill: {
    sourceDir: '06-ai-ops/skills',
    pattern: /\/SKILL\.md$/,
    invokeTemplate: (slug) => `\`Skill({ skill: "${slug}" })\``,
    file: 'skills.md',
  },
  command: {
    sourceDir: '.claude/commands',
    pattern: /\.md$/,
    excludePattern: /(README|CLAUDE)\.md$/i,
    invokeTemplate: (slug) => `\`/${slug}\``,
    file: 'commands.md',
  },
  agent: {
    sourceDir: '.claude/agents',
    pattern: /\.md$/,
    excludePattern: /(README|CLAUDE)\.md$/i,
    invokeTemplate: (slug) => `\`Agent({ subagent_type: "${slug}", ... })\``,
    file: 'agents.md',
  },
  persona: {
    sourceDir: '06-ai-ops/workforce-personas',
    pattern: /\/PERSONA\.md$/,  // only PERSONA.md is the canonical persona definition
    invokeTemplate: (slug) => `\`Agent({ subagent_type: "${slug}", ... })\` or \`/${slug}\``,
    file: 'personas.md',
  },
  mcp: {
    sourceFile: 'knowledge/mcp-tools.yaml',
    invokeTemplate: (slug) => `\`mcp__supabase-ops__${slug}\` (or per server)`,
    file: 'mcps.md',
  },
  // v2.1 NEW kinds — composition expansion
  wiki: {
    sourceDir: 'wiki',
    // Pattern: wiki/<source-slug>/source.md (v4.0 source-grouped layout)
    // Skip _prefix, README, ENTITY_TYPES, _index/, capabilities/ (handled by capability kind)
    invokeTemplate: (slug) => `\`Read("wiki/${slug}/source.md")\` or \`mcp__supabase-ops__wiki_get_page({slug: "${slug}"})\``,
    file: 'wikis.md',
  },
  sop: {
    sourceDir: '.',
    // Pattern: **/sops/SOP-{PILLAR}-XXX-{name}/flow.yaml (with README.md fallback)
    invokeTemplate: (slug) => `Triggered by event subscriptions, or \`Read("<path>/${slug}/flow.yaml")\``,
    file: 'sops.md',
  },
  capability: {
    sourceFile: 'knowledge/capability-registry.yaml',
    invokeTemplate: (slug) => `\`Read("wiki/capabilities/${slug}/spec.md")\` or \`/cla update ${slug}\``,
    file: 'capabilities.md',
  },
  workflow: {
    sourceDir: 'workflows',
    pattern: /\.(yaml|yml)$/,
    invokeTemplate: (slug) => `\`Read("workflows/${slug}.yaml")\``,
    file: 'workflows.md',
  },
  schedule: {
    sourceFile: 'knowledge/schedules.yaml',
    invokeTemplate: (slug) => `Auto-triggered by pg_cron + dispatcher (no manual invoke)`,
    file: 'schedules.md',
  },
  hook: {
    sourceDir: '.claude/hooks',
    pattern: /\.md$/,
    excludePattern: /(README|CLAUDE|SPEC)\.md$/i,
    invokeTemplate: (slug) => `Auto-triggered (PreToolUse/PostToolUse) per hook frontmatter`,
    file: 'hooks.md',
  },
  // v2.2 NEW kinds — context sources (Tier 1 pages, SQL views, KPIs, runbooks)
  page: {
    // Multi-source: 00-core/*.md + governance/*.md + knowledge/*.yaml (top-level)
    // Source dirs encoded directly in generatePages() — no single sourceDir.
    invokeTemplate: (relPath) => `\`Read("${relPath}")\``,
    file: 'pages.md',
  },
  view: {
    sourceDir: 'supabase/migrations',
    pattern: /\.sql$/,
    invokeTemplate: (qualifiedView) => `\`mcp__supabase-ops__query({sql: "SELECT * FROM ${qualifiedView} LIMIT 10"})\``,
    file: 'views.md',
  },
  metric: {
    sourceFile: 'knowledge/kpi-ownership.yaml',
    invokeTemplate: (kpiId) => `\`mcp__supabase-ops__query\` against the source listed in the entry, or read the KPI definition at \`knowledge/kpi-ownership.yaml#${kpiId}\``,
    file: 'metrics.md',
  },
  runbook: {
    sourceDir: 'wiki/runbooks',
    pattern: /\.md$/,
    invokeTemplate: (slug) => `\`Read("wiki/runbooks/${slug}.md")\``,
    file: 'runbooks.md',
  },
  'external-source': {
    sourceFile: 'knowledge/external-sources.yaml',
    invokeTemplate: (invokePattern) => invokePattern,
    file: 'external-sources.md',
  },
};

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { frontmatter: {}, body: content };
  try {
    return { frontmatter: yaml.load(m[1]) || {}, body: m[2] };
  } catch (e) {
    return { frontmatter: {}, body: m[2] || content };
  }
}

function extractFirstParagraph(body) {
  // Strip ALL leading headings (H1, H2, etc.) until we hit actual prose
  let stripped = body;
  while (true) {
    const m = stripped.match(/^[\s\n]*#+\s+[^\n]*\n+/);
    if (!m) break;
    stripped = stripped.slice(m[0].length);
  }
  // Skip leading list items / blank lines too
  stripped = stripped.replace(/^([\s\n]*[-*]\s+[^\n]*\n+)+/, '').trim();
  const para = stripped.split(/\n\n/)[0] || '';
  // Strip markdown emphasis + code + horizontal rules
  return para.replace(/[*_`]/g, '').replace(/\s+/g, ' ').trim();
}

function walkDir(dir, pattern, excludePattern) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  function recurse(d) {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      // Normalize to forward slashes so the source patterns (e.g. /\/SKILL\.md$/)
      // and the slug extractors below — all written with `/` — match on Windows
      // checkouts too, where path.join would otherwise yield backslashes.
      const fp = path.join(d, ent.name).split(path.sep).join('/');
      if (ent.isDirectory()) recurse(fp);
      else if (pattern.test(fp) && (!excludePattern || !excludePattern.test(fp))) {
        out.push(fp);
      }
    }
  }
  recurse(dir);
  return out;
}

function slugFromSkillPath(fp) {
  // 06-ai-ops/skills/eval-evo/orchestrator/SKILL.md → eval-evo/orchestrator
  // 06-ai-ops/skills/customer-onboarding/SKILL.md → customer-onboarding
  const m = fp.match(/06-ai-ops\/skills\/(.+)\/SKILL\.md$/);
  return m ? m[1] : null;
}

function slugFromCmdPath(fp) {
  // .claude/commands/cla.md → cla
  return path.basename(fp, '.md');
}

function slugFromAgentPath(fp) {
  return path.basename(fp, '.md');
}

function slugFromPersonaPath(fp) {
  // 06-ai-ops/workforce-personas/ceo/PERSONA.md → ceo
  // Parent dir name = persona slug
  const parent = path.basename(path.dirname(fp));
  return parent;
}

function descFromFrontmatter(fm, fallback) {
  if (typeof fm.description === 'string' && fm.description.trim()) return fm.description.trim();
  if (typeof fm.purpose === 'string' && fm.purpose.trim()) return fm.purpose.trim();
  return fallback;
}

function pillarFromPath(fp) {
  const m = fp.match(/(0[0-9]|10)-[a-z-]+/);
  return m ? m[0] : null;
}

function roleScopeFromFrontmatter(fm) {
  if (Array.isArray(fm.role_scope)) return fm.role_scope;
  if (Array.isArray(fm.personas_bound)) return fm.personas_bound;
  if (typeof fm.hitl_max_tier === 'string') return ['*'];
  return ['*'];
}

function statusFromFrontmatter(fm) {
  if (typeof fm.status === 'string') return fm.status;
  return 'active';
}

function emitEntry({
  id, kind, when_to_use, invoke, composes_with, role_scope, status, pillar, aliases, disambiguator,
  // resolver-plan v1.0 (Sprint 1) — ADDITIVE enrichment fields. Backward-compatible:
  // catalog-loader.cjs ignores any **Field:** it doesn't know, and these labels
  // never contain a second ':' (loader regex /^\*\*([^*]+):\*\*/). `Columns` uses
  // the inline-comma convention (NOT a multi-line list) so the loader can't glom
  // continuation lines into the previous field.
  axis, hitl_tier, side_effect, authority, freshness, grounding, columns,
}) {
  const lines = [];
  lines.push(`## ${id}`);
  lines.push('');
  lines.push(`**Kind:** ${kind}`);
  if (axis) lines.push(`**Axis:** ${axis}`);
  lines.push(`**When to use:** ${when_to_use}`);
  lines.push('');
  lines.push(`**Invoke:** ${invoke}`);
  // Capability-axis enrichment.
  if (hitl_tier) lines.push(`**HITL tier:** ${hitl_tier}`);
  if (side_effect) lines.push(`**Side effect:** ${side_effect}`);
  // Content-axis enrichment.
  if (authority) lines.push(`**Authority:** ${authority}`);
  if (freshness) lines.push(`**Freshness:** ${freshness}`);
  if (grounding) lines.push(`**Grounding:** ${grounding}`);
  if (Array.isArray(columns) && columns.length > 0) {
    lines.push(`**Columns:** ${columns.join(', ')}`);
  }
  if (composes_with && composes_with.length > 0) {
    lines.push('');
    lines.push('**Composes with:**');
    for (const c of composes_with) lines.push(`- ${c}`);
  }
  lines.push('');
  if (aliases && aliases.length > 0) lines.push(`**Aliases:** ${aliases.join(', ')}`);
  if (disambiguator) lines.push(`**Disambiguator:** ${disambiguator}`);
  lines.push(`**Role scope:** ${(role_scope || ['*']).join(', ')}`);
  lines.push(`**Status:** ${status || 'active'}`);
  if (pillar) lines.push(`**Pillar:** ${pillar}`);
  lines.push('');
  return lines.join('\n');
}

/**
 * resolver-plan v1.0 (Sprint 1): merge deterministic enrichment onto every entry.
 *
 * Each entry already carries its `kind`; `signalsFor(entry)` supplies the
 * per-kind raw source signals (declared HITL tier, SQL source text, grounding
 * pointer, parsed columns) that the generator already parsed. enrichEntry()
 * owns the classification rules — so the generators stay free of derivation logic
 * (Kent Beck: one reason to change per function). Mutates + returns `entries`.
 *
 * @param {Object[]} entries — generated recipient entries (each has `kind`).
 * @param {(entry: Object) => Object} [signalsFor] — extra signals per entry.
 */
function withEnrichment(entries, signalsFor) {
  for (const entry of entries) {
    const extra = signalsFor ? signalsFor(entry) : {};
    Object.assign(entry, enrichEntry({ kind: entry.kind, ...extra }));
  }
  return entries;
}

function generateSkills() {
  const cfg = CONFIG.skill;
  const files = walkDir(path.join(REPO_ROOT, cfg.sourceDir), cfg.pattern, cfg.excludePattern);
  const entries = [];
  for (const fp of files) {
    const slug = slugFromSkillPath(fp);
    if (!slug) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Skill at ${cfg.sourceDir}/${slug}`;
    const desc = descFromFrontmatter(frontmatter, fallbackDesc);
    entries.push({
      id: `skill/${slug}`,
      kind: 'skill',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: roleScopeFromFrontmatter(frontmatter),
      status: statusFromFrontmatter(frontmatter),
      pillar: pillarFromPath(fp),
      // resolver-plan v1.0: a skill may declare hitl_max_tier in frontmatter (an
      // explicit HITL signal). Use it; else enrichment defaults conservative B.
      _rawTier: typeof frontmatter.hitl_max_tier === 'string' ? frontmatter.hitl_max_tier : null,
    });
  }
  withEnrichment(entries, (e) => ({ rawTier: e._rawTier }));
  for (const e of entries) { delete e._rawTier; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateCommands() {
  const cfg = CONFIG.command;
  const files = walkDir(path.join(REPO_ROOT, cfg.sourceDir), cfg.pattern, cfg.excludePattern);
  const entries = [];
  for (const fp of files) {
    const slug = slugFromCmdPath(fp);
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Slash command /${slug}`;
    const desc = descFromFrontmatter(frontmatter, fallbackDesc);
    entries.push({
      id: `command/${slug}`,
      kind: 'command',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: roleScopeFromFrontmatter(frontmatter),
      status: statusFromFrontmatter(frontmatter),
      pillar: pillarFromPath(fp),
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateAgents() {
  const cfg = CONFIG.agent;
  const files = walkDir(path.join(REPO_ROOT, cfg.sourceDir), cfg.pattern, cfg.excludePattern);
  const entries = [];
  for (const fp of files) {
    const slug = slugFromAgentPath(fp);
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Subagent ${slug}`;
    const desc = descFromFrontmatter(frontmatter, fallbackDesc);
    entries.push({
      id: `agent/${slug}`,
      kind: 'agent',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: roleScopeFromFrontmatter(frontmatter),
      status: statusFromFrontmatter(frontmatter),
      pillar: pillarFromPath(fp),
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generatePersonas() {
  const cfg = CONFIG.persona;
  const entries = [];
  const seenSlugs = new Set();

  // 1. PRIORITY: workforce-personas.yaml (canonical structured data with full_name + notes)
  const workforcePath = path.join(REPO_ROOT, 'knowledge', 'workforce-personas.yaml');
  if (fs.existsSync(workforcePath)) {
    try {
      const wfDoc = yaml.load(fs.readFileSync(workforcePath, 'utf-8'));
      if (wfDoc && wfDoc.personas && typeof wfDoc.personas === 'object') {
        for (const [slug, persona] of Object.entries(wfDoc.personas)) {
          if (!slug || seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const fullName = persona.full_name || slug.toUpperCase();
          const notes = (persona.notes || '').toString().trim().split('\n')[0] || '';
          const phase = persona.phase || '?';
          const stat = persona.status || 'unknown';
          const bindsTo = persona.binds_to?.primary || 'unknown';
          const desc = `${fullName} persona (Phase ${phase}, status: ${stat}, bound to technical role: ${bindsTo}). ${notes}`.trim();
          entries.push({
            id: `persona/${slug}`,
            kind: 'persona',
            when_to_use: desc,
            invoke: cfg.invokeTemplate(slug),
            composes_with: [],
            aliases: [fullName],
            role_scope: ['*'],
            status: persona.status === 'planned' ? 'stub' : (persona.status || 'active'),
            pillar: '06-ai-ops',
          });
        }
      }
    } catch (_e) { /* skip on parse error */ }
  }

  // 2. FALLBACK: walk PERSONA.md files for personas not in workforce yaml
  const files = walkDir(path.join(REPO_ROOT, cfg.sourceDir), cfg.pattern, cfg.excludePattern);
  for (const fp of files) {
    const slug = slugFromPersonaPath(fp);
    if (!slug || slug === 'workforce-personas' || slug.startsWith('_')) continue;
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `C-suite persona ${slug}`;
    const desc = descFromFrontmatter(frontmatter, fallbackDesc);
    entries.push({
      id: `persona/${slug}`,
      kind: 'persona',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: roleScopeFromFrontmatter(frontmatter),
      status: statusFromFrontmatter(frontmatter),
      pillar: '06-ai-ops',
    });
  }

  // 3. Extract routes from cla-routing-keywords.yaml (domain routes referencing cxos)
  const claRoutingPath = path.join(REPO_ROOT, 'knowledge', 'cla-routing-keywords.yaml');
  if (fs.existsSync(claRoutingPath)) {
    try {
      const claDoc = yaml.load(fs.readFileSync(claRoutingPath, 'utf-8'));
      if (claDoc && claDoc.routes && typeof claDoc.routes === 'object') {
        for (const [domainSlug, route] of Object.entries(claDoc.routes)) {
          const slug = `cla-${domainSlug}`;
          if (seenSlugs.has(slug)) continue;
          seenSlugs.add(slug);
          const kws = Array.isArray(route.keywords) ? route.keywords.join(', ') : '';
          entries.push({
            id: `persona/${slug}`,
            kind: 'persona',
            when_to_use: `CLA domain routing slot for "${domainSlug}" → dispatches to ${route.cxo} (fallback: ${route.fallback_role}). Keywords: ${kws}`,
            invoke: `via /cla propose (auto-routes to ${route.cxo})`,
            composes_with: [`persona/${route.cxo}`],
            aliases: Array.isArray(route.keywords) ? route.keywords : [],
            role_scope: ['*'],
            status: 'active',
            pillar: '06-ai-ops',
            disambiguator: 'CLA routing slot, not standalone persona',
          });
        }
      }
    } catch (_e) { /* skip on parse error */ }
  }

  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateMcps() {
  const cfg = CONFIG.mcp;
  const fp = path.join(REPO_ROOT, cfg.sourceFile);
  if (!fs.existsSync(fp)) return [];
  const doc = yaml.load(fs.readFileSync(fp, 'utf-8'));
  if (!doc || !Array.isArray(doc.tools)) return [];
  const entries = [];
  for (const tool of doc.tools) {
    if (!tool.id || !tool.description) continue;
    const server = tool.server || 'unknown';
    const slug = `${server}__${tool.id}`;
    entries.push({
      id: `mcp/${slug}`,
      kind: 'mcp',
      when_to_use: tool.description.trim().replace(/\s+/g, ' '),
      // Invoke MUST use the server name VERBATIM as it appears in .mcp.json
      // (the Claude Code tool registry keeps the key as-is, e.g. `supabase-ops`,
      // NOT `supabase_ops`). Do not sanitize hyphens — that produced a
      // pervasive phantom-name drift. Verified against the live registry +
      // enforced by validate-mcp-catalog-coherence.cjs (server-fidelity).
      invoke: `\`mcp__${server}__${tool.id}\``,
      composes_with: [],
      role_scope: Array.isArray(tool.role_scope) ? tool.role_scope : ['*'],
      // mcp-tools.yaml lifecycle vocab is live|planned|deprecated (per schema);
      // the resolver's isActive() treats only 'active'/empty as shown. Map
      // live/omitted → active so a genuinely-live tool is never hidden (latent
      // bug: an explicit `status: live` used to be filtered out of INDEX).
      status: (tool.status === 'live' || !tool.status) ? 'active' : tool.status,
      pillar: '06-ai-ops',
      // resolver-plan v1.0 signal: per-tool HITL tier_default from mcp-tools.yaml
      // (governance/HITL.md Appendix A). side_effect is then derived from the tier
      // (A→none, B+→write) — every current ops/gbrain write tool is a DB write, none
      // imply send/money/publish, so the tier-derived default is correct. Stripped post-enrich.
      _rawTier: tool.tier_default,
    });
  }
  withEnrichment(entries, (e) => ({ rawTier: e._rawTier }));
  for (const e of entries) { delete e._rawTier; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

// ===========================================================================
// v2.1 NEW GENERATORS — wiki, sop, capability, workflow, schedule, hook
// ===========================================================================

function generateWikis() {
  const cfg = CONFIG.wiki;
  const wikiRoot = path.join(REPO_ROOT, cfg.sourceDir);
  if (!fs.existsSync(wikiRoot)) return [];
  const entries = [];
  // v4.0 source-grouped layout: each wiki/<source-slug>/source.md is one entry
  for (const ent of fs.readdirSync(wikiRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const slug = ent.name;
    if (slug.startsWith('_') || slug === 'capabilities' || slug === 'runbooks') continue;
    const sourceMd = path.join(wikiRoot, slug, 'source.md');
    if (!fs.existsSync(sourceMd)) continue;
    const content = fs.readFileSync(sourceMd, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Wiki source: ${slug}`;
    let desc = descFromFrontmatter(frontmatter, fallbackDesc);
    if (desc.length > 400) desc = desc.slice(0, 400) + '...';
    entries.push({
      id: `wiki/${slug}`,
      kind: 'wiki',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: ['*'],
      status: frontmatter.status || 'active',
      pillar: frontmatter.pillar || null,
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateSops() {
  const cfg = CONFIG.sop;
  const entries = [];
  // Walk all */sops/SOP-*/ directories across the repo
  function findSopDirs(dir, depth = 0, maxDepth = 6) {
    if (depth > maxDepth) return [];
    if (!fs.existsSync(dir)) return [];
    const out = [];
    let dirEntries;
    try {
      dirEntries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_e) {
      return out;
    }
    for (const ent of dirEntries) {
      if (!ent.isDirectory()) continue;
      if (ent.name === 'node_modules' || ent.name.startsWith('.git') ||
          ent.name === 'docs' || ent.name === 'tests' || ent.name === '.archives' ||
          ent.name === 'build' || ent.name === '.next' || ent.name === 'raw' ||
          ent.name === 'runtime' || ent.name === 'wiki' ||
          ent.name === '_templates' || ent.name === '.claude') continue;
      const sub = path.join(dir, ent.name);
      if (ent.name.startsWith('SOP-')) {
        out.push(sub);
      } else {
        out.push(...findSopDirs(sub, depth + 1, maxDepth));
      }
    }
    return out;
  }
  const sopDirs = findSopDirs(REPO_ROOT);
  const seenSlugs = new Set();
  for (const sopDir of sopDirs) {
    const slug = path.basename(sopDir);
    if (seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    // Try flow.yaml first
    const flowYaml = path.join(sopDir, 'flow.yaml');
    const readmeMd = path.join(sopDir, 'README.md');
    let desc = `Standard Operating Procedure ${slug}`;
    let status = 'active';
    let roleScope = ['*'];
    // resolver-plan v1.0: a SOP's flow.yaml may declare a flow-LEVEL HITL tier
    // (top-level `hitl_tier` or `hitl_default`). Use it; else default conservative B.
    let flowTier = null;

    if (fs.existsSync(flowYaml)) {
      try {
        const flow = yaml.load(fs.readFileSync(flowYaml, 'utf-8'));
        if (flow) {
          if (typeof flow.purpose === 'string') desc = flow.purpose.trim().replace(/\s+/g, ' ');
          else if (typeof flow.description === 'string') desc = flow.description.trim().replace(/\s+/g, ' ');
          if (typeof flow.status === 'string') status = flow.status;
          if (Array.isArray(flow.roles_required)) roleScope = flow.roles_required;
          else if (Array.isArray(flow.role_scope)) roleScope = flow.role_scope;
          if (typeof flow.hitl_tier === 'string') flowTier = flow.hitl_tier;
          else if (typeof flow.hitl_default === 'string') flowTier = flow.hitl_default;
        }
      } catch (_e) { /* ignore parse errors */ }
    }
    if (desc === `Standard Operating Procedure ${slug}` && fs.existsSync(readmeMd)) {
      const content = fs.readFileSync(readmeMd, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);
      const fallbackDesc = extractFirstParagraph(body) || desc;
      desc = descFromFrontmatter(frontmatter, fallbackDesc);
    }
    if (desc.length > 400) desc = desc.slice(0, 400) + '...';
    const relPath = path.relative(REPO_ROOT, sopDir);

    entries.push({
      id: `sop/${slug}`,
      kind: 'sop',
      when_to_use: desc,
      invoke: `Triggered by event subscriptions, or \`Read("${relPath}/flow.yaml")\``,
      composes_with: [],
      role_scope: roleScope,
      status,
      pillar: pillarFromPath(sopDir),
      _rawTier: flowTier,  // stripped after enrichment
    });
  }
  withEnrichment(entries, (e) => ({ rawTier: e._rawTier }));
  for (const e of entries) { delete e._rawTier; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateCapabilities() {
  const cfg = CONFIG.capability;
  const fp = path.join(REPO_ROOT, cfg.sourceFile);
  if (!fs.existsSync(fp)) return [];
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(fp, 'utf-8'));
  } catch (_e) {
    return [];
  }
  if (!doc || !Array.isArray(doc.capabilities)) return [];
  const entries = [];
  for (const cap of doc.capabilities) {
    if (!cap.id) continue;
    // Skip superseded capabilities (avoid surfacing old versions)
    if (cap.state === 'superseded' || cap.state === 'deprecated') continue;
    const name = cap.name || cap.id;
    let descRaw = (cap.description || '').toString().trim().split('\n')[0] || '';
    descRaw = descRaw.replace(/\s+/g, ' ');
    const desc = `${name}. ${descRaw}`.slice(0, 400);
    const version = cap.version ? ` v${cap.version}` : '';

    entries.push({
      id: `capability/${cap.id}`,
      kind: 'capability',
      when_to_use: `${desc}${version}`,
      invoke: cfg.invokeTemplate(cap.id),
      composes_with: [],
      role_scope: ['*'],
      status: cap.state || 'unknown',
      pillar: cap.pillar_owner || null,
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateWorkflows() {
  const cfg = CONFIG.workflow;
  const dir = path.join(REPO_ROOT, cfg.sourceDir);
  if (!fs.existsSync(dir)) return [];
  const files = walkDir(dir, cfg.pattern);
  const entries = [];
  for (const fp of files) {
    const slug = path.basename(fp).replace(/\.(yaml|yml)$/, '');
    let desc = `Workflow ${slug}`;
    try {
      const content = fs.readFileSync(fp, 'utf-8');
      const wf = yaml.load(content);
      if (wf && (wf.description || wf.purpose)) {
        desc = (wf.description || wf.purpose).trim().replace(/\s+/g, ' ').slice(0, 400);
      }
    } catch (_e) { /* ignore */ }
    entries.push({
      id: `workflow/${slug}`,
      kind: 'workflow',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(slug),
      composes_with: [],
      role_scope: ['*'],
      status: 'active',
      pillar: '06-ai-ops',
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateSchedules() {
  const cfg = CONFIG.schedule;
  const fp = path.join(REPO_ROOT, cfg.sourceFile);
  if (!fs.existsSync(fp)) return [];
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(fp, 'utf-8'));
  } catch (_e) {
    return [];
  }
  if (!doc || !Array.isArray(doc.schedules)) return [];
  const entries = [];
  for (const sch of doc.schedules) {
    if (!sch.id) continue;
    const cron = sch.cron || '?';
    const handler = sch.handler || sch.skill || '?';
    const descRaw = (sch.description || sch.purpose || `Scheduled job: ${sch.id}`).toString().trim().replace(/\s+/g, ' ');
    const desc = `Cron ${cron}: ${descRaw}`.slice(0, 400);

    entries.push({
      id: `schedule/${sch.id}`,
      kind: 'schedule',
      when_to_use: desc,
      invoke: `Auto-triggered by pg_cron + dispatcher. Handler: \`${handler}\``,
      composes_with: [],
      role_scope: ['founder', 'etl-runner'],
      status: sch.status || (sch.disabled ? 'disabled' : 'active'),
      pillar: '06-ai-ops',
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateHooks() {
  const cfg = CONFIG.hook;
  const dir = path.join(REPO_ROOT, cfg.sourceDir);
  if (!fs.existsSync(dir)) return [];
  const files = walkDir(dir, cfg.pattern, cfg.excludePattern);
  const entries = [];
  for (const fp of files) {
    const slug = path.basename(fp, '.md');
    if (slug.startsWith('_')) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Claude Code hook: ${slug}`;
    const desc = descFromFrontmatter(frontmatter, fallbackDesc);
    const type = frontmatter.type || frontmatter.event || 'PreToolUse';
    const tools = Array.isArray(frontmatter.tools) ? frontmatter.tools.join(',') : (frontmatter.tools || '*');

    entries.push({
      id: `hook/${slug}`,
      kind: 'hook',
      when_to_use: desc.slice(0, 400),
      invoke: `Auto-triggered (${type}) for tools matching: \`${tools}\``,
      composes_with: [],
      role_scope: ['*'],
      status: frontmatter.status || 'active',
      pillar: '06-ai-ops',
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

// ===========================================================================
// v2.2 NEW GENERATORS — page, view, metric, runbook, external-source
// ===========================================================================

// Files within page categories that MUST be excluded from the catalog.
// - SECRETS.md: security alignment with docs-engine (lists secret names by role).
// - founder-profile.md: PII (per docs-engine charter-adapter).
// - README.md / INDEX.md: meta navigation, no operational content.
const PAGE_EXCLUDE = new Set([
  'SECRETS.md',
  'founder-profile.md',
  'README.md',
  'INDEX.md',
  'CLAUDE.md',
]);

function generatePages() {
  const cfg = CONFIG.page;
  const entries = [];

  // Three source roots: 00-core/*.md, governance/*.md, knowledge/*.yaml (top-level only)
  const sources = [
    { dir: '00-core', category: 'core', pattern: /\.md$/ },
    { dir: 'governance', category: 'governance', pattern: /\.md$/ },
    { dir: 'knowledge', category: 'knowledge', pattern: /\.yaml$/, topLevelOnly: true },
  ];

  for (const src of sources) {
    const dir = path.join(REPO_ROOT, src.dir);
    if (!fs.existsSync(dir)) continue;
    const dirEntries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of dirEntries) {
      if (!ent.isFile()) continue;
      if (!src.pattern.test(ent.name)) continue;
      if (PAGE_EXCLUDE.has(ent.name)) continue;
      const fp = path.join(dir, ent.name);
      const relPath = path.relative(REPO_ROOT, fp);
      const baseName = ent.name.replace(/\.(md|yaml|yml)$/, '');
      const slug = `${src.category}-${baseName}`;
      const content = fs.readFileSync(fp, 'utf-8');

      let desc;
      let pillar = null;
      if (ent.name.endsWith('.md')) {
        const { frontmatter, body } = parseFrontmatter(content);
        const fallbackDesc = extractFirstParagraph(body) || `Tier 1 ${src.category} doc: ${baseName}`;
        desc = descFromFrontmatter(frontmatter, fallbackDesc);
        if (frontmatter.pillar) pillar = frontmatter.pillar;
      } else {
        // YAML: extract leading comment block as description; else top of file
        const yamlDesc = extractYamlPurpose(content) || `Tier 1 ${src.category} registry: ${baseName}`;
        desc = yamlDesc;
      }
      if (desc.length > 400) desc = desc.slice(0, 400) + '...';

      entries.push({
        id: `page/${slug}`,
        kind: 'page',
        when_to_use: desc,
        invoke: cfg.invokeTemplate(relPath),
        composes_with: [],
        role_scope: ['*'],
        status: 'active',
        pillar,
        // resolver-plan v1.0: a page IS its own grounding/contract — the file path.
        _grounding: relPath,
      });
    }
  }
  withEnrichment(entries, (e) => ({ grounding: e._grounding }));
  for (const e of entries) { delete e._grounding; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

// Helper: extract a description from a YAML file's leading comment block.
// Returns first non-shebang comment lines collapsed into one paragraph.
function extractYamlPurpose(content) {
  const lines = content.split('\n');
  const buf = [];
  for (const line of lines) {
    const stripped = line.trim();
    if (!stripped) {
      if (buf.length > 0) break;
      continue;
    }
    if (stripped.startsWith('#')) {
      const text = stripped.replace(/^#+\s*/, '').trim();
      if (text) buf.push(text);
    } else {
      break;
    }
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim() || null;
}

/** Remove SQL `--` line comments (to end-of-line), preserving newlines. */
function stripSqlLineComments(sql) {
  return sql.replace(/--[^\n]*/g, '');
}

/**
 * resolver-plan v1.0: best-effort `columns_hint` for a view.
 *
 * Parses the output column list of a `CREATE ... VIEW <name> AS SELECT ... FROM`
 * statement, deterministically (no SQL engine). Strategy: take the text between
 * the view's `AS SELECT` and its first top-level `FROM`, split on top-level commas
 * (depth-aware so `func(a, b)` and `(SELECT ...)` don't split), and for each item
 * resolve the output name = explicit `AS alias` › trailing `alias` › last dotted
 * identifier. `*` (star-select) or any unparseable item yields NO columns (honest
 * absence — deepask reads the DDL in that case) rather than a misleading guess.
 *
 * @param {string} content     — full migration file text.
 * @param {number} fromIndex   — index of the matched CREATE VIEW (search starts here).
 * @returns {string[]} parsed output column names (possibly empty).
 */
function parseViewColumns(content, fromIndex) {
  const slice = content.slice(fromIndex);
  // Find `AS SELECT` (the view body). Allow whitespace/newlines between tokens.
  const asSelect = slice.match(/\bAS\s+SELECT\s+/i);
  if (!asSelect) return [];
  // Strip SQL line comments (`-- … <newline>`) BEFORE parsing — a comment must
  // never become part of a column expression. (Block comments are rare in our
  // view DDL; the depth-aware split + keyword bail handle any residue safely.)
  const afterSelect = stripSqlLineComments(slice.slice(asSelect.index + asSelect[0].length));
  // Find the first top-level FROM (depth 0). Walk char-by-char tracking paren depth.
  const selectList = topLevelSelectList(afterSelect);
  if (selectList === null) return [];
  const items = splitTopLevelCommas(selectList);
  const cols = [];
  for (const raw of items) {
    const name = outputColumnName(raw);
    if (!name) return []; // a star or unparseable item → bail (honest: no hint).
    cols.push(name);
  }
  return cols;
}

/** Return the SELECT-list text up to the first top-level `FROM`, or null. */
function topLevelSelectList(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0) {
      // Match the keyword FROM at a word boundary at depth 0.
      if (/[fF]/.test(ch) && /^from\b/i.test(text.slice(i)) &&
          (i === 0 || /\s/.test(text[i - 1]))) {
        return text.slice(0, i);
      }
    }
  }
  return null; // no top-level FROM found (e.g. SELECT with no FROM) — give up.
}

/** Split a SELECT list on commas that are at paren-depth 0. */
function splitTopLevelCommas(list) {
  const out = [];
  let depth = 0;
  let buf = '';
  for (const ch of list) {
    if (ch === '(') { depth++; buf += ch; }
    else if (ch === ')') { depth--; buf += ch; }
    else if (ch === ',' && depth === 0) { out.push(buf); buf = ''; }
    else buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

// SQL keywords that signal a multi-word EXPRESSION (not a simple aliasable column).
// If an un-aliased item contains any of these, we cannot safely name it → bail.
const SQL_EXPR_KEYWORDS = /\b(CASE|WHEN|THEN|ELSE|END|DISTINCT|OVER|FILTER|WITHIN|ORDER|GROUP|UNION|JOIN|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|CAST)\b/i;

/** Resolve one SELECT item to its output column name (or null if unparseable/star). */
function outputColumnName(rawItem) {
  const item = rawItem.replace(/\s+/g, ' ').trim();
  if (!item || item === '*' || /(^|\.)\*$/.test(item)) return null; // star-select
  // Explicit alias: `... AS alias` (alias is a bare identifier). Always wins.
  const asAlias = item.match(/\sAS\s+"?([a-zA-Z_][a-zA-Z0-9_]*)"?$/i);
  if (asAlias) return asAlias[1];
  // No explicit AS: any keyword-laden / parenthesized expression is unnameable → bail
  // (honest no-hint; deepask reads the DDL in this case).
  if (SQL_EXPR_KEYWORDS.test(item) || /[(),]/.test(item)) return null;
  const tokens = item.split(' ');
  // Implicit alias `expr alias` is only safe for a clean 2-token `col alias` form.
  if (tokens.length === 2) {
    const last = tokens[1].replace(/"/g, '');
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(last) ? last : null;
  }
  if (tokens.length > 2) return null; // multi-token without AS → can't name safely.
  // Single token: bare column, possibly schema-qualified (`t.col` → `col`).
  const dotted = item.split('.');
  const candidate = dotted[dotted.length - 1].replace(/"/g, '');
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(candidate) ? candidate : null;
}

function generateViews() {
  const cfg = CONFIG.view;
  const dir = path.join(REPO_ROOT, cfg.sourceDir);
  if (!fs.existsSync(dir)) return [];
  const files = walkDir(dir, cfg.pattern);
  const entries = [];
  const seenSlugs = new Set();
  // Match: CREATE [OR REPLACE] [MATERIALIZED] VIEW [IF NOT EXISTS] [schema.]view_name
  const viewRe = /CREATE\s+(?:OR\s+REPLACE\s+)?(MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)?)/gi;

  for (const fp of files) {
    const content = fs.readFileSync(fp, 'utf-8');
    let m;
    viewRe.lastIndex = 0;
    while ((m = viewRe.exec(content)) !== null) {
      const isMat = !!m[1];
      const qualified = m[2];
      const hasSchema = qualified.includes('.');
      const [schema, viewName] = hasSchema ? qualified.split('.') : ['public', qualified];
      const slug = `${schema}-${viewName}`;
      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);
      // Extract the preceding comment block as description, if any.
      const upToMatch = content.slice(0, m.index);
      const tail = upToMatch.split('\n').slice(-6); // last 6 lines before CREATE
      const commentLines = [];
      for (const line of tail) {
        const t = line.trim();
        if (t.startsWith('--')) commentLines.push(t.replace(/^--\s*/, ''));
        else if (t === '') continue;
        else commentLines.length = 0; // reset if a non-comment non-blank line shows up
      }
      const descPrefix = commentLines.length > 0 ? commentLines.join(' ').replace(/\s+/g, ' ').trim() : '';
      const kindLabel = isMat ? 'Materialized view' : 'View';
      const migrationName = path.basename(fp);
      const desc = descPrefix
        ? `${kindLabel} \`${schema}.${viewName}\` — ${descPrefix} (defined in ${migrationName}).`
        : `${kindLabel} \`${schema}.${viewName}\` defined in ${migrationName}. Query for current snapshot of the modeled data.`;
      entries.push({
        id: `view/${slug}`,
        kind: 'view',
        when_to_use: desc.length > 400 ? desc.slice(0, 400) + '...' : desc,
        invoke: cfg.invokeTemplate(`${schema}.${viewName}`),
        composes_with: [],
        role_scope: ['*'],
        status: 'active',
        pillar: '06-ai-ops',
        // resolver-plan v1.0 signals (stripped after enrichment):
        //   grounding = the migration DDL to READ before authoring a query
        //   source    = qualified name → freshness (metrics.* hourly; ops./public.* live)
        //   columns   = best-effort columns_hint parsed from the CREATE VIEW body
        _grounding: path.relative(REPO_ROOT, fp),
        _source: `${schema}.${viewName}`,
        _columns: parseViewColumns(content, m.index),
      });
    }
  }
  withEnrichment(entries, (e) => ({ grounding: e._grounding, source: e._source, columns: e._columns }));
  for (const e of entries) { delete e._grounding; delete e._source; delete e._columns; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

// Keys at the top of kpi-ownership.yaml that are NOT KPIs (metadata fields).
const KPI_META_KEYS = new Set(['version', 'generated_at', 'generated_from']);

function generateMetrics() {
  const cfg = CONFIG.metric;
  const fp = path.join(REPO_ROOT, cfg.sourceFile);
  if (!fs.existsSync(fp)) return [];
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(fp, 'utf-8'));
  } catch (_e) {
    return [];
  }
  if (!doc || typeof doc !== 'object') return [];
  const entries = [];
  for (const [kpiId, kpi] of Object.entries(doc)) {
    if (KPI_META_KEYS.has(kpiId)) continue;
    if (!kpi || typeof kpi !== 'object') continue;
    const ownerPillar = kpi.owner_pillar || 'unknown';
    const ownerRole = kpi.owner_role || 'unknown';
    const subPillar = kpi.sub_pillar ? ` (sub-pillar ${kpi.sub_pillar})` : '';
    const formula = kpi.formula ? ` Formula: ${String(kpi.formula).trim().replace(/\s+/g, ' ')}.` : '';
    const source = kpi.source ? ` Source: ${kpi.source}.` : '';
    const target = kpi.target ? ` Target: ${kpi.target}.` : '';
    const dashboard = kpi.dashboard_tile ? ` Dashboard: ${kpi.dashboard_tile}.` : '';
    const notesRaw = kpi.notes ? ` Notes: ${String(kpi.notes).trim().replace(/\s+/g, ' ')}.` : '';
    let desc = `KPI owned by ${ownerPillar} pillar (${ownerRole})${subPillar}.${formula}${source}${target}${dashboard}${notesRaw}`.trim();
    if (desc.length > 400) desc = desc.slice(0, 400) + '...';

    // Normalize status: kpi-ownership has values like 'post-PMF placeholder',
    // 'inactive_until_first_incident', 'inactive_until_eu_launch'. Catalog
    // schema VALID_STATUSES only knows the standard set, so map ad-hoc values
    // to 'planned' for now.
    const rawStatus = kpi.status;
    let status = 'active';
    if (rawStatus && typeof rawStatus === 'string') {
      const known = ['active', 'planned', 'deprecated', 'deferred', 'disabled'];
      status = known.includes(rawStatus) ? rawStatus : 'planned';
    }

    // Per-persona KPIs use dot-notation (persona.ceo.foo) — keep as-is in slug.
    entries.push({
      id: `metric/${kpiId}`,
      kind: 'metric',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(kpiId),
      composes_with: [],
      role_scope: [ownerRole],
      status,
      pillar: ownerPillar,
      // resolver-plan v1.0 signals (stripped after enrichment):
      //   grounding = the KPI definition (formula + source) to READ before querying
      //   source    = raw kpi.source → freshness (metrics.* hourly; ops.* live; else unknown)
      _grounding: `knowledge/kpi-ownership.yaml#${kpiId}`,
      _source: kpi.source ? String(kpi.source) : null,
    });
  }
  withEnrichment(entries, (e) => ({ grounding: e._grounding, source: e._source }));
  for (const e of entries) { delete e._grounding; delete e._source; }
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateRunbooks() {
  const cfg = CONFIG.runbook;
  const dir = path.join(REPO_ROOT, cfg.sourceDir);
  if (!fs.existsSync(dir)) return [];
  const files = walkDir(dir, cfg.pattern);
  const entries = [];
  for (const fp of files) {
    const name = path.basename(fp, '.md');
    if (name.startsWith('_') || PAGE_EXCLUDE.has(path.basename(fp))) continue;
    const content = fs.readFileSync(fp, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);
    const fallbackDesc = extractFirstParagraph(body) || `Runbook: ${name}`;
    let desc = descFromFrontmatter(frontmatter, fallbackDesc);
    if (desc.length > 400) desc = desc.slice(0, 400) + '...';
    entries.push({
      id: `runbook/${name}`,
      kind: 'runbook',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(name),
      composes_with: [],
      role_scope: roleScopeFromFrontmatter(frontmatter),
      status: statusFromFrontmatter(frontmatter),
      pillar: frontmatter.pillar || null,
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function generateExternalSources() {
  const cfg = CONFIG['external-source'];
  const fp = path.join(REPO_ROOT, cfg.sourceFile);
  if (!fs.existsSync(fp)) return [];
  let doc;
  try {
    doc = yaml.load(fs.readFileSync(fp, 'utf-8'));
  } catch (_e) {
    return [];
  }
  if (!doc || !Array.isArray(doc.sources)) return [];
  const entries = [];
  for (const src of doc.sources) {
    if (!src.id || !src.source_type) continue;
    const description = (src.description || `External integration: ${src.id}`).toString().trim().replace(/\s+/g, ' ');
    const authNote = src.auth_env ? ` Auth env: \`${src.auth_env}\`.` : '';
    const availability = src.availability ? ` Availability: ${src.availability}.` : '';
    const installPath = src.install_path ? ` Install: \`${src.install_path}\`.` : '';
    let desc = `${description}${authNote}${availability}${installPath}`.trim();
    if (desc.length > 400) desc = desc.slice(0, 400) + '...';
    const invokePattern = src.invoke_pattern || `See ${cfg.sourceFile}`;
    const known = ['active', 'planned', 'deprecated', 'deferred', 'disabled'];
    const status = known.includes(src.status) ? src.status : (src.status ? 'planned' : 'active');
    entries.push({
      id: `external-source/${src.id}`,
      kind: 'external-source',
      when_to_use: desc,
      invoke: cfg.invokeTemplate(invokePattern),
      composes_with: [],
      role_scope: Array.isArray(src.role_scope) ? src.role_scope : ['*'],
      status,
      pillar: '06-ai-ops',
      disambiguator: `source_type: ${src.source_type}`,
    });
  }
  withEnrichment(entries);
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function writeCatalog(kind, entries, options = {}) {
  const cfg = CONFIG[kind];
  const fp = path.join(RECIPIENTS_DIR, cfg.file);
  const header = `<!-- AUTO-GENERATED by scripts/resolver-v2/catalog-generator.cjs -->
<!-- Per-entry overrides MUST be inside <!-- override-start --> ... <!-- override-end --> markers -->
<!-- DO NOT manually edit outside override markers; changes will be lost on next sync -->

# Recipient Catalog: ${kind}s

This file is THE source of truth for ${kind} recipients in the resolver v2 catalog.
Read in any Claude Code session via \`@knowledge/recipients/${cfg.file}\` import.

**Total entries:** ${entries.length}
**Format spec:** \`.archives/cla/resolver-v2/spec.md\` §3

---

`;
  const body = entries.map(e => emitEntry(e)).join('\n');
  const content = header + body;

  if (options.dryRun) {
    console.log(`[catalog-generator] DRY-RUN ${kind}: would write ${entries.length} entries (${content.length} bytes) to ${fp}`);
    return false;
  }
  if (!fs.existsSync(RECIPIENTS_DIR)) fs.mkdirSync(RECIPIENTS_DIR, { recursive: true });
  fs.writeFileSync(fp, content, 'utf-8');
  console.log(`[catalog-generator] wrote ${kind} catalog: ${entries.length} entries → ${cfg.file}`);
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const kindArg = args.find(a => a.startsWith('--kind='));
  const targetKind = kindArg ? kindArg.split('=')[1] : null;

  const generators = {
    skill: generateSkills,
    command: generateCommands,
    agent: generateAgents,
    persona: generatePersonas,
    mcp: generateMcps,
    wiki: generateWikis,
    sop: generateSops,
    capability: generateCapabilities,
    workflow: generateWorkflows,
    schedule: generateSchedules,
    hook: generateHooks,
    // v2.2 NEW kinds
    page: generatePages,
    view: generateViews,
    metric: generateMetrics,
    runbook: generateRunbooks,
    'external-source': generateExternalSources,
  };

  const kinds = targetKind ? [targetKind] : KINDS;
  let totalEntries = 0;
  for (const kind of kinds) {
    if (!generators[kind]) { console.error(`Unknown kind: ${kind}`); continue; }
    const entries = generators[kind]();
    totalEntries += entries.length;
    writeCatalog(kind, entries, { dryRun });
  }
  console.log(`[catalog-generator] done: ${totalEntries} total entries across ${kinds.length} kinds`);
}

if (require.main === module) main();

module.exports = {
  generateSkills, generateCommands, generateAgents, generatePersonas, generateMcps,
  generateWikis, generateSops, generateCapabilities, generateWorkflows, generateSchedules, generateHooks,
  // v2.2 NEW
  generatePages, generateViews, generateMetrics, generateRunbooks, generateExternalSources,
  extractYamlPurpose,
  parseFrontmatter, emitEntry,
  // v1.2.0 (capability-lifecycle-architecture extend) — exported so sync.cjs can iterate all kinds
  KINDS, CONFIG,
  // resolver-plan v1.0 (Sprint 1) — exported for unit tests
  withEnrichment, parseViewColumns,
};
