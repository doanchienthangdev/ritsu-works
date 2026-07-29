# Ritsu — Product Launch Film · TIMELINE

**Output** `out/ritsu-launch-film.mp4` · 1920×1080 · 30 fps · **2:55 (175.0 s)** · H.264 + AAC 48 kHz
**Built from** `index.html` — one paused, seek-safe GSAP timeline, against `../../design-systems/ritsu/frame.md`
**Interactive view** open `TIMELINE.html`

---

## Beat sheet

| # | Time | Mode | Beat | On screen | Narration |
|---|---|---|---|---|---|
| 01 | 0:00–0:11 | 🧑 AVATAR | Cold open — betrayed effort | `AV-01` full-bleed, slow push-in; hard 0.9 s cut-ins on `LA-01` highlighter + `LA-02` tired student | `AV-01` |
| 02 | 0:11–0:26 | 🖥️ FACELESS | Pain montage | `LA-03` desk time-lapse → `LA-04` highlighter coating a page → self-drawing forgetting curve → five disconnected app tiles + cyan “?” | `VO-02` |
| 03 | 0:26–0:40 | 🧑 AVATAR | The turn | Split frame — `AV-02` right window; mark + **Turn Raw Materials Into True Mastery** left | `AV-02` |
| 04 | 0:40–1:00 | 🖥️ FACELESS | Magic moment — drop → plan | `LA-05` papers drop → `SC-01` upload → pipeline (Uploading · Processing · Generating) with 0→30 s count-up → plan “4 Units” → `SC-02` YouTube (Fetching Video · Extracting Transcript) → `SC-03` slides | `VO-04` |
| 05 | 1:00–1:20 | 🖥️ FACELESS | Active learning + vocabulary | `SC-04` command palette (`/quiz /askme /explain /derive /solve`) → `SC-05` **Configure /quiz** (Bloom + Dewey/Socratic/Montessori) → `/askme` fires → typed answer → graded feedback → real **6.0 / 10** card | `VO-05` |
| 06 | 1:20–1:36 | 🖥️ FACELESS | Knowledge Map | `SC-06` mastery sidebar (Mastery Score /100) → MG constellation built from the capture's real concepts | `VO-06` |
| 07 | 1:36–1:50 | 🖥️ FACELESS | Spaced review | `SC-07` “Due now” queue → **real in-product forgetting curve** → MG ladder `1 · 3 · 7 · 16 · 35` | `VO-07` |
| 08 | 1:50–2:12 | 🖥️ FACELESS | Situations montage | 5 × 4.36 s — LA plate then SC inset: Exam-prep mode · YouTube · research paper · `/solve` · `/code` | `VO-08` |
| 09 | 2:12–2:27 | 🧑 AVATAR | Differentiation | Split frame mirrored — `AV-03` left; five competitor tiles collapse into the Ritsu mark | `AV-03` |
| 10 | 2:27–2:40 | 🖥️ FACELESS | Proof | Three testimonial cards w/ portrait stills, counting numerals, `4.9 / 5` + *Individual results. Not typical.* | `VO-10` |
| 11 | 2:40–2:55 | 🧑 AVATAR | CTA / close | `AV-04` full-bleed → end card: lockup, **Start Learning Free** (`back.out` pop + sparkle), `ritsu.ai` | `AV-04` |

Avatar anchors **1 · 3 · 9 · 11**; faceless core **2 · 4–8 · 10**. Narration is continuous across all eleven.

---

## Audio

| Layer | Detail |
|---|---|
| Narration | 4 × HeyGen avatar audio + 7 × ElevenLabs KAI (`eleven_v3`) |
| Music | `MUS-01` dark (0–40) → `MUS-02` build (38–71) → `MUS-03` drive (70–132) → `MUS-04` close (130–175), cross-faded at beat seams |
| SFX | 13 × whoosh at beat cuts · 2 × impact (the turn, the end card) · 2 × riser (into montage, into CTA) · 5 × tick on the command chips |
| Ducking | music → ~0.14 under narration, lifts to ~0.30 in the gaps (volume tweened on the timeline, identical in preview and render) |

**Programme loudness: −16.7 LUFS · LRA 3.5 LU** — no loud/quiet swings.

---

## Post decisions

**Loudness matched across sources.** HeyGen avatar audio arrived at −15.8…−17.7 LUFS while ElevenLabs
voice-over sat at −13.1…−15.5 — a **4.6 LU** jump at the worst seam (`VO-11` → `AV-03`), clearly audible.
Every narration source is normalised to **−16 LUFS / −1.5 dBTP**, closing the spread to **0.6 LU**.

**Veo ambient audio muted.** The live-action clips carried incidental beds at −31…−46 LUFS —
inconsistent and unusable. All silent; the score is four HeyGen catalogue tracks instead.

**Screen recordings reframed, not just placed.** Sources are 2880×1800 (16:10), cropped to 16:9 at
2560×1440 so every shot has real zoom headroom, then pushed/pulled in GSAP.
*Framing rule:* sit at ~1.0× (whole app, no edge slice) **or** past ~1.26× with an x-shift so the left
rail clears frame — never slice it mid-word.

**Claims corrected to what the product actually shows.** The script called for a fabricated “7/10”; the
real capture shows **6.0 out of 10** with a question breakdown, so the film uses the real number and the
real grading feedback. The forgetting curve and the `1·3·7·16·35` review ladder are **real in-product UI**,
not invented motion graphics. Knowledge Map stays **per-source** per the `frame.md` integrity guardrail.

---

## Two bugs worth remembering

1. **Videos sharing a stage must be `position:absolute`.** In normal flow, each `height:100%` video box
   stacks vertically and `overflow:hidden` clips every one after the first — they render **blank**.
   Snapshots masked this; only the full render exposed it.
2. **`.line{overflow:hidden}` clips descenders.** The mask-rise wrapper cut the tails off `g/y/p` at tight
   line-heights. Fixed with `padding-bottom:.20em; margin-bottom:-.20em`.

---

## Rebuild

```bash
cd video/hyperframes/ritsu-product-launch
npx hyperframes check      # 0 errors · 21/21 WCAG AA
npx hyperframes preview    # scrub in Studio
npx hyperframes render --output out/ritsu-launch-film.mp4
```

Media prep (trim · reframe · loudness) is reproducible from the source assets; `build/` is derived and
can be regenerated. `assets/` holds the masters (`SC` · `LA` · `AV` · `VO` · `MUS` · `SFX`).
