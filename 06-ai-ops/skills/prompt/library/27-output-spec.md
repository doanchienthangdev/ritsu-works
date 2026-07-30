<!-- param: output | order: 27 | label_en: Output Spec — Ratio, Resolution & Text | label_vi: Đặc tả đầu ra — tỷ lệ, phân giải & chữ | group: G | source: new -->

# 27 — Output Spec: Ratio, Resolution & Text (Đặc tả đầu ra)

> **Câu hỏi:** *File cuối cùng phải có hình dạng và kích thước nào — và trong ảnh có chữ không?*
> **Vai trò:** Đây là tham số **kỹ thuật**, không phải sáng tạo — nhưng bỏ qua nó là cách nhanh nhất để có một bức ảnh đẹp mà **không dùng được**: sai tỷ lệ cho nền tảng, không có chỗ đặt headline, hoặc chữ trong ảnh bị AI viết sai.
> **Trạng thái trong link gốc:** ❌ Không có tham số này.
> **Bắt buộc:** ✅ Bắt buộc trên thực tế — mọi ảnh đều có một tỷ lệ, dù bạn có nêu hay không.

**Cách dùng:** Chọn **1 tỷ lệ** (bảng A) + tuỳ chọn **1 quy ước chữ** (bảng D) nếu ảnh sẽ có hoặc sẽ nhận chữ.

---

## A. Tỷ lệ khung (Aspect ratio)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | 1:1 square | Vuông; Instagram feed cũ, bìa podcast, avatar. | + |
| 2 | 4:5 vertical portrait | Dọc 4:5; **chiếm nhiều diện tích nhất trên feed Instagram**. | + |
| 3 | 3:4 vertical | Dọc 3:4; ảnh chụp máy compact, in ảnh. | + |
| 4 | 2:3 vertical | Dọc 2:3; tỷ lệ phim 35mm dựng đứng, poster. | + |
| 5 | 9:16 vertical full-screen | Dọc toàn màn 9:16; Reels, TikTok, Shorts, Stories. | + |
| 6 | 4:3 horizontal | Ngang 4:3; cổ điển, trình chiếu, iPad. | + |
| 7 | 3:2 horizontal | Ngang 3:2; tỷ lệ phim 35mm chuẩn. | + |
| 8 | 16:9 widescreen | Ngang 16:9; YouTube thumbnail, video, web hero. | + |
| 9 | 1.85:1 cinematic | 1.85:1 điện ảnh; phim chiếu rạp phổ thông. | + |
| 10 | 2.39:1 anamorphic scope | 2.39:1 anamorphic; phim rộng, epic. | + |
| 11 | 21:9 ultrawide | 21:9 siêu rộng; banner web, màn hình rộng. | + |
| 12 | 5:4 near-square | Gần vuông 5:4; medium format, in lớn. | + |
| 13 | 6:17 panoramic | Panorama 6:17; phong cảnh, dải rất rộng. | + |
| 14 | A4 print portrait | Dọc khổ A4; in tài liệu, poster nhỏ. | + |
| 15 | Billboard landscape ratio | Tỷ lệ biển quảng cáo ngang; rất rộng, một ý duy nhất. | + |

## B. Độ phân giải & chất lượng (Resolution & quality)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 16 | Web resolution, 1080px | Phân giải web 1080px; đủ cho mạng xã hội. | + |
| 17 | High resolution, 2048px+ | Phân giải cao 2048px+; web hero, in nhỏ. | + |
| 18 | Print resolution, 300 DPI | Phân giải in 300 DPI; catalogue, poster. | + |
| 19 | Large-format print quality | Chất lượng in khổ lớn; biển, backdrop. | + |
| 20 | 4K frame | Frame 4K; video, màn hình lớn. | + |
| 21 | Maximum available resolution | Phân giải cao nhất khả dụng; khi chưa biết dùng vào đâu. | + |
| 22 | Low-res, intentionally compressed | Phân giải thấp, nén có chủ đích; lo-fi, meme, retro. | + |

## C. Định dạng & kỹ thuật file (Format & technical)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 23 | Transparent background PNG | Nền trong PNG; cắt sẵn, ghép lên nền khác. | + |
| 24 | Pure white background, isolated | Nền trắng thuần, chủ thể tách; e-commerce, marketplace. | + |
| 25 | Solid color background | Nền một màu phẳng; đồ hoạ, dễ ghép chữ. | + |
| 26 | Seamless tileable pattern | Hoa văn lặp liền mạch; nền web, vải. | + |
| 27 | Full-bleed, no border | Tràn viền, không lề; in, hero. | + |
| 28 | Safe margins for print trim | Lề an toàn cho cắt in; đừng để chủ thể sát mép. | + |
| 29 | sRGB color space | Không gian màu sRGB; web, mặc định. | + |
| 30 | CMYK-safe colors for print | Màu an toàn CMYK cho in; tránh màu web không in được. | + |
| 31 | Single frame, no collage | Một khung duy nhất, không ghép; tránh AI tự chia ô. | + |
| 32 | Series of consistent variants | Bộ nhiều biến thể nhất quán; carousel, A/B test. | + |

## D. Chữ & typography trong ảnh (Text in the frame)

> ⚠️ **Cảnh báo:** mọi mô hình tạo ảnh đều **yếu ở việc viết chữ**. Chữ dài, chữ tiếng Việt có dấu, và chữ nhỏ gần như luôn sai. Nguyên tắc: **để chỗ trống cho chữ, rồi thêm chữ bằng công cụ thiết kế** — đừng nhờ AI viết.

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 33 | No text anywhere in the image | Không có chữ nào trong ảnh; **lựa chọn an toàn nhất**. | + |
| 34 | No watermark, no logo | Không watermark, không logo; sạch để tự thêm sau. | + |
| 35 | Blank space reserved for headline | Chừa khoảng trống cho tiêu đề; ghép với [18-composition](18-composition.md). | + |
| 36 | Blank label, unbranded product | Nhãn trống, sản phẩm không thương hiệu; tránh AI bịa chữ. | + |
| 37 | Background signage out of focus | Biển hiệu ở nền để ngoài nét; chữ mờ thì sai không ai thấy. | + |
| 38 | Single short word, large and bold | Một từ ngắn duy nhất, lớn và đậm; giới hạn khả thi của AI. | + |
| 39 | Two- to three-word headline | Tiêu đề 2–3 từ; ngưỡng trên của độ tin cậy. | + |
| 40 | Bold sans-serif typography | Chữ sans-serif đậm; dễ render đúng nhất. | + |
| 41 | Serif editorial typography | Chữ serif kiểu tạp chí; sang, khó render hơn. | + |
| 42 | Handwritten script text | Chữ viết tay; đẹp nhưng rủi ro sai cao. | + |
| 43 | Neon sign lettering | Chữ biển neon; phát sáng, đô thị — nên để ngắn. | + |
| 44 | Text integrated into the scene | Chữ hoà vào cảnh (trên tường, áo, biển); tự nhiên nhất. | + |
| 45 | Latin characters only | Chỉ ký tự Latin không dấu; **tránh dấu tiếng Việt** — AI hay làm sai. | + |
| 46 | Numbers only, large | Chỉ số, cỡ lớn; dễ đúng hơn chữ. | + |
| 47 | Text-free safe zone at the bottom | Vùng dưới không có chữ; chỗ cho phụ đề hoặc CTA. | + |
| 48 | Legible at thumbnail size | Đọc được ở cỡ thumbnail; kiểm tra bằng cách thu nhỏ 10%. | + |

## E. Vùng an toàn theo nền tảng (Platform safe zones)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 49 | TikTok safe zone, center 60% | Vùng an toàn TikTok, 60% giữa; UI che trên và dưới. | + |
| 50 | Instagram Stories safe zone | Vùng an toàn Stories; tránh 250px trên và dưới. | + |
| 51 | YouTube thumbnail with corner clear | Thumbnail YouTube chừa góc dưới phải; nơi hiện thời lượng. | + |
| 52 | Feed crop-safe center square | Giữa khung an toàn khi bị crop vuông; ảnh chịu được nhiều tỷ lệ. | + |
| 53 | Website hero with center focus | Hero web tập trung giữa; responsive crop hai bên. | + |
| 54 | Email header, short height | Header email, chiều cao thấp; nội dung dồn vào giữa. | + |
| 55 | Print bleed 3mm on all sides | Bleed in 3mm bốn phía; chống trắng mép khi cắt. | + |

---

## Lưu ý khi viết Output Spec

- **Quyết định tỷ lệ TRƯỚC khi viết bố cục.** Một bố cục ngang không crop thành dọc được. Nếu cần cả hai, hãy tạo hai prompt riêng, đừng crop.
- **Với chữ, quy tắc là: đừng nhờ AI.** Chọn `no text anywhere in the image` + `blank space reserved for headline`, rồi đặt chữ bằng Canva/Figma/Photoshop. Bạn được font đúng, chính tả đúng, và dấu tiếng Việt đúng.
- **Nếu buộc phải có chữ trong ảnh:** giữ ở mức `single short word, large and bold`, dùng `bold sans-serif typography`, và `Latin characters only`. Mỗi từ thêm vào làm tăng xác suất sai theo cấp số.
- **Tiếng Việt có dấu là vùng rủi ro cao nhất.** Mô hình được huấn luyện chủ yếu trên chữ Latin không dấu; "Chào mừng" rất dễ ra "Chao mưng" hoặc ký tự lạ.
- **`Blank label, unbranded product` cứu bạn khỏi logo bịa.** Nếu không nói, AI sẽ tự thêm chữ méo lên mọi bao bì trong khung.
- **Ba tỷ lệ dùng nhiều nhất hiện nay:** `9:16 vertical full-screen` (video dọc), `4:5 vertical portrait` (feed), `16:9 widescreen` (thumbnail + web).
