#!/usr/bin/env node
/**
 * One-time import: copy playbook chapters from
 * `.archives/ritsu-handoff-bundle/playbook/chapters/` into
 * `docs/content/docs/playbook/` as MDX with frontmatter.
 *
 * Per founder request: keep Vietnamese as-is for BOTH .mdx (VI default)
 * AND .en.mdx (English route) — no translation back to English.
 *
 * Writes 39 chapters × 2 lang = 78 MDX files.
 *
 * Idempotent: if target exists with matching source_hash, skip.
 *
 * NOTE: walker's `WALKER_EXCLUDE` includes `.archives/`. This script
 * deliberately bypasses walker — playbook chapters are sensitive but
 * NOT secrets (no API keys, no PII). Founder approves publishing them
 * as public docs site content via this script.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PLAYBOOK_ROOT = path.resolve(
  "/Users/doanchienthang/ritsu-works/.archives/ritsu-handoff-bundle/playbook/chapters"
);
const DOCS_TARGET = path.resolve(
  __dirname,
  "..",
  "docs",
  "content",
  "docs",
  "playbook"
);

// Chapter order (matches build_pdf.py CHAPTER_ORDER)
const CHAPTER_ORDER = [
  "01-inner-outer-harness.md",
  "02-bay-doi-bai-toan.md",
  "03-muoi-thanh-phan.md",
  "04-bai-1-single-source-of-truth.md",
  "05-bai-2-trust-blast-radius.md",
  "06-bai-3-context-economics.md",
  "07-bai-4-memory-learning.md",
  "08-bai-5-multi-agent-orchestration.md",
  "09-bai-6-identity-interface.md",
  "10-bai-7-economic-unit.md",
  "11-cau-truc-repo.md",
  "12-build-infrastructure.md",
  "13-roadmap-failure-modes.md",
  "phase-a2/14-phase-a2-introduction.md",
  "phase-a2/15-walkthrough-C8.1-scheduling.md",
  "phase-a2/16-walkthrough-G5-sop-architecture.md",
  "phase-a2/17-walkthrough-G4-dashboard.md",
  "phase-a2/18-gbrain-analysis.md",
  "phase-a2/19-walkthrough-G2-events.md",
  "phase-a2/20-walkthrough-G6-mcp.md",
  "phase-a2/21-walkthrough-G3-state-machines.md",
  "phase-a2/22-walkthrough-G15-knowledge-graph.md",
  "phase-a2/23-walkthrough-G10-decisions.md",
  "phase-a2/24-walkthrough-G8-customer-data.md",
  "phase-a2/25-walkthrough-G7-multi-surface.md",
  "phase-a2/26-walkthrough-G13-knowledge-ingestion.md",
  "phase-a2/27-walkthrough-G9-founder-capacity.md",
  "phase-a2/28-phase-a2-final-architecture.md",
  "phase-a2/29-repo-runtime-strategy.md",
  "phase-a2/30-working-modes-A-B.md",
  "phase-a2/31-boilerplate-strategy.md",
  "phase-a2/32-schema-foundation.md",
  "phase-a2/33-capability-lifecycle-architecture.md",
  "phase-a2/34-capability-case-wiki-sync.md",
  "phase-a2/35-capability-case-docs-engine.md",
  "phase-a2/36-capability-case-core-redesign.md",
  "phase-a2/37-capability-case-evolve.md",
  "phase-a2/38-capability-case-resolver.md",
  "phase-a2/39-capability-case-resolver-v2.md",
  "phase-a2/40-capability-case-resolver-v2-1.md",
  "A1-glossary.md",
  "A2-references.md",
  "A3-pr-templates.md",
];

function sha256(text) {
  return crypto
    .createHash("sha256")
    .update(text.split(/\r?\n/).map((l) => l.replace(/\s+$/, "")).join("\n"))
    .digest("hex");
}

function slugFromChapter(chapterPath) {
  // phase-a2/14-foo.md → 14-foo
  // 01-foo.md → 01-foo
  // A1-foo.md → A1-foo
  const basename = path.basename(chapterPath, ".md");
  return basename;
}

function titleFromBody(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Chapter";
}

// Strip leading `# Title` line (and any blank lines before/after it) so
// Fumadocs's frontmatter-title H1 isn't duplicated by an in-body H1.
function stripLeadingH1(body) {
  return body.replace(/^\s*#\s+[^\n]+\n+/, "");
}

// MDX escape — CommonMark-correct fence handling: closing fence has NO info
// string (only whitespace after the backticks). Lines like ```yaml inside an
// already-open fence remain CONTENT, not a new fence.
function escapeMdxSpecialChars(body) {
  const lines = body.split("\n");
  let inFence = false;
  const out = [];
  for (const line of lines) {
    const m = line.match(/^\s*(```+)(.*)$/);
    if (m) {
      const afterBackticks = m[2].trim();
      if (!inFence) {
        // Currently outside a fence — any ``` line opens a fence (with or
        // without info string).
        inFence = true;
      } else if (afterBackticks === "") {
        // Currently inside a fence — only a bare ``` line closes it.
        inFence = false;
      } // else: ```info-string while in fence → stays as content (no toggle)
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    let processed = "";
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === "`") {
        const close = line.indexOf("`", i + 1);
        if (close !== -1) {
          processed += line.slice(i, close + 1);
          i = close + 1;
          continue;
        }
        processed += ch;
        i++;
        continue;
      }
      if (ch === "<" && line[i - 1] !== "\\") {
        processed += "\\<";
        i++;
        continue;
      }
      if (ch === "{") {
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

function emitMdx({ title, sourcePath, sourceHash, body, lang, order }) {
  const scrubbedBody = escapeMdxSpecialChars(stripLeadingH1(body));
  // Trim leading # heading (Fumadocs renders title separately from MDX h1)
  // — keep the H1 in body for the chapter-internal reading.
  const desc = title.length > 140 ? title.slice(0, 137) + "..." : title;
  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify(desc)}`,
    `source_path: ${sourcePath}`,
    `source_hash: ${sourceHash}`,
    `generated_at: '${new Date().toISOString()}'`,
    `generated_by: playbook-import v1.0.0`,
    `category: playbook`,
    `language: ${lang}`,
    `translated: true`,
    `translated_source_hash: ${sourceHash}`,
    `translated_at: '${new Date().toISOString()}'`,
    `translated_by: "Founder source (Vietnamese original, no re-translation)"`,
    `chapter_order: ${order}`,
    "---",
  ].join("\n");
  return [
    frontmatter,
    "",
    `{/* generated-by: playbook-import v1.0.0 */}`,
    "",
    scrubbedBody.trimEnd(),
    "",
  ].join("\n");
}

// Group separators that bracket chapter ranges in the sidebar — must match
// the existing meta.{vi,en}.json shape so we don't fight the file format.
// Each "segment" lists [labelVi, labelEn, predicate(slug)→boolean].
const SIDEBAR_SEGMENTS = [
  ["---Phần I — Nền tảng---", "---Part I — Foundations---", (s) => /^0[1-3]-/.test(s)],
  ["---Phần II — Operations & Trust---", "---Part II — Operations & Trust---", (s) => /^0[4-5]-/.test(s)],
  ["---Phần III — Scaling & Intelligence---", "---Part III — Scaling & Intelligence---", (s) => /^(0[6-9]|10)-/.test(s)],
  ["---Phần IV — Triển khai---", "---Part IV — Implementation---", (s) => /^1[1-3]-/.test(s)],
  ["---Phần V — Phase A.2---", "---Part V — Phase A.2---", (s) => /^(1[4-9]|2\d|3[0-3])-/.test(s)],
  // Match any 2-digit chapter number followed by "-capability-case" (was /^3[4-9]/ which only covered ch34-39 → missed ch40+)
  ["---Phần VI — Capability Case Studies---", "---Part VI — Capability Case Studies---", (s) => /^\d{2}-capability-case/.test(s)],
  ["---Phụ lục---", "---Appendix---", (s) => /^A\d/.test(s)],
];

function buildSidebar(allSlugs, lang) {
  const labelIdx = lang === "vi" ? 0 : 1;
  const pages = [];
  for (const segment of SIDEBAR_SEGMENTS) {
    const [labelVi, labelEn, pred] = segment;
    const label = lang === "vi" ? labelVi : labelEn;
    const matched = allSlugs.filter(pred);
    if (matched.length === 0) continue;
    pages.push(label);
    for (const slug of matched) pages.push(slug);
  }
  return pages;
}

function updateMetaJson(allSlugs) {
  for (const lang of ["vi", "en"]) {
    const metaPath = path.join(DOCS_TARGET, `meta.${lang}.json`);
    if (!fs.existsSync(metaPath)) {
      console.warn(`[playbook-import] ⚠ meta.${lang}.json not found at ${metaPath}; skipping sidebar regen`);
      continue;
    }
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const newPages = buildSidebar(allSlugs, lang);
    const oldJson = JSON.stringify(meta.pages);
    const newJson = JSON.stringify(newPages);
    if (oldJson === newJson) continue;
    meta.pages = newPages;
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");
    console.log(`[playbook-import] updated meta.${lang}.json sidebar (${newPages.length} entries)`);
  }
}

function main() {
  if (!fs.existsSync(DOCS_TARGET)) {
    fs.mkdirSync(DOCS_TARGET, { recursive: true });
  }
  let written = 0;
  let skipped = 0;
  const writtenSlugs = [];
  for (let i = 0; i < CHAPTER_ORDER.length; i++) {
    const chapterPath = CHAPTER_ORDER[i];
    const absPath = path.join(PLAYBOOK_ROOT, chapterPath);
    if (!fs.existsSync(absPath)) {
      console.warn(`[playbook-import] ⚠ missing source: ${chapterPath}`);
      continue;
    }
    const raw = fs.readFileSync(absPath, "utf-8");
    const sourceHash = sha256(raw);
    const slug = slugFromChapter(chapterPath);
    const title = titleFromBody(raw);
    const order = i + 1;
    const sourceRel = `.archives/ritsu-handoff-bundle/playbook/chapters/${chapterPath}`;
    writtenSlugs.push(slug);

    for (const lang of ["vi", "en"]) {
      const filename = lang === "vi" ? `${slug}.mdx` : `${slug}.en.mdx`;
      const targetPath = path.join(DOCS_TARGET, filename);
      const mdx = emitMdx({
        title,
        sourcePath: sourceRel,
        sourceHash,
        body: raw,
        lang,
        order,
      });
      // Idempotent skip
      if (fs.existsSync(targetPath)) {
        const existing = fs.readFileSync(targetPath, "utf-8");
        const existingHashMatch = existing.match(/^source_hash:\s*(\S+)/m);
        if (existingHashMatch && existingHashMatch[1] === sourceHash) {
          skipped++;
          continue;
        }
      }
      fs.writeFileSync(targetPath, mdx, "utf-8");
      written++;
    }
  }
  // Regenerate sidebar so chapters never silently drop out of the left nav.
  updateMetaJson(writtenSlugs);
  console.log(
    `[playbook-import] written=${written} skipped=${skipped} (target: ${CHAPTER_ORDER.length * 2} files)`
  );
}

main();
