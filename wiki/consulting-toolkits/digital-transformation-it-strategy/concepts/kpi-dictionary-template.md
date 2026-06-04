---
type: concept
slug: kpi-dictionary-template
title: KPI Dictionary
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: performance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# KPI Dictionary

*Category: performance · Toolkit: Digital Transformation & IT Strategy*

## What it is
A formal register that defines every KPI used in the programme with standardised fields: name, definition, data source, calculation method, frequency, owner, target, RAG thresholds, and the strategic objective it measures — preventing metric proliferation and ensuring consistent interpretation.

**Origin:** Standard tool in management information and performance management practice. Formalised in OGC MSP and Balanced Scorecard methodology. The 'single source of truth for metrics' principle was popularised by data-driven companies (Amazon, Google) in the 2010s.

## Why it works
Without a KPI dictionary, the same metric is calculated differently by different teams (e.g., 'conversion rate' means orders/sessions to the e-commerce team and registrations/visitors to the marketing team). These inconsistencies cause confusion, destroy trust in data, and make cross-team comparisons meaningless. The dictionary establishes a single, agreed definition for every KPI before the dashboards are built.

## When to use
Use in Phase V Step 1 (Design the KPI Architecture) before building any dashboards. Publish before the first dashboard goes live.

## Visual
`table`

## Step-by-step tutorial
1. 1. List all KPIs: from the Balanced Scorecard and the Benefits Realisation Framework, collect all KPIs used in programme reporting.
2. 2. For each KPI, complete the dictionary entry: Name, Definition (precise — what is included and excluded), Data Source (exact system and table/report), Calculation (formula, any exclusions or adjustments), Frequency (how often measured), Owner (named individual accountable), Target, and RAG thresholds.
3. 3. Resolve conflicts: where the same concept is measured differently by different teams, facilitate a governance decision about the canonical definition. Document the decision and the rationale for any stakeholders who disagree.
4. 4. Publish and enforce: publish the dictionary as a shared document. All dashboards must use KPI definitions from the dictionary. Any deviation requires a formal amendment request.
5. 5. Maintain: when a KPI definition needs to change, follow a change control process — proposed change, impact assessment, stakeholder approval, effective date, and historical continuity note.
6. 6. Limit proliferation: maintain a cap on the number of KPIs in the dictionary. Every new KPI request requires retirement of an existing one or explicit approval. A dictionary with 200 KPIs is not a dictionary — it is a data catalogue.

## Real-life example — Amazon
Amazon's metrics culture ('We are not our opinions; we are our data') is underpinned by a firm-wide metrics taxonomy where each metric has a single canonical definition agreed at the team level and validated at the VP level. Amazon's 'Customer Experience' metrics (NPS, CSAT, CES) have single canonical definitions used across all product teams. When a team proposes a new customer experience metric, it must demonstrate that no existing metric in the taxonomy covers the same phenomenon. This discipline prevents the 'dashboard proliferation' that plagues organisations where each team creates its own metrics.

**So what:** The discipline that makes a KPI dictionary effective is not its creation — it is the governance process that prevents proliferation and enforces the canonical definitions. Amazon's VP-level validation of new metrics is the enforcement mechanism that keeps the taxonomy coherent.

## Template
Complete one row per KPI. Resolve all definition conflicts before the dashboard is built.

- [ ] KPI ID: [e.g., F-01] | KPI Name: [e.g., E-commerce Conversion Rate] | Definition: [Orders completed / Unique sessions × 100 — excludes bot sessions] | Data Source: [Adobe Analytics → data warehouse → Power BI] | Calculation: [Orders / Sessions] | Frequency: [Daily, refreshed at 06:00] | Owner: [Head of E-commerce] | Target: [4.0%] | RAG: Red <2.5% | Amber 2.5–3.5% | Green >3.5%
- [ ] [Repeat for all KPIs — typically 12–15 in the programme dictionary]
- [ ] Total KPI count: [X] | Cap: [15 for this programme] | Approval required for new KPIs: [Programme Director]

## Pitfalls
- KPI dictionary as documentation afterthought — build the dictionary before the dashboards, not after; retrofitting definitions onto existing dashboards is 10× harder.
- Overly complex definitions — a KPI that requires 3 pages of text to define is not measurable consistently; simplify or decompose.
