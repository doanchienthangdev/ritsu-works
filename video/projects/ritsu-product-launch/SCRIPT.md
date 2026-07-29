# Ritsu — Product Launch Film · SHOOTING SCRIPT + PRODUCTION BIBLE

**Runtime** 3:00 · **Canvas** 1920×1080 (16:9) · **fps** 30
**Design system** `../../design-systems/ritsu/frame.md` (deep-slate `#020817` · electric-cyan `#0ABCD0` · Inter + JetBrains Mono · one scarce glow · cinematic letterbox · restrained motion)
**Voice** David Ogilvy — the fact, not the adjective; write to one intelligent person; close on a command. Never salesy, no "AI magic."
**Format** one continuous AI-avatar **voice-over** across the whole film; the **face on camera** only at the 4 human beats; **faceless** (screen-capture + motion-graphics) for the product/demo/situations core.

> How to read a beat: **[FOOTAGE]** = what's literally on screen · **[ANIMATION]** = choreography + timing + easing (per `frame.md` motion doctrine) · **[TEXT MOTION]** = how on-screen text moves · **[ASSETS]** = what to build/capture · **[VO]** = spoken line · **[ON-SCREEN]** = overlays. Times are cumulative.

---

## Avatar vs Faceless map

| # | Beat | Time | Mode | Use-case in play |
|---|---|---|---|---|
| 1 | Cold open — betrayed effort | 0:00–0:15 | 🧑 AVATAR | universal |
| 2 | Pain montage | 0:15–0:33 | 🖥️ FACELESS | universal |
| 3 | The turn / promise | 0:33–0:47 | 🧑 AVATAR | any source |
| 4 | Magic moment — drop → plan | 0:47–1:08 | 🖥️ FACELESS | **textbook chapter · YouTube lecture · slide deck** |
| 5 | Active learning + vocabulary | 1:08–1:28 | 🖥️ FACELESS | recall / grading |
| 6 | Knowledge Map | 1:28–1:42 | 🖥️ FACELESS | mastery (per-source) |
| 7 | Spaced review | 1:42–1:54 | 🖥️ FACELESS | retention |
| 8 | Situations montage | 1:54–2:22 | 🖥️ FACELESS | **exam in 3 days · YouTube · research paper · problem set · learn a framework** |
| 9 | Differentiation | 2:22–2:36 | 🧑 AVATAR | vs the stack |
| 10 | Proof | 2:36–2:48 | 🖥️ FACELESS | credibility |
| 11 | CTA / close | 2:48–3:00 | 🧑 AVATAR | the on-ramp |

Avatar anchors: **1, 3, 9, 11.** Faceless core: **2, 4–8, 10.** VO is continuous across all.

---

## Global production notes

- **Follow `frame.md`.** Every faceless beat uses its treatments (Brand · Statement · Feature-Demo · Vocabulary · Knowledge-Map · Proof · CTA), its component set (letterbox, mark, command-chip, quiz-card, node, stat-card, cta-button), and its motion vocabulary (below). Cyan is **scarce voltage** — one accent moment + one glow per frame; dark ink on any cyan surface.
- **Reusable motion vocabulary** (all on one paused, seek-safe GSAP timeline):
  - `mask-rise` — text in an `overflow:hidden` line, inner span `yPercent 110 → 0`, `power4.out`, ~0.7s, stagger 0.08.
  - `fade-scale` — `autoAlpha 0→1` + `scale 0.92→1`, `power3.out`, ~0.7s.
  - `self-draw` — SVG `strokeDashoffset len→0` (mark, map edges), `power1.inOut`.
  - `pop` — `back.out(1.7)` (CTA button + correct-answer check ONLY).
  - `count-up` — `innerText` tween + a small `scale` bump.
  - `breathe` — `scale 1 ↔ 1.018`, `sine.inOut`, finite yoyo, hero element only.
  - `glow-pulse` — glow `opacity 0.2 ↔ 0.5`, finite.
  - `cross-fade` — 0.3s overlap between beats; a slow cyan bg-glow drifts across the whole film (one continuous camera).
  - `letterbox` — 66px bars top+bottom with a 1px cyan hairline, on for the entire film.
- **Integrity guardrails (do NOT violate):**
  1. **Knowledge Map is per-source** — animate one source's concepts. NEVER stage ideas linking across multiple files/videos (the feature page doesn't support it).
  2. **Never screen-capture the live homepage counters** — they render un-hydrated as `0+ / 0`. Rebuild every count as a motion-graphic `count-up` from the copy value (12+ formats, 17+ activities, 4.9/5…).
  3. **Proof carries a super:** `Individual results. Not typical.`
  4. **Counts:** say "17+ activities" and name real commands (`/quiz /askme /explain /derive`); don't flash the conflicting "~40" figure.
  5. **CTA is `Start Learning Free · Free forever · No credit card`** (fully grounded). No price tiers on screen (they're experimental).
- **Asset root:** brand marks at `../../design-systems/ritsu/` (and `00-core/design-system/ritsu/assets/`). Fonts (Inter, JetBrains Mono) auto-inject via HyperFrames — no `<link>`.

---

## Voice — ElevenLabs v3 · KAI

The whole VO is one voice: **KAI** (`$KAI_VOICE_ID` in `runtime/secrets/.env.local`), model **`eleven_v3`**
— the only model that reads audio tags. MAYA (`$MAYA_VOICE_ID`) is the alternate.

**Settings (starting point — tune to KAI):** stability **Natural (~0.5)** — consistent across the 11 beats,
still responsive to the tags; nudge toward *Creative* for more emotion, *Robust* if it destabilises. One
speaker; pacing comes from punctuation, not a speed slider.

**Audio-tag philosophy — make KAI sound like a person, not a narrator:**
- **One emotion tag per beat**, at the start, to set the delivery — then let the words carry it. Over-tagging
  makes v3 *less* human and unstable.
- **Breathe.** `[exhales]` / `[inhales]` / `[sighs]` at real pause points — a breath before a hard truth, an
  exhale of relief on the turn. This is the single biggest "it sounds human" lever.
- **Hesitate with punctuation.** An **ellipsis …** = a micro-pause / caught thought; an **em-dash —** =
  trailing or self-interrupt. Put them where a real person would breathe or reconsider.
- **Emphasise with CAPS — once.** One capitalised word per line max (`EXACTLY`, `WHY`) — the word the
  sentence turns on. Never a whole capitalised phrase.
- **Match the tag to the voice.** Documented tags are safest — `[sighs] [exhales] [inhales] [laughs softly]
  [whispers] [excited] [curious] [pause] [clears throat] [dramatic tone]`. Descriptive ones (`[warmly]
  [thoughtful] [reassuring] [gently] [confident] [emphatically]`) also work in v3 — but **test each and
  drop any KAI ignores.**
- **Avatar beats (1·3·9·11) run warmer + breathier** (human, to camera); **faceless beats (2·4–8·10) run
  tighter + more confident** (the product is talking). The tagged read below encodes this per beat.
- Longer holds: `[pause]` or SSML `<break time="0.6s" />`, sparingly — the letterbox + motion already buy silence.

---

# THE SCRIPT

## BEAT 1 · 0:00–0:15 · 🧑 AVATAR — Cold open (Problem)
- **[FRAME]** `frame.md` → *Statement* register on slate. Presenter medium-close, left third; the right two-thirds is negative space where B2's motion will live. Letterbox on. A single cyan bg-glow low-right.
- **[DELIVERY]** Calm, level, unhurried. A beat of silence before the first word. This is a confession, not a pitch.
- **[B-ROLL over the last 4s]** hard cut-ins (0.4s each) on the desk beside them: a highlighter capping, a stack of dog-eared pages, a laptop with a chat thread open.
- **[VO]** "You read the chapter. You watched the lecture. You even had a chatbot explain it. And the night before the exam — it's still not yours. You were busy for hours. Almost none of it stuck."
- **[ON-SCREEN]** *(mask-rise, bottom-left, mono kicker above)* `THE PROBLEM` → **You read it. It's still not yours.**
- **[ASSETS]** presenter plate (or HeyGen avatar); 3 b-roll cut-ins; Inter display, JetBrains Mono kicker.

## BEAT 2 · 0:15–0:33 · 🖥️ FACELESS — Pain montage (Agitate)
- **[FOOTAGE]** A 3-shot motion-graphics montage on slate, quick cuts:
  1. A highlighter sweeps across a full page until the **whole page is yellow** — nothing chosen. (the futility of highlighting)
  2. A **forgetting curve** line rises then **decays toward zero** over a calendar of days.
  3. A grid of study apps (Anki, Quizlet, a chat window, a Notion page, a slide deck) scattered like open tabs, none connected.
- **[ANIMATION]**
  - Shot 1 (0:15–0:21): the highlighter is a cyan-tinted rectangle that `x`-sweeps L→R (`power2.inOut`, 1.2s); a mono counter "0 ideas chosen" holds.
  - Shot 2 (0:21–0:27): the curve **self-draws** up (`strokeDashoffset`, 0.5s), then a second dashed segment self-draws **down** to ~5%; a faint area-fill fades under it. Day ticks `1 · 3 · 7…` type-on in mono.
  - Shot 3 (0:27–0:33): 5 app tiles `fade-scale` in on a stagger (0.08), sitting at slight random tilts (±3°), grey and disconnected; a cyan question-mark pulses once in the gap between them.
- **[TEXT MOTION]** three overlays, one per shot, each `mask-rise` in and hard-cut out on the next: `Passive learning. Cramming. Forget.` → `Most of it fades within days.` → `Five apps. None of them talk.`
- **[ASSETS]** highlighter rect; SVG forgetting-curve path (draw-on); 5 competitor logos (greyscale, official marks); mono counter; cyan `?`. Palette: slate `#020817`, muted `#94A3B8` art, cyan `#0ABCD0` accents only.
- **[VO]** "Here's why. Re-reading feels like progress. It isn't. Most of what you learn fades within days — that's just how memory works. Your flashcards take longer to build than to study. And your tools don't talk to each other."
- **[ON-SCREEN]** as above.

## BEAT 3 · 0:33–0:47 · 🧑 AVATAR — The turn (Solution)
- **[FRAME]** `frame.md` → *Statement*. Presenter centers; the Ritsu **mark** `fade-scale`s in beside them at the mid-point, a `glow-pulse` behind it.
- **[DELIVERY]** One beat of conviction — the pivot of the film. Slightly warmer.
- **[VO]** "There's a better trade. Stop consuming the material — make it teach you. Drop in anything you already have. A textbook chapter. A two-hour lecture. A slide deck. A research paper. Ritsu turns it into your own tutor. In about thirty seconds."
- **[TEXT MOTION]** the tagline `mask-rise`s under the lockup, with **True Mastery** as the cyan-gradient clause (`frame.md` "cyan clause" + hero glow), a beat after line 1.
- **[ON-SCREEN]** **Turn Raw Materials Into True Mastery.**
- **[ASSETS]** `ritsu-mark.png` / lockup; cyan glow; Inter 800 display.

## BEAT 4 · 0:47–1:08 · 🖥️ FACELESS — The magic moment (drop → plan) · **3 sources**
- **[FOOTAGE]** Real product **screen-capture** of the upload → plan flow, run **three times fast** to prove "any source":
  1. Drag a messy **34-page chapter PDF** onto the drop zone → a ~30s counter → a wall of pages **collapses into a walkable node-path** ("2 units · 5 points").
  2. Paste a **YouTube lecture link** → a timestamped transcript resolves → same node-path.
  3. Drop a **42-slide deck** → speaker notes pull in → same node-path.
- **[ANIMATION]**
  - The drop zone pulses cyan on hover; the file `fade-scale`s in and lands (`power3.out`).
  - The **30-second counter** is a motion-graphic `count-up` `0 → 30s` (NOT a live capture).
  - The "wall → path": page thumbnails `fade` down while cyan **nodes `pop`** (`back.out`) and **edges `self-draw`** between them (per `frame.md` *Knowledge-Map* node/edge). ~1.5s per source.
  - Sources 2 & 3 are faster (0.9s each), same end-frame — establishes repetition = "any source."
- **[TEXT MOTION]** a persistent mono chrome line top-left `type-on`s the source each pass: `PDF · 34 pages` → `YOUTUBE · 2h 04m` → `PPTX · 42 slides`. The hero line `mask-rise`s once and holds.
- **[ASSETS]** UI captures: drop zone, upload states, Points-of-Knowledge path (real product). Props: a chapter PDF, a YouTube thumbnail, a slide deck. Motion-graphic counter. Cyan nodes + self-draw edges.
- **[VO]** "Watch. You drop the file — a chapter, a lecture, a deck — and Ritsu doesn't just open it. It reads it. Every page, even scanned. The math. The speaker notes. The video transcript. Then it does the hard part: it turns the wall into a path. Small enough to finish tonight."
- **[ON-SCREEN]** **Most tools open your file. Ritsu actually reads it.**

## BEAT 5 · 1:08–1:28 · 🖥️ FACELESS — Active learning + the vocabulary
- **[FOOTAGE]** Split focus: (top) a row of **slash-command chips** light up; (center) a **quiz-card** where a free-text answer is graded.
  - The learner types a **half-right** answer to `/askme`; it scores **7/10** and names the exact gap; then `/quiz` fires a fresh multiple-choice.
- **[ANIMATION]**
  - Command chips (`frame.md` *Vocabulary* treatment): `/quiz /flashcard /explain /derive /counter-example` `fade-rise` in stagger (0.08), each lighting `#19DEF4`; a soft glow ripples L→R across the row.
  - Quiz-card `fade-scale`s up with a slight `rotationX` tilt-to-flat (`power3.out`, 0.7s).
  - The **7/10** `count-up`s (`0→7`); the "you missed the second condition" note `type-on`s in mono; the correct chip gets a cyan-tint fill + `pop` check (`back.out`).
- **[TEXT MOTION]** the headline `mask-rise`; chips stagger; the score counts; the note types on.
- **[ASSETS]** command-chip components; quiz-card component (slate-panel `#151C29`, border `#1E2C40`, correct → cyan-tint); mono grading note. Real `/askme` capture if available, else a faithful mock in the design system.
- **[VO]** "Now it makes you work. Not multiple-choice you can guess — it asks you to explain. You type your answer, it grades it out of ten, and tells you exactly what you missed. Seventeen kinds of practice, built from your own pages. Every other study tool starts empty. This one starts full."
- **[ON-SCREEN]** `/askme · 7/10 — you missed the second condition` · `/quiz` · **A vocabulary for learning.**

## BEAT 5.1 · +0:18 · 🖥️ FACELESS — Learning science, made interactive
> Inserts after Beat 5 (deepens "seventeen" — the *why*). Adds ~18s → film ~3:13. Faceless; tighter, confident (the product talking).
- **[FRAME]** `frame.md` → *Vocabulary* treatment, continuing Beat 5's register. A grid of `command-chip`s — the seventeen — fills the frame; each lights `#19DEF4` the instant its technique is named. Behind them, `SC-04` command palette / `SC-05` Configure-/quiz UI, dimmed to a faint bed.
- **[FOOTAGE]** `SC-04` (command menu) or `SC-05` (Configure /quiz — Bloom + pedagogy) as the dimmed bed; the chips are the hero.
- **[ANIMATION]** three chips `fade-scale` + glow as their technique is spoken (Active recall → `/askme`, Spaced repetition → `/flashcard`, Feynman → `/eli5`); then the full 17-chip grid staggers in (`fade-rise`, 0.06), a cyan glow-ripple L→R; one chip holds a `glow-pulse` on "each one a single command."
- **[TEXT MOTION]** kicker `mask-rise`; the three technique labels type-on in mono beside their chip; the closing line `mask-rise`s with "One is all it takes" as the cyan-gradient clause + hero glow.
- **[ASSETS]** 17 real `command-chip`s (name real commands only): `/askme /quiz /flashcard /eli5 /explain /why /derive /counter-example /analogy /intuition /contrast /compare /solve /prereq /what-if /example /adaptive`. Dark ink on any cyan chip.
- **[VO]** "Most of Ritsu's seventeen commands are built on real learning science. Active recall. Spaced repetition. The Feynman method — the techniques that work, but take hours to build by hand. Ritsu builds them from your own material in seconds. One simple command, and you're not reading about a concept — you're inside a deep, interactive activity that teaches it."
- **[ON-SCREEN]** kicker `BUILT ON LEARNING SCIENCE` → **Seventeen commands.** → cyan clause **One is all it takes.**

## BEAT 6 · 1:28–1:42 · 🖥️ FACELESS — Knowledge Map (per-source)
- **[FOOTAGE]** **One source's** Knowledge Map: concept panels filling live; a weak concept surfacing.
- **[ANIMATION]** concept panels `count-up` `15 → 41 → 68 → 86 / 100 · mastered` (staggered); the mastered ring `self-draw`s; a weaker concept **glow-pulses** and labels "worth your next hour." Data-viz calm, no confetti. **Single source only** — do NOT link across files.
- **[TEXT MOTION]** headline `mask-rise`; numbers count; the "worth your next hour" tag `fade` in.
- **[ASSETS]** Knowledge-Map capture (per-source) or a `frame.md` node/panel mock; mastery ring (self-draw). Cyan fills, dark ink on any bright chip.
- **[VO]** "And it keeps score — honestly. Every concept gets a number, zero to a hundred. It only climbs when you use the idea correctly. Skimming can't fake it. Re-reading can't inflate it. So you stop guessing what to revise."
- **[ON-SCREEN]** **Your score can't be fooled.** → `Stop guessing what to revise.`

## BEAT 7 · 1:42–1:54 · 🖥️ FACELESS — Spaced review
- **[FOOTAGE]** A forgetting curve dropping, then **review pulses lifting it back** at each interval on the ladder.
- **[ANIMATION]** the curve `self-draw`s down; at `1 · 3 · 7 · 16 · 35` days, a cyan **pulse** `pop`s and the curve steps back up (`power2.out`). The ladder ticks type-on in mono. Loops the up-motion 5× on the interval grid.
- **[TEXT MOTION]** ladder `type-on`; headline `mask-rise`.
- **[ASSETS]** forgetting-curve SVG (draw-on + step-ups); mono ladder `1·3·7·16·35`.
- **[VO]** "Then it defends what you learned. Memory fades on a curve. Ritsu brings each idea back right before you'd lose it — one day, three, seven, sixteen, thirty-five. No cards to make. Learn it once. Keep it."
- **[ON-SCREEN]** **Beat the forgetting curve.** · `1 · 3 · 7 · 16 · 35`

## BEAT 8 · 1:54–2:22 · 🖥️ FACELESS — Situations montage (the use-cases)
> The variety beat. **Five** situations, ~5.6s each, each a crisp before→after with its own footage + a bold label. Fast cuts, one continuous cyan through-line.

- **[FOOTAGE + ANIMATION], per situation:**
  1. **Ace your exam in 3 days** *(0:00)* — a **3-day countdown clock** ticks; a chapter drops; the plan **re-weights** to spotlight the weak concepts first (cyan bars grow on the gaps). *"finds the vital few and drills your gaps first."*
     - Anim: clock `count-down`; plan bars `scaleY` up on the gap concepts (`power3.out`).
  2. **Learn from a YouTube lecture** *(≈0:05.6)* — a **2h 04m** video thumbnail collapses into ~8 recall nodes. *"a two-hour lecture → concepts you can actually recall."*
     - Anim: thumbnail `fade-scale` down; nodes `pop` + edges `self-draw`.
  3. **Break down a research paper** *(≈0:11.2)* — a dense PDF; a hidden **reasoning chain self-draws** step by step between claims. *"rebuilds the reasoning the paper skipped — until you can explain it yourself."*
     - Anim: paper `fade`; arrow-chain `self-draw` claim→claim.
  4. **Solve a problem set** *(≈0:16.8)* — a worked problem reveals **step by step** with a "why" callout on each line. *"understand the why, not just the answer."*
     - Anim: solution lines `mask-rise` one by one; a cyan `why?` callout `pop`s on each.
  5. **Learn a new framework fast** *(≈0:22.4)* — code docs drop; a `/quiz` + a runnable code-exercise chip light up. *"docs → drills you can actually run."*
     - Anim: doc `fade`; `command-chip`s + a mono code block `type-on`.
- **[TEXT MOTION]** each situation's **label** slams in as a mono kicker + Inter headline (`mask-rise`, hard-cut on the next). Labels: `EXAM IN 3 DAYS` · `YOUTUBE LECTURE` · `RESEARCH PAPER` · `PROBLEM SET` · `LEARN A FRAMEWORK`.
- **[ASSETS]** per situation: countdown clock; YouTube thumbnail; a paper PDF + arrow-chain SVG; a worked-solution capture; code docs + code-exercise chip. Reuse the node/edge + chip components throughout.
- **[VO]** "It works on whatever's in front of you. An exam in three days — it finds the vital few and drills your gaps first. A two-hour lecture — turned into concepts you can recall. A dense paper — rebuilt until you can explain it yourself. A problem set — the why, not just the answer. New framework — docs you can actually run."
- **[ON-SCREEN]** the five labels, in cut.

## BEAT 9 · 2:22–2:36 · 🧑 AVATAR — Differentiation
- **[FRAME]** `frame.md` → *Statement*, presenter opinionated; five competitor logos animate beside them.
- **[ANIMATION]** the five logos `fade-scale` in around the presenter, then **collapse into the Ritsu mark** (`x/y → center`, `scale → 0`, mark `pop`s). Face returns before the close.
- **[VO]** "One thing to be clear about. This isn't a chatbot doing your thinking. It isn't a folder of flashcards you built by hand. It reads the whole document, it makes you produce, and it grades you. It replaces the whole pile — Anki, Quizlet, Kahoot, ChatGPT, Notion — with one."
- **[TEXT MOTION]** **Replace your entire study stack.** `mask-rise`.
- **[ASSETS]** 5 official competitor marks; the Ritsu mark.

## BEAT 10 · 2:36–2:48 · 🖥️ FACELESS — Proof (avatar VO continues)
- **[FOOTAGE]** three attributed **quote-cards** + `4.9/5`, on slate.
- **[ANIMATION]** cards `fade-scale` in stagger (`stat-card` treatment, top-border only); the numbers (`+15`, `50%`, `3`) `count-up`; the `4.9/5` fills a cyan bar. A small super holds bottom-right.
- **[TEXT MOTION]** cards stagger; numbers count; super `fade`.
- **[ASSETS]** 3 testimonial quote-cards (Sarah C. / Marcus J. / Patricia W.); a 4.9/5 rating chip; the disclaimer super.
- **[VO]** "Sarah, a medical student, cut six hours of highlighting down to two — and scored fifteen points higher on her boards. Marcus halved his ramp-up on new projects. Patricia finished three courses in two months."
- **[ON-SCREEN]** `"15 points higher on my boards." — Sarah C., Medical Student` · `4.9/5` · *Individual results. Not typical.*

## BEAT 11 · 2:48–3:00 · 🧑 AVATAR — CTA / close
- **[FRAME]** `frame.md` → *CTA*. Presenter delivers the invitation → cut to the end-card.
- **[ANIMATION]** the lockup `fade-scale`s in; the **cta-button** `pop`s (`back.out(1.7)`, the one glow: `0 0 34px` cyan); a sparkle `pop`s on the button; `ritsu.ai` in mono `mask-rise`s; hold on the brand (no hard fade — a cinematic hold).
- **[VO]** "You already have the material. Let it teach you. Start free — free forever, no credit card. Ritsu dot A-I. Now make it teach you."
- **[ON-SCREEN]** **Start Learning Free** · `Free forever. No credit card.` · `ritsu.ai`
- **[ASSETS]** lockup; cta-button (cyan `#0ABCD0` fill, dark ink `#04141C` text, glow); end-card.

---

## Tagged VO — paste-ready (KAI · eleven_v3)

Record beat-by-beat (recommended — cleaner takes) or as one block. Tags are a starting performance; tune to KAI.

**B1 · AVATAR — weary, human**
> [sighs] You read the chapter. [tired] You watched the lecture. You even had a chatbot explain it. [pause] And the night before the exam… it's still not yours. [exhales] You were busy for hours. Almost none of it stuck.

**B2 · FACELESS — matter-of-fact**
> [thoughtful] Here's why. Re-reading feels like progress. It isn't. Most of what you learn fades within days — that's just how memory works. Your flashcards take longer to build than to study. And your tools? [pause] They don't talk to each other.

**B3 · AVATAR — warm, a lift**
> [warmly] There's a better trade. [gently] Stop consuming the material… make it teach you. [confident] Drop in anything you already have. A textbook chapter. A two-hour lecture. A slide deck. A research paper. [exhales] Ritsu turns it into your own tutor. In about thirty seconds.

**B4 · FACELESS — confident, "watch this"**
> [confident] Watch. You drop the file — a chapter, a lecture, a deck — and Ritsu doesn't just open it. [emphatically] It READS it. Every page, even scanned. The math. The speaker notes. The video transcript. [pause] Then it does the hard part: it turns the wall into a path. Small enough to finish… tonight.

**B5 · FACELESS — measured, a touch impressed**
> [curious] Now it makes you work. Not multiple-choice you can guess — it asks you to explain. You type your answer, it grades it out of ten… and tells you EXACTLY what you missed. Seventeen kinds of practice, built from your own pages. [confident] Every other study tool starts empty. This one starts full.

**B5.1 · FACELESS — confident, matter-of-fact**
> [confident] Most of Ritsu's seventeen commands are built on real learning science. Active recall. Spaced repetition. The Feynman method. [thoughtful] The techniques that work — but take HOURS to build by hand. [confident] Ritsu builds them from your own material in seconds. One simple command… and you're not reading about a concept — you're inside a deep, interactive activity that teaches it.

**B6 · FACELESS — honest**
> [thoughtful] And it keeps score — honestly. Every concept gets a number, zero to a hundred. It only climbs when you use the idea correctly. Skimming can't fake it. Re-reading can't inflate it. [pause] So you stop guessing what to revise.

**B7 · FACELESS — reassuring**
> [reassuring] Then it defends what you learned. Memory fades on a curve. Ritsu brings each idea back… right before you'd lose it. One day, three, seven, sixteen, thirty-five. No cards to make. [gently] Learn it once. Keep it.

**B8 · FACELESS — brisk, energetic montage**
> [excited] It works on whatever's in front of you. An exam in three days — it finds the vital few and drills your gaps first. A two-hour lecture — turned into concepts you can recall. A dense paper — rebuilt until you can explain it yourself. A problem set — the WHY, not just the answer. A new framework — docs you can actually run.

**B9 · AVATAR — firm, opinionated**
> [confident] One thing to be clear about. This isn't a chatbot doing your thinking. It isn't a folder of flashcards you built by hand. [emphatically] It reads the whole document, it makes you produce, and it grades you. It replaces the whole pile — Anki, Quizlet, Kahoot, ChatGPT, Notion — [pause] with one.

**B10 · FACELESS — sincere**
> [warmly] Sarah, a medical student, cut six hours of highlighting down to two… and scored fifteen points higher on her boards. Marcus halved his ramp-up on new projects. Patricia finished three courses in two months.

**B11 · AVATAR — warm invitation, gentle close**
> [warmly] You already have the material. [gently] Let it teach you. [reassuring] Start free — free forever, no credit card. [pause] Ritsu dot A-I. [softly] Now… make it teach you.

---

## Clean VO read (for timing / recording — ~500 words ≈ 3:00)

> You read the chapter. You watched the lecture. You even had a chatbot explain it. And the night before the exam — it's still not yours. You were busy for hours. Almost none of it stuck.
> Here's why. Re-reading feels like progress. It isn't. Most of what you learn fades within days — that's just how memory works. Your flashcards take longer to build than to study. And your tools don't talk to each other.
> There's a better trade. Stop consuming the material — make it teach you. Drop in anything you already have. A textbook chapter. A two-hour lecture. A slide deck. A research paper. Ritsu turns it into your own tutor. In about thirty seconds.
> Watch. You drop the file — a chapter, a lecture, a deck — and Ritsu doesn't just open it. It reads it. Every page, even scanned. The math. The speaker notes. The video transcript. Then it does the hard part: it turns the wall into a path. Small enough to finish tonight.
> Now it makes you work. Not multiple-choice you can guess — it asks you to explain. You type your answer, it grades it out of ten, and tells you exactly what you missed. Seventeen kinds of practice, built from your own pages. Every other study tool starts empty. This one starts full.
> And it keeps score — honestly. Every concept gets a number, zero to a hundred. It only climbs when you use the idea correctly. Skimming can't fake it. Re-reading can't inflate it. So you stop guessing what to revise.
> Then it defends what you learned. Memory fades on a curve. Ritsu brings each idea back right before you'd lose it — one day, three, seven, sixteen, thirty-five. No cards to make. Learn it once. Keep it.
> It works on whatever's in front of you. An exam in three days — it finds the vital few and drills your gaps first. A two-hour lecture — turned into concepts you can recall. A dense paper — rebuilt until you can explain it yourself. A problem set — the why, not just the answer. A new framework — docs you can actually run.
> One thing to be clear about. This isn't a chatbot doing your thinking. It isn't a folder of flashcards you built by hand. It reads the whole document, it makes you produce, and it grades you. It replaces the whole pile — Anki, Quizlet, Kahoot, ChatGPT, Notion — with one.
> Sarah, a medical student, cut six hours of highlighting down to two — and scored fifteen points higher on her boards. Marcus halved his ramp-up on new projects. Patricia finished three courses in two months.
> You already have the material. Let it teach you. Start free — free forever, no credit card. Ritsu dot A-I. Now make it teach you.

---

## Master asset checklist

**Avatar (B1, 3, 9, 11):** one continuous VO take; cut to face only on these four. Wardrobe/tone calm, credible. (HeyGen avatar once `heygen auth login --oauth` is done, or a real presenter plate.)

**Screen-captures (real product):** drop-zone + upload states · Points-of-Knowledge plan · `/askme` grading (7/10) · quiz-card · **per-source** Knowledge Map filling · spaced-review ladder · a runnable code-exercise.

**Motion-graphics (build in HyperFrames, follow `frame.md`):** forgetting curve (draw-on + step-ups) · the wall→node-path · the 30s **count-up** (never the live 0+ counter) · the situations montage (countdown clock, arrow-reasoning chain, worked-solution reveal) · the logo-collapse · the end-card.

**Props:** a chapter PDF · a 2h YouTube thumbnail · a 42-slide deck · a research-paper PDF · a problem set · code docs.

**Brand:** `ritsu-mark.png` / `ritsu-logo.png` / `ritsu-lockup.png` (`../../design-systems/ritsu/` or `00-core/design-system/ritsu/assets/`) · Inter + JetBrains Mono · palette slate `#020817` / cyan `#0ABCD0` / bright `#19DEF4` / teal `#12A58D` / ink `#04141C` / muted `#94A3B8`.

**Competitor marks:** Anki · Quizlet · Kahoot · ChatGPT · Notion (official, greyscale in B2, collapsing in B9).

**Testimonials:** Sarah C. (Medical Student, +15 boards) · Marcus J. (Engineer, 50% ramp) · Patricia W. (Career changer, 3 courses/2 months) · 4.9/5 + "Individual results. Not typical."

---

## Build note

This project (`video/hyperframes/ritsu-product-launch/`) is **local-only** (per-operator, not pushed). To build the film, author `index.html` here against `../../design-systems/ritsu/frame.md`, drop captures/props in `assets/`, then `npx hyperframes check` → `preview` → `render`. To version this as a canonical company asset: `git add -f video/hyperframes/ritsu-product-launch`.
