---
type: concept
slug: five-whys
title: Five Whys
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: root-cause-analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Five Whys

*Category: root-cause-analysis · Toolkit: Lean Six Sigma*

## What it is
An iterative interrogation technique that traces a problem symptom to its systemic root cause by asking 'Why did this happen?' repeatedly — typically 5 or more times — until the team reaches a cause that the organisation can control and that, if fixed, will prevent recurrence.

**Origin:** Developed by Sakichi Toyoda and formalised as a problem-solving technique within the Toyota Production System by Taiichi Ohno in the 1950s. Published in Toyota's internal training materials in the 1970s and widely disseminated through Ohno's 1978 book 'Toyota Production System: Beyond Large-Scale Production.'

## Why it works
Most organisations stop root-cause analysis at the first plausible cause (the symptom's immediate trigger). This produces solutions that treat symptoms: fix the broken machine (but not the maintenance gap that allowed it to fail). Five Whys forces the team to keep asking until they reach a systemic cause — a gap in process design, management system, or organisational capability. Solutions to systemic causes prevent recurrence; solutions to symptoms produce the same incident within months.

## When to use
Phase III (Analyze) for validating root-cause hypotheses generated in the Fishbone brainstorm. Also used in Phase V (Control) when an out-of-control signal appears on an SPC chart.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Write the problem statement precisely using the IS/IS-NOT format from the Project Charter. An imprecise problem statement produces an imprecise causal chain.
2. 2. Ask 'Why does this problem occur?' and record the most direct, factually supported cause. Avoid vague answers like 'human error' — probe for the specific mechanism: Why did the human err?
3. 3. Take the answer from step 2 and ask 'Why does THAT occur?' Record the next level of cause.
4. 4. Continue asking 'Why?' at each answer. Do not stop at 3 Whys. Stop only when: (a) the cause is outside the organisation's control, or (b) the cause is a management system or policy gap that the organisation owns and can change.
5. 5. Apply the Control test: 'Does our organisation have the authority and ability to eliminate this cause permanently?' If yes, it is a candidate root cause. If no, continue asking why.
6. 6. For complex problems, run multiple parallel Five Whys chains — one for each branch of the Fishbone Diagram. The chains may converge at a common root cause, which confirms its systemic nature.
7. 7. Validate the root cause chain by reading it forward: 'Because [root cause] exists, [cause 4] occurs, which causes [cause 3]..., which results in [the problem].' If the chain reads logically, the root cause is plausible.
8. 8. Document the full chain in the project file. The chain is the audit trail for why the chosen solution addresses the confirmed root cause.

## Real-life example — Toyota Motor Corporation
Taiichi Ohno documented the following classic example: a welding robot stopped during a shift. Why? Overloaded and a fuse blew. Why overloaded? The bearings were not adequately lubricated. Why not? The oil pump was not drawing up sufficient oil. Why? The oil pump intake was clogged with metal shavings. Why? There was no strainer on the oil pump intake. Root cause: the absence of a strainer — a design omission, not an operator failure. The fix: install a strainer. If the team had stopped at 'the fuse blew' and replaced the fuse, the robot would have stopped again within weeks.

**So what:** Five Whys exposes the gap between fixing the failure and fixing the system that allowed the failure. Every Why you fail to ask costs you the price of recurrence.

## Template
Complete one Five Whys chain per candidate root cause identified in the Fishbone Diagram. Run multiple chains for complex problems. Validate each chain by reading it forward.

- [ ] Problem Statement: [precise IS/IS-NOT statement]
- [ ] Why 1: [most direct, factually supported immediate cause]
- [ ] Why 2: [cause of Why 1]
- [ ] Why 3: [cause of Why 2]
- [ ] Why 4: [cause of Why 3]
- [ ] Why 5: [root cause — the systemic gap the organisation controls]
- [ ] Control Test: [Does our organisation have authority and ability to eliminate this cause permanently? Yes/No]
- [ ] Forward Validation: [Does the chain read logically forward from root cause to symptom? Yes/No]
- [ ] Proposed Corrective Action: [what systemic change addresses this root cause?]
- [ ] Chain validated by: [Black Belt + process SME sign-off]

## Pitfalls
- Stopping at 'human error' — this is almost never a root cause. Why did the human err? Inadequate training? Poorly designed procedure? These are the real root causes.
- Multiple teams running Five Whys on the same problem and reaching different root causes — this is valuable data. Do not force convergence artificially; investigate which chain is best supported by data.
- Accepting 'we don't have the budget' or 'management won't allow it' as root causes — these are constraints, not causes.
- Using Five Whys alone without data validation — each Why should be tested against data where possible, not just accepted as plausible.
