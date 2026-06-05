---
type: concept
slug: heuristic-evaluation
title: Heuristic Evaluation
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Heuristic Evaluation

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
An expert-based usability inspection method in which 3–5 trained UX evaluators independently assess a prototype or product interface against 10 established usability heuristics (design principles), identifying and rating violations by severity — complementing user-based testing with fast, low-cost expert analysis.

**Origin:** Developed by Jakob Nielsen and Rolf Molich at Usability Lab (Bellcore, 1990); the 10 heuristics formalized by Nielsen in 1994. Remains the most widely used expert usability evaluation method.

## Why it works
User testing is slow and expensive; heuristic evaluation is fast and cheap. Three evaluators find approximately 70% of usability issues in 2–3 hours. The method works because usability violations tend to fall into predictable categories (poor error messages, inconsistent navigation, missing system status feedback) that expert evaluators can identify without involving real users. Used alongside usability testing, it provides comprehensive coverage: experts catch structural issues; users catch contextual issues.

## When to use
Use before usability testing (to catch structural issues cheaply) and after usability testing (to verify that fixes didn't introduce new violations). Use for any new feature, redesign, or integration of an external component.

## Visual
`table`

## Step-by-step tutorial
1. 1. Recruit 3–5 evaluators who have UX expertise and are not members of the design team for this product (to avoid familiarity bias). 5 evaluators find ~75% of all usability problems.
2. 2. Brief each evaluator on the prototype or product being evaluated, the target user profile, and the 10 Nielsen heuristics (print as a reference card).
3. 3. Each evaluator inspects the interface independently — no discussion between evaluators during the inspection. This is critical: group evaluation produces anchoring bias.
4. 4. Each evaluator records every violation they find, noting: the heuristic violated, the specific location (screen, field, or flow step), and a description of the violation.
5. 5. After all independent evaluations, each evaluator rates each violation on a 0–4 severity scale: 0=not a usability problem; 1=cosmetic only; 2=minor problem (can be worked around); 3=major problem (important to fix); 4=usability catastrophe (imperative to fix before launch).
6. 6. Compile all individual evaluations into a master list. Average severity ratings across evaluators. Issues rated ≥3 by at least 2 evaluators are the priority fix list.
7. 7. Conduct a 1-hour group debrief: evaluators discuss their most important findings; the design team is present to ask clarifying questions but not to defend design decisions.
8. 8. Prioritize the top 10 violations by average severity score. Generate a design fix for each before the next round of usability testing.

## Real-life example — Netflix
Netflix's UX team runs heuristic evaluations on every major redesign before usability testing. In the redesign of the 'Continue Watching' row, heuristic evaluation by 3 external evaluators flagged a severity 4 violation against Heuristic 3 (User Control and Freedom): there was no way to remove a title from the 'Continue Watching' list without watching past the 95% completion point. All 3 evaluators independently flagged this, averaging 3.7/4. This violation was unknown to the design team (who had grown accustomed to it) and was found in 90 minutes for zero incremental cost. Adding the 'Remove from Continue Watching' option reduced user friction complaints about the feature by 60% post-launch.

**So what:** Familiarity is the enemy of usability — evaluators who didn't build the product see what the team can't see.

## Template
Each evaluator completes one grid independently. Combine grids after all evaluations are complete. Average severity ratings for each violation.

- [ ] Evaluator name: ___ | Date: ___ | Product/screen evaluated: ___
- [ ] H1 Visibility of system status: Violation: ___ | Location: ___ | Severity (0-4): ___ | Fix: ___
- [ ] H2 Match with real world: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H3 User control & freedom: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H4 Consistency & standards: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H5 Error prevention: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H6 Recognition vs. recall: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H7 Flexibility & efficiency: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H8 Aesthetic & minimalist: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H9 Error recovery: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] H10 Help & documentation: Violation: ___ | Location: ___ | Severity: ___ | Fix: ___
- [ ] Severity 4 violations (must fix): ___
- [ ] Severity 3 violations (important to fix): ___

## Pitfalls
- Single evaluator: one expert finds only 35% of violations. Three experts are the minimum for useful coverage. Counter: never run a heuristic evaluation with fewer than 3 evaluators — it's too cheap not to.
- Group evaluation: evaluators inspecting together anchor on the first person's findings. Counter: enforce independent evaluation before the group debrief.
- Heuristic evaluation replacing usability testing: experts miss contextual issues that only appear when real users attempt real tasks in their real environment. Counter: always use both methods — heuristic evaluation first (cheap, fast), then usability testing (slower, higher fidelity).
