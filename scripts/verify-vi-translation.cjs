#!/usr/bin/env node
/**
 * Verify Vietnamese translation completeness + freshness per VI .mdx file.
 *
 * Two checks combined into one verifier (v1.2+):
 *
 * 1. COVERAGE — VI-diacritic ratio in non-code prose. Below threshold ⇒
 *    "needs initial translation" (body still mostly English).
 *
 * 2. FRESHNESS — translated_source_hash field (set by translator) vs current
 *    source_hash (set by walker). Mismatch ⇒ "stale" — source changed since
 *    last translation; needs re-translation.
 *
 * Threshold default: 0.03 (3% — natural-Vietnamese prose typically 6-12%).
 * Empty-body files (<50 prose alphas) are skipped — no prose to translate.
 *
 * Usage:
 *   node scripts/verify-vi-translation.cjs                       # summary
 *   node scripts/verify-vi-translation.cjs --list-untranslated   # coverage gap only
 *   node scripts/verify-vi-translation.cjs --list-stale          # freshness gap only
 *   node scripts/verify-vi-translation.cjs --list-needs-translation  # union (stale + untranslated)
 *   node scripts/verify-vi-translation.cjs --json                # full machine-readable
 *   node scripts/verify-vi-translation.cjs --threshold=0.05      # custom threshold
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
const LIST_STALE = process.argv.includes("--list-stale");
const LIST_NEEDS = process.argv.includes("--list-needs-translation");
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
  if (lines[0] !== "---") return { fm: "", body: content, fmFields: {} };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { fm: "", body: content, fmFields: {} };
  const fm = lines.slice(0, end + 1).join("\n");
  const body = lines.slice(end + 1).join("\n");
  // Minimal YAML parse — fields we care about are scalars on their own line:
  // source_hash, translated, translated_source_hash, needs_retranslation, translated_at
  const fmFields = {};
  for (const ln of lines.slice(1, end)) {
    const m = ln.match(/^([a-z_]+):\s*(.+)$/);
    if (m) {
      let v = m[2].trim();
      if (v === "true") v = true;
      else if (v === "false") v = false;
      // strip quotes
      else if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      )
        v = v.slice(1, -1);
      fmFields[m[1]] = v;
    }
  }
  return { fm, body, fmFields };
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
    const { body, fmFields } = splitFrontmatter(content);
    const prose = stripCodeAndTags(body);
    const { viCount, alphaCount, ratio } = viRatio(prose);
    const sourceHash = fmFields.source_hash || null;
    const translatedHash = fmFields.translated_source_hash || null;
    const isTranslated = fmFields.translated === true;
    const needsRetranslation = fmFields.needs_retranslation === true;
    const stale =
      isTranslated &&
      sourceHash &&
      translatedHash &&
      translatedHash !== sourceHash;
    results.push({
      path: path.relative(process.cwd(), f),
      category: categoryOf(f),
      bodyChars: body.length,
      proseAlphas: alphaCount,
      viChars: viCount,
      ratio,
      sourceHash,
      translatedSourceHash: translatedHash,
      translated: isTranslated,
      needs_retranslation: needsRetranslation,
      stale: stale || needsRetranslation,
      needs:
        ratio !== null && alphaCount > 50 && ratio < THRESHOLD,
    });
  }

  const untranslated = results.filter((r) => r.needs);
  const stale = results.filter((r) => r.stale && !r.needs);
  const needsAny = results.filter((r) => r.needs || r.stale);
  const translated = results.filter(
    (r) =>
      r.ratio !== null &&
      r.proseAlphas > 50 &&
      r.ratio >= THRESHOLD &&
      !r.stale
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

  if (LIST_STALE) {
    stale.forEach((r) =>
      console.log(
        `STALE  src=${(r.sourceHash || "").slice(0, 8)}  tr=${(r.translatedSourceHash || "").slice(0, 8)}  ${r.path}`
      )
    );
    return;
  }

  if (LIST_NEEDS) {
    needsAny.forEach((r) => {
      const kind = r.needs ? "UNTRANSLATED" : "STALE";
      console.log(`${kind.padEnd(13)}  ${r.path}`);
    });
    return;
  }

  // Summary
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) {
      byCategory[r.category] = {
        total: 0,
        translated: 0,
        untranslated: 0,
        stale: 0,
        skipped: 0,
      };
    }
    const b = byCategory[r.category];
    b.total++;
    if (r.needs) b.untranslated++;
    else if (r.ratio === null || r.proseAlphas <= 50) b.skipped++;
    else if (r.stale) b.stale++;
    else b.translated++;
  }

  console.log(`Verification (threshold: VI-diacritic ratio >= ${THRESHOLD})`);
  console.log("");
  console.log(
    "Category".padEnd(15) +
      "Total".padStart(7) +
      "Fresh".padStart(7) +
      "Stale".padStart(7) +
      "Untrans".padStart(9) +
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
        String(b.translated).padStart(7) +
        String(b.stale).padStart(7) +
        String(b.untranslated).padStart(9) +
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
      String(translated.length).padStart(7) +
      String(stale.length).padStart(7) +
      String(untranslated.length).padStart(9) +
      String(skipped.length).padStart(9) +
      "  " +
      overall.toFixed(1) +
      "%"
  );

  if (untranslated.length > 0 || stale.length > 0) {
    console.log("");
    if (untranslated.length > 0) {
      console.log(`${untranslated.length} files UNTRANSLATED. Sample:`);
      untranslated.slice(0, 5).forEach((r) =>
        console.log(`  ${r.ratio.toFixed(3)}  ${r.path}`)
      );
    }
    if (stale.length > 0) {
      console.log(
        `${stale.length} files STALE (source changed after translation). Sample:`
      );
      stale.slice(0, 5).forEach((r) =>
        console.log(
          `  src=${(r.sourceHash || "").slice(0, 8)} tr=${(r.translatedSourceHash || "").slice(0, 8)}  ${r.path}`
        )
      );
    }
    process.exit(1);
  }
}

main();
