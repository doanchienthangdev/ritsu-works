# Bộ tham số Full Prompt tạo ảnh

Bộ artifact tham chiếu để **build hoặc enhance prompt tạo ảnh** từ một ý tưởng đầu vào.

**Nguồn:** Notion *PromptTemplate* (12 tham số / 632 giá trị) + PDF *AI Video Bootcamp — The AVB Prompt Framework* (13 trang).
**Kết quả:** 28 tham số · 2.264 giá trị · 100% giá trị link gốc được giữ và phân loại lại.

---

## Bắt đầu ở đâu

| Nếu bạn muốn… | Mở file |
|---|---|
| Tra cứu nhanh toàn bộ tham số + giá trị | **[00-MASTER-REFERENCE.md](00-MASTER-REFERENCE.md)** |
| Hiểu nghĩa từng giá trị của **một** tham số | File tương ứng bên dưới |
| Biết thứ tự lắp một prompt từ đầu | [00-MASTER-REFERENCE.md §5](00-MASTER-REFERENCE.md) |
| Kiểm tra prompt trước khi generate | [00-MASTER-REFERENCE.md §6](00-MASTER-REFERENCE.md) |
| Biết cặp tham số nào triệt tiêu nhau | [00-MASTER-REFERENCE.md §7](00-MASTER-REFERENCE.md) |

---

## 28 file tham số

### Nhóm A — SUBJECT (chủ thể)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 01 | [01-subject.md](01-subject.md) | Subject — Chủ thể | 100 |
| 02 | [02-casting-appearance.md](02-casting-appearance.md) | Casting & Appearance — Ngoại hình | 100 |
| 03 | [03-facial-expression.md](03-facial-expression.md) | Facial Expression — Biểu cảm mặt ⚠️ *link gốc rỗng* | 104 |
| 04 | [04-gesture-pose.md](04-gesture-pose.md) | Gesture & Pose — Dáng & động tác ⚠️ *link gốc rỗng* | 105 |
| 05 | [05-wardrobe-styling.md](05-wardrobe-styling.md) | Wardrobe & Styling — Trang phục | 103 |
| 06 | [06-product-subject.md](06-product-subject.md) | Product Spec — Đặc tả sản phẩm | 95 |
| 07 | [07-action-beat.md](07-action-beat.md) | Action & Beat — Hành động | 80 |

### Nhóm B — ENVIRONMENT (bối cảnh)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 08 | [08-environment.md](08-environment.md) | Environment — Bối cảnh | 110 |
| 09 | [09-time-of-day.md](09-time-of-day.md) | Time of Day — Thời điểm | 30 |
| 10 | [10-weather-atmosphere.md](10-weather-atmosphere.md) | Weather & Atmosphere — Thời tiết | 55 |
| 11 | [11-props-set-dressing.md](11-props-set-dressing.md) | Props — Đạo cụ | 80 |

### Nhóm C — CAMERA
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 12 | [12-camera-shot.md](12-camera-shot.md) | Shot, Angle & Framing — Cỡ cảnh & góc | 72 |
| 13 | [13-camera-lens.md](13-camera-lens.md) | Camera Lens — Ống kính | 63 |
| 14 | [14-camera-body-film.md](14-camera-body-film.md) | Camera Body & Film — Thân máy & chất phim | 55 |
| 15 | [15-focus-depth.md](15-focus-depth.md) | Aperture, Depth & Focus — Khẩu độ & nét | 50 |
| 16 | [16-motion-shutter.md](16-motion-shutter.md) | Shutter & Motion — Tốc trập & chuyển động | 50 |
| 17 | [17-camera-movement.md](17-camera-movement.md) | Camera Movement — Chuyển động camera *(video)* | 55 |
| 18 | [18-composition.md](18-composition.md) | Composition — Bố cục | 60 |

### Nhóm D — LIGHT (ánh sáng & màu)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 19 | [19-lighting.md](19-lighting.md) | Lighting — Ánh sáng | 100 |
| 20 | [20-color-palette.md](20-color-palette.md) | Color Palette & Grade — Bảng màu | 64 |

### Nhóm E — FEEL (cảm xúc & mục đích)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 21 | [21-mood.md](21-mood.md) | Mood — Cảm xúc | 212 |
| 22 | [22-intent.md](22-intent.md) | Intent — Mục đích sử dụng | 80 |

### Nhóm F — LOOK (xử lý hình ảnh)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 23 | [23-style.md](23-style.md) | Style — Phong cách | 80 |
| 24 | [24-art-medium.md](24-art-medium.md) | Art Medium — Chất liệu nghệ thuật | 75 |
| 25 | [25-texture.md](25-texture.md) | Texture — Kết cấu bề mặt | 81 |
| 26 | [26-post-processing.md](26-post-processing.md) | Post-processing — Hậu kỳ & dấu vết quang học | 60 |

### Nhóm G — OUTPUT (đầu ra & kiểm soát)
| # | File | Tham số | Giá trị |
|---|---|---|---|
| 27 | [27-output-spec.md](27-output-spec.md) | Output Spec — Tỷ lệ, phân giải & chữ | 55 |
| 28 | [28-negative-prompt.md](28-negative-prompt.md) | Negative / Avoid — Danh sách loại trừ | 90 |

---

## Quy ước trong mọi file

- Bảng 4 cột: `#` · `Value (EN)` · `Ý nghĩa / cách dùng (VI)` · `Src`
- **Giá trị luôn để tiếng Anh** — đó là ngôn ngữ các model tạo ảnh hiểu tốt nhất. Chỉ phần giải nghĩa là tiếng Việt.
- Cột `Src`: **`L`** = có sẵn trong link Notion · **`+`** = bổ sung mới.
- Mỗi file mở đầu bằng: câu hỏi tham số trả lời · vai trò · mức bắt buộc (✅ luôn / ⚠️ rất nên / ⭕ tuỳ chọn) · cách dùng.
- Mỗi file kết thúc bằng mục **Lưu ý khi viết** — các lỗi thường gặp và combo hiệu quả.

## Bảo trì

`00-MASTER-REFERENCE.md` được **sinh tự động** từ 28 file tham số (đọc HTML comment ở dòng đầu mỗi file + các bảng giá trị). Khi thêm hoặc sửa giá trị:

1. Sửa file tham số tương ứng (giữ đúng format bảng 4 cột và số thứ tự liên tục trong file).
2. Sinh lại file master để hai bên không lệch nhau.

Đừng sửa danh sách giá trị trực tiếp trong file master — nó sẽ bị ghi đè.
