/**
 * scripts/core/lib/frontmatter.cjs — shared YAML frontmatter parser/serializer.
 *
 * NEW shared lib per CTO Phase 2 mandate (`.archives/cla/core-redesign-and-command/spec.md` §4.8).
 * Mirrors `scripts/wiki-sync/get.cjs:82-114` inline parser semantics but uses
 * `js-yaml` for full YAML support (arrays, nested objects, multi-line).
 *
 * Parity test (`tests/core/frontmatter.parity.test.ts`) asserts identical output
 * vs `scripts/wiki-sync/get.cjs` inline parser on same fixtures.
 *
 * Public API:
 *   parse(content: string) → { frontmatter: object, body: string }
 *   serialize(frontmatter: object, body: string) → string
 *   validate(frontmatter: object, schema: object) → { valid: bool, errors: [] }
 *   list(dir: string) → Array<{ path, frontmatter, body }>
 *
 * Used by:
 *   - scripts/core/compose.cjs (bundle assembler)
 *   - scripts/core/validate.cjs (schema check)
 *   - scripts/core/reindex.cjs (INDEX.md regen)
 *   - scripts/core/migrate-existing-frontmatter.cjs (retrofit existing 3 docs)
 *   - scripts/cross-tier/validate-core-pillar.cjs (wrapper for pnpm check)
 *
 * v1.0 — Sprint 2 of core-redesign-and-command.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

/**
 * Parse markdown file content into { frontmatter, body }.
 * Returns { frontmatter: {}, body: <full text> } if no frontmatter block detected.
 *
 * Handles edge cases:
 *  - BOM (UTF-8 byte-order mark stripped)
 *  - CRLF normalized to LF
 *  - Empty frontmatter ("---\n---\n" → fm={})
 *  - Body with embedded "---" separators (only opening + first closing matter)
 *  - Malformed YAML → throws YAMLException (caller decides whether to bail or warn)
 */
function parse(content) {
  if (content == null) return { frontmatter: {}, body: "" };
  // Strip BOM
  if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
  // Normalize CRLF
  content = content.replace(/\r\n/g, "\n");

  if (!content.startsWith("---\n")) {
    return { frontmatter: {}, body: content };
  }
  const endIdx = content.indexOf("\n---\n", 4);
  if (endIdx === -1) {
    // Opening "---" but no closing — treat as no frontmatter
    return { frontmatter: {}, body: content };
  }
  const fmRaw = content.slice(4, endIdx);
  const body = content.slice(endIdx + 5);

  let fm = {};
  if (fmRaw.trim()) {
    fm = yaml.load(fmRaw) || {};
    if (typeof fm !== "object" || Array.isArray(fm)) {
      throw new Error(
        `Frontmatter must be an object map, got ${Array.isArray(fm) ? "array" : typeof fm}`
      );
    }
  }
  return { frontmatter: fm, body };
}

/**
 * Serialize { frontmatter, body } → markdown string with leading YAML block.
 * If frontmatter is empty or null, returns body as-is (no leading "---").
 */
function serialize(frontmatter, body) {
  body = body == null ? "" : String(body);
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return body;
  }
  const fmYaml = yaml.dump(frontmatter, {
    lineWidth: -1, // no auto-wrap
    noRefs: true,
    sortKeys: false,
    quotingType: '"',
    forceQuotes: false,
  });
  return `---\n${fmYaml}---\n${body}`;
}

/**
 * Validate frontmatter against schema (per-status required fields).
 *
 * Schema shape (canonical/v0.1-draft/stub/deprecated):
 *   {
 *     required_always: ['title', 'type', 'slug', 'layer', 'status', 'owner', 'last_reviewed', 'review_cadence', 'auto_load'],
 *     required_if_v0_1_draft: ['revisit_at', 'revisit_trigger', 'revisit_owner'],
 *     required_if_stub: ['entry_condition', 'triggered_by', 'why_deferred'],
 *     enums: {
 *       type: ['core-doc'],
 *       layer: ['identity', 'strategy', 'brand-design', 'operating', 'stage', 'meta'],
 *       status: ['canonical', 'v0.1-draft', 'stub', 'deprecated'],
 *       owner: ['founder', 'cofounder', 'gps', /* + roles ​*​/],
 *       review_cadence: ['quarterly', 'annual', 'on-trigger', 'never'],
 *     },
 *   }
 *
 * Returns: { valid: bool, errors: [{ field, message }] }
 */
function validate(frontmatter, schema) {
  const errors = [];
  if (!frontmatter || typeof frontmatter !== "object") {
    return { valid: false, errors: [{ field: "_root", message: "frontmatter is not an object" }] };
  }

  // Required always
  for (const f of schema.required_always || []) {
    if (frontmatter[f] === undefined || frontmatter[f] === null) {
      errors.push({ field: f, message: `required field "${f}" missing` });
    }
  }

  // Enum checks
  for (const [field, allowed] of Object.entries(schema.enums || {})) {
    if (frontmatter[field] !== undefined && !allowed.includes(frontmatter[field])) {
      errors.push({
        field,
        message: `"${field}" value "${frontmatter[field]}" not in allowed enum [${allowed.join(", ")}]`,
      });
    }
  }

  // Conditional requires per status
  const status = frontmatter.status;
  if (status === "v0.1-draft") {
    for (const f of schema.required_if_v0_1_draft || []) {
      if (frontmatter[f] === undefined || frontmatter[f] === null) {
        errors.push({ field: f, message: `v0.1-draft status requires "${f}"` });
      }
    }
  } else if (status === "stub") {
    for (const f of schema.required_if_stub || []) {
      if (frontmatter[f] === undefined || frontmatter[f] === null) {
        errors.push({ field: f, message: `stub status requires "${f}"` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * List all *.md files in a directory, parsed into { path, frontmatter, body }.
 * Sorted by filename. Skips non-.md files + dotfiles.
 */
function list(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md") && !f.startsWith("."))
    .sort()
    .map((f) => {
      const p = path.join(dir, f);
      const content = fs.readFileSync(p, "utf-8");
      try {
        const { frontmatter, body } = parse(content);
        return { path: p, frontmatter, body };
      } catch (e) {
        return { path: p, frontmatter: null, body: content, parse_error: e.message };
      }
    });
}

/**
 * Default canonical frontmatter schema for 00-core docs (per spec.md §4.8).
 */
const CORE_SCHEMA = {
  required_always: [
    "title",
    "type",
    "slug",
    "layer",
    "status",
    "owner",
    "last_reviewed",
    "review_cadence",
    "auto_load",
  ],
  required_if_v0_1_draft: ["revisit_at", "revisit_trigger", "revisit_owner"],
  required_if_stub: ["entry_condition", "triggered_by", "why_deferred"],
  enums: {
    type: ["core-doc"],
    layer: ["identity", "strategy", "brand-design", "operating", "stage", "meta"],
    status: ["canonical", "v0.1-draft", "stub", "deprecated"],
    review_cadence: ["quarterly", "annual", "on-trigger", "never"],
  },
};

module.exports = { parse, serialize, validate, list, CORE_SCHEMA };
