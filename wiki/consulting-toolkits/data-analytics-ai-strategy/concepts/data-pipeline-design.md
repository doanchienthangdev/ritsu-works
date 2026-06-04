---
type: concept
slug: data-pipeline-design
title: Data Pipeline Design (Ingestion Architecture)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Pipeline Design (Ingestion Architecture)

*Category: architecture · Toolkit: Data Analytics & AI Strategy*

## What it is
A structured design methodology for the data ingestion and transformation layer — mapping every source system to its ingestion pattern (streaming, micro-batch, or batch), specifying schema evolution handling, data quality checks at ingestion, and SLA requirements per use case.

**Origin:** Synthesised from the Lambda Architecture (Nathan Marz, 2011), the Kappa Architecture (Jay Kreps, LinkedIn, 2014), and the modern ELT (Extract-Load-Transform) pattern popularised by dbt Labs and Fivetran (2016–2020). The modern data stack has shifted from ETL to ELT, loading raw data first and transforming in the warehouse.

## Why it works
The ingestion layer is the foundation of the data platform — a poorly designed pipeline propagates bad data to every downstream use case. The key design decisions are: (1) latency requirement per use case (real-time vs batch), which determines the ingestion architecture; (2) schema evolution strategy, which determines how the pipeline handles source system changes; and (3) data quality checks at ingestion, which prevent bad data from entering the platform. Most data quality problems originate at the source, not the model.

## When to use
In Phase 2 (Step 1 of Pillar 1 build: data sources and acquisition) when designing the ingestion architecture for the data platform.

## Visual
`value-chain`

## Step-by-step tutorial
1. For each priority data source, classify the ingestion pattern: Streaming (Kafka/Kinesis) for use cases requiring <5-minute latency (fraud detection, dynamic pricing, real-time personalisation); Micro-batch (15-minute to hourly) for operational analytics requiring near-real-time; Batch (daily/weekly) for historical analytics and model training.
2. Design the schema evolution strategy: define what happens when the source system adds a column, changes a data type, or renames a field. The safest approach: land raw data in the object store with full schema preservation, transform in dbt where schema changes are versioned and tested.
3. Implement data quality checks at ingestion: for each source, define the minimum quality gates (completeness check, range checks for numeric fields, referential integrity checks for foreign keys). Reject or quarantine rows that fail; alert the data owner.
4. Define the data freshness SLA per use case: what is the maximum acceptable lag between a transaction occurring and it being available for the use case? For each use case, trace the SLA back to the ingestion layer to determine the required ingestion frequency.
5. Design for idempotency: every ingestion job must be safe to rerun without duplicating data. Use append-only staging tables with deduplication logic, or implement CDC (Change Data Capture) for operational databases.
6. Document the ingestion map as a table: source system → ingestion tool → pattern → frequency → SLA → owner → quality checks. This becomes the operational reference for the data engineering team.

## Real-life example — DoorDash
DoorDash's data pipeline supports real-time operational analytics and ML: order events flow through Kafka (streaming) to enable real-time delivery-time predictions and surge pricing; historical order data is loaded nightly via Fivetran from the PostgreSQL operational database; third-party restaurant and driver supply data is loaded via batch API. The ingestion layer implements schema registry via Apache Schema Registry to manage schema evolution across the Kafka topic ecosystem, preventing 'schema drift' from breaking downstream models.

**So what:** Designing the ingestion layer by use-case latency requirement (real-time vs batch) and implementing schema evolution controls at ingestion prevents the most expensive data engineering failures: silent schema changes that break production models.

## Template
Complete one row per source system. Every row must specify the ingestion pattern, SLA, and quality checks before the pipeline is built.

- [ ] Source system name and type (transactional DB, SaaS API, file, stream)
- [ ] Priority use cases consuming this source
- [ ] Required data freshness SLA (max acceptable lag for the most demanding use case)
- [ ] Ingestion pattern: Streaming / Micro-batch / Batch / CDC
- [ ] Ingestion tool: Kafka / Kinesis / Fivetran / Airbyte / custom connector
- [ ] Schema evolution strategy: how are schema changes in the source handled?
- [ ] Quality checks at ingestion: completeness / range / referential integrity / custom
- [ ] Data owner (who is notified when quality checks fail?)
- [ ] Landing zone path (where does raw data land in the object store?)

## Pitfalls
- Using real-time streaming for all use cases: counter: streaming is significantly more expensive and complex than batch. Only use streaming when the use case genuinely requires <5-minute latency. Most analytics use cases are fine with daily or hourly batch.
- No quality checks at ingestion: counter: bad data discovered at the model layer requires tracing back through the pipeline to the source — which takes weeks. Quality checks at ingestion fail fast and create accountability at the source.
- Point-to-point integrations (every system connects directly to every other system): counter: this creates an n-squared integration complexity problem. Use an ingestion layer (Fivetran/Airbyte or Kafka) as the hub so each source has one integration, not one per consumer.
