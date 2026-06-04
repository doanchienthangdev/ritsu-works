---
type: concept
slug: analytics-tools-selection-matrix
title: Analytics Tools Selection Matrix (Stack Layer Scoring)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Analytics Tools Selection Matrix (Stack Layer Scoring)

*Category: architecture · Toolkit: Data Analytics & AI Strategy*

## What it is
A variant of the technology selection matrix specifically structured for the analytics and data science stack — with six standardised evaluation criteria weighted for each layer of the modern data stack (ingestion, transformation, storage, orchestration, BI, ML platform).

**Origin:** Applied from the standard technology-selection-matrix methodology to the modern data stack by the dbt Labs community, Fivetran 'State of Data Engineering' report (2023), and the a16z 'Emerging Architectures for Modern Data Infrastructure' paper (2020). The modern data stack taxonomy (ELT pattern, cloud-native tools) has largely replaced the traditional ETL + on-premise data warehouse by 2024.

## Why it works
The analytics tools market in 2024 is crowded: Snowflake, BigQuery, Databricks, Redshift for storage; dbt, Spark, Flink for transformation; Fivetran, Airbyte for ingestion; Airflow, Prefect, Dagster for orchestration; Tableau, Power BI, Looker for BI; MLflow, Vertex AI, SageMaker for ML. The matrix prevents selection driven by vendor relationships or personal preference rather than requirements, ensuring the chosen stack serves the use-case portfolio's specific needs.

## When to use
In Phase 2 (Step 4 of Pillar 1 build and Step 3 of Pillar 3: select the tooling stack) for each layer of the analytics stack.

## Visual
`table`

## Step-by-step tutorial
1. For each stack layer, define the non-negotiable requirements from the use-case portfolio: 'Our ingestion layer must connect to Salesforce, SAP, and Snowplow in real-time; our transformation layer must support version-controlled SQL; our ML platform must support automated retraining pipelines.'
2. Eliminate tools that do not meet the non-negotiable requirements from consideration — do not evaluate them.
3. Run structured PoCs for the top-2 candidates per layer with real company data (not vendor demo data). Time the critical operations: for storage, run the 10 most common query patterns; for BI, have 3 target users navigate to answer a specific business question; for ML platform, run a complete train-deploy-monitor cycle.
4. Score each candidate on the six criteria with weights adjusted for the layer: for BI tools, weight user adoption 30% (a BI tool nobody uses is worthless); for storage, weight TCO 25% (the cost difference between cloud warehouses can be 2–3× at scale).
5. For every layer except ingestion, prioritise the tool the team already has skills for — the productivity gain from using a familiar tool typically exceeds any capability advantage of an unfamiliar one for teams below Level 3 maturity.
6. Document the decision as an ADR for each layer. Include the 3-year TCO comparison and the PoC results. The ADR protects the decision against revisitation when a new stakeholder joins and 'knows a better tool'.

## Real-life example — Figma
Figma's data stack selection (2021) chose dbt + BigQuery + Looker as their core analytics stack, with MLflow for ML experiment tracking. The selection was driven by: (1) team SQL skill (strong SQL engineers, no Spark expertise); (2) BigQuery's serverless pricing model fitting Figma's variable workload; (3) Looker's LookML semantic layer preventing metric definition drift across teams. They explicitly rejected Snowflake (comparable capability but more expensive for their query pattern) and Tableau (their team preferred code-based BI over drag-and-drop). The ADR has survived three CTO changes.

**So what:** An ADR-documented stack selection with explicit alternatives considered and reasons for rejection survives leadership changes because the reasoning is visible. Without an ADR, every new leader re-evaluates the stack based on personal experience, creating expensive migration cycles.

## Template
Complete one evaluation per stack layer. Document the PoC results and the ADR before purchasing any tooling.

- [ ] Stack layer
- [ ] Non-negotiable requirements (use-case-derived)
- [ ] Candidate tools (post-elimination of non-qualifiers)
- [ ] PoC conducted: what data, what tests, what results
- [ ] Scoring matrix: capability fit / team skillset / TCO / vendor maturity / integration / scalability (weighted scores)
- [ ] Selected tool + weighted score
- [ ] Alternatives and rejection reasons
- [ ] 3-year TCO comparison (if cost is a significant factor)
- [ ] ADR date + approver

## Pitfalls
- Evaluating tools before defining requirements: counter: requirements come from the use-case portfolio, not from vendor demos. Define requirements first; evaluate against them.
- The same tool for every layer because the team knows one vendor: counter: the modern data stack is multi-tool by design. Snowflake for storage, dbt for transformation, and Fivetran for ingestion is a better architecture than using Snowflake tasks for everything.
- Ignoring user adoption for BI tool selection: counter: the technically best BI tool that the business refuses to use is a waste. User adoption and self-service capability must be weighted heavily for BI tools.
