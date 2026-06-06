# SOP-PRODUCT-002 — Stranger Recruit and Watch (N=10 gate)

> **Status:** Spec **re-pointed 2026-06-06** to the locked wedge (`/think mckinsey ritsu-segment-persona-journey-v1`). `flow.yaml` runtime still pre-implementation (Phase 5).
> **Pillar:** product · `01-wedge-discovery` sub-pillar · **Owner role:** product-orchestrator · **HITL tier:** C

> **The point of this SOP, in one line:** recruit **N=10 deadline-bearing committed STEM/ML masterers** and observe them on the product to settle the wedge's single load-bearing bet — **do they pay at the first hard limit?**

## Trigger

**Manual gate**, founder-initiated, when the wedge is locked and the <60s happy-path is stable enough to put in front of a stranger. This is **Phase A** of the first-100 effort and it **gates** scaling the four distribution engines: per `north-star.md` the gate is *non-blocking* on acquisition (it informs + fixes), but a clear FAIL re-opens the wedge.

## Inputs

- **The recruiting profile** (from `01-marketing/icp/persona-portrait.md`): the **deadline-bearing committed STEM/ML masterer** — a learner *currently inside* a hard, graded, multi-week ML/STEM course with a **dated** graded deadline (cs231n, MIT 6.S191, Andrew Ng, fast.ai, a bootcamp cohort, or grad qualifying exams). Explicitly **NOT** a one-shot exam-crammer, a casual browser, or a reference-looker (the anti-profile — persona §S8 audience-exclusion).
- **Where to recruit (no ad budget):** r/learnmachinelearning, r/MachineLearning, fast.ai forums, course Discords/Slacks, #studytwt — hand-picked *by name* (Collison-install style, `SOP-CUSTOMER-006`), each with a live deadline in the next ~2–4 weeks.
- **N = 10** observed US-led strangers (not founder/friends).
- **★ Co-beachhead option (per `00-core/icp-summary.md` §4b):** run this as a **parallel N=10 — a med/pre-med cohort beside the ML/AI cohort** (recruit from r/medicalschool, r/premed, r/Mcat, Med School Insiders, Student Doctor Network). The segment is defined by the *job* (master dense graded material before a high-stakes deadline), not the subject; **medicine/pre-med is a co-equal beachhead candidate** with the *highest proven* study-tool WTP (UWorld / Anki / Sketchy $300–500), which directly **de-risks R1**. Let the *pay-at-first-limit* read across both cohorts pick the launch beachhead, rather than assuming ML/AI. Med's harder bar: zero-tolerance accuracy (a wrong board-exam fact is catastrophic) — it also stress-tests the #1 accuracy moat.
- **Instrumentation:** `supabase-analytics` Door-2; the two observable-today leading metrics must be live — first-quiz-aha completion + week-1 re-upload.

## Outputs

- **Activation read** — of the N=10, what % reach the <60s magic moment on *their own dense material*. Target ≥40% (`north-star.md`).
- **★ The central read — pay-at-first-limit:** when a watched stranger hits the first hard credit/page limit *mid-course with the deadline live*, **do they pay $29 (Plus), or fall back to free NotebookLM/ChatGPT?** This is the wedge's unproven bet (R1) — the single most important thing this SOP exists to observe.
- **Love read** — Sean-Ellis "very disappointed" ≥40% + the qualitative "first method that made me feel capable" signal.
- **Decision** — KEEP (converts → arm the four engines on it) · SHARPEN (a sub-segment converts; narrow) · KILL (no durable pay-at-limit conversion → re-open the wedge per the study's disconfirmation).

## What to watch (the journey's moments of truth — `01-marketing/icp/customer-journey.md`)

1. **The <60s aha on dense math** — does generation quality hold on LaTeX-heavy ML material? (a hallucinated quiz kills trust for this rigor-respecting persona; it is also the #1 anti-NotebookLM moat).
2. **The money-moment** — the pay-at-first-limit decision (the bet).
3. **The flywheel** — does anyone create an *organic* share-link? (today: 15 shares, **all founder**, 0 stranger-referral). Hand-seeding one live cohort can ignite it.

## Status

**Spec re-pointed; `flow.yaml` runtime not yet implemented.** To operationalize: (1) fill `flow.yaml` with real steps (recruit → onboard-and-watch → read → decide) + validate via `06-ai-ops/sop-engine/SOP-AIOPS-003-sop-runtime-contract/validator/validate.sh`; (2) wire the limit-hit event for the pay-at-first-limit read; (3) write `tests/` for the smoke path.

## References

- **Wedge + persona + journey:** `01-marketing/icp/` (from `/think mckinsey ritsu-segment-persona-journey-v1`).
- ICP one-liner + the 2 risks (R1 WTP / R2 NotebookLM): `00-core/icp-summary.md` §0 / §4 / §8.
- North-star (the gate, activation ≥40%, the love signal): `00-core/north-star.md`.
- Collison install protocol (hand-onboard): `SOP-CUSTOMER-006`. SOP runtime contract: `SOP-AIOPS-003`. HITL: `governance/HITL.md`.
