---
type: concept
slug: rag-status-indicator
title: RAG (Red-Amber-Green) Status Indicator
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# RAG (Red-Amber-Green) Status Indicator

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A traffic-light colour-coding system applied to KPIs, project milestones, and initiative statuses to convey at a glance whether performance is on track (green), at risk (amber), or off track (red). Driven entirely by conditional formatting formulas — never manually coloured.

**Origin:** Adapted from traffic-light signalling conventions into management reporting in manufacturing quality control (ISO quality standards) in the 1970s and 1980s. Widely adopted in project management (PRINCE2, PMI) and corporate dashboards by the 1990s.

## Why it works
The RAG convention exploits pre-attentive visual processing: the human brain detects colour in under 150 milliseconds, far faster than reading a number. A table of 20 KPIs with RAG indicators can be scanned in 2 seconds; the same table without RAG takes 30+ seconds to process. RAG works because it converts relative performance (actual vs. target) into the simplest possible binary signal the eye can process.

## When to use
Apply to every KPI scorecard, project status tracker, and initiative health overview. RAG is the visual grammar of executive dashboards.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. For each KPI, determine the direction: Higher Better (Revenue, Margin, NPS) or Lower Better (Defect Rate, Costs, Turnover).
2. Open Excel Conditional Formatting > New Rule > Use a formula to determine which cells to format.
3. For Higher Better KPIs — Green rule: =B2>=C2 (actual >= target). Amber rule: =AND(B2>=C2*0.95, B2<C2). Red rule: =B2<C2*0.95.
4. For Lower Better KPIs — Green rule: =B2<=C2. Amber rule: =AND(B2<=C2*1.05, B2>C2). Red rule: =B2>C2*1.05.
5. Apply each rule to the entire RAG Status column (e.g., $F$2:$F$20) so all rows are covered by a single rule set.
6. For project statuses, use a simpler discrete rule: Green = 'On Track' text, Amber = 'At Risk', Red = 'Delayed'.
7. Copy the conditional formatting rule to all other RAG columns in the workbook using Format Painter.
8. Document the thresholds in the KPI Dictionary tab so any future dashboard maintainer understands the rule logic.

## Real-life example — NHS England — NHS Performance Dashboard
The NHS uses a standardised RAG framework across all its Integrated Care Boards' performance reports. Each performance metric (A&E 4-hour wait compliance, cancer treatment waiting times, ambulance response times) is coded Red, Amber, or Green against defined national standards. NHS boards review hundreds of metrics across dozens of trusts; the RAG system allows board members to identify which trusts and which metrics need intervention in under 5 minutes — a task that previously required reading a 50-page narrative report.

**So what:** RAG is most powerful when the thresholds are set once, documented, and never changed mid-cycle — the moment managers renegotiate thresholds to avoid a red, the system loses its integrity.

## Template
For each KPI, record the direction and thresholds in this table. Use the formulas in the 'Conditional Format Formula' column to set up Excel conditional formatting.

- [ ] KPI Name: [enter metric]
- [ ] Direction: Higher Better / Lower Better
- [ ] Green Threshold: [e.g. >= 100% of Target / <= 100% of Target]
- [ ] Amber Threshold: [e.g. 95–100% of Target / 100–105% of Target]
- [ ] Red Threshold: [e.g. < 95% of Target / > 105% of Target]
- [ ] Excel Green Formula: [e.g. =Actual_cell>=Target_cell for Higher Better]
- [ ] Excel Amber Formula: [e.g. =AND(Actual_cell>=Target_cell*0.95, Actual_cell<Target_cell)]
- [ ] Excel Red Formula: [e.g. =Actual_cell<Target_cell*0.95]

## Pitfalls
- Manual colouring — the #1 failure mode. Someone colours a cell amber manually during a 'just this once' presentation and forgets to remove it; the next month the cell shows amber regardless of actual performance.
- Using the same threshold (±5 %) for every KPI — a 5 % variance on Defect Rate is catastrophic; a 5 % variance on Website Traffic is within normal noise. Set thresholds per KPI.
- Threshold inflation — managers negotiating looser thresholds after seeing their KPI go red. RAG only works as a governance tool if thresholds are set in advance and locked.
