---
type: concept
slug: five-whys
title: Five Whys
source_collection: consulting-toolkits
toolkit: management-consulting
domain: consulting
category: diagnosis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Five Whys

*Category: diagnosis · Toolkit: Management Consulting*

## What it is
An iterative root-cause technique: ask 'why?' repeatedly (about five times) until the underlying cause surfaces.

**Origin:** Sakichi Toyoda; embedded in the Toyota Production System (mid-20th century).

## Why it works
The first explanation is usually a symptom. Each 'why' peels back a causal layer until you reach a root cause that, if fixed, prevents recurrence.

## When to use
For a single-thread root-cause when the problem is well-defined.

## Visual
`process-flow`

## Step-by-step tutorial
1. State the problem clearly and factually.
2. Ask 'why did this happen?' and record the answer.
3. Ask 'why?' of that answer; repeat ~5 times.
4. Stop when you reach a cause that is actionable and whose fix prevents recurrence.
5. Verify the causal chain with evidence, then design the countermeasure at the root.

## Real-life example — Toyota
Toyota's canonical example: a machine stopped → fuse blew → bearing not lubricated → pump not pumping enough → pump shaft worn → no strainer, so metal got in. The real fix was adding a strainer, not replacing the fuse.

**So what:** Fixing the root cause (the strainer) prevents recurrence; fixing the symptom (the fuse) does not.

## Template
Chain the whys; verify each link.

- [ ] Problem
- [ ] Why 1
- [ ] Why 2
- [ ] Why 3
- [ ] Why 4
- [ ] Why 5 / root cause
- [ ] Countermeasure

## Pitfalls
- Stopping at a symptom — counter: ask whether fixing it prevents recurrence.
- Single-cause bias — counter: pair with a fishbone when causes are multiple.
