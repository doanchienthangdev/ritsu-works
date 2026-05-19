#!/usr/bin/env node
/**
 * Verify Vietnamese translation completeness per VI .mdx file.
 *
 * Per-file metric: ratio of Vietnamese-diacritic letters to total alphabetic
 * letters in PROSE (excluding code fences ``` ```, inline `code`, JSX/HTML
 * tags, and frontmatter). Files with ratio below threshold are flagged as
 * "needs translation".
 *
 * Threshold default: 0.03 (3% — natural-Vietnamese prose typically 6-12%).
 * Empty-body files are skipped (no prose to translate).
 *
 * Usage:
 *   node scripts/verify-vi-translation.cjs                    # summary
 *   node scripts/verify-vi-translation.cjs --list-untranslated  # list paths
 *   node scripts/verify-vi-translation.cjs --json              # JSON output
 *   node scripts/verify-vi-translation.cjs --threshold=0.05    # custom
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "docs", "content", "docs");
const THRESHOLD = parseFloat(
  (process.argv.find((a) => a.startsWith("--threshold=")) || "=0.03").split(
    "="
  )[1]
);
const LIST_MODE = process.argv.includes("--list-untranslated");
const JSON_MODE = process.argv.includes("--json");

const VI_DIACRITICS = new Set(
  "àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴĐ".split(
    ""
  )
);

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

function splitFrontmatter(content) {
  const lines = content.split("\n");
  if (lines[0] !== "---") return { fm: "", body: content };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { fm: "", body: content };
  return {
    fm: lines.slice(0, end + 1).join("\n"),
    body: lines.slice(end + 1).join("\n"),
  };
}

function stripCodeAndTags(body) {
  let out = body;
  out = out.replace(/```[\s\S]*?```/g, ""); // fenced code
  out = out.replace(/`[^`\n]+`/g, ""); // inline code
  out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, ""); // JSX comments
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, ""); // HTML/JSX tags
  out = out.replace(/\\</g, ""); // escaped <
  out = out.replace(/\\\{/g, ""); // escaped {
  return out;
}

function viRatio(prose) {
  let viCount = 0;
  let alphaCount = 0;
  for (const ch of prose) {
    if (VI_DIACRITICS.has(ch)) {
      viCount++;
      alphaCount++;
    } else if (/[a-zA-Z]/.test(ch)) {
      alphaCount++;
    }
  }
  return { viCount, alphaCount, ratio: alphaCount === 0 ? null : viCount / alphaCount };
}

function categoryOf(p) {
  const rel = path.relative(ROOT, p);
  return rel.split(path.sep)[0] || "(root)";
}

function main() {
  const files = listMdxFiles(ROOT);
  const results = [];
  for (const f of files) {
    const content = fs.readFileSync(f, "utf-8");
    const { body } = splitFrontmatter(content);
    const prose = stripCodeAndTags(body);
    const { viCount, alphaCount, ratio } = viRatio(prose);
    results.push({
      path: path.relative(process.cwd(), f),
      category: categoryOf(f),
      bodyChars: body.length,
      proseAlphas: alphaCount,
      viChars: viCount,
      ratio,
      needs:
        ratio !== null && alphaCount > 50 && ratio < THRESHOLD,
    });
  }

  const untranslated = results.filter((r) => r.needs);
  const translated = results.filter(
    (r) => r.ratio !== null && r.proseAlphas > 50 && r.ratio >= THRESHOLD
  );
  const skipped = results.filter(
    (r) => r.ratio === null || r.proseAlphas <= 50
  );

  if (JSON_MODE) {
    console.log(JSON.stringify({ threshold: THRESHOLD, results }, null, 2));
    return;
  }

  if (LIST_MODE) {
    untranslated.forEach((r) =>
      console.log(`${r.ratio.toFixed(3)}  ${r.path}`)
    );
    return;
  }

  // Summary
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = { total: 0, translated: 0, untranslated: 0, skipped: 0 };
    }
    const b = byCategory[r.category];
    b.total++;
    if (r.needs) b.untranslated++;
    else if (r.ratio === null || r.proseAlphas <= 50) b.skipped++;
    else b.translated++;
  }

  console.log(`Verification (threshold: VI-diacritic ratio >= ${THRESHOLD})`);
  console.log("");
  console.log(
    "Category".padEnd(15) +
      "Total".padStart(7) +
      "Translated".padStart(12) +
      "Untranslated".padStart(14) +
      "Skipped".padStart(9) +
      "  %Done"
  );
  console.log("-".repeat(65));
  for (const cat of Object.keys(byCategory).sort()) {
    const b = byCategory[cat];
    const denom = b.total - b.skipped;
    const pct = denom === 0 ? 100 : (100 * b.translated) / denom;
    console.log(
      cat.padEnd(15) +
        String(b.total).padStart(7) +
        String(b.translated).padStart(12) +
        String(b.untranslated).padStart(14) +
        String(b.skipped).padStart(9) +
        "  " +
        pct.toFixed(1) +
        "%"
    );
  }
  console.log("-".repeat(65));
  const totalDenom = results.length - skipped.length;
  const overall =
    totalDenom === 0 ? 100 : (100 * translated.length) / totalDenom;
  console.log(
    "OVERALL".padEnd(15) +
      String(results.length).padStart(7) +
      String(translated.length).padStart(12) +
      String(untranslated.length).padStart(14) +
      String(skipped.length).padStart(9) +
      "  " +
      overall.toFixed(1) +
      "%"
  );

  if (untranslated.length > 0) {
    console.log("");
    console.log(`${untranslated.length} files need translation. Sample:`);
    untranslated.slice(0, 10).forEach((r) =>
      console.log(`  ${r.ratio.toFixed(3)}  ${r.path}`)
    );
    process.exit(1);
  }
}

main();
