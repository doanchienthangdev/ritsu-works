---
type: concept
slug: usability-testing
title: Usability Testing
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Usability Testing

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A structured, task-based evaluation method in which representative users attempt to complete predefined tasks using a prototype while the team observes, records, and analyzes where they succeed, struggle, or fail — producing a prioritized list of usability issues for iteration.

**Origin:** Established as a formal discipline by Jakob Nielsen and colleagues at Sun Microsystems (late 1980s); codified in 'Usability Engineering' (Nielsen, 1994); the most widely validated and practiced user research method in UX design.

## Why it works
Experts cannot predict what will confuse real users — the 'curse of knowledge' makes it impossible to see your own design from a novice's perspective. Usability testing removes this bias by observing actual users attempting actual tasks, generating concrete, evidence-based issue lists. Nielsen's research showed that 5 users reveal 85% of usability issues — a remarkably efficient investment.

## When to use
Use at the end of every prototyping round, before making any significant development investment. Use after any major redesign of a user flow. Do not use to validate marketing copy — use A/B testing instead.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Write the Testing Sheet: define 4–6 core tasks the user must attempt (written as realistic scenarios, not instructions: 'You need to find and book a 3-night stay in Barcelona next month' not 'Click the search bar'). Define success criteria for each task (completed without help / completed with 1 hint / failed).
2. 2. Recruit 5–8 participants who match the target persona. Screen with 5–7 qualifying questions. Over-recruit by 20% for no-shows.
3. 3. Set up the testing environment: think-aloud protocol (ask participants to narrate their thoughts as they interact with the prototype), screen recording, and a note-taking template for the observer (what the participant said, did, and struggled with).
4. 4. Run a pilot session first to test the tasks and timing before the full research begins.
5. 5. Open each session: 'There are no right or wrong answers. If you're confused, that tells us where we need to improve the design. Please think aloud — tell us what you're looking for and why.' This reduces social desirability bias.
6. 6. During each task: observe, do not help. Note every point of hesitation (>5 seconds on one element), every error, and every verbatim expression of confusion. Use a task-tracking sheet in real time.
7. 7. After all sessions, compile a severity-rated issue list: Critical (blocks task completion), Major (significant friction, workaround required), Minor (annoyance, resolved independently). Use the frequency × severity formula to prioritize.
8. 8. Run one Heuristic Evaluation session in parallel (3 UX experts, 2 hours) to catch issues that task-based testing misses.
9. 9. Present findings to the team with video clips of the most critical issues — seeing is believing.

## Real-life example — gov.uk (UK Government Digital Service)
The UK Government Digital Service (GDS) applied usability testing to redesign the Universal Credit application process, which was online-only and had a completion rate below 40%. Five usability tests with representative citizens revealed that 4 of 5 could not complete the 'employment history' section without assistance. The critical issue: the date format input was ambiguous (DD/MM/YYYY vs. MM/DD/YYYY was not labelled). A task-completion rate of 0% on this task was the evidence that forced a redesign of the date field, not an executive decision. Post-redesign usability test: 5/5 task completion. The change took 2 days to implement and moved application completion from 38% to 76%.

**So what:** Usability testing converts design opinions into evidence — and evidence wins design debates.

## Template
Complete the Testing Sheet before each round of usability testing. Record task completion rates during sessions. Severity-rate all issues after synthesis.

- [ ] Prototype being tested: ___ | Round #: ___
- [ ] Hypothesis: ___
- [ ] Task 1 (scenario format): ___ | Success criteria: ___ | Time limit: ___
- [ ] Task 2: ___ | Success criteria: ___ | Time limit: ___
- [ ] Task 3: ___ | Success criteria: ___ | Time limit: ___
- [ ] Task 4: ___ | Success criteria: ___ | Time limit: ___
- [ ] Participant 1 completion: Task 1 ___ / Task 2 ___ / Task 3 ___ / Task 4 ___
- [ ] Participant 2: Task 1 ___ / Task 2 ___ / Task 3 ___ / Task 4 ___
- [ ] [Repeat for all participants]
- [ ] Overall task completion rate: ___% (target ≥90%)
- [ ] Critical issues (severity 4–5): ___
- [ ] Major issues (severity 2–3): ___
- [ ] Minor issues (severity 1): ___
- [ ] Go / Iterate / No-Go decision: ___

## Pitfalls
- Helping participants during tasks: observers who step in to help are invalidating the test. Counter: brief all observers strictly: 'Do not speak, point, or react to the participant's actions during tasks. You may ask clarifying questions only in the debrief.'
- Treating all issues equally: a team that tries to fix 40 issues after one round of testing will never ship. Counter: enforce the severity framework — Critical issues are fixed before the next round; Major issues are fixed within 2 iterations; Minor issues are parked.
- Testing with 20 participants: more participants does not reveal more issues — it reveals the same issues with more frequency data. Counter: run 5 users, iterate, then run 5 more. This finds more issues than 10 users at once.
