---
name: thinking-toolkit/tosca-problem-framing
description: |
  Use to frame any ambiguous business or technical problem before
  proposing solutions. Forces structured definition across 5 dimensions:
  Trouble (the situation), Owner (who cares), Success criteria (measurable),
  Constraints (what's fixed), Actors (who's involved). Output is a 1-page
  problem statement that downstream analysis can build on without
  re-defining scope.

  Trigger conditions: /cla problem-framer Phase 1 (mandatory); start of any
  capability proposal; /office-hours startup mode; weekly review when
  surfacing new issues; any "we have a problem with X" framing; debugging
  ambiguous incidents.

  Skip when: problem is already crisp and well-scoped (e.g., "fix typo in
  README"); pure technical bug with clear repro steps; routine operational
  questions ("what's our MRR?").

  Cost: zero LLM (template). Forces ~5-15 min upfront thinking that saves
  hours of downstream re-scoping.
allowed-tools: []
disable-model-invocation: false
---

# TOSCA Problem Framing (Trouble / Owner / Success / Constraints / Actors)

> Before solving a problem, define it. Five dimensions, one page, no ambiguity.

TOSCA is the problem-definition standard at the front of the McKinsey 4S method (State / Structure / Solve / Sell). The premise: most consulting work fails not because the analysis is wrong but because the problem was defined wrong. Force structured definition before any solution thinking.

Ritsu-works adopts TOSCA as the mandatory front-end to `/cla problem-framer` (Phase 1 of capability proposals) and any debug/analysis that doesn't start with a crisp problem.

## Authentic sources

This skill is anchored in two McKinsey-derived textbooks (both in `raw/mckinsey/`):

- **Garrette, Phelps & Sibony, *Cracked it! How to solve big problems and sell solutions like top strategy consultants*** (Palgrave Macmillan, 2018) — **Chapter 4: "State the Problem: The TOSCA Framework"** (pp. 53-67). Co-author Olivier Sibony spent 25 years at McKinsey. The chapter opens with the namesake metaphor: **TOSCA** is also the heroine of Puccini's opera, whose crystal-clear life problem ("How do I get Mario out of jail alive, without yielding to Scarpia?") models what a well-stated problem feels like. Most business problems aren't this neatly defined — but they should be.

- **Conn & McLean, *Bulletproof Problem Solving: The One Skill That Changes Everything*** (Wiley, 2018) — **Chapter 2: "Define the Problem"** (pp. 31-47). McKinsey alumni Charles Conn (Rhodes Trust) and Rob McLean (McKinsey Director Emeritus). Pacific Salmon case shows problem-statement evolution across three cuts (Exhibit 2.3, p. 38) — a master class in iterating from "increase wild Pacific salmon" → "maintain a well-functioning salmon ecosystem at the scale of the North Pacific by preserving carrying capacity." Documents the McKinsey **problem worksheet** (Exhibit 2.2, p. 36): Decision makers / Criteria for success / Key forces on decision makers / Time frame / Boundaries / Accuracy needed.

The two books converge on the same core idea (5-dimension problem-statement worksheet, iterative refinement), differing in vocabulary. This skill uses TOSCA (Cracked it!) because the acronym is mnemonic; the Bulletproof framing is included where it adds specificity.

## Core principle (Cracked it! Ch 4)

> *"There is no 'right' problem definition, although there are many wrong ones."* — Garrette, Phelps, Sibony (Cracked it!, p. 66)

Multiple coherent problem statements can coexist; the goal isn't to find the One True Problem but to formulate one that survives 5 quality checks (see Step 6 below). Crafting a problem statement is iterative and collaborative — "Singing TOSCA as a Choir" (Cracked it! pp. 65-67).

## When to use

**Mandatory:**
- /cla propose Phase 1 (problem-framer skill invokes TOSCA implicitly)
- Start of any capability proposal — write TOSCA before any options thinking
- Any debug session where root cause is unclear
- /office-hours when user says "I have a problem with..."

**Recommended:**
- Weekly review when triaging new issues
- Founder asks "should we build X?" — TOSCA the underlying problem before answering "build X" yes/no
- When two team members have different ideas about the same "problem" (often they're solving different problems)

## When NOT to use

- Problem is already crisp ("fix this specific bug at line 42"); skip to action
- Pure operational lookups ("what's our MRR?", "show me cost report"); TOSCA is for definition, not retrieval
- Trivial decisions (color of button); overhead exceeds benefit

**Anti-pattern: TOSCA-ing every question.** TOSCA is a heavyweight tool. Use for problems that genuinely need scoping discipline (5+ minutes of ambiguity to resolve). For clear questions, skip and act.

## How to apply

Fill the 5 dimensions in order. ~1-2 sentences per dimension. Total length: ~1 page max.

### T — Trouble
**What is currently happening that shouldn't be?** OR **what is not happening that should be?**

State the situation neutrally. Avoid solution language. Avoid blame. Focus on the gap between current and desired state. Per Cracked it! (p. 54): *"The basic definition of 'trouble' is a gap between an observation and an aspiration."*

Three tests for a good Trouble statement (Cracked it! pp. 54-55):

1. **Be specific.** Don't accept "fake problems" — vague gripes you can't possibly solve. *"We must create a results-oriented culture" isn't trouble.* "Twenty percent of customer calls remain unanswered" IS trouble.
2. **Don't let interpretation (or solution ideas) creep into your definition.** "Our product has lost consumer appeal" is an interpretation. "Our product has lost five points of market share over the past year" is the symptom.
3. **Ask "Why now?"** If the gap is generic and eternal ("We would like to increase revenues"), it's unlikely to provide a good basis. The "why now?" question often reveals valuable insights.

**Canonical example (Cracked it! Ch 2 + Ch 4):** The music industry circa 1999 misframed its trouble as "piracy" (interpretation/diagnosis) when the real trouble was "future revenue decline." Defining it as piracy locked in the wrong solution space (litigation + DRM); defining it as revenue decline opened the iTunes/streaming solution space.

Bad: "We need a better customer onboarding flow." (Solution language)
Good: "Free-to-paid conversion drops 60% between signup and first weekly login. Users who don't return within 7 days never convert." (Specific, symptom-not-interpretation, recent change implied by "drops")

### O — Owner
**Who feels the pain when this trouble persists? Who has authority to act?**

Sometimes the pain-bearer and the authority differ. Name both.

Bad: "Everyone cares."
Good: "Pain: prospective paying users who churn silently. Authority: founder + customer-lead. KPI ownership: gtm-orchestrator (signup_to_activation_pct, free_to_paid_conversion)."

### S — Success criteria
**How will we know the trouble has been resolved? Measurable, time-bound.**

Per Cracked it! (pp. 58-60): **don't ask "why?" (5 whys) — it leads to dead ends.** Instead, use the **future-state question**:

> *"We are in the future and this problem-solving effort has been a great success. What is the date, and what do we see?"* (Cracked it!, p. 59)

This generates open-ended discussion about what success actually looks like, rather than restating the trouble. The book illustrates with a music-industry dialogue:
- "What's the date?" → "Three years from now."
- "How do we know we've succeeded?" → "Revenues are growing again. We've restored the growth trajectory."

→ Critical insight: **revenue growth, not piracy reduction, was the success metric.** Asking "why?" would have stayed stuck on piracy.

Each criterion follows: "X happens, measured by Y, target Z, by date D."

Quantification debate (Cracked it!, p. 60): two schools of thought.
- Open targets ("maximize revenues while maintaining ROS") — acknowledges uncertainty.
- Quantified targets — focuses the mind, justifies resources. Picking an aspirational number, *even if arbitrary*, has real benefits — provided you're prepared to revise it.

Bad: "More users convert." (Not measurable)
Good: "Free-to-paid conversion rate from 8% to 15%, measured by metrics.product_dau_snapshot.free_to_paid_conversion, target 15% rolling-30-day, by 2026-08-01." (Specific, measurable, time-bound, prepared to revise)

Multiple criteria are fine (2-4 typical). Each must be falsifiable.

### C — Constraints
**What can we NOT change? What's fixed by external reality?**

Per Cracked it! (pp. 60-61), constraints come in **three types**, all worth listing explicitly:

1. **Constraints on the success criteria** — prior commitments + conflicting objectives (e.g., "revenue growth, but must maintain ROS ≥ 5%"). Success criteria almost never live alone; trade-offs exist.
2. **Constraints on the solution** — resources, capabilities, available paths (e.g., "no in-house digital skills to build streaming service").
3. **Constraints on the problem-solving process** — time, budget, confidentiality limits (e.g., "no panicky 'emergency task force' optics that themselves worsen the problem").

Caveat (Cracked it! p. 61): *"If you identify too many constraints, you may end up defining the problem as 'just making the trouble disappear without changing anything else.' That's usually mission impossible."* Revisit constraints periodically; relaxing some is often the unlock.

Bad: "Resource constraints." (Unfalsifiable)
Good:
- **On success criteria**: "Cannot sacrifice activation rate to grow signups (locked by SOP-CUSTOMER-002 aha-moment KPI)."
- **On solution**: "Cannot raise prices (locked by GTM pillar pricing-philosophy until SOP-PRODUCT-010 pull-test)." | "Cannot add team member (1-person company until cofounder formal join, target Q3)."
- **On process**: "Cannot touch Product Supabase (HITL D-MAX boundary)." | "Cannot increase founder time (already at 50h/week cap)."

### A — Actors
**Who's involved in the problem and solution? Customers, internal roles, external parties?**

List by role/persona, not individual:

Bad: "Marketing team."
Good:
- "Users: prospective paying customers (signed up free, haven't converted)"
- "Internal: customer-lead (owns customer journey), gtm-orchestrator (owns conversion funnel), product-orchestrator (owns wedge + activation events)"
- "External: Stripe (payment), email provider (transactional)"
- "Tools: ops.attention_log, metrics.product_dau_snapshot, customer-success runbooks"

### Step 6 — Write the Core Question + run 5-check (Cracked it! pp. 62-64)

After filling T-O-S-C-A, you have enough material to write the **Core Question** — the single question your problem-solving effort will answer. Critical rules (Cracked it! p. 62):

- **Must be a question, not a statement.** "We must stop piracy" isn't a problem statement; it's a solution-disguised-as-mandate.
- **Choose question scope deliberately.** Open ("How can we restore growth?") vs closed ("Should we acquire Company X?"). Harder problems usually benefit from broader scope.

**The 5-check** (apply to your Core Question — Cracked it! p. 63):
1. Does the question address the **trouble**?
2. Is the question phrased from the **owner**'s perspective?
3. Would answering it meet the **success criteria**?
4. Does the question recognize the **constraints**?
5. Does the question consider relevant **actors**?

A Core Question that passes all 5 looks like (Cracked it! example, p. 63):
> *"In a context where young consumers are increasingly downloading pirated music files, and knowing that enablers of that behavior—broadband access and digital playback devices—are bound to become more accessible, what actions can we take that would result in restoring an X-percent revenue growth rate, with a minimum return on sales of Y percent, in three years' time?"*

Note how all five TOSCA dimensions are explicit in the question.

## Output format

Write the 5 sections as headers in a markdown doc, ending with the Core Question. Total ~1 page.

```markdown
# Problem: <one-line summary>

**TOSCA framing — produced 2026-XX-XX by <role>**

## Trouble
<1-2 sentences neutral statement of current vs desired state>

## Owner
<pain-bearer> | <authority to act> | <KPI owner>

## Success criteria
- [ ] <criterion 1: X happens, measured by Y, target Z, by D>
- [ ] <criterion 2: ...>

## Constraints
- <constraint 1>
- <constraint 2>
- <constraint 3>

## Actors
- **Users:** <list>
- **Internal:** <roles>
- **External:** <parties>
- **Tools/data:** <list>

---

## Next: <handoff — typically gap-analysis or options-generator>
```

## Worked examples

### Example 1 — GOOD (capability proposal trigger)

```markdown
# Problem: Agents lack output discipline

**TOSCA framing — produced 2026-05-28 by @cpo internal review**

## Trouble
C-suite persona outputs (@ceo/@cto/@cgo/@cpo) vary in structure. Some lead with conclusion, some bury it. Founder spends ~30-60s per output finding "what should I do?". Decompositions overlap or miss cases. Output quality compounds across thousands of invocations.

## Owner
Pain: founder (reads all C-suite outputs daily). Authority: aiops-orchestrator (skill library + persona refs). KPI: no current KPI — propose `persona.output.actionability_score` as new metric in v1.1.

## Success criteria
- [ ] 100% of C-suite persona output starts with top-line conclusion (measured by parser regex on `.claude/agents/*.md` output contract section, target 2026-06-01)
- [ ] Founder reading time per persona output drops 30%+ (measured by self-report after 14 days of usage)

## Constraints
- Cannot add LLM cost per invocation (skills must be guidance documents, not LLM-calling skills)
- Cannot restructure existing persona files heavily (must be 1-line non-invasive reference)
- Cannot touch HITL boundaries (skills are Tier A; no escalation)

## Actors
- **Users:** founder (primary reader), other personas (when they read each other's output)
- **Internal:** @ceo, @cto, @cgo, @cpo (apply skill), aiops-orchestrator (catalog), skill-library maintainer
- **External:** Barbara Minto's *Pyramid Principle* (reference framework)
- **Tools/data:** `06-ai-ops/skills/thinking-toolkit/`, `.claude/agents/`, docs-engine

---

## Next: gap-analysis (Phase 3 of /cla propose thinking-toolkit)
```

**Why this is good:** Each section answers its dimension specifically. No solutioning. Measurable criteria. Real constraints with rationale. Specific actors not "stakeholders".

### Example 2 — ANTI-PATTERN (vague problem, fake TOSCA)

```markdown
# Problem: We should improve marketing

## Trouble
Marketing could be better.

## Owner
The whole team.

## Success criteria
- Marketing improves

## Constraints
- Resources

## Actors
- Everyone
```

**Why this is anti-pattern:** Every dimension is generic. "Could be better" is unmeasurable. "Whole team" has no authority. "Resources" is not a real constraint. "Everyone" is not actors. This framing leads to scope-creep solutions because the problem isn't actually defined.

**Fix:** Rewrite Trouble as gap (current X vs desired Y), Owner as specific role+KPI, Success as measurable+time-bound, Constraints as named externalities, Actors as concrete roles.

### Example 3 — EDGE CASE (problem morphs during TOSCA)

Sometimes filling TOSCA reveals the problem is actually a DIFFERENT problem.

Initial framing:
> "Problem: too many support tickets."

After T-O-S-C-A:
- T: Support ticket volume up 40% MoM
- O: Pain = support-agent (overloaded); Authority = customer-lead; KPI = support_ticket_volume_by_category
- S: ?
- C: Cannot hire (1-person co)
- A: Users (creating tickets), support-agent, customer-lead, ...

While filling S, you realize: 90% of new tickets are about ONE feature regression that shipped last week. The real problem isn't "too many tickets" — it's "feature X regression causing ticket spike".

**Reframe:** The original Trouble was a symptom. Drop the original TOSCA, restart with: "Feature X regression caused N% of users to hit error Y; tickets are the symptom."

**Lesson:** TOSCA is iterative. If filling one dimension reveals the problem is something else, restart. Don't force-fit.

## Composition notes

### With `pyramid-principle-output`
TOSCA is INPUT discipline (frame the problem); pyramid is OUTPUT discipline (structure the recommendation). Order: TOSCA first, then analysis, then pyramid-structured recommendation.

### With `gap-analysis` (existing /cla phase 3 skill)
TOSCA Trouble + Constraints feed directly into gap-analysis. The "what's missing to solve this?" question of gap-analysis only makes sense after TOSCA defines what "this" is.

### With `so-what-test`
Run so-what on the Success criteria. Each criterion must survive both so-what passes — otherwise it's "improvement" decoration, not a real goal.

### With `mece-decomposition-check`
Apply to the Actors list. Are actors overlapping (e.g., "founder" and "@ceo" — same entity)? Missing (forgot the user)? MECE check tightens the framing.

## References

Primary (in `raw/mckinsey/`):
- **Garrette, B., Phelps, C., & Sibony, O. (2018). *Cracked it! How to solve big problems and sell solutions like top strategy consultants*.** Palgrave Macmillan. — **Chapter 4: "State the Problem: The TOSCA Framework"** (pp. 53-67). Working source of the TOSCA acronym + 5-check + iterative collaborative framing. Fig 4.1 (p. 64): TOSCA problem statement worksheet.
- **Conn, C., & McLean, R. (2018). *Bulletproof Problem Solving: The One Skill That Changes Everything*.** Wiley. — **Chapter 2: "Define the Problem"** (pp. 31-47). McKinsey problem worksheet (Exhibit 2.2, p. 36). Pacific Salmon problem-statement evolution (Exhibit 2.3, p. 38). "Porpoising" to iterate problem statement (pp. 41-43).

Supporting:
- McKinsey internal training: TOSCA is taught in the first week of consultant onboarding.
- *The McKinsey Way* (Rasiel, 1999) — popular-press treatment.
- Rittel, H.W.J., & Webber, M.M. (1973). Dilemmas in a General Theory of Planning. *Policy Sciences*, 4(2), 155-169 — "wicked problems" exception case (Cracked it! Ch 4 note 1).
- Minto, B. (1987). *The Pyramid Principle* — pyramid-output complement to TOSCA-input.

## Anti-claims

- TOSCA does NOT solve the problem. It defines it. Solutions come from downstream skills.
- TOSCA is NOT a 5-section checklist. Each dimension demands real thinking; bullet-filling defeats the purpose.
- TOSCA is NOT for every question. Crisp questions skip TOSCA entirely.
- TOSCA does NOT replace stakeholder interviews. For high-stakes problems, validate the framing with the actual Owner before proceeding.
