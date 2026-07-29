---
name: video-type-social-short
description: >
  The vertical short production line for /video (--type=social-short) — 9:16 for Reels,
  Shorts and TikTok. Hook in the first two seconds, caption-forward, sound-off legible,
  no letterbox. Holds the JUDGMENT for this line; enumerable data lives in
  knowledge/video-types.yaml.
---

# `/video --type=social-short`

Production line #2. Built as the **abstraction test**: adding it touched a registry row and
this file — **zero lines** of `.claude/commands/video.md` or the pipeline scripts. If a future
line ever needs a command change, the abstraction has failed and that is the thing to fix.

## What actually differs from `explainer`

Not "the same film, cropped". A vertical short is a different rhetorical object.

| | explainer | **social-short** |
|---|---|---|
| First moment | a beat of silence, then a confession | **the hook — 2 seconds, no runway** |
| Viewer state | chose to watch | **scrolling; you are an interruption** |
| Sound | carries the film | **often off — captions carry it** |
| Letterbox | always on (cinematic) | **never** — you need every pixel |
| Arc | problem → turn → proof → invitation | **one idea, landed** |
| Length | ~3 min | 8–90 s, target 30 |

## The shape

Four beats by default. Each has one job and no slack:

| Beat | Job | Budget |
|---|---|---|
| **1 Hook** | Earn the next 2 seconds. A claim, a number, or a visible problem. **Never a logo, never "hi guys".** | ~2–4 s |
| **2 Turn** | Why the obvious answer is wrong, or what changed. | ~6–10 s |
| **3 Proof** | Show it. Real product, real capture. | ~10–15 s |
| **4 Land** | One idea restated, one action. | ~3–5 s |

Collapse to 2 beats for an 8-second clip. Do not exceed 8 — a vertical short with many beats is
an explainer that will be scrolled past.

## Framing for 9:16 — the real constraint

Screen recordings are **landscape**. A 16:9 app in a 9:16 frame is the central problem of this
line, and there are only three honest answers:

1. **Crop to the region that matters** — best. Pick one UI element, fill the width. Requires
   knowing which single element the beat is about.
2. **Scale to width, stack** — the app across the top, type filling the space below.
3. **Rotate/tilt device mock** — only if the design system has that treatment.

Never letterbox a landscape capture into the middle of a vertical frame. It reads as lazy and
wastes the two-thirds of the screen a phone viewer is actually looking at.

The forbidden-zoom-band rule still applies (registry data): sit at ~1.0× of your *chosen crop*,
or past ~1.26×, never between.

## Safe areas

Platform UI eats the frame. Keep every load-bearing element inside the middle band:

- **Top ~12%** — obscured by the platform header.
- **Bottom ~20%** — caption, handle, and the action rail sit here.
- **Right ~15%** — the like/comment/share column on TikTok and Reels.

Put the hook line in the **upper-middle third**, not dead centre, and never in the bottom fifth.

## Captions are not optional

Most viewers have sound off. The on-screen text must carry the whole idea on its own — treat the
narration as the *enrichment*, the inverse of `explainer`.

- Short lines. One clause per card.
- Land each caption **on** the beat it describes, not after it.
- The design system's type ramp still governs; do not shrink below its legibility floor to fit
  more words. Cut words instead.

## Narration

Same lane as every line: `/voice`. Faster and flatter than `explainer` — a short does not have
room for a breath before a hard truth. Keep audio tags to one per beat at most.

The loudness floor is identical and non-negotiable (−16 LUFS / −1.5 dBTP); the validator pins it
for this line exactly as for the others.

## What "good" looks like

- The first frame alone makes someone stop.
- It works **fully muted**.
- One idea. If you can name two, it is two shorts.
- The last frame tells them what to do, once.

## Hand-off

Same as every line: screen recordings and live-action are human-supplied. Because the crop is
tighter here, the record spec must name **which UI region** to keep in frame — a 9:16 crop of a
capture framed for 16:9 usually cuts the thing the beat is about.
