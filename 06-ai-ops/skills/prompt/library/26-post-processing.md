<!-- param: post-processing | order: 26 | label_en: Post-processing & Optical Artefacts | label_vi: Hậu kỳ & dấu vết quang học | group: F | source: new -->

# 26 — Post-processing & Optical Artefacts (Hậu kỳ & dấu vết quang học)

> **Câu hỏi:** *Bức ảnh có những "khiếm khuyết" gì của thiết bị thật?*
> **Vai trò:** Đây là tham số **chuyên trách chống vẻ AI**. Ống kính thật, phim thật và cảm biến thật đều để lại dấu vết: flare, vignette, sai sắc, halation, méo. AI mặc định tạo ảnh *không có* những dấu vết đó — và đó chính là lý do ảnh trông "sạch một cách đáng ngờ".
> **Trạng thái trong link gốc:** ⚠️ Chỉ có 2 giá trị nằm lẫn (`Overexposed lens flare shot`, `Subtle film grain`).
> **Bắt buộc:** ⭕ Tuỳ chọn — nhưng là công cụ tinh chỉnh cuối cùng hiệu quả nhất.

**Cách dùng:** Chọn **1–3 giá trị**. Ít mà đúng. Chọn quá nhiều artefact = ảnh trông như bị lọc Instagram chồng lớp.

---

## A. Flare & loé sáng (Flare & bloom)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | Subtle lens flare | Lens flare nhẹ; có nguồn sáng thật trong hoặc ngoài khung. | + |
| 2 | Overexposed lens flare shot | Cháy sáng kèm flare; hazy, cảm xúc, mùa hè. | L |
| 3 | Anamorphic horizontal blue flare | Flare ngang xanh anamorphic; **DNA điện ảnh** rõ nhất. | + |
| 4 | Circular ghosting flare | Flare bóng ma hình tròn; nhiều vòng theo trục sáng. | + |
| 5 | Veiling flare, low contrast | Flare che phủ làm giảm tương phản; ống cổ, bay màu. | + |
| 6 | Sunstar / diffraction spikes | Tia sao từ nhiễu xạ; khẩu nhỏ (f/16), đèn điểm. | + |
| 7 | Halation glow around highlights | Vầng loé quanh vùng sáng; **đặc trưng phim** — cực hiệu quả. | + |
| 8 | Bloom on bright light sources | Bloom quanh nguồn sáng mạnh; mềm, mộng. | + |
| 9 | Streak flare from a point light | Vệt flare từ đèn điểm; đêm, kịch tính. | + |

## B. Vignette & sai lệch quang học (Vignette & optical aberration)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 10 | Subtle vignette | Vignette nhẹ tối mép; dẫn mắt vào giữa, tự nhiên. | + |
| 11 | Heavy vignette | Vignette đậm; lomo, cổ, kịch tính. | + |
| 12 | Chromatic aberration at edges | Sai sắc ở mép khung; **dấu hiệu ống kính thật**. | + |
| 13 | Purple fringing on highlights | Viền tím ở vùng sáng; ống rẻ, rất thật. | + |
| 14 | Barrel distortion | Méo thùng; ống rộng, đường thẳng phồng ra. | + |
| 15 | Pincushion distortion | Méo gối; ống tele, đường thẳng lõm vào. | + |
| 16 | Soft corners, sharp center | Mép mềm, tâm nét; ống cổ, khẩu lớn. | + |
| 17 | Field curvature blur | Mờ do độ cong trường ảnh; ống cổ đặc trưng. | + |
| 18 | Coma / astigmatism at edges | Coma/loạn thị ở mép; điểm sáng biến dạng, thật. | + |
| 19 | Slight tilt / horizon not level | Hơi nghiêng, đường chân trời không thẳng; ảnh do người chụp. | + |

## C. Hạt, nhiễu & suy giảm (Grain, noise & degradation)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 20 | Subtle film grain | Hạt phim tinh tế; mặc định nên có cho mọi ảnh "thật". | L |
| 21 | Heavy 35mm grain | Hạt 35mm đậm; thô, biểu cảm. | + |
| 22 | Fine medium-format grain | Hạt medium format mảnh; cao cấp, ít mà có. | + |
| 23 | Digital sensor noise in shadows | Nhiễu cảm biến trong vùng tối; ISO cao, đêm. | + |
| 24 | Luminance noise, no color noise | Nhiễu độ sáng không nhiễu màu; sạch mà vẫn thật. | + |
| 25 | JPEG compression artefacts | Artefact nén JPEG; ảnh lưu truyền trên mạng, lo-fi. | + |
| 26 | Color banding in gradients | Dải màu đứt trong chuyển sắc; nén, retro số. | + |
| 27 | Dust and scratches on the negative | Bụi và xước trên phim; **bản scan thật** — rất thuyết phục. | + |
| 28 | Hair or fiber in the film gate | Sợi tóc/bụi trong cửa phim; chi tiết cực nhỏ mà đắt giá. | + |
| 29 | Light leak on the film edge | Rò sáng ở mép phim; vệt cam/hồng, lomo. | + |
| 30 | Halide clumping / uneven development | Vón hạt/tráng phim không đều; thủ công, analog thật. | + |

## D. Đặc trưng phim & analog (Film & analog character)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 31 | Film base fog | Sương nền phim; đen không tuyệt đối, ngả xanh/nâu. | + |
| 32 | Slightly faded contrast | Tương phản hơi phai; phim cũ, ký ức. | + |
| 33 | Shifted color balance | Cân bằng màu bị lệch; phim quá hạn, không "đúng" mà đẹp. | + |
| 34 | Warm highlight roll-off | Chuyển vùng sáng ấm và mượt; **phim làm được, số thì không**. | + |
| 35 | Filmic S-curve contrast | Tương phản S-curve kiểu phim; chân đen mềm, đỉnh sáng nén. | + |
| 36 | Push-processed high contrast | Đẩy sáng khi tráng, tương phản cao; hạt to, phóng viên. | + |
| 37 | Polaroid emulsion edge | Mép nhũ tương Polaroid; không đều, thủ công. | + |
| 38 | White instant-film border | Viền trắng ảnh lấy liền; đóng khung ký ức. | + |
| 39 | Date stamp in the corner | Dấu ngày ở góc; máy compact 90s, cực nhận diện. | + |
| 40 | VHS scanlines and tracking error | Đường quét và lỗi tracking VHS; analog video, 80-90s. | + |

## E. Xử lý số & lọc (Digital treatment)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 41 | Minimal post-processing | Hậu kỳ tối thiểu; mộc, trung thực. | + |
| 42 | Clean commercial retouch | Retouch thương mại sạch; giữ kết cấu, xoá phân tán. | + |
| 43 | Heavy beauty retouch | Retouch beauty mạnh; da mịn — **rủi ro "nhựa"** cao. | + |
| 44 | Dodge and burn sculpting | Dodge & burn tạo khối; chuyên nghiệp, có chiều. | + |
| 45 | Frequency separation smoothing | Làm mịn tách tần số; giữ lỗ chân lông mà bớt vết. | + |
| 46 | Local contrast enhancement | Tăng tương phản cục bộ; chi tiết nổi — quá tay thành HDR giả. | + |
| 47 | Clarity / texture boost | Tăng clarity/texture; sạn hơn, mạnh hơn. | + |
| 48 | Soft glow diffusion filter | Kính lọc tán sáng mềm; hoài cổ, da dịu. | + |
| 49 | Black pro-mist filter look | Look kính Black Pro-Mist; bloom quanh sáng, rất "phim". | + |
| 50 | Orton effect glow | Hiệu ứng Orton; mộng, sáng lan, phong cảnh. | + |
| 51 | Split-tone shadows and highlights | Tách tông bóng/sáng; tinh tế, có gu. | + |
| 52 | Film grain overlay on digital | Chồng hạt phim lên ảnh số; cầu nối số–phim. | + |
| 53 | Crushed blacks in post | Nén đen ở hậu kỳ; đồ hoạ, mạnh. | + |
| 54 | Bleach bypass processing | Xử lý bleach bypass; bạc, tương phản cao. | + |
| 55 | No sharpening applied | Không làm nét; mềm tự nhiên, chống "sắc lẹm AI". | + |

## F. Khung, viền & lớp phủ (Frame, border & overlay)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 56 | Letterbox black bars | Viền đen letterbox; tín hiệu "phim" tức thì. | + |
| 57 | Film sprocket holes visible | Thấy lỗ răng phim; analog thật, đồ hoạ. | + |
| 58 | Contact sheet / film strip layout | Bố cục contact sheet/dải phim; nhiều frame, quá trình. | + |
| 59 | Timestamp / camera OSD overlay | Lớp phủ timestamp/thông tin máy; giám sát, tài liệu. | + |
| 60 | Deliberate uncropped raw framing | Khung raw chưa crop có chủ đích; thô, trung thực. | + |

---

## Lưu ý khi viết Post-processing

- **Combo chống-AI hiệu quả nhất (3 từ khoá):**
  `subtle film grain` + `halation glow around highlights` + `chromatic aberration at edges`
  Ba dấu vết này chỉ tồn tại trong thiết bị thật; thêm vào là bước nhảy lớn nhất về độ tin cậy.
- **Combo "phim thật" (4 từ khoá):** `dust and scratches on the negative` + `film base fog` + `warm highlight roll-off` + `slight tilt / horizon not level`.
- **`Heavy beauty retouch` là con dao hai lưỡi.** Nếu bạn muốn look quảng cáo mỹ phẩm cao cấp thì đúng; nếu muốn chân thực thì nó sẽ phá mọi công sức bạn bỏ ở [25-texture](25-texture.md).
- **`No sharpening applied` và `minimal post-processing`** là cách nói ngược rất hiệu quả: bảo AI *đừng* làm điều nó mặc định làm.
- **Artefact phải khớp thiết bị.** `VHS scanlines` với `digital medium format` ở [14-camera-body-film](14-camera-body-film.md) là mâu thuẫn. Chọn thiết bị trước, artefact sau.
- **Đừng chồng quá 3 artefact.** Flare + vignette + hạt đậm + light leak + banding = ảnh trông như đã qua 5 preset, tức là lại giả theo một cách khác.
