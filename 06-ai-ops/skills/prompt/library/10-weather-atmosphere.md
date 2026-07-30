<!-- param: weather | order: 10 | label_en: Weather & Atmosphere | label_vi: Thời tiết & khí quyển | group: B | source: new -->

# 10 — Weather & Atmosphere (Thời tiết & khí quyển)

> **Câu hỏi:** *Không khí giữa ống kính và chủ thể có gì?*
> **Vai trò:** Framework AVB liệt kê `weather` và `atmosphere` là hai lớp phải có của Environment. Đây là tham số **rẻ nhất để tạo chiều sâu**: hạt trong không khí làm nền tách khỏi chủ thể mà không cần khẩu độ mỏng.
> **Trạng thái trong link gốc:** ❌ Không có tham số riêng (chỉ rải rác vài giá trị trong Texture như `fog density in atmosphere`).
> **Bắt buộc:** ⭕ Tuỳ chọn — nhưng là một trong những đòn bẩy hiệu quả nhất trên mỗi từ.

**Cách dùng:** Chọn **1 điều kiện thời tiết** + tuỳ chọn **1 hạt/khí quyển**. Nhớ nêu **hệ quả trên bề mặt** (mặt đất ướt, tóc bết, kính mờ) — đó là chỗ ảnh trở nên thật.

---

## A. Trời quang & nắng

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 1 | Clear sky, bright sun | Trời quang nắng rõ; bóng cứng, màu no. | + |
| 2 | Hazy sunshine | Nắng qua lớp mờ; mềm hơn, hơi nostalgic. | + |
| 3 | Dry heat shimmer | Không khí nóng khô rung; sa mạc, trưa hè. | + |
| 4 | Humid tropical air | Không khí nhiệt đới ẩm; da bóng mồ hôi, ống kính hơi mờ. | + |
| 5 | Crisp cold clear air | Không khí lạnh trong; sắc nét cực đại, hơi thở thấy được. | + |

## B. Mây & xám

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 6 | Overcast, flat grey sky | Nhiều mây, trời xám phẳng; softbox tự nhiên, dễ nhất. | + |
| 7 | Broken clouds, patchy light | Mây rời, sáng lốm đốm; sáng thay đổi, kịch tính. | + |
| 8 | Heavy storm clouds gathering | Mây bão đang tụ; báo hiệu, căng, tối phía trên. | + |
| 9 | Dramatic sky with god rays | Trời kịch tính có tia sáng xuyên mây; hùng vĩ, thiêng. | + |
| 10 | Low grey monsoon sky | Trời mùa mưa xám thấp; đặc trưng Đông Nam Á. | + |

## C. Mưa & nước

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 11 | Light drizzle | Mưa lâm thâm; ẩm nhẹ, mặt đường bắt đầu bóng. | + |
| 12 | Steady rain | Mưa đều; nhịp, giọt thấy rõ nếu ngược sáng. | + |
| 13 | Heavy downpour | Mưa xối xả; giảm tầm nhìn, tăng kịch tính. | + |
| 14 | Rain just stopped, wet ground | Mưa vừa tạnh, đất ướt; **giá trị đẹp nhất** — phản chiếu đèn mà không có giọt che mặt. | + |
| 15 | Puddles reflecting light | Vũng nước phản chiếu; nhân đôi nguồn sáng, bố cục đối xứng. | + |
| 16 | Rain on a window pane | Mưa trên mặt kính; lớp ngăn cách, nội tâm, bokeh giọt nước. | + |
| 17 | Water droplets on skin | Giọt nước trên da; sau mưa/sau tắm/sau bơi. | + |
| 18 | Sea spray in the air | Bụi nước biển trong không khí; mặn, gió, ven biển. | + |
| 19 | Splashing water mid-air | Nước bắn giữa không trung; cần freeze-frame. | + |
| 20 | Steam from wet asphalt | Hơi bốc từ nhựa đường ướt; mưa gặp nóng, rất đô thị. | + |

## D. Sương & khói

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 21 | Light morning mist | Sương mỏng buổi sáng; mềm, tách lớp cảnh. | + |
| 22 | Dense fog | Sương dày; nền biến mất hoàn toàn, tối giản cưỡng bức. | + |
| 23 | Fog rolling in | Sương đang tràn vào; chuyển động, bí ẩn. | + |
| 24 | Low-lying ground fog | Sương sát mặt đất; siêu thực, kỳ ảo. | + |
| 25 | Atmospheric haze compressing distance | Mờ khí quyển nén khoảng cách; núi xa nhạt dần — tạo chiều sâu. | + |
| 26 | Smoke drifting through the frame | Khói trôi qua khung; thấy được tia sáng, sang. | + |
| 27 | Cigarette smoke curling | Khói thuốc uốn lượn; noir, cần cân nhắc thông điệp. | + |
| 28 | Industrial smog | Khói bụi công nghiệp; dystopian, ô nhiễm. | + |
| 29 | Steam-filled interior | Nội thất đầy hơi nước; phòng tắm, bếp, phòng xông. | + |
| 30 | Dry ice / theatrical fog | Khói sân khấu/đá khô; dựng cảnh, sản phẩm. | + |

## E. Hạt trong không khí (Airborne particles)

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 31 | Dust motes in a sunbeam | Bụi lơ lửng trong tia nắng; **mẹo kinh điển** để tia sáng hiện hình. | + |
| 32 | Swirling dust storm | Bão bụi cuộn; khắc nghiệt, hành động. | + |
| 33 | Pollen / seeds floating | Phấn hoa/hạt bay; mùa xuân, thơ, mềm. | + |
| 34 | Falling leaves | Lá rơi; thu, chuyển tiếp, chuyển động chậm. | + |
| 35 | Petals in the air | Cánh hoa bay; lãng mạn, nữ tính. | + |
| 36 | Ash falling | Tro rơi; thảm hoạ, hậu tận thế. | + |
| 37 | Embers / sparks rising | Than hồng/tia lửa bay lên; lửa, công nghiệp, kịch tính. | + |
| 38 | Confetti mid-air | Kim tuyến giữa không trung; ăn mừng, sự kiện. | + |
| 39 | Bubbles floating | Bong bóng bay; trẻ thơ, vui, nhẹ. | + |
| 40 | Insects / fireflies glowing | Đom đóm phát sáng; đêm, thần tiên. | + |

## F. Lạnh & tuyết

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 41 | Light snowfall | Tuyết rơi nhẹ; thơ, chậm, đẹp. | + |
| 42 | Heavy snowstorm | Bão tuyến dày; giảm tầm nhìn, khắc nghiệt. | + |
| 43 | Fresh snow on the ground | Tuyết mới trên mặt đất; phản xạ mạnh, sáng đều từ dưới lên. | + |
| 44 | Frost on glass | Băng giá trên kính; hoa văn tự nhiên, lạnh. | + |
| 45 | Visible breath in cold air | Hơi thở thấy được trong khí lạnh; chi tiết nhỏ, độ thật cao. | + |
| 46 | Icicles / frozen surfaces | Nhũ băng/bề mặt đóng băng; trong suốt, khúc xạ. | + |
| 47 | Snowflakes on clothing | Bông tuyết trên quần áo; cận cảnh, kết cấu. | + |

## G. Gió & khắc nghiệt

| # | Value (EN) | Ý nghĩa / cách dùng (VI) | Src |
|---|---|---|---|
| 48 | Gentle breeze | Gió hiu nhẹ; tóc và vải chỉ hơi động — tự nhiên nhất. | + |
| 49 | Strong wind, hair and fabric flying | Gió mạnh, tóc và vải bay; động lực tức thì cho ảnh tĩnh. | + |
| 50 | Gale-force wind | Gió giật cấp bão; phải chống, kịch tính. | + |
| 51 | Still air, nothing moving | Không khí tĩnh hoàn toàn; ngột ngạt hoặc thiêng liêng. | + |
| 52 | Lightning illuminating the scene | Sét chiếu sáng cảnh; nguồn sáng chớp nhoáng, tương phản cực cao. | + |
| 53 | Distant thunder, pre-storm stillness | Sấm xa, tĩnh trước bão; căng nhất. | + |
| 54 | Heatwave / oppressive air | Nắng nóng ngột ngạt; mồ hôi, kiệt sức. | + |
| 55 | Sandstorm haze | Mờ bão cát; cam vàng, khắc nghiệt, sa mạc. | + |

---

## Lưu ý khi viết Weather & Atmosphere

- **Luôn nêu hệ quả, không chỉ hiện tượng.** `raining` yếu. `rain just stopped, wet ground reflecting the neon signs` mạnh — vì bạn đã cho AI một bề mặt và một nguồn sáng.
- **`Rain just stopped, wet ground` gần như luôn tốt hơn `heavy downpour`** cho ảnh có người: bạn được phản chiếu đèn mà không bị giọt nước che mặt.
- **Hạt trong không khí = chiều sâu miễn phí.** `dust motes in a sunbeam`, `light morning mist`, `atmospheric haze` tách nền khỏi chủ thể mà không cần bokeh — hữu ích khi bạn muốn nền vẫn đọc được.
- **Tia sáng chỉ hiện khi có hạt.** Muốn `volumetric light rays` ở [19-lighting](19-lighting.md) hoạt động, bắt buộc phải có sương/khói/bụi ở đây.
- **Tuyết và sương làm giảm tương phản.** Bù bằng một nguồn sáng có hướng rõ, nếu không ảnh sẽ xám phẳng.
- **Đừng chồng thời tiết.** Sương dày + mưa xối + gió bão = AI trung bình hoá thành "trời xám mờ". Chọn một cái làm chủ.
