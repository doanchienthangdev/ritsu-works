---
type: concept
slug: fmea
title: Failure Modes and Effects Analysis (FMEA)
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: risk-assessment
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Failure Modes and Effects Analysis (FMEA)

*Category: risk-assessment · Toolkit: Lean Six Sigma*

## What it is
A structured, quantitative risk assessment tool that identifies potential failure modes in a process, estimates their risk using three factors (Severity, Occurrence, Detection), computes a Risk Priority Number (RPN = S × O × D), and directs improvement resources to the highest-risk failure modes first.

**Origin:** Developed by the US military in the 1940s (Military Procedure MIL-P-1629, 1949) for reliability analysis of weapons systems. Adopted by NASA in the 1960s (Apollo program). Introduced into automotive manufacturing by Ford in the 1970s and codified in the AIAG FMEA-4 standard. Became a standard DMAIC Analyze-phase tool in the 1990s.

## Why it works
Not all process failures are equal in their consequences. A failure mode with catastrophic customer impact but very low occurrence may be less urgent than a moderate-impact failure that occurs daily. FMEA quantifies risk in three dimensions — how bad when it fails (Severity), how often it fails (Occurrence), and how easily failures are caught before reaching the customer (Detection) — and combines them into a single RPN score. This turns a subjective 'what's most important' debate into a data-driven, auditable prioritisation.

## When to use
Phase III (Analyze) to prioritise confirmed root causes by risk and direct Improve-phase resources. Also used proactively in DFSS (Design for Six Sigma) on new processes before they are deployed. Updated in Phase V (Control) to document residual risk and required control mechanisms.

## Visual
`table`

## Step-by-step tutorial
1. 1. List all process steps within the SIPOC scope on separate rows of the FMEA table.
2. 2. For each process step, brainstorm all ways the step could fail to meet its intended function — these are the Failure Modes. A single step may have multiple failure modes (e.g., 'Form is completed incorrectly' and 'Form is completed late' are two failure modes of the 'Complete application form' step).
3. 3. For each Failure Mode, identify its Effect: what happens downstream or to the customer when this mode occurs? Rate Severity (S) on a 1–10 scale: 1 = negligible; 5 = moderate customer dissatisfaction; 9/10 = safety or regulatory impact.
4. 4. For each Failure Mode, identify its Cause(s): what process conditions produce this failure mode? Rate Occurrence (O) on a 1–10 scale: 1 = remote (less than 1 in 1 million); 5 = moderate (1 in 400); 10 = very high (more than 1 in 2).
5. 5. List the Current Controls (any detection mechanisms already in place). Rate Detection (D) on a 1–10 scale: 1 = almost certain to be caught before reaching customer; 10 = no control exists, failure will reach customer undetected.
6. 6. Calculate RPN = S × O × D for each row. Sort the table by RPN descending.
7. 7. Identify the Action Threshold: typically RPN > 80 and/or any row with S ≥ 9 regardless of RPN. These rows receive Recommended Actions — specific changes to reduce S, O, or D.
8. 8. After the Improve phase, update the FMEA with the revised O and D scores (reflecting new controls) and compute the revised RPN. The FMEA becomes a living document in the Control Plan.

## Real-life example — Motorola (semiconductor manufacturing)
In the 1980s, Motorola used FMEA to analyse its integrated circuit manufacturing process. For the 'solder joint formation' step, the team identified three failure modes: cold solder joint (S=8, O=4, D=3, RPN=96), solder bridge between pads (S=7, O=3, D=2, RPN=42), and insufficient solder (S=6, O=2, D=4, RPN=48). The cold solder joint RPN of 96 exceeded the threshold. Recommended action: implement automated optical inspection (AOI) at the soldering station to improve Detection from 3 to 1, reducing RPN to 32. The AOI investment was justified by the FMEA quantification of risk — making what had been an intuitive decision into an evidence-based one.

**So what:** FMEA turns the subjective 'which failure modes are most dangerous?' question into a structured, quantified, auditable answer. It also documents the recommended actions that flow directly into the Improve phase, creating continuity between Analyze and Improve.

## Template
Complete one row per failure mode. A single process step may have multiple rows. Sort by RPN descending. Address all rows with RPN above threshold or Severity of 9 or 10.

- [ ] Ref #: [sequential number]
- [ ] Process Step: [from SIPOC process column]
- [ ] Potential Failure Mode: [how could this step fail to meet its intended function?]
- [ ] Potential Effect(s): [what happens to the customer or downstream process when this failure occurs?]
- [ ] Severity (S) 1–10: [1=negligible, 5=moderate, 9–10=safety/regulatory]
- [ ] Potential Cause(s): [what process conditions produce this failure mode?]
- [ ] Occurrence (O) 1–10: [1=remote, 5=moderate, 10=very high]
- [ ] Current Controls: [detection mechanisms already in place]
- [ ] Detection (D) 1–10: [1=certain to be caught, 10=no control exists]
- [ ] RPN: [S multiplied by O multiplied by D]
- [ ] Recommended Actions: [specific changes to reduce S, O, or D]
- [ ] Responsible: [who owns this action]
- [ ] Target Date: [when will the action be complete]

## Pitfalls
- Treating all failure modes as equally important regardless of RPN — the entire value of FMEA is the prioritisation. Use the threshold consistently.
- Assigning Detection scores based on what controls should exist rather than what controls actually exist — the FMEA must reflect the current state, not the ideal state.
- Running FMEA only once and not updating it after implementation — FMEA is a living document. Post-implementation, update O and D scores to reflect new controls and recompute RPN.
- Having too large a group building the FMEA — ideal group size is 4–7 people. Larger groups produce endless debate on scoring; smaller groups miss domain knowledge.
