---
name: mm
description: |
  Viết một chương sách deep-research về MỘT mô hình tư duy (mental model) — 40–55 trang, sâu
  sắc, uyên bác, sư phạm cực cao, trong sáng như một bậc thầy huyền thoại, trình bày theo Claude
  Design System, xuất ra EPUB + PDF + artifacts. Mặc định TIẾNG VIỆT. Thin orchestrator: dựng
  giọng "Bậc thầy Mô hình Tư duy" (blend Feynman·Tim Urban·Sagan·James Clear·Oakley), bám khuôn
  mẫu 12 chuyển động, drive pipeline longform của /write (bible → draft song song → liền mạch →
  humanize), rồi render qua scripts/mm/render.py. Output → ".archives/Mental Models/<slug>/".
argument-hint: "\"<Tên mô hình>\" [--lang=vi|en --author-style=<blend|slug> --length=deep --out=epub+pdf --refs=<paths|urls> --max-cost-usd=3 --dry-run] | template | authors | rubric"
---

# /mm — Mental Models writer (capability `mental-models` v0.1, Option C)

Front-end để biến **tên một mô hình tư duy** thành **một chương sách khiến người đọc ngất ngây**.
Composes `/write` (giọng + humanize + longform) + một renderer Claude-styled cho EPUB/PDF. Brain nằm
ở skill `06-ai-ops/skills/mm/SKILL.md` — đọc nó rồi thực thi.

## Cách dùng
```
/mm "<Tên mô hình>" [flags]       # viết một chương mô hình tư duy (mặc định)
/mm template                      # in khuôn mẫu 12-chuyển-động (read-only)
/mm authors                       # in blend giọng + danh sách voice phù hợp (read-only)
/mm rubric                        # in rubric chất lượng (read-only)
```

## Cờ (flags)
| Cờ | Mặc định | Ghi chú |
|---|---|---|
| `<Tên mô hình>` | — | tên mô hình tư duy (positional). Vd "The AQAL Matrix", "Mô hình Mạng nhện Munger". |
| `--lang` | `vi` | `vi`\|`en`. **Tiếng Việt mặc định**; chỉ `en` khi được yêu cầu rõ. |
| `--author-style` | `mm-master-blend` | blend mặc định, HOẶC một voice đơn `installed` (vd `richard-feynman`, `tim-urban`, `carl-sagan`, `james-clear`). |
| `--length` | `deep` | `standard`(≈10k chữ) \| `deep`(≈16–20k chữ / 40–55tr) \| `epic`(≈24k+). |
| `--out` | `epub+pdf` | `epub`\|`pdf`\|`md`\|`html`, nối bằng `+`. |
| `--style` | `claude` | design system render (Claude editorial mặc định). |
| `--refs` | — | nguồn bổ sung để ground (files/URLs, `+`-joined). |
| `--research` | `deep` | `off`\|`auto`\|`deep` — độ sâu nghiên cứu ngoài để chính xác + uyên bác. |
| `--grounding` | `auto` | `auto`\|`off`\|`wiki`\|`deepask`\|`brain`\|`all` — nguồn nội bộ Ritsu. |
| `--max-cost-usd` | `3.00` | breaker mỗi lần chạy (research/enrich out-of-band). |
| `--dry-run` | off | chỉ lập kế hoạch (bible + outline + cost), không viết. |
| `--out-dir` | `.archives/Mental Models/<slug>/` | thư mục output (root `.archives`, local-only). |

Cờ lạ → WARN (forward-compat), không bỏ thầm.

## Luồng (dispatch sang skill `mm`)
1. Parse cờ → slug hoá tên mô hình → tạo `.archives/Mental Models/<slug>/{,artifacts/}` (root repo).
2. **Bible:** dựng nguồn-chân-lý cho mô hình — facts (ground qua `--research`/`--grounding`) + thuật ngữ
   Việt khoá + giọng blend + brief từng phần theo khuôn mẫu 12 chuyển động. **Khoá bible.**
3. **Draft:** longform song-song-mù (một agent/chuyển động) qua Claude Code Workflow, bám bible, tiếng
   Việt, đúng giọng + hộp + ngân sách chữ.
4. **Synthesize:** ráp theo thứ tự → liền mạch + làm mượt mối nối → **humanize gate**
   (`scripts/write/humanize/scan.cjs`) đến khi pass → tự viết bìa trước (frontmatter + đề từ + bản-đồ-
   một-trang) và bìa sau (sổ tay + thuật ngữ + nguồn) cho chính xác.
5. **Render:** `scripts/mm/render.py <slug>.md --out=epub+pdf --style=claude --out-dir=<dir> --name=<slug>`
   (chạy bằng anaconda python + `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`).
6. **Report:** files[], số chữ, humanize before→after, cost, warnings[]. Giữ bible/research/nháp trong
   `<slug>/artifacts/`.

## Ví dụ
```
/mm "The AQAL Matrix"                                  # chương deep, tiếng Việt, epub+pdf, Claude style
/mm "Inversion" --author-style=richard-feynman          # ép một giọng đơn
/mm "First Principles Thinking" --lang=en --out=pdf
/mm "Mô hình Mạng nhện của Munger" --refs=raw/munger/   # ground thêm từ refs
/mm "Second-Order Thinking" --dry-run                   # chỉ kế hoạch + cost
/mm template                                            # xem khuôn mẫu
```

## Governance
Tier A (đảo ngược được, ghi local có metering + cap). Soạn/humanize = in-session (subscription);
`--research=deep` + enrich (/image,/dataviz) = out-of-band, mỗi cái có breaker; `--max-cost-usd` là
guard tổng. Output chỉ ghi vào `.archives/` (local-only). Cost-bucket dùng chung `ai-ops-write`.
Brain + khuôn mẫu đầy đủ: `06-ai-ops/skills/mm/SKILL.md`. Thiết kế (CLA pass):
`.archives/Mental Models/_system/CLA-DESIGN.md`.
