---
title: Ritsu — Product Charter
type: core-doc
slug: product
layer: identity
status: canonical
owner: founder
last_reviewed: "2026-05-02"
review_cadence: quarterly
cited_by:
  - blog-post-drafting
  - social-post-drafting
  - support-reply-drafting
  - growth-orchestrator
auto_load: true
---
# Ritsu — Product Charter

> **Canonical source of truth for what Ritsu is.**
> Every agent must align with this document before producing marketing, sales, support, or product-ops output. If reality drifts from this document, update the document via PR — do not let two truths exist.

**Last verified against the live site:** 2026-05-02 (https://ritsu.ai)
**Owner:** founder
**Change policy:** PR + human review

---

## One-line

Ritsu turns any document into your personal AI tutor.

## Tagline (homepage hero)

**Turn Raw Materials Into True Mastery.**

## Positioning

> Personalized AI Tutor. Upload PDF, video, slides, or any source. In 30 seconds, get an AI tutor that quizzes you, explains concepts, and helps you truly understand.

Ritsu replaces the user's entire study stack: Anki, Quizlet, Kahoot, ChatGPT, Notion. From one upload.

## What Ritsu is, in plain terms

A learning platform built on the principle that **active learning beats passive learning**. Reading, highlighting, and rewatching are passive. Quizzing yourself, explaining concepts back, and solving problems are active. Ritsu automates the painful part of active learning (creating the materials) so the user can spend their time on the productive part (doing the work).

## What Ritsu is NOT

- Not a general chatbot. ChatGPT is a chatbot you paste into. Ritsu reads the user's full document, builds a structured plan, and persists across sessions.
- Not a flashcard app. Ritsu generates flashcards as one of 17+ activity types, but the product is the full learning loop, not the cards.
- Not a course platform. Ritsu generates personalized learning paths from the user's own material; it does not host pre-made courses (though educators can use it to create courses for their students).
- Not a note-taking tool. Notion-style note-taking is explicitly something Ritsu replaces, not competes with on its own terms.

---

## Core capabilities (as live on the site)

### Universal input — works with whatever you're studying

Supported formats: **PDF, PPTX, DOCX, YouTube, web URL, Markdown, code, images.** "Drop it in — Ritsu handles the rest."

### Interactive learning — 17+ activity types from one upload

Quiz, Flashcard, Mindmap, Timeline, Crossword, Drag-and-drop, Diagram, Code exercise, Match. All auto-generated from the user's material — not templates.

Slash commands surface these:
`/quiz`, `/flashcard`, `/mindmap`, `/timeline`, `/crossword`, `/diagram`, `/code`, `/match`.

### Tutoring modes — 7 modes for different kinds of understanding

`/askme`, `/exercise`, `/solve`, `/upthink`, `/adaptive`, plus others.

- **Ask Me** challenges the user to explain concepts back.
- **Exercise** gives problems to solve step by step.
- **Solve** poses real-world scenarios.

### Mastery engine — built for understanding, not memorization

Concept maps connecting ideas across chapters. Deep explanations using analogies from the user's experience. Compare, Analogies, Deep Explain, Feynman-style breakdowns.

### Emotional AI — 10 personality styles

Funny, Supportive, Nerdy, Chill, Energetic, Sarcastic, and more. Animated stickers and emotional messages at milestones. The pitch: "learning should feel as good as getting it right."

---

## The three-step user flow (homepage)

1. **Drop your file.** Any document. ~5 seconds.
2. **AI builds your plan.** Ritsu analyzes and creates a structured learning path automatically. Topics ordered by difficulty. Activities auto-generated. ~30 seconds.
3. **Start mastering.** Take quizzes, flip flashcards, explore concepts. Track progress on a heatmap.

---

## Target audience

Six personas, in homepage order:

1. **Students** — primary. Textbook chapters, exam prep, homework.
2. **Self-Learners** — multi-source learning projects.
3. **Engineers** — learning a new framework from docs; code exercises.
4. **Researchers** — breaking down dense research papers into testable knowledge.
5. **Educators** — creating courses for their students from existing material.
6. **Professionals** — career changers, ongoing learning.

Featured situational workflows on the homepage:
- Master a textbook chapter (most popular)
- Ace your exam in 3 days (exam season)
- Learn from any YouTube video
- Solve textbook exercises
- Break down a research paper
- Learn a new framework fast
- Build a multi-source learning project
- Remember what you read online (URL → quiz)
- Create a course for your students

---

## Key differentiators (vs competitors users actually compare against)

| Competitor | What Ritsu does that they don't |
|---|---|
| ChatGPT | Reads the entire document, persistent across sessions, structured 17+ activity output, learning-purpose-built. |
| Anki / Quizlet | Auto-generates from any source in seconds; not just flashcards but full learning loop. |
| Notion AI | Active learning instead of note storage; quiz/exercise generation; mastery tracking. |
| Kahoot | Personal, not group; auto-generated; depth beyond multiple choice. |

---

## Pricing model

**Freemium.** Free plan exists. Free forever, no credit card required to start. Detailed tiers live at https://ritsu.ai/pricing — agents must fetch the live page when discussing specific tier limits, never quote from memory.

---

## Voice and tone

The site copy uses these patterns. Marketing output should match.

- **Direct, often imperative.** "Drop your file." "Stop re-reading." "Pick yours and start in seconds."
- **Anti-passive-learning posture.** "Reading, watching, highlighting — none of it is learning." This is a strong stance and it is on-brand.
- **Concrete numbers.** "30 seconds." "3 steps." "17+ activity types." Not vague.
- **Confident comparisons.** Site directly names Anki, Quizlet, Kahoot, ChatGPT, Notion as things Ritsu replaces. We are not coy.
- **Friendly, not corporate.** "🎯 You got 4/5 on Neural Networks!" The product has emotional warmth; marketing should too.
- **No filler adjectives.** "Powerful," "amazing," "revolutionary" — avoid. Show specifics instead.

For full brand voice rules, see `00-core/brand_voice.md` (TODO).

---

## Operational implications for the AI workforce

This section is what makes this charter actionable for `ritsu-works` agents.

- **01-growth must own SEO around "active learning," "AI tutor," and the situational workflows** (textbook chapter, exam in 3 days, YouTube learning, etc.). Each situational workflow on the homepage corresponds to a long-tail content cluster.
- **03-delivery handles support at scale.** Ritsu has free users (high volume, low ARPU) — most support must be self-service or AI-handled. Escalation to human only for billing, abuse, or edge cases.
- **02-product owns the feedback loop** from users back to the product team: which activity types get used, which modes drive retention, what content fails to generate well.
- **06-trust-safety** is non-optional given:
  - Users upload copyrighted material (textbooks, papers). DMCA process must be real.
  - Users may include minors (medical students are adults; high school students are not). Age handling.
  - GDPR/PDPA — users globally; site has GDPR page already.
  - Hallucination in generated quizzes is a real product risk; safety layer must be in product code, but governance lives here.
- **04-backoffice handles Vietnam-specific tax and compliance** for the operating entity. Revenue collected globally; tax obligations local.

---

## What changes when?

- **Product positioning** changes only with founder approval. PR-only.
- **Feature list** updated when new activity types or modes ship — agent should detect via product changelog feed (TBD: add to `knowledge/manifest.yaml` ETL flows).
- **Persona priorities** revisited quarterly based on actual user data from `metrics.product_dau_snapshot`.
- **Pricing** is live data; never cache numbers. Always fetch from `/pricing` page.

---

*This document is the canonical answer to "what is Ritsu?" Every other piece of marketing, sales, and support material should be consistent with it. If you find a contradiction, the contradiction is a bug — fix the source, not the symptom.*
