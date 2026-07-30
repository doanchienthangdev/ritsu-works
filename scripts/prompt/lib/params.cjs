#!/usr/bin/env node
'use strict';
/**
 * scripts/prompt/lib/params.cjs — capability `prompt-platform` v0.1
 *
 * The DETERMINISTIC half of /prompt: flag vocabulary, argv parsing, and validation
 * against knowledge/prompt-directions.yaml. Pure Node, zero API, zero secret —
 * everything here is unit-testable and costs nothing to run.
 *
 * The JUDGMENT half (which parameters to pick, how to phrase them) lives in
 * 06-ai-ops/skills/prompt/**, driven by the session model. Nothing in this file
 * ever writes prompt prose.
 *
 * Contract mirrored from /image + /dataviz: a REGISTERED flag that the resolved
 * direction/model does not support produces a WARNING and is preserved in the
 * parsed object — it is never silently dropped. An UNREGISTERED flag is an error.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const REGISTRY_REL = 'knowledge/prompt-directions.yaml';

/** Every flag /prompt recognises. Unregistered flags are a hard error. */
const UNIVERSAL_PARAMS = [
  'type',
  'mode',
  'output',
  'model',
  'count',
  'ar',
  'ref',
  'preserve',
  'change',
  'realism',
  'out',
  'generate',
  'dry-run',
  'lang',
];

/** Flags that take no value. */
const BOOLEAN_PARAMS = new Set(['generate', 'dry-run']);

/** Flags that may be repeated / comma-separated into a list. */
const LIST_PARAMS = new Set(['ref', 'preserve', 'change']);

/**
 * Sentinels for --ref meaning "an image ATTACHED to this conversation", not a file on
 * disk. `attached`, `attached:2`, `upload`, … all resolve to kind='attached'.
 *
 * Why this exists: in practice the founder drags an image into the chat rather than
 * saving it and passing a path. v0.1 only accepted paths, so a legitimate ref-mode run
 * with an attached image was refused — the gate was right about the contract and wrong
 * about reality (observed 2026-07-30).
 *
 * params.cjs is pure Node and CANNOT see the conversation. The orchestrator skill is
 * responsible for injecting --ref=attached when an image is attached; this file only
 * knows how to recognise and classify the sentinel.
 */
const ATTACHED_ALIASES = ['attached', 'attachment', 'upload', 'uploaded'];
const ATTACHED_REF_RE = new RegExp(`^(?:${ATTACHED_ALIASES.join('|')})(?::(\\d+))?$`, 'i');

const DEFAULTS = {
  mode: 'text',
  output: 'default',
  count: 1,
  realism: 'max',
  generate: false,
  'dry-run': false,
  lang: 'en',
};

const VERBS = ['build', 'enhance'];
const MAX_COUNT = 20;

function loadRegistry(repoRoot = REPO_ROOT) {
  const abs = path.join(repoRoot, REGISTRY_REL);
  if (!fs.existsSync(abs)) throw new Error(`${REGISTRY_REL} not found — capability prompt-platform is not installed`);
  return yaml.load(fs.readFileSync(abs, 'utf-8')) || {};
}

function vocabIds(doc, axis) {
  return (Array.isArray(doc[axis]) ? doc[axis] : []).map((e) => e && e.id).filter(Boolean);
}

function resolveDirection(doc, token) {
  const list = Array.isArray(doc.directions) ? doc.directions : [];
  if (!token) return list.find((d) => d.default === true) || null;
  const t = String(token).toLowerCase();
  return list.find((d) => d.id === t || (Array.isArray(d.aliases) && d.aliases.includes(t))) || null;
}

/** Resolve a --type token (id or alias) against the registry. Null when absent/unknown. */
function resolveType(doc, token) {
  if (!token) return null;
  const list = Array.isArray(doc.types) ? doc.types : [];
  const t = String(token).toLowerCase();
  return list.find((x) => x.id === t || (Array.isArray(x.aliases) && x.aliases.includes(t))) || null;
}

/**
 * Classify each --ref value as an attached image or a path on disk.
 * Returns [{kind:'attached'|'path', value, index?, resolved?, exists}].
 * A path that does not exist is reported with exists=false so `validate` can refuse —
 * v0.1 accepted a typo'd path silently and the founder only found out from the output.
 */
function resolveRefs(list, repoRoot = REPO_ROOT, cwd = process.cwd()) {
  return (Array.isArray(list) ? list : []).map((raw) => {
    const value = String(raw).trim();
    const m = ATTACHED_REF_RE.exec(value);
    if (m) return { kind: 'attached', value, index: m[1] ? Number(m[1]) : 1, exists: true };
    const candidates = path.isAbsolute(value) ? [value] : [path.join(cwd, value), path.join(repoRoot, value)];
    const resolved = candidates.find((p) => { try { return fs.existsSync(p); } catch (e) { return false; } }) || null;
    return { kind: 'path', value, resolved, exists: Boolean(resolved) };
  });
}

function splitList(value) {
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse argv into a raw shape. Does no registry validation — that is `validate`.
 * Recognises: `--flag=value`, `--flag value`, `--bool`, and positionals.
 * Positional 1 = direction. Positional 2 = verb when it is a known verb.
 * Everything remaining joins into `input`.
 */
function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  const errors = [];

  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (typeof tok !== 'string') continue;

    if (!tok.startsWith('--')) { positionals.push(tok); continue; }

    const body = tok.slice(2);
    if (body.length === 0) { errors.push('empty flag "--"'); continue; }

    const eq = body.indexOf('=');
    const name = eq === -1 ? body : body.slice(0, eq);
    let value = eq === -1 ? undefined : body.slice(eq + 1);

    if (!UNIVERSAL_PARAMS.includes(name)) {
      errors.push(`unknown flag --${name} (known: ${UNIVERSAL_PARAMS.map((p) => `--${p}`).join(' ')})`);
      continue;
    }

    if (BOOLEAN_PARAMS.has(name)) {
      if (value === undefined) flags[name] = true;
      else flags[name] = !['false', '0', 'no', 'off'].includes(String(value).toLowerCase());
      continue;
    }

    if (value === undefined) {
      const next = argv[i + 1];
      if (typeof next === 'string' && !next.startsWith('--')) { value = next; i += 1; }
      else { errors.push(`--${name} requires a value`); continue; }
    }

    if (LIST_PARAMS.has(name)) {
      flags[name] = (flags[name] || []).concat(splitList(value));
    } else {
      flags[name] = value;
    }
  }

  const directionToken = positionals.length ? positionals[0] : undefined;
  let verb;
  let rest = positionals.slice(1);
  if (rest.length && VERBS.includes(String(rest[0]).toLowerCase())) {
    verb = String(rest[0]).toLowerCase();
    rest = rest.slice(1);
  }

  return { directionToken, verb, input: rest.join(' ').trim(), flags, errors };
}

/**
 * Validate a parsed shape against the registry.
 * Returns { ok, direction, model, verb, input, flags, warnings, errors }.
 * `warnings` = registered-but-unsupported (kept, never dropped).
 * `errors`   = refusals.
 */
function validate(parsed, doc, repoRoot = REPO_ROOT, cwd = process.cwd()) {
  const errors = parsed.errors.slice();
  const warnings = [];
  const flags = Object.assign({}, DEFAULTS, parsed.flags);

  const direction = resolveDirection(doc, parsed.directionToken);
  if (!parsed.directionToken) {
    errors.push('direction is required — usage: /prompt <direction> [build|enhance] "<input>"');
  } else if (!direction) {
    const known = (doc.directions || []).map((d) => d.id).join(', ');
    errors.push(`unknown direction "${parsed.directionToken}" (registered: ${known})`);
  } else if (direction.status !== 'installed') {
    errors.push(`direction "${direction.id}" is registered but not built — ${direction.reason_not_built || 'no reason recorded'}`);
  }

  const verb = parsed.verb || 'build';
  if (!VERBS.includes(verb)) errors.push(`unknown verb "${verb}" (expected: ${VERBS.join('|')})`);

  if (!parsed.input) {
    errors.push(verb === 'enhance'
      ? 'enhance requires the prompt to repair as input'
      : 'build requires an idea as input');
  }

  // ── type (fixed-structure template) ──────────────────────────────────────
  // Resolved BEFORE the other axes because a type carries its own defaults and can
  // override realism. Anything the caller passed explicitly still wins.
  let type = null;
  if (parsed.flags.type !== undefined) {
    type = resolveType(doc, parsed.flags.type);
    if (!type) {
      const known = (doc.types || []).map((t) => t.id).join(', ');
      errors.push(`unknown --type "${parsed.flags.type}" (registered: ${known || 'none'})`);
    } else if (type.status !== 'installed') {
      errors.push(`--type "${type.id}" is registered but not built — ${type.reason_not_built || 'no reason recorded'}`);
    } else {
      flags.type = type.id; // normalise an alias to its canonical id
      if (direction && Array.isArray(type.directions) && !type.directions.includes(direction.id)) {
        errors.push(`--type "${type.id}" does not apply to direction "${direction.id}" (applies to: ${type.directions.join(', ')})`);
      }
      if (direction && Array.isArray(direction.supported_types) && !direction.supported_types.includes(type.id)) {
        errors.push(`direction "${direction.id}" does not support --type=${type.id}`);
      }
      if (type.requires_ref && (parsed.flags.ref || []).length === 0) {
        errors.push(`--type=${type.id} requires at least one --ref — a file path, or --ref=attached for an image attached to this conversation (it builds from an existing character/product, not from nothing)`);
      }
      if (Array.isArray(type.compatible_modes) && parsed.flags.mode !== undefined && !type.compatible_modes.includes(parsed.flags.mode)) {
        errors.push(`--type=${type.id} does not support --mode=${parsed.flags.mode} (supported: ${type.compatible_modes.join('|')})`);
      }
      // Type defaults fill only what the caller left unset.
      if (parsed.flags.ar === undefined && type.default_ar) flags.ar = type.default_ar;
      if (parsed.flags.model === undefined && type.default_model) flags.model = type.default_model;
      if (parsed.flags.realism === undefined && type.realism_override) {
        flags.realism = type.realism_override;
        warnings.push(`--type=${type.id} sets --realism=${type.realism_override}: ${String(type.waiver_reason || '').trim().replace(/\s+/g, ' ')}`);
      }
    }
  }

  // ── vocabulary axes ──────────────────────────────────────────────────────
  const modeIds = vocabIds(doc, 'modes');
  if (!modeIds.includes(flags.mode)) errors.push(`unknown --mode "${flags.mode}" (registered: ${modeIds.join('|')})`);
  else if (direction && Array.isArray(direction.supported_modes) && !direction.supported_modes.includes(flags.mode)) {
    errors.push(`direction "${direction.id}" does not support --mode=${flags.mode}`);
  }

  const outputEntry = (doc.outputs || []).find((o) => o.id === flags.output);
  if (!outputEntry) errors.push(`unknown --output "${flags.output}" (registered: ${vocabIds(doc, 'outputs').join('|')})`);
  else if (outputEntry.status !== 'installed') {
    warnings.push(`--output=${flags.output} is registered but not built (${outputEntry.reason || 'no reason recorded'}) — falling back to "default"`);
    flags.output = 'default';
  }

  const realismIds = vocabIds(doc, 'realism_levels');
  if (!realismIds.includes(flags.realism)) errors.push(`unknown --realism "${flags.realism}" (registered: ${realismIds.join('|')})`);

  // ── model ────────────────────────────────────────────────────────────────
  let model = null;
  if (direction && Array.isArray(direction.models) && direction.models.length) {
    model = flags.model
      ? direction.models.find((m) => m.id === flags.model) || null
      : direction.models.find((m) => m.default === true) || direction.models[0];
    if (flags.model && !model) {
      errors.push(`unknown --model "${flags.model}" for direction "${direction.id}" (registered: ${direction.models.map((m) => m.id).join('|')})`);
    }
  }

  // ── numeric + shape ──────────────────────────────────────────────────────
  const count = Number(flags.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_COUNT) {
    errors.push(`--count must be an integer between 1 and ${MAX_COUNT} (got "${flags.count}")`);
  } else {
    flags.count = count;
  }

  if (flags.ar !== undefined && !/^\d+:\d+$/.test(String(flags.ar))) {
    errors.push(`--ar must look like W:H (got "${flags.ar}")`);
  }

  // ── mode/flag coherence ──────────────────────────────────────────────────
  const refs = resolveRefs(flags.ref, repoRoot, cwd);
  const typeOwnsRef = Boolean(type && type.requires_ref);
  for (const r of refs) {
    if (r.kind === 'path' && !r.exists) {
      errors.push(`--ref "${r.value}" not found on disk — pass a real path, or use --ref=attached if you attached the image to the conversation`);
    }
  }
  if (flags.mode === 'ref' && refs.length === 0) {
    errors.push('--mode=ref requires at least one --ref — either a file path or --ref=attached for an image attached to this conversation');
  }
  // A type that requires a ref already owns the reference discipline in its template,
  // so --ref outside ref-mode is expected there, not a mistake.
  if (flags.mode !== 'ref' && refs.length > 0 && !typeOwnsRef) {
    warnings.push('--ref supplied outside --mode=ref — reference discipline (preserve/change) will not be emitted; did you mean --mode=ref?');
  }
  for (const key of ['preserve', 'change']) {
    if ((flags[key] || []).length > 0 && flags.mode !== 'ref' && !typeOwnsRef) {
      warnings.push(`--${key} only applies to --mode=ref — kept but not used`);
    }
  }
  if (flags.realism === 'off' && flags.mode === 'ref') {
    warnings.push('--realism=off with --mode=ref: reference consistency usually still wants skin/lighting anchors');
  }
  if (flags.generate && flags.count > 1) {
    warnings.push(`--generate with --count=${flags.count} will chain ${flags.count} /image runs — each one spends`);
  }

  // Direction default_ar is the last fallback, so --ar is always resolved by the time
  // a skill sees it (explicit flag > type default > direction default).
  if (flags.ar === undefined && direction && direction.default_ar) flags.ar = direction.default_ar;

  return {
    ok: errors.length === 0,
    direction,
    type,
    refs,
    model,
    verb,
    input: parsed.input,
    flags,
    warnings,
    errors,
  };
}

/** Convenience: argv → validated shape, loading the registry from disk. */
function parse(argv, repoRoot = REPO_ROOT, cwd = process.cwd()) {
  const doc = loadRegistry(repoRoot);
  return validate(parseArgs(argv), doc, repoRoot, cwd);
}

module.exports = {
  UNIVERSAL_PARAMS,
  BOOLEAN_PARAMS,
  LIST_PARAMS,
  ATTACHED_ALIASES,
  ATTACHED_REF_RE,
  DEFAULTS,
  VERBS,
  MAX_COUNT,
  REGISTRY_REL,
  loadRegistry,
  resolveDirection,
  resolveType,
  resolveRefs,
  parseArgs,
  validate,
  parse,
};
