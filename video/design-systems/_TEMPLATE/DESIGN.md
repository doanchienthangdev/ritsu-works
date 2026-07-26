---
name: <Name>
kind: video-design-system
extends: 00-core/design-system/ritsu/DESIGN.md   # brand source of truth (or 'none')
status: draft
canvas: { width: 1920, height: 1080, fps: 30 }
# --- video tokens (fill in) ---
palette:
  bg: "#020817"
  accent: "#0ABCD0"
  # …
type:
  display: "Inter, 800"
  mono: "JetBrains Mono"
motion:
  default_ease: "power3.out"
  scene_transition: "…"
letterbox: { enabled: true, bar_px: 66 }
audio: { bgm: "…", target_lufs: -15 }
---

# <Name> — Video Design System

## Overview
<What this look is, the feeling, when to use it.>

## Palette
<Colors + where each is used. Extend, don't duplicate, the brand palette.>

## Typography
<Fonts, weights, sizes for display / body / mono / on-screen text.>

## Motion doctrine
<How things move: easing families, entrance/exit vocabulary, "one continuous
camera" rules, breathing/idle, and what NOT to do.>

## Scene timing
<Default beat lengths, cross-fade overlaps, hold-before-cut.>

## Letterbox & frame
<Bars, safe area, HUD/hairlines.>

## Audio
<BGM tone, BPM policy, LUFS target, SFX.>

## Assets
<What's in assets/ and how to use each.>
