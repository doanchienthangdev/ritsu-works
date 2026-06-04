---
type: concept
slug: sipoc
title: SIPOC Diagram
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: process-analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# SIPOC Diagram

*Category: process-analysis · Toolkit: Lean Six Sigma*

## What it is
A one-page, five-column process map (Suppliers → Inputs → Process → Outputs → Customers) that gives a cross-functional team a shared, high-level view of a process and establishes unambiguous scope boundaries before detailed analysis begins.

**Origin:** Developed within the Total Quality Management (TQM) movement in the 1980s and formalized as a standard Define-phase tool in Six Sigma curricula by Motorola University and subsequently by GE's Six Sigma training program.

## Why it works
Most process problems are worsened by scope ambiguity — teams try to fix everything or disagree about what 'the process' includes. SIPOC forces agreement on the start and end of the process and the key actors before any data is collected. By working from Outputs and Customers backward, it anchors the map in customer value rather than internal operations.

## When to use
At the very start of Phase I (Define) of every DMAIC project. Also useful when onboarding a new team member to a process or when a process redesign needs clear scope boundaries before analysis begins.

## Visual
`value-chain`

## Step-by-step tutorial
1. 1. Draw five columns on a whiteboard or digital canvas and label them: Suppliers | Inputs | Process | Outputs | Customers.
2. 2. Fill in CUSTOMERS first: who receives the final output of this process? Include both internal and external customers.
3. 3. Fill in OUTPUTS: what does the process deliver to those customers? (product, service, report, decision) Be specific — 'credit decision letter', not 'result'.
4. 4. Fill in PROCESS: identify 5–7 high-level steps that transform inputs into outputs. Label them as verbs (Receive → Validate → Review → Approve → Communicate). Do not go deeper than this level — a SIPOC is not a flowchart.
5. 5. Fill in INPUTS: what raw material, information, or triggering event enters the process at the start? Link each input to the step it feeds.
6. 6. Fill in SUPPLIERS: who or what provides each input? (external vendors, internal departments, customers themselves)
7. 7. Define the SCOPE: write the explicit start trigger and end trigger of the process. Anything outside these boundaries is out of scope. Get the process owner to sign off.
8. 8. Review the SIPOC with the cross-functional team. Resolve any disagreements about scope before moving forward — scope disagreements discovered in Phase III are exponentially more expensive to resolve.

## Real-life example — General Electric (GE Capital)
When GE Capital used SIPOC in its home mortgage origination process, the workshop revealed that the process meant entirely different things to four different departments. The underwriting team's scope started at document receipt; the originations team's scope started at application submission; the legal team's scope started at credit decision. The SIPOC aligned all parties on a single scope — from the applicant submitting the online application to the signed loan commitment letter — within 90 minutes, replacing a months-long scope debate that had stalled a previous improvement attempt.

**So what:** SIPOC's primary value is not the diagram itself but the scope alignment conversation it forces. 90 minutes of structured scope debate at the start prevents months of wasted improvement work on the wrong process boundaries.

## Template
Fill each column from right to left (Customers → Outputs → Process → Inputs → Suppliers). Then define the Scope row. Agree and sign before proceeding to Measure.

- [ ] Customers: [Who receives the output — name roles/entities]
- [ ] Outputs: [What the process delivers — be specific and measurable where possible]
- [ ] Process Step 1: [Verb + Object, e.g., Receive application]
- [ ] Process Step 2: [Verb + Object]
- [ ] Process Step 3: [Verb + Object]
- [ ] Process Step 4: [Verb + Object]
- [ ] Process Step 5: [Verb + Object]
- [ ] Inputs: [What enters the process — forms, data, materials, signals]
- [ ] Suppliers: [Who provides each input]
- [ ] Scope Start: [The specific event or action that triggers the process]
- [ ] Scope End: [The specific output or event that marks process completion]
- [ ] Out of Scope: [Explicitly list what is NOT included]

## Pitfalls
- Going too deep in the Process column — SIPOC is a 5–7 step summary, not a flowchart. Depth belongs in a Value Stream Map created later.
- Filling the columns left-to-right (Suppliers first) — this produces an internally-centred view. Always start from Customers and work backward.
- Treating SIPOC as a document artifact rather than a conversation tool — the value is the scope alignment debate the workshop produces, not the diagram.
- Not getting explicit sign-off on the scope row — without sign-off, scope creep is guaranteed.
