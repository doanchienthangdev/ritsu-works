---
type: concept
slug: use-case-discovery-framework
title: Use-Case Discovery Framework (Function-Based Workshop)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: analysis
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Use-Case Discovery Framework (Function-Based Workshop)

*Category: analysis · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured workshop methodology for eliciting, cataloguing and categorising analytics and AI use cases from every major business function — producing a comprehensive use-case long-list that covers the full opportunity landscape before any prioritisation occurs.

**Origin:** Standard consulting facilitation approach for analytics strategy engagements. Adapted from design thinking user-research methodology (Stanford d.school, 2003) and McKinsey's 'AI use case atlas' methodology (2018). The function-by-function structure ensures completeness and business unit buy-in.

## Why it works
Use-case discovery workshops are the most important investment in the prioritisation process: a portfolio that is 50 use cases cannot be narrowed to 10 without first having 50. The most valuable use cases are often not the obvious ones — they are found in business units that have never had an analytics team visit them. A function-by-function structure ensures that no function is excluded from the opportunity mapping and that the prioritisation reflects the full opportunity landscape.

## When to use
In Phase 3 (Step 1: map use cases to functions and AI technologies). Run workshops before any scoring or prioritisation begins.

## Visual
`table`

## Step-by-step tutorial
1. Schedule 90-minute workshops with each major function. Attendees: 3–5 people from the function (the VP/Director plus 2–3 operational managers who know where the pain points are) plus 1 facilitator from the data team and 1 note-taker.
2. Open with the 'burning platform' question: 'If a competitor had a data and AI capability you don't, what decisions would they make better than you right now?' This frames the conversation around competitive necessity rather than technology interest.
3. Walk through three use-case categories: (1) Decision support — where data could improve a recurring decision (pricing, inventory, hiring, risk assessment); (2) Process automation — where an AI could automate a repetitive task (document processing, scheduling, ticket triage); (3) Knowledge management — where a generative AI could make institutional knowledge more accessible (internal Q&A, research summarisation, customer communication drafting).
4. For each proposed use case, document: the current decision/process (as-is), the data that would be needed, the expected improvement, and the person in the function who would be the business sponsor.
5. After each workshop, send a summary to the VP within 48 hours. Ask them to review and confirm: this creates early ownership and reduces the risk of business units disowning the use cases later in the prioritisation process.
6. Aggregate across all functions: aim for 50–100 use cases. If fewer than 30 are identified, either the workshops were too short or the facilitation was too passive — repeat with more targeted prompts.

## Real-life example — Procter & Gamble
P&G's data analytics team ran use-case discovery workshops across 12 business functions globally, producing 84 candidate use cases. The workshops uncovered use cases that would not have emerged from a top-down approach: the Legal function identified a contract-analysis AI that reduced contract review time by 60%; the supply-chain function identified a demand-sensing model that outperformed the existing statistical forecasting; the HR function identified a skills-gap analysis tool that the CDO's team would never have proposed. Three of the top-10 funded use cases came from functions that had never engaged with the analytics team before.

**So what:** Use-case discovery workshops are not just a planning exercise — they are a change management tool. Functions that contribute use cases to the portfolio have ownership of the analytics programme's success.

## Template
Complete one row per use case identified in the workshop. Collect all use cases before any scoring or prioritisation.

- [ ] Use case name (specific, not generic: 'weekly markdown prediction for fashion category' not 'inventory optimisation')
- [ ] Business function
- [ ] Use case category: Decision support / Process automation / Knowledge management
- [ ] AI technology type: ML / Deep Learning / Generative AI / Automation / Analytics/BI
- [ ] Current process (as-is: how is this decision made or process run today?)
- [ ] Data required (what data sources would this use case need?)
- [ ] Expected improvement (specific: '15% reduction in markdown losses')
- [ ] Business sponsor (named VP/Director willing to own value delivery)
- [ ] Frequency (how often is this decision made or process run?)
- [ ] Pre-scored as Quick Win / Strategic Bet / Easy Fill / Unknown (before formal scoring)

## Pitfalls
- Workshops that produce generic use cases ('better reporting', 'more analytics'): counter: push back with 'more specific — what decision would be different, made by whom, with what data?'. Generic use cases cannot be scoped, funded, or delivered.
- Only running workshops with IT or the data team: counter: 100% of use cases must come from business functions — the data team's job is to facilitate the workshops, not to propose the use cases.
- Moving to prioritisation before all workshops are complete: counter: prioritising a partial portfolio creates false conclusions. Run all workshops before scoring a single use case.
