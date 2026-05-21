#!/usr/bin/env node
/**
 * scripts/cla/resolve-refs.cjs — `/cla propose` ref resolver (v1.1, 2026-05-21).
 *
 * Resolves the `--refs` list for /cla propose, expanding `wiki:` forms into
 * intermediate files under `runtime/cla/refs/<slug>/` via `/wiki get`.
 *
 * Supported ref grammar:
 *   <file-path>                        → existing file (kept as-is)
 *   wiki:src=<spec>                    → /wiki get --src=<spec> → write to runtime
 *   wiki:query="<text>"                → ORCHESTRATOR-ONLY (script bails — needs MCP wiki_ask)
 *   wiki:query="<text>":src=<source>   → ORCHESTRATOR-ONLY (same reason)
 *
 * Why wiki:query= is orchestrator-only: semantic retrieval requires
 * `mcp__supabase-ops__wiki_ask` which is a Claude session MCP tool, not
 * available to standalone scripts. The /cla propose slash command (running
 * in Claude session) handles wiki:query= directly via MCP + then invokes
 * get.cjs with the resolved entity list.
 *
 * Usage:
 *   node scripts/cla/resolve-refs.cjs --slug=<slug> --refs=<csv> [--dry-run]
 *
 * Input: --refs is one OR multiple --refs args, each value may be CSV.
 *        Combined ref list = union of all values.
 *
 * Output (JSON to stdout):
 *   {
 *     slug: <slug>,
 *     resolved: [
 *       { kind: 'file', original: '<path>', resolved_path: '<path>' },
 *       { kind: 'wiki-src', original: 'wiki:src=...', resolved_path: 'runtime/cla/refs/<slug>/01-...md' },
 *       { kind: 'wiki-query-pending', original: 'wiki:query=...', note: 'orchestrator must dispatch' }
 *     ],
 *     runtime_refs_dir: 'runtime/cla/refs/<slug>',
 *     warnings: [...]
 *   }
 *
 * Exit codes:
 *   0 — success (including wiki:query= entries marked as pending)
 *   1 — input/spec error
 *   2 — write error
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const GET_CJS = path.join(REPO_ROOT, "scripts", "wiki-sync", "get.cjs");

function parseArgs(argv) {
  const args = { refs: [], dryRun: false };
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!m) continue;
    const [, k, v] = m;
    if (k === "refs") {
      // Comma-split this --refs value, append to combined list
      if (!v) continue;
      v.split(",").forEach((r) => {
        const t = r.trim();
        if (t) args.refs.push(t);
      });
    } else if (k === "slug") {
      args.slug = v;
    } else if (k === "dry-run") {
      args.dryRun = true;
    }
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[resolve-refs] ✗ ${msg}`);
  process.exit(code);
}

function slugify(text, maxLen = 60) {
  let s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/-+$/, "");
  return s;
}

/**
 * Parse `wiki:` ref into { kind, src?, query?, sourceSlug? }
 *
 * Forms:
 *   wiki:src=<spec>
 *   wiki:query="<text>"          (quotes optional but encouraged for whitespace)
 *   wiki:query="<text>":src=<src>
 */
function parseWikiRef(ref) {
  const rest = ref.slice(5); // strip 'wiki:'
  const parts = {};
  // Tokenize by ':' BUT respect quoted values (query="..." may contain ':')
  // Simple state machine
  let i = 0;
  while (i < rest.length) {
    // read key
    let eqIdx = rest.indexOf("=", i);
    if (eqIdx === -1) break;
    const key = rest.slice(i, eqIdx).trim();
    i = eqIdx + 1;
    // read value: if starts with quote, read until matching quote
    let value;
    if (rest[i] === '"' || rest[i] === "'") {
      const quote = rest[i];
      i++;
      const closeIdx = rest.indexOf(quote, i);
      if (closeIdx === -1) dieErr(`unterminated quote in ref "${ref}"`);
      value = rest.slice(i, closeIdx);
      i = closeIdx + 1;
      if (rest[i] === ":") i++; // skip separator
    } else {
      const sepIdx = rest.indexOf(":", i);
      value = sepIdx === -1 ? rest.slice(i) : rest.slice(i, sepIdx);
      i = sepIdx === -1 ? rest.length : sepIdx + 1;
    }
    parts[key] = value;
  }
  return parts; // { src?: ..., query?: ... }
}

function isWikiRef(ref) {
  return ref.startsWith("wiki:");
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.slug) {
    dieErr("missing --slug=<capability-id>");
  }
  if (args.refs.length === 0) {
    console.log(
      JSON.stringify({
        slug: args.slug,
        resolved: [],
        runtime_refs_dir: null,
        warnings: ["no --refs provided"],
      })
    );
    return;
  }

  const runtimeDir = path.join(
    REPO_ROOT,
    "runtime",
    "cla",
    "refs",
    args.slug
  );
  if (!args.dryRun) {
    fs.mkdirSync(runtimeDir, { recursive: true });
  }

  const resolved = [];
  const warnings = [];
  let ordinal = 1;

  for (const ref of args.refs) {
    if (!isWikiRef(ref)) {
      // File path ref
      const absPath = path.isAbsolute(ref) ? ref : path.join(REPO_ROOT, ref);
      if (!fs.existsSync(absPath)) {
        warnings.push(`file ref not found: ${ref}`);
      }
      resolved.push({
        kind: "file",
        original: ref,
        resolved_path: ref,
        exists: fs.existsSync(absPath),
      });
      continue;
    }

    const parts = parseWikiRef(ref);

    if (parts.query) {
      // Orchestrator-only — script can't do MCP wiki_ask
      const filename = `${String(ordinal).padStart(2, "0")}-wiki-query-${slugify(parts.query)}.md`;
      resolved.push({
        kind: "wiki-query-pending",
        original: ref,
        intended_path: path.join("runtime", "cla", "refs", args.slug, filename),
        query: parts.query,
        src_filter: parts.src || null,
        note: "orchestrator must dispatch via MCP wiki_ask → /wiki get --entities= → write to intended_path",
      });
      ordinal++;
      continue;
    }

    if (parts.src) {
      // Deterministic — call get.cjs directly
      const filename = `${String(ordinal).padStart(2, "0")}-wiki-${slugify(parts.src)}.md`;
      const outPath = path.join(runtimeDir, filename);
      if (args.dryRun) {
        resolved.push({
          kind: "wiki-src-dry-run",
          original: ref,
          src: parts.src,
          intended_path: path.join(
            "runtime",
            "cla",
            "refs",
            args.slug,
            filename
          ),
        });
        ordinal++;
        continue;
      }
      const result = spawnSync(
        "node",
        [GET_CJS, `--src=${parts.src}`, `--to=${outPath}`],
        { encoding: "utf-8" }
      );
      if (result.status !== 0) {
        warnings.push(
          `wiki:src=${parts.src} failed: ${result.stderr.trim() || "exit " + result.status}`
        );
        resolved.push({
          kind: "wiki-src-error",
          original: ref,
          error: result.stderr.trim() || `exit ${result.status}`,
        });
      } else {
        resolved.push({
          kind: "wiki-src",
          original: ref,
          src: parts.src,
          resolved_path: path.relative(REPO_ROOT, outPath),
        });
      }
      ordinal++;
      continue;
    }

    warnings.push(`wiki: ref has neither src= nor query=: ${ref}`);
  }

  console.log(
    JSON.stringify(
      {
        slug: args.slug,
        resolved,
        runtime_refs_dir: path.relative(REPO_ROOT, runtimeDir),
        warnings,
      },
      null,
      2
    )
  );
}

main();
