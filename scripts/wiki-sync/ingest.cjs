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

// v4.2: namespace conflict resolution. Given a desired namespace folder name,
// returns the first available variant under `wiki/`. If `wiki/<desired>/`
// already exists, tries `<desired>-1`, `<desired>-2`, ..., up to MAX_SUFFIX.
// Caller passes the absolute wiki/ root.
const NAMESPACE_MAX_SUFFIX = 100;
function resolveNamespace(wikiRootAbs, desiredName) {
  const slug = kebabCase(desiredName);
  if (!slug) {
    throw new Error('resolveNamespace: empty slug after kebab-case of ' + JSON.stringify(desiredName));
  }
  let candidate = slug;
  let suffix = 0;
  while (fs.existsSync(path.join(wikiRootAbs, candidate))) {
    suffix++;
    if (suffix > NAMESPACE_MAX_SUFFIX) {
      throw new Error(
        `resolveNamespace: too many conflicts for '${slug}' under wiki/ (tried up to ${slug}-${NAMESPACE_MAX_SUFFIX})`,
      );
    }
    candidate = `${slug}-${suffix}`;
  }
  return { namespace: candidate, was_renamed: suffix > 0, original: slug, suffix };
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
    generated_by: 'wiki-sync v4.2 cli-helper',
  };

  // v4.2: namespace prefix becomes the top-level wiki/ folder. opts.pathPrefix
  // is the precomputed prefix (relative to wiki/) that contains the resolved
  // namespace + optional package slug for folder-adapter children:
  //   - Single file ingest: opts.pathPrefix = '<namespace>'
  //     → wiki/<namespace>/source.md
  //   - Folder single-package mode (1 leaf @ depth 0, ns == col_slug):
  //     opts.pathPrefix = '<namespace>/<file-slug>'
  //     → wiki/<namespace>/<file-slug>/source.md  (collapsed; package == namespace)
  //   - Folder multi-package mode (multiple leaves OR leaf deeper than root):
  //     opts.pathPrefix = '<namespace>/<col-slug>/<file-slug>'
  //     → wiki/<namespace>/<col-slug>/<file-slug>/source.md
  // Backward compat (no opts.pathPrefix passed): treat slug as the namespace
  // (matches v4.0/v4.1 single-file behavior — wiki/<slug>/source.md).
  const pathPrefix = opts.pathPrefix
    ? opts.pathPrefix
    : (opts.parentColSlug ? path.join(opts.parentColSlug, slug) : slug);
  const wikiPathRel = path.join('wiki', pathPrefix, 'source.md');
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
// Folder adapter (v4.1 — recursive BFS)
// ----------------------------------------------------------------------------
//
// v4.1 (post 2026-05-18): folder ingestion supports recursive subdirectory
// traversal via breadth-first search, bounded by:
//   - maxDepth (--depth=N, default 3): max tree depth to descend from root.
//     Depth 0 = root folder; depth 1 = direct children; etc. Folders deeper
//     than maxDepth are NOT enumerated.
//   - maxFolderNodes (--max-nodes=N, default 20): hard cap on TOTAL FOLDERS
//     visited during BFS. Files within a visited folder are always ingested
//     (no per-file cap). Stops descent early when the cap is reached;
//     remaining queued folders are reported as 'truncated_folders' but NOT
//     ingested.
//
// Why folders (not files+folders) for the N counter: in source-grouped v4
// layout, each LEAF folder (folder containing files) becomes its own
// wiki/<col-slug>/ package. Counting folders aligns the BFS budget with the
// number of packages produced. Files within a visited folder are always
// processed wholesale so packages aren't half-populated.
//
// Hard ceiling: maxDepth max 10 (sanity), maxFolderNodes max 500. CLI
// rejects values outside these bounds.
// ----------------------------------------------------------------------------

const FOLDER_BFS_MAX_DEPTH_CAP = 10;
const FOLDER_BFS_MAX_NODES_CAP = 500;

function bfsCollectPackages(rootPath, maxDepth, maxFolderNodes) {
  const queue = [{ path: rootPath, depth: 0 }];
  const packages = []; // [{ folderPath, depth, files: [absPath,...] }]
  let foldersVisited = 0;
  const truncatedFolders = []; // folders queued but not visited (BFS budget exhausted)

  while (queue.length > 0) {
    if (foldersVisited >= maxFolderNodes) {
      // Budget exhausted — record remaining queue as truncated, stop.
      for (const item of queue) {
        truncatedFolders.push({
          path: path.relative(rootPath, item.path) || '.',
          depth: item.depth,
        });
      }
      break;
    }

    const { path: current, depth } = queue.shift();
    foldersVisited++;

    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch (e) {
      continue;
    }

    // Filter hidden + .obsidian + .git noise
    const visibleEntries = entries.filter((e) => !e.name.startsWith('.'));

    const files = visibleEntries
      .filter((e) => e.isFile())
      .map((e) => path.join(current, e.name))
      .sort();

    const subdirs = visibleEntries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(current, e.name))
      .sort();

    // Only register a package for folders that actually contain ingestable
    // files (skip purely-structural folders like raw/5-star/ that just hold
    // subdirs).
    const ingestableFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ext === '.md' || ext === '.markdown';
    });

    if (ingestableFiles.length > 0) {
      packages.push({ folderPath: current, depth, files: ingestableFiles });
    }

    // Enqueue subdirs only if would-be depth ≤ maxDepth.
    if (depth + 1 <= maxDepth) {
      for (const sub of subdirs) {
        queue.push({ path: sub, depth: depth + 1 });
      }
    }
  }

  return { packages, foldersVisited, truncatedFolders };
}

function ingestFolder(absPath, opts = {}) {
  const stat = fs.statSync(absPath);
  if (!stat.isDirectory()) {
    return { error: 'input_validation', detail: `${absPath} is not a directory`, exit_code: 1 };
  }

  const maxDepth = Math.min(
    typeof opts.depth === 'number' ? Math.max(0, Math.floor(opts.depth)) : 3,
    FOLDER_BFS_MAX_DEPTH_CAP,
  );
  const maxFolderNodes = Math.min(
    typeof opts.maxNodes === 'number' ? Math.max(1, Math.floor(opts.maxNodes)) : 20,
    FOLDER_BFS_MAX_NODES_CAP,
  );

  const { packages, foldersVisited, truncatedFolders } = bfsCollectPackages(
    absPath,
    maxDepth,
    maxFolderNodes,
  );

  if (packages.length === 0) {
    return {
      error: 'empty_tree',
      detail: 'No markdown files found within the BFS budget (depth ≤ ' + maxDepth + ', folder nodes ≤ ' + maxFolderNodes + ')',
      folders_visited: foldersVisited,
      truncated_folders: truncatedFolders,
      exit_code: 1,
    };
  }

  // v4.2: resolve namespace. Default = slugify(input basename). Auto-suffix
  // -1, -2, … if `wiki/<name>/` already exists. CLI override via --out=<name>.
  const wikiRootAbs = path.join(REPO_ROOT, 'wiki');
  const desiredNamespace = opts.out ? opts.out : path.basename(absPath);
  const namespaceInfo = resolveNamespace(wikiRootAbs, desiredNamespace);
  const namespace = namespaceInfo.namespace;

  // Collapse rule: if BFS produced exactly 1 leaf at depth 0 (i.e. the input
  // root itself with NO subfolders), AND its derived col_slug matches the
  // resolved namespace, treat it as single-package mode → no inner col_slug
  // layer in the output paths. Files land at wiki/<namespace>/<file>/source.md.
  // Otherwise multi-package mode: each package nests at
  // wiki/<namespace>/<col-slug>/<file>/source.md.
  const isSinglePackage =
    packages.length === 1 &&
    packages[0].depth === 0 &&
    kebabCase(path.basename(packages[0].folderPath)) === namespaceInfo.original;

  const packagesOut = [];
  const allChildren = [];
  const allSkipped = [];

  for (const pkg of packages) {
    const colSlug = kebabCase(path.basename(pkg.folderPath));
    const pkgChildren = [];
    const pkgSkipped = [];

    for (const filePath of pkg.files) {
      const fileName = path.basename(filePath);
      const ext = path.extname(fileName).toLowerCase();

      const childRaw = fs.readFileSync(filePath, 'utf8');
      let childFm;
      try {
        ({ frontmatter: childFm } = parseFrontmatter(childRaw));
      } catch (e) {
        pkgSkipped.push({ file: fileName, reason: `parse_error: ${e.message}` });
        continue;
      }
      const childSlugBase = childFm.slug || kebabCase(path.basename(fileName, ext));

      // v4.2 path prefix construction:
      //   single-package mode: <namespace>/<file-slug>
      //   multi-package mode:  <namespace>/<col-slug>/<file-slug>
      const pathPrefix = isSinglePackage
        ? path.join(namespace, childSlugBase)
        : path.join(namespace, colSlug, childSlugBase);

      const childResult = ingestMarkdown(filePath, {
        slugOverride: childSlugBase,
        pathPrefix,
      });
      if (childResult.error) {
        pkgSkipped.push({
          file: fileName,
          reason: childResult.error,
          detail: childResult.detail,
        });
      } else {
        pkgChildren.push({ file: fileName, ...childResult });
      }
    }

    packagesOut.push({
      col_slug: colSlug,
      folder_path: path.relative(REPO_ROOT, pkg.folderPath),
      depth: pkg.depth,
      file_count: pkg.files.length,
      succeeded: pkgChildren.length,
      skipped: pkgSkipped.length,
      wiki_package_root: isSinglePackage
        ? path.join('wiki', namespace)
        : path.join('wiki', namespace, colSlug),
    });
    allChildren.push(...pkgChildren);
    allSkipped.push(...pkgSkipped);
  }

  return {
    adapter: 'folder',
    source_kind: 'folder_collection',
    source_ref: path.relative(REPO_ROOT, absPath),
    namespace: {
      name: namespace,
      requested: namespaceInfo.original,
      was_renamed: namespaceInfo.was_renamed,
      suffix: namespaceInfo.suffix,
      mode: isSinglePackage ? 'single_package' : 'multi_package',
      wiki_root: path.join('wiki', namespace),
    },
    bfs: {
      max_depth: maxDepth,
      max_folder_nodes: maxFolderNodes,
      folders_visited: foldersVisited,
      packages_produced: packagesOut.length,
      truncated_folders: truncatedFolders,
      truncated: truncatedFolders.length > 0,
    },
    packages: packagesOut,
    files_total: allChildren.length + allSkipped.length,
    succeeded_count: allChildren.length,
    skipped_count: allSkipped.length,
    children: allChildren,
    skipped: allSkipped,
  };
}

// ----------------------------------------------------------------------------
// Dispatch
// ----------------------------------------------------------------------------

function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv.includes('--help') || argv.includes('-h')) {
    console.error('Usage: node scripts/wiki-sync/ingest.cjs <path> [flags]');
    console.error('');
    console.error('Flags:');
    console.error('  --slug=<override>      override the auto-derived slug (single-file mode only)');
    console.error('  --out=<name>           (v4.2) namespace output folder name (child of wiki/).');
    console.error('                         Default: slugify(basename(input)). Auto-suffix -1, -2, …');
    console.error('                         if wiki/<name>/ already exists.');
    console.error('  --depth=<N>            (folder mode) max BFS depth, default 3, hard cap 10');
    console.error('  --max-nodes=<N>        (folder mode) max folder nodes visited via BFS,');
    console.error('                         default 20, hard cap 500. Files within a visited');
    console.error('                         folder are ingested wholesale.');
    console.error('');
    console.error('CLI helper for SOP-INGEST-001 file-side steps. Supports markdown adapter');
    console.error('(single file) + folder adapter (recursive BFS since v4.1, namespace output');
    console.error('since v4.2). Outputs JSON to stdout. Does NOT write to DB (caller handles).');
    console.error('Capability: wiki-sync-from-refs v4.2.0 (namespace output folder).');
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const input = argv[0];
  const slugMatch = argv.find((a) => a.startsWith('--slug='));
  const slugOverride = slugMatch ? slugMatch.split('=')[1] : undefined;

  const outMatch = argv.find((a) => a.startsWith('--out='));
  const outOpt = outMatch ? outMatch.split('=')[1] : undefined;

  const depthMatch = argv.find((a) => a.startsWith('--depth='));
  const depthOpt = depthMatch ? parseInt(depthMatch.split('=')[1], 10) : undefined;

  const maxNodesMatch = argv.find((a) => a.startsWith('--max-nodes='));
  const maxNodesOpt = maxNodesMatch ? parseInt(maxNodesMatch.split('=')[1], 10) : undefined;

  const absPath = path.isAbsolute(input) ? input : path.resolve(process.cwd(), input);

  if (!fs.existsSync(absPath)) {
    console.error(JSON.stringify({ error: 'file_not_found', detail: absPath }));
    process.exit(2);
  }

  const stat = fs.statSync(absPath);
  let result;

  if (stat.isDirectory()) {
    result = ingestFolder(absPath, {
      slugOverride,
      out: outOpt,
      depth: depthOpt,
      maxNodes: maxNodesOpt,
    });
  } else {
    const ext = path.extname(absPath).toLowerCase();
    if (ext === '.md' || ext === '.markdown') {
      // v4.2: single-file ingest also respects --out for namespace.
      // Default namespace = the file's own slug (matches v4.0/v4.1 behavior).
      const wikiRootAbs = path.join(REPO_ROOT, 'wiki');
      const fileSlug = slugOverride
        || kebabCase(path.basename(absPath, ext));
      const desiredNs = outOpt || fileSlug;
      const nsInfo = resolveNamespace(wikiRootAbs, desiredNs);
      result = ingestMarkdown(absPath, {
        slugOverride: fileSlug,
        pathPrefix: nsInfo.namespace,
      });
      // Attach namespace info to result for caller visibility (matches folder mode shape)
      if (result && !result.error) {
        result.namespace = {
          name: nsInfo.namespace,
          requested: nsInfo.original,
          was_renamed: nsInfo.was_renamed,
          suffix: nsInfo.suffix,
          mode: 'single_file',
          wiki_root: path.join('wiki', nsInfo.namespace),
        };
      }
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
