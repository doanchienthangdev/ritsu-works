---
name: thinking-toolkit/mckinsey-sell
description: |
  The Sell formatter for the /think mckinsey engine (v2.0). Renders the final
  deliverable — the "sell" — from the run's synthesis + analysis-log + checkpoint-log,
  conforming to a McKinsey deliverable TEMPLATE (knowledge/mckinsey-templates.yaml)
  and rendered in any of /deepask's formats + design-systems. It does NOT rebuild a
  format engine: it builds the McKinsey-template-structured synthesis IR, then hands
  it to `deepask/format` with `--style` (brand) + `--art-style` (genre) as design
  context. Structure (McKinsey template) and design (--style/--art-style) are ORTHOGONAL.

  Invoked at Sell (step 7) by thinking-toolkit/mckinsey-workflow. Parameters:
  --sell=<template-id|auto>, --audience=receptive|skeptical, --style=<design-system>,
  --art-style=<genre>, --format=<deepask medium>. Not a standalone /think verb.
allowed-tools: [Read, Write, Bash, Skill]
disable-model-invocation: false
---

# McKinsey Sell — format the deliverable to a McKinsey template, render via /deepask

> The Sell phase has TWO moves (Bulletproof steps 6→7): **synthesize the LOGIC** (`synthesis.md` — the bare pyramid that must stand on its own), then **communicate the STORY** (this skill — render that logic for THIS audience as a McKinsey deliverable). This skill owns move 7. It conforms the story to a McKinsey **template** and renders it in any `/deepask` **format** + **design-system** — structure and design kept orthogonal.

## The one architectural rule: compose, don't rebuild

`mckinsey-sell` is a **thin composer over `deepask/format`** (`06-ai-ops/skills/deepask/format/SKILL.md`). The McKinsey synthesis IR is the SAME shape `deepask/format` consumes, so:

1. **Build the McKinsey-template-structured synthesis IR** (below) from `synthesis.md` + `analysis-log.md` (cited, degree-tagged evidence) + `checkpoint-log.md` (the pre-wire consensus + the dissent/coverage).
2. **Render** by invoking `deepask/format` with that IR + `--format=<medium>` + `--style=<design-system>` + `--art-style=<genre>`. `--style`/`--art-style` are **data-only design context** (resolved once via `scripts/design-system/resolve-style.cjs` + `scripts/deepask/art-style.cjs`); they never change the McKinsey structure. Brand palette always wins over genre; legibility wins over both.

### The synthesis IR contract (what `deepask/format` consumes — stated inline)

```
{ verdict, sections[], claims[] (cited + degree), tables[], charts[], diagrams[],
  conflicts[], coverage (from the CP-PREWIRE completeness-critic), sources[] }
```
`mckinsey-sell` populates this IR but **orders + labels it per the chosen McKinsey template** before handing off. The `coverage` field carries the data-sweep breadth statement (R3); `claims` carry the analysis-log degree tags so the deliverable never launders a judgment as a fact.

## Pick the template (`--sell`)

Read `knowledge/mckinsey-templates.yaml`. `--sell=<id>` selects one; `--sell=auto` (default) picks by `--audience`:
- **receptive** → `governing-thought-memo` (lead with the answer, grouped support).
- **skeptical** → `scr-storyline` or `scqa-memo` (argument-led; walk them from shared context to the answer).
- A presentation → `action-titled-deck`; a board paper → `pyramid-doc`; a time-poor exec → `exec-one-pager`.

Each template gives a `structure` (the ordered skeleton) + `rules` (the McKinsey standards the IR must satisfy) + a `default_format`. **Apply the rules to the IR before rendering** — they are non-negotiable:
- **Governing-thought-first (Minto Pyramid)** — the answer is the first thing; everything else supports it.
- **Action titles** — every section header is a full declarative sentence; read top-to-bottom, the titles ARE the storyline (the deck's elevator test).
- **MECE key line** — the supports don't overlap and are collectively exhaustive.
- **APK guard** — lead with the answer; never tell the story-of-the-search (problem → all the analyses → … → answer). The reader wants the answer first; analysis is support, surfaced as needed.
- **so-what** — every observation must imply an action, or it's not an insight (`/think so-what`).
- **pre-wire** — the deliverable matches what was agreed at CP-PREWIRE; nothing in it is a surprise.

## The storyline was built at STRUCTURE — Sell FILLS it, never invents it

The action-titled storyline skeleton + the dummy/ghost exhibits already exist: the workplan's `end-product` column IS the dummy exhibit (Bulletproof Exhibit 4.3), drawn at Structure before the data existed. **`mckinsey-sell` fills + pre-wires that pre-built storyline; it does not invent a new one at Sell.** If you find yourself inventing the story here, you skipped the Structure discipline — go back. (This is the EM correction: building the story at Sell re-creates "analyze first, story later.")

## Render via /deepask format

```
Skill({skill: "deepask/format", args: "<IR + --format=<medium> --style=<ds> --art-style=<genre>>"})
```
- `--format` defaults to the template's `default_format` (`article`/`pdf`/`pptx`/`html`/…). For a visual deck, `pptx`/`img-slide`; for a memo, `article`/`pdf`.
- `--style=<design-system>` brands the deliverable (logo, palette, type) where the format is code-rendered/visual; a no-op for plain text. Logo embeds as a base64 data URI (the deepask logo-embed contract), never a sibling path.
- `--art-style=<genre>` adds an artistic genre for image formats; a no-op for non-visual.

The final deliverable is written alongside `communication.md` in the run folder (the "sell" = `communication.md` [the storyline] + the rendered artifact). The full run artifact set (`problem-statement → … → checkpoint-log → synthesis → communication` + the rendered deliverable) ships WITH the deliverable so the founder can audit the reasoning behind the answer.

## Anti-claims

- This is NOT a new format engine — it composes `deepask/format`. New media are added in deepask, not here.
- A template carries STRUCTURE prose only — never a color/brand/logo token (enforced by `validate-mckinsey-templates.cjs` `FORBIDDEN_BRAND_KEYS`). Brand/design is the orthogonal `--style` axis.
- It does NOT decide the answer — Sell renders the answer the engine + the founder already reached (CP-PREWIRE). A beautifully formatted deliverable does not make a wrong answer right; that is what the validation gate, the dissent session, and the disconfirmation discipline are for.

## References

`knowledge/mckinsey-templates.yaml` (the 6 templates) · `06-ai-ops/skills/deepask/format/SKILL.md` + `deepask/aesthetic/SKILL.md` (the render engine) · `scripts/design-system/resolve-style.cjs` + `scripts/deepask/art-style.cjs` (the design resolvers) · Minto (1987) *The Pyramid Principle* · Garrette/Phelps/Sibony (2018) *Cracked It!* Ch 10 (pyramid / SCR / pre-wire) · Conn & McLean (2018) *Bulletproof Problem Solving* (synthesis ≠ storytelling; Exhibit 4.3 dummy exhibits at Structure).
