---
type: concept
slug: 5-whys
title: 5 Whys (Root Cause Analysis)
source_collection: consulting-toolkits
toolkit: supply-chain-strategy
domain: operations
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# 5 Whys (Root Cause Analysis)

*Category: analysis · Toolkit: Supply Chain Strategy*

## What it is
An iterative interrogation technique that drills down to the fundamental root cause of a problem by asking 'Why?' five or more times, with each answer becoming the basis of the next question. Used in supply chain to trace symptoms (e.g., high stockout rates) back to the root process, system, or organizational cause that must be addressed.

**Origin:** Developed by Sakichi Toyoda (founder of Toyota Industries) in the early 20th century and formalized within the Toyota Production System by Taiichi Ohno (1930s–1950s). Popularized globally through Masaaki Imai's Kaizen (1986) and Lean manufacturing literature.

## Why it works
Organizations are systematically biased toward fixing symptoms rather than root causes. A high stockout rate triggers an order to 'increase safety stock' — a symptom fix that increases inventory cost without addressing the underlying demand-forecast error that caused the stockout. The 5 Whys forces a diagnostic discipline: by repeatedly asking why, analysts traverse from observable symptoms to process failures, to system gaps, to organizational or governance root causes. The frame changes from 'what happened?' to 'why did the system allow it to happen?'

## When to use
Use whenever a supply chain KPI falls below target and the root cause is not immediately obvious. Use in Phase III initiative identification to generate specific, root-cause-targeted initiatives rather than generic improvement programs. Use in Phase V continuous improvement cycles as part of PDCA's Plan stage.

## Visual
`tree`

## Step-by-step tutorial
1. 1. State the problem precisely: write a single, factual problem statement with data (e.g., 'OTIF has fallen from 95% to 70% over the past 3 months' — not 'we have delivery problems').
2. 2. Ask 'Why does this problem exist?' and write the first-level cause. The cause must be factual and verifiable — resist opinion-based causes. If the team disagrees on the cause, it is not yet confirmed. Verify with data.
3. 3. Take the first-level cause and ask 'Why does this cause exist?' Continue this chain, each time verifying the causal claim with evidence before proceeding to the next Why.
4. 4. Continue asking Why until you reach a cause that: (a) is within the organization's control to address, (b) if fixed, would prevent the original problem from recurring, and (c) is a process, system, or structural issue — not a person (the 5 Whys should surface system failures, not blame individuals).
5. 5. Validate the causal chain: read the chain backwards — 'because of [root cause], this causes [Why 4], which causes [Why 3]... which causes the original problem.' If the chain reads logically, the root cause is confirmed. If any link feels weak, investigate further.
6. 6. Identify the countermeasure: for each root cause identified, define the specific corrective action that will permanently remove the root cause. The countermeasure must be systemically different from 'try harder' or 'add more people.'
7. 7. For complex supply chain problems, run multiple 5 Whys chains in parallel: a single problem (e.g., 'forecast accuracy is 68%') often has 3–5 distinct root causes (data gap, process gap, skills gap, governance gap). Each chain identifies a separate initiative.
8. 8. Document and close: record the problem, the causal chain, the root cause, and the countermeasure in a standard A3 format. Track implementation of the countermeasure through the PDCA cycle.

## Real-life example — Boeing
Boeing's supply chain disruptions during the 737 MAX return-to-service (2020–2022) illustrate 5 Whys at scale. A surface-level Why: 'Suppliers cannot deliver components on schedule.' Deeper: 'Because supplier production capacity was mothballed during the pandemic grounding.' Deeper: 'Because Boeing did not provide suppliers with a credible demand forecast during the grounding.' Deeper: 'Because Boeing's demand planning did not model regulatory re-certification timing risk.' Deeper ROOT CAUSE: 'Because Boeing's supply chain risk management process treated regulatory timelines as fixed, not probabilistic — no scenario planning was embedded in the S&OP process.' The countermeasure required was not 'negotiate harder with suppliers' but 'redesign the S&OP process to include regulatory-risk scenarios in demand planning.' Without the 5 Whys chain, the countermeasure would have been tactical (expedite orders) not structural (process redesign).

**So what:** The 5 Whys is most powerful when it moves the countermeasure from 'do more' to 'design differently.' If the root cause is a process or governance gap, the fix is structural — not behavioral.

## Template
Use this template for each significant supply chain problem. Fill in the causal chain and verify each Why with data before proceeding. A single problem may require multiple 5 Whys chains if there are multiple independent root causes.

- [ ] Problem Statement (factual, with data)
- [ ] Why 1 (first-level cause — verified with evidence)
- [ ] Why 2 (cause of Why 1 — verified)
- [ ] Why 3 (cause of Why 2 — verified)
- [ ] Why 4 (cause of Why 3 — verified)
- [ ] Why 5 / Root Cause (cause of Why 4 — the actionable root cause)
- [ ] Causal Chain Validation (does the chain read logically backwards?)
- [ ] Countermeasure (structural change that eliminates root cause)
- [ ] Countermeasure Owner
- [ ] Implementation Timeline
- [ ] Success Metric (how will you know the root cause has been eliminated?)

## Pitfalls
- Stopping at symptoms: the most common error is stopping at Why 2 or Why 3 — where the cause is clear enough to feel satisfying but is still a symptom, not a root cause. Persist until reaching a process, system, or structural cause.
- Accepting un-verified causes: 'We think the cause is X' is not sufficient for a Why in a rigorous 5 Whys chain. Each cause must be verified with data or process observation before the next Why is asked.
- Single-chain thinking for multi-cause problems: most supply chain problems have 3–5 contributing root causes. Running only one 5 Whys chain and acting only on the first root cause found leaves the remaining causes intact — the problem returns through a different pathway.
- Blaming individuals at the root cause: if the 5 Whys chain leads to 'because the planner made an error,' the analysis is incomplete. Ask one more Why: 'Why did the system allow a single person's error to cause this problem?' Root causes are always process or system failures that allowed human error to propagate.
