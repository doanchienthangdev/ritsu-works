---
name: thinking-toolkit/problem-triage
description: |
  Use FIRST on any incoming problem to route it to the right problem-solving
  WEIGHT — the full McKinsey 4S engine (/think mckinsey), a federated synthesis
  (/deepask), a single /think atom, or a direct answer. This is the router that
  makes /think mckinsey the PRIMARY solver for consequential problems WITHOUT
  over-applying a heavyweight study to a 10-minute question (the
  "anxious-parade-of-knowledge" anti-pattern). Decision on two axes: CONSEQUENCE
  (stakes × reversibility) × SHAPE (a known/lookup answer vs one that needs
  cross-source synthesis + competing hypotheses you must get right).

  Trigger conditions: `/think triage <problem>`; the FIRST step of
  SOP-AIOPS-012 (consequential-problem-solving); the @ceo/@cgo/@cpo routing
  reflex on any consequential or strategic request.

  Skip when: the problem is already obviously trivial or operational — just
  answer it (triage IS the answer: "route = direct"). Don't triage a triage.
allowed-tools: [Read, Skill]
disable-model-invocation: false
---

# Problem triage — route the problem to the right weight

> The point of a primary problem-solver is not "run the 4S engine on everything." It is **"run the right weight on the right problem."** This skill is the 10-second gate that decides which. It is what lets `/think mckinsey` be the company's primary solver for consequential decisions while NOT becoming expensive theater on routine ones.

> **The McKinsey rule that governs this gate (Bulletproof Ch 5 — heuristics before big guns; *Cracked It!* — knock-out first):** the cost of the analysis must be justified by the cost of being wrong. A study that can't change a decision — or a decision too cheap to study — fails the gate.

## The two axes

1. **CONSEQUENCE = stakes × (ir)reversibility.**
   - *High:* material $ / strategic / shapes-the-company / hard-to-reverse (HITL Tier C–D). Being wrong is expensive.
   - *Low:* operational / routine / cheap-to-undo (HITL Tier A–B). Being wrong is recoverable in minutes.
2. **SHAPE = is the answer KNOWN, or does it need synthesis?**
   - *Known / lookup:* a fact, a number, a definition, a single-source answer.
   - *Needs synthesis:* spans multiple sources, has **competing hypotheses**, the "why is X / what should we do" shape — you have to be *right*, not just informed.

## The route table (CONSEQUENCE × SHAPE → weight)

| | **Known / lookup** | **Needs synthesis (multi-source, competing hypotheses)** |
|---|---|---|
| **Low consequence** | **① Direct answer** — answer it, or 1 tool call (`supabase-ops` for a number · `wiki_ask` for a concept · `gbrain` for an entity). No ceremony. | **② `/deepask`** — federated retrieval + cited synthesis. An answer-shaped multi-source question ("what's true across X"). |
| **High consequence** | **③ A single `/think` atom** — the answer is gettable but needs STRUCTURING: `tosca` (frame) · `driver-tree` (decompose a metric) · `hypothesis` (sequence) · `pre-mortem` / `debias` (stress-test) · `2x2` (synthesize options). One lens, not the loop. | **④ `/think mckinsey` — THE FULL 4S ENGINE.** The primary route for the hardest decisions: consequential + ambiguous + competing hypotheses + you must be right. |

## The gate to route ④ (the full engine) — ALL three must hold

Route to `/think mckinsey` ONLY when **all** of:
1. **Consequential** — the cost of being wrong ≫ the cost of the study (Tier C–D, or strategic/irreversible).
2. **Genuinely ambiguous** — no credible answer yet, OR ≥2 competing answers worth disconfirming.
3. **Multi-source / multi-hypothesis** — one lens won't crack it; it needs the workplan → pull → validate → re-route loop.

**If any one fails → a lighter route.** Running the full engine when these don't all hold is the **anxious-parade-of-knowledge** anti-pattern: McKinsey rigor mis-applied is expensive theater. (A consequential-but-narrow problem → route ③ an atom. A consequential-but-already-answerable problem → ① or a quick verify. A non-consequential synthesis → ② `/deepask`.)

**Accordion within ④:** a consequential-but-smaller problem still routes to mckinsey, but with `--depth=quick` (inline one-day answer, no run folder, no gate) — the discipline without the ceremony.

## How to apply (10 seconds)

1. Read the problem. Score the two axes (CONSEQUENCE high/low · SHAPE known/needs-synthesis).
2. Read the route off the table.
3. If route ④, confirm the 3-part gate holds; if not, drop to the lighter route + say why.
4. **State the route + the one-line reason** (never route silently). Then invoke it.

Output shape:
```
Route: ④ /think mckinsey (--depth=standard)
Why:   consequential (pricing change, Tier C, hard to reverse) + ambiguous
       (no credible answer) + multi-source (needs cohort data + WTP + competitor)
Not ②/③ because: a single deepask/atom can't disconfirm the competing pricing hypotheses.
→ invoking: /think mckinsey "should we move Plus from $29 to $19?"
```

## Worked examples

- *"What's our current free→paid conversion rate?"* → **① Direct** (one `supabase-ops` query). Low consequence, known.
- *"What do our cancel-flow comments say users want?"* → **② /deepask** (synthesis across feedback sources). Multi-source but answer-shaped, not a bet-the-company decision.
- *"Decompose week-4 retention into its upstream drivers so we know where to push."* → **③ atom** `/think driver-tree`. Consequential-ish but needs ONE structuring lens, not the full loop.
- *"Is the US college-STEM wedge the right first-100 ICP, or should we go Vietnam-first?"* → **④ /think mckinsey**. Consequential (shapes GTM) + ambiguous (two live answers) + multi-source (analytics + market + founder intent). The full engine, routed to disconfirm both.
- *"Should we ship the Knowledge-Map share feature next, or reactivation?"* → **④ /think mckinsey --depth=quick** (consequential + ambiguous, but small enough for the accordion).

## Composition + where this sits

- **Front door to `/think mckinsey`** — route ④ hands off to the engine, which runs its OWN State/Structure/Solve/Sell gates (this skill does NOT pick the path inside the engine — `decision_gates` in `knowledge/mckinsey-workflow.yaml` does).
- **First step of `SOP-AIOPS-012`** (consequential-problem-solving) — the SOP wraps: triage → (mckinsey for route ④) → the run-folder is the decision record → pre-wire/dissent before acting.
- **The @ceo/@cgo/@cpo reflex** — personas triage a consequential/strategic request before answering; a Tier-3/4 problem that hits gate ④ gets a real data-grounded study, not a hand-waved reframe.
- **With `/deepask`** — route ② IS /deepask; and inside route ④, the engine's Solve loop may itself call /deepask as one data tool (one-way: mckinsey → deepask, never back).

## Anti-claims

- This is NOT itself a study — it's a 10-second routing decision. If you find yourself analyzing inside the triage, you've already answered "route ④" — go run the engine.
- It does NOT make `/think mckinsey` mandatory. Most problems route to ①/②/③. The whole point is to reserve the big gun for where it pays.
- It does NOT pick the 4S path (hypothesis/issue/design) — that is the engine's own STATE/STRUCTURE decision-gates.

## References

Distilled from *Bulletproof Problem Solving* (Conn & McLean — heuristics-before-big-guns, knock-out-first, the accordion) + *Cracked It!* (Garrette/Phelps/Sibony — match the tool to the problem). Routes to: `thinking-toolkit/mckinsey-workflow` (the engine), `/deepask`, the atomic `/think` skills. Institutionalized by `06-ai-ops/sops/SOP-AIOPS-012-consequential-problem-solving/flow.yaml`.
