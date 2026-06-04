---
type: process
slug: lean-six-sigma
title: Lean Six Sigma — Process
source_collection: consulting-toolkits
domain: operations
model_name: DMAIC
---
# Lean Six Sigma: The DMAIC Practitioner Handbook

**A performance improvement methodology that simultaneously eliminates waste and reduces variation — delivering permanent, measurable gains in cost, quality, and speed.**

---

## The Toolkit You Are Really Buying

This handbook gives you the ability to run a rigorous, data-driven Lean Six Sigma project from first-day problem framing through to permanent, auditable results — without guessing at root causes, proposing solutions before the data supports them, or allowing gains to erode six months later. Motorola used this methodology to save over $16 billion in costs and increase customer satisfaction by 15%. GE saved billions across aviation, financial services, and healthcare. The methodology works because it refuses to let you solve a problem you have not yet measured, and refuses to call a project complete until control mechanisms guarantee the improvement holds.

---

## When to Use This Toolkit

Lean Six Sigma is the right tool when:
- A process problem is **persistent and costly** but its root cause remains unclear after conventional troubleshooting.
- **Defect rates, cycle times, or customer complaints** are unacceptably high and not improving on their own.
- You need a **data-backed, auditable improvement case** for senior leadership, a board, or a regulatory body.
- Previous quick-fix initiatives have failed to produce lasting results.
- The process is **repeatable** (it runs enough times to generate statistically meaningful data).

It is less suited to: one-off projects, pure technology implementations with no operational process component, or situations where the root cause is already unambiguously known and requires only execution.

**Ideal sectors:** Manufacturing, healthcare, financial services, logistics, and any shared-services environment with high transaction volume.

---

## The Process at a Glance

| Phase | Goal | Key Question | Deliverable | Exit Gate |
|---|---|---|---|---|
| I. Define | Frame the problem; establish governance | What problem are we solving, for whom, and how will we know we succeeded? | Project Charter | Sponsor approves Charter |
| II. Measure | Establish validated performance baseline | How is the process actually performing right now? | Baseline dashboard + validated dataset | Measurement system validated; baseline confirmed |
| III. Analyze | Confirm true root causes with data | What is actually causing the defects or waste? | Confirmed root-cause list + FMEA table | Controllable root cause(s) confirmed statistically |
| IV. Improve | Design, pilot, and implement the best solution | What changes will fix the root causes, and have we proven they work? | SOP + improvement verification report | CTQ improvement statistically significant vs. baseline |
| V. Control | Institutionalise gains; prevent regression | How do we make the improvement permanent? | Control Plan + SPC charts | Finance validates benefits; process owner accepts control |

---

## Background: Where Lean Six Sigma Comes From

Lean Six Sigma is a synthesis of two independently powerful disciplines:

**Lean** originated in the Toyota Production System (TPS), developed in the 1950s–70s by Taiichi Ohno and Shigeo Shingo. It was labelled 'lean' by MIT researchers in the 1990s. Lean's fundamental insight is that value is defined by the customer, and everything a process does that the customer would not pay for is waste — one of eight types captured by the acronym DOWNTIME (Defects, Overproduction, Waiting, Non-utilised talent, Transportation, Inventory, Motion, Extra-processing).

**Six Sigma** was developed by Motorola engineer Bill Smith in 1986. 'Six Sigma' (6σ) means the process produces fewer than 3.4 defects per million opportunities (DPMO) — virtually perfect reliability. The methodology was popularised by Jack Welch at GE in the 1990s, who trained over 100,000 employees and tied Black Belt certification to promotion eligibility.

**Lean Six Sigma** (LSS) combines both: Lean eliminates waste to reduce complexity and speed up processes; Six Sigma eliminates variation to improve reliability. Together they address the two root drivers of operational underperformance.

---

## Phase I: Define — Solve the Right Problem

**Goal:** Frame the problem precisely, align stakeholders, establish project governance, and capture the Voice of the Customer.

**Key Question:** What problem are we solving, for whom, and how will we know we have succeeded?

**Duration:** 2–3 weeks

### Step 1 — Write a Rigorous Problem Statement

Use the IS/IS-NOT structure. State what the problem IS (symptom, location, magnitude, timing) and explicitly what it IS NOT (to prevent scope drift). Avoid embedding causes or solutions in the problem statement — doing so causes teams to solve a pre-assumed cause rather than the real one. Example: "The order fulfilment cycle time at our Midlands distribution centre averages 4.7 days (target: 2.0 days). This gap is isolated to orders requiring manual picking; automated picking lines meet target."

### Step 2 — Set SMART Project Goals

Translate the problem statement into a SMART goal tied to a corporate KPI. Example: "Reduce order fulfilment cycle time from 4.7 days to ≤ 2.0 days by Q3, saving an estimated £1.2M annually in overtime and customer credits." The corporate linkage is essential for sustaining sponsor attention through the 3–6 month project duration.

### Step 3 — Map the Process with SIPOC

Facilitate a 90-minute cross-functional workshop to produce a SIPOC diagram: Suppliers → Inputs → Process (5–7 high-level steps) → Outputs → Customers. Work from outputs backward. The SIPOC's primary purpose is scope definition: explicitly agree what is IN scope and what is OUT. A good SIPOC prevents the most common project failure mode — scope creep.

### Step 4 — Build the Project Plan and Budget

Gantt or phase-gate timeline with milestones at each DMAIC toll-gate. Include a 15% schedule buffer for data-collection delays. Obtain sponsor sign-off on budget and resource commitment before beginning Measure.

### Step 5 — Conduct Stakeholder Analysis

Plot stakeholders on a 2×2 Power/Interest matrix. For high-power/high-interest stakeholders, define a specific engagement action. Identify resistors early — a powerful resistor who is not actively managed can veto a solution in the Improve phase after months of work.

### Step 6 — Define the Team with RACI

Project Sponsor (Accountable), Black Belt (Responsible, 100% dedicated), Green Belts/SMEs (Consulted, 20–25% time), Finance (Informed for benefit validation).

### Step 7 — Capture Customer Requirements with VOC and CTQ Tree

Collect Voice of the Customer data: surveys, interviews, complaint logs, call-centre transcripts. Affinity-map raw needs into themes. Build the Critical-to-Quality (CTQ) tree: Customer Need → Quality Characteristic → CTQ Metric with specification limit. The CTQ metrics become the project's primary outcome measures. Example: Need: 'Fast delivery' → Characteristic: 'Order cycle time' → CTQ: 'Cycle time ≤ 2.0 days.'

### Step 8 — Select the Analytics Toolkit

Choose tools matched to data type and question. Continuous CTQs → X-bar/R control charts, capability analysis, regression. Attribute CTQs (pass/fail) → p-charts, chi-square tests. Select before Measure, not during — this forces methodological discipline.

### Step 9 — Build the Data Collection Plan

For each CTQ: operational definition (unambiguous measurement rule), data source, collection frequency, responsible collector, sample size, and time window. Include a Gauge R&R checkpoint. A DCP prevents the most expensive Measure-phase failure: collecting three weeks of data and then discovering the measurement system is unreliable.

**Phase I Deliverable:** Project Charter (signed by sponsor and process owner).

**Exit Gate:** Sponsor approves Charter. Sufficient savings potential, bounded scope, resourced team.

---

## Phase II: Measure — Know Your Baseline

**Goal:** Establish a validated, quantitative baseline and surface root-cause hypotheses.

**Key Question:** How is the process actually performing right now, and what data do we have?

**Duration:** 3–4 weeks

### Step 1 — Measure Current Performance

Compute baseline statistics: mean, standard deviation, Cpk (process capability), and DPMO. The sigma level translates performance into a universal language: 3σ = 66,807 DPMO; 6σ = 3.4 DPMO. Plot a baseline control chart (I-MR for individual measurements, X-bar/R for subgroups). Distinguish common-cause variation (the noise of the system) from special-cause variation (a specific, assignable event). Do not attempt to improve a process exhibiting special-cause variation until those special causes are identified and removed.

### Step 2 — Brainstorm Root-Cause Hypotheses

Facilitate a structured cause brainstorm using the Fishbone (Ishikawa) Diagram with 6M categories: Man, Machine, Method, Material, Measurement, Mother Nature (environment). Capture all plausible hypotheses. Rank by team consensus. This is a hypothesis list, not a confirmed root-cause list — confirmation happens in Analyze.

### Step 3 — Validate the Measurement System (Gauge R&R)

Run a Gauge Repeatability and Reproducibility (Gauge R&R) study: have multiple operators measure the same items multiple times. If %Gage R&R exceeds 30%, the measurement system is unreliable and must be fixed before the data can be trusted. This step is skipped in most ad hoc improvement efforts and is the source of countless false conclusions.

**Phase II Deliverable:** Measure Phase Report (baseline dashboard, control charts, Gauge R&R, ranked hypothesis list).

**Exit Gate:** Measurement system validated; baseline Cpk and DPMO established for all CTQs.

---

## Phase III: Analyze — Find the True Root Causes

**Goal:** Identify and confirm the true, statistically validated root causes.

**Key Question:** What is actually causing the defects or waste, and which causes account for the majority?

**Duration:** 3–4 weeks

### Step 1 — Deep Statistical Analysis

Run the pre-selected analyses: descriptive stats, histograms, scatter plots, stratification box plots, and correlation analysis between candidate causes (Xs) and the outcome metric (Y). Multi-vari charts are particularly powerful for identifying which stratification variable (shift, machine, supplier, operator) explains the most variation. The goal is to move from hypothesis to data-backed signal, eliminating causes that show no statistical relationship to the outcome.

### Step 2 — Apply Three Complementary Root-Cause Tools

**Five Whys:** Ask 'Why?' iteratively (typically 5+ times) until you reach a systemic root cause that is controllable. Stop when the answer is 'because that is how we designed the system' — that is the root cause. This prevents fixing symptoms rather than systems.

**Fishbone Diagram:** Build a structured cause-and-effect diagram. Group validated hypotheses into 6M categories. This visual makes the full causal landscape visible and reveals which categories are over-represented (suggesting systemic issues in that domain).

**Pareto Analysis:** Chart the frequency or cost of defects/waste by category. The Pareto principle (80/20 rule) consistently holds in process data: roughly 80% of the problem comes from 20% of the causes. This focus on the 'vital few' is what makes Lean Six Sigma financially efficient — you do not fix everything, you fix what matters most.

### Step 3 — FMEA: Prioritise by Risk

Failure Modes and Effects Analysis assigns a Risk Priority Number (RPN = Severity × Occurrence × Detection) to each failure mode in the current process. Focus improvement resources on the highest-RPN failure modes. FMEA also documents recommended corrective actions, creating a direct bridge from Analyze to Improve.

**Phase III Deliverable:** Analyze Phase Report (confirmed root-cause list with statistical evidence, FMEA table with RPN rankings).

**Exit Gate:** Sponsor and Master Black Belt approve the root-cause findings. At least one controllable root cause confirmed with statistical evidence.

---

## Phase IV: Improve — Build and Implement the Right Solution

**Goal:** Generate, evaluate, select, pilot, and implement the best solution addressing confirmed root causes.

**Key Question:** What is the best set of changes, and have we proven they work?

**Duration:** 4–8 weeks

### Step 1 — Define Ideation Constraints

Set boundary conditions before generating ideas: budget ceiling, regulatory constraints, technology platform, timeline, HR/union agreements. Constraints channel creativity toward implementable ideas and prevent the team spending weeks on an unviable blue-sky solution.

### Step 2 — Generate Solutions Using Structured Ideation

Combine three techniques in a 90-minute session:
- **'How Might We' (HMW) Questions:** Reframe each root cause as a HMW question ('How might we eliminate the need for manual data re-entry at order intake?'). HMW questions are solution-agnostic — they open, not close, the solution space.
- **Crazy 8s:** Each participant sketches 8 rough solution ideas in 8 minutes. The time pressure forces participants to move beyond their first (usually conventional) idea.
- **5S Workplace Organisation:** For any waste related to motion, environment, or search time, apply 5S (Sort, Set in Order, Shine, Standardise, Sustain) as a solution framework — not just a housekeeping programme.

### Step 3 — Organise Ideas with Mind Mapping

Transfer the raw idea bank to a mind map. Group ideas by the root cause they address. This reveals which root causes have abundant solution options and which need more ideation. Eliminate duplicates and clearly infeasible ideas.

### Step 4 — Build Business Cases

For the top 3–5 solution clusters, build a one-page business case: implementation cost, time, resource requirement; projected financial benefit over 12 months; payback period. Validate cost estimates with Finance.

### Step 5 — Select the Best Solution

Use a weighted decision matrix. Criteria: impact on CTQ (40%), cost (20%), implementation speed (15%), sustainability (15%), risk (10%). Score each solution. Obtain formal sponsor approval before piloting.

### Step 6 — Pilot and Validate

Run a controlled pilot (one shift, one line, one branch). Use a Testing Sheet (hypothesis, sample size, duration, success criteria) and a Feedback Capture Grid (What Worked / What Could Be Improved / Questions / Ideas). Compare pilot CTQ results to baseline statistically.

### Step 7 — Document the SOP

Document the improved process as a Standard Operating Procedure: step-by-step instructions, decision points, acceptable parameter ranges, visual work aids, and error-proofing mechanisms. Written at the operator level — not a management summary.

### Step 8 — Implement at Scale

Roll out to the full process scope. Train all operators against the new SOP. Consider a parallel-run period if risk warrants it. Document any deviations from the pilot plan.

### Step 9 — Assess Commitment with the Commitment Curve

Map each key stakeholder on the Commitment Curve: Awareness → Understanding → Buy-in → Commitment → Advocacy. For anyone below Buy-in, assign a targeted action. Revisit weekly during the first month of implementation.

### Step 10 — Verify Improvement vs. Baseline

Re-run the same measurement protocol from Phase II. Compute new Cpk, DPMO, and sigma level. Calculate the financial benefit realised. If results fall short, diagnose the gap and treat it as a new improvement cycle.

**Phase IV Deliverable:** Improve Phase Report (ideation output, selected solution, pilot results, SOP, implementation evidence, improvement verification).

**Exit Gate:** CTQ improvement statistically significant vs. baseline; SOP signed; all operators trained.

---

## Phase V: Control — Make the Gains Permanent

**Goal:** Institutionalise the improvement through monitoring, control plans, and knowledge transfer.

**Key Question:** How do we make the improvement permanent?

**Duration:** 2–4 weeks (then ongoing)

### Step 1 — Monitor with SPC and Kaizen

Implement a Statistical Process Control chart on the primary CTQ metric. The process owner monitors daily or weekly. Apply the Kaizen principle: monthly 30-minute stand-up reviews of the chart, treating out-of-control signals as prompts for rapid investigation.

### Step 2 — Create the Control Plan

The Control Plan maps each critical process parameter (X) to its CTQ output (Y), specifies the control method (SPC, checklist, audit), sets the out-of-control response plan, and assigns the responsible owner. This is the operational contract between the improvement project and the line organisation.

### Step 3 — Share and Celebrate

Present results to leadership. Recognise team members formally. Share a project case study to build Lean Six Sigma culture and encourage future project nominations.

### Step 4 — Capture and Transfer Learnings

Complete a Lessons Learned register. Identify candidate processes for the same solution. Submit to the Lean Six Sigma knowledge repository. Brief the Master Black Belt on transferable insights.

**Phase V Deliverable:** Control Phase Package (Control Plan, SPC charts, Lessons Learned, executive presentation, case study).

**Exit Gate:** Finance validates benefits 90 days post-implementation; process owner formally accepts Control Plan; project certified closed by Master Black Belt.

---

## The Frameworks and Tools

### SIPOC Diagram

SIPOC (Suppliers → Inputs → Process → Outputs → Customers) is a one-page high-level process map used at project kick-off to define scope. Created as a quality management tool in the 1980s, it forces the team to view the process from the customer's perspective (starting with Outputs and Customers) rather than defaulting to an internally-centred view. SIPOC's chief value is scope discipline: the explicit boundaries prevent the single most common failure mode in improvement projects — scope creep.

### Voice of the Customer (VOC) and CTQ Tree

The VOC-to-CTQ translation is the bridge between qualitative customer language and quantifiable project metrics. VOC data is collected from surveys, interviews, complaint logs, and observation. Each customer need is translated into a measurable CTQ (Critical-to-Quality) characteristic with a specification limit. Without this translation, teams optimise metrics the process produces naturally rather than metrics customers actually care about.

### DOWNTIME: The 8 Lean Wastes

The 8 wastes (Defects, Overproduction, Waiting, Non-utilised talent, Transportation, Inventory, Motion, Extra-processing) provide a structured vocabulary for identifying all non-value-adding activity. Value-stream mapping makes these wastes visible on a timeline. In healthcare: medication errors (Defects), extra form copies (Overproduction), patient wait times (Waiting). In financial services: rekeying data (Motion), batch printing (Extra-processing), excess data copies (Inventory).

### Five Whys

Five Whys is a deceptively simple root-cause technique: ask 'Why did this happen?' and answer with a cause; then ask 'Why did that cause occur?' Repeat until you reach a systemic root cause that the organisation controls. Developed by Sakichi Toyoda and formalised in the Toyota Production System. The method prevents organisations from stopping at symptoms ('the machine broke') rather than reaching systemic causes ('our preventive maintenance schedule is not followed because operators are not released from production for PM tasks').

### Fishbone (Ishikawa) Diagram

The Fishbone Diagram, developed by Kaoru Ishikawa in the 1960s, is a structured cause-and-effect diagram. The 'head' of the fish is the problem (effect); the 'bones' are categories of causes (6Ms: Man, Machine, Method, Material, Measurement, Mother Nature). Sub-causes branch off each bone. The diagram makes the full causal landscape visible simultaneously, enabling the team to identify which domains are most densely populated with potential causes and to see relationships between causes.

### Pareto Analysis

Based on the principle identified by Vilfredo Pareto — that roughly 80% of outcomes come from 20% of causes — a Pareto chart displays defect categories or waste sources ranked by frequency or cost (descending bar chart with cumulative percentage line). The 'vital few' categories (left side of the chart) capture the majority of the problem and become the priority targets for root-cause analysis. This focus is what makes Lean Six Sigma financially efficient: it prevents the common trap of spreading improvement effort equally across all problems.

### FMEA (Failure Modes and Effects Analysis)

FMEA, developed by the US military in the 1940s (MIL-P-1629) and widely adopted in automotive (FMEA-4) and aerospace, assigns a Risk Priority Number (RPN = Severity × Occurrence × Detection, each 1–10) to every potential failure mode in the process. The RPN ranks failure modes by risk, directing improvement resources to the most critical failure modes first. FMEA serves double duty: in Analyze, it confirms which failures matter most; in Control, it informs where control mechanisms must be the strongest.

### Process Capability Analysis (Cpk and DPMO)

Process capability quantifies how well a process produces output within customer specification limits. Cpk (process capability index) measures the distance between the process mean and the nearest specification limit, divided by three standard deviations. A Cpk ≥ 1.33 corresponds to approximately 4σ performance (6,210 DPMO). DPMO (defects per million opportunities) enables direct comparison across processes regardless of scale. Sigma level translates: 3σ = 66,807 DPMO; 4σ = 6,210; 5σ = 233; 6σ = 3.4.

### 5S Workplace Organisation

5S (Sort, Set in Order, Shine, Standardise, Sustain) is a Lean foundation tool for eliminating environmental waste (motion, search time, errors from disorganised workspaces). Originated in Toyota's production system, later popularised by Hiroyuki Hirano. It is often the first Lean tool deployed because its results are immediately visible, building momentum and demonstrating Lean's practical value to sceptics. In knowledge work and healthcare, 5S applies to digital environments (shared drives, inbox organisation) as much as physical ones.

### Kaizen

Kaizen (改善, Japanese: 'change for better') is the philosophy of continuous incremental improvement. In Lean Six Sigma, Kaizen operates at two levels: (1) Kaizen Events — focused 3–5 day rapid improvement workshops on a specific problem (also called 'blitz kaizen'); and (2) the daily Kaizen mindset — all employees contribute improvement ideas, and a systematic idea management process captures, evaluates, and implements them. The Control phase of DMAIC embeds Kaizen by creating ongoing monitoring that prompts continuous review rather than declaring the improvement finished.

### Commitment Curve

The Commitment Curve (also known as the Change Commitment Curve, derived from Prosci/ADKAR change management research) maps stakeholder psychological progression from Awareness → Understanding → Buy-in → Commitment → Advocacy. It is a diagnostic and planning tool: plot each key stakeholder to see where they currently are, then design targeted interventions to move resistors through the curve. In Lean Six Sigma, a technically perfect solution fails if key stakeholders are stuck at Awareness — they will revert to old habits the moment the project team withdraws.

### Mind Mapping

Mind mapping is a non-linear idea organisation technique originating with Tony Buzan in the 1970s. In the Improve phase, a mind map with the problem at the centre and solution ideas as branches allows the team to visually group ideas by root cause addressed, identify clusters with many versus few solution candidates, and spot relationships between ideas. It prevents the linear thinking of a standard brainstorm list, which tends to anchor on the first ideas generated.

### Crazy 8s Ideation

Crazy 8s is a design-sprint technique (Jake Knapp, Google Ventures) adapted for Lean Six Sigma ideation. Each participant folds a sheet into 8 panels and sketches one rough solution idea per panel in 8 minutes (1 minute per panel). The time pressure prevents over-elaboration and forces participants to move past their first (usually conventional) ideas. Volume is the objective at this stage; quality filtering comes later with the decision matrix.

### Stakeholder Power-Interest Matrix

The Power/Interest matrix (Eden and Ackermann, 1998; widely adopted in project management) plots stakeholders on two axes: Power (ability to influence the project's success) and Interest (degree of concern with the project outcome). The four quadrants suggest different engagement strategies: High Power/High Interest → Manage Closely; High Power/Low Interest → Keep Satisfied; Low Power/High Interest → Keep Informed; Low Power/Low Interest → Monitor. In DMAIC, this tool is used in Define to build the stakeholder engagement plan and in Improve to manage change resistance.

---

## A Worked End-to-End Example: Midland Bank Mortgage Processing

Midland Bank's mortgage operations team faced a consistent problem: average loan approval cycle time of 23 days against a target of 10 days, generating customer complaints and losing applications to faster competitors.

**Define:** The Black Belt facilitated a SIPOC workshop. Scope: the process from loan application receipt to credit decision — explicitly excluding the legal/title search (a vendor dependency outside scope). VOC interviews with 40 declined applicants and 40 completed applicants revealed the primary CTQ: 'Time to credit decision ≤ 10 days.' Problem statement: 'Mortgage credit decision cycle time at Midland averages 23 days (target 10 days); the gap is present across all loan types and all origination channels.'

**Measure:** A Gauge R&R study confirmed the time-stamping system was reliable (%Gage R&R = 8%). Baseline: mean = 23.1 days, σ = 6.2 days, Cpk = -0.71 (deeply incapable). DPMO = 982,000 (virtually every loan exceeded the target). Hypothesis brainstorm via Fishbone identified six candidate root causes: manual document re-keying, incomplete initial applications requiring callbacks, batch processing (loans reviewed in weekly batches rather than daily), siloed credit analyst specialisation, supervisor approval bottleneck for loans under £500k, and inconsistent application of underwriting criteria.

**Analyze:** Statistical analysis of 180 loans (6 months of data) using stratification box plots showed: loans processed on Monday/Tuesday averaged 19 days; Thursday/Friday averaged 27 days (batch effect). Loans with incomplete initial data averaged 31 days vs. 18 days for complete submissions. Five Whys on the 'incomplete application' cause revealed the root: the online application form had 14 optional fields that underwriters required but applicants skipped. Pareto: 'Incomplete applications' accounted for 52% of the cycle time excess; 'batch processing' for 28%; 'supervisor bottleneck for under-£500k loans' for 14%. FMEA confirmed highest RPN (162) for the incomplete-application failure mode.

**Improve:** HMW questions generated 47 ideas. Crazy 8s added 32 more. The selected solution (decision matrix score: 87/100): (1) redesign the online form to make critical underwriting fields mandatory with real-time validation; (2) switch from weekly batch to daily pull-system processing; (3) expand credit analyst authority to approve loans under £500k without supervisor sign-off. A pilot on 60 loans demonstrated average cycle time of 9.4 days (Cpk = 0.18, improving rapidly). The SOP was written with operator co-authorship. Commitment Curve mapping found three senior analysts at 'Understanding' — a targeted demo with their team leader moved them to 'Buy-in' within two weeks.

**Control:** An I-MR control chart was installed on the daily average decision time, monitored by the Operations Team Leader. Control Plan: daily SPC review trigger (any point outside control limits → same-day investigation by the Black Belt on call for first 90 days, then process owner). Lessons Learned: the mandatory-field fix should be applied to all online forms bank-wide (identified 3 other processes as immediate candidates). Post-90-day Finance sign-off confirmed average cycle time = 9.1 days and annualised saving of £2.3M in FTE cost reduction (analysts freed from callbacks and re-work).

---

## Templates

### Template 1: Project Charter

A one-page document covering: Problem Statement, Business Case (financial linkage), Project Goals (SMART), Scope (In/Out), Team (RACI), Timeline (phase-gate), Resources and Budget, CTQ Tree, and Sponsor Signature.

### Template 2: SIPOC Diagram

A five-column table: Suppliers | Inputs | Process Steps (5–7) | Outputs | Customers. Include a 'Scope' row beneath defining the start and end of the process in scope.

### Template 3: Data Collection Plan

Columns: CTQ Metric | Operational Definition | Data Source | Collection Frequency | Responsible | Sample Size | Time Window | Gauge R&R Checkpoint.

### Template 4: FMEA Table

Columns: Ref# | Process Step | Potential Failure Mode | Potential Effects | Severity (1–10) | Occurrence (1–10) | Detection (1–10) | RPN | Recommended Actions | Responsible | Target Date.

### Template 5: Solution Decision Matrix

Rows: each solution. Columns: Criterion 1 (Impact on CTQ) weight 40% | Criterion 2 (Cost) weight 20% | Criterion 3 (Speed) weight 15% | Criterion 4 (Sustainability) weight 15% | Criterion 5 (Risk) weight 10% | Weighted Score. Include score scale (1–5) and weight rationale.

### Template 6: Control Plan

Columns: Process Step | Critical Parameter (X) | CTQ (Y) | Specification | Control Method | Measurement Frequency | Responsible | Out-of-Control Response Plan.

---

## Pitfalls and Best Practices

**Pitfall 1: Jumping to solution before completing Analyze.** The most costly mistake. Teams with a pre-formed hypothesis treat Measure and Analyze as box-ticking and implement a solution in Week 3. If the solution fails to hold, months of work are wasted. *Counter:* The toll-gate process enforces this discipline — Improve does not begin until sponsor has reviewed confirmed root causes.

**Pitfall 2: Skipping Gauge R&R.** Collecting weeks of data on a broken measurement system produces meaningless results. *Counter:* Gauge R&R is a mandatory gate in Phase II, not optional.

**Pitfall 3: Solving a problem the customer does not care about.** Teams often optimise the metric they already track rather than the metric customers value. *Counter:* The VOC → CTQ translation in Define ensures project metrics are anchored to customer requirements, not internal convenience.

**Pitfall 4: Implementing without a Control Plan.** A process will revert to its former state if control mechanisms are not designed and handed to the line organisation. *Counter:* The Control Plan (Phase V) is a handover document, not a project artifact — the process owner signs it and owns it permanently.

**Pitfall 5: Under-investing in change management.** A technically perfect solution with a poorly committed workforce will fail within 90 days. *Counter:* The Commitment Curve assessment in Phase IV identifies resistors early enough to address them before implementation.

**Pitfall 6: Misidentifying scope.** Starting too large (a complex, multi-department process) or too narrow (a single machine) leads to projects that either never complete or deliver insignificant savings. *Counter:* The SIPOC scope-boundary exercise in Define explicitly defines what is in and out of scope, reviewed by the sponsor.

**Best Practice: Report sigma level, not just percentage improvement.** Sigma level is a universal language that enables comparison across processes, industries, and organisations. Translating a 30% cycle time reduction into a sigma improvement (e.g., 2.8σ to 3.6σ) makes the achievement legible to any Lean Six Sigma practitioner.

**Best Practice: Anchor the project to financial value from Day 1.** Every DMAIC project should have a Finance-validated benefit estimate in the Charter. This creates accountability, sustains sponsorship through the long Analyze phase, and ensures project selection is driven by value rather than improvement team enthusiasm.

---

## Sources

1. Motorola University. *The Motorola Story: Six Sigma's Origin.* Motorola, Inc. 1992.
2. Harry, Mikel, and Richard Schroeder. *Six Sigma: The Breakthrough Management Strategy.* Doubleday, 2000.
3. Womack, James P., and Daniel T. Jones. *Lean Thinking: Banish Waste and Create Wealth in Your Corporation.* Free Press, 1996.
4. Pyzdek, Thomas, and Paul Keller. *The Six Sigma Handbook, 4th Edition.* McGraw-Hill, 2014.
5. Liker, Jeffrey K. *The Toyota Way: 14 Management Principles from the World's Greatest Manufacturer.* McGraw-Hill, 2004.
6. Ishikawa, Kaoru. *Guide to Quality Control.* Asian Productivity Organization, 1968.
7. Juran, Joseph M. *Juran's Quality Handbook, 5th Edition.* McGraw-Hill, 1999.
8. Knapp, Jake, John Zeratsky, and Braden Kowitz. *Sprint: How to Solve Big Problems and Test New Ideas in Just Five Days.* Simon & Schuster, 2016.
9. Stamatis, D.H. *Failure Mode and Effect Analysis: FMEA from Theory to Execution.* ASQ Quality Press, 2003.
10. Prosci. *ADKAR: A Model for Change in Business, Government and Our Community.* Learning Center Publications, 2006.
