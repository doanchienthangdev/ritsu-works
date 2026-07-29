---
name: video-type-default
description: >
  The general-purpose /video line — used when --type is omitted or the brief matches
  no specific line. Narrated video with no avatar assumption and no fixed beat count.
  Holds the JUDGMENT for the fallback; enumerable data lives in knowledge/video-types.yaml.
---

# `/video` (no `--type`) — the general line

The fallback. Use it when the brief is a narrated video but not one of the named lines
(explainer, social-short, ads, …). It assumes less: no avatar, no fixed arc, wider
duration window, fewer required slots.

> If you find yourself repeatedly bending this line the same way, that is the signal to
> add a **new type row** to `knowledge/video-types.yaml` — not to special-case here. A new
> line should cost a registry edit plus one skill file. That is the whole design.

## 1. Shape

No prescribed arc. The only structural requirement is that the piece has **beats** — named,
timed units with their own footage and narration — because every downstream stage (asset
ledger, composition, QC gate, timeline view) binds to beats.

Default is 5 beats. A sensible generic arc:

| Beat | Job |
|---|---|
| 1 | Hook — the reason to keep watching, in one line |
| 2 | Context — what this is about |
| 3–4 | Substance — the actual content, shown not told |
| 5 | Close — one action or one takeaway |

Collapse or extend freely. Two beats is a legitimate short; twenty is a legitimate walkthrough.

## 2. What still applies (these are never relaxed)

The fallback is looser about *shape*, never about *discipline*:

- **Loudness.** Every narration source normalises to the registry's floor. A mixed-source
  film with un-normalised audio jumps audibly at every seam.
- **Render gates.** Bitrate floor + blank-segment detection + a filmstrip. These catch the
  class of failure that `check` and `snapshot` cannot see.
- **Framing band.** Screen recordings sit at ~1.0× or past ~1.26×, never between.
- **Integrity.** No number on screen that the source does not produce. Cite the capture.
- **Design system.** Motion vocabulary, palette, and type come from
  `video/design-systems/<style>/frame.md`. Do not invent a per-project look.

## 3. Slots

The default line declares fewer slots than explainer — no `avatar`, no `screen` — because
a general video often has neither. If your piece needs them, that is a strong hint you want
`--type=explainer` instead.

Hand-off applies to `footage` only: live-action is human-supplied, everything else
(narration, score, SFX, brand plates, motion graphics) the pipeline can produce.

## 4. Delegation

Same seam as every line: narration via `/voice`, score and SFX via `media-use`, stills via
`/image`, composition + render via the HyperFrames CLI, script craft via `/write`. This line
owns none of those — it owns the beat plan and the asset ledger.

## 5. What "good" looks like

- One idea per beat, and you can say each beat's idea in a sentence.
- The narration works with the picture off.
- Nothing on screen is decorative-only; every element earns its place.
- If someone asks "why is this a video and not a paragraph?", the motion answers it.
