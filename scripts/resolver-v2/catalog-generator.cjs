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

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RECIPIENTS_DIR = path.join(REPO_ROOT, 'knowledge', 'recipients');

const KINDS = ['skill', 'command', 'agent', 'persona', 'mcp', 'wiki', 'sop', 'capability', 'workflow', 'schedule', 'hook'];

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
    invokeTemplate: (slug) => `\`Read("wiki/${slug}/source.md")\` or \`mcp__supabase_ops__wiki_get_page({slug: "${slug}"})\``,
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
      const fp = path.join(d, ent.name);
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

function emitEntry({ id, kind, when_to_use, invoke, composes_with, role_scope, status, pillar, aliases, disambiguator }) {
  const lines = [];
  lines.push(`## ${id}`);
  lines.push('');
  lines.push(`**Kind:** ${kind}`);
  lines.push(`**When to use:** ${when_to_use}`);
  lines.push('');
  lines.push(`**Invoke:** ${invoke}`);
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
    });
  }
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
      invoke: `\`mcp__${server.replace(/-/g, '_')}__${tool.id}\``,
      composes_with: [],
      role_scope: Array.isArray(tool.role_scope) ? tool.role_scope : ['*'],
      status: tool.status || 'active',
      pillar: '06-ai-ops',
    });
  }
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

    if (fs.existsSync(flowYaml)) {
      try {
        const flow = yaml.load(fs.readFileSync(flowYaml, 'utf-8'));
        if (flow) {
          if (typeof flow.purpose === 'string') desc = flow.purpose.trim().replace(/\s+/g, ' ');
          else if (typeof flow.description === 'string') desc = flow.description.trim().replace(/\s+/g, ' ');
          if (typeof flow.status === 'string') status = flow.status;
          if (Array.isArray(flow.roles_required)) roleScope = flow.roles_required;
          else if (Array.isArray(flow.role_scope)) roleScope = flow.role_scope;
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
    });
  }
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
  parseFrontmatter, emitEntry,
};
