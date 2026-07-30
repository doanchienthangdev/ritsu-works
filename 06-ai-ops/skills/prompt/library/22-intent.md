<!-- param: intent | order: 22 | label_en: Intent / Use Case | label_vi: Mục đích sử dụng | group: E | source: notion+expanded -->

# 22 — Intent / Use Case (Mục đích sử dụng)

> **Câu hỏi:** *Bức ảnh này dùng để làm gì?*
> **Vai trò:** Đây là tham số **meta** — nó không mô tả nội dung khung hình mà mô tả **công việc** bức ảnh phải làm. Nêu intent giúp AI tự chọn hàng loạt quy ước mà bạn không phải viết ra (tỷ lệ, mật độ, chỗ cho chữ, mức bóng bẩy).
> **Bắt buộc:** ⭕ Tuỳ chọn — nhưng là **cách nén prompt hiệu quả nhất**: một từ intent thay được năm câu mô tả.
> **Cột `Src`:** `L` = có trong link Notion · `+` = bổ sung.

**Cách dùng:** Chọn **1 intent**, đặt ở đầu hoặc cuối prompt. Nếu intent xung đột với các tham số khác, các tham số cụ thể sẽ thắng — nên dùng intent làm "khung định hướng" chứ không phải "lệnh cuối".

---

## A. Thời trang & xa xỉ

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | Luxury brand campaign | Campaign thương hiệu xa xỉ; tiết chế, ánh sáng kiểm soát, nhiều khoảng trống. | L |
| 2 | High-fashion editorial | Editorial high-fashion; phá quy tắc, ưu tiên nghệ thuật hơn thương mại. | L |
| 3 | Fashion lookbook image | Ảnh lookbook; trang phục là chủ đề, nền tối giản, toàn thân. | L |
| 4 | Magazine cover shot | Ảnh bìa tạp chí; chính diện, chỗ cho tên báo và tiêu đề. | L |
| 5 | High-end jewelry campaign | Campaign trang sức cao cấp; macro, ánh kim, đèn kiểm soát. | L |
| 6 | Perfume advertisement | Quảng cáo nước hoa; trừu tượng, gợi cảm tiết chế, ánh sáng thơ. | L |
| 7 | Fragrance close-up ad | Quảng cáo nước hoa cận cảnh; chai + da + phản chiếu. | L |
| 8 | High-end watch campaign | Campaign đồng hồ cao cấp; macro, kim loại, chính xác. | L |
| 9 | Streetwear drop campaign | Campaign ra mắt streetwear; đường phố, thái độ, nhóm. | L |
| 10 | Luxury automotive ad | Quảng cáo xe sang; đường cong thân xe, phản chiếu môi trường. | L |
| 11 | Beauty campaign hero image | Ảnh hero campaign beauty; da hoàn hảo có kiểm soát, cận mặt. | + |
| 12 | Runway documentation | Ghi hình sàn diễn; tele, bắt bước đi. | + |

## B. Thương mại & sản phẩm

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 13 | Commercial product ad | Quảng cáo sản phẩm thương mại; sản phẩm rõ, nền sạch. | L |
| 14 | Skincare advertisement | Quảng cáo skincare; kết cấu da + kết cấu sản phẩm. | L |
| 15 | Fitness supplement ad | Quảng cáo thực phẩm bổ sung; cơ thể + bao bì + năng lượng. | L |
| 16 | Corporate branding image | Ảnh nhận diện doanh nghiệp; trung tính, đáng tin. | L |
| 17 | Tech startup branding | Nhận diện startup công nghệ; sạch, sáng, hiện đại. | L |
| 18 | High-impact billboard ad | Quảng cáo biển lớn; một ý duy nhất, đọc được ở 50m. | L |
| 19 | Real estate luxury listing | Rao bán bất động sản cao cấp; rộng, sáng, không người. | L |
| 20 | Investment ad creative | Creative quảng cáo đầu tư; uy tín, biểu đồ, tin cậy. | L |
| 21 | E-commerce product listing | Ảnh sản phẩm sàn TMĐT; nền trắng, chính diện, không bóng lạ. | + |
| 22 | Amazon / marketplace main image | Ảnh chính marketplace; sản phẩm chiếm 85% khung, nền trắng thuần. | + |
| 23 | Packaging mockup | Mockup bao bì; góc 3/4, ánh sáng đều, nhãn đọc được. | + |
| 24 | Food & beverage commercial | Quảng cáo đồ ăn/uống; tươi, hơi nóng hoặc lạnh, macro. | + |
| 25 | B2B SaaS website hero | Hero trang web SaaS B2B; sạch, có chỗ cho chữ, giao diện. | + |
| 26 | Print catalogue spread | Trang catalogue in; nhất quán, đủ chi tiết ở độ phân giải in. | + |

## C. Mạng xã hội & nội dung

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 27 | Social media UGC | UGC mạng xã hội; hơi thô, tự nhiên, như bạn bè chụp. | L |
| 28 | Viral TikTok thumbnail | Thumbnail TikTok viral; 9:16, mặt lớn, tương phản cao. | L |
| 29 | Viral meme content | Nội dung meme viral; đơn giản, kỳ, dễ nhận ra. | L |
| 30 | AI influencer content | Nội dung influencer AI; nhất quán nhân vật là ưu tiên. | L |
| 31 | Personal brand photoshoot | Buổi chụp thương hiệu cá nhân; uy tín + gần gũi. | L |
| 32 | Podcast cover image | Ảnh bìa podcast; vuông, mặt + tên, đọc được ở cỡ nhỏ. | L |
| 33 | Course sales page hero | Hero trang bán khoá học; người dạy + chỗ cho headline. | L |
| 34 | Skool community promo | Quảng bá cộng đồng Skool; nhóm, thân thiện. | L |
| 35 | AI course advertisement | Quảng cáo khoá học AI; công nghệ + người + kết quả. | L |
| 36 | Elite mastermind promo | Quảng bá mastermind cao cấp; địa vị, nhóm nhỏ, đắt. | L |
| 37 | Motivational poster aesthetic | Aesthetic poster động lực; hùng vĩ + chỗ cho câu quote. | L |
| 38 | YouTube thumbnail | Thumbnail YouTube; 16:9, mặt biểu cảm mạnh, 3 màu chính. | + |
| 39 | Instagram carousel slide | Slide carousel Instagram; 4:5, nhất quán bộ, chỗ cho chữ. | + |
| 40 | Reels / Shorts cover frame | Frame bìa Reels/Shorts; 9:16, vùng an toàn giữa. | + |
| 41 | LinkedIn professional headshot | Ảnh chân dung LinkedIn; ngang ngực, nền sạch, đáng tin. | + |
| 42 | Email newsletter header | Header email newsletter; ngang rộng, nhẹ, chỗ cho logo. | + |
| 43 | Paid ad creative, A/B variant | Creative quảng cáo trả phí cho A/B test; một biến thay đổi. | + |

## D. Điện ảnh & kể chuyện

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 44 | Cinematic film still | Frame phim điện ảnh; letterbox, grade, có câu chuyện. | L |
| 45 | Movie poster aesthetic | Aesthetic poster phim; bố cục nhân vật, chỗ cho tên. | L |
| 46 | Character introduction scene | Cảnh giới thiệu nhân vật; góc thấp, reveal. | L |
| 47 | Dark villain reveal | Hé lộ phản diện tối; underlighting, bóng. | L |
| 48 | Inspirational hero moment | Khoảnh khắc anh hùng truyền cảm hứng; ngược sáng, góc thấp. | L |
| 49 | Dramatic teaser scene | Cảnh teaser kịch tính; thiếu thông tin có chủ đích. | L |
| 50 | High-drama cinematic trailer | Trailer điện ảnh cao trào; nhiều nhịp, tương phản. | L |
| 51 | Character backstory portrait | Chân dung kể quá khứ nhân vật; đạo cụ và vết tích. | L |
| 52 | Hollywood biopic still | Frame phim tiểu sử Hollywood; thời đại chính xác. | L |
| 53 | Superhero origin scene | Cảnh khởi nguyên siêu anh hùng; quy mô, ánh sáng thiêng. | L |
| 54 | Music album cover | Bìa album nhạc; vuông, nghệ thuật, tuyên ngôn. | L |
| 55 | NFT character reveal | Hé lộ nhân vật NFT; chính diện, nền đồ hoạ. | L |
| 56 | Dark fantasy artwork | Artwork fantasy tối; kỳ ảo, chi tiết, không thực. | L |
| 57 | High-tech futuristic ad | Quảng cáo tương lai công nghệ cao; sạch, phát sáng. | L |
| 58 | Book cover illustration | Minh hoạ bìa sách; dọc, một ý mạnh, chỗ cho tên tác giả. | + |
| 59 | Storyboard frame | Frame storyboard; rõ ràng về khối, không cần hoàn thiện. | + |
| 60 | Concept art for a world | Concept art dựng thế giới; rộng, giàu chi tiết, khí quyển. | + |

## E. Tài liệu, thể thao & tin tức

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 61 | Documentary realism | Hiện thực tài liệu; không dàn dựng, ánh sáng sẵn có. | L |
| 62 | Survival documentary shot | Ảnh tài liệu sinh tồn; khắc nghiệt, thô, thời tiết. | L |
| 63 | Documentary war scene | Cảnh tài liệu chiến tranh; nghiêm túc, cân nhắc kỹ. | L |
| 64 | Sports performance promo | Quảng bá thành tích thể thao; đỉnh động tác, mồ hôi. | L |
| 65 | Fitness transformation ad | Quảng cáo chuyển hoá thể hình; trước–sau, cùng ánh sáng. | L |
| 66 | Political campaign visual | Hình ảnh vận động chính trị; uy tín, đám đông, cờ. | L |
| 67 | Travel tourism campaign | Campaign du lịch; địa danh + người trải nghiệm. | L |
| 68 | Photojournalism single image | Ảnh báo chí đơn; kể trọn một câu chuyện trong một khung. | + |
| 69 | Event coverage | Ghi hình sự kiện; nhanh, nhiều bối cảnh, ánh sáng khó. | + |
| 70 | NGO / social impact campaign | Campaign phi lợi nhuận/tác động xã hội; tôn trọng, chân thực. | + |

## F. Kỹ thuật & nội bộ (bổ sung)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 71 | Reference image for consistency | Ảnh tham chiếu để giữ nhất quán nhân vật; chính diện, sáng đều. | + |
| 72 | Style exploration / moodboard | Khám phá phong cách / moodboard; nhiều biến thể, không cần hoàn thiện. | + |
| 73 | Texture / material study | Nghiên cứu kết cấu/vật liệu; macro, ánh sáng cạnh. | + |
| 74 | Background plate for compositing | Nền để ghép hậu kỳ; không chủ thể, phối cảnh rõ. | + |
| 75 | Character turnaround sheet | Bản vẽ nhân vật nhiều góc; nhất quán tuyệt đối. | + |
| 76 | UI / app screen mockup context | Ngữ cảnh mockup giao diện app; thiết bị + tay + môi trường. | + |
| 77 | Presentation slide visual | Hình cho slide thuyết trình; đơn giản, chỗ cho chữ, không nhiễu. | + |
| 78 | Print poster, large format | Poster in khổ lớn; chi tiết cao, tương phản chịu được in. | + |
| 79 | Merchandise / apparel print | In lên hàng hoá/áo; nền trong, đồ hoạ, ít màu. | + |
| 80 | Stock-library image | Ảnh cho thư viện stock; trung tính, đa dụng, không thương hiệu. | + |

---

## Lưu ý khi viết Intent

- **Intent là công cụ nén prompt tốt nhất.** `Amazon / marketplace main image` một mình đã hàm ý nền trắng thuần, sản phẩm chính diện, không bóng lạ, tỷ lệ vuông — bốn câu mô tả trong một cụm.
- **Intent quyết định tỷ lệ và chỗ cho chữ.** Nếu bạn chọn `viral TikTok thumbnail`, hãy kèm luôn `9:16` ở [27-output-spec](27-output-spec.md) và `vertical safe zone` ở [18-composition](18-composition.md).
- **Intent điều chỉnh mức "bóng bẩy".** `Social media UGC` và `Luxury brand campaign` là hai đầu đối lập của cùng một thang: UGC cần *kém* hoàn hảo hơn, luxury cần *kiểm soát* hơn. Đừng ghép cả hai.
- **Intent thương mại thì nói rõ chủ thể bán gì.** `commercial product ad` mà không có [06-product-subject](06-product-subject.md) sẽ cho ra một sản phẩm bịa.
- **Cân nhắc nội dung nhạy cảm.** `documentary war scene`, `political campaign visual`, `dark villain reveal` có thể vướng chính sách của nền tảng tạo ảnh — nêu rõ tính chất tài liệu/hư cấu để tránh bị chặn.
