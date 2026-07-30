<!-- generated-by: build script from the 28 per-parameter files in this folder. Do not hand-edit value lists — edit the per-parameter file and regenerate. -->

# BỘ THAM SỐ FULL PROMPT TẠO ẢNH — FILE THAM CHIẾU CHÍNH

> **Đây là file số 1 của bộ artifact.** Nó liệt kê **toàn bộ 28 tham số** và **toàn bộ 2,264 giá trị khả dụng** của từng tham số, để dùng làm nguồn tra cứu khi build hoặc enhance một prompt tạo ảnh từ ý tưởng đầu vào.
>
> Mỗi tham số có **một file riêng** trong cùng thư mục, chứa bảng giải nghĩa từng giá trị bằng tiếng Việt. Cột `Chi tiết` bên dưới dẫn tới file đó.

**Nguồn:**
1. Notion — *PromptTemplate* (`beryl-freckle-b85.notion.site/PromptTemplate-3ad302d8792c80dcb3dad9abe59bd795`): 12 tham số, **632 giá trị**. Trong đó `Facial Expression` và `Gesture` **chỉ có tên, không có giá trị nào**.
2. PDF — *AI Video Bootcamp: The AVB Prompt Framework* (13 trang): framework 6 phần Subject · Environment · Camera · Lighting · Mood · Style, công thức prompt, và checklist.

**Trạng thái bổ sung:**

| | Số lượng |
|---|---|
| Tham số trong link gốc | 12 |
| Tham số sau khi bổ sung | **28** |
| Giá trị trong link gốc | 632 |
| Giá trị giữ lại từ link (kể cả trích dẫn chéo) | 661 |
| Giá trị bổ sung mới | **1,603** |
| **Tổng giá trị** | **2,264** |

✅ **100% (632/632) giá trị của link gốc đều có mặt** trong bộ này, đã được phân loại lại vào đúng trục tham số.

---

## 1. Khung tư duy: 6 phần của AVB Framework

Framework gốc trong PDF dùng 6 phần làm "kim chỉ nam sáng tạo". Toàn bộ 28 tham số dưới đây là phần **triển khai chi tiết** của 6 phần đó:

| Phần AVB | Câu hỏi | Tham số triển khai |
|---|---|---|
| **1. Subject** | Ai / cái gì trong khung? | 01 · 02 · 03 · 04 · 05 · 06 · 07 |
| **2. Environment** | Chuyện xảy ra ở đâu? | 08 · 09 · 10 · 11 |
| **3. Camera** | Chúng ta nhìn nó thế nào? | 12 · 13 · 14 · 15 · 16 · 17 · 18 |
| **4. Lighting** | Nguồn sáng là gì? | 19 · 20 |
| **5. Mood** | Nó nên cảm giác thế nào? | 21 · 22 |
| **6. Style** | Thành phẩm nên trông thế nào? | 23 · 24 · 25 · 26 |
| *(mở rộng)* **Output** | File dùng ở đâu, cần loại bỏ gì? | 27 · 28 |

> Nguyên tắc cốt lõi của framework: *"Prompting là chỉ đạo, không phải mô tả."* Càng ít chỉ đạo, AI càng phải tự điền vào chỗ trống — và khi AI điền, nó luôn chọn phương án **trung bình nhất** của ý tưởng.
> Và: *"Khi một prompt không hiệu quả, thường là vì một hoặc nhiều trong 6 phần này đang thiếu, yếu, hoặc không rõ ràng."*

---

## 2. Công thức prompt

**Công thức gốc trong PDF (dùng khi viết từ đầu):**

```
[Subject] in [environment], [camera angle or framing], [lighting source and direction], [mood], [visual style].
```

**Ví dụ trong PDF:**
> *A candid photo of a tired chef in his early 50s wiping down the counter of a tiny ramen shop in Tokyo after midnight, medium close-up from across the counter, warm overhead light reflecting off stainless steel, quiet and exhausted mood, realistic 35mm documentary photo.*

**Công thức mở rộng (dùng toàn bộ 28 tham số — thứ tự khuyến nghị):**

```
[intent] · [medium nếu không phải ảnh] ·
[subject: casting + wardrobe + expression + pose] đang [action] ·
trong [environment] vào [time-of-day], [weather/atmosphere], có [props] ·
[shot size + angle], [lens], [camera body / film stock], [aperture + focus point], [motion] ·
[camera movement — chỉ cho video] ·
[composition + copy space] ·
[lighting: nguồn + hướng + chất] · [color palette / grade] ·
[texture 2-3 giá trị] · [post-processing artefacts 1-3 giá trị] ·
[mood: 1-2 từ] · [style: 0-2 giá trị] ·
[aspect ratio + text rule] · [negative / avoid]
```

**Cho video — thêm chuyển động theo 3 mệnh đề:**

```
(1) camera làm gì · (2) môi trường làm gì · (3) chủ thể làm gì
```
> Ví dụ trong PDF: *"The camera slowly pushes in. Steam rises from the bowl. He looks down, exhales, then glances toward the door."* — Giữ chuyển động **đơn giản và cụ thể**.

---

## 3. Bảng chỉ mục 28 tham số

| # | Tham số (EN) | Tiếng Việt | Nhóm | Bắt buộc | Giá trị | Từ link | Bổ sung | Chi tiết |
|---|---|---|---|---|---|---|---|---|
| 01 | Subject | Chủ thể | A | ✅ Luôn. | 100 | 50 | 50 | [→](01-subject.md) |
| 02 | Casting & Appearance | Ngoại hình & tuyển chọn | A | ⚠️ Rất nên khi chủ thể là người.… | 100 | 0 | 100 | [→](02-casting-appearance.md) |
| 03 | Facial Expression | Biểu cảm mặt | A | ⚠️ Rất nên khi có mặt người trong… | 104 | 0 | 104 | [→](03-facial-expression.md) |
| 04 | Gesture & Pose | Dáng & động tác | A | ⚠️ Rất nên khi có người trong khu… | 105 | 0 | 105 | [→](04-gesture-pose.md) |
| 05 | Wardrobe & Styling | Trang phục & tạo mẫu | A | ⚠️ Rất nên với chủ thể người. | 103 | 0 | 103 | [→](05-wardrobe-styling.md) |
| 06 | Product Subject Spec | Đặc tả sản phẩm | A | ✅ Bắt buộc khi chủ thể là sản phẩ… | 95 | 0 | 95 | [→](06-product-subject.md) |
| 07 | Action & Narrative Beat | Hành động & nhịp truyện | A | ⚠️ Bắt buộc cho video · tuỳ chọn… | 80 | 0 | 80 | [→](07-action-beat.md) |
| 08 | Environment | Bối cảnh / địa điểm | B | ✅ Luôn. | 110 | 50 | 60 | [→](08-environment.md) |
| 09 | Time of Day | Thời điểm trong ngày | B | ⚠️ Rất nên cho cảnh ngoài trời ho… | 30 | 0 | 30 | [→](09-time-of-day.md) |
| 10 | Weather & Atmosphere | Thời tiết & khí quyển | B | ⭕ Tuỳ chọn | 55 | 0 | 55 | [→](10-weather-atmosphere.md) |
| 11 | Props & Set Dressing | Đạo cụ & dựng cảnh | B | ⭕ Tuỳ chọn | 80 | 0 | 80 | [→](11-props-set-dressing.md) |
| 12 | Camera — Shot, Angle & Framing | Cỡ cảnh, góc & khung | C | ✅ Luôn. | 72 | 50 | 22 | [→](12-camera-shot.md) |
| 13 | Camera Lens | Ống kính | C | ⭕ Tuỳ chọn | 63 | 50 | 13 | [→](13-camera-lens.md) |
| 14 | Camera Body & Film Stock | Thân máy & chất phim | C | ⭕ Tuỳ chọn | 55 | 0 | 55 | [→](14-camera-body-film.md) |
| 15 | Aperture, Depth & Focus | Khẩu độ, chiều sâu & nét | C | ⭕ Tuỳ chọn | 50 | 6 | 44 | [→](15-focus-depth.md) |
| 16 | Shutter & Motion Rendering | Tốc trập & thể hiện chuyển động | C | ⭕ Tuỳ chọn cho ảnh tĩnh · ⚠️ Rất… | 50 | 2 | 48 | [→](16-motion-shutter.md) |
| 17 | Camera Movement | Chuyển động camera | C | ✅ Bắt buộc cho video · ⭕ Bỏ qua c… | 55 | 40 | 15 | [→](17-camera-movement.md) |
| 18 | Composition & Layout | Bố cục & sắp xếp | C | ⭕ Tuỳ chọn | 60 | 10 | 50 | [→](18-composition.md) |
| 19 | Lighting | Ánh sáng | D | ✅ Luôn. Đây là tham số quan trọng… | 100 | 50 | 50 | [→](19-lighting.md) |
| 20 | Color Palette & Grade | Bảng màu & màu phim | D | ⭕ Tuỳ chọn | 64 | 9 | 55 | [→](20-color-palette.md) |
| 21 | Mood | Cảm xúc / không khí | E | ✅ Luôn | 212 | 192 | 20 | [→](21-mood.md) |
| 22 | Intent / Use Case | Mục đích sử dụng | E | ⭕ Tuỳ chọn | 80 | 50 | 30 | [→](22-intent.md) |
| 23 | Style | Phong cách hình ảnh | F | ⭕ ⭕ Tuỳ chọn | 80 | 50 | 30 | [→](23-style.md) |
| 24 | Art Medium & Technique | Chất liệu & kỹ thuật nghệ thuật | F | ⭕ Bỏ trống nếu muốn ảnh nhiếp ảnh… | 75 | 0 | 75 | [→](24-art-medium.md) |
| 25 | Texture & Surface Detail | Kết cấu & chi tiết bề mặt | F | ⚠️ Rất nên | 81 | 50 | 31 | [→](25-texture.md) |
| 26 | Post-processing & Optical Artefacts | Hậu kỳ & dấu vết quang học | F | ⭕ Tuỳ chọn | 60 | 2 | 58 | [→](26-post-processing.md) |
| 27 | Output Spec — Ratio, Resolution & Text | Đặc tả đầu ra — tỷ lệ, phân giải & chữ | G | ✅ Thực tế | 55 | 0 | 55 | [→](27-output-spec.md) |
| 28 | Negative / Avoid List | Danh sách loại trừ | G | ⭕ Tuỳ chọn | 90 | 0 | 90 | [→](28-negative-prompt.md) |

**Nhóm:** **A** = SUBJECT · **B** = ENVIRONMENT · **C** = CAMERA · **D** = LIGHT · **E** = FEEL · **F** = LOOK · **G** = OUTPUT

---

## 4. Toàn bộ giá trị của từng tham số

> Mỗi mục dưới đây là **danh sách đầy đủ** giá trị khả dụng, nhóm theo tiểu mục. Muốn biết nghĩa từng giá trị, mở file chi tiết ở cuối mỗi mục.


## Nhóm A — SUBJECT

*Chủ thể — ai/cái gì trong khung*

### 01. Subject — *Chủ thể*  `(100 giá trị)`

**Câu hỏi:** Ai / cái gì nằm trong khung hình?  
**Bắt buộc:** ✅ Luôn phải có.

**A. Người — archetype thương mại / mạng xã hội** (50)

Female fashion model · Male fashion model · Lifestyle influencer · UGC content creator · Beauty influencer · Fitness influencer · Luxury brand model · Commercial campaign model · High-fashion editorial model · Social media creator · Realistic AI avatar · Digital influencer persona · Skincare brand ambassador · Streetwear model · Corporate professional · Tech product reviewer · Luxury lifestyle influencer · Minimalist fashion creator · Confident brand spokesperson · Modern entrepreneur · Everyday relatable creator · High-end jewelry model · Fragrance campaign model · Personal brand founder · Health and wellness influencer · Travel content creator · Glamorous editorial figure · Fitness model · Podcast host personality · Luxury product ambassador · Contemporary fashion muse · Clean aesthetic lifestyle creator · Professional spokesperson · High-status business figure · Modern luxury consumer · Online course creator persona · High-end cosmetic model · Gen Z social creator · Premium brand representative · Digital marketing personality · Influencer-style avatar · Studio campaign model · Street-style influencer · High-conversion ad presenter · Skincare testimonial creator · Fashion lookbook model · E-commerce product presenter · Lifestyle brand ambassador · Realistic social media persona · Commercial advertising model

**B. Người — vai trò / nghề nghiệp / đời thường (bổ sung)** (20)

Barista at work · Chef in a kitchen · Street vendor · Construction worker · Doctor / nurse in clinic · Athlete mid-performance · Musician performing · Artist in a studio · Student studying · Teacher in a classroom · Software engineer at desk · Elderly person portrait · Child playing · Teenager candid · Family group · Couple interacting · Crowd of people · Silhouetted lone figure · Dancer mid-movement · Soldier / uniformed figure

**C. Sản phẩm & vật thể (bổ sung)** (20)

Cosmetic bottle product · Skincare tube / jar · Perfume bottle · Wristwatch · Jewelry piece · Sneaker / footwear · Handbag / leather goods · Smartphone / gadget · Laptop / workstation · Beverage can / bottle · Coffee cup · Plated food dish · Fresh ingredients · Supplement packaging · Book / printed material · Packaging box / unboxing · Furniture piece · Car / vehicle · Motorbike / scooter · Abstract 3D object

**D. Cảnh vật, sinh vật & phi vật thể (bổ sung)** (10)

Domestic animal / pet · Wild animal · Bird in flight · Plant / flower close-up · Natural landscape · Cityscape / skyline · Architectural detail · Interior space (no people) · Fictional creature / character · Text / typographic subject

→ Giải nghĩa từng giá trị: **[01-subject.md](01-subject.md)**

---

### 02. Casting & Appearance — *Ngoại hình & tuyển chọn*  `(100 giá trị)`

**Câu hỏi:** Chủ thể người đó  
**Bắt buộc:** ⚠️ Rất nên có khi chủ thể là người. Bỏ trống ⇒ AI mặc định về "người mẫu quảng cáo trung bình".

**A. Tuổi (Age band)** (14)

Young child (4–8) · Pre-teen (9–12) · Teenager (13–17) · Early twenties · Mid twenties · Late twenties · Early thirties · Mid thirties · Early forties · Late forties · Fifties · Sixties · Elderly (70+) · Age-ambiguous adult

**B. Hình thể (Body type & build)** (11)

Slim build · Slender and tall · Athletic build · Muscular build · Lean and toned · Average build · Curvy build · Plus-size · Petite frame · Broad-shouldered · Wiry and compact

**C. Tông da (Skin tone) & sắc tộc** (17)

Fair / porcelain skin · Light skin with cool undertone · Light skin with warm undertone · Olive skin · Tan / sun-kissed skin · Medium brown skin · Deep brown skin · Rich dark skin · East Asian features · Southeast Asian features · South Asian features · Middle Eastern features · Black / African features · Latina / Hispanic features · Northern European features · Mediterranean features · Mixed-heritage features

**D. Tóc (Hair — độ dài, kiểu, màu, kết cấu)** (27)

Buzz cut · Short cropped hair · Short messy hair · Slicked-back hair · Side-parted hair · Chin-length bob · Shoulder-length hair · Long straight hair · Long wavy hair · Tight curls · Afro hair · Braided hair · Dreadlocks · High ponytail · Low bun · Messy topknot · Wet-look hair · Wind-blown hair · Jet black hair · Dark brown hair · Light brown hair · Blonde hair · Platinum / silver hair · Red / auburn hair · Grey / salt-and-pepper hair · Dyed pastel hair · Vivid dyed hair

**E. Râu & lông mặt (Facial hair)** (7)

Clean-shaven · Light stubble · Heavy stubble · Full beard · Trimmed beard · Moustache only · Goatee

**F. Đặc điểm nhận dạng & chăm chút (Distinguishing features & grooming)** (24)

Light freckles · Beauty mark / mole · Visible scar · Sharp jawline · Soft rounded features · High cheekbones · Deep-set eyes · Striking green eyes · Dark expressive eyes · Thick eyebrows · Full lips · Gap-toothed smile · Visible tattoos · Pierced ears / nose · Wearing glasses · Wearing sunglasses · Natural bare-faced look · Light natural makeup · Bold editorial makeup · Glossy dewy skin finish · Matte skin finish · Sweaty / post-workout · Weathered / sun-worn skin · Manicured hands

→ Giải nghĩa từng giá trị: **[02-casting-appearance.md](02-casting-appearance.md)**

---

### 03. Facial Expression — *Biểu cảm mặt*  `(104 giá trị)`

**Câu hỏi:** Mặt chủ thể đang nói điều gì?  
**Bắt buộc:** ⚠️ Rất nên có khi có mặt người trong khung, đặc biệt ở close-up.

**A. Trung tính & nền (Neutral / base)** (8)

Neutral expression · Relaxed face · Calm and composed · Blank stare · Soft resting face · Stoic expression · Deadpan · Unreadable expression

**B. Tích cực & thân thiện (Positive / warm)** (17)

Subtle smile · Slight smirk · Warm genuine smile · Broad open smile · Laughing openly · Mid-laugh candid · Giggling · Smiling with eyes closed · Beaming with joy · Content and satisfied · Grateful expression · Affectionate gaze · Playful grin · Mischievous look · Flirtatious glance · Charming half-smile · Reassuring smile

**C. Tự tin & quyền lực (Confidence / power)** (10)

Confident direct gaze · Steely determined look · Intense focused stare · Commanding expression · Defiant look · Smug satisfaction · Fierce editorial glare · Quiet authority · Proud expression · Unbothered and cool

**D. Suy tư & nội tâm (Thoughtful / introspective)** (11)

Pensive expression · Contemplative gaze · Lost in thought · Distant faraway look · Curious expression · Focused concentration · Analytical squint · Skeptical raised eyebrow · Hesitant expression · Resigned acceptance · Nostalgic softness

**E. Buồn & tổn thương (Sadness / vulnerability)** (12)

Sad expression · Melancholic look · On the verge of tears · Silent crying · Sobbing openly · Grief-stricken · Vulnerable and exposed · Weary and exhausted · Defeated look · Lonely expression · Hollow and vacant · Quiet longing

**F. Căng thẳng, lo & sợ (Tension / fear)** (13)

Worried expression · Anxious and tense · Nervous smile · Startled expression · Alarmed look · Frightened expression · Terrified face · Paranoid glance · Suspicious side-eye · Guarded expression · Uncomfortable grimace · Pained expression · Holding back emotion

**G. Tức giận & thù địch (Anger / hostility)** (10)

Annoyed expression · Frustrated look · Frowning deeply · Stern disapproval · Angry expression · Furious rage · Cold contempt · Menacing glare · Gritted teeth effort · Disgusted expression

**H. Bất ngờ & phản ứng (Surprise / reaction)** (7)

Surprised expression · Mouth agape in awe · Wide-eyed wonder · Delighted shock · Disbelief expression · Exaggerated reaction face · Realization dawning

**I. Chi tiết mắt, miệng & vi biểu cảm (Micro-detail)** (16)

Direct eye contact with camera · Looking off-camera left · Looking off-camera right · Looking downward · Looking upward · Eyes closed · Squinting into light · Single tear on cheek · Catchlight in the eyes · Lips slightly parted · Biting lower lip · Micro-expression of doubt · Asymmetric expression · Flushed cheeks · Furrowed brow · Sweat on the brow

→ Giải nghĩa từng giá trị: **[03-facial-expression.md](03-facial-expression.md)**

---

### 04. Gesture & Pose — *Dáng & động tác*  `(105 giá trị)`

**Câu hỏi:** Cơ thể chủ thể đang làm gì?  
**Bắt buộc:** ⚠️ Rất nên có khi có người trong khung.

**A. Dáng đứng (Standing)** (20)

Standing straight facing camera · Standing still, waiting for someone · Weight shifted to one hip · Contrapposto stance · Leaning against a wall · Leaning on a counter · Leaning forward toward camera · Leaning back, relaxed · Arms crossed · Hands on hips · Hands in pockets · One hand in pocket, one relaxed · Standing with legs apart, grounded · Turning back over the shoulder · Back to camera, facing away · Profile stance, looking sideways · Standing on tiptoes · Arms raised in triumph · Arms outstretched wide · Shoulders slumped

**B. Dáng ngồi & nằm (Seated / reclining)** (15)

Sitting upright on a chair · Sitting at a counter · Sitting on the floor · Sitting cross-legged · Sitting on steps · Perched on a desk edge · Slouched in a chair · Leaning elbows on a table · Chin resting on hand · Knees pulled to chest · Reclining on a sofa · Lying on a bed, looking up · Kneeling on one knee · Crouching low · Sitting in a car seat

**C. Chuyển động & hành động (In motion)** (15)

Walking toward camera · Walking away from camera · Walking across the frame · Mid-stride confident walk · Running at full speed · Jumping mid-air · Spinning / twirling · Dancing freely · Stretching upward · Mid-workout rep · Lifting weights · Climbing / ascending · Falling / off-balance · Turning to look at something · Reaching out toward camera

**D. Bàn tay & động tác tay (Hands & hand gestures)** (25)

Hands relaxed at sides · Hands clasped together · Fingers interlocked · One hand touching face · Hand running through hair · Hand on chest · Hand covering mouth · Hand shielding eyes from sun · Adjusting a collar or cuff · Pointing at the camera · Pointing at a product · Holding a product up to camera · Cradling a product in both palms · Applying a product to skin · Holding a takeaway coffee · Holding a smartphone · Typing on a laptop · Writing in a notebook · Gesturing while speaking · Open palms facing up · Clenched fist · Hands in prayer position · Thumbs up · Peace sign · Hands hidden / out of frame

**E. Đầu & thân trên (Head & torso orientation)** (10)

Head tilted slightly · Chin lifted upward · Chin tucked down · Head turned three-quarters · Full frontal head-on · Shoulders squared to camera · Shoulders angled away · Torso twisted, hips opposite · Spine straight, posture open · Hunched over

**F. Nhiều người & tương tác (Interaction — 2+ subjects)** (10)

Two people in conversation · Shaking hands · Embracing / hugging · Standing side by side · Facing each other closely · One leading, one following · Group huddled together · One isolated from the group · Teaching / demonstrating to another · Passing an object between hands

**G. Dành riêng cho video (Motion beats)** (10)

Slowly turning toward camera · Exhaling slowly · Blinking once, then holding gaze · Glancing toward the door · Sitting down / standing up · Setting an object down on a surface · Nodding slightly · Brushing hair back with a hand · Stepping into frame · Freezing mid-gesture

→ Giải nghĩa từng giá trị: **[04-gesture-pose.md](04-gesture-pose.md)**

---

### 05. Wardrobe & Styling — *Trang phục & tạo mẫu*  `(103 giá trị)`

**Câu hỏi:** Chủ thể đang mặc gì?  
**Bắt buộc:** ⚠️ Rất nên có với chủ thể người.

**A. Trang phục thường ngày (Casual / everyday)** (15)

Plain white t-shirt · Oversized t-shirt · Oversized denim jacket · Leather jacket, worn · Hoodie · Knitted sweater · Oversized cardigan · Flannel shirt · Denim jeans · Cargo pants · Sweatpants / joggers · Linen shirt, unbuttoned · Summer dress · Cotton tank top · Everyday loungewear set

**B. Trang phục công sở & doanh nghiệp (Professional / corporate)** (10)

Tailored black suit · Navy business suit · Blazer over t-shirt · Crisp white shirt · Shirt with rolled sleeves · Pencil skirt with blouse · Turtleneck under blazer · Three-piece suit · Lab coat / medical scrubs · Business casual knit polo

**C. Cao cấp & tạp chí (Luxury / editorial)** (13)

Floor-length evening gown · Silk slip dress · Structured couture piece · Tailored trench coat · Long wool overcoat · Cashmere layers · Satin blouse · Sheer layered fabric · Monochrome minimalist outfit · All-black avant-garde look · White-on-white styling · Metallic statement piece · Fur / faux-fur coat

**D. Streetwear & tiểu văn hoá** (9)

Streetwear layered fit · Graphic hoodie with chain · Baggy jeans and sneakers · Bomber jacket · Puffer jacket · Techwear utility outfit · Vintage band tee · Skate-style loose fit · Cyberpunk neon accents

**E. Thể thao & vận động (Athletic / activewear)** (8)

Compression athletic wear · Sports bra and leggings · Gym shorts and tank · Running gear with reflective trim · Yoga wear, soft neutral · Team jersey · Boxing / combat sports gear · Outdoor technical jacket

**F. Chất liệu & kết cấu vải (Fabric & material)** (17)

Matte cotton · Washed denim · Raw selvedge denim · Silk · Satin · Linen · Wool / tweed · Cashmere · Leather · Suede · Velvet · Sequins / beaded · Latex / patent finish · Knitwear, chunky · Technical nylon · Sheer chiffon · Distressed / worn fabric

**G. Bảng màu trang phục (Wardrobe palette)** (12)

All-black · All-white · Neutral beige and cream · Earth tones · Monochrome grey · Navy and white · Pastel palette · Single bold accent color · Complementary color pairing · Muted desaturated tones · High-contrast black and white outfit · Jewel tones

**H. Phụ kiện (Accessories)** (19)

Minimal gold jewelry · Statement earrings · Silver hoop earrings · Layered necklaces · Luxury wristwatch · Designer handbag · Leather belt · Baseball cap · Wide-brim hat · Beanie · Scarf · Clear-frame glasses · Aviator sunglasses · Sneakers · Leather dress shoes · Heels · Backpack / tote · Headphones around neck · No accessories, stripped back

→ Giải nghĩa từng giá trị: **[05-wardrobe-styling.md](05-wardrobe-styling.md)**

---

### 06. Product Subject Spec — *Đặc tả sản phẩm*  `(95 giá trị)`

**Câu hỏi:** Nếu chủ thể là sản phẩm, sản phẩm đó  
**Bắt buộc:** ✅ Bắt buộc khi chủ thể là sản phẩm / vật thể.

**A. Hình khối (Shape & form)** (15)

Tall cylindrical bottle · Short squat jar · Squeeze tube · Airless pump bottle · Dropper / pipette bottle · Faceted glass bottle · Rectangular flat box · Cube packaging · Cylindrical tin / can · Slim rectangular device · Curved ergonomic form · Sachet / pouch · Compact / palette case · Stick / roll-on format · Multi-unit set / bundle

**B. Chất liệu (Material)** (15)

Clear glass · Frosted glass · Amber / tinted glass · Brushed aluminium · Polished stainless steel · Matte plastic · Glossy plastic · Soft-touch coated surface · Uncoated kraft paper · Coated card stock · Ceramic · Leather-wrapped · Anodized metal · Recycled composite · Silicone

**C. Màu sản phẩm (Product color)** (13)

Pure white · Matte black · Gloss black · Metallic gold · Metallic silver / chrome · Rose gold · Soft pastel tone · Deep jewel tone · Transparent / colorless · Neutral beige / sand · Neon accent color · Two-tone color block · Gradient finish

**D. Kết cấu bề mặt (Surface texture)** (12)

Smooth flawless surface · Fine matte grain · Embossed logo · Debossed detail · Ribbed / fluted texture · Knurled metal grip · Soft-focus velvet finish · Water droplets on surface · Condensation film · Fingerprint-free clean · Visible wear and patina · Micro-scratches

**E. Phong cách thương hiệu & nhãn (Branding style)** (10)

Minimal sans-serif wordmark · Serif luxury logotype · Blank / unbranded · Bold typographic label · Clinical / pharmaceutical label · Hand-drawn artisanal label · Monogram pattern · Foil-stamped accent · Transparent label on glass · Multilingual label detail

**F. Bao bì & bối cảnh đóng gói (Packaging state)** (10)

Product alone, no packaging · Product beside its box · Sealed unopened box · Mid-unboxing, lid lifted · Product in use, cap off · Contents spilling out · Group of variants lined up · Gift-wrapped presentation · Retail shelf context · Refill / eco packaging

**G. Vị trí & sắp đặt trong khung (Position & staging)** (20)

Centered on a plain surface · Floating in mid-air · Standing upright · Lying flat on its side · Tilted at an angle · Held in a hand · On a pedestal / riser · Half-submerged in water · Surrounded by ingredients · Among fabric folds · On a marble slab · On raw concrete · On natural wood · Reflected in a mirror surface · Casting a long hard shadow · Knolling / top-down flat lay · Grouped in a triangular composition · Extreme foreground with blurred background · Scale reference object beside · Splash / motion around product

→ Giải nghĩa từng giá trị: **[06-product-subject.md](06-product-subject.md)**

---

### 07. Action & Narrative Beat — *Hành động & nhịp truyện*  `(80 giá trị)`

**Câu hỏi:** Điều gì đang xảy ra ngay lúc này?  
**Bắt buộc:** ⚠️ Bắt buộc cho video · tuỳ chọn cho ảnh (nhưng làm ảnh sống hơn rất nhiều).

**A. Nhịp truyện tĩnh — khoảnh khắc trước/sau (Still beats)** (10)

The moment before something happens · The moment just after · Caught mid-thought · Pausing to breathe · Waiting for someone · Noticing something off-frame · Hesitating before acting · Deciding · Realizing something · Resting after effort

**B. Hành động đời thường (Everyday action)** (15)

Sipping a drink · Pouring liquid · Cooking / stirring · Eating a meal · Wiping down a counter · Opening a door · Closing a laptop · Checking a phone · Putting on a jacket · Tying shoelaces · Reading a book · Writing by hand · Watering plants · Getting ready in the mirror · Waking up / stretching in bed

**C. Hành động thương mại & bán hàng (Commercial action)** (15)

Applying skincare to the face · Dispensing product from a pump · Spraying perfume · Unboxing a product · Holding the product to camera · Demonstrating a feature · Before-and-after transition · Trying on clothing · Swatching product on skin · Presenting to camera while speaking · Pointing to on-screen text · Handing the product to someone · Scanning / paying with a phone · Signing a document · Shaking hands on a deal

**D. Hành động cường độ cao (High-intensity action)** (10)

Sprinting · Leaping over an obstacle · Throwing a punch · Lifting a heavy weight · Diving into water · Skateboarding trick · Riding a motorbike at speed · Crashing / impact moment · Breaking through something · Celebrating a victory

**E. Chuyển động của môi trường (Environmental motion — video)** (20)

Steam rising · Smoke drifting · Dust floating in a light beam · Rain falling · Snow drifting down · Wind moving fabric and hair · Leaves rustling · Water rippling · Liquid pouring in slow motion · Candle flame flickering · Neon sign buzzing / flickering · Traffic passing in the background · Curtains billowing · Shadows shifting across a wall · Fog rolling in · Fire crackling · Bubbles rising in a glass · Petals falling · Sparks flying · Reflections moving on a surface

**F. Nhịp thời gian & cấu trúc shot (Temporal beats — video)** (10)

Single continuous action, no cut · Slow build to a reveal · Action then stillness · Stillness then sudden action · Loop-friendly cyclical motion · Enter frame, act, exit frame · Held moment, minimal motion · Repeated action, second attempt · Interrupted mid-action · Time passing in one shot

→ Giải nghĩa từng giá trị: **[07-action-beat.md](07-action-beat.md)**

---


## Nhóm B — ENVIRONMENT

*Bối cảnh — chuyện xảy ra ở đâu*

### 08. Environment — *Bối cảnh / địa điểm*  `(110 giá trị)`

**Câu hỏi:** Chuyện này đang xảy ra ở đâu?  
**Bắt buộc:** ✅ Luôn phải có.

**A. Studio & phông nền dựng** (12)

Minimalist studio backdrop · Editorial studio set · Dark moody studio environment · Soft pastel campaign backdrop · High-gloss commercial studio · Clean white wall background · Concrete textured wall backdrop · Seamless colored paper backdrop · Black void background · Cyclorama / infinity curve · Fabric-draped set · Mirror-lined studio

**B. Nhà ở & không gian sống** (18)

Soft neutral home interior · Bright modern living room · Clean aesthetic bedroom setup · Luxury apartment interior · High-end penthouse setting · Marble bathroom interior · Walk-in wardrobe space · Cozy home office space · Kitchen lifestyle environment · Natural window light corner · Vanity makeup station · Bathroom mirror selfie setting · Desk with laptop setup · Rustic countryside cottage · Cluttered lived-in apartment · Balcony garden at home · Attic / loft bedroom · Dimly lit hallway

**C. Đô thị & ngoài trời thành phố** (20)

Urban street backdrop · Graffiti wall setting · Rooftop city skyline · Balcony overlooking city · Outdoor café setting · Sidewalk lifestyle setting · Luxury shopping district · Rain-soaked city street · Narrow alley with neon signs · Night market with food stalls · Subway platform · Inside a moving train · Parking garage · Pedestrian crossing at rush hour · Bridge over a river · Empty street at dawn · Bus stop at night · Skyscraper glass facade · Old town cobblestone street · Industrial dockyard

**D. Thương mại, làm việc & dịch vụ** (24)

Fashion showroom interior · Boutique retail space · High-end hotel lobby · Private members club interior · Modern office space · High-end restaurant interior · Modern tech lab interior · Elegant hotel suite · Neutral influencer filming setup · Minimal podcast studio · Content creator filming corner · Coworking space · Corporate boardroom · Conference stage with audience · Warehouse / logistics floor · Factory production line · Clinic / medical office · Gym / weight room · Classroom / lecture hall · Library with tall shelves · Bookstore interior · Barbershop / salon · Art gallery white cube · Recording studio

**E. Thời trang & hậu trường** (6)

Fashion runway environment · Backstage fashion prep area · Luxury dressing room · High-fashion gallery space · Industrial loft space · Photo set with visible equipment

**F. Thiên nhiên & du lịch** (20)

Golden hour outdoor setting · Poolside luxury setting · Yacht deck environment · Desert golden hour backdrop · Beach lifestyle setting · Garden patio space · Forest with tall trees · Mountain ridge at altitude · Lakeside at dawn · Rice terraces · Snowy landscape · Tropical jungle · Coastal cliff · Open field / meadow · Riverbank / stream · Cave interior · Rooftop pool at sunset · Airport terminal · Inside a car at night · Abandoned building

**G. Không thực & dựng hoàn toàn** (10)

Futuristic sci-fi interior · Cyberpunk megacity · Post-apocalyptic ruins · Dreamlike surreal space · Infinite void with single light · Fantasy castle interior · Underwater scene · Space / orbital view · Abstract gradient environment · Miniature diorama world

→ Giải nghĩa từng giá trị: **[08-environment.md](08-environment.md)**

---

### 09. Time of Day — *Thời điểm trong ngày*  `(30 giá trị)`

**Câu hỏi:** Lúc này là mấy giờ?  
**Bắt buộc:** ⚠️ Rất nên có cho cảnh ngoài trời hoặc cảnh có cửa sổ.

**A. Sáng sớm** (5)

Pre-dawn / blue hour · First light at sunrise · Early morning, 6–7am · Mid-morning, 9–10am · Late morning haze

**B. Giữa ngày** (5)

Noon, sun directly overhead · Harsh midday, high contrast · Early afternoon, 2–3pm · Overcast midday, no shadows · Bright shade at midday

**C. Chiều & giờ vàng** (6)

Late afternoon, 4–5pm · Golden hour, one hour before sunset · Sunset, sun on the horizon · Backlit golden hour · Just after sunset · Blue hour after sunset

**D. Đêm** (8)

Early evening, 7–8pm · Night, city lights only · Late night, after midnight · Deep night, minimal light · Moonlit night · Starless overcast night · Neon-lit night · 3am convenience store glow

**E. Không xác định & phi tuyến** (6)

Timeless indoor light · Ambiguous time of day · Seasonal winter light, low sun · Seasonal summer light, long day · Monsoon grey daylight · Golden hour indoors through a window

→ Giải nghĩa từng giá trị: **[09-time-of-day.md](09-time-of-day.md)**

---

### 10. Weather & Atmosphere — *Thời tiết & khí quyển*  `(55 giá trị)`

**Câu hỏi:** Không khí giữa ống kính và chủ thể có gì?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng là một trong những đòn bẩy hiệu quả nhất trên mỗi từ.

**A. Trời quang & nắng** (5)

Clear sky, bright sun · Hazy sunshine · Dry heat shimmer · Humid tropical air · Crisp cold clear air

**B. Mây & xám** (5)

Overcast, flat grey sky · Broken clouds, patchy light · Heavy storm clouds gathering · Dramatic sky with god rays · Low grey monsoon sky

**C. Mưa & nước** (10)

Light drizzle · Steady rain · Heavy downpour · Rain just stopped, wet ground · Puddles reflecting light · Rain on a window pane · Water droplets on skin · Sea spray in the air · Splashing water mid-air · Steam from wet asphalt

**D. Sương & khói** (10)

Light morning mist · Dense fog · Fog rolling in · Low-lying ground fog · Atmospheric haze compressing distance · Smoke drifting through the frame · Cigarette smoke curling · Industrial smog · Steam-filled interior · Dry ice / theatrical fog

**E. Hạt trong không khí (Airborne particles)** (10)

Dust motes in a sunbeam · Swirling dust storm · Pollen / seeds floating · Falling leaves · Petals in the air · Ash falling · Embers / sparks rising · Confetti mid-air · Bubbles floating · Insects / fireflies glowing

**F. Lạnh & tuyết** (7)

Light snowfall · Heavy snowstorm · Fresh snow on the ground · Frost on glass · Visible breath in cold air · Icicles / frozen surfaces · Snowflakes on clothing

**G. Gió & khắc nghiệt** (8)

Gentle breeze · Strong wind, hair and fabric flying · Gale-force wind · Still air, nothing moving · Lightning illuminating the scene · Distant thunder, pre-storm stillness · Heatwave / oppressive air · Sandstorm haze

→ Giải nghĩa từng giá trị: **[10-weather-atmosphere.md](10-weather-atmosphere.md)**

---

### 11. Props & Set Dressing — *Đạo cụ & dựng cảnh*  `(80 giá trị)`

**Câu hỏi:** Có những vật gì trong khung ngoài chủ thể?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng đây là khác biệt giữa "một người trước phông" và "một người trong một thế giới".

**A. Đạo cụ cầm tay — chủ thể tương tác** (20)

Takeaway coffee cup · Ceramic mug, steaming · Wine glass · Water bottle · Smartphone in hand · Open laptop · Notebook and pen · Open book · Camera around the neck · Headphones on / around neck · Cigarette / lighter · Umbrella · Shopping bags · Car keys · Bouquet of flowers · Sports equipment (ball, racket) · Tool in hand (wrench, brush) · Musical instrument · Microphone · Skincare product in hand

**B. Đạo cụ trên bàn & mặt phẳng (Tabletop)** (15)

Bowl of steaming food · Half-finished meal · Scattered papers and notes · Stack of books · Fresh flowers in a vase · Potted plant · Candles, lit · Ashtray and glass · Vinyl records · Analog clock · Skincare products grouped · Makeup brushes and palettes · Coffee brewing equipment · Kitchen ingredients laid out · Cash / cards / receipts

**C. Nội thất & đồ lớn (Furniture & large set pieces)** (20)

Stainless steel counter · Wooden table, worn · Marble surface · Leather armchair · Metal folding chair · Bookshelves floor to ceiling · Clothing rack with garments · Large mirror · Floor-to-ceiling window · Venetian blinds · Sheer curtains · Neon sign on the wall · Framed artwork on walls · Exposed brick wall · Industrial pipes and ducts · Staircase · Doorway / archway · Parked scooters / bicycles · Market stalls · Studio lighting equipment visible

**D. Đạo cụ tiền cảnh (Foreground framing objects)** (10)

Out-of-focus foliage in foreground · Blurred foreground glass · Shoulder of another person · Hanging lights / bulbs · Steam / smoke crossing the lens · Rain-streaked glass in front · Fabric edge in frame · Chain-link fence · Crowd blurred in foreground · Hand entering the frame

**E. Đạo cụ kể chuyện & biểu tượng (Narrative props)** (15)

Handwritten menus / signs · Old photographs · Empty chair opposite · Packed suitcase · Wedding ring · Medical items (IV, chart) · Trophy / award · Broken object · Letter / envelope · Children's toys scattered · Religious / cultural object · Pet in the frame · Whiteboard with diagrams · Product prototype / 3D model · Nothing — deliberately empty space

→ Giải nghĩa từng giá trị: **[11-props-set-dressing.md](11-props-set-dressing.md)**

---


## Nhóm C — CAMERA

*Camera — chúng ta nhìn thế nào*

### 12. Camera — Shot, Angle & Framing — *Cỡ cảnh, góc & khung*  `(72 giá trị)`

**Câu hỏi:** Chúng ta đang nhìn cảnh này như thế nào?  
**Bắt buộc:** ✅ Luôn phải có.

**A. Cỡ cảnh (Shot size)** (17)

Extreme macro shot · Ultra-tight face crop · Tight close-up portrait · Close crop eye focus · Tight head crop editorial · Medium waist-up shot · Waist-level camera perspective · Full body framing · Wide cinematic landscape shot · Environmental portrait · Extreme wide establishing shot · Medium close-up (chest up) · Cowboy shot (mid-thigh up) · Two-shot (two subjects framed) · Insert shot (detail of an object) · Hands-only crop · Detail crop of clothing

**B. Góc máy (Camera angle)** (18)

Eye-level neutral framing · Low angle dominance shot · High angle vulnerability shot · Extreme low ground-level shot · Overhead top-down shot · Dutch angle tilt · Profile side angle · 3/4 face angle · Back-of-head cinematic framing · Over-the-shoulder perspective · First-person POV framing · Drone aerial shot · Slightly below eye level · Slightly above eye level · Worm's eye view straight up · Bird's eye directly above · Three-quarter rear angle · Canted low-left angle

**C. Bố cục & vị trí trong khung (Framing choices)** (19)

Symmetrical centered composition · Rule-of-thirds composition · Silhouette framing · Framed through doorway · Through-glass perspective · Mirror reflection shot · High fashion editorial framing · Classic Hollywood framing · Cinematic anamorphic ratio · Security camera framing · Negative space composition · Subject at frame edge · Leading lines to the subject · Layered depth, three planes · Tight frame, no headroom · Generous headroom · Looking room in direction of gaze · Frame within a frame · Off-center subject, thirds right

**D. Tiêu cự & DOF nêu trong link gốc (giữ nguyên để đối chiếu)** (18)

85mm portrait lens compression · 35mm cinematic lens · 24mm wide angle distortion · 200mm telephoto compression · Shallow depth of field · Deep focus clarity · Subject isolated foreground · Background bokeh compression · Tilt-shift perspective · Split diopter effect · Long-lens paparazzi style · Overexposed lens flare shot · Freeze-frame action moment · Motion blur capture · Cinematic push-in perspective · Tracking shot perspective · Static tripod framing · Handheld documentary feel

→ Giải nghĩa từng giá trị: **[12-camera-shot.md](12-camera-shot.md)**

---

### 13. Camera Lens — *Ống kính*  `(63 giá trị)`

**Câu hỏi:** Ống kính nào đang nhìn cảnh này?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng thêm vào là bước nhảy lớn nhất về độ chân thực.

**A. Ống rộng (Wide — 14 đến 35mm)** (12)

14mm ultra-wide lens · 16mm wide-angle lens · 18mm wide cinematic lens · 20mm wide lens · 24mm wide-angle lens · 28mm natural wide lens · 30mm cinematic lens · 35mm documentary lens · 35mm cinematic prime · Ultra-wide environmental lens · 12mm fisheye lens · 21mm architectural lens

**B. Ống chuẩn (Standard — 40 đến 60mm)** (8)

40mm natural perspective lens · 50mm standard lens · 50mm prime lens · 55mm portrait lens · 60mm natural compression lens · Natural eye-level lens perspective · Smartphone equivalent lens · 43mm "true normal" lens

**C. Ống chân dung & tele ngắn (70 đến 135mm)** (13)

70mm short telephoto lens · 75mm portrait lens · 85mm portrait lens · 85mm prime lens · 90mm portrait lens · 100mm telephoto lens · 105mm portrait lens · 120mm telephoto lens · 135mm telephoto lens · Shallow depth portrait lens · Low-distortion portrait lens · High-fashion editorial lens · 80mm medium-format portrait lens

**D. Tele dài (150mm+)** (7)

150mm compression lens · 200mm telephoto lens · 300mm long telephoto lens · 400mm extreme telephoto lens · Runway telephoto lens · Long-lens paparazzi style · 600mm wildlife lens

**E. Ống đặc biệt (Specialty)** (10)

Macro lens close-up · True macro 1:1 lens · Tilt-shift lens · Anamorphic lens · Wide anamorphic lens · Probe / snorkel lens · Petzval / swirly bokeh lens · Lensbaby / selective focus · Soft-focus portrait lens · Split-field diopter

**F. Đặc tính & thương hiệu ống (Lens character)** (13)

Vintage cinema lens · Modern cinema prime lens · High-end Zeiss-style lens · Leica-style prime lens · Canon L-series style lens · Sony G Master style lens · Deep focus wide lens · Cinematic push-in lens · Documentary handheld lens · IMAX-style cinematic lens · Uncoated vintage glass · Fast f/1.2 lens character · Clinical ultra-sharp modern glass

→ Giải nghĩa từng giá trị: **[13-camera-lens.md](13-camera-lens.md)**

---

### 14. Camera Body & Film Stock — *Thân máy & chất phim*  `(55 giá trị)`

**Câu hỏi:** Cái gì đang ghi lại hình ảnh này?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng cực kỳ hiệu quả cho mục tiêu chân thực.

**A. Máy phim & chất phim màu (Color film stock)** (14)

Kodak Portra 400 · Kodak Portra 160 · Kodak Portra 800 · Kodak Gold 200 · Kodak Ektar 100 · Kodak Ektachrome · Kodachrome 64 · Fujifilm Pro 400H · Fujifilm Superia 400 · Fujifilm Velvia 50 · CineStill 800T · Lomography color negative · Expired film look · Cross-processed film

**B. Phim đen trắng (B&W film stock)** (5)

Kodak Tri-X 400 · Ilford HP5 Plus 400 · Ilford Delta 3200 · Kodak T-Max 100 · Fomapan 100

**C. Định dạng & thân máy phim (Film format & body)** (11)

35mm film camera · Medium format film (6x6) · Medium format film (6x7) · Large format 4x5 · Polaroid / instant film · Instax instant print · Disposable camera · Half-frame film camera · Point-and-shoot compact film · Rangefinder camera · Twin-lens reflex (TLR)

**D. Máy số hiện đại (Modern digital)** (12)

Full-frame mirrorless digital · Digital medium format · APS-C crop sensor · Micro four-thirds · Professional DSLR · High-megapixel studio digital back · Cinema camera (ARRI-style) · Cinema camera (RED-style) · Blackmagic cinema look · Super 8 film camera · 16mm film camera · 65mm / IMAX film

**E. Máy tiêu dùng & thiết bị đặc biệt (Consumer & specialty)** (13)

Modern smartphone camera · iPhone photo with flash · Front-facing selfie camera · Early 2000s digital compact · Webcam / video call quality · Action camera (GoPro-style) · Drone camera · Security / CCTV camera · Film scan with visible dust · Photocopied / xerox degradation · VHS / analog video · Thermal / infrared imaging · Black-and-white surveillance still

→ Giải nghĩa từng giá trị: **[14-camera-body-film.md](14-camera-body-film.md)**

---

### 15. Aperture, Depth & Focus — *Khẩu độ, chiều sâu & nét*  `(50 giá trị)`

**Câu hỏi:** Cái gì nét, cái gì mờ, và mờ như thế nào?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng gần như luôn nên có.

**A. Khẩu độ theo con số (Aperture value)** (10)

Shot at f/1.2 · Shot at f/1.4 · Shot at f/1.8 · Shot at f/2.8 · Shot at f/4 · Shot at f/5.6 · Shot at f/8 · Shot at f/11 · Shot at f/16 · Shot at f/22

**B. Mức chiều sâu bằng chữ (Depth of field, descriptive)** (9)

Shallow depth of field · Extremely shallow depth of field · Moderate depth of field · Deep focus clarity · Everything in focus, front to back · Subject isolated foreground · Background bokeh compression · Foreground and background both blurred · Hyperfocal distance focus

**C. Vị trí điểm nét (Focus point)** (11)

Sharp focus on the eyes · Focus on the near eye · Focus on the lips · Focus on the hands · Focus on the product label · Focus on a background detail, subject soft · Focus on the foreground object · Focus falling just short of the subject · Split diopter effect · Tilt-shift perspective · Zone focus, approximate

**D. Tính chất bokeh (Bokeh character)** (10)

Creamy smooth bokeh · Circular bokeh highlights · Oval anamorphic bokeh · Swirly Petzval bokeh · Hexagonal aperture bokeh · Busy nervous bokeh · Cat's eye bokeh at the edges · Bokeh balls from city lights · Soft gradient background, no detail · Nervous transition zone

**E. Độ nét & chuyển động của nét (Sharpness & focus behaviour)** (10)

Tack-sharp critical focus · Slightly soft overall · Soft corners, sharp center · Focus breathing visible · Rack focus from foreground to subject · Rack focus from subject to background · Pull focus between two subjects · Slow focus hunt · Locked focus, no change · Out-of-focus opening, then snap to focus

→ Giải nghĩa từng giá trị: **[15-focus-depth.md](15-focus-depth.md)**

---

### 16. Shutter & Motion Rendering — *Tốc trập & thể hiện chuyển động*  `(50 giá trị)`

**Câu hỏi:** Chuyển động được ghi lại như thế nào — đóng băng hay nhoè?  
**Bắt buộc:** ⭕ Tuỳ chọn cho ảnh tĩnh · ⚠️ Rất nên có khi có chuyển động hoặc khi làm video.

**A. Đóng băng chuyển động (Freeze motion)** (8)

Freeze-frame action moment · Shot at 1/1000s · Shot at 1/2000s · Shot at 1/8000s · Flash-frozen motion · High-speed capture, water frozen mid-air · Peak-action freeze · Shattering / fragmenting frozen

**B. Nhoè chuyển động (Motion blur)** (12)

Motion blur capture · Shot at 1/60s · Shot at 1/30s · Shot at 1/15s · Subject sharp, background streaked · Background sharp, subject blurred · Partial blur on the hands only · Blurred crowd, still subject · Whip-blur transition · Light trails from moving vehicles · Zoom burst blur · Intentional camera shake

**C. Phơi sáng dài (Long exposure)** (10)

Long exposure, 1 second · Long exposure, 30 seconds · Multi-minute exposure · Silky smooth water · Ghosted figures from long exposure · Star trails · Light painting · Double exposure · Multiple exposure sequence · Slow sync flash

**D. Dành riêng cho video (Video shutter & frame rate)** (20)

180-degree shutter rule · 24fps cinematic frame rate · 25fps broadcast · 30fps standard video · 60fps smooth motion · 120fps slow motion · 240fps ultra slow motion · 1000fps high-speed · Slow motion, half speed · Ramping speed, fast to slow · Ramping speed, slow to fast · Time-lapse, hours in seconds · Hyperlapse, moving time-lapse · Stop-motion stepped movement · Frame-skipping stutter · Real-time, no speed change · Reverse motion · Freeze then resume · Rolling shutter jello effect · Global shutter, no distortion

→ Giải nghĩa từng giá trị: **[16-motion-shutter.md](16-motion-shutter.md)**

---

### 17. Camera Movement — *Chuyển động camera*  `(55 giá trị)`

**Câu hỏi:** Camera di chuyển ra sao?  
**Bắt buộc:** ✅ Bắt buộc cho video · ⭕ Bỏ qua cho ảnh tĩnh.

**A. Đẩy / kéo theo trục Z (Push & pull)** (10)

Slow Dolly In/Out · Push-In with Rack Focus · Pull-Back Reveal · Zoom-In Dramatic Reveal · Snap Zoom (Quick Punch-In) · Slow Push with Shallow DOF · Macro Pull-Back Reveal · Track Behind + Push-In Reveal · Vertigo / Dolly Zoom Effect · Creeping push, barely perceptible

**B. Ngang & dọc (Lateral & vertical)** (10)

Tracking Shot (Left-to-Right Walk) · Slide Left/Right (Lateral Tracking) · Crane Shot Up/Down · Boom Shot (Vertical Crane) · Jib Up with Rotation · Tilt Up/Down Reveal · Ground-Level Tracking · Parallax Shift (Layered Depth) · Pedestal move, straight vertical · Diagonal dolly across the frame

**C. Quay & vòng (Pan, orbit, arc)** (10)

360° Orbit Around Subject · Arc Shot (Partial Orbit) · Slow Motion Pan · Whip Pan (Quick Lateral) · Rotating Overhead (Bird's Eye) · Split-Screen Transition Movement · Roll / barrel rotation · Slow orbit at low angle · Half-orbit reveal of a face · Pan following a moving subject

**D. Bám theo & cầm tay (Follow & handheld)** (10)

Handheld Camera Movement · Steadicam Following Shot · Walk-and-Talk (Tracking + Dialogue) · Fly-Through / FPV Drone Style · Cable Cam / Zipline Movement · Underwater Camera Movement · Gimbal-smooth follow behind · Shaky verité handheld · Shoulder-mounted follow · Car-mounted tracking

**E. Tĩnh & thời gian (Static & temporal)** (8)

Static Lock-Off (No Movement) · Close-Up Rack Focus · Time-Lapse Pan · Hyperlapse Forward Walk · Locked tripod, subject moves only · Static wide, action enters frame · Hold on empty frame, then subject appears · Slow zoom on a static tripod

**F. Góc & loại shot nêu trong link gốc (giữ nguyên để đối chiếu)** (7)

Over-the-Shoulder Shot · Low-Angle Power Shot · High-Angle Looking Down · Dutch Angle (Tilted Frame) · Point-of-View (POV) Shot · Mirror / Reflection Shot · Through-the-Window Shot

→ Giải nghĩa từng giá trị: **[17-camera-movement.md](17-camera-movement.md)**

---

### 18. Composition & Layout — *Bố cục & sắp xếp*  `(60 giá trị)`

**Câu hỏi:** Các phần tử được sắp xếp trong khung như thế nào?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng bắt buộc nếu ảnh sẽ có chữ chèn lên (ad, thumbnail, poster).

**A. Nguyên tắc cổ điển (Classical rules)** (10)

Rule-of-thirds composition · Symmetrical centered composition · Golden ratio spiral · Golden triangle composition · Diagonal composition · Triangular arrangement · Radial / circular composition · Horizontal layered bands · Vertical emphasis · Central single-point focus

**B. Chiều sâu & lớp (Depth & layering)** (10)

Layered depth, three planes · Foreground framing element · Frame within a frame · Leading lines to the subject · Converging perspective lines · Overlapping planes · Atmospheric depth layering · Silhouette against bright background · Subject reflected in a surface · Through-glass layered reflection

**C. Cân bằng & căng thị giác (Balance & tension)** (12)

Balanced symmetrical weight · Asymmetrical balance · Subject at frame edge · Deliberately off-balance · Heavy bottom weighting · Heavy top weighting · Tight frame, no breathing room · Isolated subject in vast space · Repetition and pattern · Pattern broken by the subject · Odd number of elements · Visual hierarchy, one clear focal point

**D. Khoảng trống & chỗ cho chữ (Negative space & text safety)** (12)

Negative space composition · Copy space on the left · Copy space on the right · Copy space at the top · Copy space at the bottom · Center-safe for text overlay · Subject on lower third, sky above · Uncluttered background for legibility · Vertical safe zone for 9:16 · Thumbnail-safe center crop · Looking room in direction of gaze · Generous headroom

**E. Bố cục theo phong cách (Stylistic composition)** (16)

High fashion editorial framing · Classic Hollywood framing · Wes-Anderson-style flat symmetry · Documentary candid framing · Street photography snapshot · Knolling / top-down flat lay · Minimalist single-object layout · Maximalist dense composition · Grid-based modular layout · Diptych / side-by-side pairing · Split-screen composition · Cinematic wide with letterbox bars · Vignette drawing eye to center · Extreme foreground dominance · Deliberate empty frame · Rule-breaking dead center portrait

→ Giải nghĩa từng giá trị: **[18-composition.md](18-composition.md)**

---


## Nhóm D — LIGHT

*Ánh sáng & màu — khung hình được chiếu sáng ra sao*

### 19. Lighting — *Ánh sáng*  `(100 giá trị)`

**Câu hỏi:** Nguồn sáng ở đâu, đi theo hướng nào, và chất sáng ra sao?  
**Bắt buộc:** ✅ Luôn phải có. Đây là tham số quan trọng nhất sau Subject.

**A. Ánh sáng tự nhiên (Natural light)** (18)

Soft diffused daylight · Golden hour warm glow · Blue hour cool tones · Harsh midday sunlight · Natural window light · Overcast soft sky · Sun flare through lens · Moonlit night lighting · Soft morning haze · Volumetric light rays · Fog-diffused light · Dappled light through leaves · Window light through sheer curtain · Skylight from above · Open shade, no direct sun · Bounced light off a wall · Snow-reflected uplight · Water-reflected caustics

**B. Hướng chiếu (Direction)** (13)

Dramatic side lighting · Backlit rim lighting · Rim light separation · Top-down spotlight · Underlighting dramatic horror · Single light source dramatic · Harsh silhouette lighting · Frontal flat lighting · 45-degree key light · Three-quarter back light · Kicker light from behind-left · Edge light on one side only · Light from directly behind (halo)

**C. Sơ đồ đèn kinh điển (Classic lighting patterns)** (12)

Rembrandt lighting pattern · Split lighting · Butterfly lighting · Loop lighting · Broad lighting · Short lighting · Clamshell beauty lighting · Shadow-heavy chiaroscuro · Low-key moody lighting · High-key bright lighting · Cinematic contrast lighting · Subtle fill light ratio

**D. Đèn studio & thiết bị (Studio & equipment)** (15)

Studio softbox key light · Beauty dish lighting · Hard spotlight beam · Reflector bounce lighting · Strobe flash photography · Studio product lighting · Color gel lighting · Large octabox close to subject · Bare bulb hard light · Ring light, flat and even · Snoot / narrow beam · Barn doors, controlled spill · Light through a scrim · Gobo pattern shadow · Practical lamp in frame

**E. Nguồn sáng nhân tạo & môi trường (Artificial & environmental sources)** (27)

Warm tungsten interior · Cold clinical lighting · Fluorescent overhead light · Neon edge lighting · Neon cyber glow · RGB accent lighting · Candlelit glow · Candle shadow flicker · Fire-lit flicker · Fireplace glow · TV screen light spill · Smartphone light illumination · Car headlights illumination · Police light flashing · Lightning storm flashes · Fashion runway spotlight · Stage concert lighting · Streetlight sodium orange · Shop window light spill · Vending machine glow · Computer monitor glow on face · Projector light · Elevator / hallway strip light · Christmas / fairy lights bokeh · Bioluminescent glow · Explosion / muzzle flash · Welding sparks light

**F. Chất lượng & nhiệt độ (Quality & temperature)** (15)

Hard light, sharp shadows · Soft light, gradual shadows · Very high contrast ratio · Low contrast, flat lighting · Mixed color temperature · Warm 2700K tungsten · Neutral 4000K · Daylight 5600K · Cool 7000K shade · Motivated lighting · Unmotivated stylized lighting · Halation glow around highlights · Crushed blacks, no shadow detail · Lifted shadows, milky blacks · Specular highlights on skin

→ Giải nghĩa từng giá trị: **[19-lighting.md](19-lighting.md)**

---

### 20. Color Palette & Grade — *Bảng màu & màu phim*  `(64 giá trị)`

**Câu hỏi:** Bức ảnh này có màu gì, và màu được xử lý ra sao?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng bắt buộc nếu ảnh phải khớp bộ nhận diện thương hiệu.

**A. Bảng màu theo quan hệ (Color scheme)** (13)

Monochromatic palette · Analogous palette · Complementary palette · Split-complementary palette · Triadic palette · Teal and orange · Blue and yellow contrast · Red and green tension · Purple and gold · Pink and cyan neon · Warm-cool split lighting palette · Limited three-color palette · Single accent color on neutral

**B. Tông màu chủ đạo (Dominant tone family)** (12)

Warm amber tones · Cool blue tones · Neutral grey tones · Earthy brown and ochre · Green-dominant palette · Soft pastel tones · Jewel tones · Sepia / warm brown wash · Icy blue-white palette · Sun-bleached faded tones · Millennial pink and cream · Black, white and one red

**C. Độ bão hoà (Saturation)** (9)

Vibrant saturated colors · Naturally saturated · Desaturated tones · Heavily desaturated, near-monochrome · Black and white · High-contrast black and white · Soft low-contrast black and white · Selective color, one hue kept · Oversaturated, hyperreal

**D. Kiểu grade & xử lý màu (Grade style)** (20)

Matte color grade · Film emulation grade · Flat log profile, ungraded · HDR dramatic · Crushed shadows, deep blacks · Lifted milky blacks · Cool shadows, warm highlights · Warm shadows, cool highlights · Split-toning · Bleach bypass look · Cross-processed color shift · Faded vintage grade · Kodak Portra tone · Fujifilm simulation · Technicolor three-strip look · Anamorphic blue flare tint · Day-for-night grade · Sodium-vapour street grade · Clean commercial grade · Brand-locked palette

**E. Đặc điểm màu chi tiết (Color detail)** (10)

Accurate natural skin tones · Warm golden skin tones · Cool porcelain skin tones · Rich deep skin tones preserved · Color-graded background, neutral subject · Colored gel spill on skin · Neon color reflections on surfaces · Subtle color cast from environment · Chromatic aberration at edges · Color banding in gradients

→ Giải nghĩa từng giá trị: **[20-color-palette.md](20-color-palette.md)**

---


## Nhóm E — FEEL

*Cảm xúc & mục đích — ảnh phải cảm giác thế nào, để làm gì*

### 21. Mood — *Cảm xúc / không khí*  `(212 giá trị)`

**Câu hỏi:** Bức ảnh này nên  
**Bắt buộc:** ✅ Luôn phải có — nhưng chỉ 1–2 từ. Đây là tham số duy nhất mà "nhiều hơn" làm hại nhiều nhất.

**A. Điện ảnh & cường độ (Cinematic & intensity)** (10)

Cinematic · Dramatic · Atmospheric · Moody · Emotional · Expressive · Evocative · Immersive · Intense · Powerful

**B. Bí ẩn (Mystery)** (5)

Mysterious · Enigmatic · Cryptic · Secretive · Intriguing

**C. Căng thẳng & báo hiệu (Tension & dread)** (6)

Suspenseful · Tense · Uneasy · Unsettling · Ominous · Foreboding

**D. Kinh dị (Horror)** (9)

Eerie · Creepy · Spooky · Haunting · Sinister · Menacing · Terrifying · Horrifying · Nightmarish

**E. Tối & u sầu (Darkness & gloom)** (4)

Dark · Gloomy · Bleak · Somber

**F. Buồn & bi kịch (Sadness & tragedy)** (5)

Melancholic · Sorrowful · Mournful · Tragic · Heartbreaking

**G. Cô đơn & tuyệt vọng (Loneliness & despair)** (5)

Lonely · Isolated · Desolate · Hopeless · Depressive

**H. Suy tư & nội tâm (Introspection)** (6)

Brooding · Pensive · Contemplative · Reflective · Introspective · Thoughtful

**I. Hoài niệm & khao khát (Nostalgia & longing)** (6)

Nostalgic · Sentimental · Bittersweet · Longing · Wistful · Yearning

**J. Lãng mạn & ấm áp (Romance & warmth)** (9)

Romantic · Passionate · Sensual · Seductive · Intimate · Tender · Affectionate · Warm · Heartwarming

**K. Mộng & thiêng (Dreamlike & divine)** (10)

Dreamy · Ethereal · Celestial · Heavenly · Magical · Enchanting · Mystical · Spiritual · Divine · Otherworldly

**L. Siêu thực (Surreal)** (5)

Surreal · Psychedelic · Hallucinatory · Hypnotic · Trance-like

**M. Kỳ ảo & hài (Whimsy & humor)** (9)

Whimsical · Fantastical · Fairy-tale · Playful · Quirky · Eccentric · Absurd · Comical · Humorous

**N. Niềm vui & hy vọng (Joy & hope)** (11)

Joyful · Cheerful · Happy · Delightful · Optimistic · Hopeful · Uplifting · Inspirational · Triumphant · Celebratory · Exhilarating

**O. Năng lượng (Energy)** (11)

Energetic · Dynamic · Vibrant · Lively · Electric · Exciting · Adventurous · Bold · Rebellious · Youthful · Fresh

**P. Bình yên (Calm & peace)** (12)

Peaceful · Serene · Calm · Tranquil · Soothing · Relaxing · Gentle · Soft · Quiet · Still · Meditative · Zen

**Q. Ấm áp gia đình & tự nhiên (Cozy & organic)** (10)

Cozy · Comforting · Homely · Rustic · Pastoral · Idyllic · Natural · Organic · Refreshing · Airy

**R. Sáng & rực rỡ (Brightness)** (6)

Bright · Radiant · Luminous · Glowing · Sunny · Colorful

**S. Sang trọng (Elegance & luxury)** (8)

Elegant · Sophisticated · Luxurious · Glamorous · Opulent · Regal · Majestic · Grand

**T. Hùng tráng (Epic)** (3)

Epic · Heroic · Monumental

**U. Tối giản & tinh gọn (Minimal & refined)** (6)

Minimalist · Clean · Polished · Refined · Timeless · Classic

**V. Hoài cổ (Vintage)** (4)

Vintage · Retro · Antique · Historic

**W. Chân thực (Realism & authenticity)** (6)

Documentary · Realistic · Raw · Authentic · Honest · Candid

**X. Thô ráp & đô thị (Grit & urban)** (5)

Gritty · Rugged · Grungy · Industrial · Urban

**Y. Tương lai & dystopia (Future & dystopia)** (5)

Futuristic · Cyberpunk · Dystopian · Post-apocalyptic · Alien

**Z. Lạnh & xa cách (Cold & detached)** (5)

Clinical · Sterile · Cold · Detached · Alienating

**AA. Hỗn loạn (Chaos)** (7)

Chaotic · Frantic · Frenetic · Overwhelming · Claustrophobic · Disorienting · Paranoid

**BB. Bạo lực (Aggression)** (4)

Aggressive · Hostile · Violent · Explosive

**CC. Thương mại & thương hiệu (bổ sung — thiếu trong link gốc)** (20)

Aspirational · Trustworthy · Confident · Empowering · Determined · Focused · Ambitious · Wholesome · Approachable · Premium · Understated · Provocative · Anticipatory · Satisfying · Cathartic · Vulnerable · Solemn · Reverent · Awkward · Defiant

→ Giải nghĩa từng giá trị: **[21-mood.md](21-mood.md)**

---

### 22. Intent / Use Case — *Mục đích sử dụng*  `(80 giá trị)`

**Câu hỏi:** Bức ảnh này dùng để làm gì?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng là cách nén prompt hiệu quả nhất: một từ intent thay được năm câu mô tả.

**A. Thời trang & xa xỉ** (12)

Luxury brand campaign · High-fashion editorial · Fashion lookbook image · Magazine cover shot · High-end jewelry campaign · Perfume advertisement · Fragrance close-up ad · High-end watch campaign · Streetwear drop campaign · Luxury automotive ad · Beauty campaign hero image · Runway documentation

**B. Thương mại & sản phẩm** (14)

Commercial product ad · Skincare advertisement · Fitness supplement ad · Corporate branding image · Tech startup branding · High-impact billboard ad · Real estate luxury listing · Investment ad creative · E-commerce product listing · Amazon / marketplace main image · Packaging mockup · Food & beverage commercial · B2B SaaS website hero · Print catalogue spread

**C. Mạng xã hội & nội dung** (17)

Social media UGC · Viral TikTok thumbnail · Viral meme content · AI influencer content · Personal brand photoshoot · Podcast cover image · Course sales page hero · Skool community promo · AI course advertisement · Elite mastermind promo · Motivational poster aesthetic · YouTube thumbnail · Instagram carousel slide · Reels / Shorts cover frame · LinkedIn professional headshot · Email newsletter header · Paid ad creative, A/B variant

**D. Điện ảnh & kể chuyện** (17)

Cinematic film still · Movie poster aesthetic · Character introduction scene · Dark villain reveal · Inspirational hero moment · Dramatic teaser scene · High-drama cinematic trailer · Character backstory portrait · Hollywood biopic still · Superhero origin scene · Music album cover · NFT character reveal · Dark fantasy artwork · High-tech futuristic ad · Book cover illustration · Storyboard frame · Concept art for a world

**E. Tài liệu, thể thao & tin tức** (10)

Documentary realism · Survival documentary shot · Documentary war scene · Sports performance promo · Fitness transformation ad · Political campaign visual · Travel tourism campaign · Photojournalism single image · Event coverage · NGO / social impact campaign

**F. Kỹ thuật & nội bộ (bổ sung)** (10)

Reference image for consistency · Style exploration / moodboard · Texture / material study · Background plate for compositing · Character turnaround sheet · UI / app screen mockup context · Presentation slide visual · Print poster, large format · Merchandise / apparel print · Stock-library image

→ Giải nghĩa từng giá trị: **[22-intent.md](22-intent.md)**

---


## Nhóm F — LOOK

*Xử lý hình ảnh — thành phẩm trông ra sao*

### 23. Style — *Phong cách hình ảnh*  `(80 giá trị)`

**Câu hỏi:** Kết quả cuối cùng nên trông như thế nào?  
**Bắt buộc:** ⭕ Tuỳ chọn — và là tham số duy nhất nên cân nhắc BỎ TRỐNG.

**A. Chân thực & nhiếp ảnh (Photographic realism)** (12)

Photorealistic · Ultra-realistic · Real-life candid · Documentary raw · Professional photography · Lifestyle natural · Studio polished · Studio campaign · Realistic 35mm film photo · Snapshot aesthetic · iPhone flash photo · Polaroid instant photo

**B. Điện ảnh (Cinematic)** (11)

Cinematic · Film still aesthetic · Anamorphic cinematic · Art-house cinema · Hollywood blockbuster · Dramatic shadows · Warm cinematic · Cold minimal · Noir · Neo-noir with neon · Slow-cinema stillness

**C. Tạp chí & thương mại (Editorial & commercial)** (11)

Editorial fashion · Luxury magazine · Luxury aesthetic · High-end product · High-gloss commercial · Premium brand aesthetic · Clean corporate · Modern sleek · Minimalist · Clean studio product photography · Luxury fashion campaign

**D. Mạng xã hội (Social-native)** (6)

Instagram aesthetic · TikTok optimized · High-energy dynamic · UGC authentic look · Vlog / handheld look · Meme / low-fi graphic

**E. Hoài cổ & mô phỏng phim (Vintage & film emulation)** (16)

Vintage film look · Kodak Portra tone · Fujifilm simulation · Matte color grade · Teal and orange · Black and white · Desaturated tones · HDR dramatic · High contrast · Soft pastel tones · Vibrant saturated colors · Dreamy haze · 1970s film aesthetic · 1990s point-and-shoot · Y2K digital aesthetic · VHS analog look

**F. Nghệ thuật & thể loại (Genre & stylized)** (14)

Surreal · Futuristic · Cyberpunk · Fantasy epic · Dark fantasy style · Solarpunk optimistic · Steampunk · Brutalist architectural · Vaporwave · Retro-futurism · Gothic · Baroque dramatic · Wabi-sabi Japanese · Scandinavian minimal

**G. Kỹ thuật hình ảnh & mức chi tiết (Rendering character)** (10)

Ultra sharp clarity · Hyper-detailed · AI hyperreal · Moody · Dark and gritty · Soft focus overall · Grainy and imperfect · Slightly underexposed · Naturally imperfect skin · No post-processing look

→ Giải nghĩa từng giá trị: **[23-style.md](23-style.md)**

---

### 24. Art Medium & Technique — *Chất liệu & kỹ thuật nghệ thuật*  `(75 giá trị)`

**Câu hỏi:** Đây có phải là một bức ảnh — hay là tranh, minh hoạ, 3D, anime?  
**Bắt buộc:** ⭕ Bỏ trống nếu muốn ảnh nhiếp ảnh. Chỉ điền khi bạn muốn hình ảnh phi-nhiếp-ảnh.

**A. Nhiếp ảnh (mặc định — không cần nêu)** (3)

Photograph · Photojournalistic photograph · Analog film photograph

**B. Hội hoạ truyền thống (Traditional painting)** (13)

Oil painting · Thick impasto oil painting · Watercolor painting · Gouache illustration · Acrylic painting · Ink wash painting · Tempera / fresco · Pastel drawing · Charcoal drawing · Graphite pencil sketch · Pen and ink line drawing · Colored pencil illustration · Chalk on blackboard

**C. In & đồ hoạ (Print & graphic)** (16)

Screen print / silkscreen · Risograph print · Linocut / woodblock print · Japanese ukiyo-e woodblock · Etching / engraving · Lithograph poster · Halftone dot print · Photocopy / xerox degradation · Blueprint / technical drawing · Flat vector illustration · Isometric vector illustration · Line-art icon style · Bauhaus geometric graphic · Swiss / International typographic · Collage / mixed media · Paper cut-out layered

**D. Anime, manga & hoạt hình (Animation)** (16)

Anime style · Studio Ghibli-esque · 90s retro anime · Modern digital anime · Manga black-and-white · Shonen action style · Shojo soft style · Chibi / kawaii style · Western cartoon style · Classic Disney animation cel · Cartoon Network 2000s style · Comic book style with halftone · Graphic novel ink style · Stop-motion claymation · Puppet / felt animation · Cutout animation

**E. 3D & số (3D & digital)** (12)

3D render, octane · 3D clay render · Soft-body 3D, inflatable look · Low-poly 3D · Voxel / pixel 3D · Photogrammetry scan look · Unreal Engine cinematic render · Pixel art, 16-bit · Glitch art · Datamosh / digital decay · Wireframe / topology view · Holographic / iridescent digital

**F. Điêu khắc, vật liệu & khác (Sculptural & other)** (15)

Marble sculpture · Bronze sculpture · Clay / ceramic sculpture · Stained glass · Mosaic tile · Embroidery / textile art · Neon tube sign art · Chalk pastel mural · Spray paint graffiti · Light painting photography · Cyanotype / alt-process print · Double-exposure photomontage · X-ray / radiographic · Infrared photography · Scientific / botanical illustration

→ Giải nghĩa từng giá trị: **[24-art-medium.md](24-art-medium.md)**

---

### 25. Texture & Surface Detail — *Kết cấu & chi tiết bề mặt*  `(81 giá trị)`

**Câu hỏi:** Bề mặt trong ảnh  
**Bắt buộc:** ⚠️ Rất nên có — đặc biệt ở close-up và ảnh sản phẩm.

**A. Da & khuôn mặt (Skin & face)** (23)

Natural skin pores visible · Subtle skin texture detail · Fine facial hair detail · Micro skin wrinkles · Realistic skin undertones · Light skin imperfections · Soft natural blush tones · Visible peach fuzz detail · High-definition iris detail · Hyper-detailed eyelashes · Subtle under-eye texture · Slight skin sheen · Matte skin finish · Natural lip texture detail · Defined skin micro-contrast · Freckles and minor blemishes · Soft makeup powder texture · Visible skin pores on the nose · Slight razor irritation · Sunburn / tan lines · Dry skin patches · Goosebumps on skin · Realistic nail texture detail

**B. Tóc & lông (Hair)** (6)

Fine hair strand detail · Wind-blown hair texture · Flyaway hairs backlit · Slightly frizzy hair · Wet strands clinging · Individual curl definition

**C. Vải & trang phục (Fabric & garments)** (16)

Matte fabric finish · Glossy reflective surfaces · Leather grain texture · Fine fabric stitching · Denim weave detail · Velvet soft texture · Silk smooth fabric · Brushed suede texture · Carbon fiber pattern · Embroidered thread detail · Light fabric creasing detail · Deep wrinkles in linen · Pilling / worn fabric · Knit loop texture visible · Sheer fabric translucency · Sequin light scatter

**D. Nước, hơi & hạt (Water, vapour & particles)** (13)

Rain droplets on surface · Water condensation · Sweat beads on skin · Dust particles in air · Fog density in atmosphere · Smoke haze particles · Sunlit floating dust · Soft atmospheric diffusion · Sand particles on skin · Snowflakes on clothing · Oil / grease on hands · Flour dust in the air · Splash droplets frozen

**E. Bề mặt vật liệu & môi trường (Material & environment surfaces)** (17)

Polished marble surface · Rough concrete texture · Cracked paint detail · Scratched glass surface · Reflective chrome finish · Brushed metal surface · Frosted glass texture · Weathered wood grain · Rusted metal patina · Peeling wallpaper · Wet asphalt sheen · Moss and lichen growth · Fingerprints on glass · Dust settled on a surface · Cracked dry earth · Paper fiber texture · Chipped ceramic edge

**F. Hạt phim & nhiễu ảnh (Grain & imaging artefacts)** (6)

Subtle film grain · Light camera sensor noise · Heavy film grain · Chromatic noise in shadows · Dust and scratches on the negative · Slight lens dirt haze

→ Giải nghĩa từng giá trị: **[25-texture.md](25-texture.md)**

---

### 26. Post-processing & Optical Artefacts — *Hậu kỳ & dấu vết quang học*  `(60 giá trị)`

**Câu hỏi:** Bức ảnh có những "khiếm khuyết" gì của thiết bị thật?  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng là công cụ tinh chỉnh cuối cùng hiệu quả nhất.

**A. Flare & loé sáng (Flare & bloom)** (9)

Subtle lens flare · Overexposed lens flare shot · Anamorphic horizontal blue flare · Circular ghosting flare · Veiling flare, low contrast · Sunstar / diffraction spikes · Halation glow around highlights · Bloom on bright light sources · Streak flare from a point light

**B. Vignette & sai lệch quang học (Vignette & optical aberration)** (10)

Subtle vignette · Heavy vignette · Chromatic aberration at edges · Purple fringing on highlights · Barrel distortion · Pincushion distortion · Soft corners, sharp center · Field curvature blur · Coma / astigmatism at edges · Slight tilt / horizon not level

**C. Hạt, nhiễu & suy giảm (Grain, noise & degradation)** (11)

Subtle film grain · Heavy 35mm grain · Fine medium-format grain · Digital sensor noise in shadows · Luminance noise, no color noise · JPEG compression artefacts · Color banding in gradients · Dust and scratches on the negative · Hair or fiber in the film gate · Light leak on the film edge · Halide clumping / uneven development

**D. Đặc trưng phim & analog (Film & analog character)** (10)

Film base fog · Slightly faded contrast · Shifted color balance · Warm highlight roll-off · Filmic S-curve contrast · Push-processed high contrast · Polaroid emulsion edge · White instant-film border · Date stamp in the corner · VHS scanlines and tracking error

**E. Xử lý số & lọc (Digital treatment)** (15)

Minimal post-processing · Clean commercial retouch · Heavy beauty retouch · Dodge and burn sculpting · Frequency separation smoothing · Local contrast enhancement · Clarity / texture boost · Soft glow diffusion filter · Black pro-mist filter look · Orton effect glow · Split-tone shadows and highlights · Film grain overlay on digital · Crushed blacks in post · Bleach bypass processing · No sharpening applied

**F. Khung, viền & lớp phủ (Frame, border & overlay)** (5)

Letterbox black bars · Film sprocket holes visible · Contact sheet / film strip layout · Timestamp / camera OSD overlay · Deliberate uncropped raw framing

→ Giải nghĩa từng giá trị: **[26-post-processing.md](26-post-processing.md)**

---


## Nhóm G — OUTPUT

*Đầu ra & kiểm soát — file và những gì phải loại bỏ*

### 27. Output Spec — Ratio, Resolution & Text — *Đặc tả đầu ra — tỷ lệ, phân giải & chữ*  `(55 giá trị)`

**Câu hỏi:** File cuối cùng phải có hình dạng và kích thước nào — và trong ảnh có chữ không?  
**Bắt buộc:** ✅ Bắt buộc trên thực tế — mọi ảnh đều có một tỷ lệ, dù bạn có nêu hay không.

**A. Tỷ lệ khung (Aspect ratio)** (15)

1:1 square · 4:5 vertical portrait · 3:4 vertical · 2:3 vertical · 9:16 vertical full-screen · 4:3 horizontal · 3:2 horizontal · 16:9 widescreen · 1.85:1 cinematic · 2.39:1 anamorphic scope · 21:9 ultrawide · 5:4 near-square · 6:17 panoramic · A4 print portrait · Billboard landscape ratio

**B. Độ phân giải & chất lượng (Resolution & quality)** (7)

Web resolution, 1080px · High resolution, 2048px+ · Print resolution, 300 DPI · Large-format print quality · 4K frame · Maximum available resolution · Low-res, intentionally compressed

**C. Định dạng & kỹ thuật file (Format & technical)** (10)

Transparent background PNG · Pure white background, isolated · Solid color background · Seamless tileable pattern · Full-bleed, no border · Safe margins for print trim · sRGB color space · CMYK-safe colors for print · Single frame, no collage · Series of consistent variants

**D. Chữ & typography trong ảnh (Text in the frame)** (16)

No text anywhere in the image · No watermark, no logo · Blank space reserved for headline · Blank label, unbranded product · Background signage out of focus · Single short word, large and bold · Two- to three-word headline · Bold sans-serif typography · Serif editorial typography · Handwritten script text · Neon sign lettering · Text integrated into the scene · Latin characters only · Numbers only, large · Text-free safe zone at the bottom · Legible at thumbnail size

**E. Vùng an toàn theo nền tảng (Platform safe zones)** (7)

TikTok safe zone, center 60% · Instagram Stories safe zone · YouTube thumbnail with corner clear · Feed crop-safe center square · Website hero with center focus · Email header, short height · Print bleed 3mm on all sides

→ Giải nghĩa từng giá trị: **[27-output-spec.md](27-output-spec.md)**

---

### 28. Negative / Avoid List — *Danh sách loại trừ*  `(90 giá trị)`

**Câu hỏi:** Điều gì  
**Bắt buộc:** ⭕ Tuỳ chọn — nhưng gần như luôn cải thiện kết quả.

**A. Chống "nhựa hoá" (Anti-plastic — ưu tiên số 1)** (14)

plastic skin · airbrushed skin · waxy skin · over-smoothed face · poreless skin · doll-like features · uncanny valley face · overly symmetrical face · glossy highlights on skin · perfect teeth · mannequin look · 3D render look · CGI appearance · video game character

**B. Lỗi giải phẫu (Anatomy errors)** (15)

extra fingers · missing fingers · fused fingers · deformed hands · extra limbs · disconnected limbs · twisted joints · asymmetrical eyes · crossed eyes · malformed ears · extra teeth · distorted face proportions · unnatural neck length · floating body parts · duplicated subject

**C. Lỗi chữ & thương hiệu (Text & branding errors)** (11)

gibberish text · misspelled words · garbled lettering · random watermark · stock photo watermark · fake logo · signature or artist mark · subtitles or captions · UI elements or borders · frame within frame artifact · collage or split panels

**D. Lỗi ánh sáng & kỹ thuật (Lighting & technical errors)** (14)

blown-out highlights · crushed shadows with no detail · flat lifeless lighting · conflicting light directions · impossible shadows · double shadows · oversaturated colors · HDR halos · over-sharpened edges · heavy noise reduction smearing · banding in the sky · lens flare (unwanted) · out of focus subject · motion blur (unwanted)

**E. Chống "AI slop" thẩm mỹ (Anti-slop aesthetics)** (16)

overly staged pose · generic stock photo look · fake smile · cluttered background · busy distracting details · random floating particles · unnecessary bokeh balls · excessive lens effects · oversized eyes · generic beautiful face · Instagram filter look · overly warm orange grade · teal-orange cliché · wet glossy surfaces everywhere · flawless perfect environment · brand-new pristine objects

**F. Nội dung không mong muốn (Unwanted content)** (10)

additional people in background · crowd (when solitude is wanted) · modern objects in a period scene · visible camera or crew · reflection of the photographer · cars or traffic · power lines and clutter · animals (when unwanted) · food stains or mess · jewelry (when a clean look is wanted)

**G. Từ khoá "độc" nên tránh trong prompt tích cực** (10)

"cinematic masterpiece" · "hyper-detailed" · "ultra-glossy" · "perfect lighting" · "8k ultra HD" · "award-winning photography" · "trending on artstation" · "highly detailed, intricate" · "beautiful, stunning, gorgeous" · "professional, high quality"

→ Giải nghĩa từng giá trị: **[28-negative-prompt.md](28-negative-prompt.md)**

---

## 5. Thứ tự lắp prompt (build order)

Làm theo thứ tự này, mỗi bước một quyết định. Bước sau **không được** phủ định bước trước.

| Bước | Quyết định | Tham số | Ghi chú |
|---|---|---|---|
| 1 | Ảnh này để làm gì? | 22-intent, 27-output | Quyết tỷ lệ + chỗ cho chữ **trước** mọi thứ khác |
| 2 | Ảnh hay tranh/3D? | 24-art-medium | Bỏ trống nếu muốn ảnh chụp |
| 3 | Ai/cái gì là chủ thể? | 01, 02, 05, 06 | Cụ thể tới mức có thể hình dung ra một người thật |
| 4 | Chủ thể đang làm gì? | 03, 04, 07 | Close-up → biểu cảm; wide → dáng |
| 5 | Ở đâu, lúc nào, trời thế nào? | 08, 09, 10, 11 | Nêu 3–4 vật thể cụ thể trong bối cảnh |
| 6 | Nhìn từ đâu, bằng ống gì? | 12, 13, 14, 15, 16 | Chọn 1 cỡ cảnh + 1 góc, không chồng |
| 7 | Camera có di chuyển? | 17 | Chỉ video · một chuyển động duy nhất |
| 8 | Sắp xếp trong khung ra sao? | 18 | Nếu có chữ, chọn copy space ở đây |
| 9 | Sáng từ đâu, chất gì? | 19, 20 | **Không viết** `cinematic lighting` |
| 10 | Bề mặt cảm giác thế nào? | 25, 26 | 2–3 texture + 1–3 artefact |
| 11 | Cảm giác chung? | 21 | **Tối đa 2 từ** |
| 12 | Có treatment đặc biệt? | 23 | Có thể bỏ trống — thường nên bỏ |
| 13 | Loại bỏ gì? | 28 | Bộ 5 mặc định nếu có người |

---

## 6. Checklist trước khi generate

Từ PDF (6 câu gốc) + mở rộng:

- [ ] Chủ thể đã đủ cụ thể chưa?
- [ ] Tôi có biết cảnh này diễn ra ở đâu?
- [ ] Tôi đã nói cho AI biết camera nhìn cảnh thế nào?
- [ ] Tôi đã mô tả **ánh sáng đến từ đâu** (không chỉ nói "cinematic")?
- [ ] Tôi đã chọn **1–2** từ mood (không phải 5)?
- [ ] Tôi chỉ thêm style **khi nó thật sự giúp**?
- [ ] Tỷ lệ khung đúng với nơi ảnh sẽ được dùng?
- [ ] Nếu ảnh cần chữ, đã chừa khoảng trống thay vì nhờ AI viết?
- [ ] Không có tham số nào phủ định tham số khác? *(nét sâu vs bokeh mạnh · phim vs ultra-sharp · UGC vs luxury · đóng băng vs nhoè)*
- [ ] Nếu muốn chân thực: đã có ít nhất một trong `natural skin pores visible` · `subtle film grain` · `light fabric creasing detail`?

> **Nếu kết quả trông chung chung, đừng đổ lỗi cho model trước.** Hãy kiểm tra phần nào của framework đang thiếu hoặc không rõ. Đó thường là nơi cần sửa.

---

## 7. Bảy cặp xung đột thường gặp

Đây là những cặp giá trị **triệt tiêu nhau** — chọn cả hai thì AI sẽ chọn ngẫu nhiên một cái:

| Xung đột | Vì sao | Cách xử lý |
|---|---|---|
| `deep focus clarity` + `extremely shallow depth of field` | Mâu thuẫn vật lý | Chọn `moderate depth of field` nếu cần cả bối cảnh và tách chủ thể |
| Chất phim (`Kodak Portra`) + `ultra sharp clarity` | Phim vốn không sắc lẹm | Bỏ `ultra sharp clarity` |
| `social media UGC` + `luxury brand campaign` | Hai đầu đối lập của thang "bóng bẩy" | Chọn một |
| `freeze-frame` + `motion blur` | Mâu thuẫn trực tiếp | Chọn một, hoặc `subject sharp, background streaked` |
| `14mm ultra-wide` + `tight close-up portrait` | Mặt sẽ méo | Dùng `85mm` cho close-up |
| Bối cảnh chi tiết + `extremely shallow DOF` | Bạn vừa xoá công của mình | Dùng `moderate depth of field` |
| `candlelit glow` + `harsh midday sunlight` | Hai nguồn sáng loại trừ nhau | Quyết định time-of-day trước |

---

## 8. Sáu điểm link gốc còn thiếu (và đã được sửa ở bộ này)

| Vấn đề trong link gốc | Đã sửa thế nào |
|---|---|
| `Facial Expression` — có tên, **0 giá trị** | [03-facial-expression.md](03-facial-expression.md) — 104 giá trị, 9 nhóm cảm xúc |
| `Gesture` — có tên, **0 giá trị** | [04-gesture-pose.md](04-gesture-pose.md) — 105 giá trị, 7 nhóm |
| `Subject` chỉ có archetype người (50/50 là người mẫu/influencer) | [01-subject.md](01-subject.md) mở rộng sang nghề nghiệp, sản phẩm, sinh vật, cảnh vật; thêm [06-product-subject.md](06-product-subject.md) cho 7 trục sản phẩm mà PDF yêu cầu |
| `Camera` trộn lẫn 4 trục (cỡ cảnh, góc, tiêu cự, DOF) | Tách thành [12](12-camera-shot.md) · [13](13-camera-lens.md) · [15](15-focus-depth.md) · [18](18-composition.md), giữ nguyên toàn bộ 50 giá trị gốc để đối chiếu |
| `Camera Movement` lẫn cả góc máy và loại shot tĩnh | Giữ nguyên + đánh dấu rõ trong [17](17-camera-movement.md) §F |
| Không có: thời gian, thời tiết, đạo cụ, thân máy/chất phim, khẩu độ, chuyển động, bố cục, màu, chất liệu nghệ thuật, hậu kỳ, tỷ lệ khung, negative prompt | 16 tham số mới — xem bảng chỉ mục §3 |
| `Mood` có 192 giá trị nhưng **không có mood thương mại** (aspirational, trustworthy, premium…) | [21-mood.md](21-mood.md) §CC — 20 giá trị bổ sung |

---

*File này được **sinh tự động** từ 28 file tham số trong cùng thư mục. Muốn thêm/sửa giá trị: sửa file tham số tương ứng rồi sinh lại file này, để hai bên không bao giờ lệch nhau.*
