<!-- param: time-of-day | order: 09 | label_en: Time of Day | label_vi: Thời điểm trong ngày | group: B | source: new -->

# 09 — Time of Day (Thời điểm trong ngày)

> **Câu hỏi:** *Lúc này là mấy giờ?*
> **Vai trò:** Framework AVB liệt kê `time of day` là một trong các lớp phải có của Environment. Tách riêng vì nó điều khiển đồng thời **màu ánh sáng, góc bóng đổ, mật độ người, và cảm xúc** — một tham số, bốn hệ quả.
> **Trạng thái trong link gốc:** ❌ Không có (chỉ gián tiếp qua vài giá trị Lighting như `golden hour warm glow`).
> **Bắt buộc:** ⚠️ Rất nên có cho cảnh ngoài trời hoặc cảnh có cửa sổ.

**Cách dùng:** Chọn 1 giá trị. Nếu cảnh trong studio kín không cửa sổ, có thể bỏ qua và dùng [19-lighting](19-lighting.md) trực tiếp.

---

## A. Sáng sớm

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | Pre-dawn / blue hour | Trước bình minh; xanh lạnh, tối, rất tĩnh — hợp cô đơn và khởi đầu. | + |
| 2 | First light at sunrise | Tia sáng đầu tiên lúc mặt trời mọc; ấm mảnh, bóng cực dài. | + |
| 3 | Early morning, 6–7am | Sáng sớm 6–7h; sáng dịu, phố vắng, sương nhẹ. | + |
| 4 | Mid-morning, 9–10am | Giữa buổi sáng; sáng rõ, năng lượng làm việc, bóng chéo. | + |
| 5 | Late morning haze | Cuối buổi sáng có sương mờ; mềm, hơi nostalgic. | + |

## B. Giữa ngày

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 6 | Noon, sun directly overhead | Chính ngọ, nắng đỉnh đầu; bóng cứng dưới mắt/mũi — **khó nhất**, dùng có chủ đích. | + |
| 7 | Harsh midday, high contrast | Trưa gắt tương phản cao; hợp editorial thô, streetwear, tài liệu. | + |
| 8 | Early afternoon, 2–3pm | Đầu giờ chiều; sáng đều, an toàn thương mại. | + |
| 9 | Overcast midday, no shadows | Trưa nhiều mây, không bóng rõ; như softbox khổng lồ — dễ chụp nhất. | + |
| 10 | Bright shade at midday | Trong bóng râm giữa trưa; sáng mềm mà không cháy, mẹo hay của nhà nghề. | + |

## C. Chiều & giờ vàng

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 11 | Late afternoon, 4–5pm | Chiều muộn; ấm dần, bóng bắt đầu dài. | + |
| 12 | Golden hour, one hour before sunset | Giờ vàng trước hoàng hôn; **mặc định đẹp nhất** cho chân dung ngoài trời. | + |
| 13 | Sunset, sun on the horizon | Hoàng hôn, mặt trời sát chân trời; silhouette và rim light tự nhiên. | + |
| 14 | Backlit golden hour | Giờ vàng ngược sáng; viền tóc phát sáng, hazy, rất "phim". | + |
| 15 | Just after sunset | Ngay sau hoàng hôn; trời còn màu, đèn phố bắt đầu lên. | + |
| 16 | Blue hour after sunset | Giờ xanh sau hoàng hôn; trời xanh sâu + đèn ấm = tương phản màu đẹp nhất. | + |

## D. Đêm

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 17 | Early evening, 7–8pm | Đầu tối; đèn nhân tạo chiếm chủ đạo, phố còn đông. | + |
| 18 | Night, city lights only | Đêm, chỉ có đèn thành phố; đa nguồn sáng đa màu. | + |
| 19 | Late night, after midnight | Khuya, sau nửa đêm; vắng, cô đơn, hợp storytelling. | + |
| 20 | Deep night, minimal light | Đêm sâu, rất ít sáng; cần một nguồn sáng chỉ định rõ. | + |
| 21 | Moonlit night | Đêm có trăng; xanh lạnh mềm, thơ. | + |
| 22 | Starless overcast night | Đêm nhiều mây không sao; đen phẳng, ngột ngạt. | + |
| 23 | Neon-lit night | Đêm dưới đèn neon; đô thị Á Đông, cyberpunk. | + |
| 24 | 3am convenience store glow | 3 giờ sáng dưới đèn cửa hàng tiện lợi; huỳnh quang lạnh, rất đặc trưng. | + |

## E. Không xác định & phi tuyến

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 25 | Timeless indoor light | Ánh sáng trong nhà không rõ giờ; trung tính, hợp studio và sản phẩm. | + |
| 26 | Ambiguous time of day | Thời điểm cố tình mơ hồ; siêu thực, giấc mơ. | + |
| 27 | Seasonal winter light, low sun | Ánh sáng đông, mặt trời thấp cả ngày; ấm nhưng yếu, bóng dài liên tục. | + |
| 28 | Seasonal summer light, long day | Ánh sáng hè, ngày dài; mạnh, no màu. | + |
| 29 | Monsoon grey daylight | Ánh sáng ngày mùa mưa xám; đặc trưng Đông Nam Á, ẩm. | + |
| 30 | Golden hour indoors through a window | Giờ vàng chiếu qua cửa sổ vào trong; vệt sáng ấm trên tường, tuyệt đẹp. | + |

---

## Lưu ý khi viết Time of Day

- **Ba giá trị an toàn nhất:** `golden hour, one hour before sunset` · `overcast midday, no shadows` · `bright shade at midday`. Cả ba đều cho ánh sáng mềm, tha thứ, khó trông giả.
- **Giá trị khó nhất:** `noon, sun directly overhead`. Chỉ dùng khi bạn *muốn* bóng cứng gắt (editorial, streetwear, tài liệu). Không dùng cho beauty.
- **`Blue hour after sunset` là bí mật của ảnh đô thị đắt tiền:** trời xanh sâu chưa tắt + đèn phố ấm đã lên ⇒ tương phản màu tự nhiên mà không cần grade.
- **Thời điểm ràng buộc mật độ người.** `early morning, 6-7am` hàm ý phố vắng; `pedestrian crossing at rush hour` hàm ý đông. Đừng để hai thứ chống nhau.
- **Trong nhà vẫn cần thời điểm** nếu có cửa sổ trong khung — nếu không, AI sẽ cho ánh sáng cửa sổ không khớp với đèn trong phòng.
