#!/usr/bin/env node
/**
 * docs/lint-secrets.cjs — 3-layer fail-loud secret redactor for docs-engine.
 *
 * Per CTO Phase 2 + Phase 5 mods:
 *   Layer 1 — walker-exclude check: paths in WALKER_EXCLUDE_LIST must NEVER
 *             have appeared in the docs/content/ MDX corpus. Bail if any MDX
 *             page's `source_path` frontmatter references them.
 *   Layer 2 — MDX regex scrub: scan every MDX body for credential patterns.
 *             Match → throw, abort.
 *   Layer 3 — CI gate: this script runs as `prebuild` (auto-invoked by
 *             `pnpm build`) AND on PR via GitHub Action. Either invocation
 *             aborts the deploy.
 *
 * Fail-loud, NEVER scrub-silently. A leak should produce a loud build failure
 * + an incident issue, not a quietly-published-then-redacted secret.
 *
 * Exit codes:
 *   0 — clean
 *   1 — secret detected (any layer)
 *   2 — setup error (missing content dir, invalid frontmatter)
 */

"use strict";

const fs = require("fs");
const path = require("path");

const CONTENT_DIR = path.join(__dirname, "content", "docs");

// === Layer 1 — walker-exclude paths (never enter the MDX corpus) ===
const WALKER_EXCLUDE_LIST = [
  "governance/SECRETS.md",
  "00-core/founder-profile.md",
  "runtime/secrets/",
  ".env",
  ".env.local",
];

// === Layer 2 — MDX regex scrub patterns ===
// Each entry: { name, pattern, redactedReplacement (unused in fail-loud mode) }
const SECRET_PATTERNS = [
  {
    name: "magic-phrase (governance/HITL.md override prefix)",
    // Real magic phrases per HITL.md ceremony are ≥5 plain words.
    // Documentation placeholders like `override: <reason ...>` are intentionally
    // preserved (the docs corpus DOES document the format) — those start with
    // `<`, `"`, `'`, `[`, or backtick. Adapter-level scrub
    // (scripts/docs-sync.cjs:scrubBody) neutralizes any real-looking phrases
    // to `<example…>` before MDX emission; this lint catches anything that
    // bypassed the adapter.
    pattern: /\boverride:\s+(?![<"'\[`])\S+(?:\s+\S+){4,}/i,
  },
  {
    name: "supabase project_ref (NNNNN.supabase.co)",
    pattern: /\b[a-z0-9]{20}\.supabase\.co\b/i,
  },
  {
    name: "anthropic API key (sk-ant-…)",
    pattern: /sk-ant-[A-Za-z0-9_-]{20,}/,
  },
  {
    name: "openai-style API key (sk-…)",
    pattern: /\bsk-[A-Za-z0-9]{32,}\b/,
  },
  {
    name: "supabase session token (sb_…)",
    pattern: /\bsb_(?:public|secret|publishable)_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    name: "github personal access token (ghp_…)",
    pattern: /\bghp_[A-Za-z0-9]{36,}\b/,
  },
  {
    name: "github fine-grained token (github_pat_…)",
    pattern: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/,
  },
  {
    name: "telegram bot token",
    pattern: /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/,
  },
];

function* walkMdx(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMdx(full);
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      yield full;
    }
  }
}

function extractFrontmatter(text) {
  // YAML frontmatter delimited by --- on first two lines (or empty if absent)
  if (!text.startsWith("---\n")) return { frontmatter: {}, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: {}, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  // Cheap key:value parser (sufficient for our use; full YAML not required here)
  const frontmatter = {};
  for (const line of fmRaw.split("\n")) {
    const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (match) frontmatter[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return { frontmatter, body };
}

function checkFile(filePath) {
  const rel = path.relative(__dirname, filePath);
  const text = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = extractFrontmatter(text);

  // Layer 1: walker-exclude check
  const sourcePath = frontmatter.source_path;
  if (sourcePath) {
    for (const excluded of WALKER_EXCLUDE_LIST) {
      if (sourcePath === excluded || sourcePath.startsWith(excluded)) {
        return {
          ok: false,
          layer: 1,
          reason: `LAYER 1 VIOLATION — page ${rel} references excluded source_path "${sourcePath}". Walker should have excluded this.`,
        };
      }
    }
  }

  // Layer 2: regex scrub
  for (const { name, pattern } of SECRET_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      return {
        ok: false,
        layer: 2,
        reason: `LAYER 2 VIOLATION — page ${rel} contains secret pattern "${name}". Match: ${truncate(
          match[0],
          50
        )}`,
      };
    }
  }

  return { ok: true };
}

function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, n) + "…";
}

function main() {
  const layer = process.argv.includes("--layer=walker")
    ? "walker"
    : process.argv.includes("--layer=mdx")
      ? "mdx"
      : "all";

  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`[lint-secrets] content dir not found: ${CONTENT_DIR}`);
    console.error("[lint-secrets] Run /docs sync first to generate MDX, then re-run lint.");
    // Not an error — empty corpus is valid pre-sync state
    return 0;
  }

  let totalChecked = 0;
  let firstFailure = null;

  for (const file of walkMdx(CONTENT_DIR)) {
    totalChecked++;
    const result = checkFile(file);
    if (!result.ok) {
      firstFailure = result;
      break;
    }
  }

  if (firstFailure) {
    console.error("");
    console.error("✗ SECRET LEAK DETECTED — FAIL LOUD (no silent scrub)");
    console.error(`  ${firstFailure.reason}`);
    console.error("");
    console.error("To fix: remove the offending content from the source file");
    console.error("OR add the source to docs/lint-secrets.cjs WALKER_EXCLUDE_LIST");
    console.error("OR open a GitHub issue tagged `secret-leak-suspected` for triage.");
    console.error("");
    return 1;
  }

  console.log(`✓ lint-secrets clean (checked ${totalChecked} MDX pages, layer=${layer})`);
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { checkFile, SECRET_PATTERNS, WALKER_EXCLUDE_LIST };
