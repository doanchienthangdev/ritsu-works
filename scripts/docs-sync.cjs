#!/usr/bin/env node
/**
 * scripts/docs-sync.cjs — docs-engine walker (Sprint 1 PR-3 implementation).
 *
 * Walks Tier 1 + .claude/ runtime sources per Phase 1 Q3 scope, dispatches to
 * 9 inline adapters per source kind, writes MDX into docs/content/docs/.
 *
 * Implements SOP-AIOPS-003-docs-sync (10-step pipeline; see 06-ai-ops/sops/).
 *
 * Usage:
 *   node scripts/docs-sync.cjs [--area=<a>] [--dry-run] [--force]
 *
 * Areas: skills | agents | hooks | commands | charter | governance | pillars |
 *        sops | tier1 | all (default: all)
 *
 * Behavior:
 *   1. Drift gate: invoker must have run `pnpm check` clean (not enforced here;
 *      docs-engine/check SOP step 1 handles).
 *   2. Walk per `area` scope.
 *   3. Layer 1 secret-redaction: walker-exclude check (paths in WALKER_EXCLUDE).
 *   4. Adapter dispatch: per source kind, transform → MDX.
 *   5. Layer 2 (MDX regex scrub) is enforced by docs/lint-secrets.cjs at build time.
 *   6. Idempotency marker `<!-- generated-by: docs-engine v0.1.0 -->` injected.
 *      3-way diff for hand-edit preservation is a Sprint 2 enhancement; v1.0
 *      treats any hand-edit on a marked file as a conflict and refuses to overwrite
 *      unless `--force`.
 *   7. Write MDX to docs/content/docs/<category>/<slug>.mdx.
 *   8. Run `node scripts/validate-docs-coverage.cjs` post-write.
 *   9. Emit summary (event emission is Sprint 2 — needs supabase MCP).
 *   10. KPI snapshot (Sprint 2 — needs supabase MCP).
 *
 * Exit codes:
 *   0 — success
 *   1 — drift / generation error
 *   2 — setup error
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

let yaml;
try {
  yaml = require("js-yaml");
} catch (_e) {
  console.error("[docs-sync] Missing js-yaml. Run: pnpm add -D js-yaml");
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_CONTENT = path.join(REPO_ROOT, "docs", "content", "docs");
const GENERATED_BY = "docs-engine v1.1.0";

// v1.1: bilingual output. For each source file, emit BOTH `.en.mdx` and
// `.vi.mdx`. English content is the source verbatim; Vietnamese content
// starts as English placeholder, gets translated by scripts/docs-translate.cjs
// in a separate pass (calls Anthropic API; ~$1-3 cost; cached by source_hash).
//
// Fumadocs `parser: 'dot'` + `hideLocale: 'default-locale'` (vi=default):
//   `<slug>.vi.mdx` → URL `/docs/<slug>`
//   `<slug>.en.mdx` → URL `/en/docs/<slug>`
const LANGUAGES = ["en", "vi"];

// === Walker exclude list (Layer 1 secret redaction) ===
const WALKER_EXCLUDE = [
  "governance/SECRETS.md",
  "00-charter/founder-profile.md",
  "runtime/secrets/",
  "wiki/",
  ".archives/",
  "raw/",
  "node_modules/",
  ".next/",
];

function shouldExclude(relPath) {
  return WALKER_EXCLUDE.some((excl) => relPath === excl || relPath.startsWith(excl));
}

function sha256(text) {
  return crypto.createHash("sha256").update(canonicalize(text)).digest("hex");
}

function canonicalize(text) {
  // Strip trailing whitespace per line + normalize line endings
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n");
}

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: null, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: null, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  let fm = null;
  try {
    fm = yaml.load(fmRaw);
  } catch (_e) {
    fm = null;
  }
  return { frontmatter: fm, body };
}

function firstH1(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : null;
}

function sanitizeSlug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// CTO Phase 5 sanity-check mod: documentation files (HITL.md, cla.md, etc.)
// reference the `override: <reason ...>` magic-phrase format. Real magic phrases
// are sent via Telegram in operating contexts; they should NOT appear verbatim in
// the docs corpus. To avoid false-positive lint-secrets failures while preserving
// the documented FORMAT, the adapter scrubs any `override: <≥5 words>` pattern to
// `override: <example…>` BEFORE writing MDX. Operators still see the format spec;
// the exact example phrase is neutralized.
function scrubBody(body) {
  return body
    // 1. Magic phrase: `override:` followed by ≥5 plausible word tokens.
    //    Placeholder syntax (`override: <reason ...>`) is preserved by the
    //    negative lookahead. Real-looking phrases get neutralized.
    .replace(
      /\boverride:\s+(?![<"'\[`])\S+(?:\s+\S+){4,}/gi,
      // Replacement must NOT re-match the lint pattern (which requires
      // ≥5 plain words). Use a single bracketed token so lint passes.
      "override: [redacted-example]"
    )
    // 2. Supabase project_ref: 20-char alphanumeric subdomain.
    //    Per CTO Phase 5 — project_ref enables SSRF + override-forging reconnaissance.
    //    Even though it's in repo Tier 1 manifest, public docs should redact.
    .replace(
      /\b[a-z0-9]{20}\.supabase\.co\b/gi,
      "<project_ref>.supabase.co"
    );
}

// MDX 2+ parser is stricter than markdown:
//   - Any `<` is interpreted as JSX tag start
//   - Any `{` is interpreted as JSX expression start
// Markdown patterns like `<@cto>`, `<1>`, `<email@x.com>`, `{var}`,
// `{config: value}` all break MDX compilation.
//
// This helper escapes `<` and `{` outside fenced code blocks to defer MDX
// expression parsing. JSX tags that LOOK like real HTML elements
// (`<a>`, `<div>`, etc.) are left alone via lookahead.
//
// We deliberately DO NOT touch content inside ``` fences or inline `code`.
function escapeMdxSpecialChars(body) {
  const lines = body.split("\n");
  let inFence = false;
  const out = [];
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    // Escape inline code spans (`...`) FIRST — preserve content inside as-is.
    // Then for non-code text:
    //   - `<` not followed by [a-zA-Z!/] → `\<`
    //   - `{` not part of `{/* */}` JSX comment → `\{`
    let processed = "";
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === "`") {
        // Find matching closing backtick on the same line.
        const close = line.indexOf("`", i + 1);
        if (close !== -1) {
          // Properly-closed inline code: emit verbatim, skip escaping.
          processed += line.slice(i, close + 1);
          i = close + 1;
          continue;
        }
        // Unclosed backtick — emit the backtick alone + fall through to
        // escape rest of line normally (handles source markdown with stray
        // single backticks). Prevents `<example>` after stray backtick from
        // bypassing the `<` escape.
        processed += ch;
        i++;
        continue;
      }
      if (ch === "<" && line[i - 1] !== "\\") {
        // v1.0 PR-3 pragmatic: escape ALL `<` outside code blocks.
        // Multi-line HTML comments (`<!-- ... -->` spanning ≥2 lines) trip
        // MDX2 strict; auto-link `<email@x>`, agent `<@cto>`, and placeholder
        // `<source-slug>` all fail. Auto-gen content has minimal real HTML,
        // so blanket escape is safe. v1.0.1 can refine with a known-tag
        // allowlist (`<a>`, `<details>`, `<summary>`) if needed.
        processed += "\\<";
        i++;
        continue;
      }
      if (ch === "{") {
        // Allow `{/* ... */}` JSX comments (used by our generated-by marker)
        if (line.slice(i, i + 3) === "{/*") {
          const end = line.indexOf("*/}", i);
          if (end !== -1) {
            processed += line.slice(i, end + 3);
            i = end + 3;
            continue;
          }
        }
        if (line[i - 1] !== "\\") {
          processed += "\\{";
          i++;
          continue;
        }
      }
      processed += ch;
      i++;
    }
    out.push(processed);
  }
  return out.join("\n");
}

function emitMdx({ targetPath, title, description, sourcePath, sourceHash, body, category, extraFm }) {
  const scrubbedBody = escapeMdxSpecialChars(scrubBody(body));
  const fm = {
    title,
    description: description || "",
    source_path: sourcePath,
    source_hash: sourceHash,
    generated_at: new Date().toISOString(),
    generated_by: GENERATED_BY,
    category,
    ...(extraFm || {}),
  };
  const fmYaml = yaml.dump(fm, { lineWidth: 100 }).trimEnd();
  // MDX comment syntax: `{/* ... */}` (NOT HTML `<!-- ... -->`).
  // MDX parser rejects `<!` as it tries to read it as a JSX element name.
  // The marker is used by walker + lint-secrets to detect auto-generated pages.
  return [
    "---",
    fmYaml,
    "---",
    "",
    `{/* generated-by: ${GENERATED_BY} */}`,
    "",
    scrubbedBody,
    "",
  ].join("\n");
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

// === Adapter: skill ===
// Source: 06-ai-ops/skills/**/SKILL.md
function adapterSkill(absPath, relPath, raw) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const name = (frontmatter && frontmatter.name) || firstH1(body) || path.basename(path.dirname(relPath));
  const description = (frontmatter && frontmatter.description) || "";
  const slug = relPath
    .replace(/^06-ai-ops\/skills\//, "")
    .replace(/\/SKILL\.md$/, "")
    .replace(/\//g, "--"); // wiki-sync/audit → wiki-sync--audit
  return {
    targetPath: path.join(DOCS_CONTENT, "skills", `${slug}.mdx`),
    title: `Skill: ${name}`,
    description,
    body,
    category: "skill",
  };
}

// === Adapter: agent ===
// Source: .claude/agents/*.md (excluding README.md)
function adapterAgent(absPath, relPath, raw) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const name = (frontmatter && frontmatter.name) || path.basename(relPath, ".md");
  const description = (frontmatter && frontmatter.description) || "";
  const slug = sanitizeSlug(name);
  return {
    targetPath: path.join(DOCS_CONTENT, "agents", `${slug}.mdx`),
    title: `Agent: @${name}`,
    description,
    body,
    category: "agent",
  };
}

// === Adapter: hook ===
// Source: .claude/hooks/*.md (excluding README.md, SPEC.md)
function adapterHook(absPath, relPath, raw) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const name = (frontmatter && frontmatter.name) || path.basename(relPath, ".md");
  const slug = sanitizeSlug(name);
  return {
    targetPath: path.join(DOCS_CONTENT, "hooks", `${slug}.mdx`),
    title: `Hook: ${name}`,
    description: (frontmatter && frontmatter.type) ? `${frontmatter.type} hook` : "",
    body,
    category: "hook",
  };
}

// === Adapter: command ===
// Source: .claude/commands/*.md
function adapterCommand(absPath, relPath, raw) {
  const { frontmatter, body } = parseFrontmatter(raw);
  const filename = path.basename(relPath, ".md");
  const h1 = firstH1(body);
  const title = h1 || `/${filename}`;
  const description = (frontmatter && frontmatter.description) || "";
  return {
    targetPath: path.join(DOCS_CONTENT, "commands", `${filename}.mdx`),
    title: `Command: ${title}`,
    description,
    body,
    category: "command",
  };
}

// === Adapter: charter (passthrough markdown) ===
function adapterCharter(absPath, relPath, raw) {
  const filename = path.basename(relPath, ".md");
  const title = firstH1(raw) || `Charter: ${filename}`;
  return {
    targetPath: path.join(DOCS_CONTENT, "charter", `${filename}.mdx`),
    title,
    description: "",
    body: raw,
    category: "charter",
  };
}

// === Adapter: governance (passthrough; SECRETS.md excluded at walker level) ===
function adapterGovernance(absPath, relPath, raw) {
  const filename = path.basename(relPath, ".md");
  const title = firstH1(raw) || `Governance: ${filename}`;
  return {
    targetPath: path.join(DOCS_CONTENT, "governance", `${filename}.mdx`),
    title,
    description: "",
    body: raw,
    category: "governance",
  };
}

// === Adapter: pillar-readme (recursive) ===
function adapterPillarReadme(absPath, relPath, raw) {
  // relPath like "06-ai-ops/README.md" or "06-ai-ops/skills/README.md"
  const segments = relPath.split("/");
  const pillarSlug = segments[0]; // e.g. "06-ai-ops"
  let subPath = segments.slice(1, -1).join("/"); // e.g. "skills"
  const baseFile = segments[segments.length - 1]; // README.md or CLAUDE.md
  const fileSlug = baseFile === "CLAUDE.md" ? "_claude" : "index";
  const targetSubPath = subPath ? path.join(subPath, fileSlug) : fileSlug;
  const title = firstH1(raw) || `Pillar: ${pillarSlug}${subPath ? " / " + subPath : ""}`;
  return {
    targetPath: path.join(DOCS_CONTENT, "pillars", pillarSlug, `${targetSubPath}.mdx`),
    title,
    description: "",
    body: raw,
    category: "pillar",
  };
}

// === Adapter: sop-flow (flow.yaml → structured MDX) ===
function adapterSopFlow(absPath, relPath, raw) {
  let flow;
  try {
    flow = yaml.load(raw);
  } catch (e) {
    // SOPs with malformed YAML (e.g. unquoted `(state: deployed→operating)` value
    // tripping the parser on the inner colon) get skipped with a warning.
    // Real fix: clean up the SOP yaml. Defensive: skip rather than abort the walk.
    console.warn(`[docs-sync] ⚠ sop-flow parse error ${relPath}: ${e.message.split("\n")[0]}`);
    return null;
  }
  // SOP id resolution (3 conventions in this repo):
  //   1. `sop_id:` (new — SOP-AIOPS-002, SOP-AIOPS-003)
  //   2. `id:` (legacy — SOP-AIOPS-001 and its sub-flows)
  //   3. Skeleton SOPs (94 sub-pillar SOPs): no id field; `name:` field OR
  //      derived from folder name like `SOP-METRICS-011-alert-rule-yaml-format`.
  const folderName = path.basename(path.dirname(relPath));
  const sopId =
    (flow && (flow.sop_id || flow.id || flow.name)) ||
    (folderName.startsWith("SOP-") ? folderName : null);
  if (!sopId) return null;

  const lines = [];
  lines.push(`**SOP ID:** \`${sopId}\``);
  lines.push(`**Pillar:** ${flow.pillar || "n/a"}`);
  if (flow.cost_bucket) lines.push(`**Cost bucket:** \`${flow.cost_bucket}\``);
  if (flow.capability_id) lines.push(`**Capability:** \`${flow.capability_id}\``);
  lines.push("");
  if (flow.description) {
    lines.push("## Overview");
    lines.push("");
    lines.push(flow.description);
    lines.push("");
  }
  if (flow.invocation) {
    lines.push("## Invocation");
    lines.push("");
    lines.push("```yaml");
    lines.push(yaml.dump({ invocation: flow.invocation }).trimEnd());
    lines.push("```");
    lines.push("");
  }
  if (Array.isArray(flow.steps)) {
    lines.push("## Steps");
    lines.push("");
    for (const step of flow.steps) {
      lines.push(`### Step ${step.id || ""} — ${step.name || step.id}`);
      lines.push("");
      if (step.kind) lines.push(`- **Kind:** ${step.kind}`);
      if (step.skill) lines.push(`- **Skill:** \`${step.skill}\``);
      if (step.cmd) lines.push(`- **Cmd:** \`${step.cmd}\``);
      if (step.timeout_seconds) lines.push(`- **Timeout:** ${step.timeout_seconds}s`);
      if (step.on_failure) lines.push(`- **On failure:** ${step.on_failure}`);
      if (step.rationale) {
        lines.push("");
        lines.push(step.rationale);
      }
      lines.push("");
    }
  }
  if (Array.isArray(flow.acceptance_criteria)) {
    lines.push("## Acceptance criteria");
    lines.push("");
    for (const c of flow.acceptance_criteria) lines.push(`- ${c}`);
    lines.push("");
  }
  if (flow.failure_handling) {
    lines.push("## Failure handling");
    lines.push("");
    lines.push("```yaml");
    lines.push(yaml.dump({ failure_handling: flow.failure_handling }).trimEnd());
    lines.push("```");
    lines.push("");
  }

  return {
    targetPath: path.join(DOCS_CONTENT, "sops", `${sopId}.mdx`),
    title: `${sopId}: ${flow.title || flow.sop_name || "SOP"}`,
    description: flow.description || "",
    body: lines.join("\n"),
    category: "sop",
  };
}

// === Adapter: tier1-yaml (knowledge/*.yaml schema overview) ===
function adapterTier1Yaml(absPath, relPath, raw) {
  // Top-of-file comments + top-level keys (NOT full content dump per spec)
  const lines = raw.split("\n");
  const headerComments = [];
  for (const line of lines) {
    if (line.startsWith("#")) {
      headerComments.push(line.replace(/^#+\s?/, ""));
    } else if (line.trim() === "") {
      headerComments.push("");
    } else {
      break;
    }
  }

  // Extract top-level keys
  const topLevelKeys = [];
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*)\s*:/);
    if (match && !line.startsWith(" ") && !line.startsWith("\t")) {
      topLevelKeys.push(match[1]);
    }
  }

  const filename = path.basename(relPath, ".yaml");
  const body = [
    "## Description",
    "",
    headerComments.join("\n").trim() || `Tier 1 declarative file \`${relPath}\`.`,
    "",
    "## Top-level keys",
    "",
    topLevelKeys.map((k) => `- \`${k}\``).join("\n") || "(no top-level keys parsed)",
    "",
    "> Live values in [`" + relPath + "`](https://github.com/doanchienthangdev/ritsu-works/blob/main/" + relPath + "). This page describes the schema; not the data.",
  ].join("\n");

  return {
    targetPath: path.join(DOCS_CONTENT, "knowledge", `${filename}.mdx`),
    title: `Tier 1 yaml: ${filename}`,
    description: `Schema overview for \`${relPath}\`.`,
    body,
    category: "tier1-yaml",
  };
}

// === Walker scope per area ===
function listSources(area) {
  const sources = [];

  function add(absPath, adapter, options = {}) {
    const relPath = path.relative(REPO_ROOT, absPath);
    if (shouldExclude(relPath)) return;
    if (options.excludeBasenames && options.excludeBasenames.includes(path.basename(absPath))) return;
    sources.push({ absPath, relPath, adapter });
  }

  function walkRecursive(dir, predicate, adapter, options) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walkRecursive(full, predicate, adapter, options);
      } else if (predicate(entry.name, full)) {
        add(full, adapter, options);
      }
    }
  }

  function flatGlob(dir, basenamePattern, adapter, options) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && basenamePattern.test(entry.name)) {
        add(path.join(dir, entry.name), adapter, options);
      }
    }
  }

  if (area === "skills" || area === "all") {
    walkRecursive(
      path.join(REPO_ROOT, "06-ai-ops", "skills"),
      (name) => name === "SKILL.md",
      adapterSkill
    );
  }
  if (area === "agents" || area === "all") {
    flatGlob(path.join(REPO_ROOT, ".claude", "agents"), /^[a-z][a-z0-9-]*\.md$/, adapterAgent, {
      excludeBasenames: ["README.md"],
    });
  }
  if (area === "hooks" || area === "all") {
    flatGlob(path.join(REPO_ROOT, ".claude", "hooks"), /\.md$/, adapterHook, {
      excludeBasenames: ["README.md", "SPEC.md"],
    });
  }
  if (area === "commands" || area === "all") {
    flatGlob(path.join(REPO_ROOT, ".claude", "commands"), /\.md$/, adapterCommand);
  }
  if (area === "charter" || area === "all") {
    flatGlob(path.join(REPO_ROOT, "00-charter"), /\.md$/, adapterCharter, {
      excludeBasenames: ["founder-profile.md"], // PII
    });
  }
  if (area === "governance" || area === "all") {
    flatGlob(path.join(REPO_ROOT, "governance"), /\.md$/, adapterGovernance, {
      excludeBasenames: ["SECRETS.md"], // hard exclude
    });
  }
  if (area === "pillars" || area === "all") {
    // Pillar READMEs + CLAUDE.md (recursive depth 2: pillar/ + pillar/sub-pillar/)
    for (const pillarDir of fs.readdirSync(REPO_ROOT, { withFileTypes: true })) {
      if (!pillarDir.isDirectory()) continue;
      if (!/^\d{2}-/.test(pillarDir.name)) continue;
      const pillarPath = path.join(REPO_ROOT, pillarDir.name);
      // Top-level pillar README + CLAUDE.md
      for (const basename of ["README.md", "CLAUDE.md"]) {
        const candidate = path.join(pillarPath, basename);
        if (fs.existsSync(candidate)) add(candidate, adapterPillarReadme);
      }
      // Sub-pillar READMEs + CLAUDE.md
      for (const subEntry of fs.readdirSync(pillarPath, { withFileTypes: true })) {
        if (!subEntry.isDirectory()) continue;
        if (subEntry.name === "sops") continue; // SOPs handled separately
        const subPath = path.join(pillarPath, subEntry.name);
        for (const basename of ["README.md", "CLAUDE.md"]) {
          const candidate = path.join(subPath, basename);
          if (fs.existsSync(candidate)) add(candidate, adapterPillarReadme);
        }
      }
    }
  }
  if (area === "sops" || area === "all") {
    // Walk all pillar/sops/SOP-*/flow.yaml files
    for (const pillarDir of fs.readdirSync(REPO_ROOT, { withFileTypes: true })) {
      if (!pillarDir.isDirectory() || !/^\d{2}-/.test(pillarDir.name)) continue;
      const sopsRoot = path.join(REPO_ROOT, pillarDir.name, "sops");
      walkRecursive(sopsRoot, (name) => name === "flow.yaml", adapterSopFlow);
      // Also walk sub-pillar sops/
      const pillarPath = path.join(REPO_ROOT, pillarDir.name);
      if (!fs.existsSync(pillarPath)) continue;
      for (const subEntry of fs.readdirSync(pillarPath, { withFileTypes: true })) {
        if (!subEntry.isDirectory()) continue;
        const subSops = path.join(pillarPath, subEntry.name, "sops");
        walkRecursive(subSops, (name) => name === "flow.yaml", adapterSopFlow);
      }
    }
  }
  if (area === "tier1" || area === "all") {
    flatGlob(path.join(REPO_ROOT, "knowledge"), /\.yaml$/, adapterTier1Yaml);
  }

  return sources;
}

// v1.1: per-category meta.json generation for proper Fumadocs sidebar grouping.
// Each category gets: { title, icon?, description, pages: [...] }
// Top-level meta.json organizes by Diátaxis quadrant.
//
// Fumadocs meta.json supports:
//   - "pages": ["slug-a", "slug-b", "---Heading---", "slug-c"]
//     Where `---Text---` becomes a visual separator/heading in the sidebar.
//   - "pages": ["...skills"] glob-expands to all files in skills/ folder.
//   - Per-language: meta.vi.json + meta.en.json for localized titles.

const CATEGORY_META = {
  agents: {
    vi: { title: "Agents", description: "AI agent personas (CEO/CTO/CGO/CPO + CLA subagent)" },
    en: { title: "Agents", description: "AI agent personas (CEO/CTO/CGO/CPO + CLA subagent)" },
  },
  charter: {
    vi: { title: "Charter", description: "Định hướng + tầm nhìn + ranh giới của ritsu-works" },
    en: { title: "Charter", description: "Vision, mission, boundaries of ritsu-works" },
  },
  commands: {
    vi: { title: "Commands", description: "Slash commands trong Claude Code (/cla, /wiki, /docs, …)" },
    en: { title: "Commands", description: "Slash commands available in Claude Code (/cla, /wiki, /docs, …)" },
  },
  governance: {
    vi: { title: "Governance", description: "HITL tiers, ROLES, BUDGET, IDENTITY — chính sách điều hành" },
    en: { title: "Governance", description: "HITL tiers, ROLES, BUDGET, IDENTITY — operating policy" },
  },
  hooks: {
    vi: { title: "Hooks", description: "Pre-tool + post-tool hooks bảo vệ Tier 1 + secrets + budget" },
    en: { title: "Hooks", description: "Pre-tool + post-tool hooks protecting Tier 1 + secrets + budget" },
  },
  knowledge: {
    vi: { title: "Knowledge (Tier 1 yaml)", description: "Declarative knowledge files trong knowledge/ — schemas + overviews" },
    en: { title: "Knowledge (Tier 1 yaml)", description: "Declarative knowledge files under knowledge/ — schemas + overviews" },
  },
  pillars: {
    vi: { title: "Pillars", description: "10 evergreen + 1 stage pillar tổ chức công ty" },
    en: { title: "Pillars", description: "10 evergreen + 1 stage pillar organizing the company" },
  },
  skills: {
    vi: { title: "Skills", description: "AI skills (capability-lifecycle, wiki-sync, docs-engine, …)" },
    en: { title: "Skills", description: "AI skills (capability-lifecycle, wiki-sync, docs-engine, …)" },
  },
  sops: {
    vi: { title: "SOPs", description: "102 Standard Operating Procedures (flow.yaml) trên các pillars" },
    en: { title: "SOPs", description: "102 Standard Operating Procedures (flow.yaml) across pillars" },
  },
};

const ROOT_META = {
  vi: {
    title: "Ritsu Works Docs",
    pages: [
      "index",
      "---Tham khảo---",
      "skills",
      "agents",
      "hooks",
      "commands",
      "knowledge",
      "---Quy trình---",
      "sops",
      "---Tổng quan---",
      "charter",
      "governance",
      "pillars",
    ],
  },
  en: {
    title: "Ritsu Works Docs",
    pages: [
      "index",
      "---Reference---",
      "skills",
      "agents",
      "hooks",
      "commands",
      "knowledge",
      "---How-to---",
      "sops",
      "---Explanation---",
      "charter",
      "governance",
      "pillars",
    ],
  },
};

function writeCategoryMetaFiles() {
  // Top-level meta — one per language
  for (const lang of LANGUAGES) {
    const metaPath = path.join(DOCS_CONTENT, `meta.${lang}.json`);
    fs.writeFileSync(metaPath, JSON.stringify(ROOT_META[lang], null, 2) + "\n", "utf8");
  }

  // Per-category meta — list pages alphabetically
  for (const [category, perLang] of Object.entries(CATEGORY_META)) {
    const categoryDir = path.join(DOCS_CONTENT, category);
    if (!fs.existsSync(categoryDir)) continue;

    // List all .en.mdx files in category and derive slugs
    const slugs = fs
      .readdirSync(categoryDir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".en.mdx"))
      .map((e) => e.name.replace(/\.en\.mdx$/, ""))
      .sort();

    for (const lang of LANGUAGES) {
      const metaPath = path.join(categoryDir, `meta.${lang}.json`);
      const data = { ...perLang[lang], pages: slugs };
      fs.writeFileSync(metaPath, JSON.stringify(data, null, 2) + "\n", "utf8");
    }
  }

  console.log("[docs-sync] meta.json files written for top-level + 9 categories × 2 languages");
}

function main() {
  const argv = process.argv.slice(2);
  const area = (argv.find((a) => a.startsWith("--area="))?.split("=")[1]) || "all";
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");

  const validAreas = [
    "skills",
    "agents",
    "hooks",
    "commands",
    "charter",
    "governance",
    "pillars",
    "sops",
    "tier1",
    "all",
  ];
  if (!validAreas.includes(area)) {
    console.error(`[docs-sync] Invalid area: ${area}`);
    console.error(`Valid areas: ${validAreas.join(", ")}`);
    process.exit(2);
  }

  console.log(`[docs-sync] area=${area} dry-run=${dryRun} force=${force}`);
  const sources = listSources(area);
  console.log(`[docs-sync] walker found ${sources.length} source files`);

  let written = 0;
  let skipped = 0;
  let conflicts = 0;
  let errors = 0;

  for (const { absPath, relPath, adapter } of sources) {
    let raw;
    try {
      raw = fs.readFileSync(absPath, "utf8");
    } catch (e) {
      console.error(`[docs-sync] ✗ read failed ${relPath}: ${e.message}`);
      errors++;
      continue;
    }

    let result;
    try {
      result = adapter(absPath, relPath, raw);
    } catch (e) {
      console.error(`[docs-sync] ✗ adapter failed ${relPath}: ${e.message}`);
      errors++;
      continue;
    }
    if (!result) {
      skipped++;
      continue;
    }

    const sourceHash = sha256(raw);
    // v1.1: emit one MDX per language. English content is the source
    // verbatim; Vietnamese content starts as English placeholder (translation
    // happens in scripts/docs-translate.cjs in a separate pass).
    const baseTargetPath = result.targetPath.replace(/\.mdx$/, "");

    for (const lang of LANGUAGES) {
      const targetPath = `${baseTargetPath}.${lang}.mdx`;
      const mdxContent = emitMdx({
        targetPath,
        title: result.title,
        description: result.description || "",
        sourcePath: relPath,
        sourceHash,
        body: result.body, // English content; VI gets translated later
        category: result.category,
        extraFm: { ...(result.extraFm || {}), language: lang },
      });

      // Idempotency check per file
      if (fs.existsSync(targetPath) && !force) {
        const existing = fs.readFileSync(targetPath, "utf8");
        const existingHas = existing.includes(`generated-by: docs-engine`);
        const existingFm = parseFrontmatter(existing).frontmatter;
        const existingHash = existingFm && existingFm.source_hash;
        const existingTranslated = existingFm && existingFm.translated === true;

        if (!existingHas) {
          console.warn(`[docs-sync] ⚠ ${targetPath} lacks generated-by marker; skipping (use --force to overwrite)`);
          conflicts++;
          continue;
        }
        // Preserve translated VI content: if .vi.mdx is translated AND source unchanged, skip
        if (lang === "vi" && existingTranslated && existingHash === sourceHash) {
          skipped++;
          continue;
        }
        // For .en.mdx OR untranslated .vi.mdx: rewrite if source_hash matches → skip
        if (lang === "en" && existingHash === sourceHash) {
          skipped++;
          continue;
        }
      }

      if (dryRun) {
        console.log(`[docs-sync] DRY ${path.relative(REPO_ROOT, targetPath)}`);
        written++;
        continue;
      }

      try {
        ensureDir(targetPath);
        fs.writeFileSync(targetPath, mdxContent, "utf8");
        written++;
      } catch (e) {
        console.error(`[docs-sync] ✗ write failed ${targetPath}: ${e.message}`);
        errors++;
      }
    }

    // Remove legacy single-language file if it exists (v1.0 layout)
    if (fs.existsSync(result.targetPath)) {
      try {
        fs.unlinkSync(result.targetPath);
      } catch (_e) { /* ignore */ }
    }
  }

  // v1.1: write per-category meta.json for proper sidebar grouping (Diátaxis).
  if (!dryRun) {
    writeCategoryMetaFiles();
  }

  console.log("");
  console.log(`[docs-sync] summary: written=${written} skipped=${skipped} conflicts=${conflicts} errors=${errors}`);
  console.log("");

  if (errors > 0) return 1;
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  listSources,
  sha256,
  parseFrontmatter,
  emitMdx,
};
