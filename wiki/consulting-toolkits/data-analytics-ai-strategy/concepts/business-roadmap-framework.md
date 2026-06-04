---
type: concept
slug: business-roadmap-framework
title: Data & AI Business Roadmap (Three-Wave Architecture)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: strategy
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data & AI Business Roadmap (Three-Wave Architecture)

*Category: strategy · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured 3-year, three-wave delivery roadmap that sequences the data and AI use-case portfolio to maximise early value delivery, manage dependencies, and demonstrate cumulative return on the data platform investment.

**Origin:** The three-wave structure is a consulting standard for major technology transformations, derived from McKinsey's 'horizons' framework (1999) and applied to data platform programmes by Deloitte, Accenture, and McKinsey Digital. The value accumulation curve is the key communication tool used to secure multi-year board commitment.

## Why it works
A roadmap that spreads investment evenly across 3 years with no defined waves produces the worst possible outcome: nothing works by the end of Year 1, the programme loses credibility and funding, and the platform is never completed. The three-wave structure front-loads value delivery into Wave 1 (foundation + Quick Wins in 0–6 months), scales the investment in Wave 2 (12–18 months), and applies advanced capabilities in Wave 3. The value accumulation curve shows when the cumulative return exceeds the cumulative investment — typically in Month 18–24.

## When to use
In Phase 5 (Step 2: build the business roadmap) after the project portfolio is prioritised. Update quarterly.

## Visual
`process-flow`

## Step-by-step tutorial
1. Map the prioritised use-case list from the project prioritisation framework onto the three-wave structure: all Quick Wins go to Wave 1; top Strategic Bets go to Wave 2 (after their enabling infrastructure and data quality work completes in Wave 1); Advanced use cases (real-time, generative AI, mesh) go to Wave 3.
2. Define Wave 1 success criteria before starting: '3 working use cases demonstrably used by business sponsors in their decision-making, and the core platform (ingestion + storage + BI layer) operational for the priority domains.' If Wave 1 does not meet this bar, Wave 2 funding should not be approved.
3. Map the dependencies: identify which Wave 2 use cases depend on Wave 1 platform work (e.g., markdown prediction model requires 18 months of clean inventory data — this must be collected from Month 1 of Wave 1 to be available for a Month 12 model training). Plan the data collection as a Wave 1 activity even if the model is a Wave 2 delivery.
4. Build the value accumulation curve: plot the cumulative investment (cost) and the cumulative attributed value (from business cases) on the same timeline. The curve shows the board: when do we break even? What is the 3-year return? The curve should show cash-negative in Year 1, break-even in Month 18–24, and a 2–3× return by Year 3.
5. Present the roadmap to the Steering Committee with three milestones per wave: a 'proof point' milestone (the first working use case), a 'scale milestone' (the majority of wave use cases live), and a 'value realisation milestone' (measured business value confirmed against the business case).
6. Update the roadmap quarterly: adjust wave assignments based on actual delivery pace, new use-case priorities from Phase 3 re-runs, and new platform capabilities that change feasibility.

## Real-life example — Spotify
Spotify's data platform roadmap followed the three-wave structure: Wave 1 (2015–2016) built the core Hadoop + Kafka + Hive platform and delivered 3 Quick Wins (artist performance dashboards, stream count analytics, ad campaign effectiveness); Wave 2 (2017–2018) scaled to ML use cases (Discover Weekly, Daily Mix) and self-service analytics; Wave 3 (2019+) moved to real-time personalisation, the Backstage data catalogue, and LLM-based content tagging. The value accumulation curve showed positive return by Month 20 of Wave 1, securing board commitment for the full 3-year programme.

**So what:** The three-wave roadmap with a value accumulation curve is the single most effective tool for securing and maintaining board commitment to a multi-year data programme. Showing when the investment turns positive transforms the board conversation from 'is this worth it?' to 'how do we accelerate the value?'

## Template
Populate one row per approved use case. Verify that Wave 1 is achievable within resource and timeline constraints before committing.

- [ ] Wave 1 use cases (Months 1–6): name / business sponsor / success KPI / milestone date
- [ ] Wave 1 platform work: which ingestion pipelines / governance elements / team hires must complete in Wave 1 to enable Wave 2?
- [ ] Wave 2 use cases (Months 7–18): name / business sponsor / success KPI / dependencies on Wave 1
- [ ] Wave 3 use cases (Months 19–36): name / business sponsor / maturity requirement / technology dependency
- [ ] Value accumulation curve: cumulative investment ($) and cumulative attributed value ($) by quarter
- [ ] Break-even month: when does cumulative value exceed cumulative investment?
- [ ] 3-year return: cumulative value / cumulative investment

## Pitfalls
- Wave 1 that takes more than 6 months to deliver the first working use case: counter: the programme loses credibility and funding if nothing works by the end of Wave 1. Scope Wave 1 to deliver a working result within 6 months, even if it is simpler than originally planned.
- Not planning data collection in Wave 1 for Wave 2 use cases: counter: ML models that need 18 months of clean data must start collecting that data in Month 1 of Wave 1 — even if the model is a Wave 2 delivery. Late discovery of this dependency collapses the Wave 2 timeline.
- Presenting the roadmap without the value accumulation curve: counter: a roadmap is a list of deliverables; the value accumulation curve is the reason the board should fund them. Always present both together.
