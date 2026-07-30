<!-- param: negative | order: 28 | label_en: Negative / Avoid List | label_vi: Danh sách loại trừ | group: G | source: new -->

# 28 — Negative / Avoid List (Danh sách loại trừ)

> **Câu hỏi:** *Điều gì **không được** xuất hiện trong ảnh?*
> **Vai trò:** Framework AVB nêu vấn đề nhưng không nêu giải pháp: *"Words like cinematic masterpiece, hyper-detailed, ultra-glossy and perfect lighting can push the image into fake AI territory."* Tham số này là **giải pháp** — một danh sách những thứ cần chủ động loại bỏ.
> **Trạng thái trong link gốc:** ❌ Không có tham số này.
> **Bắt buộc:** ⭕ Tuỳ chọn — nhưng gần như luôn cải thiện kết quả.

> 📌 **Cách sử dụng theo công cụ:**
> – **Midjourney:** `--no <danh sách>`
> – **Stable Diffusion / ComfyUI:** ô *Negative prompt*
> – **GPT-image / Gemini / Nano Banana:** không có ô riêng — hãy viết thành câu tích cực trong prompt: *"da có lỗ chân lông tự nhiên, không airbrush"*, *"bàn tay để trong túi"*, *"không có chữ trong ảnh"*.

---

## A. Chống "nhựa hoá" (Anti-plastic — ưu tiên số 1)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | plastic skin | Da nhựa; lỗi số 1 của ảnh AI có người. | + |
| 2 | airbrushed skin | Da airbrush quá mức; mất hết lỗ chân lông. | + |
| 3 | waxy skin | Da như sáp; bóng và không có kết cấu. | + |
| 4 | over-smoothed face | Mặt bị làm mịn quá; mất nếp, mất tuổi. | + |
| 5 | poreless skin | Da không lỗ chân lông; phi sinh học. | + |
| 6 | doll-like features | Nét như búp bê; đối xứng và tròn quá mức. | + |
| 7 | uncanny valley face | Mặt "thung lũng kỳ dị"; gần thật mà sai. | + |
| 8 | overly symmetrical face | Mặt đối xứng quá mức; mặt thật luôn lệch. | + |
| 9 | glossy highlights on skin | Điểm sáng bóng loáng trên da; dấu hiệu render. | + |
| 10 | perfect teeth | Răng hoàn hảo quá; đều và trắng phi thực tế. | + |
| 11 | mannequin look | Trông như manơcanh; vô hồn, tư thế cứng. | + |
| 12 | 3D render look | Trông như render 3D; khi bạn muốn ảnh chụp. | + |
| 13 | CGI appearance | Vẻ CGI; ánh sáng và bề mặt quá hoàn hảo. | + |
| 14 | video game character | Nhân vật game; tỷ lệ và texture kiểu game. | + |

## B. Lỗi giải phẫu (Anatomy errors)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 15 | extra fingers | Ngón tay thừa; lỗi kinh điển nhất. | + |
| 16 | missing fingers | Thiếu ngón tay. | + |
| 17 | fused fingers | Ngón tay dính liền. | + |
| 18 | deformed hands | Bàn tay biến dạng; **rủi ro cao nhất** — hoặc mô tả rõ, hoặc crop bỏ. | + |
| 19 | extra limbs | Chi thừa (tay/chân). | + |
| 20 | disconnected limbs | Chi bị rời khỏi thân. | + |
| 21 | twisted joints | Khớp xoắn sai hướng. | + |
| 22 | asymmetrical eyes | Hai mắt lệch nhau bất thường. | + |
| 23 | crossed eyes | Mắt lệch trục nhìn. | + |
| 24 | malformed ears | Tai dị dạng. | + |
| 25 | extra teeth | Răng thừa hoặc quá nhiều. | + |
| 26 | distorted face proportions | Tỷ lệ mặt bị méo. | + |
| 27 | unnatural neck length | Cổ dài/ngắn phi thực tế. | + |
| 28 | floating body parts | Bộ phận cơ thể lơ lửng rời. | + |
| 29 | duplicated subject | Chủ thể bị nhân đôi trong khung. | + |

## C. Lỗi chữ & thương hiệu (Text & branding errors)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 30 | gibberish text | Chữ vô nghĩa; lỗi thường gặp trên biển hiệu và bao bì. | + |
| 31 | misspelled words | Chữ sai chính tả. | + |
| 32 | garbled lettering | Ký tự méo mó, không đọc được. | + |
| 33 | random watermark | Watermark ngẫu nhiên; AI học từ ảnh stock. | + |
| 34 | stock photo watermark | Watermark ảnh stock; Getty/Shutterstock giả. | + |
| 35 | fake logo | Logo bịa; rủi ro pháp lý và thẩm mỹ. | + |
| 36 | signature or artist mark | Ký tên hoặc dấu nghệ sĩ; AI học từ tranh. | + |
| 37 | subtitles or captions | Phụ đề không mong muốn. | + |
| 38 | UI elements or borders | Phần tử giao diện hoặc khung viền lạ. | + |
| 39 | frame within frame artifact | Artefact khung trong khung; AI tự thêm viền. | + |
| 40 | collage or split panels | Ghép ảnh hoặc chia ô; khi bạn muốn một khung duy nhất. | + |

## D. Lỗi ánh sáng & kỹ thuật (Lighting & technical errors)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 41 | blown-out highlights | Vùng sáng cháy mất chi tiết. | + |
| 42 | crushed shadows with no detail | Vùng tối mất hết chi tiết (khi không muốn). | + |
| 43 | flat lifeless lighting | Ánh sáng phẳng vô hồn; không có hướng. | + |
| 44 | conflicting light directions | Nhiều hướng sáng mâu thuẫn; bóng đổ không nhất quán. | + |
| 45 | impossible shadows | Bóng đổ phi vật lý. | + |
| 46 | double shadows | Bóng đổ đôi không lý giải được. | + |
| 47 | oversaturated colors | Màu bão hoà quá mức. | + |
| 48 | HDR halos | Vầng sáng HDR quanh viền vật thể. | + |
| 49 | over-sharpened edges | Viền bị làm nét quá; dấu hiệu xử lý số. | + |
| 50 | heavy noise reduction smearing | Nhoè do khử nhiễu quá mạnh; mất chi tiết. | + |
| 51 | banding in the sky | Dải màu đứt trên nền trời. | + |
| 52 | lens flare (unwanted) | Lens flare không mong muốn; khi cần ảnh sạch. | + |
| 53 | out of focus subject | Chủ thể mất nét. | + |
| 54 | motion blur (unwanted) | Nhoè chuyển động không mong muốn. | + |

## E. Chống "AI slop" thẩm mỹ (Anti-slop aesthetics)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 55 | overly staged pose | Tư thế dàn dựng quá lộ; mất tự nhiên. | + |
| 56 | generic stock photo look | Trông như ảnh stock chung chung; vô hồn. | + |
| 57 | fake smile | Nụ cười giả; không tới mắt. | + |
| 58 | cluttered background | Nền rối không có chủ đích. | + |
| 59 | busy distracting details | Chi tiết rối làm phân tán tiêu điểm. | + |
| 60 | random floating particles | Hạt bay ngẫu nhiên; AI hay tự thêm "bụi lấp lánh". | + |
| 61 | unnecessary bokeh balls | Vòng bokeh không cần thiết. | + |
| 62 | excessive lens effects | Hiệu ứng ống kính quá nhiều. | + |
| 63 | oversized eyes | Mắt to quá tỷ lệ; ảnh hưởng từ dữ liệu anime. | + |
| 64 | generic beautiful face | Khuôn mặt "đẹp chung chung"; không có cá tính. | + |
| 65 | Instagram filter look | Trông như đã qua filter Instagram. | + |
| 66 | overly warm orange grade | Grade cam ấm quá tay. | + |
| 67 | teal-orange cliché | Sáo mòn teal-orange; khi muốn màu riêng. | + |
| 68 | wet glossy surfaces everywhere | Mọi bề mặt đều bóng ướt; lỗi mặc định của AI. | + |
| 69 | flawless perfect environment | Môi trường hoàn hảo không vết; phi thực tế. | + |
| 70 | brand-new pristine objects | Vật thể mới nguyên không dấu dùng; thiếu câu chuyện. | + |

## F. Nội dung không mong muốn (Unwanted content)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 71 | additional people in background | Người phụ ở nền không mong muốn. | + |
| 72 | crowd (when solitude is wanted) | Đám đông khi muốn sự đơn độc. | + |
| 73 | modern objects in a period scene | Vật hiện đại trong cảnh thời xưa; lỗi anachronism. | + |
| 74 | visible camera or crew | Thấy máy quay hoặc đoàn phim (khi không muốn). | + |
| 75 | reflection of the photographer | Phản chiếu của người chụp trong gương/kính. | + |
| 76 | cars or traffic | Xe cộ khi muốn cảnh vắng. | + |
| 77 | power lines and clutter | Dây điện và vật rối trên nền trời. | + |
| 78 | animals (when unwanted) | Động vật không mong muốn. | + |
| 79 | food stains or mess | Vết bẩn thức ăn khi cần cảnh sạch. | + |
| 80 | jewelry (when a clean look is wanted) | Trang sức khi cần vẻ tối giản. | + |

## G. Từ khoá "độc" nên tránh trong prompt tích cực

> Đây **không phải** negative prompt — mà là danh sách những từ bạn **đừng viết vào prompt chính** nếu mục tiêu là chân thực. Framework AVB gọi thẳng tên bốn cái đầu.

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 81 | "cinematic masterpiece" | Framework cảnh báo trực tiếp; đẩy về ảnh render. | + |
| 82 | "hyper-detailed" | Framework cảnh báo trực tiếp; quá nhiều chi tiết = giả. | + |
| 83 | "ultra-glossy" | Framework cảnh báo trực tiếp; bóng loáng = nhựa. | + |
| 84 | "perfect lighting" | Framework cảnh báo trực tiếp; ánh sáng thật không hoàn hảo. | + |
| 85 | "8k ultra HD" | Không mang thông tin thị giác; chỉ đẩy về vẻ render. | + |
| 86 | "award-winning photography" | Sáo, kéo về trung bình của ảnh contest. | + |
| 87 | "trending on artstation" | Kéo về concept art số, không phải ảnh chụp. | + |
| 88 | "highly detailed, intricate" | Nhồi chi tiết vô nghĩa. | + |
| 89 | "beautiful, stunning, gorgeous" | Tính từ khen không mô tả gì cụ thể. | + |
| 90 | "professional, high quality" | Rỗng nghĩa; mô hình không biết phải làm gì. | + |

---

## Lưu ý khi viết Negative Prompt

- **Bộ 5 mặc định cho mọi ảnh có người:**
  `plastic skin, airbrushed skin, extra fingers, deformed hands, gibberish text`
  Năm cái này chiếm phần lớn lỗi thực tế.
- **Với công cụ không có ô negative** (GPT-image, Gemini, Nano Banana), hãy **dịch sang câu tích cực** — đó là cách duy nhất hiệu quả:
  – ~~`no plastic skin`~~ → `natural skin pores visible, matte skin finish, light skin imperfections`
  – ~~`no deformed hands`~~ → `hands in pockets` hoặc `hands hidden out of frame`
  – ~~`no gibberish text`~~ → `no text anywhere in the image, blank unbranded label`
- **Đừng liệt kê 40 từ negative.** Sau khoảng 10–15 từ, hiệu quả biên giảm mạnh và bạn bắt đầu vô tình loại bỏ những thứ mình muốn.
- **Negative không sửa được prompt tích cực yếu.** Nếu ảnh trông chung chung, vấn đề nằm ở [01-subject](01-subject.md), [08-environment](08-environment.md) hoặc [19-lighting](19-lighting.md) — không phải ở đây. Framework nói rõ: *"If a result looks generic, do not blame the model first. Check which part of the framework was missing or unclear."*
- **Bảng G quan trọng hơn bảng A–F.** Không viết `hyper-detailed` ngay từ đầu tốt hơn nhiều so với viết nó rồi cố loại bỏ hậu quả bằng negative prompt.
