# REALISM PLAYBOOK — làm ảnh AI không lộ là AI

> **Nguồn:** chắt lọc từ 5 tài liệu AI Video Bootcamp — *The AVB Prompt Framework*, *AI Image Creation Basics in Studio*, *Creating Consistent AI Avatars From Scratch*, và 2 transcript bài giảng (*Prompting*, *Creating AI Avatars*).
> **Vai trò:** đây là phần **nghề** mà `00-MASTER-REFERENCE.md` không chứa. File kia trả lời *"có những tham số nào"*; file này trả lời *"vì sao ảnh của bạn vẫn trông giả dù đã điền đủ tham số"*.
> **Ai đọc:** `06-ai-ops/skills/prompt/realism/SKILL.md` nạp file này ở mọi run có `--realism=max|balanced`.

---

## 1. Ba dấu hiệu lộ ảnh AI — theo đúng thứ tự ưu tiên

Bài giảng liệt kê đúng ba thứ, và thứ tự này quan trọng: hầu hết người viết prompt chỉ xử lý #1 rồi tự hỏi vì sao ảnh vẫn giả.

### #1 — Da nhựa, airbrush

> *"Nobody is perfect and if your avatar is absolutely flawless, it's an obvious tell that it's AI. Skin is the biggest giveaway."*

Không ai hoàn hảo. Da không tì vết, mịn như nhựa là lỗi phổ biến nhất của người mới.

**Neutralise — chọn 2–3, không cần hết:**
```
natural skin pores visible · light skin imperfections · matte skin finish ·
micro skin wrinkles · freckles and minor blemishes · subtle under-eye texture ·
asymmetrical expression · a slightly uneven eyebrow
```

Bài giảng nói thẳng: *"a wonky eyebrow, an asymmetrical face, or anything that makes the person look like an actual human rather than a perfectly crafted robot."* **Bất đối xứng là bạn.**

### #2 — Ánh sáng studio hoàn hảo ở nơi không thể có

> *"This image looks like the woman has a ring light on her face, even though she is outside. It just isn't possible to have perfect studio lighting like that at all times."*

Đây là dấu hiệu **bị bỏ sót nhiều nhất**. Người viết prompt thêm "soft studio lighting" vào mọi cảnh, kể cả cảnh ngoài đường lúc 2 giờ chiều.

**Quy tắc:** ánh sáng phải **khớp tình huống**. Trước khi in prompt, tự hỏi: *"Ở chỗ này, giờ này, nguồn sáng đó có tồn tại được không?"*

| Bối cảnh | Ánh sáng ĐÚNG | Ánh sáng SAI |
|---|---|---|
| Ngoài đường ban ngày | `harsh midday sunlight` · `overcast soft sky` · `open shade` | `ring light` · `studio softbox` · `beauty dish` |
| Phòng ngủ ban ngày | `natural window light through sheer curtain` | `three-point studio lighting` |
| Quán bar ban đêm | `warm tungsten` + `neon spill` + `mixed color temperature` | `high-key bright lighting` |
| Selfie trong nhà buổi tối | `smartphone light illumination` · `TV screen light spill` | `golden hour warm glow` |
| Studio thật (chụp sản phẩm) | `studio softbox key light` ✅ đúng chỗ | — |

**Từ khoá cứu cánh:** `no studio lighting` — bài giảng dùng đúng chữ này trong prompt mẫu.

### #3 — Camera và background hoàn hảo quá mức

> *"Influencer content and realistic content in general is 90% of the time shot on an iPhone without full control of the background. So if your photos look like they are shot on a studio quality camera with perfect framing and an unnaturally perfect background, it just looks off."*

Đây là dấu hiệu **ít ai nghĩ tới nhất**. Ảnh đời thật có nền lộn xộn, khung hình hơi lệch, có vật thừa trong khung.

**Neutralise:**
```
shot on an iPhone 15 · candid scene with natural framing ·
real uncontrolled background · slightly off-centre framing ·
everyday clutter in the background · handheld, slight tilt
```

Bài giảng đối chiếu trực tiếp: cùng một ảnh khách sạn, thêm *"shot on an iPhone 15, candid scene with natural framing"* → *"the difference is massive. Look how the background is natural, like it would be in the normal world."*

> ⚠️ **Ngoại lệ:** ảnh sản phẩm thương mại, campaign cao cấp, ảnh chân dung nghề nghiệp **nên** có camera và nền hoàn hảo. Anchor #3 chỉ áp dụng khi ảnh giả vờ là ảnh đời thường. Đó là lý do `--realism=balanced` tồn tại.

---

## 2. Từ khoá `photorealism` cho GPT Image 2.0

> *"One thing I'd say when using GPT image 2.0 is always to include the word photo realism at the end of the prompt. I saw that top engineers at ChatGPT came out and said this actually holds big weight in terms of the level of realism you get, so there is no harm in adding it."*

- Đặt ở **cuối** prompt, không phải đầu.
- Chỉ áp dụng cho `gpt-image-2`. Với Midjourney, đòn bẩy tương đương là `--style raw`.
- Tắt khi `--realism=off` (anime/3D/illustration không cần).

Trong registry: `models[].realism_keyword: photorealism` + `keyword_position: end`.

---

## 3. Từ khoá độc — không bao giờ sinh ra

> *"Words like cinematic masterpiece, hyper-detailed, ultra-glossy, award-winning, perfect lighting can sometimes push the image into that fake, overly polished AI look."*

```
cinematic masterpiece · hyper-detailed · ultra-glossy · perfect lighting ·
award-winning · 8k ultra HD · trending on artstation · masterpiece · best quality
```

Chúng mô tả **hiệu ứng** chứ không mô tả **chỉ đạo**, nên kéo mô hình về phía trung bình của ảnh render. `/prompt` không bao giờ tự sinh chúng, và verb `enhance` gắn cờ khi thấy chúng trong prompt đầu vào.

**Thay bằng gì:** thay vì `perfect lighting`, mô tả **nguồn + hướng + chất** — `a small warm table lamp on the left side of the frame lighting her face, while the rest of the room falls into soft shadow`.

---

## 4. Kỷ luật reference — nói rõ giữ gì, đổi gì

> *"Beginners often upload a reference but do not explain what the reference is for. The AI might copy the pose when you only wanted the face, or copy the background when you only wanted the outfit."*

Đây là toàn bộ nội dung của `--mode=ref`.

**Mẫu chuẩn (từ tài liệu):**
```
Use the uploaded image as a character reference. Keep the same face, hairstyle,
skin tone, body type, and overall identity, but place her in a luxury hotel lobby
and change her outfit to an elegant black dress.
```

**Bốn ý định reference — phải chọn đúng một:**

| Ý định | Nói gì |
|---|---|
| **Identity** | *preserve the face, hair, skin tone, and body type* |
| **Outfit** | *preserve the clothing, change the location* |
| **Product** | *preserve packaging, logo, shape, colour, and material* |
| **Pose only** | *use this as a pose reference, not an identity reference* |

Cấu trúc câu: **`preserve …` trước, `change …` sau.** Không trộn lẫn.

---

## 5. Cấu trúc prompt cảnh cho avatar nhất quán

Tài liệu đưa đúng công thức này:

```
same woman + location + outfit + camera style + lighting + expression + realism details
```

**Prompt mẫu (nguyên văn từ tài liệu):**
```
realistic iPhone-style photo of the same woman sitting on her bed, red dress,
soft natural daylight, bright room, natural expression, candid lifestyle photo,
realistic skin texture, no studio lighting.
```

Để ý ba thứ ở cuối: `candid lifestyle photo` (anchor #3) · `realistic skin texture` (anchor #1) · `no studio lighting` (anchor #2). **Cả ba anchor đều có mặt trong một prompt 30 từ.** Đó là bằng chứng anchor không làm prompt dài ra.

---

## 6. Quy trình avatar 8 bước (khi mục tiêu là nhân vật tái sử dụng)

1. **Ý tưởng thô** — danh tính, vibe, niche, kiểu nội dung. Đừng xây quá kỹ ngay.
2. **Biến thành prompt chi tiết** — đây chính là việc `/prompt image build` làm.
3. **Sinh loạt đầu** — nhiều bản, không phán xét từ một ảnh.
4. **Soi kỹ trước khi chốt** — da có kết cấu? mắt bình thường? ánh sáng tin được? bất đối xứng người thật?
5. **Loại bỏ dấu hiệu AI** — ba anchor ở §1.
6. **Chọn ảnh reference sạch** — chân dung rõ mặt, ánh sáng tự nhiên. *"A bad reference image leads to a bad result pretty much all of the time."*
7. **Dựng character sheet** — front · side profile · three-quarter · full-body. Tài liệu khuyến nghị **GPT Image 2.0, tỷ lệ 16:9**.
8. **Sinh cảnh mới với cùng người** — `--mode=ref` + công thức §5.

**Nguyên tắc bao trùm:** *"Don't try to create the perfect AI avatar in one generation."* Càng nhiều điểm tham chiếu, càng nhất quán.

---

## 7. Sáu chỉnh sửa khi ảnh ra chưa đúng

Từ tài liệu — bảng chẩn đoán nhanh:

| Triệu chứng | Sửa ở đâu |
|---|---|
| Mặt đẹp nhưng trang phục sai | chỉ sửa phần wardrobe |
| Ảnh trông quá giả | thêm **ngôn ngữ camera và ánh sáng thật** (không phải thêm tính từ) |
| Bố cục sai | sửa chỉ đạo camera/framing |
| Sản phẩm đổi quá nhiều | tăng cường chỉ dẫn reference |
| Kết quả chung chung | một trong 6 phần AVB đang thiếu — không phải lỗi model |
| Prompt dài mà vẫn tệ | dài ≠ tốt; *"a good prompt is a more intentional prompt"* |

---

## 8. Cảnh báo về auto-enhance

> *"The warning is that enhanced prompts can sometimes add extra details you did not ask for. Always check the improved prompt and make sure it still matches your original idea before generating."*

Áp dụng cho chính `/prompt`: verb `enhance` phải **báo cáo đã đổi gì**, không được lặng lẽ thêm chi tiết. Founder phải đọc được diff.

---

## 9. Checklist realism — chạy trước khi in prompt

- [ ] Có ít nhất 2 từ khoá kết cấu da? *(anchor #1)*
- [ ] Nguồn sáng có tồn tại được ở bối cảnh + giờ đó không? *(anchor #2)*
- [ ] Nếu là nội dung đời thường: đã có ngôn ngữ iPhone/candid/nền thật chưa? *(anchor #3)*
- [ ] Không có từ nào trong danh sách độc ở §3?
- [ ] Nếu là GPT Image 2.0: `photorealism` ở cuối?
- [ ] Nếu có reference: đã nói rõ **preserve gì / change gì**?
- [ ] Prompt có *intentional* không, hay chỉ *dài*?

---

*Ba anchor ở §1 được ghim trong `knowledge/prompt-directions.yaml` (`realism_anchors`) và validator L2 từ chối mọi direction bỏ sót một trong ba. Đó là cách file này được bảo vệ khỏi trôi dạt.*
