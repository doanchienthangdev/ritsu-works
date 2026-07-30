---
name: prompt/directions/image
description: |
  The image direction of /prompt — the craft skill. Turns an idea into a prompt a
  legendary photographer and director would sign off on: shot size chosen because it
  sells the emotion, lighting described as source + direction + quality (never
  "cinematic lighting"), physically possible light for the place and hour, and the three
  AI giveaways actively neutralised. Runs on the 28-parameter library in
  06-ai-ops/skills/prompt/library/ but is explicitly allowed to combine or invent values.
  Emits four shapes — text (long prose), json (full object), ref (preserve/change against
  a reference image), smart (shortest prompt that still lands) — and adapts syntax per
  model (gpt-image-2 prose + trailing `photorealism`, Midjourney prose + `--ar --style raw`).
  Invoked by the `prompt` umbrella for verb=build.
allowed-tools: [Read, Bash, Glob, Grep, AskUserQuestion]
disable-model-invocation: false
---

# prompt/directions/image — write the prompt a great director would write

> You are not filling in a form. You are giving direction to a crew.
> A prompt with 20 parameters and no point of view is worse than a prompt with 8
> parameters chosen by someone who knows why.

---

## 1. Read the brief before touching the library

From the user's input, extract — silently, in one pass:

| What | How to read it |
|---|---|
| **Subject** | person / product / place / abstract. Person ⇒ casting + expression + pose matter most. Product ⇒ the 7 axes of `06-product-subject`. |
| **Job of the image** | ad · UGC · editorial · avatar · thumbnail · e-commerce. This sets intent, aspect ratio, and how polished the result may be. |
| **Platform** | TikTok/Reels ⇒ `9:16`. Feed ⇒ `4:5`. YouTube/web ⇒ `16:9`. Marketplace ⇒ `1:1` white. Unstated + no other signal ⇒ **ask**. |
| **Realism target** | "looks real" / "influencer" / "UGC" ⇒ `--realism=max`. "campaign", "product" ⇒ `balanced`. "anime", "3D", "illustration" ⇒ `off`. |
| **Emotional beat** | the one feeling the image must land. Drives mood, expression, lighting contrast. |
| **Constraints** | text space needed? brand colours? existing character? |

If the brief is in Vietnamese, read it in Vietnamese — but **write the prompt in English**.
Image models are trained overwhelmingly on English captions; a Vietnamese prompt is a
handicap you are choosing to accept for no reason. Explain in Vietnamese, prompt in English.

## 2. Build order — decide in this sequence

Each step constrains the next. Going backwards means contradicting yourself.

1. **Intent + aspect ratio** (`22-intent`, `27-output-spec`) — decides framing budget and copy space.
2. **Medium** (`24-art-medium`) — leave blank for photography. Filling it exits photo-realism entirely.
3. **Subject** (`01`, `02`, `05`, `06`) — a person you could pick out of a crowd.
4. **Expression + pose + action** (`03`, `04`, `07`) — close-up ⇒ spend on the face; wide ⇒ spend on the body.
5. **Environment + hour + weather + props** (`08`, `09`, `10`, `11`) — name 3–4 concrete objects, not just a place.
6. **Camera** (`12`, `13`, `14`, `15`, `16`) — one shot size, one angle, one lens.
7. **Composition** (`18`) — if the image will carry text, choose copy space HERE.
8. **Lighting + colour** (`19`, `20`) — source, direction, quality. Never the word "cinematic".
9. **Texture + post** (`25`, `26`) — 2–3 texture values, 1–3 optical artefacts.
10. **Mood** (`21`) — **one or two words**. This is the parameter where more is worse.
11. **Style** (`23`) — usually leave empty. Fill it only for a specific treatment.
12. **Negative** (`28`) — 5 defaults when a person is in frame.

Query the library per parameter; do not load it whole:
```bash
node scripts/prompt/lib/library.cjs values lighting
node scripts/prompt/lib/library.cjs search "wet street neon"
```

## 3. The four judgements that separate good from average

**(a) Shot size is an emotional decision, not a framing one.**
Close-up sells a feeling. Medium sells a person. Wide sells a world. Choose the one that
carries the beat you identified in §1, then let it dictate where you spend words: at
`tight close-up` the pose is invisible, at `wide` the expression is.

**(b) Lighting is the difference between believable and not.**
Never write `cinematic lighting`, `beautiful lighting`, `golden lighting`. Write the
**source**, the **direction**, and the **quality**:
> *a small warm table lamp on the left side of the frame lighting her face, while the rest of the room falls into soft shadow*

And name **two** sources when the scene would realistically have two — real interiors mix
a cool window with a warm lamp. `mixed color temperature` is one of the cheapest realism
wins available.

**(c) Specificity in the environment is what makes an image look expensive.**
`in a city` is nothing. `on a narrow side street in Hong Kong at night, neon signs stacked
above small food stalls, scooters parked along the pavement, steam rising from a noodle
cart, wet ground reflecting the lights` is a world. Four concrete nouns beat any adjective.

**(d) One or two mood words. Ever.**
And the strongest pairs are slightly contradictory — `luxurious and lonely`,
`bright and unsettling`, `quiet and exhausted`. Two words from the same family
(`dark and gloomy`) is just repetition.

## 4. Cross-checks — run all four BEFORE printing

| Check | What fails | Fix |
|---|---|---|
| **Light plausibility** | studio/ring light outdoors; candlelight at midday; window light in a windowless room | Re-pick lighting from what the place and hour actually offer |
| **Budget placement** | micro-texture on a wide shot; elaborate pose on an extreme close-up | Move the detail budget to what is visible at that shot size |
| **Conflict pairs** | the 7 pairs in `library/00-MASTER-REFERENCE.md` §7 (deep focus + f/1.2, film stock + ultra-sharp, UGC + luxury, freeze + blur, 14mm + close-up portrait, detailed background + extreme bokeh, candlelight + midday sun) | Drop one side; say which in the rationale |
| **Realism anchors** | `--realism=max` with fewer than 3 anchors present | Add the missing anchor(s) per `realism/SKILL.md` |

If a check fires and you fix it, **say so in the rationale line.** Silent repair teaches
the founder nothing.

## 5. Output shapes

### `--mode=text` (default)

One paragraph, ~60–120 words, in AVB order:

> `[subject + casting + wardrobe] [action/expression] in [environment + hour + weather],
> [shot size + angle], [lens + body/film], [lighting source + direction + quality],
> [composition], [texture + artefacts], [mood], [style if any].`

Prose, comma-separated, no bullet points, no headings, no parameter labels. It must read
like a photographer briefing an assistant — not like a filled-in template.

### `--mode=json`

```json
{
  "intent": "…", "aspect_ratio": "…", "model": "gpt-image-2",
  "subject": "…", "casting": "…", "wardrobe": "…",
  "facial_expression": "…", "gesture_pose": "…", "action": "…",
  "environment": "…", "time_of_day": "…", "weather": "…", "props": "…",
  "camera": "…", "lens": "…", "camera_body_film": "…", "focus": "…", "motion": "…",
  "composition": "…", "lighting": "…", "color": "…",
  "texture": ["…"], "post_processing": ["…"],
  "mood": ["…"], "style": "…", "art_medium": null,
  "negative": ["…"],
  "assembled_prompt": "…the same content as --mode=text, so the object is self-contained…"
}
```

Always include `assembled_prompt` — a JSON object nobody can paste into an image model is
a data structure, not a prompt.

### `--mode=ref`

Two blocks, `preserve` first, `change` second — the discipline from `REALISM-PLAYBOOK.md` §4.

> `Use the uploaded image as a [character|product|pose] reference. Keep the same
> [face, hairstyle, skin tone, body type, and overall identity]. Change [outfit] to […]
> and place [her] in […]. [camera] [lighting] [expression] [realism details].`

Rules:
- Name the reference **intent** explicitly (identity / outfit / product / pose-only). An
  unnamed reference gets copied wrongly — usually the pose when you wanted the face.
- If `--preserve`/`--change` were passed, honour them exactly. If not, infer and **state
  the inference** in the rationale.
- Keep `no studio lighting` and skin-texture language even here; consistency work fails
  most often by drifting into plastic.

**When the ref is `kind: 'attached'` — LOOK at it before writing.** You can see the image;
use that. Name the specific garments, hair, and features you actually observe (*"the same
maroon ribbed quarter-zip sweater over a white collared shirt"*), not a generic
*"same outfit"*. A preserve clause written from the actual image holds far better than one
written from the word "preserve".

Three things to get right with an attached ref:

1. **Kill the reference's lighting explicitly** if the new scene has different light.
   *"Discard the reference's soft indoor window light entirely"* — otherwise the model
   carries it over and you get a face lit like a studio in a night street. This is
   anchor #2 failing, and it is the **most common ref-mode defect**.
2. **Preserving a face is not preserving an expression.** If the reference smiles and the
   brief is exhausted, say so: *"change his expression from the reference's relaxed
   half-smile to exhausted and withdrawn"*.
3. **Say what the reference does not show.** A chest-up portrait tells the model nothing
   below the chest, so it will invent — and while inventing it may drift the top too.
   *"plain dark jeans below the chest, which the reference does not show"* contains that.

### `--mode=smart`

Shortest prompt that still lands the brief. Drop any parameter whose removal would not
change the image. Typically 25–45 words. This is the mode to reach for with strong models,
where a long prompt dilutes rather than directs.

**The test:** for each parameter, ask *"if I delete this, does the image change in a way I
care about?"* If no — delete it. `smart` is not `text` truncated; it is `text` with every
non-load-bearing word removed.

## 6. Per-model syntax

| Model | Shape | Realism lever |
|---|---|---|
| `gpt-image-2` *(default)* | prose | append **`photorealism`** as the final word |
| `nano-banana-pro` | prose | strongest at reference consistency — lean on `--mode=ref` |
| `midjourney` | prose **+ trailing flags** | `--style raw`; ratio via `--ar 16:9`; negatives via `--no <list>` (not a prose sentence) |
| `flux` | prose | follows long prose faithfully; no special keyword |
| `generic` | prose | no engine-specific keyword or flag |

Midjourney example tail: `… quiet and nostalgic mood. --ar 4:5 --style raw --no plastic skin, extra fingers`

## 7. `--count > 1`

Do not produce N paraphrases of one idea. Vary along **one deliberate axis** and say which:
shot size, hour of day, wardrobe, or emotional beat. Label each prompt with its variation
(`Variant 2 — golden hour`). N near-identical prompts waste the founder's generations.

## 8. Worked example

**Input:** `/prompt image "ảnh nữ influencer fitness 24 tuổi tự chụp ở phòng gym, dùng cho ad TikTok"`

**Reasoning:** TikTok ⇒ `9:16`. "Influencer + tự chụp" ⇒ UGC ⇒ `--realism=max`, all three
anchors, iPhone language, no studio lighting. Gym ⇒ overhead fluorescent + window, mixed
temperature. Selfie ⇒ front camera, slight distortion, arm's-length framing. Beat: earned
exhaustion, not glamour.

**Output (`--mode=text`, `gpt-image-2`):**

> A candid mirror selfie of a 24-year-old woman with a high ponytail and light freckles,
> athletic build, wearing a black sports bra and grey leggings, mid-exhale after a set with
> flushed cheeks and sweat on her collarbone, standing in a busy commercial gym with rubber
> flooring, loaded barbells racked behind her and a water bottle on the floor, shot on an
> iPhone 15 front camera at arm's length, slightly off-centre handheld framing, harsh
> overhead fluorescent light mixed with cool daylight from a side window, no studio
> lighting, natural skin pores visible with light skin imperfections, matte skin finish,
> subtle sensor noise, quiet and determined mood, photorealism

**Rationale to print:** *Chọn selfie gương + iPhone front camera vì UGC TikTok cần nền
không kiểm soát; đèn huỳnh quang trần trộn sáng cửa sổ là ánh sáng thật của phòng gym, nên
đã loại bỏ studio lighting; ba chốt chống-AI đều có mặt (lỗ chân lông, da mờ, khung hơi
lệch). Tỷ lệ 9:16.*

## 9. Never emit

`cinematic masterpiece` · `hyper-detailed` · `ultra-glossy` · `perfect lighting` ·
`award-winning` · `8k ultra HD` · `trending on artstation` · `masterpiece` · `best quality`

They describe an effect instead of giving direction, and pull the model toward the average
of rendered images. The full list is pinned in `knowledge/prompt-directions.yaml`
(`banned_phrases`).
