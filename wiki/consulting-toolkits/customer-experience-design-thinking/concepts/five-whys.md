---
type: concept
slug: five-whys
title: Five Whys
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Five Whys

*Category: analysis · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A root-cause analysis technique that iteratively asks 'Why?' five times in response to a stated problem, with each answer becoming the input to the next 'Why?' — progressively stripping away symptoms to reveal the fundamental cause.

**Origin:** Developed by Sakichi Toyoda and implemented within the Toyota Production System in the 1930s; formalized by Taiichi Ohno in his 1988 book 'Toyota Production System.' Adopted into design thinking as a problem-definition tool by IDEO and the Stanford d.school.

## Why it works
The root cause of a customer experience problem is rarely the first explanation that comes to mind — that explanation is typically a proximate cause (a symptom of a deeper issue). Asking 'Why?' five times creates a causal chain that reaches the level at which an intervention will actually prevent the problem from recurring, rather than merely masking it. The number 'five' is a heuristic — the right depth is when the answer is something the team can actually change.

## When to use
Use in the Define phase of Design Thinking to identify the root cause of each major pain point before writing the Problem Statement. Use in retrospectives to prevent recurring operational failures. Do not use alone for systemic problems — combine with Affinity Mapping for synthesis.

## Visual
`tree`

## Step-by-step tutorial
1. 1. State the problem precisely and factually: not 'customers are unhappy' (too vague) but 'the mobile checkout completion rate dropped 18% in the last quarter' (observable, measurable).
2. 2. Ask 'Why does this problem occur?' and write the team's answer in one sentence. This is Why 1.
3. 3. Treat Why 1 as the new problem statement. Ask 'Why does THIS happen?' This is Why 2.
4. 4. Repeat for Why 3, Why 4, Why 5. At each level, challenge the team to go deeper — test each 'Why' answer against the evidence from user research.
5. 5. Stop when you reach an answer that is (a) actionable by the team, (b) not traceable to an even deeper cause that the team can address, or (c) a policy, system, or organizational choice that would require executive action to change.
6. 6. If the chain branches (multiple reasons for the same Why), follow each branch to its root — draw a tree, not just a chain.
7. 7. Convert each root cause into a problem statement for the Define phase. Validate that the Problem Statement addresses the root cause, not a symptom.

## Real-life example — Amazon
Jeff Bezos applied Five Whys when Amazon's fulfillment operations were experiencing a recurring safety incident: 'An associate injured their wrist.' Why? The associate was reaching too far to pick an item. Why? The item was stored on a high shelf. Why? The high shelves were used for heavy-demand items to minimize walking distance. Why? Walking distance optimization was prioritized over ergonomics in the warehouse design. Why? The warehouse design was created by logistics engineers, not in consultation with occupational health specialists. Root cause: the warehouse design process excluded ergonomics expertise. Solution: establish an ergonomics review step in all warehouse redesigns. The fix addressed the root cause, not just the shelf height.

**So what:** Five Whys prevents the most expensive mistake in problem-solving: building the right solution to the wrong problem.

## Template
Start with a precise, observable problem statement. Have the team work through each level together. Require evidence for each cause statement.

- [ ] Problem (observable, measurable): ___
- [ ] Why 1 (first cause): ___ | Evidence: ___
- [ ] Why 2 (deeper cause): ___ | Evidence: ___
- [ ] Why 3 (deeper cause): ___ | Evidence: ___
- [ ] Why 4 (deeper cause): ___ | Evidence: ___
- [ ] Why 5 / Root cause (actionable): ___ | Evidence: ___
- [ ] Is this root cause actionable by the team? Y/N | If N, escalate to: ___
- [ ] Branches identified (if multiple causes at any level): ___
- [ ] Problem Statement derived from root cause: ___

## Pitfalls
- Stopping at Why 2: teams reach the first plausible cause and stop. 'The website is slow' is Why 1. The root cause (under-provisioned CDN due to budget freeze due to unclear business case for performance investment) is 4 levels deeper. Counter: always complete all 5 levels before evaluating where to intervene.
- Answering with blame: 'Because the team made a mistake.' Blame is not a cause. Counter: require each answer to name a process, system, or decision — not a person.
- A single causal chain for a complex problem: complex CX problems have multiple interacting causes. Counter: use a tree diagram and follow all branches simultaneously.
