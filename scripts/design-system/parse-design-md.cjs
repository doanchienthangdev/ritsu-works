// ============================================================================
// scripts/design-system/parse-design-md.cjs — DESIGN.md parser + token normalizer
// ============================================================================
// Capability `design-system-styling` v1.0, Sprint 1. Pure (no I/O — caller passes
// file content). Parses a DESIGN.md (Google Stitch / google-labs-code/design.md
// format: YAML token frontmatter + Markdown rationale body), resolves `{token.refs}`
// (with cycle + unresolved-ref detection), validates that the `colors` map is sRGB
// hex, and returns a normalized token object + the markdown body.
//
// Mirrors the deterministic, throw-on-bad-input discipline of scripts/deepask/*.cjs.
// Reuses scripts/core/lib/frontmatter.cjs parse() — DESIGN.md has the same
// `---` YAML-frontmatter + body shape as a core doc.
// ============================================================================

'use strict';

const { parse } = require('../core/lib/frontmatter.cjs');

class DesignMdParseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DesignMdParseError';
  }
}

// sRGB hex: #RGB, #RRGGBB, or #RRGGBBAA. Anchored, no /g flag (safe for .test).
const SRGB_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/** Look up a dotted path (e.g. "colors.primary") in a token object. */
function getByPath(root, dotted) {
  let node = root;
  for (const key of dotted.split('.')) {
    if (node === null || typeof node !== 'object' || !(key in node)) return undefined;
    node = node[key];
  }
  return node;
}

/**
 * Resolve every `{a.b.c}` reference inside a string against `root`, recursively
 * (a ref may resolve to another ref). `chain` tracks the paths currently being
 * resolved so circular references throw instead of looping forever.
 */
function resolveString(root, str, chain) {
  const re = /\{([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\}/g;
  let out = '';
  let lastIndex = 0;
  let m;
  while ((m = re.exec(str)) !== null) {
    out += str.slice(lastIndex, m.index);
    const refPath = m[1];
    if (chain.includes(refPath)) {
      throw new DesignMdParseError(
        `circular token reference: ${[...chain, refPath].join(' -> ')}`,
      );
    }
    const target = getByPath(root, refPath);
    if (target === undefined || target === null) {
      throw new DesignMdParseError(`unresolved token reference {${refPath}}`);
    }
    out +=
      typeof target === 'string'
        ? resolveString(root, target, [...chain, refPath])
        : String(target);
    lastIndex = m.index + m[0].length;
  }
  out += str.slice(lastIndex);
  return out;
}

/** Deep-copy `node`, resolving all string `{refs}` against `root`. */
function deepResolve(root, node) {
  if (typeof node === 'string') return resolveString(root, node, []);
  if (Array.isArray(node)) return node.map((v) => deepResolve(root, v));
  if (node !== null && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) out[k] = deepResolve(root, v);
    return out;
  }
  return node;
}

/**
 * Parse a DESIGN.md document into normalized tokens + body.
 *
 * @param {string} content  raw DESIGN.md file content.
 * @returns {{ name, version, description, colors, typography, rounded, spacing, components, body, tokens }}
 * @throws {DesignMdParseError} on non-string input, missing frontmatter, malformed
 *   YAML, circular/unresolved token refs, or a non-sRGB-hex color value.
 */
function parseDesignMd(content) {
  if (typeof content !== 'string') {
    throw new DesignMdParseError(
      `content must be a string, got ${content === null ? 'null' : typeof content}`,
    );
  }

  let frontmatter, body;
  try {
    ({ frontmatter, body } = parse(content));
  } catch (e) {
    throw new DesignMdParseError(`malformed YAML frontmatter: ${e.message}`);
  }

  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    throw new DesignMdParseError('DESIGN.md has no YAML token frontmatter');
  }

  const resolved = deepResolve(frontmatter, frontmatter);

  // sRGB validation: the top-level `colors` map must be all valid hex (post-resolve).
  if (resolved.colors !== undefined) {
    if (resolved.colors === null || typeof resolved.colors !== 'object' || Array.isArray(resolved.colors)) {
      throw new DesignMdParseError('`colors` must be a mapping of token → hex');
    }
    for (const [k, v] of Object.entries(resolved.colors)) {
      if (typeof v !== 'string' || !SRGB_HEX.test(v)) {
        throw new DesignMdParseError(`colors.${k} is not a valid sRGB hex: ${JSON.stringify(v)}`);
      }
    }
  }

  return {
    name: resolved.name,
    version: resolved.version,
    description: resolved.description,
    colors: resolved.colors || {},
    typography: resolved.typography || {},
    rounded: resolved.rounded || {},
    spacing: resolved.spacing || {},
    components: resolved.components || {},
    body,
    tokens: resolved,
  };
}

module.exports = { parseDesignMd, DesignMdParseError, SRGB_HEX };
