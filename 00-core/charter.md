---
title: Ritsu — Operating Charter
type: core-doc
slug: charter
layer: identity
status: canonical
owner: founder
last_reviewed: 2026-05-21
review_cadence: quarterly
cited_by: []
auto_load: false
ai_synthesized_v0_1: true
ai_synthesized_at: 2026-05-21
ai_synthesized_from: [product.md, brand_voice.md, transparency.md, CLAUDE.md, governance/HITL.md, governance/ROLES.md, .archives/pillars/PLAN.md]
ai_synthesis_note: "First-draft content synthesized by Claude Code from existing repo material. Founder reviews + ratifies at 30-paying milestone; until then treat as load-bearing-but-revisable."
---

# Ritsu — Operating Charter

> Vision, market, monetization, cognitive style, and boundaries.

**Status:** v1.0 spec
**Last updated:** 2026-05-21
**Project:** Ritsu
**Domain:** ritsu.ai

---

## 1. Vision

**Ritsu turns any document into a personal AI tutor — putting active learning in reach of every learner on Earth, regardless of socioeconomic background.**

The long-term thesis: in 2026 the bottleneck of education is no longer access to information (the internet solved that) — it is the cost of converting passive content into active practice. Reading, watching, highlighting — these are passive and don't produce mastery. Quizzing, explaining, solving — these produce mastery but require painful manual setup (Anki cards, Quizlet decks, custom problem sets).

Ritsu automates the painful part. In 30 seconds a user drops a PDF / video / URL and gets a personalized AI tutor that quizzes, explains, and tracks mastery. The cost of doing the right kind of study collapses from hours to seconds. The cost of building this experience collapses with frontier AI capability — which means we believe the *whole study stack* (Anki + Quizlet + ChatGPT + Kahoot + Notion for studying) gets replaced by one AI-native product within 5 years.

The 1 billion dollar company shape is: **B2C learner wedge → educator B2B layer → API platform that other learning apps build on.** Path is clear; execution is the question.

## 2. Target Market

**Primary (year 1):** B2C learners worldwide. Six personas — students (undergraduate primary), self-learners, engineers, researchers, educators, professionals — per `product.md`. Initial language set: Vietnamese-first (founder market + lower CAC + product fit), English-second (broader reach + monetization).

**Why this market is winnable:**
- Existing solutions are all PARTIAL: Anki/Quizlet automate flashcards but not learning; ChatGPT answers questions but doesn't structure mastery; Notion stores notes but doesn't make you remember them; Kahoot is fun but shallow.
- Switching cost is low (no lock-in vs Notion/Anki ecosystems for the lighter users), and the wedge is value-obvious (30-second source → quiz beats 30-min manual card creation).
- AI capability curve directly enables the product — every model upgrade makes Ritsu cheaper and better simultaneously.

**Expansion roadmap (year 2-5):**
- Vietnam → SEA (Indonesia, Philippines, Thailand) → India (largest English-second market for learners) → global English-primary markets.
- Educator B2B layer (teachers building tutor-augmented courses for their students; ~5-10× ARPU vs individual learners) activates once the consumer wedge is proven.
- API platform (other apps embed Ritsu's mastery-tracking) is the final layer, year 4+.

## 3. Monetization Model

**Freemium subscription.** Free tier exists permanently (no credit card to start). Paid tiers gate at activity volume + advanced features. Live pricing at https://ritsu.ai/pricing — agents must fetch the live page, not cache numbers.

Tier philosophy (from `product.md`):
- **Free:** sufficient for casual learning; the customer experiences the "magic moment" without paying. Forever free is a competitive moat (vs Quizlet/Anki paid tiers).
- **Plus/Pro/Ultra:** unlock at-volume features (more uploads, more activity types, priority generation, advanced analytics). The exact tier boundaries are EXPERIMENTAL pre-PMF — SOP-PRODUCT-010 (pricing-pull-test) decides them per data.

**Long-term monetization layers (year 2+):**
1. **Educator B2B** — teacher accounts that publish tutor-augmented courses for their students. Per-seat or per-course pricing. Expansion driven by educator-led referral.
2. **Enterprise (specific niche)** — corporate training departments that want compliance-graded learning audit trails. Higher ARPU, slower sales cycle, defer until educator B2B is proven.
3. **API platform** — other learning apps embed Ritsu's mastery engine. Usage-based pricing. Year 4+.

**Boundary on monetization tactics:**
- No dark patterns. No artificial scarcity. No "trial ends in 24 hours — upgrade now!" copy.
- No selling ads against learning content (the user is the customer, not the product).
- No data sales to third parties under any condition.

## 4. Cognitive Style

Founder's natural mode — extends to how Ritsu makes decisions:

- **Strategic + technical.** Comfortable with both `git rebase --interactive` and "what should our 3-year ARPU curve look like?" — refuses the false trade-off between operator and strategist.
- **Systems thinking.** Sees the workflow before the feature. Designs `ritsu-works` as the AI workforce that runs the company, parallel to the product itself. The pillar architecture (10 evergreen + 1 stage composition) is a systems-design artifact.
- **Declarative-first.** Prefers YAML / schemas / explicit contracts over imperative scripts. `manifest.yaml`, `governance/ROLES.md`, `knowledge/capability-registry.yaml` — all declarative, validated, drift-checked.
- **Ship-then-listen.** Pre-PMF wartime mode. Ship the smallest thing that's defensible, then learn from real reaction. Don't optimize before evidence.
- **Direct/terse.** Vietnamese-primary for team work, English-primary for repo. No throat-clearing. Asynchronous > synchronous communication where possible.
- **Wartime founder mode** (Horowitz). Pre-PMF discipline favors speed over consensus. Will revise principles at scale; wartime ≠ peacetime principles.

Brand voice (external + internal) inherits this character — see `brand_voice.md`.

## 5. Boundaries

What Ritsu will NOT do, even if profitable:

- **No deceptive marketing.** No manufactured urgency. No claims of learning outcomes without behavioral evidence. No fake testimonials. No "as featured in" without verifiable citation.
- **No PII training without explicit consent.** User content (uploads, conversations) stays in the user's account. We do not train Anthropic's or other providers' models on user data. (See `transparency.md` for the canonical user-facing version of this commitment.)
- **No AI pretending to be human.** First-contact AI disclosure is mandatory across all channels (chat, email, social). Per EU AI Act Article 50 + California SB 1001 + our own ethics.
- **No minor-targeted advertising.** Ritsu is open to learners of all ages (high school students learn medicine; we don't gate them out), but we never target ads at users we know are under 18.
- **No safety/compliance claims we haven't earned.** No "GDPR certified", "SOC 2 compliant", "HIPAA aligned" copy unless we have the audit to back it. Tier D-MAX action per HITL.md.
- **No work that conflicts with learner welfare.** Includes: no engagement-maximizing dark patterns (streak-shaming, FOMO timers); no engagement metrics as primary KPIs (mastery + retention are primary); no selling user attention to third parties.
- **No "we use AI" without saying what.** Public claims about AI must be specific: which model, which task, which limits. See `transparency.md` § "Where AI is involved".
- **No direct writes to the Ritsu product database from `ritsu-works`.** Operating AI is firewall-isolated from product Supabase. ETL read-only via the `etl-runner` role (`governance/ROLES.md`).

When a decision approaches a boundary, escalate to founder via HITL Tier C or D-MAX per `governance/HITL.md`. The boundary is not negotiable by any agent.

## 6. Stakeholders

**Founder:** Doan Chien Thang (`founder-profile.md` has the operational profile)
**Locale primary:** vi-VN
**Time zone:** Asia/Ho_Chi_Minh
**Cofounder:** future role placeholder; 3 stub docs (operating-cadence, decision-rights-narrative, design-system) graduate when cofounder formally joins.

**Customer stakeholders** (in order of revenue weight pre-PMF):
1. **Learners** — primary. The 6 personas per `product.md` (students, self-learners, engineers, researchers, educators, professionals).
2. **Educators** — secondary; activates year 2.
3. **Enterprises** — tertiary; deferred until educator B2B proves.

**Workforce stakeholders:**
- AI roles per `governance/ROLES.md` — gps, growth-orchestrator, support-agent, content-drafter, code-reviewer, etl-runner, trust-safety, backoffice-clerk + workforce personas (CEO, CTO, CGO, CPO Phase 1).

**External stakeholders:**
- **Regulators:** EU AI Act (in effect Aug 2026), California SB 1001, Vietnam PDPA, GDPR. We follow EU as the higher bar globally.
- **Partners (future):** Anthropic (model provider), Supabase (infra), Vercel (deployment).
- **Press / community:** no relationship to manage pre-PMF; activates post-Series A.

## 7. Success Metrics

**Pre-PMF (current stage, 0 → 100 paying):**
- **The metric of the year:** 100 paying customers who LOVE Ritsu in 30 days, then 1000 in 90 days (per `north-star.md`).
- **Definition of done:** paying = ≥1 successful subscription charge AND ≥7-day retention. Who-love = NPS ≥ 40 AND ≥1 unprompted positive mention.
- **PG gate:** SOP-PRODUCT-002 (N=10 strangers observed using product) — no major feature build proceeds without this.
- **Lead indicators (not substitutes for north star):** time-to-first-aha (signup → first quiz < 30s); free-to-paid conversion at first-paid-tier-trigger; week-4 retention.

**PMF-scaling (post 100 paying):**
- 1000 paying retained 30d; NPS ≥ 40; week-4 retention ≥ 25%.
- Cost-bucket actuals within 20% of estimates (per Bài #7 economic architecture).
- 3+ unprompted-press mentions / month.

**Long-term (1B company target):**
- ARR $1B = ~16M paid users at $5 ARPU OR ~500K at $200 ARPU. Path: B2C wedge → educator B2B → API platform.
- 0 catastrophic safety incidents in 5 years.
- Founder team < 50 humans + 1000+ AI workers at $1B ARR (the leverage equation per `ai-native-philosophy.md`).

**When this changes:** on stage transition (GTM → PMF-scaling → distribution → growth). Update via PR; this section is the canonical reference.

---

## Versioning

| Version | Date | Changes |
|---|---|---|
| 1.0 | 2026-05-04 | Initial charter template (boilerplate) |
| 1.1 | 2026-05-21 | AI-synthesized first-draft content from existing repo material (product.md, brand_voice.md, transparency.md, CLAUDE.md, HITL.md, ROLES.md, PLAN.md). Founder reviews at 30-paying milestone. |

---

**Tham khảo:**
- Architecture: Agent OS Playbook (Phase A + A.2)
- Brand voice: `00-core/brand_voice.md`
- Founder profile: `00-core/founder-profile.md`
- North star: `00-core/north-star.md`
- ICP: `00-core/icp-summary.md`
