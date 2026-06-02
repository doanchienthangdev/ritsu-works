#!/usr/bin/env node
// ============================================================================
// scripts/docs/gen-deepask-catalog.cjs — generate the deepask reference catalog
// ============================================================================
// Emits a docs page listing EVERY --format, --style (design-system), and
// --art-style (artistic genre) value, from the live registries — so the founder
// can look them up. Writes BOTH locale files:
//   docs/content/docs/commands/deepask-catalog.mdx     (vi)
//   docs/content/docs/commands/deepask-catalog.en.mdx  (en)
// Data tables (names) are shared; section prose differs per locale.
// Re-run after design-systems.yaml / art-styles.yaml change.
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

const REPO = path.resolve(__dirname, '..', '..');
const OUT_DIR = path.join(REPO, 'docs', 'content', 'docs', 'commands');

// --- FORMATS (from .claude/commands/deepask.md flags table) -----------------
const FORMATS = [
  ['inline', 'DEFAULT', 'Cited answer rendered straight into the conversation — no files.', 'Câu trả lời cited render thẳng vào hội thoại — không tạo file.'],
  ['text', 'doc', 'Flat plain-text of the IR (exec summary + cited claims).', 'Văn bản thuần của IR (tóm tắt + claim cited).'],
  ['article', 'doc', 'Canonical `answer.md` — Pyramid prose, inline `[source-ref]`, conflicts, freshness, gaps.', 'answer.md chuẩn — văn xuôi Pyramid, citation inline, conflict, freshness, gap.'],
  ['pdf', 'doc', 'The article rendered to PDF (WeasyPrint / anthropic-skills:pdf).', 'Bài article render ra PDF.'],
  ['docx', 'doc', 'IR sections/tables → Word.', 'IR sections/tables → Word.'],
  ['pptx', 'doc', 'exec summary → title; each section → a native PowerPoint slide.', 'tóm tắt → title; mỗi section → 1 slide PowerPoint native.'],
  ['xlsx', 'doc', 'IR tables + metric rows → spreadsheet (best for data-heavy answers).', 'IR tables + metric → spreadsheet (cho câu trả lời nặng dữ liệu).'],
  ['mermaid', 'visual', 'IR diagrams → validated/rendered Mermaid diagram(s).', 'IR diagrams → sơ đồ Mermaid đã validate.'],
  ['chart', 'visual', 'IR charts (series-data) → chart image/html.', 'IR charts (series-data) → ảnh/html biểu đồ.'],
  ['dashboard', 'visual', 'Multi-panel HTML dashboard (sections + charts + tables). `--style`/`--art-style` aware.', 'Dashboard HTML nhiều panel. Nhận `--style`/`--art-style`.'],
  ['html', 'visual', 'Standalone styled HTML of the article + visuals. `--style`/`--art-style` aware.', 'HTML standalone có style của article + visual. Nhận `--style`/`--art-style`.'],
  ['interactive', 'visual', 'Interactive HTML (filterable tables, toggles). `--style`/`--art-style` aware.', 'HTML tương tác (bảng lọc được, toggle). Nhận `--style`/`--art-style`.'],
  ['canvas', 'visual', 'Canvas / infographic artifact from the IR. `--style`/`--art-style` aware.', 'Artifact canvas/infographic từ IR. Nhận `--style`/`--art-style`.'],
  ['infographics', 'image', 'ONE poster PNG via gpt-image-2; `--orientation` landscape/portrait. Style + art-style driven.', 'MỘT poster PNG qua gpt-image-2; `--orientation`. Theo style + art-style.'],
  ['img-slide', 'image', 'A 16:9 deck: `slides/NN-*.png` (native 2048×1152) + combined `slides.pdf`. Style + art-style driven.', 'Bộ slide 16:9: `slides/NN-*.png` (2048×1152 native) + `slides.pdf`. Theo style + art-style.'],
  ['smartauto', 'meta', 'Auto-pick the best file format from the question + IR (never picks image formats — they cost $).', 'Tự chọn file format tốt nhất từ câu hỏi + IR (không bao giờ chọn image format — tốn $).'],
];

function loadRegistry(file, key) {
  const doc = yaml.load(fs.readFileSync(path.join(REPO, file), 'utf-8')) || {};
  return Array.isArray(doc[key]) ? doc[key] : [];
}

function mdEscape(s) {
  return String(s == null ? '' : s).replace(/\|/g, '\\|');
}

function buildBody(lang) {
  const vi = lang === 'vi';
  const styles = loadRegistry('knowledge/design-systems.yaml', 'design_systems');
  const arts = loadRegistry('knowledge/art-styles.yaml', 'art_styles');

  const fmtRows = FORMATS.map(([name, fam, en, viD]) =>
    `| \`${name}\` | ${fam} | ${mdEscape(vi ? viD : en)} |`).join('\n');

  const styleRows = styles.map((s) => {
    const owned = s.origin === 'owned' ? (vi ? 'sở hữu (Tier-1)' : 'owned (Tier-1)') : (vi ? 'tải về' : 'downloaded');
    const st = s.status === 'installed' ? '✅ installed' : (s.status || '');
    return `| \`${s.name}\` | ${owned} | ${st} |`;
  }).join('\n');

  const artRows = arts.map((a) =>
    `| \`${a.id}\` | ${mdEscape(a.name)} | ${mdEscape((a.assets || '').slice(0, 90))} |`).join('\n');

  const h = vi
    ? {
        intro: 'Trang tra cứu: TẤT CẢ giá trị cho `--format`, `--style` (design-system) và `--art-style` (artistic genre) của `/deepask`. Auto-generate từ `knowledge/design-systems.yaml` + `knowledge/art-styles.yaml` — chạy lại `scripts/docs/gen-deepask-catalog.cjs` khi registry đổi.',
        f: '## `--format` — tất cả format',
        fh: '| Format | Họ | Mô tả |',
        s: '## `--style` — design-system (trục BRAND)',
        sIntro: 'Palette/logo/type từ một `DESIGN.md`. owned = canonical Tier-1 `00-core/design-system/`; downloaded = cache `runtime/` (materialize lười khi dùng lần đầu qua `/design-system add`). Bỏ qua `--style` → plain.',
        sh: '| Style | Loại | Trạng thái |',
        a: '## `--art-style` — artistic genre (trục GENRE)',
        aIntro: 'Register nghệ thuật (layout/assets/mood) trực giao với `--style`; brand palette/logo/type LUÔN thắng. Chỉ áp dụng cho image formats + code-rendered formats. Registry đóng → tên lạ sẽ hard-fail.',
        ah: '| Art-style (id) | Tên | Assets (đòn bẩy minh hoạ) |',
        note: `*${arts.length} art-styles · ${styles.length} design-systems · ${FORMATS.length} formats. Brand × genre = một merge function brand-thắng (xem Chương 45 §45.9 + Chương 47).*`,
      }
    : {
        intro: 'Lookup page: ALL `/deepask` values for `--format`, `--style` (design-system) and `--art-style` (artistic genre). Auto-generated from `knowledge/design-systems.yaml` + `knowledge/art-styles.yaml` — re-run `scripts/docs/gen-deepask-catalog.cjs` when the registries change.',
        f: '## `--format` — every format',
        fh: '| Format | Family | Description |',
        s: '## `--style` — design-systems (BRAND axis)',
        sIntro: 'Palette/logo/type from a `DESIGN.md`. owned = canonical Tier-1 `00-core/design-system/`; downloaded = `runtime/` cache (materialized lazily on first use via `/design-system add`). Omit `--style` → plain.',
        sh: '| Style | Kind | Status |',
        a: '## `--art-style` — artistic genres (GENRE axis)',
        aIntro: 'Artistic register (layout/assets/mood), orthogonal to `--style`; brand palette/logo/type ALWAYS win. Applies to image formats + code-rendered formats only. Closed registry → an unknown name hard-fails.',
        ah: '| Art-style (id) | Name | Assets (illustration lever) |',
        note: `*${arts.length} art-styles · ${styles.length} design-systems · ${FORMATS.length} formats. Brand × genre = one brand-wins merge function (see Chapter 45 §45.9 + Chapter 47).*`,
      };

  return [
    `> ${h.intro}`, '',
    h.f, '', h.fh, '|---|---|---|', fmtRows, '',
    h.s, '', h.sIntro, '', h.sh, '|---|---|---|', styleRows, '',
    h.a, '', h.aIntro, '', h.ah, '|---|---|---|', artRows, '',
    h.note, '',
  ].join('\n');
}

function emit(lang) {
  const body = buildBody(lang);
  const title = lang === 'vi' ? 'Tra cứu: deepask formats, styles & art-styles' : 'Reference: deepask formats, styles & art-styles';
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `description: ${JSON.stringify('All /deepask --format, --style and --art-style values (lookup catalog).')}`,
    'source_path: scripts/docs/gen-deepask-catalog.cjs',
    `source_hash: ${hash}`,
    `generated_by: gen-deepask-catalog v1.0.0`,
    'category: command',
    `language: ${lang}`,
    'translated: true',
    `translated_source_hash: ${hash}`,
    '---',
  ].join('\n');
  const out = path.join(OUT_DIR, lang === 'vi' ? 'deepask-catalog.mdx' : 'deepask-catalog.en.mdx');
  fs.writeFileSync(out, `${fm}\n\n{/* generated-by: gen-deepask-catalog v1.0.0 */}\n\n${body}`);
  console.log(`[catalog] wrote ${path.relative(REPO, out)}`);
}

emit('vi');
emit('en');
console.log('[catalog] done');
