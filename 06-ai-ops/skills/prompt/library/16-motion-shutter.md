<!-- param: motion | order: 16 | label_en: Shutter & Motion Rendering | label_vi: Tốc trập & thể hiện chuyển động | group: C | source: notion-partial+expanded -->

# 16 — Shutter & Motion Rendering (Tốc trập & thể hiện chuyển động)

> **Câu hỏi:** *Chuyển động được ghi lại như thế nào — đóng băng hay nhoè?*
> **Vai trò:** Tham số quyết định ảnh có **cảm giác vận tốc** hay không. Đóng băng = quyền lực và chi tiết; nhoè = năng lượng và chân thực. Link gốc chỉ có 2 giá trị (`Freeze-frame action moment`, `Motion blur capture`) nằm lẫn trong `Camera`.
> **Trạng thái trong link gốc:** ⚠️ Có một phần (2 giá trị).
> **Bắt buộc:** ⭕ Tuỳ chọn cho ảnh tĩnh · ⚠️ Rất nên có khi có chuyển động hoặc khi làm video.
> **Cột `Src`:** `L` = có trong link Notion · `+` = bổ sung.

**Cách dùng:** Chọn **1 giá trị**. Với video, kết hợp thêm `180-degree shutter rule` (bảng D) để có motion blur "đúng phim".

---

## A. Đóng băng chuyển động (Freeze motion)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | Freeze-frame action moment | Đóng băng khoảnh khắc hành động; đỉnh động tác, mọi thứ nét. | L |
| 2 | Shot at 1/1000s | 1/1000 giây; đóng băng chạy, nhảy, thể thao. | + |
| 3 | Shot at 1/2000s | 1/2000 giây; đóng băng giọt nước, cánh chim. | + |
| 4 | Shot at 1/8000s | 1/8000 giây; đóng băng tuyệt đối, cần rất nhiều sáng. | + |
| 5 | Flash-frozen motion | Chuyển động bị flash đóng băng; cứng, sắc, ngôn ngữ paparazzi/party. | + |
| 6 | High-speed capture, water frozen mid-air | Chụp cao tốc, nước đứng giữa không trung; quảng cáo đồ uống. | + |
| 7 | Peak-action freeze | Đóng băng tại đỉnh hành động (điểm không trọng lượng); mạnh nhất. | + |
| 8 | Shattering / fragmenting frozen | Đóng băng lúc vỡ/tan; kịch tính, sản phẩm. | + |

## B. Nhoè chuyển động (Motion blur)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 9 | Motion blur capture | Bắt chuyển động nhoè; năng lượng, tốc độ. | L |
| 10 | Shot at 1/60s | 1/60 giây; nhoè nhẹ ở tay và chân — tự nhiên. | + |
| 11 | Shot at 1/30s | 1/30 giây; nhoè rõ, cảm giác cầm tay ban đêm. | + |
| 12 | Shot at 1/15s | 1/15 giây; nhoè mạnh, thô, biểu cảm. | + |
| 13 | Subject sharp, background streaked | Chủ thể nét, nền thành vệt; **panning shot** — tốc độ có kiểm soát. | + |
| 14 | Background sharp, subject blurred | Nền nét, chủ thể nhoè; chủ thể "chỉ đi ngang qua thế giới". | + |
| 15 | Partial blur on the hands only | Chỉ tay nhoè; đang làm việc, chi tiết nhất. | + |
| 16 | Blurred crowd, still subject | Đám đông nhoè, chủ thể tĩnh; cô lập giữa nhịp thành phố. | + |
| 17 | Whip-blur transition | Nhoè vút chuyển tiếp; video, chuyển cảnh. | + |
| 18 | Light trails from moving vehicles | Vệt đèn từ xe chạy; đêm đô thị kinh điển. | + |
| 19 | Zoom burst blur | Nhoè do zoom trong lúc phơi sáng; nổ ra từ tâm, kịch tính. | + |
| 20 | Intentional camera shake | Rung máy có chủ đích; hỗn loạn, cảm xúc thô. | + |

## C. Phơi sáng dài (Long exposure)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 21 | Long exposure, 1 second | Phơi sáng 1 giây; nước mềm, đèn thành vệt. | + |
| 22 | Long exposure, 30 seconds | Phơi sáng 30 giây; người biến thành bóng mờ, nước như sương. | + |
| 23 | Multi-minute exposure | Phơi sáng nhiều phút; vệt sao, hoàn toàn siêu thực. | + |
| 24 | Silky smooth water | Nước mượt như lụa; phong cảnh dài phơi. | + |
| 25 | Ghosted figures from long exposure | Bóng người mờ ảo do phơi dài; thời gian và vắng mặt. | + |
| 26 | Star trails | Vệt sao; đêm, quy mô vũ trụ. | + |
| 27 | Light painting | Vẽ bằng ánh sáng; nghệ thuật, trừu tượng. | + |
| 28 | Double exposure | Phơi sáng kép; hai hình ảnh chồng nhau, ẩn dụ. | + |
| 29 | Multiple exposure sequence | Chuỗi phơi sáng nhiều lần; nhiều pha của một chuyển động. | + |
| 30 | Slow sync flash | Flash đồng bộ chậm; chủ thể nét + nền nhoè có màu — party, đêm. | + |

## D. Dành riêng cho video (Video shutter & frame rate)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 31 | 180-degree shutter rule | Quy tắc trập 180 độ (1/48 ở 24fps); **motion blur "đúng phim"** — mặc định điện ảnh. | + |
| 32 | 24fps cinematic frame rate | 24 khung/giây; nhịp điện ảnh chuẩn. | + |
| 33 | 25fps broadcast | 25fps phát sóng (PAL). | + |
| 34 | 30fps standard video | 30fps; sắc hơn, ngôn ngữ web và mạng xã hội. | + |
| 35 | 60fps smooth motion | 60fps mượt; thể thao, demo sản phẩm, cảm giác "video" hơn "phim". | + |
| 36 | 120fps slow motion | 120fps quay chậm; chuyển động chậm 4–5 lần. | + |
| 37 | 240fps ultra slow motion | 240fps siêu chậm; giọt nước, vải, tóc. | + |
| 38 | 1000fps high-speed | 1000fps cao tốc; khoa học, va chạm. | + |
| 39 | Slow motion, half speed | Quay chậm còn một nửa tốc độ; nhấn nhẹ, không cường điệu. | + |
| 40 | Ramping speed, fast to slow | Đổi tốc độ dần, nhanh sang chậm; nhấn cao trào. | + |
| 41 | Ramping speed, slow to fast | Đổi tốc độ chậm sang nhanh; bùng nổ. | + |
| 42 | Time-lapse, hours in seconds | Time-lapse, hàng giờ trong vài giây; mây, đám đông, xây dựng. | + |
| 43 | Hyperlapse, moving time-lapse | Hyperlapse, time-lapse di chuyển; đô thị, hành trình. | + |
| 44 | Stop-motion stepped movement | Chuyển động giật kiểu stop-motion; thủ công, kỳ lạ. | + |
| 45 | Frame-skipping stutter | Nhảy khung gây giật; căng thẳng, kinh dị, glitch. | + |
| 46 | Real-time, no speed change | Thời gian thực, không đổi tốc độ; **an toàn nhất cho AI video**. | + |
| 47 | Reverse motion | Chuyển động ngược; siêu thực, gây chú ý. | + |
| 48 | Freeze then resume | Đứng hình rồi tiếp tục; ngắt nhịp, nhấn mạnh. | + |
| 49 | Rolling shutter jello effect | Hiệu ứng rolling shutter méo; máy rẻ, chân thực thô. | + |
| 50 | Global shutter, no distortion | Global shutter, không méo; kỹ thuật, sạch. | + |

---

## Lưu ý khi viết Shutter & Motion

- **Cho video, `180-degree shutter rule` + `24fps cinematic frame rate` là combo mặc định.** Đó là lý do phim trông như phim. Nếu bỏ, AI dễ cho ra motion blur quá ít (trông như video giám sát) hoặc quá nhiều (trông nhoè lỗi).
- **`Subject sharp, background streaked`** là cách kể "đang di chuyển nhanh" mà vẫn giữ được mặt nhân vật — mạnh hơn `motion blur` chung chung.
- **Nhoè nhẹ làm ảnh thật hơn.** `shot at 1/60s` với một chút nhoè ở tay là dấu hiệu ảnh do người chụp; mọi thứ đóng băng tuyệt đối là dấu hiệu ảnh do máy tính tạo.
- **Với AI video hiện nay, chọn `real-time, no speed change`** trừ khi bạn thật sự cần slow-motion. Đổi tốc độ là vùng dễ ra kết quả kỳ dị.
- **Đừng ghép đóng băng với nhoè.** `freeze-frame` + `motion blur` là mâu thuẫn trực tiếp; AI sẽ chọn ngẫu nhiên một cái.
- **`Light trails from moving vehicles`** đòi hỏi cảnh đêm có xe — phải khớp với [08-environment](08-environment.md) và [09-time-of-day](09-time-of-day.md).
