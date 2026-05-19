#!/usr/bin/env node
/**
 * One-time migration: backfill `translated_source_hash` for all VI .mdx files
 * that have `translated: true` but no `translated_source_hash` yet.
 *
 * v1.2 introduces translated_source_hash to detect stale translations. Files
 * translated under v1.1.x didn't set this field. Since the docs-engine v1.2
 * walker hasn't yet run on them, their `source_hash` equals what they were
 * translated FROM — so we set `translated_source_hash = source_hash` directly.
 *
 * Idempotent: safe to re-run.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "docs", "content", "docs");

function listMdxFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...listMdxFiles(full));
    else if (e.name.endsWith(".mdx") && !e.name.endsWith(".en.mdx"))
      files.push(full);
  }
  return files;
}

function splitFm(content) {
  const lines = content.split("\n");
  if (lines[0] !== "---") return null;
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  return {
    head: lines.slice(0, end + 1),
    body: lines.slice(end + 1).join("\n"),
    fmRange: { start: 1, end },
  };
}

function readField(fmLines, key) {
  const rx = new RegExp(`^${key}:\\s*(.+)$`);
  for (let i = 0; i < fmLines.length; i++) {
    const m = fmLines[i].match(rx);
    if (m) return { line: i, raw: m[1].trim() };
  }
  return null;
}

function insertField(fmLines, key, value, afterKey) {
  // Insert after `afterKey` if present, else before last `---`.
  const after = readField(fmLines.slice(1, fmLines.length - 1), afterKey);
  const newLine = `${key}: ${value}`;
  if (after) {
    // after.line is 0-indexed into slice(1, -1); adjust to full fmLines index
    const fullIdx = after.line + 1;
    fmLines.splice(fullIdx + 1, 0, newLine);
  } else {
    fmLines.splice(fmLines.length - 1, 0, newLine);
  }
}

function main() {
  const files = listMdxFiles(ROOT);
  let migrated = 0;
  let alreadyDone = 0;
  let notTranslated = 0;

  for (const f of files) {
    const content = fs.readFileSync(f, "utf-8");
    const parsed = splitFm(content);
    if (!parsed) continue;
    const fmLines = parsed.head;
    const inner = fmLines.slice(1, fmLines.length - 1);
    const translated = readField(inner, "translated");
    if (!translated || translated.raw !== "true") {
      notTranslated++;
      continue;
    }
    const tsh = readField(inner, "translated_source_hash");
    if (tsh) {
      alreadyDone++;
      continue;
    }
    const sh = readField(inner, "source_hash");
    if (!sh) {
      console.warn(`[migrate] ⚠ no source_hash in ${f}`);
      continue;
    }
    // Insert translated_source_hash right after translated field for readability
    insertField(fmLines, "translated_source_hash", sh.raw, "translated");
    const newContent = fmLines.join("\n") + "\n" + parsed.body;
    fs.writeFileSync(f, newContent, "utf-8");
    migrated++;
  }

  console.log(
    `[migrate-translated-source-hash] migrated=${migrated} already_had_field=${alreadyDone} not_translated=${notTranslated}`
  );
}

main();
