---
name: Ritsu
kind: video-design-system
extends: 00-core/design-system/ritsu/DESIGN.md   # brand tokens live there — reference, don't duplicate
status: stub          # to be authored later
canvas: { width: 1920, height: 1080, fps: 30 }
# Brand tokens (mirror of 00-core/design-system/ritsu — kept here for quick reference only):
palette:
  bg: "#020817"          # deep slate (dark)
  surface: "#151C29"
  fg: "#F8FAFC"
  muted: "#94A3B8"
  accent: "#0ABCD0"      # electric cyan — THE brand color
  accentBright: "#19DEF4"
  teal: "#12A58D"
type:
  display: "Inter, 800, -0.02em"
  body: "Inter, 400"
  mono: "JetBrains Mono, 500"
# --- video-only layer: FILL IN LATER ---
motion: {}
letterbox: {}
audio: {}
---

# Ritsu — Video Design System  (stub)

> **Status: stub.** You'll author the video design system later.
> Brand truth = `00-core/design-system/ritsu/DESIGN.md`. This file adds the
> **video-only** layer on top: motion doctrine, scene timing, letterbox, audio.

## What to fill in

- **Motion doctrine** — easing, entrance/exit vocabulary, "one continuous camera",
  breathing/idle rules, bans (no idle wobble, etc.).
- **Scene timing** — default beat lengths, cross-fade overlaps, hold-before-cut.
- **Letterbox & frame** — bar height, safe area, cyan hairline.
- **Audio** — BGM tone, BPM policy, LUFS target, SFX cues.
- **Assets** — what lives in `assets/` (logo, mark, fonts, LUTs, sfx).

## Reference implementations (already built)

The look is already demonstrated in these projects — distill the recurring
decisions from them into the tokens above:

- `../../hyperframes/ritsu-launch-25s/` — 25s launch film (dark, cyan `#0ABCD0`,
  letterbox, breathing pulse, self-drawing map, beat-synced score).
- `../../hyperframes/hf-billboard/` — 8s billboard (glitch reveal, scanlines).
