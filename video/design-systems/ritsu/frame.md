---
version: alpha
name: Ritsu — Frame (video / frame layer)
description: >
  Video-first frame system for Ritsu — the AI tutor that turns any document into true mastery.
  The unit is the frame (1920×1080). Atoms are sacred: a single dark register (deep-slate ground /
  near-white text), electric cyan as the sole accent used as scarce voltage, Inter as the whole
  typographic voice (Title/sentence case, never lowercase-as-graphic), JetBrains Mono as chrome +
  slash-command vocabulary, one restrained cyan glow as the only depth, soft radii, a cinematic
  letterbox, and 1px hairlines. Fine-tuned from the HyperFrames "broadside" frame pack, re-skinned to
  the Ritsu brand and given a motion doctrine. Extends 00-core/design-system/ritsu/DESIGN.md.
unit: the frame — 1920×1080 primary; 9:16 and 1:1 documented
principle: atoms are sacred · composition is free · numbers come from the script · AI is the leverage, not the spectacle

colors:
  # — ground (one dark register; no light register) —
  slate:        "#020817"   # deep-slate ground (dark-mode background)
  slate-raise:  "#0B1524"   # raised surface
  slate-panel:  "#151C29"   # card / panel surface
  border:       "#1E2C40"   # 1px hairline
  # — text —
  fg:           "#F8FAFC"   # near-white — headlines + body on slate
  fg-muted:     "#94A3B8"   # AA-safe muted — labels, sub-copy
  fg-hint:      "#64748B"   # faint chrome only — never load-bearing text
  # — brand voltage (the only accent family) —
  cyan:         "#0ABCD0"   # THE brand color — accent, focus ring, the "insight" moment
  cyan-bright:  "#19DEF4"   # gradient partner / glow core
  teal:         "#12A58D"   # secondary partner (gradient end, the mark)
  ink:          "#04141C"   # near-black slate — text placed ON a cyan/bright surface (contrast-safe)
  # — cyan overlays (tints only; never a second hue) —
  cyan-tint:    "rgba(10,188,208,0.14)"   # panel fill / correct-state
  cyan-line:    "rgba(10,188,208,0.35)"   # hairline / chip border
  cyan-glow:    "rgba(10,188,208,0.40)"   # the one glow (0 0 20px)
  cyan-hint:    "rgba(10,188,208,0.08)"   # faint grid / wash

gradient:
  signature:    "linear-gradient(135deg, #0ABCD0, #19DEF4)"          # cyan → bright cyan
  mark:         "linear-gradient(135deg, #12A58D, #0ABCD0, #19DEF4)"  # teal → cyan (the aperture)

typography:
  # — reading ramp —
  body:     { fontFamily: "Inter", cqw: 1.15, weight: 400, lineHeight: 1.6 }
  lead:     { fontFamily: "Inter", cqw: 1.55, weight: 400, lineHeight: 1.5 }
  caption:  { fontFamily: "Inter", cqw: 0.9,  weight: 400, lineHeight: 1.5, color: "{colors.fg-muted}" }
  label:    { fontFamily: "JetBrains Mono", cqw: 0.72, weight: 500, tracking: "0.18em", upper: true }   # chrome eyebrow
  command:  { fontFamily: "JetBrains Mono", cqw: 1.4,  weight: 500 }                                    # slash-commands, code, metrics
  # — display / hero ramp (Inter, Title/sentence case, tight negative tracking) —
  h3:        { fontFamily: "Inter", cqw: 2.6, weight: 700, lineHeight: 1.2,  tracking: "-0.01em" }
  h2:        { fontFamily: "Inter", cqw: 4.2, weight: 800, lineHeight: 1.05, tracking: "-0.02em" }
  stat-value:{ fontFamily: "Inter", cqw: 6.5, weight: 800, lineHeight: 1.0,  tracking: "-0.03em" }
  h1:        { fontFamily: "Inter", cqw: 7.0, weight: 800, lineHeight: 0.98, tracking: "-0.03em" }
  display:   { fontFamily: "Inter", cqw: 9.5, weight: 800, lineHeight: 0.98, tracking: "-0.03em" }

spacing:
  pad-x: "6.5cqw"     # roomier than broadside — Ritsu leads with whitespace
  pad-y: "6cqw"
  gap-lg: "3.5cqw"
  gap-md: "2cqw"
  gap-sm: "1cqw"
  letterbox: "3.4cqh" # ~66px on 1080 — the cinematic bar

motion:
  runtime: "one paused GSAP timeline at window.__timelines[<id>]; seek-safe; per hyperframes-core"
  feel: "deliberate, precise, restrained — the learner + the product are the hero; motion performs, never fidgets"
  default_ease: "power3.out"
  reveal_ease: "power4.out"      # text mask-rise
  settle_ease: "back.out(1.7)"   # the CTA pop ONLY
  breathe_ease: "sine.inOut"
  scene_overlap: "~0.3s cross-fade between frames (one continuous camera)"
  breathe: { scale: 1.018, cycle: "1.1s", where: "hero element only, finite yoyo" }
  glow_pulse: { opacity: "0.2 → 0.5", cycle: "1.1s", finite: true }
  entrance_vocab: [mask-rise, fade-scale, self-draw, "glitch (sparingly)"]
  bans: ["idle wobble", "gratuitous spin", "hype bounce (except the one CTA back.out)", "repeat:-1"]
  beat_sync: "when scored, scene cuts + key accents land on the beat/downbeat"

components:
  registers:
    slate:   "ground {colors.slate}, text {colors.fg}, accent {colors.cyan} + one scarce glow"
    voltage: "a cyan gradient surface ({gradient.signature}) carrying {colors.ink} text — CTA / brand moment only"
    description: "One register BASE — deep slate. 'voltage' is a scarce cyan surface (button, hero bloom), always with dark ink text. NEVER a full-frame cyan ground (it fails contrast and shouts)."
  letterbox:
    size: "{spacing.letterbox} bars top + bottom"
    hairline: "1px {colors.cyan-line} on the inner edge"
    description: "Cinematic frame — always on. Keeps content inside a 2:1-ish safe band."
  mark:
    asset: "the four-blade aperture (teal→cyan gradient); assets/ or 00-core/design-system/ritsu/assets/ritsu-{mark,logo}.png"
    glow: "{colors.cyan-glow} radial bloom behind — brand moments only"
    description: "The Ritsu symbol. Never recolor off the teal–cyan family; ≥ one blade-width clear space; never on a busy ground."
  wordmark:
    treatment: "'Ritsu' in Inter 800, {gradient.signature} via bg-clip text"
    description: "The wordmark; pairs with the mark as the lockup."
  kicker:
    typography: "{typography.label}"
    color: "{colors.cyan}"
    description: "Uppercase JetBrains-Mono eyebrow (the mono chrome)."
  command-chip:
    typography: "{typography.command}"
    fill: "{colors.cyan-tint}"
    border: "1px {colors.cyan-line}"
    color: "{colors.cyan-bright}"
    radius: "8px"
    description: "A slash-command tile (/quiz /askme /explain …). Ritsu's signature 'a vocabulary for learning' chrome — the counterpart to broadside's `/` bullet, promoted to a first-class motif."
  rule:
    backgroundColor: "{colors.cyan}"
    size: "40×2px"
    description: "Cyan stub accent bar — a rare ornament."
  stat-card:
    borderTop: "1px solid {colors.border}"
    typography: "{typography.stat-value} in {colors.cyan} + {typography.body} + {typography.label}"
    description: "Top-border-only block; no other borders."
  bullet:
    marker: "cyan `/` (JetBrains Mono) or a small cyan dot"
    typography: "{typography.lead}"
    description: "Capped at THREE items."
  node:
    fill: "{gradient.signature}"
    link: "1px {colors.cyan-line}, self-drawn (strokeDashoffset)"
    description: "Knowledge-map node + edge — the mastery / data-viz motif. Per-source, not cross-file (see Numerals & Claims)."
  quiz-card:
    surface: "{colors.slate-panel}"
    border: "1px {colors.border}; correct option → {colors.cyan-tint} fill + {colors.cyan} border"
    radius: "18px"
    description: "The product card (a question + options; the correct option is cyan-tinted with a check). The concrete 'show, don't tell' object."
  cta-button:
    fill: "{colors.cyan}"
    text: "{colors.ink}"        # dark slate text on cyan — WCAG-safe. NEVER near-white on cyan.
    radius: "10px"
    glow: "0 0 34px {colors.cyan-glow}"
    description: "The single primary action. Dark ink on cyan; the ONE glowing element in a frame."
---

# Ritsu — Frame (video / frame layer)

## Overview

Ritsu at frame scale is a **calm, cinematic dark system where electric cyan is scarce voltage — the
one moment of insight — and everything else gets out of its way.** It runs in **one register**: a
deep-slate ground (`{colors.slate}`) with near-white text, and cyan (`{colors.cyan}`) as the sole
accent — a focus ring, a filling number, a self-drawn line, a glowing button. There is no second
hue; on the rare cyan surface (a CTA, a hero bloom) the text is dark ink, never near-white.

This is the deliberate inversion of the broadside pack it descends from. Broadside is a two-register
protest poster: massive **lowercase Barlow** as graphic primitive, a loud **fire-orange** environment,
a strictly **flat plane**. Ritsu keeps broadside's *rigor and restraint* — one statement per frame,
one accent, hairline structure, numbers-from-the-script — and swaps the *voice*: **Inter** in
**Title/sentence case** (calm and legible, never lowercase-as-graphic), **JetBrains Mono** as chrome
and as the slash-command vocabulary, **soft radii** instead of sharp corners, and **one scarce cyan
glow** instead of pure flatness. The brand voice is `00-core/brand_voice.md`: helpful, honest,
concrete, calm — never salesy, no "AI magic". The product — the document becoming a tutor — is the
hero; the cyan marks the instant it clicks.

**Key characteristics at frame scale:**
- **One dark register** — deep slate ground, near-white text, cyan accent. No light register.
- **Cyan is the only color, used sparingly** — accent on slate; dark ink on the scarce cyan surface.
- **Inter carries every text role** (400–800); **JetBrains Mono is chrome + slash-commands only.**
- **Title/sentence case display** — Ritsu is calm and precise, not a shouting poster.
- **Flat-with-intent + one scarce glow** — depth from 1px hairlines, soft surface tints, and a single
  `0 0 20px` cyan glow on the hero element; a `backdrop-blur` glass panel for overlays.
- **Soft radii** — 8px base, 12–18px cards, chips fully round. Rounded, friendly, not bubbly.
- **Cinematic frame** — a letterbox with a cyan hairline; deep-slate radial glow ground; a faint grid.
- **Restrained motion** — deliberate reveals, one continuous camera, a subtle breathing pulse; motion performs, never fidgets.
- **Low density** — one statement per frame, bullets capped at three, generous negative space.

## The Frame

### Frame Craft Bar
Four eyeball tests gate every frame before any structural check:
- **Squint** — exactly **one focal moment dominates** (a headline, a card, the mark) at 3–5×
  everything else; nothing competes.
- **Silence** — declarative frames read **55–65% empty** (roomier than broadside); the feature-demo
  and knowledge-map frames are the dense exceptions.
- **Restraint** — **cyan appears in ≤ ~15% of the frame** (one accent moment); one focal moment;
  one glow; bullets capped at three. If two things glow, kill one.
- **Reference** — aim at **a Linear / Vercel / Apple product film in cyan-on-slate**; failure looks
  like a **rainbow SaaS slide** or a **hype "AI magic" ad**.

- **Primary:** 1920×1080 (16:9). Type authored in **`cqw`** (`px ÷ 1920 × 100 = cqw`).
- **Vertical:** 1080×1920 (9:16). **Square:** 1080×1080 (1:1).
- **Safe area:** `pad-x`/`pad-y` (6.5 / 6cqw) — roomier than broadside; keep the focal clear of the
  letterbox bars (`{spacing.letterbox}` top + bottom).

**The container law (load-bearing).** Every frame ground sets `container-type: size`; ALL
frame-relative units are `cqw`/`cqh` against it — never `vw` (a `vw`-sized frame inflates when not
full-screen). 1px hairlines stay 1px. (Same law as broadside; it is a HyperFrames rendering rule.)

## Colors

One register, one accent. **Slate:** `{colors.slate}` ground (with a faint radial cyan-hint glow +
1px grid + vignette for cinematic depth), `{colors.fg}` text, `{colors.cyan}` accent (kicker, focus,
self-draw, filling number, glow, the `/` marker). **Voltage:** the scarce cyan surface — the
`{gradient.signature}` on a CTA button or a hero bloom — always carrying `{colors.ink}` text. Muted
copy is `{colors.fg-muted}` (AA-safe); `{colors.fg-hint}` is faint chrome only, never a load-bearing
line.

**The contrast rule (hard, learned).** Near-white text on cyan **fails WCAG** (~1.9:1). On any cyan
or bright surface, text is **`{colors.ink}` dark slate** (≈ 5.4:1) — never near-white. Cyan text lives
on slate, dark text lives on cyan. This is the one place a Ritsu frame differs visibly from
broadside's ink-on-fire absolute: same discipline (one color, committed), inverted luminance.

**No second accent color.** Emphasis is weight, size, opacity, or the glow — never a new hue.
The 5-way chart palette (`#0ABCD0 · #7C3AED · #F97316 · #16A34A · #E11D48`) is allowed **only** in a
genuine multi-series data-viz frame, and even then cyan leads.

## Typography

Two ramps. The **reading ramp** (Inter body 1.15cqw, lead 1.55cqw, mono label 0.72cqw) carries copy +
chrome; the **display ramp** (Inter `h2` 4.2cqw → `display` 9.5cqw, weight 700–800) carries every
statement. JetBrains Mono is chrome (kickers, metrics, axis labels) and the **slash-command
vocabulary** (`/quiz`, `/askme` …) — Ritsu's signature motif.

- **Legibility floor:** any load-bearing line ≥ **1.4cqw**; mono labels are chrome only.
- **Fit-to-measure:** size the headline to its length. Cap the block at **≤ 72cqw** (leave breathing
  room — Ritsu is roomier than broadside's 78); ≤2 words → `display`; 3–5 → `h1`; 6+ → `h2`. One
  display moment per frame.
- **Inter display is Title or sentence case, weight 800, negative-tracked** (−0.03em largest, −0.02em
  h2). **Mono chrome is uppercase, 0.18em.** No lowercase-as-graphic (that is broadside's signature,
  not Ritsu's), no italic, no underline, no ALL-CAPS display.
- **The cyan clause.** In a statement, ink ONE clause in the `{gradient.signature}` (bg-clip) with the
  hero glow — e.g. *Turn Raw Materials Into **True Mastery***. Exactly one per frame.

## Depth & Surface

Flat-with-intent — **plus one scarce glow** (the Ritsu departure from broadside's pure flat).
Hierarchy from:
- **Weight + size contrast** — the dominant signal (Inter 800 display).
- **1px hairlines** — letterbox edge, chrome bars, stat-card top, card border, chart baseline.
- **The one glow** — `0 0 20px {colors.cyan-glow}` (larger blooms for the hero mark), on **one**
  element per frame — the CTA, the mark, or the cyan clause. If it's everywhere it's nowhere.
- **Glass** — a `backdrop-blur: 12px` translucent panel (`/0.8`) for the rare overlay.
- **Negative space** — generous, intentional; Ritsu's default is roomy.

**Ceiling:** no drop-shadow as decoration; no heavy elevation; no gradient GROUND (the signature
gradient is for text-clip + the CTA surface only, never the whole frame).

## Shapes

Rounded, friendly, not bubbly (the brand's shape language):
- **8px** base radius (`lg`); **12px** large cards (`xl`), **18px** the quiz/product card; inputs 6px;
  chips + pills **fully round**. Nav dots 50%. Consistent radius across a frame. (Broadside's
  0-radius sharpness is explicitly NOT Ritsu.)

## Motion

Broadside declares motion out of scope. A Ritsu **video** system cannot — motion is half the brand.
The doctrine (full rules in `hyperframes-animation` / `hyperframes-core`):

- **One paused GSAP timeline**, seek-safe, deterministic. No render-time clocks, no `repeat:-1`
  (finite counts), only the visual-property allowlist.
- **One continuous camera.** Frames cross-fade with ~0.3s overlap; a scene exits in a direction and
  the next enters continuing that vector. A slow cyan bg-glow drifts across the whole film as the
  through-line.
- **Entrance vocabulary:** text **mask-rise** (`yPercent 110 → 0`, `power4.out`); **fade-scale** for
  cards/marks; **self-draw** (`strokeDashoffset`) for the mark outline + map edges; **glitch** only
  where a "digital reveal" is earned, never as default.
- **Breathing, not fidgeting.** The hero may breathe (`scale ≤ 1.018`, `sine.inOut`, finite yoyo) and
  its glow may pulse (`0.2 → 0.5`). Banned: idle wobble, gratuitous spin, hype bounce. The **one**
  allowed overshoot is a gentle `back.out(1.7)` on the CTA pop.
- **Beat-sync.** When the film is scored, scene cuts and key accents (a reveal, the CTA) land on the
  music's beat/downbeat.
- **Legibility floor holds in motion** — never animate a load-bearing line below the 1.4cqw floor or
  behind the letterbox bars.

## Components

- **registers** — one slate base + the scarce **voltage** (cyan) surface. **letterbox** — the cinematic bar with a cyan hairline.
- **mark** (the aperture, glow at brand moments) / **wordmark** ('Ritsu', gradient bg-clip) — the lockup.
- **kicker** (mono eyebrow) / **rule** (40×2 cyan stub) — the chrome ornament set.
- **command-chip** (the slash-command vocabulary tile) — Ritsu's signature motif.
- **stat-card** (top-border only) / **bullet** (cyan `/`, max 3) / **node** (map node + self-drawn edge) /
  **quiz-card** (the product card, correct option cyan) / **cta-button** (cyan fill, dark ink, the one glow).

## Frame Treatments

> Recipe: ground · register · composes · focal · chrome · accent · silence · Fixed/Free · density · motion.
> One statement per frame; cyan is scarce; the product is the hero.

### 1 · Brand / Lockup  (identity · move: the mark forms · SLATE · centered)
**Ground** slate + a centered cyan-hint bloom. **Composes** mark, wordmark, kicker. **Focal** the
four-blade **mark** (self-draws or fade-scales in, gentle) beside the **wordmark** 'Ritsu' in
`{gradient.signature}` bg-clip, a `{colors.cyan-glow}` bloom behind. **Chrome** a mono kicker beneath
(e.g. `YOUR PERSONAL AI TUTOR`). **Accent** the cyan mark + one glow. **Silence** ~60%. **Fixed** the
teal–cyan mark, gradient wordmark, one glow. **Free** the kicker line. **Density** low. **Motion**
mark fade-scale + slow settle; glow breathes.

### 2 · Statement  (belief · move: the cyan clause · SLATE · center/left)
**Ground** slate. **Composes** kicker (optional), display/h1. **Focal** a 2–5 word Inter
`display`/`h1` in `{colors.fg}` with **one clause** inked in `{gradient.signature}` + the hero glow
(*Into **True Mastery***). **Chrome** none or a mono kicker. **Accent** the cyan clause. **Silence**
~60%. **Fixed** Title/sentence case 800, exactly one cyan clause, the glow on it. **Free** the line,
which clause is cyan. **Density** low. **Motion** line mask-rise (staggered), the cyan clause a beat later.

### 3 · Magic Moment / Feature Demo  (product · move: real UI · SLATE · the dense frame)
**Ground** slate, letterbox present. **Composes** kicker, a product-UI capture or a `quiz-card`,
`command-chip`s, one cyan callout. **Focal** the **actual product** — a file dropping in and a plan
building (~30s counter), or `/askme` grading a free answer, or a `quiz-card` with the correct option
cyan-tinted. **Chrome** mono labels + a `{typography.command}` tag. **Accent** the one cyan
state (correct answer, the counter, a focus ring). **Silence** low (the density exception). **Fixed**
slate-panel surface, dark ink on any cyan chip, one cyan state. **Free** the UI content. **Density**
dense-exception. **Motion** card fade-scale + a slight `rotationX` rise; the cyan state animates last.

### 4 · Vocabulary  (proof-of-depth · move: commands light up · SLATE)  [Ritsu-specific]
**Ground** slate. **Composes** kicker, a row of `command-chip`s. **Focal** the slash-command
vocabulary — `/quiz /flashcard /explain /derive /counter-example` — as mono tiles that light up
`{colors.cyan-bright}` in stagger. **Chrome** the mono tiles are the chrome. **Accent** the cyan
tiles. **Silence** moderate. **Fixed** JetBrains-Mono tiles, cyan-tint fill + cyan-line border.
**Free** which commands, the copy line ("A vocabulary for learning"). **Density** moderate. **Motion**
stagger fade-rise; a soft glow ripple across the row.

### 5 · Knowledge Map / Data  (mastery · move: nodes + self-draw · SLATE)
**Ground** slate. **Composes** kicker, `node`s + self-drawn edges, a filling `stat-value`. **Focal**
a **per-source** knowledge constellation — cyan nodes joined by self-drawing `{colors.cyan-line}`
edges — or a single mastery number filling `15 → 41 → 86 / 100`. **Chrome** mono axis/labels.
**Accent** the cyan nodes / the filling number. **Silence** moderate. **Fixed** gradient nodes, 1px
self-drawn edges, per-source scope. **Free** the graph, the figures (from the script). **Density**
moderate. **Motion** edges self-draw (stagger), nodes pop (`back.out`), the number counts up.

### 6 · Proof  (credibility · move: quote/stat cards · SLATE)
**Ground** slate. **Composes** kicker, `stat-card`s or attributed quote cards. **Focal** three
top-border `stat-card`s (cyan `stat-value` + label + mono note) **or** attributed quote cards.
**Chrome** mono attribution + an "individual results, not typical" super where claims are
unverified. **Accent** the cyan numerals. **Silence** moderate. **Fixed** top-border-only cards,
cyan numerals, the disclaimer on unverified proof. **Free** the figures/quotes (from the script).
**Density** standard. **Motion** cards rise + fade in stagger.

### 7 · CTA / End  (the on-ramp · move: the lockup + button · SLATE → voltage · centered)
**Ground** slate + a final cyan bloom. **Composes** mark, wordmark, `cta-button`, a mono url.
**Focal** the lockup above the **`cta-button`** — cyan fill, **dark ink** text ("Start Learning
Free"), the one `0 0 34px` glow — with `ritsu.ai` in mono beneath. **Chrome** the mono url + a
reassurance line ("Free forever. No credit card."). **Accent** the glowing cyan button (the
voltage register). **Silence** ~55%. **Fixed** dark ink on the cyan button, one glow, the lockup.
**Free** the CTA copy. **Density** low. **Motion** lockup fade-scale; button `back.out(1.7)` pop; a
sparkle on the pop; hold on the brand (no hard fade-to-black — a cinematic hold).

## Composition Rules

### Do
- Set every Inter display in **Title/sentence case weight 800**, negative-tracked — calm, not shouting.
- Use **cyan as scarce voltage** — one accent moment, one glow, per frame; ink ONE clause in the gradient.
- Keep chrome + commands in **JetBrains Mono**; use the `/`-command tile as the signature motif.
- **Cap bullets at three; one statement per frame**; build hierarchy from weight, size, and 1px hairlines.
- Put **dark ink on any cyan/bright surface**; keep near-white text on slate. Letterbox always on.
- Let the **product be the hero** on demo frames; let type + the mark carry the declarative ones.

### Don't
- Never lowercase-as-graphic (broadside's signature, not Ritsu's); never ALL-CAPS a display line.
- Never a second accent hue; never near-white text on cyan; never a full-frame cyan ground.
- No drop-shadow decoration; no gradient GROUND; no more than one glowing element per frame.
- No idle wobble, gratuitous spin, or hype bounce (save the one CTA `back.out`); no "AI magic" clichés.
- Don't stage a **cross-file** knowledge map (see Numerals & Claims); don't invent figures.

## Aspect-Ratio Behavior

| Treatment | 16:9 | 9:16 | 1:1 |
|---|---|---|---|
| Brand / Lockup | mark + wordmark side by side | mark over wordmark | centered stack |
| Statement | display center/left | display stacked taller | display centered |
| Feature Demo | UI large + chips beside | UI top, chips below | UI centered, chips under |
| Vocabulary | one command row | commands wrap 2–3 rows | commands wrap grid |
| Knowledge Map | constellation center | taller graph / number | number-forward |
| Proof | 3 cards across | 3 stacked | 2 + 1 |
| CTA / End | lockup + button centered | lockup over button | centered |

`pad-x` holds on the short edge; re-step display so the one big line stays ≤ 72cqw and above the
1.4cqw floor. Keep the focal clear of the letterbox bars in every ratio. Mono chrome stays Latin/digit.

## Approved Entities

The **Ritsu mark + wordmark** are the only first-class brand marks — the real assets (`assets/` or
`00-core/design-system/ritsu/assets/`), never redrawn. Competitor logos (in a "replace your stack"
frame — Anki, Quizlet, Kahoot, ChatGPT, Notion) are **placeholders / their official marks**, animated
in then collapsing into the Ritsu mark. Real product UI is captured, not mocked-up as fantasy. No
other logos or vendors are invented.

## Numerals & Claims (hard rule)

Never invent figures, percentages, dates, or counts. Render slots as `— figure —`, `{metric}`, `NN%`
until the script supplies them. Ground counts in the live ritsu.ai research, and mind these
**verified caveats** (from the site analysis):

- **Command/activity counts conflict** across the site (17+ activities vs ~40 commands) — pick one and
  stay consistent; don't flash conflicting numbers.
- **Knowledge Map is per-source**, not cross-file — the feature page scores one source; do NOT stage a
  hero shot of ideas linking across multiple files/videos unless product confirms it ships.
- **All outcome proof is homepage-only + unverifiable** (4.9/5, the three testimonials) — show an
  "individual results, not typical" super if you use the numbers.
- **Never film the live homepage stat counters** — they render un-hydrated as `0+ / 0`; rebuild counts
  as motion-graphics from the copy values.
- **Pricing** (Free $0 / Plus $29 / Pro $59 / Ultra $119, annual −17%) is experimental — the safe
  launch CTA is *Start Learning Free · Free forever · No credit card* (fully grounded).

## Pre-Render Self-Audit

- **Squint** — exactly one focal moment dominates; nothing competes.
- **Silence** — declarative frames ~55–65% empty; only feature-demo / knowledge-map run dense.
- **Register** — one dark register; cyan scarce; dark ink on any cyan surface; no second hue.
- **Type** — Inter Title/sentence 800 negative-tracked, fit-to-measure; mono chrome uppercase 0.18em; ≥1.4cqw floor.
- **Contrast** — every load-bearing line passes WCAG AA (never near-white on cyan).
- **Depth** — flat + ONE glow; 1px hairlines; soft radii (8/12/18px); no shadow decoration; no gradient ground.
- **Motion** — deliberate, one continuous camera, breathing not fidgeting; the one CTA overshoot only.
- **Frame** — letterbox on, focal clear of the bars.
- **Fabrication** — every numeral traces to the script; per-source map; disclaimer on unverified proof.

## Known Gaps

- **Inter + JetBrains Mono via Google Fonts** — HyperFrames `check`/`render` auto-fetch + inject
  deterministic `@font-face`; no manual `<link>` (avoids a render-time network fetch).
- **9:16 / 1:1 are guidance** — verify the one big line stays ≤ 72cqw and above the floor per ratio.
- **Motion tokens are a doctrine, not a runtime** — the atomic rules live in `hyperframes-animation`;
  this spec sets the feel + the guardrails.
- **The cyan glow is the one sanctioned departure** from broadside's strict flat — keep it to one
  element per frame or the system reads as generic-glow SaaS.

## Provenance

Fine-tuned from the HyperFrames **broadside** frame pack
(`.archives/broadside-frame-pack/FRAME.md` · https://www.hyperframes.dev/design/broadside): its
structure, rigor, and treatment-recipe format are retained; its DNA (ink-black/fire-orange,
lowercase Barlow, flat protest poster) is fully re-skinned to Ritsu. Brand truth =
`00-core/design-system/ritsu/DESIGN.md`; this file adds the frame + motion layer. The look is already
demonstrated in `../../hyperframes/ritsu-launch-25s/` (25s launch film) and `../../hyperframes/hf-billboard/`.
