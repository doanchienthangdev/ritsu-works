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
    // hasOwnProperty (NOT `key in node`) so inherited Object keys — {toString},
    // {constructor}, {__proto__}, {hasOwnProperty} — resolve to undefined (→ a
    // thrown "unresolved token reference") instead of leaking native built-ins
    // into tokens from an untrusted downloaded DESIGN.md (PR #175 @cto review).
    if (node === null || typeof node !== 'object' || !Object.prototype.hasOwnProperty.call(node, key)) {
      return undefined;
    }
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
  // Path segments allow [a-zA-Z0-9_-]: real getdesign DESIGN.md token keys are
  // hyphenated (e.g. {colors.on-primary}, {typography.button-md}, {colors.primary-deep}).
  // getByPath already splits on "." and resolves hyphenated keys — the regex was the
  // lone inconsistency, silently leaving every such ref as a literal "{...}" string in
  // the output (a recovered getdesign system would otherwise inject dozens of them).
  const re = /\{([a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*)\}/g;
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

// ----------------------------------------------------------------------------
// Frontmatter recovery — the getdesign-output salvage path.
//
// Real `npx getdesign add <name>` output sometimes emits a long UNQUOTED top-level
// scalar — most often `description:` — whose value embeds a ": " (colon+space), a
// " #", or a leading YAML indicator char. js-yaml then rejects the whole block
// ("bad indentation of a mapping entry"). We salvage the system by double-quoting the
// offending TOP-LEVEL scalar(s) and re-parsing ONCE. Scope is deliberately narrow —
// only column-0 `key: value` plain scalars — so nested token blocks (colors /
// typography / components) are never rewritten, valid token blocks keep their strict
// sRGB + ref-cycle validation, and a genuinely-broken document still throws
// (resolve-style.cjs is the outer safety net that degrades to plain on any throw).
// ----------------------------------------------------------------------------

// First-char of a value that is an INTENTIONAL quoted / flow-collection / block-scalar /
// anchor-or-alias — left verbatim (re-quoting these would corrupt them).
const QUOTED_OR_STRUCTURED_START = new Set(['"', "'", '[', '{', '|', '>', '*', '&', '?']);

/** True if `value` is a plain scalar js-yaml would mis-read as a mapping / comment / indicator. */
function isRiskyPlainScalar(value) {
  return (
    /:(?:\s|$)/.test(value) || // "a: b" colon+space (or trailing ":") → looks like a nested mapping
    /(?:^|\s)#/.test(value) || // "#…" / " #…" → YAML comment indicator
    /^[!@`%,]/.test(value) // value-start indicator chars not already in the quoted/structured set
  );
}

/**
 * Coerce a single frontmatter line. Only top-level (column 0) `key: value` plain
 * scalars are touched, and only when risky; everything else is returned verbatim.
 */
function coerceRiskyScalarLine(line) {
  const m = /^([A-Za-z0-9_][A-Za-z0-9_-]*):[ \t]+(\S.*)$/.exec(line);
  if (!m) return line; // blank line, nested (indented) key, or a block parent (`key:` w/ no value)
  const key = m[1];
  const value = m[2].replace(/[ \t]+$/, ''); // YAML ignores trailing space; drop it before quoting
  if (QUOTED_OR_STRUCTURED_START.has(value[0])) return line; // intentional quoted/flow/block/anchor
  if (!isRiskyPlainScalar(value)) return line;
  // Double-quote the value: escape backslashes first, then double-quotes → valid YAML.
  const quoted = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `${key}: "${quoted}"`;
}

/**
 * Attempt to repair a DESIGN.md whose YAML frontmatter failed to parse, by
 * double-quoting risky TOP-LEVEL scalar values. Returns the repaired full content,
 * or null when there is no frontmatter block, or nothing risky to change (the caller
 * then keeps the original parse error and lets it throw).
 *
 * Mirrors the `---\n … \n---\n` boundary logic of scripts/core/lib/frontmatter.cjs (the
 * shared parser) so the repaired text re-parses through exactly the same path.
 *
 * @param {string} content  raw DESIGN.md content (caller guarantees a string).
 * @returns {string|null}
 */
function sanitizeFrontmatterScalars(content) {
  let c = content;
  if (c.charCodeAt(0) === 0xfeff) c = c.slice(1); // strip BOM
  c = c.replace(/\r\n/g, '\n'); // normalize CRLF
  if (!c.startsWith('---\n')) return null; // no frontmatter block to repair (e.g. tokenless prose)
  const endIdx = c.indexOf('\n---\n', 4);
  if (endIdx === -1) return null; // unterminated frontmatter
  const fmRaw = c.slice(4, endIdx);
  const fmFixed = fmRaw.split('\n').map(coerceRiskyScalarLine).join('\n');
  if (fmFixed === fmRaw) return null; // nothing risky at the top level → no repair to offer
  return `---\n${fmFixed}${c.slice(endIdx)}`;
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
    // Recovery: try double-quoting a risky top-level scalar (e.g. an unquoted
    // getdesign `description:` with an embedded ": ") and re-parse ONCE before failing.
    const repaired = sanitizeFrontmatterScalars(content);
    if (repaired === null) {
      throw new DesignMdParseError(`malformed YAML frontmatter: ${e.message}`);
    }
    try {
      ({ frontmatter, body } = parse(repaired));
    } catch (e2) {
      throw new DesignMdParseError(`malformed YAML frontmatter (recovery failed): ${e2.message}`);
    }
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

module.exports = {
  parseDesignMd,
  DesignMdParseError,
  SRGB_HEX,
  sanitizeFrontmatterScalars,
  isRiskyPlainScalar,
};
