---
type: concept
slug: testing-sheet
title: Testing Sheet
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Testing Sheet

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A structured planning document for each round of usability testing that defines: the hypothesis being tested, the specific tasks users will attempt, the success criteria for each task, and the observation prompts for researchers — ensuring testing is focused, consistent across sessions, and directly connected to the key design assumptions.

**Origin:** Developed as a standard UX research planning tool; formalized by Nielsen Norman Group and IDEO as the mandatory planning artifact for any structured user testing session.

## Why it works
Unplanned user testing produces anecdotal observations that don't support decision-making. The Testing Sheet converts testing from a 'show and observe' session into a hypothesis-testing exercise where specific design decisions are evaluated against defined success criteria — making it possible to reach a clear Go/No-Go decision.

## When to use
Use as the mandatory planning artifact for every round of usability testing in Phase 9. Never begin a user testing session without a completed Testing Sheet.

## Visual
`table`

## Step-by-step tutorial
1. 1. Write the hypothesis: 'We believe [users] will be able to [task] using [prototype] in under [time] because [design rationale].'
2. 2. Write 4–6 tasks in scenario format (realistic context, not instructions): 'You want to cancel your subscription and get a refund for the last 30 days. Please show me what you would do.'
3. 3. Define success criteria for each task: (a) Completed without assistance; (b) Completed with 1 hint; (c) Failed.
4. 4. Set a time limit for each task: typically 3–5 minutes for digital interactions.
5. 5. Brief all observers on the Testing Sheet before the session begins: 'We are testing whether users can complete these tasks. We are not testing the users.'
6. 6. During each session, track task completion in real time on the grid.
7. 7. After all sessions, calculate overall completion rates. The primary metric for the Go/No-Go decision is: overall task completion rate ≥90% with zero Critical severity issues.

## Real-life example — Duolingo
When Duolingo tested a redesigned streak-recovery feature, the Testing Sheet hypothesis was: 'Users who have broken their streak will find and use the streak repair feature within 2 minutes without assistance.' Task: 'You've just missed a day of your language lesson. Please show me what you'd do now.' Success criterion: user finds the streak repair option without any hints in under 2 minutes. Result across 6 users: 2/6 found it unaided (33% completion). Critical issue: the streak repair was labeled 'Streak Freeze' — a term no user understood. The label was changed to 'Repair My Streak' and task completion jumped to 6/6 (100%) in round 2.

**So what:** The Testing Sheet's task completion rate is the only metric that matters — everything else is a proxy.

## Template
Complete the planning section before any user is recruited. Track completion rates during sessions. Calculate aggregate rates after all sessions are complete.

- [ ] Prototype: ___ | Round #: ___ | Facilitator: ___
- [ ] Hypothesis: ___
- [ ] Participant profile: ___
- [ ] Task 1 (scenario): ___ | Success criterion: ___ | Time limit: ___
- [ ] Task 2: ___ | Success criterion: ___ | Time limit: ___
- [ ] Task 3: ___ | [repeat]
- [ ] Task 4: ___ | [repeat]
- [ ] RESULTS GRID (P = participant, 1=completed unaided, 0.5=with hint, 0=failed):
- [ ] Task 1: P1___ P2___ P3___ P4___ P5___ | Completion%: ___
- [ ] Task 2: P1___ P2___ P3___ P4___ P5___ | Completion%: ___
- [ ] Overall completion rate: ___% | Go threshold: ≥90%
- [ ] Critical issues found: ___ | Go/Iterate/No-Go: ___

## Pitfalls
- Tasks written as instructions, not scenarios: 'Click the Cancel button' tells users where to look. Counter: every task must be written as a realistic scenario that does not reference the UI element name.
- Too many tasks: 8+ tasks in a 60-minute session results in rushed, incomplete observations. Counter: limit to 4–6 tasks that cover the most critical user flows.
