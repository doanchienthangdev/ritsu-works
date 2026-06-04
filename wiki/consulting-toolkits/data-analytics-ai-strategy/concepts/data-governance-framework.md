---
type: concept
slug: data-governance-framework
title: Data Governance Framework (DAMA-DMBOK)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Governance Framework (DAMA-DMBOK)

*Category: governance · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured system of people, policies and processes that ensures data is accurate, secure, compliant, and used appropriately — creating the trust infrastructure that makes data-driven decisions possible.

**Origin:** The Data Management Association (DAMA) International's DAMA-DMBOK (Data Management Body of Knowledge, 2nd edition, 2017) is the canonical reference. Gartner's Data Governance Maturity Model and IBM's Data Governance Council Maturity Model (2007) are widely-used companion frameworks.

## Why it works
Without governance, every team defines metrics differently, the most senior person's opinion wins over the data, and GDPR/CCPA violations become a matter of when, not if. Governance creates the accountability structures (who owns what data) and the canonical definitions (one agreed definition of 'customer') that make data trustworthy enough to base decisions on. The key insight from DAMA-DMBOK: governance is a system — people + policies + processes + technology must all be present. Removing any pillar causes the others to fail.

## When to use
In Phase 2 (building the four pillars), and as an ongoing operating system — governance is never 'done'. Also use immediately after a data-quality incident that damages trust in analytics.

## Visual
`process-flow`

## Step-by-step tutorial
1. Assign a named Data Owner (a business leader — VP level or above, not an IT role) to every priority data domain. The Data Owner is accountable for the quality and appropriate use of data in that domain; they sign off on the quality SLA.
2. Define a data classification policy with at minimum four levels: Public (freely shareable), Internal (shareable within the company), Confidential (need-to-know, no personal data), Restricted (personal data, regulated, highest controls). Every data asset gets a classification that determines who can access it and how it must be protected.
3. Publish a business glossary: for the 50 most important business terms (revenue, customer, active user, churn, gross margin), write a single canonical definition approved by the Data Governance Council. Wire it into the data catalogue so every analyst sees the definition when they query the relevant table.
4. Set data quality SLAs for each priority source: at minimum, completeness ≥99%, timeliness ≤4h for operational data, accuracy ≥95% vs a reference source. Implement automated checks in the pipeline (dbt tests, Great Expectations). Publish a quality scorecard — making quality visible is the most powerful driver of improvement because it creates accountability at the source.
5. Stand up the Data Governance Council: meets monthly; membership = one Data Owner per domain + CDO + legal/privacy lead + CIO. Agenda: quality scorecard review, policy issues, access disputes, schema-change requests, compliance updates.
6. Implement lineage tracking: for every board-level KPI, an analyst must be able to trace it from the dashboard to the raw source in ≤5 clicks. Use dbt docs, OpenLineage, or a dedicated catalogue tool.

## Real-life example — HSBC
After a series of data-quality incidents and a $1.9B anti-money-laundering fine partly attributable to poor data controls, HSBC invested in a formal data governance programme: appointed Data Owners for 120 critical data elements, published a business glossary with 2,000+ terms, implemented automated data-quality checks across core banking systems (testing completeness, accuracy, and consistency daily), and stood up a Global Data Governance Council. Three years later, the regulatory submissions that previously required 6 weeks to produce (with manual reconciliation) took 6 days — and the output was defensible to regulators.

**So what:** Data governance is not bureaucracy — it is the infrastructure that makes data fast, trusted and legally defensible. The ROI is measured not in analytics outputs but in regulatory fines avoided and decision speed.

## Template
Complete one row per priority data domain. Every blank in the Owner or Quality SLA column represents an active governance risk.

- [ ] Data domain (e.g., Customer, Product, Transaction, Employee)
- [ ] Data Owner: named person + title + accountability statement
- [ ] Data Steward: named person + operational responsibilities
- [ ] Data classification level (Public / Internal / Confidential / Restricted)
- [ ] Quality SLA: completeness %, timeliness (max lag), accuracy % vs reference
- [ ] Business glossary entries: count of canonical definitions for this domain
- [ ] Lineage documented from source to KPI? (Y/N)
- [ ] GDPR/CCPA lawful basis for personal data (if applicable)
- [ ] Last quality audit date and score

## Pitfalls
- Making governance IT-owned: counter: the Data Owner must be a business leader who is accountable for decisions made using the data. IT stewards the data; the business owns it.
- Starting with a policy document nobody reads: counter: wire governance into the platform tooling (data catalogue for access requests, dbt for quality checks) so it is the path of least resistance, not an extra step.
- Over-engineering the governance model before trust is established: counter: start with three domains, three Data Owners, and a 10-term business glossary. Governance built iteratively with business engagement is more durable than a complete framework deployed by fiat.
