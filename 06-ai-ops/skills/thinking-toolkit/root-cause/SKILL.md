---
name: thinking-toolkit/root-cause
description: |
  Use to trace a CONFIRMED symptom to its fundamental cause via iterative
  "why?" (Five Whys) and, when causes branch, a fishbone/Ishikawa map. Stop
  at a cause you can actually act on to prevent recurrence. This is for
  causal tracing of something that already broke — a metric drop, an
  incident, a bug — NOT for problem framing.

  Trigger conditions: a metric moved the wrong way and you need to know why;
  an incident / regression / support spike; a bug with an observed
  reproduction; any confirmed "X is happening and it shouldn't be."

  Skip when (IMPORTANT): you are defining the problem or success criteria —
  use tosca-problem-framing instead (Cracked it! p.58 explicitly rejects
  "why?" for framing). The symptom isn't confirmed yet (you're guessing —
  hypothesize first). You need to decompose a target metric forward into
  drivers (use driver-tree-decomposition).

  Cost: zero LLM (guidance document). Prevents treating symptoms — the
  expensive failure of fixing the same thing repeatedly.
allowed-tools: []
disable-model-invocation: false
---

# Root-Cause Analysis (Five Whys, scoped to confirmed symptoms)

> Trace a confirmed symptom backward to a cause you can actually fix, so it doesn't recur. (For "what problem are we solving?" — use TOSCA, not this.)

When something has demonstrably broken, the instinct is to fix the visible symptom. Root-cause analysis pushes past proximate symptoms to the fundamental cause — the one that, if fixed, stops the problem recurring. The classic technique is the **Five Whys** (Toyota), extended to a **fishbone (Ishikawa) diagram** when a symptom has multiple contributing causes.

## ⚠️ Scope boundary (read this first)

This skill is deliberately **narrow**. It is ONLY for causal tracing of a **confirmed, observed symptom**. It is **NOT** for problem framing or success-criteria definition — and the two source books disagree by design:

- **Cracked it!** (Garrette, Phelps & Sibony, p.58) **rejects "why?" for framing**: *"asking why isn't always specific enough"* — it leads to dead ends. For "what problem are we solving and what does success look like," use the **future-state question** inside `tosca-problem-framing`, NOT this skill.
- **Bulletproof Problem Solving** (Conn & McLean, Ch 5) **endorses Five Whys for root-cause** of a known symptom.

`thinking-toolkit` v1.0 sided with Cracked it! and excluded Five Whys *from framing*. This skill (v1.2) adds back ONLY the Bulletproof use — **causal tracing of a confirmed symptom** — and explicitly defers framing to TOSCA. If you find yourself asking "why do we want X?" you are framing → stop, use TOSCA.

## Authentic sources

- **Conn & McLean, *Bulletproof Problem Solving*** (Wiley, 2018) — **Chapter 5: "Conduct Analyses"** (pp. 141-164). *"The technique of asking 5 Whys to get to the bottom of a problem was developed at the Toyota Motor Corporation."* And: *"Root cause and 5-Whys analytics can help you push through proximate drivers to fundamental causes in a variety of problems, and not just limited to production and operations environments."* The chapter shows it applies to business (market-share loss) and social problems (homelessness — tracing to domestic violence, mental health, addiction, or financial distress), often visualized as a **fishbone (Ishikawa) diagram**.

- **Garrette, Phelps & Sibony, *Cracked it!*** (Palgrave Macmillan, 2018) — **Chapter 4** (p. 58). The explicit caveat that "why?" is the wrong tool for *framing* success criteria. Cited here as the scope boundary, not as endorsement.

## When to use

- A metric moved the wrong way and the cause is unknown ("free→paid conversion dropped 12% this week — why?")
- An incident / regression / support-ticket spike (for code incidents, pair with a structured debugging method — RAPID-style: reproduce → analyze → pinpoint → implement → document)
- A bug with an observed, reproducible symptom
- Any confirmed "X is happening that shouldn't be" where you need the fundamental cause before fixing

## When NOT to use

- **Problem framing / success criteria** → `tosca-problem-framing` (future-state question). This is the #1 misuse — see the scope boundary above.
- **Forward metric decomposition** → `driver-tree-decomposition`. Driver-tree builds a metric out of its components (forward, structural, "where could we intervene?"); root-cause traces a symptom backward to one fundamental cause ("what broke?"). Different direction, different job.
- **Symptom not confirmed** → you're guessing. Form a hypothesis (`hypothesis-driven`) and confirm the symptom is real first.
- **Generative / creative problems** → `design-thinking`. Asking "why" doesn't help when there's no broken thing, only an unmet need.

**Anti-pattern: stopping at the convenient cause.** Confirmation bias makes you stop "why-ing" the moment you reach a cause you already wanted to blame. The test (Step 5) is whether fixing it actually prevents recurrence — not whether it's a satisfying answer. Pair with `debias`.

## How to apply

### Step 1 — State the symptom precisely + confirm it's real
"Free→paid conversion dropped from 8.0% to 7.0% in the 7 days ending YYYY-MM-DD (confirmed in metrics.product_dau_snapshot)." Not a question, not a guess — an observed fact.

### Step 2 — Ask "why?", answer with an EVIDENCED cause
Each answer must be supported, not assumed. "Why did conversion drop? → Because trial-start rate fell" (verified in the funnel), not "→ probably the price."

### Step 3 — Repeat (~5 times is a guideline, not a rule)
Keep asking why of each answer until you reach a cause you can act on. Five is the folklore number; the real stopping condition is Step 5.

### Step 4 — Branch when causes are multiple (fishbone)
Real symptoms often have several contributing causes. Don't force a single chain — draw an Ishikawa fishbone with branches (e.g., "people / process / product / external"). The Bulletproof homelessness example: one symptom, four root branches.

### Step 5 — Validate: would fixing it prevent recurrence?
The true root cause is the deepest one you can act on such that fixing it stops the symptom returning. If fixing your candidate wouldn't prevent recurrence, you haven't reached the root — keep going.

### Step 6 — Hand off
The root cause becomes the thing you fix (or a hypothesis to test via `hypothesis-driven`, or a metric to decompose via `driver-tree`).

## Worked examples

### Example 1 — GOOD (confirmed metric drop)
**Symptom:** "Free→paid conversion dropped 8.0%→7.0% in the last 7 days (confirmed)."
1. Why? → trial-start rate fell (verified).
2. Why? → fewer users reached the first-quiz "aha" moment.
3. Why? → upload→first-quiz time rose from 30s to ~90s.
4. Why? → a PDF-parsing change shipped 8 days ago slowed large-file ingestion.
5. Why? → the change removed a fast-path for <40-page files.
**Root cause:** the removed fast-path. **Validate:** restoring it would return ingestion to 30s → prevents recurrence. ✓
**Why good:** each step evidenced; reached an actionable cause; validated against recurrence.

### Example 2 — ANTI-PATTERN (why-chain for framing)
Someone runs: "Why do we want more paying users? → revenue. Why revenue? → survival. Why survival? → ..." This is **framing, not root-cause** — and it dead-ends exactly as Cracked it! p.58 warns. **Fix:** this is a TOSCA job. Use the future-state question ("it's 6 months out and we succeeded — what do we see?"), not "why?".

### Example 3 — EDGE CASE (multi-cause → fishbone)
**Symptom:** "Support ticket volume up 40% MoM."
A single why-chain forces a false single cause. Instead, fishbone: **product** (a regression), **process** (a docs gap), **people** (one power-user cohort), **external** (a competitor migration driving imports). Three of four branches contribute. **Lesson:** when the symptom is broad, branch — don't force one chain.

## Composition notes

- **With `tosca-problem-framing`:** strictly upstream and separate. TOSCA frames "what problem / what success"; root-cause traces "why did this confirmed thing break." Never substitute one for the other.
- **With `driver-tree-decomposition`:** complementary opposites. Driver-tree = forward decomposition of a metric; root-cause = backward tracing of a symptom. Use root-cause to find the broken branch, driver-tree to understand the metric's structure.
- **With `hypothesis-driven`:** when the "why" answer is uncertain, treat it as a hypothesis and run its killing analysis.
- **With structured debugging (RAPID-style):** for code incidents, a systematic debugging method (reproduce → analyze → pinpoint → implement → document) is the implementation; this skill is the thinking discipline behind its "fix the root cause, not the symptom" stance.
- **With `debias`:** guards Step 5 against stopping at the convenient cause.

## References

Primary (in `raw/mckinsey/`):
- **Conn, C., & McLean, R. (2018). *Bulletproof Problem Solving*.** Wiley. — **Chapter 5** (pp. 141-164). Five Whys (Toyota), fishbone/Ishikawa, "proximate drivers → fundamental causes."
- **Garrette, B., Phelps, C., & Sibony, O. (2018). *Cracked it!*** Palgrave Macmillan. — **Chapter 4** (p. 58). The framing caveat (cited as scope boundary).

Supporting:
- Ohno, T. *Toyota Production System* (1988) — origin of the Five Whys.
- Ishikawa, K. *Guide to Quality Control* (1968) — the fishbone diagram.
- Distilled wiki concept: `wiki/bulletproof-problem-solving/concepts/root-cause-analysis-five-whys.md`.

## Anti-claims

- "Five" is folklore, not a rule. Stop when fixing the cause would prevent recurrence — could be 3 whys, could be 7.
- This is NOT for problem framing. Asking "why?" to define a goal dead-ends (Cracked it! p.58) → use TOSCA.
- A root cause you cannot act on is not yet the root cause — keep tracing, or branch.
- This is NOT forward metric decomposition (that's driver-tree). Symptom-backward, not metric-forward.
