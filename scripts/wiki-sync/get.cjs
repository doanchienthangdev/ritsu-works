#!/usr/bin/env node
/**
 * scripts/wiki-sync/get.cjs — `/wiki get` implementation (v4.3, 2026-05-20).
 *
 * Extract content bundle from a wiki/ source-grouped package. Output suitable
 * for stdin/stdout (paste into another command's prompt) OR write to a file
 * via --to=<path>.
 *
 * Source spec grammar (--src=<spec>):
 *   <source-slug>                          → full source: source.md + all chapters + all entities
 *   <source-slug>/chapter-N                → chapter-N + entities where frontmatter source_chapter_index == N
 *   <source-slug>/chapter-NN-<slug>        → specific chapter file (filename basename)
 *   <source-slug>/<type>/<entity-slug>     → one entity page (type ∈ {concepts,observations,decisions,ideas})
 *   <source-slug>/<type>                   → all entities of that type from the source
 *
 * Usage:
 *   node scripts/wiki-sync/get.cjs --src=<spec> [--to=<path>] [--summary] [--include-frontmatter]
 *
 * Flags:
 *   --src=<spec>            REQUIRED
 *   --to=<path>             write to file (idempotent); else print to stdout
 *   --summary               include only entity headers + slug list (no full body)
 *   --include-frontmatter   include YAML frontmatter of each entity (default: stripped)
 *   --max-entities=<N>      cap on entities in bundle (default 100; chapter-spec typically ~10-15)
 *
 * Output: markdown bundle with citation-chain header + chapter + entities,
 * each section delimited by H2/H3 + provenance.
 *
 * HITL: Tier A (read-only). Logs to ops.agent_runs not implemented in this
 * script — the slash command orchestrator wraps it with a logged invocation.
 *
 * Exit codes:
 *   0 — success
 *   1 — src not found / spec parse error
 *   2 — output write error
 */

"use strict";

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const WIKI_ROOT = path.join(REPO_ROOT, "wiki");
const ENTITY_TYPES = ["concepts", "observations", "decisions", "ideas"];

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    const m = a.match(/^--([a-z-]+)(?:=(.+))?$/);
    if (m) args[m[1]] = m[2] === undefined ? true : m[2];
  }
  return args;
}

function dieErr(msg, code = 1) {
  console.error(`[wiki-get] ✗ ${msg}`);
  process.exit(code);
}

function readIfExists(p) {
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf-8");
}

function parseFrontmatter(text) {
  if (!text || !text.startsWith("---\n")) return { fm: {}, body: text || "" };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { fm: {}, body: text };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  const fm = {};
  for (const line of fmRaw.split("\n")) {
    const m = line.match(/^([a-z_]+):\s*(.+)$/);
    if (m) {
      let v = m[2].trim();
      if (v === "true") v = true;
      else if (v === "false") v = false;
      else if (/^\d+$/.test(v)) v = parseInt(v, 10);
      else if (/^[\d.]+$/.test(v)) v = parseFloat(v);
      else if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      fm[m[1]] = v;
    }
  }
  return { fm, body };
}

function listEntityFiles(sourceDir, type) {
  const d = path.join(sourceDir, type);
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(d, f));
}

function listChapters(sourceDir) {
  const d = path.join(sourceDir, "chapters");
  if (!fs.existsSync(d)) return [];
  return fs
    .readdirSync(d)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => path.join(d, f));
}

function chapterMatches(filePath, n) {
  // chapter-04-... → 4; chapter-14-... → 14
  const m = path.basename(filePath).match(/^chapter-0*(\d+)/);
  return m && parseInt(m[1], 10) === n;
}

function entityChapterIndex(filePath) {
  const txt = readIfExists(filePath);
  if (!txt) return null;
  const { fm } = parseFrontmatter(txt);
  return typeof fm.source_chapter_index === "number"
    ? fm.source_chapter_index
    : null;
}

// === Spec resolver ===
// Returns { sourceSlug, scope: 'full'|'chapter'|'type'|'entity'|'chapter-file',
//           chapterIndex?: int, type?: string, entitySlug?: string,
//           chapterFile?: string }
function resolveSpec(spec) {
  const parts = spec.split("/").filter(Boolean);
  if (parts.length === 0) dieErr(`empty --src spec`);
  const sourceSlug = parts[0];
  const sourceDir = path.join(WIKI_ROOT, sourceSlug);
  if (!fs.existsSync(sourceDir))
    dieErr(`source not found: wiki/${sourceSlug}/`);
  if (!fs.existsSync(path.join(sourceDir, "source.md")))
    dieErr(`source.md missing — not a v4.0 source package: wiki/${sourceSlug}/`);

  if (parts.length === 1) {
    return { sourceSlug, sourceDir, scope: "full" };
  }
  // parts.length >= 2
  const second = parts[1];

  // chapter-N (numeric shortcut)
  let m = second.match(/^chapter-0*(\d+)$/);
  if (m) {
    const chapterIndex = parseInt(m[1], 10);
    return { sourceSlug, sourceDir, scope: "chapter", chapterIndex };
  }

  // chapter-NN-<slug>... (full chapter filename)
  if (/^chapter-/.test(second)) {
    const chapterFile = path.join(sourceDir, "chapters", `${second}.md`);
    if (!fs.existsSync(chapterFile))
      dieErr(`chapter file not found: ${path.relative(REPO_ROOT, chapterFile)}`);
    return { sourceSlug, sourceDir, scope: "chapter-file", chapterFile };
  }

  // <type> or <type>/<entity-slug>
  const type = second;
  if (!ENTITY_TYPES.includes(type))
    dieErr(`unknown entity type "${type}"; must be one of: ${ENTITY_TYPES.join(", ")} (or "chapter-N")`);

  if (parts.length === 2) {
    return { sourceSlug, sourceDir, scope: "type", type };
  }
  const entitySlug = parts.slice(2).join("/");
  const entityFile = path.join(sourceDir, type, `${entitySlug}.md`);
  if (!fs.existsSync(entityFile))
    dieErr(`entity not found: ${path.relative(REPO_ROOT, entityFile)}`);
  return {
    sourceSlug,
    sourceDir,
    scope: "entity",
    type,
    entitySlug,
    entityFile,
  };
}

// === Bundle assembler ===
function assembleBundle(spec, options) {
  const { summary, includeFrontmatter, maxEntities } = options;
  const sections = [];

  // Header
  const now = new Date().toISOString();
  const sourceMdPath = path.join(spec.sourceDir, "source.md");
  const { fm: sourceFm } = parseFrontmatter(readIfExists(sourceMdPath));
  const sourceTitle = sourceFm.title || spec.sourceSlug;

  let headerSection = [];
  headerSection.push("<!-- wiki-context-bundle generated by /wiki get v4.3 -->");
  headerSection.push("# Wiki Context Bundle");
  headerSection.push("");
  headerSection.push(`- **Source spec:** \`${spec.specArg}\``);
  headerSection.push(`- **Source title:** ${sourceTitle}`);
  headerSection.push(`- **Source slug:** \`${spec.sourceSlug}\``);
  if (sourceFm.license_status)
    headerSection.push(`- **License:** ${sourceFm.license_status}`);
  if (sourceFm.source_kind)
    headerSection.push(`- **Source kind:** ${sourceFm.source_kind}`);
  headerSection.push(`- **Scope:** ${spec.scope}`);
  headerSection.push(`- **Generated:** ${now}`);
  headerSection.push("");
  sections.push({ kind: "header", header: headerSection });

  // Collect content based on scope
  const chapters = [];
  const entities = [];

  if (spec.scope === "full") {
    // Source + all chapters + all entities
    listChapters(spec.sourceDir).forEach((f) => chapters.push(f));
    for (const t of ENTITY_TYPES) {
      listEntityFiles(spec.sourceDir, t).forEach((f) =>
        entities.push({ type: t, file: f })
      );
    }
  } else if (spec.scope === "chapter") {
    // chapter-N + entities with source_chapter_index === N
    const chFiles = listChapters(spec.sourceDir).filter((f) =>
      chapterMatches(f, spec.chapterIndex)
    );
    if (chFiles.length === 0)
      dieErr(`no chapter file matches chapter-${spec.chapterIndex}`);
    chFiles.forEach((f) => chapters.push(f));
    for (const t of ENTITY_TYPES) {
      for (const f of listEntityFiles(spec.sourceDir, t)) {
        if (entityChapterIndex(f) === spec.chapterIndex) {
          entities.push({ type: t, file: f });
        }
      }
    }
  } else if (spec.scope === "chapter-file") {
    chapters.push(spec.chapterFile);
    // Also pull entities citing that exact chapter (best-effort via chapter filename → index)
    const m = path.basename(spec.chapterFile).match(/^chapter-0*(\d+)/);
    if (m) {
      const chIdx = parseInt(m[1], 10);
      for (const t of ENTITY_TYPES) {
        for (const f of listEntityFiles(spec.sourceDir, t)) {
          if (entityChapterIndex(f) === chIdx) entities.push({ type: t, file: f });
        }
      }
    }
  } else if (spec.scope === "type") {
    listEntityFiles(spec.sourceDir, spec.type).forEach((f) =>
      entities.push({ type: spec.type, file: f })
    );
  } else if (spec.scope === "entity") {
    entities.push({ type: spec.type, file: spec.entityFile });
  }

  // Cap
  const cappedEntities = entities.slice(0, maxEntities);
  const dropped = entities.length - cappedEntities.length;

  // Counts
  const counts = { concepts: 0, observations: 0, decisions: 0, ideas: 0 };
  for (const e of cappedEntities) counts[e.type]++;

  // Inventory
  const invSection = [];
  invSection.push("## Inventory");
  invSection.push("");
  invSection.push(`- **Chapters in bundle:** ${chapters.length}`);
  invSection.push(`- **Entities in bundle:** ${cappedEntities.length}`);
  for (const t of ENTITY_TYPES)
    if (counts[t] > 0)
      invSection.push(`  - ${t}: ${counts[t]}`);
  if (dropped > 0)
    invSection.push(`- ⚠ **Dropped** (exceeded --max-entities=${maxEntities}): ${dropped}`);
  invSection.push("");
  sections.push({ kind: "inventory", header: invSection });

  // Source RECORD (only metadata, no full body since source.md is bibliography)
  if (sourceFm.title || sourceFm.source_kind) {
    const srcSection = [];
    srcSection.push("## Source RECORD");
    srcSection.push("");
    srcSection.push(`**File:** \`wiki/${spec.sourceSlug}/source.md\``);
    srcSection.push("");
    if (Object.keys(sourceFm).length > 0) {
      srcSection.push("Frontmatter:");
      srcSection.push("");
      srcSection.push("```yaml");
      for (const [k, v] of Object.entries(sourceFm)) {
        srcSection.push(`${k}: ${JSON.stringify(v)}`);
      }
      srcSection.push("```");
      srcSection.push("");
    }
    sections.push({ kind: "source", header: srcSection });
  }

  // Chapter sections (full body)
  for (const ch of chapters) {
    const relCh = path.relative(REPO_ROOT, ch);
    const txt = readIfExists(ch) || "";
    const { fm, body } = parseFrontmatter(txt);
    const title = fm.title || path.basename(ch, ".md");
    const cSection = [];
    cSection.push(`## Chapter: ${title}`);
    cSection.push("");
    cSection.push(`**File:** \`${relCh}\``);
    if (fm.source_chapter_index !== undefined)
      cSection.push(`**Chapter index:** ${fm.source_chapter_index}`);
    cSection.push("");
    if (summary) {
      // Just first H2/H3 outline
      const outline = body
        .split("\n")
        .filter((l) => /^#{1,3}\s/.test(l))
        .slice(0, 30)
        .join("\n");
      if (outline) {
        cSection.push("Outline:");
        cSection.push("");
        cSection.push(outline);
        cSection.push("");
      }
    } else {
      cSection.push(body.trim());
      cSection.push("");
    }
    sections.push({ kind: "chapter", header: cSection });
  }

  // Entity sections (full body OR summary)
  for (const e of cappedEntities) {
    const relE = path.relative(REPO_ROOT, e.file);
    const txt = readIfExists(e.file) || "";
    const { fm, body } = parseFrontmatter(txt);
    const title = fm.title || path.basename(e.file, ".md");
    const eSection = [];
    eSection.push(`### ${e.type.replace(/s$/, "").toUpperCase()}: ${title}`);
    eSection.push("");
    eSection.push(`**File:** \`${relE}\``);
    if (fm.source_chapter_index !== undefined)
      eSection.push(`**Chapter:** ${fm.source_chapter_index}${fm.source_chapter_title ? ` — ${fm.source_chapter_title}` : ""}`);
    if (fm.confidence !== undefined)
      eSection.push(`**Confidence:** ${fm.confidence}`);
    if (fm.review_state)
      eSection.push(`**Review state:** ${fm.review_state}`);
    eSection.push("");
    if (summary) {
      // Just first paragraph
      const firstPara = (body.trim().split(/\n\n/)[0] || "").slice(0, 400);
      eSection.push(firstPara);
      eSection.push("");
    } else {
      if (includeFrontmatter) {
        eSection.push("```yaml");
        for (const [k, v] of Object.entries(fm)) {
          eSection.push(`${k}: ${JSON.stringify(v)}`);
        }
        eSection.push("```");
        eSection.push("");
      }
      eSection.push(body.trim());
      eSection.push("");
    }
    sections.push({ kind: "entity", header: eSection });
  }

  // Footer (citation reminder + reuse hint)
  const footer = [];
  footer.push("");
  footer.push("---");
  footer.push("");
  footer.push("## Provenance");
  footer.push("");
  footer.push(
    `Generated by \`/wiki get --src=${spec.specArg}\` at ${now}. Bundle from source-grouped layout v4.0+. Every entity carries citation chain via \`extracted_from\` + \`source_chunk_index\` + \`book_pages\` frontmatter — trace back to original source via \`ops.knowledge_extractions\` table.`
  );
  footer.push("");
  footer.push(
    `Do NOT edit this bundle directly. Edit source files under \`wiki/${spec.sourceSlug}/\` and re-run \`/wiki get\`.`
  );
  footer.push("");
  sections.push({ kind: "footer", header: footer });

  const fullBundle = sections.map((s) => s.header.join("\n")).join("\n");
  return {
    bundle: fullBundle,
    stats: {
      chapters: chapters.length,
      entities: cappedEntities.length,
      dropped,
      counts,
      chars: fullBundle.length,
    },
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.src) {
    console.error(
      "Usage: node scripts/wiki-sync/get.cjs --src=<spec> [--to=<path>] [--summary] [--include-frontmatter] [--max-entities=N]"
    );
    process.exit(1);
  }
  const spec = resolveSpec(args.src);
  spec.specArg = args.src;
  const options = {
    summary: !!args.summary,
    includeFrontmatter: !!args["include-frontmatter"],
    maxEntities: args["max-entities"]
      ? parseInt(args["max-entities"], 10)
      : 100,
  };
  const { bundle, stats } = assembleBundle(spec, options);

  if (args.to) {
    const outPath = path.isAbsolute(args.to)
      ? args.to
      : path.join(REPO_ROOT, args.to);
    try {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, bundle, "utf-8");
      console.log(
        `[wiki-get] ✓ wrote ${path.relative(REPO_ROOT, outPath)} — chapters=${stats.chapters} entities=${stats.entities}${stats.dropped > 0 ? ` (dropped ${stats.dropped})` : ""} chars=${stats.chars}`
      );
    } catch (e) {
      dieErr(`write failed: ${e.message}`, 2);
    }
  } else {
    process.stdout.write(bundle);
    console.error(
      `\n[wiki-get] ✓ stdout — chapters=${stats.chapters} entities=${stats.entities}${stats.dropped > 0 ? ` (dropped ${stats.dropped})` : ""} chars=${stats.chars}`
    );
  }
}

main();
