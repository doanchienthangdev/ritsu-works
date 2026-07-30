---
name: prompt/enhance
description: |
  The `enhance` verb of /prompt — diagnose an EXISTING image prompt against the 6-part AVB
  framework, name which parts are missing/weak/unclear, repair them, and report the diff.
  Implements the framework's own diagnosis rule ("if a result looks generic, do not blame
  the model first — check which part was missing") plus the auto-enhance warning from the
  source lessons: an enhancer that silently adds detail the author never asked for is a
  bug, so every change is reported. Strips banned phrases. Invoked by the `prompt` umbrella
  when verb=enhance.
allowed-tools: [Read, Bash, Grep, AskUserQuestion]
disable-model-invocation: false
---

# prompt/enhance — diagnose, repair, and show your work

> *"If a result looks generic, do not blame the model first. Check which part of the
> framework was missing or unclear. That is usually where the fix is."*

The input is an existing prompt plus, usually, a complaint ("trông vẫn giả", "nền xấu",
"muốn ấm hơn"). Output is a repaired prompt **and a diff the founder can argue with**.

---

## 1. Diagnose against the six parts

Score each part of the input prompt: **present / weak / missing**.

| Part | Present | Weak | Missing |
|---|---|---|---|
| **Subject** | age, hair, wardrobe, what they are doing | "a woman" | no subject noun |
| **Environment** | a place + 3–4 concrete objects | "in a city" | no place |
| **Camera** | shot size + angle (+ lens) | "close up" alone | nothing |
| **Lighting** | source + direction + quality | "cinematic lighting", "golden lighting" | nothing |
| **Mood** | 1–2 words | 4+ mood words | nothing |
| **Style** | one deliberate treatment | 3 stacked styles | *(missing is fine — style is optional)* |

Print this as a small table **before** the repaired prompt. That table is most of the value
of `enhance`: it teaches the founder where their prompts leak.

## 2. Then run the four failure scans

| Scan | Look for | Repair |
|---|---|---|
| **Banned phrases** | the `banned_phrases` list in the registry | delete; if it was `perfect lighting`, replace with a real source |
| **Light plausibility** | studio/ring light in a non-studio place; light that contradicts the stated hour | re-source from what the place actually offers; add `no studio lighting` |
| **Conflict pairs** | the 7 pairs in `library/00-MASTER-REFERENCE.md` §7 | drop one side, name which |
| **Realism anchors** | fewer than 3 anchors when the brief implies a real photo | add per `realism/SKILL.md` |

## 3. Honour the complaint literally

Map the founder's words to the parameter that actually controls them. Do not repair
everything you notice — repair what was asked, plus anything that is objectively broken.

| Complaint | Real cause | Parameter to change |
|---|---|---|
| "trông vẫn giả / như AI" | almost always anchor #2 or #3, not #1 | `19-lighting` · `12-camera-shot` · `14-camera-body-film` |
| "da như nhựa" | anchor #1 | `25-texture` · `02-casting` |
| "nền xấu / nền giả" | anchor #3 | `08-environment` · `11-props` · `15-focus-depth` |
| "thiếu cảm xúc" | expression at the wrong shot size | `03-facial-expression` · `12-camera-shot` |
| "màu chưa đúng" | grade, not lighting | `20-color-palette` |
| "chưa sang" | usually *less*, not more | `21-mood` → `understated`; simplify composition |
| "không có chỗ đặt chữ" | composition | `18-composition` copy-space values |
| "mặt đẹp nhưng áo sai" | change only wardrobe | `05-wardrobe-styling` — leave everything else alone |

## 4. Report the diff — non-negotiable

The source lesson's warning about auto-enhancers:

> *"Enhanced prompts can sometimes add extra details you did not ask for. Always check the
> improved prompt and make sure it still matches your original idea."*

So `enhance` must never silently expand. Print, after the repaired prompt:

```
Đã đổi:
  + thêm  : <what and why>
  – bỏ    : <what and why>
  ~ sửa   : <from> → <to>
Giữ nguyên: <the parts of the author's intent that were preserved>
```

If a change is a judgement call rather than a fix, say so — and offer the alternative in
one clause so the founder can take it back.

## 5. Do not rewrite the idea

`enhance` repairs execution, never intent. If you believe the concept itself is the
problem, say that in one sentence and still deliver the repaired version of **their**
concept. Rewriting someone's idea under the banner of "enhancing" it is the failure mode
this skill exists to avoid.

If the input prompt is too vague to repair without inventing (e.g. `a cool photo of a
girl`), ask **one** `AskUserQuestion` for the missing part rather than inventing six.

## 6. Output

Same `--mode` and `--output` contract as `build` — the repaired prompt goes in a code
block (or markdown / artifact), preceded by the diagnosis table and followed by the diff.
