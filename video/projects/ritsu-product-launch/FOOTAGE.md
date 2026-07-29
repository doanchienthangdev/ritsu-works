# Ritsu Launch — FOOTAGE plan (screen · live-action · motion-graphics · avatar · voice)

Companion to `SCRIPT.md`. **The filename _is_ the code — nothing else.**

> ### Naming rule
> ```
> <CODE>-<NN>-b<BEAT>.<ext>
> ```
> Code + sequence number + beat number, and stop. **No descriptive suffix.**
> `SC-01-b4.mp4` · `LA-06-b8.mp4` · `MG-02-b4.mov` · `AV-01-b1.mp4` · `VO-01-b1.mp3`
> Whole-film assets (no single beat) use `-all`: `MG-00-all.mov`, `MUS-01-all.mp3`, `VO-FULL-all.mp3`.
> **The first column of every table below is the exact filename — copy it as-is.**

Five kinds of asset:

- **`SC` — Screen-capture** of the **real Ritsu product** (the proof — the most important footage). → `.mp4`
- **`LA` — Live-action** b-roll (Veo 3.1 / stock). → `.mp4`
- **`MG` — Motion-graphics** built in HyperFrames against `../../design-systems/ritsu/frame.md`. → `.mov` (alpha) *or built inline*
- **`AV` — Avatar** video (HeyGen, lip-synced to the matching `VO`). → `.mp4`
- **`VO` — Voice-over** audio (ElevenLabs **KAI**, `eleven_v3`). → `.mp3`

Priority: **● essential · ○ enrich.**

## Beat coverage (what each beat is made of)

| Beat | Files |
|---|---|
| B1 cold open | `AV-01-b1` + `LA-01-b1` `LA-02-b1` · `VO-01-b1` |
| B2 pain montage | `MG-01-b2` + `LA-03-b2` `LA-04-b2` · `VO-02-b2` |
| B3 the turn | `AV-02-b3` + mark asset · `VO-03-b3` |
| B4 magic moment | **`SC-01-b4` `SC-02-b4` `SC-03-b4`** + `MG-02-b4` (+ `LA-05-b4`) · `VO-04-b4` |
| B5 active learning | **`SC-04-b5` `SC-05-b5`** · `VO-05-b5` |
| B6 knowledge map | **`SC-06-b6`** (or `MG-03-b6`) · `VO-06-b6` |
| B7 spaced review | `MG-04-b7` (or `SC-07-b7`) · `VO-07-b7` |
| B8 situations | **`SC-08-b8` `SC-09-b8` `SC-10-b8` `SC-11-b8`** + `MG-05-b8` + `LA-06-b8…LA-10-b8` · `VO-08-b8` |
| B9 differentiation | `AV-03-b9` + `MG-06-b9` · `VO-09-b9` |
| B10 proof | `MG-07-b10` (+ `LA-11-b10` `LA-12-b10` `LA-13-b10`) · `VO-10-b10` |
| B11 CTA | `AV-04-b11` + `MG-08-b11` · `VO-11-b11` |
| all | `MG-00-all` (letterbox + cyan bg-glow + grid, persistent) · `MUS-01-all` (music bed) |

Avatar beats (**B1 · B3 · B9 · B11**) reuse their beat's `VO` to drive the HeyGen lip-sync — see §4.

---

## 1. SCREEN-CAPTURE — record the real Ritsu product  `SC`  ← the important part

**Capture settings (all SC clips):** record at **≥1080p (4K if you can, to reframe)**, 30 or 60 fps, on a
**clean demo account** pre-loaded with good sample content. Hide bookmarks bar / extensions; use a clean
window (or incognito); **no personal data on screen**; move the cursor **slowly and deliberately** (or hide
it). Capture longer than you need — we trim + speed-ramp in the edit.
**Guardrails:** use **real** uploaded material; **never film the homepage animated stat counters** (they
render as `0+ / 0` un-hydrated — those numbers are rebuilt as `MG`); Knowledge Map is **per-source** only.

| File | Record THIS (exact steps) | Pri | Raw len | Notes |
|---|---|---|---|---|
| **`SC-01-b4.mp4`** | **B4** — The **drop → plan** flow with a **textbook chapter**: drag a real ~30–40-page chapter **PDF** onto the upload/drop zone → capture the "AI builds your plan" processing → land on the generated plan showing **Points of Knowledge** (e.g. *"2 units · 5 points"*). | ● | ~20s | The hero moment. We speed the processing to the 30s count-up (`MG-02-b4`). |
| **`SC-02-b4.mp4`** | **B4** — Same flow, **YouTube lecture**: paste a real lecture **URL** into the source input → capture the transcript resolving → land on the plan. | ● | ~12s | Shows "any source." A ~2h video. |
| **`SC-03-b4.mp4`** | **B4** — Same flow, **slide deck**: drop a **40-slide PPTX** → capture **speaker notes** pulled in → land on the plan. | ● | ~12s | Same end-frame as SC-01/02. |
| **`SC-04-b5.mp4`** | **B5** — **`/askme` graded free answer**: in a learning session type **`/askme`** → it asks a question → type a deliberately **half-right** free-text answer → capture it **grading it (e.g. 7/10)** and **naming the exact missing point**. | ● | ~14s | The "it makes you produce + grades you" proof. Use a real concept from SC-01's chapter. |
| **`SC-05-b5.mp4`** | **B5** — **Command palette + `/quiz`**: show the slash-command menu (`/quiz /flashcard /explain /derive /counter-example`) → type **`/quiz`** → a multiple-choice question generated **from the material** appears → pick an option → see the result. | ● | ~10s | Establishes the "vocabulary." |
| **`SC-06-b6.mp4`** | **B6** — **Knowledge Map (ONE source)**: open the map for a single source → capture concept nodes/panels with **mastery scores 0–100** → a **weak concept highlighted** ("worth your next hour"). If scores animate as you interact, capture that. | ● | ~12s | **Per-source only** — do NOT show ideas linking across files/videos. |
| **`SC-07-b7.mp4`** | **B7** — **Spaced-review** UI: the review **schedule/ladder** (1 · 3 · 7 · 16 · 35 days) and/or a review session (recall cue → quick quiz → written answer, AI-graded). | ○ | ~10s | If there's no clean UI, use `MG-04-b7` (forgetting-curve motion-graphic) instead. |
| **`SC-08-b8.mp4`** | **B8** — **Exam-in-3-days**: switch the plan to **Exam-prep / Crash-course** study mode → capture the plan **re-weighting to spotlight the weak concepts first** (the gaps move to the top / grow). | ● | ~8s | Pairs with `LA-06-b8`. |
| **`SC-09-b8.mp4`** | **B8** — **Six study-mode presets**: on one uploaded source, click through the presets (**Balanced · Deep dive · Crash course · Exam prep · Practice · Fast**) and capture the plan **re-weighting on each click**. | ○ | ~8s | "One source, six ways." Strong but optional. |
| **`SC-10-b8.mp4`** | **B8** — **Problem set**: run **`/solve`** (or the exercise mode) on a problem → capture it walking the solution **step by step** with the **"why"** shown on each step. | ● | ~8s | Pairs with `LA-09-b8`. |
| **`SC-11-b8.mp4`** | **B8** — **Framework / code**: on uploaded docs, run **`/code`** (or the code-exercise activity) → capture a **runnable code exercise** generated from the docs. | ○ | ~8s | Pairs with `LA-10-b8`. |

> If any SC screen doesn't exist yet / isn't demo-ready, tell me the exact one and I'll rebuild it as a
> pixel-accurate **`MG` mock** in the design system so the beat still lands.

---

## 2. LIVE-ACTION b-roll — Veo 3.1 / stock  `LA`

**Global Veo 3.1 settings (append to EVERY prompt):** Veo 3.1 · ~8s · 16:9 · 1080p.
> *No on-screen text, no captions, no logos, no watermarks, no readable words. Cinematic, cool moody color
> grade (deep-slate blues + teal-cyan tones), shallow depth of field, natural film grain. No dialogue —
> subtle ambient room tone only.*
Grade toward slate `#020817` shadows + cyan `#0ABCD0` highlights in post. Faces diverse/non-specific; no real brands in frame.

| File | Clip (what) | Pri | Veo 3.1 prompt *(+ global suffix)* | Alt — stock search |
|---|---|---|---|---|
| **`LA-01-b1.mp4`** | **B1** Highlighter + over-marked pages | ● | Extreme close-up of a hand capping a worn yellow highlighter and setting it on a thick stack of dog-eared, over-highlighted textbook pages. Late-night desk, single warm lamp, deep shadows. Slow subtle push-in, 50mm, shallow focus. Weary, quiet. | "highlighter textbook close up night study desk moody" |
| **`LA-02-b1.mp4`** | **B1** Tired student at laptop, night | ● | Over-the-shoulder medium shot of a tired university student at night rubbing their eyes in front of a glowing laptop, an AI chat conversation blurred on screen. Dark room, cool blue screen light on the face. Static locked shot, shallow focus. Melancholic. | "tired student laptop night over shoulder frustrated" |
| **`LA-03-b2.mp4`** | **B2** Long-night desk time-lapse | ○ | Locked-off wide time-lapse of a cluttered study desk through a long night — coffee cup slowly emptying, papers piling, the window behind darkening. No people. Cool moody grade, cinematic. | "study desk timelapse night papers coffee" |
| **`LA-04-b2.mp4`** | **B2** Highlighter coats a whole page | ○ | Macro top-down shot of a yellow highlighter dragging slowly across a dense page until almost the entire paragraph is coated yellow. Soft directional light, shallow focus following the tip. | "highlighter over entire page macro top down" |
| **`LA-05-b4.mp4`** | **B4** Hand drops a stack of papers | ○ | Close-up, slow motion: a hand releases a thick stack of papers onto a dark desk, pages fanning and settling. Hard side light, deep shadows, shallow focus. Minimal, tense. *(cuts to SC-01-b4)* | "dropping stack of papers slow motion dark desk" |
| **`LA-06-b8.mp4`** | **B8** Exam in 3 days — calendar glance | ● | A stressed student at a desk glances up at a wall calendar with several days circled in red, then back to a thick textbook. Night, warm lamp + cool window light. Slow push-in, shallow focus. Time-pressured. | "student exam deadline calendar stress night" |
| **`LA-07-b8.mp4`** | **B8** YouTube lecture — long video | ● | Over-the-shoulder of a person watching a long lecture on a laptop late at night, a progress bar near the very start of a very long video (blurred), a half-empty notebook beside them. Dim room, cool screen glow, shallow focus. Restless. | "watching online lecture laptop notes over shoulder night" |
| **`LA-08-b8.mp4`** | **B8** Research paper — flipping pages | ● | Top-down close-up of two hands flipping through a dense printed academic paper full of equations and tiny text, pausing to tap a paragraph. Desk lamp, cool grade, shallow focus. Focused, a little overwhelmed. | "flipping dense research paper equations hands top down" |
| **`LA-09-b8.mp4`** | **B8** Problem set — solving with a pen | ● | Close-up, slightly handheld, of a hand working a physics problem set with a pen — writing a step, pausing, crossing one out. Notebook on a wooden desk, warm lamp, cool grade, shallow focus. Determined. | "solving math physics problem set pen notebook close up" |
| **`LA-10-b8.mp4`** | **B8** Learn a framework — reading docs | ● | Over-the-shoulder of a developer at night scrolling slowly through code documentation on a large monitor, a dark IDE theme casting blue-green glow on the face, coffee beside the keyboard. Moody, shallow focus. Absorbed. | "developer reading documentation dark monitor night" |
| **`LA-11-b10.mp4`** | **B10** Testimonial — medical student | ○ | Portrait-distance shot of a focused young medical student in a quiet library, an open anatomy atlas and neat notes in front, soft window light. Gentle slow push-in, shallow focus. Calm, hopeful. | "medical student library anatomy studying focused" |
| **`LA-12-b10.mp4`** | **B10** Testimonial — software engineer | ○ | A software engineer in their late twenties at a tidy home desk glances from a monitor (blurred code) with a small satisfied nod. Warm light, a plant nearby, shallow focus, cinematic. Quietly confident. | "software engineer home office satisfied working" |
| **`LA-13-b10.mp4`** | **B10** Testimonial — career changer (58) | ○ | A warm, confident woman around 58 at a bright kitchen table with a laptop and notebook, smiling slightly as she reads and takes notes. Soft morning daylight, shallow focus, cinematic. Uplifting. | "older woman learning laptop kitchen table smiling" |

---

## 3. MOTION-GRAPHICS (build in HyperFrames)  `MG`

No filming — built against `../../design-systems/ritsu/frame.md`. A separate `.mov` file is needed **only** if
the graphic is pre-rendered; most `MG` are built **inline in `index.html`** and need no file.

| File | What |
|---|---|
| **`MG-00-all.mov`** | **all** — Persistent: letterbox bars + cyan hairline, deep-slate bg with drifting cyan glow, faint grid. |
| **`MG-01-b2.mov`** | **B2** — Forgetting-curve draw-on + the 5 study-app tiles scattering. |
| **`MG-02-b4.mov`** | **B4** — The 30-second **count-up** + the wall-of-pages → node-path build (overlays `SC-01-b4`). |
| **`MG-03-b6.mov`** | **B6** — Knowledge-Map mastery fill / number count-up (if not using `SC-06-b6`). |
| **`MG-04-b7.mov`** | **B7** — Forgetting curve beaten on the `1·3·7·16·35` ladder. |
| **`MG-05-b8.mov`** | **B8** — Situation labels (`EXAM IN 3 DAYS` …) + the arrow-reasoning chain. |
| **`MG-06-b9.mov`** | **B9** — Competitor logos animate in, collapse into the Ritsu mark. |
| **`MG-07-b10.mov`** | **B10** — Testimonial quote-cards + `4.9/5` + "Individual results. Not typical." super. |
| **`MG-08-b11.mov`** | **B11** — CTA end-card — lockup + `Start Learning Free` button + `ritsu.ai`. |

---

## 4. AVATAR — HeyGen presenter (KAI)  `AV`

On-camera presenter for the four spoken beats. **Each `AV` is lip-synced to its beat's `VO`** — in HeyGen use
**audio-input mode** and feed the matching `VO-*.mp3`, so the face speaks in the exact same KAI voice as the
narration (no drift between the voice track and the mouth).

**Continuity (all four):** same avatar, same wardrobe (neutral, dark tones), same framing (MCU, eyes just
above centre), plain **deep-slate `#020817`** or softly cyan-lit background to match the film. Export 1080p,
16:9, transparent/greenscreen if you want to composite over `MG-00-all`. Alternatively record **one continuous
take** of the full script and just cut to the face at these four moments.

| File | Beat | Lip-sync to | Direction |
|---|---|---|---|
| **`AV-01-b1.mp4`** | **B1** cold open | `VO-01-b1.mp3` | Weary, human, unforced. Opens the film — a real person, not a spokesperson. Low energy, honest. |
| **`AV-02-b3.mp4`** | **B3** the turn | `VO-03-b3.mp3` | Warm, a lift in the eyes. The pivot from problem → hope. Leans in slightly. |
| **`AV-03-b9.mp4`** | **B9** differentiation | `VO-09-b9.mp3` | Firm, confident, direct to camera. The "this is not a chatbot" clarity beat. |
| **`AV-04-b11.mp4`** | **B11** CTA | `VO-11-b11.mp3` | Warm invitation, a small smile. Closes the film — welcoming, not salesy. |

---

## 5. VOICE-OVER — ElevenLabs KAI  `VO`  ✓ generated

Narration, generated in **ElevenLabs** (voice **KAI** = `$KAI_VOICE_ID`, model **`eleven_v3`**, stability
**Natural ~0.5**) from the **tagged** lines in `SCRIPT.md → Tagged VO`. **All 11 already generated** into
`assets/voice/` (durations below are the real measured lengths). `VO-01/03/09/11` also drive the avatars (§4).

| File | Beat | Mode | Tagged line (SCRIPT.md → Tagged VO) | Dur |
|---|---|---|---|---|
| **`VO-01-b1.mp3`** | B1 | avatar · weary | "[sighs] You read the chapter…" | 14.4s |
| **`VO-02-b2.mp3`** | B2 | faceless | "[thoughtful] Here's why…" | 13.4s |
| **`VO-03-b3.mp3`** | B3 | avatar · warm | "[warmly] There's a better trade…" | 15.3s |
| **`VO-04-b4.mp3`** | B4 | faceless | "[confident] Watch. You drop the file…" | 18.2s |
| **`VO-05-b5.mp3`** | B5 | faceless | "[curious] Now it makes you work…" | 18.6s |
| **`VO-06-b6.mp3`** | B6 | faceless | "[thoughtful] And it keeps score…" | 15.4s |
| **`VO-07-b7.mp3`** | B7 | faceless | "[reassuring] Then it defends…" | 12.6s |
| **`VO-08-b8.mp3`** | B8 | faceless | "[excited] It works on whatever…" | 20.7s |
| **`VO-09-b9.mp3`** | B9 | avatar · firm | "[confident] One thing to be clear…" | 17.3s |
| **`VO-10-b10.mp3`** | B10 | faceless | "[warmly] Sarah, a medical student…" | 12.0s |
| **`VO-11-b11.mp3`** | B11 | avatar · warm | "[warmly] You already have the material…" | 10.6s |
| **`VO-FULL-all.mp3`** | all | — | all 11 stitched with pacing gaps (audition / timing reference) | 174.6s |

Total narration **168.6s** speech → **174.6s** with beat gaps. Regenerate any line with
`scratchpad/gen_vo.py` (drop stability to ~0.35 for more expression).

---

## File naming + folders

```
assets/
  screen/   SC   product screen-captures    (SC-01-b4.mp4 · SC-04-b5.mp4 …)
  footage/  LA   live-action b-roll          (LA-01-b1.mp4 · LA-06-b8.mp4 …)
  mg/       MG   pre-rendered motion-graphics (MG-00-all.mov …)  ← only if not built inline in index.html
  avatar/   AV   HeyGen avatar video          (AV-01-b1.mp4 · AV-04-b11.mp4)
  voice/    VO   ElevenLabs KAI voice-over    (VO-01-b1.mp3 … VO-11-b11.mp3 · VO-FULL-all.mp3)  ✓
  music/    MUS  background music             (MUS-01-all.mp3)
  sfx/      SFX  sound effects (optional)     (SFX-01-b4.wav)
  brand/    logo / mark / fonts  (or reference ../../design-systems/ritsu/assets)
```

**Naming, one line:** `<CODE>-<NN>-b<BEAT>.<ext>`. Whole-film assets → `-all`.

**Shot list to hand off:** essential = `SC-01-b4 SC-02-b4 SC-03-b4 SC-04-b5 SC-05-b5 SC-06-b6 SC-08-b8 SC-10-b8`
(screen) · `LA-01-b1 LA-02-b1 LA-06-b8 LA-07-b8 LA-08-b8 LA-09-b8 LA-10-b8` (footage) · `AV-01-b1 AV-02-b3
AV-03-b9 AV-04-b11` (avatar). `VO-*` ✓ done. Everything else is enrich.
