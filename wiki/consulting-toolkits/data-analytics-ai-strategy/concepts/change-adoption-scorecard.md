---
type: concept
slug: change-adoption-scorecard
title: Change Adoption Scorecard
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: change
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Change Adoption Scorecard

*Category: change · Toolkit: Data Analytics & AI Strategy*

## What it is
A monthly measurement framework that tracks the adoption of data-driven decision-making across the organisation along four dimensions — Awareness, Adoption, Proficiency, and Culture — providing the CDO and Steering Committee with a leading indicator of whether the change management programme is working.

**Origin:** Derived from the Prosci ADKAR measurement framework (2019) and the Gartner 'Data Literacy Measurement' model (2021). The four-dimension structure (Awareness, Adoption, Proficiency, Culture) mirrors the ADKAR outcomes (Awareness, Ability, Knowledge, Reinforcement) and provides a measurable, comparable scorecard across functions and over time.

## Why it works
Change management without measurement is hope management. The adoption scorecard provides the CDO with evidence that the change programme is working — or early warning when it is not — before the failure becomes visible in the business value metrics. The four dimensions provide a diagnostic: if Awareness is high but Adoption is low, the problem is Desire or Ability; if Adoption is high but Proficiency is low, the problem is training depth; if Proficiency is high but Culture is low, the problem is reinforcement.

## When to use
In Phase 6 (Step 4: track, measure and reinforce change) from programme launch. Maintain as a permanent quarterly operational review after the formal programme ends.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. Establish baselines for all four metrics before any change management activities begin: this is the starting point against which progress is measured. Run the Awareness pulse survey, audit BI usage, review 20 recent business decisions for data exhibits, and administer the data literacy assessment — all before the programme launch.
2. Implement the monthly Adoption measurement: BI tool usage analytics are the most objective measure. Define 'active user' as ≥1 dashboard session or model output accessed in the last 30 days. Set the target by stakeholder group (C-suite: 90% of monthly business reviews include a data exhibit; managers: 60% active monthly users; analysts: 100% active monthly users).
3. Implement the monthly Proficiency measurement: the most objective method is a Decision Log — a record of 10 significant decisions per function per month with a field 'Was a data exhibit reviewed in making this decision? (Y/N)'. For functions without a Decision Log, use a monthly manager survey (5 questions, 5 minutes, response rate target ≥80%).
4. Investigate low-adoption areas before monthly review: for any function where Adoption falls below 50%, conduct a 2-question interview with 3 users: 'What is the main reason you are not using the platform?' and 'What would make it easier?'. Bring the findings to the Steering Committee with a specific remediation action.
5. Present the adoption scorecard to the Steering Committee monthly alongside the value realisation update. Connect the scorecard to the value: 'Functions with Adoption ≥70% are realising 1.8× more business value per use case than functions with Adoption <40%.'
6. At the end of the programme, the adoption scorecard becomes the quarterly operational review for the CDO function — it is the ongoing measurement of whether the culture change is being sustained.

## Real-life example — Heineken
Heineken's data transformation programme used an adoption scorecard reviewed monthly by the Steering Committee. At Month 6, the scorecard revealed high Awareness (82%) but low Adoption in the Supply Chain function (31% vs 70% target). Investigation found the root cause: the supply chain dashboards were built for the central planning team but supply chain decisions were made at the brewery level — the wrong users were targeted. The remediation: rebuild the key dashboard for brewery operations managers and run targeted training in Week 8. By Month 9, Supply Chain Adoption had reached 68%.

**So what:** The adoption scorecard's diagnostic value is greatest when it disaggregates by function — a programme-level average of 65% adoption can hide a critical function at 20% and a non-critical function at 90%. Always track adoption by stakeholder group, not just in aggregate.

## Template
Establish baselines before programme launch. Review monthly by function. Bring to Steering Committee monthly alongside value realisation.

- [ ] Awareness: baseline (%) / current (%) / target (%) / measurement method / data from which survey or source
- [ ] Adoption: baseline (%) / current (%) / target (%) by stakeholder group / measurement method / BI usage data source
- [ ] Proficiency: baseline (%) / current (%) / target (%) by stakeholder group / measurement method (Decision Log or survey)
- [ ] Culture (Literacy): baseline score / current score / target improvement (%) / assessment date / assessment method
- [ ] Functions below target: list of functions below target for each dimension + root cause + remediation action
- [ ] Trend: are all four dimensions improving month-on-month? (Y/N per dimension)

## Pitfalls
- Measuring only Adoption (platform usage) without Proficiency (quality of use): counter: a user who opens the dashboard daily but only looks at the last entry without acting on it scores high on Adoption but low on Proficiency. Both dimensions are required.
- Programme-level aggregate that masks function-level failures: counter: always disaggregate by function. A 65% aggregate adoption rate can mask a critical function at 20% that is blocking the programme's most important use case.
- Abandoning the scorecard when the formal programme ends: counter: the adoption scorecard should become a permanent quarterly review for the CDO. Culture change takes 18–36 months; the scorecard is the early warning system for backsliding.
