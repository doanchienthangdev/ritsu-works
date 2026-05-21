---
title: Founder Profile — Doan Chien Thang
type: core-doc
slug: founder-profile
layer: identity
status: canonical
owner: founder
last_reviewed: 2026-05-21
review_cadence: quarterly
cited_by: []
auto_load: false
created_at: 2026-05-04
last_assessed_at: 2026-05-21
ai_synthesized_v0_1: true
ai_synthesized_at: 2026-05-21
ai_synthesized_from: [CLAUDE.md, governance/ROLES.md, governance/HITL.md, runtime/core/context/00-core-redesign.context.md]
ai_synthesis_note: "First-draft content synthesized by Claude Code. Founder should personally edit details (focus blocks, surfaces, etc.) at first quarterly review."
walker_excluded: true
walker_excluded_reason: "PII concern per docs-engine Phase 3 — never enters docs/ MDX corpus"
---

# Founder: Doan Chien Thang

> Founder profile drives Bài #19 founder capacity architecture. Update quarterly via soul-audit. **EXCLUDED from public docs site** (PII).

## Compiled Truth (above ---, mutable)

### Identity

**Founder of:** Ritsu
**Vision:** Build a $1B AI-Native EdTech company that puts an AI tutor in reach of every learner on Earth. 2 cofounders + AI workforce + frontier model leverage. (See `00-core/charter.md` §1 for full vision.)

### Cognitive style

- **Strategic + technical.** Comfortable both with `git rebase --interactive` and "what should our 3-year ARPU curve look like?". Refuses operator-vs-strategist false trade-off.
- **Systems thinking.** Sees workflow before feature. Designed `ritsu-works` as the AI workforce that runs the company, parallel to the product. Pillar architecture (10 evergreen + 1 stage) is a systems-design artifact.
- **Declarative-first.** Prefers YAML / schemas / explicit contracts over imperative scripts. Manifest.yaml, ROLES.md, capability-registry.yaml — all declarative, drift-checked.
- **Wartime mode** (Horowitz). Pre-PMF discipline favors speed over consensus. Will revisit at scale.

### Communication style

- **Direct, terse.** No throat-clearing. No filler. Data > narrative.
- **Vietnamese for team work, English for repo.** Founder writes Vietnamese for cofounder conversations, voice notes, Telegram HITL alerts. English for code, commits, schemas.
- **Asynchronous > synchronous** where possible. Prefers Telegram + Claude Code + Github over realtime calls.
- Prefers AskUserQuestion + RECOMMENDATION + 2-4 sentence rationale over enumeration (memory entry).

### Time zone

Asia/Ho_Chi_Minh (UTC+7).

### Primary surfaces (in order of usage)

1. **Claude Code** (Desktop + CLI) — deep work, all development, /cla orchestration, /wiki ingestion, /docs sync. Primary 06:00-12:00 ICT.
2. **Telegram** — HITL alerts, voice notes, lightweight founder-AI comms. Primary 13:00-22:00 ICT.
3. **Dashboard** (when built) — visibility + drill-down into ops.* metrics. Currently no dashboard; metrics-curator role pending build.
4. **Email** — customer + investor; minimum daily check at 09:00 + 17:00 ICT.
5. **GitHub** — PR review (mobile + desktop). Founder-mode deep PR reads on Sunday review block.

### Focus blocks (daily rhythm)

- **Morning (06:00 – 12:00 ICT):** deep work. Strategy, /cla architecture, /plan-ceo-review, founder writing. NO HITL alerts during 06:00-09:00 (sleep block + first-coffee block); HITL allowed 09:00-12:00.
- **Afternoon (13:00 – 17:00 ICT):** reactive work. Customer support reviews, PR reviews, founder-coach interaction, /wiki distill review queue.
- **Evening (19:00 – 21:00 ICT):** reflection + planning. Friday review (SOP-FOUNDER-013), weekly priorities (SOP-FOUNDER-014), retrospective.
- **Late night (21:00 – 06:00 ICT):** SLEEP BLOCK. No HITL notifications. No customer calls. Emergencies only via pre-registered override.

### Boundaries

- **Do not contact during:**
  - 22:00 – 06:00 ICT (sleep block — no Telegram, no email, no notifications)
  - Sunday morning (founder weekly review private block)
  - Saturday afternoon (recovery; lighter HITL mode)
- **Hard limits:**
  - No customer calls before 09:00 ICT or after 17:00 ICT
  - No HITL Tier C requests requiring same-day approval in evening
  - No Tier D-MAX requests at all on weekends (founder reviews Monday morning)
  - Weekly maximum sustained work: 50 hours (per SOP-FOUNDER-016 energy tracking)
  - Mandatory rest window: 1 full day off per week (typically Sunday afternoon)

### Cognitive load distribution

**What ONLY founder does (high-leverage, non-delegable):**
- Vision + charter + values + brand identity decisions
- Hiring (when starts) — including cofounder identification
- Money in/out (Stripe charges, refunds > $200, vendor pay > $500)
- Customer relationships at first-30-customer scale (per Collison install protocol SOP-CUSTOMER-006)
- Tier D actions per HITL.md (all D-Std + D-MAX)
- Quarterly + monthly + weekly review (SOP-FOUNDER-013, -014, -015)
- Public statements (apologies, incident updates, press)

**What founder DRAFTS, AI executes:**
- Positioning + messaging (founder writes, content-drafter executes per channel)
- Content templates (founder writes 1, content-drafter scales)
- Customer escalation responses (founder drafts, support-agent sends after review)
- New SOP introduction (founder writes intent, aiops-engineer scaffolds)
- Capability proposals (founder describes via /cla propose, then 8-phase workflow)

**What AI DRAFTS, founder reviews:**
- Daily campaigns (growth-orchestrator drafts, founder reviews Tier C)
- Support replies for non-FAQ categories (support-agent drafts, founder reviews Tier C)
- Blog posts (content-drafter drafts, founder reviews + publishes Tier C)
- Pricing experiment results + recommendations (experiment-analyst drafts, founder decides)
- Refund recommendations $50-$200 (backoffice-clerk drafts, founder approves Tier C)

**What AI handles AUTONOMOUSLY (Tier A):**
- FAQ-categorized support replies (support-agent)
- ETL jobs (etl-runner)
- Cron-scheduled SOPs (scheduled-run-dispatcher)
- KPI snapshot collection (metrics-curator)
- /wiki ingestion + distill + audit (read-only operations)
- /docs sync + check (read-only)
- Code review on PRs (code-reviewer; founder still merges)
- Audit logging across all ops.* tables
- Cost attribution tracking + budget alerts

---

## Timeline (append-only)

- 2026-05-04 — Profile created from agent-os-boilerplate template (founder solo build)
- 2026-05-21 — AI-synthesized first-draft content from CLAUDE.md + ROLES.md + HITL.md. Sprint 1 of capability `core-redesign-and-command`. Founder reviews at next quarterly soul-audit (2026-08-21 target).

<!-- Future events:
- 2026-XX-XX — Cofounder formal join → trigger graduation of operating-cadence.md + decision-rights-narrative.md from stub to canonical
- 2026-XX-XX — First 30 paying customers → trigger revisit of values.md + principles.md + ai-native-philosophy.md
- 2026-XX-XX — Quarterly soul-audit refines boundaries based on observed energy + retention data
-->

---

**Tham khảo:**
- Bài #19 Founder Capacity & Interface Architecture
- founder-rhythm.yaml (Tier 1 for daily/weekly rhythms)
- Bài #6 Identity & Interface (sub-domain B = founder workspace)
- GBrain heritage: USER.md / HEARTBEAT.md soul-audit pattern
- governance/HITL.md (founder authority + tier definitions)
- governance/ROLES.md (workforce structure + cognitive load delegation)
