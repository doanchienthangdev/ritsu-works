# FOOTAGE — asset manifest · Ep 1 "What Is Ritsu?"

Every visual/audio asset has a **code**; the filename IS the code:

```
<CODE>-<NN>-b<BEAT>.<ext>
```

Whole-film assets use `-all`. Beat = the shot number in `SCRIPT.md`'s production table.

**Runtime:** 208s (3:28). Within `explainer` bounds (`min_s 60 · max_s 300`); over the
type's 175s target, which is expected for a series opener that has to install the frame.

---

## 1 · Narration — `voice` (14 clips) · ✅ **generated**

**One clip per shot** — re-recording a single line never forces a re-stitch. Generated
with `/voice --use=elevenlabs --voice=KAI --type=explainer`, then loudness-matched.

| Code | Beat | Line | Actual |
|---|---|---|---|
| `VO-01-b1` | 1 | "Everything you're trying to learn is outside you right now…" | **11.5s** |
| `VO-02-b2` | 2 | "And there has never been more of it…" | **7.1s** |
| `VO-03-b3` | 3 | "But none of that is learning. That's supply." | **2.3s** |
| `VO-04-b3a` | 3a | "And reading it isn't learning either. That's consuming." | **2.4s** |
| `VO-05-b3b` | 3b | the definition + "So you own it." | **10.6s** |
| `VO-06-b6` | 6 | the hand-built bridge | **20.2s** |
| `VO-07-b7` | 7 | "Ritsu is that bridge…" | **6.6s** |
| `VO-08-b8` | 8 | "Watch. One chapter, one sentence…" | **4.5s** |
| `VO-09-b9` | 9 | "I'm not going to speed this up. This is real time." | **2.4s** |
| `VO-10-b10` | 10 | the plan reveal + the chips | **11.4s** |
| `VO-11-b11` | 11 | "But a plan is still outside." | **5.9s** |
| `VO-12-b12` | 12 | "A chat window answers you…" | **7.3s** |
| `VO-13-b13` | 13 | the 42 + Feynman / Bloom / counter-example | **15.7s** |
| `VO-14-b14` | 14 | "…Thirty ideas that used to be outside." | **7.7s** |

**Loudness: PASS.** All 14 at −16 LUFS ±0.25, worst true peak −1.60 dBTP.
Integrated spread **0.47 LU** (gate tolerance 1.0).

> **Finding, worth fixing in the capability.** `audio.cjs normalizeLoudness()` with its
> default `level:true` single-pass path **under-corrects on clips shorter than ~3s** —
> `loudnorm`'s dynamic mode can't measure a 2.3s clip reliably, so `VO-03` sat at
> −22 LUFS (6.6 LU below its neighbours) after a "successful" normalise. The fix that
> worked: **level first, then two-pass MEASURED loudnorm** (`level:false`), which hits
> integrated and true-peak together. Worth encoding as an automatic short-clip branch.

> Shots 4, 5 and 15 are **avatar**, not voice-over — their audio is inside the AV clip.
> Do not generate VO for them or the film double-speaks.

---

## 2 · Avatar — `avatar` (3 clips) · **generatable (HeyGen)**

KAI, letterboxed, matching `video/design-systems/ritsu/frame.md`.

| Code | Beat | Line | Target |
|---|---|---|---|
| `AV-01-b4` | 4 | *"That's the move from outside to inside. And it has a name. Mastery…"* | 10s |
| `AV-02-b5` | 5 | *"You've read the chapter twice…"* — continuous with AV-01, same setup | 8s |
| `AV-03-b15` | 15 | the close + hand-off to Ep 2 | 14s |

**Continuity:** AV-01 and AV-02 are one performance cut in two. Generate as a single take
and split — a re-frame between them reads as a jump cut.

**Loudness:** HeyGen audio arrives hotter than ElevenLabs. Normalise every AV clip to the
same −16 LUFS / −1.5 dBTP before composing, or shots 4→6 step up in volume. This was the
#1 defect in the launch film.

---

## 3 · Motion graphics — `mg` (7 clips) · **authored in HyperFrames, not filmed**

These are the episode. All authored in `index.html` against `frame.md` — no external
renders, no stock.

| Code | Beat | What it is |
|---|---|---|
| `MG-01-b1` | 1 | the pile builds on the LEFT; left third labels itself **`OUTSIDE`** |
| `MG-02-b2` | 2 | the pile multiplies and **desaturates** — a rising tide, not a feature |
| `MG-03-b3` | 3 | everything stops · vertical rule draws · right labels **`INSIDE`** and is empty |
| `MG-04-b3a` | 3a | one document lifts, passes through a reader silhouette, **falls back left** |
| `MG-05-b3b` | 3b | **`UNDERSTAND` · `PRACTISE` · `RETAIN` · `APPLY`** type onto the INSIDE side |
| `MG-06-b6` | 6 | five app-planks lay across the gap at wrong angles; grey out incomplete |
| `MG-07-b14` | 14 | the split, third time — **30 items travel left → right** |

**The split must be one reusable component**, not three drawings. It appears in `MG-03`,
in shot 11 (as an overlay on live UI) and in `MG-07`. Same geometry, same type, same
positions — that identity is the entire device.

---

## 4 · Screen capture — `screen` (7 clips) · ⚠️ **HAND-OFF — record these**

`/video` cannot record a screen. Specs below are exact; drop the files in
`assets/screen/` and run `--resume`.

**Global capture settings** (match the launch film, whose grade is already proven):
- Retina display, browser at **1600×1000**, dark theme, **hide the bookmarks bar**
- Record **2880×1620**, crop `2880:1620:0:120`, scale to **2560×1440** lanczos, **30 fps**
- **Mute system audio** — narration is separate
- Signed in as `Ritsu Demo`; use the session **`LLM Fundamentals: Fast-Track Exam Prep`**

| Code | Beat | Record exactly this | Length |
|---|---|---|---|
| `SC-01-b7` | 7 | The `Hello, Ritsu` screen, idle, cursor blinking in the prompt box. No interaction. | 10s |
| `SC-02-b8` | 8 | Same screen; cursor placed in **`Describe what you want to focus on…`**. Still no typing. | 10s |
| `SC-03-b9` | 9 | **THE UNCUT SHOT.** Type *"I want to learn this chapter fast for my exam."* → `File` tab → drop `llm_chapter.pdf` → `⌘↵` → **let generation run to completion without cutting or speeding up.** | ~35s |
| `SC-04-b10` | 10 | The finished plan header. Slow scroll so title, description and the full chip row are all legible. | 16s |
| `SC-05-b11` | 11 | The plan, static, held. (The `OUTSIDE`/`INSIDE` overlay is added in post.) | 10s |
| `SC-06-b13` | 13 | Open the Command Browser. Rest 1s on **`42 commands available`**, scroll to show the five categories, then hover `/eli5` so its `(Feynman Technique)` description is readable. | 16s |
| `SC-07-b14` | 14 | `/learning/profile`. Scroll to **`≈ 30 concepts mastered`** and hold it centred. | 14s |

**`SC-03` is the one that matters.** If generation takes 50 seconds, record 50 seconds. An
honest slow take is the whole argument; a cut turns it into an advertisement.

---

## 5 · Comparison footage — `footage` (1 clip) · ⚠️ **HAND-OFF**

| Code | Beat | Record exactly this | Length |
|---|---|---|---|
| `LA-01-b12` | 12 | A generic chat assistant answering *"explain self-attention"* — a wall of prose scrolling. Any assistant, **no logos, no product name in frame.** Used only as the left half of a split against Ritsu's `Guided discovery`. | 10s |

**Legal:** do not identify the competitor on screen or in the VO. The line is *"a chat
window"*, deliberately generic.

---

## 6 · Score + effects — `music`, `sfx` · **generatable (HeyGen catalog)**

| Code | Beat | Brief |
|---|---|---|
| `MUS-01-all` | 1 → 15 | One bed. **Enters** shot 2 and rises with the pile. **Full stop** at shot 3 — the empty INSIDE is silent. Low under the avatar. **Out entirely** for shot 9. Returns on the plan reveal. Resolves at shot 14. |
| `SFX-01-b3` | 3 | A single low hit as the vertical rule lands. Nothing else in that shot. |
| `SFX-02-b14` | 14 | 30 soft ticks as the items cross. Must not become a slot machine — quiet, irregular. |

Music target −26 LUFS under narration; SFX −24 LUFS.

---

## 7 · Brand — `brand` · **in repo**

| Code | Use |
|---|---|
| `BR-01-all` | Ritsu mark — title card (shot 4) and end card (shot 15) |

---

## Manifest

Checksummed so CI can verify the committed composition is coherent even though the media
itself is gitignored. Populated by `/video --stage=assets`.

| Code | Kind | Beat | File | sha256 | bytes | duration |
|---|---|---|---|---|---|---|
| `VO-01-b1` | voice | 1 | `assets/voice/VO-01-b1.mp3` | `d254cc93254d1c0f…` | 46,509 | 11.52s |
| `VO-02-b2` | voice | 2 | `assets/voice/VO-02-b2.mp3` | `0536bf43a6ec827a…` | 28,941 | 7.12s |
| `VO-03-b3` | voice | 3 | `assets/voice/VO-03-b3.mp3` | `195886598b47dd14…` | 19,053 | 2.32s |
| `VO-04-b3a` | voice | 3a | `assets/voice/VO-04-b3a.mp3` | `3917ac0f218da8e1…` | 19,629 | 2.40s |
| `VO-05-b3b` | voice | 3b | `assets/voice/VO-05-b3b.mp3` | `32945dd463471680…` | 84,909 | 10.56s |
| `VO-06-b6` | voice | 6 | `assets/voice/VO-06-b6.mp3` | `13eeade1eef20e01…` | 162,477 | 20.24s |
| `VO-07-b7` | voice | 7 | `assets/voice/VO-07-b7.mp3` | `4ac60a060ed50c4e…` | 27,021 | 6.64s |
| `VO-08-b8` | voice | 8 | `assets/voice/VO-08-b8.mp3` | `c03c8c5539a8439e…` | 18,381 | 4.48s |
| `VO-09-b9` | voice | 9 | `assets/voice/VO-09-b9.mp3` | `f9942e0a14449261…` | 19,629 | 2.40s |
| `VO-10-b10` | voice | 10 | `assets/voice/VO-10-b10.mp3` | `8e5a38f164bfa627…` | 91,437 | 11.36s |
| `VO-11-b11` | voice | 11 | `assets/voice/VO-11-b11.mp3` | `449b31f83e7f377e…` | 24,141 | 5.92s |
| `VO-12-b12` | voice | 12 | `assets/voice/VO-12-b12.mp3` | `b6fe08eee9d04951…` | 29,613 | 7.28s |
| `VO-13-b13` | voice | 13 | `assets/voice/VO-13-b13.mp3` | `8c2e349720733a87…` | 63,213 | 15.68s |
| `VO-14-b14` | voice | 14 | `assets/voice/VO-14-b14.mp3` | `32a7339394c55b74…` | 61,869 | 7.68s |

---

## Hand-off summary

| Slot | Codes | Status |
|---|---|---|
| `screen` | `SC-01` … `SC-07` | ⚠️ **requested** — 7 clips, ~111s |
| `footage` | `LA-01` | ⚠️ **requested** — 1 clip, 10s |
| `voice` | `VO-01` … `VO-14` | ✅ **generated + loudness-matched** |
| `avatar` | `AV-01` … `AV-03` | generatable |
| `mg` | `MG-01` … `MG-07` | authored in `index.html` |
| `music` / `sfx` | `MUS-01`, `SFX-01/02` | generatable |
| `brand` | `BR-01` | in repo |

**36 assets total · 14 done · 8 need a human · 14 machine-generatable but not yet run.**

| | count | state |
|---|---|---|
| `voice` | 14 | ✅ generated, gate PASS |
| `screen` + `footage` | **8** | ⚠️ **blocked on you** — record specs above |
| `avatar` · `music` · `sfx` | 6 | generatable — next run |
| `mg` | 7 | authored at the compose stage |
| `brand` | 1 | in repo |

Once `assets/screen/` and `assets/footage/` are populated, `--resume` re-probes the disk,
compares checksums, and continues from exactly here.
