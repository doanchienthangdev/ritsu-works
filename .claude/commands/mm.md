---
name: mm
description: |
  Viết một chương sách deep-research về MỘT chủ thể bất kỳ — mô hình tư duy, khái niệm, ý tưởng, lý
  thuyết, mô hình, hệ thống, THUẬT TOÁN, khung, nguyên lý, hiện tượng… bất kỳ thứ gì đáng hiểu sâu.
  40–55 trang, sâu sắc, uyên bác, sư phạm cực cao, trong sáng như một bậc thầy huyền thoại, CÓ sơ đồ/
  biểu đồ Claude-styled khi cần, trình bày theo Claude Design System, xuất ra EPUB + PDF + artifacts.
  Mặc định TIẾNG VIỆT. Thin orchestrator: dựng giọng "Bậc thầy" (blend Feynman·Tim Urban·Sagan·James
  Clear·Oakley), bám khuôn mẫu 13 chuyển động (có phần NÂNG TẦNG/upthink), drive pipeline longform của
  /write + dựng visual qua /dataviz + /image, rồi render qua scripts/mm/render.py. Output →
  ".archives/Mental Models/<slug>/".
argument-hint: "\"<Tên chủ thể>\" [--lang=vi|en --author-style=<blend|slug> --length=deep --out=epub+pdf --visuals=auto --upthink=on --refs=<paths|urls> --max-cost-usd=3 --dry-run] | template | authors | rubric"
---

# /mm — deep-monograph writer for ANY subject (capability `mental-models` v0.2, Option C)

Front-end để biến **tên một chủ thể bất kỳ** (mô hình tư duy · khái niệm · ý tưởng · lý thuyết · mô hình
· hệ thống · **thuật toán** · khung · nguyên lý · hiện tượng…) thành **một chương sách khiến người đọc
ngất ngây**. Mental Models là thư viện chủ lực + template mặc định, nhưng `/mm` viết được về *bất kỳ thực
thể nào* — giữ NHIỆM VỤ của 13 chuyển động, uốn NỘI DUNG theo loại chủ thể. Composes `/write` (giọng +
humanize + longform) + `/dataviz` + `/image` cho visual + một renderer Claude-styled cho EPUB/PDF. Brain
nằm ở skill `06-ai-ops/skills/mm/SKILL.md` — đọc nó rồi thực thi.

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
| `<Tên chủ thể>` | — | tên chủ thể bất kỳ (positional). Vd "The AQAL Matrix", "Thuật toán Dijkstra", "Thuyết tương đối hẹp", "Hệ thống miễn dịch". |
| `--lang` | `vi` | `vi`\|`en`. **Tiếng Việt mặc định**; chỉ `en` khi được yêu cầu rõ. |
| `--author-style` | `mm-master-blend` | blend mặc định, HOẶC một voice đơn `installed` (vd `richard-feynman`, `tim-urban`, `carl-sagan`, `james-clear`). |
| `--length` | `deep` | `standard`(≈10k chữ) \| `deep`(≈17–22k chữ / 40–55tr) \| `epic`(≈26k+). |
| `--out` | `epub+pdf` | `epub`\|`pdf`\|`md`\|`html`, nối bằng `+`. |
| `--style` | `claude` | design system render (Claude editorial mặc định). |
| `--visuals` | `auto` | `auto`\|`on`\|`off` — dựng sơ đồ `::: svg` (hero §3) + biểu đồ /dataviz + ảnh /image khi cần. |
| `--upthink` | `on` | `on`\|`off` — phần "Nâng tầng" (§10.5): leo thang tư duy lên mấy bậc tới đỉnh triết học/vũ trụ. |
| `--refs` | — | nguồn bổ sung để ground (files/URLs, `+`-joined). |
| `--research` | `deep` | `off`\|`auto`\|`deep` — độ sâu nghiên cứu ngoài để chính xác + uyên bác. |
| `--grounding` | `auto` | `auto`\|`off`\|`wiki`\|`deepask`\|`brain`\|`all` — nguồn nội bộ Ritsu. |
| `--max-cost-usd` | `3.00` | breaker mỗi lần chạy (research/enrich out-of-band). |
| `--dry-run` | off | chỉ lập kế hoạch (bible + outline + cost), không viết. |
| `--out-dir` | `.archives/Mental Models/<slug>/` | thư mục output (root `.archives`, local-only). |

Cờ lạ → WARN (forward-compat), không bỏ thầm.

## Luồng (dispatch sang skill `mm`)
1. Parse cờ → slug hoá tên mô hình → tạo `.archives/Mental Models/<slug>/{,artifacts/}` (root repo).
2. **Bible:** dựng nguồn-chân-lý cho chủ thể — facts (ground qua `--research`/`--grounding`) + thuật ngữ
   Việt khoá + giọng blend + brief từng phần theo khuôn mẫu **13 chuyển động** (gồm Nâng tầng). **Khoá bible.**
3. **Draft:** longform song-song-mù (một agent/chuyển động) qua Claude Code Workflow, bám bible, tiếng
   Việt, đúng giọng + hộp + ngân sách chữ.
4. **Synthesize + Visualize:** ráp theo thứ tự → liền mạch + master-editor (cắt gạch ngang) → **humanize
   gate** đến khi pass → dựng **sơ đồ hero `::: svg`** (§3) + biểu đồ /dataviz + ảnh /image khi cần →
   tự viết bìa trước (frontmatter + đề từ + bản-đồ-một-trang) và bìa sau (sổ tay + thuật ngữ + nguồn).
5. **Render:** `scripts/mm/render.py <slug>.md --out=epub+pdf --style=claude --out-dir=<dir> --name=<slug>`
   (chạy bằng anaconda python + `DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib`).
6. **Report:** files[], số chữ, humanize before→after, cost, warnings[]. Giữ bible/research/nháp trong
   `<slug>/artifacts/`.

## Ví dụ
```
/mm "The AQAL Matrix"                                  # mô hình tư duy: deep, tiếng Việt, epub+pdf
/mm "Thuật toán Dijkstra"                               # THUẬT TOÁN: cùng template, §3 = cơ chế + độ phức tạp
/mm "Thuyết tương đối hẹp"                              # lý thuyết khoa học
/mm "Hệ thống miễn dịch của cơ thể"                     # một hệ thống
/mm "Inversion" --author-style=richard-feynman          # ép một giọng đơn
/mm "First Principles Thinking" --lang=en --out=pdf --upthink=off
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
