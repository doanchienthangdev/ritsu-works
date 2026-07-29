---
name: video-type-explainer
description: >
  The explainer production line for /video — a narrated product/concept film with
  avatar anchor beats and a faceless, screen-capture-led product core. Holds the
  JUDGMENT for this line: beat rhetoric, shot selection, what "good" looks like.
  Enumerable data (durations, gates, slots, loudness floor) lives in
  knowledge/video-types.yaml, not here.
---

# `/video --type=explainer`

The line this whole platform was extracted from. Reference output: the 2:55 Ritsu
launch film — script → 11 beats → 22 screen-captures + 13 live-action clips + 4
avatar segments + 11 voice-overs + score → one paused GSAP timeline → render → QC.

> **Registry-vs-skill boundary.** Anything a gate or a flag default reads is in
> `knowledge/video-types.yaml`. This file holds only what needs taste. If you find
> yourself writing a number here that a script must obey, it belongs in the registry.

## 1. The shape of an explainer

Eleven beats is the default, not a law. The invariant is the **rhetorical arc**:

| Movement | Beats | Job | Mode |
|---|---|---|---|
| **Problem** | 1–2 | Name a pain the viewer already feels. Do not mention the product. | avatar → faceless |
| **Turn** | 3 | One line that reframes. This is the pivot; give it air. | avatar |
| **Proof** | 4–8 | The product doing the thing, in real footage. The longest movement. | faceless |
| **Difference** | 9 | Why this is not the thing they already tried. | avatar |
| **Evidence** | 10 | Third-party credibility. | faceless |
| **Invitation** | 11 | One action, stated once. | avatar → end card |

**Avatar beats anchor; faceless beats prove.** A face at the open buys trust, a face at
the turn buys conviction, a face at the close buys warmth. Everything in between should
be the product, because a claim shown beats a claim spoken.

## 2. Beat authoring — what each beat block must carry

Every beat in `SCRIPT.md` gets: `[FRAME]` (design-system register + layout) · `[FOOTAGE]`
(what is literally on screen) · `[ANIMATION]` (choreography + easing) · `[TEXT MOTION]` ·
`[ASSETS]` (the asset codes) · `[VO]` (spoken line) · `[ON-SCREEN]` (overlays).

A beat without asset codes is not finished — the codes are what the asset ledger and the
QC gate bind to.

## 3. Shot selection for the product core

The proof movement lives or dies on screen-capture selection. Heuristics, in order:

1. **Show the moment of change, not the steady state.** A file landing and a plan
   appearing beats a plan sitting there.
2. **Prefer a real number the product actually renders** over a caption you write.
   If the UI shows a score, frame the score. (See §6 — this is a hard rule.)
3. **One idea per shot.** If you have to explain what to look at, re-crop or re-record.
4. **Hold the money shot.** The single most persuasive frame of the film deserves 4–6 s,
   not 2. Everything else can be fast.
5. **Repeat the pattern to prove generality.** Three sources through the same pipeline
   says "any source" better than one source and a claim.

### Framing (the rule that costs you if ignored)

Sit at **~1.0×** (whole app, no edge slice) **or past ~1.26×** with an x-shift so the side
rail clears frame entirely. The band between reads as a mistake — it slices UI mid-word.
The exact band is registry data (`framing.forbidden_zoom_band`) and the prep stage enforces it;
your job is to choose *which* region deserves the push-in.

Pull-backs are the trap: a move from 1.35× to 1.0× **passes through** the forbidden band.
Either stay above it (1.36 → 1.27) or start below it.

## 4. Voice-over

One voice across the whole film. Write for the ear: short sentences, one idea each,
punctuation where a person would breathe. The narration carries the film — picture
illustrates it, not the reverse.

Delegate synthesis to `/voice`. Never call a TTS API directly from a video project.

**Avatar beats run warmer and breathier** (a person talking to you); **faceless beats run
tighter and more confident** (the product talking). Encode that in the tagged read, not in
post.

## 5. Motion

Follow the design system's motion doctrine (`video/design-systems/<style>/frame.md`) — it
owns the entrance vocabulary, the easing, and the one-glow-per-frame discipline. Do not
invent a second motion language per project.

Two authoring traps this line hits repeatedly:
- **Mask-rise clips descenders.** The `overflow:hidden` wrapper cuts the tails off g/y/p.
  The compensating recipe lives in `frame.md`; use it rather than re-deriving it.
- **Multiple videos in one stage must be absolutely positioned**, or every clip after the
  first renders blank. `check` and `snapshot` will not tell you. The lint and the render
  gate will.

## 6. Integrity — the hard rule

**Never put a number on screen that the product does not produce.**

On the reference film the script called for a fabricated "7/10"; the real capture showed
**6.0 out of 10**, so the film shipped the real number. That is not pedantry — a fabricated
figure in a launch film is a liability, and the viewer can check it by using the product.

Mechanically: every on-screen numeric in `SCRIPT.md` must carry an asset code that resolves
to a row in `FOOTAGE.md`. Cite your capture. The validator enforces the citation; only you
can enforce the truth.

Also honour the design system's claim guardrails (scope limits on what a feature actually
does, disclaimers on unverified proof).

## 7. What "good" looks like

- A stranger who has never heard of the product can say what it does after beat 4.
- Every claim in the film is either shown on screen or attributed.
- The film survives being watched **with sound off** (the on-screen text carries it) and
  **with eyes closed** (the narration carries it).
- No beat is there because it was easy to make.

## 8. Hand-off

Screen recordings and live-action are human-supplied. Emit exact record specs (what to
click, what must be visible, how long) and ready-to-paste generation prompts, then park.
`--resume` picks up when the files land — it re-probes the disk rather than trusting
recorded state, because media is gitignored and a fresh clone has none of it.
