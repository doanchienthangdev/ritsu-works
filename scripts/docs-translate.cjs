#!/usr/bin/env node
/**
 * scripts/docs-translate.cjs — docs-engine v1.1 translation pass.
 *
 * Reads `.en.mdx` files under docs/content/docs/, calls Claude Haiku to
 * translate body content to Vietnamese, writes `.vi.mdx` with translated
 * body + `translated: true` frontmatter.
 *
 * Idempotent via source_hash check: if `.vi.mdx` has `translated: true` AND
 * its `source_hash` matches current `.en.mdx`'s `source_hash`, skip.
 *
 * Usage:
 *   node scripts/docs-translate.cjs [--limit=N] [--dry-run] [--force]
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/docs-translate.cjs
 *
 * Flags:
 *   --limit=N    process only first N pages (useful for testing/partial runs)
 *   --dry-run    don't write files, just report what would be translated
 *   --force      re-translate even if cached translation is current
 *   --area=<a>   restrict to one category (skills/agents/hooks/commands/charter/governance/pillars/sops/knowledge)
 *
 * Exit codes:
 *   0  success
 *   1  translation failure or API error
 *   2  setup error (missing API key, missing deps)
 */

"use strict";

const fs = require("fs");
const path = require("path");

let yaml;
try {
  yaml = require("js-yaml");
} catch (_e) {
  console.error("[docs-translate] Missing js-yaml. Run: pnpm add -D js-yaml");
  process.exit(2);
}

const REPO_ROOT = path.resolve(__dirname, "..");
const DOCS_CONTENT = path.join(REPO_ROOT, "docs", "content", "docs");
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_TRANSLATE_MODEL || "claude-haiku-4-5-20251001";
const TRANSLATOR_VERSION = "docs-translate v1.1.0";

if (!ANTHROPIC_API_KEY) {
  console.error("[docs-translate] ANTHROPIC_API_KEY env var required");
  console.error("Hint: export ANTHROPIC_API_KEY=$(grep ANTHROPIC_API_KEY runtime/secrets/.env.local | cut -d= -f2)");
  process.exit(2);
}

// === Helpers ===

function parseFrontmatter(text) {
  if (!text.startsWith("---\n")) return { frontmatter: null, body: text, fmRaw: "" };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: null, body: text, fmRaw: "" };
  const fmRaw = text.slice(4, end);
  const body = text.slice(end + 5);
  let frontmatter = null;
  try {
    frontmatter = yaml.load(fmRaw);
  } catch (_e) {
    /* ignore */
  }
  return { frontmatter, body, fmRaw };
}

function* walkMdx(dir, suffix = ".en.mdx") {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMdx(full, suffix);
    } else if (entry.isFile() && entry.name.endsWith(suffix)) {
      yield full;
    }
  }
}

const TRANSLATION_SYSTEM_PROMPT = `You are translating internal operating documentation for a Vietnamese AI startup (Ritsu Works — building an AI tutor product). Translate the provided English Markdown content into natural, professional Vietnamese.

Rules:
1. PRESERVE all Markdown syntax exactly: headings (#, ##), lists (-, *), code blocks (\`\`\`...\`\`\`), inline code (\`...\`), links [text](url), tables, blockquotes, escaped chars (\\<, \\{).
2. PRESERVE all code identifiers, file paths, command names, API names, variable names in English (e.g. \`/cla propose\`, \`docs-engine/sync\`, \`ops.capability_runs\`, \`fumadocs-mdx\`).
3. PRESERVE YAML frontmatter delimiters and the literal JSX comment {/* generated-by: ... */} on its line — but you do NOT need to translate inside that comment.
4. Translate ONLY the prose: section text, table cell text, list item text, descriptions.
5. Keep proper nouns + technical terms (Markdown, MDX, Vercel, Fumadocs, Next.js, Vietnamese, Tier 1) as-is.
6. Vietnamese style: professional + technical (industry standard). Use "bạn" for second person, not "anh/chị". Mix Vietnamese with English technical terms naturally (operators do this in practice).
7. Do NOT add new content, comments, or notes. Output ONLY the translated Markdown.
8. Do NOT wrap output in code fences. Return raw Markdown content directly.`;

async function translate(body, signal) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8192,
      system: TRANSLATION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Translate the following English Markdown content to Vietnamese, following the rules in the system prompt. Output ONLY the translated Markdown.\n\n---\n\n${body}`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  const content = data.content?.[0]?.text;
  if (!content) throw new Error("Anthropic API: no text in response");
  return content;
}

function dumpFrontmatter(fm) {
  return yaml.dump(fm, { lineWidth: 100 }).trimEnd();
}

// === Main ===

async function main() {
  const argv = process.argv.slice(2);
  const limitArg = argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const limit = limitArg ? parseInt(limitArg, 10) : Infinity;
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");
  const area = argv.find((a) => a.startsWith("--area="))?.split("=")[1];

  console.log(`[docs-translate] model=${MODEL} limit=${limit} dry-run=${dryRun} force=${force} area=${area || "all"}`);

  let scanDir = DOCS_CONTENT;
  if (area) {
    scanDir = path.join(DOCS_CONTENT, area);
    if (!fs.existsSync(scanDir)) {
      console.error(`[docs-translate] area dir not found: ${scanDir}`);
      process.exit(2);
    }
  }

  const enFiles = Array.from(walkMdx(scanDir, ".en.mdx"));
  console.log(`[docs-translate] found ${enFiles.length} .en.mdx pages`);

  let translated = 0;
  let skipped = 0;
  let errors = 0;
  let totalInputChars = 0;
  let totalOutputChars = 0;
  const startTime = Date.now();

  for (const enFile of enFiles) {
    if (translated >= limit) break;

    // v1.2 layout fix: VI default lives at `<slug>.mdx` (not `<slug>.vi.mdx`).
    // Per scripts/docs-sync.cjs v1.1 layout: "default lang (vi) uses <slug>.mdx
    // so no legacy cleanup needed. Note: walker no longer writes <slug>.vi.mdx
    // — VI content lives in <slug>.mdx".
    // docs-translate v1.1 wrote `.vi.mdx`; v1.2 fix writes `.mdx` directly.
    const viFile = enFile.replace(/\.en\.mdx$/, ".mdx");
    const enRaw = fs.readFileSync(enFile, "utf8");
    const enParsed = parseFrontmatter(enRaw);
    if (!enParsed.frontmatter) {
      console.warn(`[docs-translate] ⚠ no frontmatter in ${path.relative(REPO_ROOT, enFile)}; skipping`);
      skipped++;
      continue;
    }

    const enHash = enParsed.frontmatter.source_hash;

    // Idempotency check: if .vi.mdx has translated:true + matching source_hash → skip
    if (fs.existsSync(viFile) && !force) {
      const viRaw = fs.readFileSync(viFile, "utf8");
      const viParsed = parseFrontmatter(viRaw);
      if (
        viParsed.frontmatter &&
        viParsed.frontmatter.translated === true &&
        viParsed.frontmatter.source_hash === enHash
      ) {
        skipped++;
        continue;
      }
    }

    const rel = path.relative(REPO_ROOT, enFile);
    process.stdout.write(`[docs-translate] [${translated + 1}/${Math.min(enFiles.length, limit)}] ${rel} … `);

    try {
      totalInputChars += enParsed.body.length;
      const translatedBody = await translate(enParsed.body);
      totalOutputChars += translatedBody.length;

      if (dryRun) {
        console.log(`DRY (${enParsed.body.length} → ${translatedBody.length} chars)`);
        translated++;
        continue;
      }

      // Write .vi.mdx with translated frontmatter
      // v1.2: also set translated_source_hash = source_hash + clear needs_retranslation
      const newFm = {
        ...enParsed.frontmatter,
        language: "vi",
        translated: true,
        translated_at: new Date().toISOString(),
        translated_by: TRANSLATOR_VERSION,
        translation_model: MODEL,
        translated_source_hash: enHash,
      };
      // Remove the stale flag if it was set
      delete newFm.needs_retranslation;
      const out = ["---", dumpFrontmatter(newFm), "---", "", translatedBody.trimEnd(), ""].join("\n");
      fs.writeFileSync(viFile, out, "utf8");
      translated++;
      console.log("OK");
    } catch (e) {
      console.error(`✗ ${e.message}`);
      errors++;
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("");
  console.log(`[docs-translate] summary: translated=${translated} skipped=${skipped} errors=${errors}`);
  console.log(`[docs-translate] elapsed=${elapsed}s | input=${totalInputChars} chars | output=${totalOutputChars} chars`);
  // Rough cost estimate (Haiku pricing as of 2026-05; verify per current model card)
  const inputTokens = Math.ceil(totalInputChars / 4);
  const outputTokens = Math.ceil(totalOutputChars / 4);
  const cost = (inputTokens / 1_000_000) * 0.8 + (outputTokens / 1_000_000) * 4;
  console.log(`[docs-translate] estimated cost: ~$${cost.toFixed(3)} (input ~${inputTokens} tok @ $0.80/M + output ~${outputTokens} tok @ $4/M)`);

  process.exit(errors > 0 && translated === 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(`[docs-translate] fatal: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
