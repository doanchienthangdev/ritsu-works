---
title: Ritsu — Product Charter
type: core-doc
slug: product
layer: identity
status: canonical
owner: founder
last_reviewed: "2026-05-28"
last_verified_live_site: "2026-05-28"
review_cadence: quarterly
cited_by:
  - blog-post-drafting
  - social-post-drafting
  - email-drafting
  - support-reply-drafting
  - growth-orchestrator
auto_load: true
---
# Ritsu — Product Charter

> **Canonical source of truth for what Ritsu is.**
> Every agent must align with this document before producing marketing, sales, support, or product-ops output. If reality drifts from this document, update the document via PR — do not let two truths exist.

**Last verified against the live site:** 2026-05-28 (https://ritsu.ai)
**Owner:** founder
**Change policy:** PR + human review (Tier C per `governance/HITL.md`)

---

## 1. One-line

Ritsu turns any document into your personal AI tutor.

## 2. Tagline (homepage hero)

**Turn Raw Materials Into True Mastery.**

For the slogan registry across channels (ad headlines, push, email,
social) and forbidden-phrase list, see `00-core/positioning.md`.

## 3. Positioning

> Personalized AI Tutor. Upload PDF, video, slides, or any source. In 30 seconds, get an AI tutor that quizzes you, explains concepts, and helps you truly understand.

Ritsu replaces the user's entire study stack: Anki, Quizlet, Kahoot, ChatGPT, Notion. From one upload.

## 4. What Ritsu is, in plain terms

A learning platform built on the principle that **active learning beats passive learning**. Reading, highlighting, and rewatching are passive. Quizzing yourself, explaining concepts back, and solving problems are active. Ritsu automates the painful part of active learning (creating the materials) so the user can spend their time on the productive part (doing the work).

## 5. What Ritsu is NOT

- **Not a general chatbot.** ChatGPT is a chatbot you paste into. Ritsu reads the user's full document, builds a structured plan, and persists across sessions.
- **Not a flashcard app.** Ritsu generates flashcards as one of 17+ activity types, but the product is the full learning loop, not the cards.
- **Not a course platform.** Coursera and Udemy provide pre-built curricula; Ritsu generates personalized learning paths from the user's own material (though educators can use it to create courses for their students).
- **Not a note-taking tool.** Notion-style note storage is explicitly something Ritsu replaces, not competes with on its own terms.
- **Not a group quiz game.** Kahoot is fun group play; Ritsu is personal mastery, auto-generated, with depth beyond multiple choice.

---

## 6. Core capabilities

> The product surface as live on https://ritsu.ai (verified 2026-05-28). Marketing-site claims and in-product reality drift over time — the counts below are pinned to this verification snapshot; for the authoritative current lists, always check the live site or in-product picker.

### 6.1 Universal input — 12+ source formats

Verified-named on the homepage (8 of 12+): **PDF, PPTX, DOCX, YouTube, web URL, Markdown, code, images.** Additional 4+ formats visible in the upload UI but not enumerated on marketing surface. "Drop it in — Ritsu handles the rest."

### 6.2 Interactive learning — 17+ activity types

Verified-named (9 of 17+): **Quiz, Flashcard, Mindmap, Timeline, Crossword, Drag-and-drop, Diagram, Code exercise, Match.** All auto-generated from the user's material — not templates.

In-product slash commands: `/quiz`, `/flashcard`, `/mindmap`, `/timeline`, `/crossword`, `/diagram`, `/code`, `/match`. The repo claims **185+ commands** total — that is the superset including activities + modes + utilities, not just activity types. For the full current activity list, fetch https://ritsu.ai.

### 6.3 Tutoring modes — 7 modes

Verified-named (5 of 7): **Ask Me, Exercise, Solve, Upthink, Adaptive.**

- **Ask Me** — challenges the user to explain concepts back.
- **Exercise** — gives problems to solve step by step.
- **Solve** — poses real-world scenarios.
- **Upthink, Adaptive** — see in-product picker for descriptions.

Two additional modes visible in-product but not enumerated on marketing surface.

### 6.4 Mastery engine — built for understanding, not memorization

Concept maps connect ideas across chapters. Named techniques applied to user's material: **Compare, Analogies, Deep Explain, Feynman-style breakdowns.**

The **Knowledge Map** feature surfaces these connections visually — Basic at Plus tier, Full (with sharing + export) at Pro tier.

### 6.5 Emotional AI — 10 personality styles

Verified-named (6 of 10): **Funny, Supportive, Nerdy, Chill, Energetic, Sarcastic.** Four additional styles in-product. Animated stickers + emotional messages at milestones. Pitch: "learning should feel as good as getting it right."

Personality availability gates by tier: Free + Plus get the 10 stock personalities; **Ultra unlocks unlimited custom personalities** (per https://ritsu.ai/pricing).

### 6.6 Multi-language — 10 languages

All tiers support 10 languages (per https://ritsu.ai/pricing). **Vietnamese-first** per `00-core/icp-summary.md` (founder market + lowest CAC); English is the broader-reach secondary. The other 8 languages are not enumerated on marketing surface — verify in-product locale picker.

---

## 7. The three-step user flow (homepage)

1. **Drop your file.** Any document. ~5 seconds.
2. **AI builds your plan.** Ritsu analyzes and creates a structured learning path automatically. Topics ordered by difficulty. Activities auto-generated. ~30 seconds.
3. **Start mastering.** Take quizzes, flip flashcards, explore concepts. Track progress on a heatmap.

This is the **magic moment** the product is designed to deliver in <60 seconds (per `00-core/icp-summary.md` § 1).

---

## 8. Target audience

Six personas, in homepage order:

1. **Students** — primary. Textbook chapters, exam prep, homework.
2. **Self-Learners** — multi-source learning projects.
3. **Engineers** — learning a new framework from docs; code exercises.
4. **Researchers** — breaking down dense research papers into testable knowledge.
5. **Educators** — creating courses for their students from existing material.
6. **Professionals** — career changers, ongoing learning.

> For the **first-100-paying** primary persona compressed to one page, see `00-core/icp-summary.md`. The list above is the marketing-site surface; the ICP doc is the operating priority.

Featured situational workflows on the homepage (verified 2026-05-28):

- Master a textbook chapter *(most popular)*
- Ace your exam in 3 days *(exam season)*
- Learn from any YouTube video
- Solve textbook exercises
- Break down a research paper
- Learn a new framework fast
- Build a multi-source learning project
- Remember what you read online (URL → quiz)
- Create a course for your students

Each situational workflow maps to a long-tail content cluster owned by `01-marketing`.

---

## 9. Key differentiators (vs competitors users actually compare against)

| Competitor | What Ritsu does that they don't |
|---|---|
| **ChatGPT** | Reads the entire document; persistent across sessions; structured 17+ activity output; learning-purpose-built (not general chat). |
| **Anki / Quizlet** | Auto-generates from any source in seconds; not just flashcards but the full learning loop. |
| **Notion AI** | Active learning instead of note storage; quiz / exercise generation; mastery tracking. |
| **Kahoot** | Personal, not group; auto-generated from your material; depth beyond multiple choice. |
| **Coursera / Udemy** | Personalized from YOUR material; not one-size-fits-all curricula. |

For the voice-locked marketing-surface version of these comparisons, see `00-core/positioning.md` § 5.

---

## 10. Pricing model

**Freemium, credit-based.** Free plan exists permanently — no credit card required to start. Paid tiers gate at **credit volume** (the usage unit) + per-source size limits (pages, video minutes) + feature unlocks (Knowledge Map, custom personalities, API access).

Four tiers (positioning labels, verified 2026-05-28):

| Tier | Positioning | Notes |
|---|---|---|
| **Free** | Starter | Sufficient for casual learning + the magic moment |
| **Plus** | Personal *(most popular)* | Basic Knowledge Map, 10 personalities, XP badges |
| **Pro** | Academic *(best value)* | Full Knowledge Map (share + export), advanced analytics |
| **Ultra** | Professional | Unlimited custom personalities, priority models, API access (beta) |

**Detailed tier numbers (price, credit allocation, page / video limits, included features) live at https://ritsu.ai/pricing.** Agents must fetch the live page when discussing specific limits — never quote from memory. Pricing is dynamic and tier boundaries are EXPERIMENTAL pre-PMF (per SOP-PRODUCT-010 pricing-pull-test).

> Pricing philosophy (no dark patterns, no manufactured urgency, freemium-forever as competitive moat) lives in `00-core/charter.md` § 3. Detail will land in `00-core/pricing-philosophy.md` when that stub graduates.

---

## 11. Voice and tone

Single source of truth: **`00-core/brand_voice.md`**. Every customer-facing skill (`blog-post-drafting`, `support-reply-drafting`, `social-post-drafting`, `email-drafting`) must `Read` that file at session start.

Brand voice in one sentence: **Helpful, honest, concrete, calm, efficient — never salesy, casual-careless, corporate-stiff, cute, or pretending-to-be-human.**

When in doubt: imitate the GOOD examples in `brand_voice.md`; refuse the BAD examples.

---

## 12. Operational implications for the AI workforce

This section makes the charter actionable for `ritsu-works` agents (pillar codes per architecture v1.0.1):

- **`01-marketing`** owns SEO + content engine + brand-voice kit. Each situational workflow on the homepage (textbook chapter, exam in 3 days, YouTube learning, etc.) is a long-tail content cluster.
- **`02-sales`** owns pricing-tier experimentation + conversion funnel + free-to-paid trigger detection. Pricing boundaries remain experimental until **SOP-PRODUCT-010** (pricing-pull-test) produces data.
- **`03-gtm`** (stage pillar, dissolves on PMF) composes Marketing + Sales + Product + Customer modules to drive the **100-paying-who-love** north-star (per `00-core/north-star.md`).
- **`04-product`** owns the feedback loop from users back to the product team: which activity types get used, which modes drive retention, what content fails to generate well. **PG gate: SOP-PRODUCT-002** mandates N=10 strangers observed using product before any major feature build.
- **`05-customer`** owns success / onboarding / support / retention / feedback. Free users are high-volume + low-ARPU — most support must be self-service or AI-handled; escalation only for billing, abuse, or edge cases. Founder personally onboards first ~30 paying via **SOP-CUSTOMER-006** (Collison install protocol); automates from N=31 (SOP-CUSTOMER-009).
- **`07-trust-safety`** is non-optional given:
  - Users upload copyrighted material (textbooks, papers). DMCA process must be real.
  - Users may include minors (medical students are adults; high school students are not). Age handling.
  - GDPR / PDPA — users globally; site already has a GDPR page.
  - Hallucination in generated quizzes is a real product risk (per `00-core/transparency.md` § "Limits and known issues"); safety layer lives in product code, but governance lives here.
- **`08-finance`** handles Vietnam-specific tax and compliance for the operating entity. Revenue collected globally; tax obligations local.

---

## 13. Technology context

Brief stack disclosure — AI workforce agents (especially `code-reviewer`, `etl-runner`, `growth-orchestrator` when discussing performance / SEO) benefit from knowing the substrate:

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui + Radix.
- **Backend:** Supabase — Auth, Database, Storage, Edge Functions.
- **AI:** Claude (Anthropic) primary; OpenAI for embeddings.
- **Monorepo:** Turborepo + pnpm (apps/web + apps/admin; packages/ai, ui, utils, database, storage, config).
- **Deployment:** Vercel (trunk-based, continuous from `main`).
- **Source repo:** https://github.com/doanchienthangdev/ritsu (private).

This is informational only. Operating-AI (this `ritsu-works` repo) does **NOT** write to Product Supabase — strict firewall enforced by `etl-runner` role + HITL D-MAX boundary per `governance/HITL.md`.

---

## 14. What changes when?

- **Product positioning** changes only with founder approval. PR-only.
- **Feature list / counts** (12+ formats, 17+ activities, 7 modes, 10 personalities, 10 languages) refresh on every product changelog event. *(TODO: ETL flow `product_changelog_to_ops` in `knowledge/manifest.yaml` — currently absent.)*
- **Persona priorities** revisited quarterly based on actual user data from `metrics.product_dau_snapshot` (ETL flow `product_metrics_to_ops`).
- **Pricing** is live data; never cache numbers. Always fetch from `/pricing` page. Tier boundaries change as SOP-PRODUCT-010 pricing-pull-test produces data.
- **Tech-stack context** refresh on major framework migration (Next.js major version, Supabase API change, etc.).
- **Verification cadence:** `last_verified_live_site` frontmatter must be refreshed at least quarterly; any agent noticing drift between this doc and ritsu.ai opens a PR sooner.

---

## 15. Cross-references

Sibling 00-core docs that compose with this charter — read them when you need depth beyond what's here:

| Doc | When to read |
|---|---|
| `00-core/charter.md` | Vision, target market, monetization model, cognitive style, boundaries, stakeholders, success metrics. |
| `00-core/positioning.md` | One-liner, elevator, slogan registry, channel-tagline registry, forbidden phrases. |
| `00-core/icp-summary.md` | First-100-paying primary persona + where they hang out + substitution stack + anti-persona. |
| `00-core/north-star.md` | The single metric of the year. |
| `00-core/brand_voice.md` | How Ritsu sounds — external + internal voice, GOOD/BAD examples, Vietnamese variant. |
| `00-core/transparency.md` | AI disclosure stance, data handling, limits + known issues — the public-facing version. |
| `00-core/ai-native-philosophy.md` | How Ritsu operates as an AI-native company. |
| `00-core/founder-profile.md` | Founder operational profile. |
| `knowledge/manifest.yaml` | Where each kind of data lives (Tier 1–4 storage contract). |
| `governance/HITL.md` | Approval tiers — when an agent must escalate before acting on this doc's directives. |
| `governance/ROLES.md` | Which agent role does what; permissions and budget per role. |

---

## 16. Versioning

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-02 | Initial canonical charter. |
| 1.1 | 2026-05-28 | Refreshed via `/update tier1-file` from `.archives/brainstorming/product-md-revision-2026-05-28/`. Reconciled feature counts (12+ formats, 17+ activities, 7 modes, 10 personalities, 10 languages) with live site; pillar references updated to v1.0.1 codes; Voice & tone section collapsed to single-line pointer at `brand_voice.md`; credit-based monetization model + 4-tier naming added (no $ numbers); new Multi-language § 6.6; new Technology context § 13; new Cross-references § 15; new Versioning § 16; "fetch live" markers added on dynamic data. Stale TODO ("brand_voice.md (TODO)") removed. |

---

*This document is the canonical answer to "what is Ritsu?" Every other piece of marketing, sales, and support material should be consistent with it. If you find a contradiction, the contradiction is a bug — fix the source, not the symptom.*
