#!/usr/bin/env node
// scripts/wiki-sync/ingest.cjs — Sprint 2 PR3 v0.1 CLI helper
//
// Per Tier C decision ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]
// (Hybrid B/A, G6 disposition): deterministic file-side steps of the SOP-INGEST-001
// pipeline, invokable from subagents, cron, or hooks without a Claude Code session.
//
// v0.1 scope (intentionally minimal):
//   - Markdown adapter only (the path exercised by today's acceptance test)
//   - Folder adapter (iterates + recurses into markdown children)
//   - Returns file-side artifacts as JSON to stdout
//   - Does NOT write to DB (caller handles ops.ingestion_jobs / knowledge_pages
//     INSERT via supabase-ops MCP shim or supabase CLI). Reason: avoids new
//     deps on @supabase/supabase-js + secrets handling in the CLI itself.
//
// Future versions will:
//   - v0.2: handle pdf/url/youtube/meeting adapters (each via shell-out to
//           the existing pymupdf/yt-dlp tooling per per-adapter SKILL.md)
//   - v0.3: optionally write DB rows directly when SUPABASE_OPS_SERVICE_KEY
//           is present + flag `--write-db` is passed
//   - v0.4: regex-only link extraction (Bài #14 patterns) — currently
//           returns the chunk-text-with-link-candidates for caller to extract
//
// Output contract: JSON object on stdout matching SOP-INGEST-001 Step 2+8 fields:
//   {
//     "adapter": "markdown" | "folder",
//     "source_ref": "<abspath>",
//     "source_hash": "<sha256>",
//     "wiki_path": "<relative-to-repo-root>",
//     "file_hash": "<sha256-of-output-wiki-file>",
//     "frontmatter": {<merged frontmatter>},
//     "raw_text": "<extracted body for link extraction by caller>",
//     "children": [...]  // only for folder adapter
//   }
//
// Exit codes:
//   0  — success
//   1  — input validation error (bad path, unsupported adapter)
//   2  — file IO error (missing file, write permission)
//   3  — parse error (malformed frontmatter)

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let yaml;
try {
  yaml = require('js-yaml');
} catch (e) {
  console.error('FATAL: js-yaml not installed. Run: pnpm install');
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const WIKI_DIR = path.join(REPO_ROOT, 'wiki');

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function nowIsoUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function kebabCase(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function parseFrontmatter(text) {
  // Match leading --- ... --- YAML block
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    return { frontmatter: {}, body: text };
  }
  try {
    const fm = yaml.load(match[1]) || {};
    if (typeof fm !== 'object' || Array.isArray(fm)) {
      throw new Error(`frontmatter must be a YAML mapping, got ${typeof fm}`);
    }
    return { frontmatter: fm, body: text.slice(match[0].length) };
  } catch (e) {
    throw new Error(`malformed frontmatter: ${e.message}`);
  }
}

function makeFrontmatter(fm) {
  // Emit deterministic key order for diffability
  const keyOrder = [
    'type', 'slug', 'title', 'author', 'created',
    'source_kind', 'source_ref', 'source_hash',
    'parent_book', 'chapter_index',
    'ingested_at', 'generated_by',
  ];
  const orderedEntries = [];
  for (const k of keyOrder) {
    if (k in fm) orderedEntries.push([k, fm[k]]);
  }
  // Append any extra keys not in canonical order
  for (const [k, v] of Object.entries(fm)) {
    if (!keyOrder.includes(k)) orderedEntries.push([k, v]);
  }
  const yamlBody = yaml.dump(Object.fromEntries(orderedEntries), {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
  });
  return `---\n${yamlBody}---\n\n<!-- generated-by: wiki-sync v2.0 cli-helper -->\n\n`;
}

// ----------------------------------------------------------------------------
// Markdown adapter (v0.1)
// ----------------------------------------------------------------------------

function ingestMarkdown(absPath, opts = {}) {
  const raw = fs.readFileSync(absPath);
  const sourceHash = sha256(raw);
  const text = raw.toString('utf8');

  let frontmatter, body;
  try {
    ({ frontmatter, body } = parseFrontmatter(text));
  } catch (e) {
    return { error: 'parse_error', detail: e.message, exit_code: 3 };
  }

  const type = frontmatter.type || 'concept';
  const slug = opts.slugOverride || frontmatter.slug || kebabCase(path.basename(absPath, path.extname(absPath)));
  const title = frontmatter.title || slug.replace(/-/g, ' ').replace(/(^|\s)\w/g, (s) => s.toUpperCase());

  const sourceRefRel = path.relative(REPO_ROOT, absPath);
  const ingestedAt = nowIsoUtc();

  const outputFrontmatter = {
    ...frontmatter,
    type,
    slug,
    title,
    source_kind: 'markdown_passthrough',
    source_ref: sourceRefRel,
    source_hash: sourceHash,
    ingested_at: ingestedAt,
    generated_by: 'wiki-sync v4.0 cli-helper',
  };

  // v4.0 source-grouped layout: every ingested markdown file becomes a source
  // RECORD at wiki/<source-slug>/source.md (or, when nested under a folder
  // adapter, at wiki/<parent-col-slug>/<child-slug>/source.md). The
  // frontmatter `type` is captured but does NOT control the folder anymore
  // (distill, NOT ingest, creates derived entity pages under
  // wiki/<source-slug>/<page_type>s/).
  const sourceSlug = opts.parentColSlug
    ? path.join(opts.parentColSlug, slug)
    : slug;
  const wikiPathRel = path.join('wiki', sourceSlug, 'source.md');
  const wikiPathAbs = path.join(REPO_ROOT, wikiPathRel);

  fs.mkdirSync(path.dirname(wikiPathAbs), { recursive: true });
  const wikiContent = makeFrontmatter(outputFrontmatter) + body.replace(/^\n+/, '');
  fs.writeFileSync(wikiPathAbs, wikiContent, 'utf8');

  const fileHash = sha256(Buffer.from(wikiContent, 'utf8'));

  return {
    adapter: 'markdown',
    source_kind: 'markdown_passthrough',
    source_ref: sourceRefRel,
    source_hash: sourceHash,
    wiki_path: wikiPathRel,
    file_hash: fileHash,
    frontmatter: outputFrontmatter,
    raw_text: body,
    page_type: type,
    slug,
    title,
    bytes_written: Buffer.byteLength(wikiContent, 'utf8'),
  };
}

// ----------------------------------------------------------------------------
// Folder adapter (v0.1)
// ----------------------------------------------------------------------------

function ingestFolder(absPath, opts = {}) {
  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    return { error: 'input_validation', detail: `${absPath} is not a directory`, exit_code: 1 };
  }

  const entries = fs.readdirSync(absPath, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.')); // skip hidden

  const subdirs = entries.filter((e) => e.isDirectory());
  if (subdirs.length > 0) {
    return {
      error: 'recursive_refused',
      detail: `Recursive folder ingestion deferred to v2.1. Subdirectories found: ${subdirs.map((d) => d.name).join(', ')}`,
      workaround: 'Flatten the input OR run /wiki sync per subdirectory.',
      exit_code: 1,
    };
  }

  const files = entries.filter((e) => e.isFile());
  if (files.length === 0) {
    return { error: 'empty_collection', detail: 'No supported files found', exit_code: 1 };
  }

  files.sort((a, b) => a.name.localeCompare(b.name));

  const colSlug = kebabCase(path.basename(absPath));
  const children = [];
  const skipped = [];

  for (const f of files) {
    const childAbs = path.join(absPath, f.name);
    const ext = path.extname(f.name).toLowerCase();

    if (ext === '.md' || ext === '.markdown') {
      // Compute combined slug
      const childRaw = fs.readFileSync(childAbs, 'utf8');
      let childFm;
      try {
        ({ frontmatter: childFm } = parseFrontmatter(childRaw));
      } catch (e) {
        skipped.push({ file: f.name, reason: `parse_error: ${e.message}` });
        continue;
      }
      const childSlugBase = childFm.slug || kebabCase(path.basename(f.name, ext));

      // v4.0 source-grouped folder layout: children land at
      // wiki/<colSlug>/<childSlug>/source.md (NOT wiki/<colSlug>__<childSlug>.md).
      // The slugOverride passes the child slug; parentColSlug nests under the
      // collection. Composite UNIQUE (extracted_from_source_id, slug) makes
      // same-slug children across different collections legitimate.
      const childResult = ingestMarkdown(childAbs, {
        slugOverride: childSlugBase,
        parentColSlug: colSlug,
      });
      if (childResult.error) {
        skipped.push({ file: f.name, reason: childResult.error, detail: childResult.detail });
      } else {
        children.push({ file: f.name, ...childResult });
      }
    } else {
      skipped.push({ file: f.name, reason: `unsupported_extension: ${ext} (v0.1 CLI supports markdown only)` });
    }
  }

  return {
    adapter: 'folder',
    source_kind: 'folder_collection',
    source_ref: path.relative(REPO_ROOT, absPath),
    col_slug: colSlug,
    files_total: files.length,
    succeeded_count: children.length,
    skipped_count: skipped.length,
    children,
    skipped,
  };
}

// ----------------------------------------------------------------------------
// Dispatch
// ----------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.error('Usage: node scripts/wiki-sync/ingest.cjs <path> [--slug=<override>]');
    console.error('');
    console.error('v0.1 CLI helper (Sprint 2 PR3): markdown + folder adapters only.');
    console.error('Outputs JSON to stdout. Does NOT write to DB (caller handles).');
    console.error('Capability: wiki-sync-from-refs v2.0.0 (G6 hybrid runner disposition).');
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const input = argv[0];
  const slugMatch = argv.find((a) => a.startsWith('--slug='));
  const slugOverride = slugMatch ? slugMatch.split('=')[1] : undefined;

  const absPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);

  if (!fs.existsSync(absPath)) {
    console.error(JSON.stringify({ error: 'file_not_found', detail: absPath }));
    process.exit(2);
  }

  const stat = fs.statSync(absPath);
  let result;

  if (stat.isDirectory()) {
    result = ingestFolder(absPath, { slugOverride });
  } else {
    const ext = path.extname(absPath).toLowerCase();
    if (ext === '.md' || ext === '.markdown') {
      result = ingestMarkdown(absPath, { slugOverride });
    } else {
      result = {
        error: 'unsupported_adapter',
        detail: `Extension '${ext}' is not supported in v0.1 CLI (markdown + folder only). For ${ext} files, /wiki sync must walk the SKILL prose with Claude in the loop.`,
        supported_v0_1: ['.md', '.markdown', '/ (folder)'],
        deferred_to_v0_2: ['.pdf', 'http(s)://', 'youtube.com/*', '.vtt', '.srt'],
        exit_code: 1,
      };
    }
  }

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.error ? (result.exit_code || 1) : 0);
}

main();
