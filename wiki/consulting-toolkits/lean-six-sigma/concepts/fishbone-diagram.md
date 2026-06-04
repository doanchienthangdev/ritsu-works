---
type: concept
slug: fishbone-diagram
title: Fishbone (Ishikawa) Diagram
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: root-cause-analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Fishbone (Ishikawa) Diagram

*Category: root-cause-analysis · Toolkit: Lean Six Sigma*

## What it is
A structured cause-and-effect diagram that organises all potential root causes of a problem into category branches (the 6Ms: Man, Machine, Method, Material, Measurement, Mother Nature) radiating from a central spine pointed at the problem effect — making the full causal landscape visible simultaneously for a cross-functional team.

**Origin:** Developed by Professor Kaoru Ishikawa of the University of Tokyo in the 1960s and first published in his 1968 'Guide to Quality Control.' Used extensively in Japan's post-war quality revolution (QC Circles). Popularised globally by the quality movement in the 1980s and became a core DMAIC tool in the 1990s.

## Why it works
Root-cause brainstorming without structure tends to produce lists dominated by the most vocal team member's hypotheses and biased toward the most recent incident. The Fishbone's structure forces the team to consider causes across multiple domains simultaneously and systematically. The visual format also reveals which domains are over-represented with hypotheses (suggesting systemic issues in that domain) and which have sparse coverage (suggesting blind spots worth investigating).

## When to use
Phase II (Measure) for initial hypothesis generation. Revisited in Phase III (Analyze) after data validates or refutes each hypothesis. Also useful in Phase V (Control) for rapid investigation of out-of-control signals.

## Visual
`process-flow`

## Step-by-step tutorial
1. 1. Write the problem statement (from the Project Charter, IS format only) in a box on the right side of the whiteboard. Draw a horizontal arrow (the spine) pointing at it from the left.
2. 2. Draw six diagonal bones radiating from the spine — three above and three below — and label them: Man, Machine, Method, Material, Measurement, Mother Nature.
3. 3. Facilitate a structured brainstorm: for each bone category in turn, ask 'What in this domain could cause this problem?' Capture all ideas without judgment.
4. 4. For each cause, ask 'Could this cause have sub-causes?' and add sub-bones. This reveals depth — a cause of 'inadequate training' (Man) may have sub-causes in Method ('training not updated when procedure changed') and Man ('high trainer turnover').
5. 5. Once all six bones are populated, look at the diagram holistically: which bones have the most causes? Which have suspiciously few — potentially indicating a blind spot?
6. 6. As a team, vote on the 3–5 hypotheses that have the strongest evidence or are most plausible. Circle these as priority hypotheses for data validation.
7. 7. For each priority hypothesis, assign a team member to gather data that confirms or refutes it before the next team meeting.
8. 8. After data validation, cross out refuted hypotheses and document the evidence. Retain confirmed hypotheses for the FMEA and root-cause-confirmed list.

## Real-life example — Ford Motor Company
During Ford's quality improvement programs in the 1990s, Fishbone Diagrams were used to investigate orange-peel paint defects on the F-series truck line. The diagram populated the Method bone with 12 hypotheses, the Machine bone with 8, and the Material bone with 4. Statistically, only two hypotheses — both on the Method bone (spray gun pressure inconsistency and operator spray technique variation) — were confirmed by designed experiments. The visual structure of the Fishbone revealed that the team had instinctively over-focused on Materials (supplier defects) while the actual causes were in their own controlled process. This reframing saved 6 months of fruitless supplier audit activity.

**So what:** The Fishbone's cross-category structure prevents teams from fixating on the most emotionally comfortable hypothesis and forces a systematic review of all possible causes before committing investigation resources.

## Template
Complete during a cross-functional workshop of 45–90 minutes. Populate all six bones before prioritising. Record voting results. Document data validation assignments.

- [ ] Effect (Problem Statement): [from Project Charter, IS format]
- [ ] Man (People) causes: [list all hypotheses related to human factors — skills, training, behaviour, staffing]
- [ ] Machine (Equipment/Technology) causes: [list all hypotheses — equipment, tools, systems, technology]
- [ ] Method (Process) causes: [list all hypotheses — procedures, instructions, workflows, policies]
- [ ] Material (Inputs) causes: [list all hypotheses — raw materials, components, data inputs from suppliers]
- [ ] Measurement causes: [list all hypotheses — calibration, definitions, data collection methods]
- [ ] Mother Nature (Environment) causes: [list all hypotheses — physical environment, shift timing]
- [ ] Priority Hypotheses (top 3–5 after voting): [list with vote count]
- [ ] Data validation assignments: [Hypothesis → Who validates → By when → Method]

## Pitfalls
- Producing a diagram with causes on only 2–3 bones — this signals that the brainstorm was not truly cross-functional. A typical process should have causes distributed across at least 4 of the 6 bones.
- Using the Fishbone as the final root-cause output rather than a hypothesis-generation tool — the diagram shows what might be causing the problem, not what is. Hypotheses still require data validation.
- Allowing the most senior person in the room to dominate — silent brainstorming (each person writes individually before sharing) prevents HiPPO (Highest Paid Person's Opinion) bias.
- Conflating symptoms with causes — 'There are too many defects' is a symptom, not a cause. A cause is an action, event, or condition that produces the symptom.
