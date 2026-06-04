---
type: concept
slug: dimensional-modelling
title: Dimensional Modelling (Star and Snowflake Schema)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Dimensional Modelling (Star and Snowflake Schema)

*Category: architecture · Toolkit: Data Analytics & AI Strategy*

## What it is
A data modelling technique for analytical databases that organises data into facts (measurable events) and dimensions (descriptive context) in a star or snowflake schema, optimising query performance for BI and analytics workloads and making data self-documenting and business-friendly.

**Origin:** Developed by Ralph Kimball and Margy Ross, published in 'The Data Warehouse Toolkit' (1st edition, 1996). The Kimball methodology is the most widely-used approach to analytical data modelling, foundational to the Business Intelligence industry. Bill Inmon's CIF (Corporate Information Factory) is the alternative normalised approach.

## Why it works
Business analysts query data by navigating a combination of: 'what happened?' (facts: sales, clicks, transactions) and 'who/when/where/what?' (dimensions: customer, time, product, geography). Dimensional modelling structures data the way analysts think about business questions — which is why it produces 10× faster query iteration than a normalised 3NF model. The star schema also makes the data model self-documenting: the schema tells you what metrics the business cares about (the fact tables) and how they slice those metrics (the dimension tables).

## When to use
In Phase 2 (Step 3 of Pillar 1 build: defining the data model and semantic layer) when designing the canonical data model for priority business domains.

## Visual
`process-flow`

## Step-by-step tutorial
1. Identify the business process to model: choose the first fact table by asking 'what is the most important business event we measure?' (e.g., a sale, a customer event, a production batch). Each business process = one fact table.
2. Define the grain: the grain is the most atomic level of detail in the fact table. 'One row per line item on a sales order' is a specific grain. 'One row per daily sales total' is a different, less granular grain. Coarser grains are faster but cannot answer detail-level questions. Choose the finest grain that fits within the data platform's query performance budget.
3. Identify the dimensions: for the chosen business process and grain, list every way an analyst would want to filter or group the data (by customer, product, geography, time, salesperson, etc.). Each filter/group = one dimension table.
4. Build the dimension tables: populate every relevant attribute for each entity. For slowly-changing attributes (e.g., a customer's segment may change over time), implement Slowly Changing Dimension Type 2 (add a new row when the attribute changes, maintaining history).
5. Build the fact table: include only numeric measures and foreign keys to the dimension tables. Never include descriptive text in a fact table — that belongs in the dimension.
6. Define the metrics layer: on top of the dimensional model, define canonical metrics in a metrics store (dbt metrics, LookML measures) so that 'revenue' means gross revenue minus returns, inclusive of tax, in all dashboards — without embedding that definition in every dashboard individually.

## Real-life example — Airbnb
Airbnb's core data model is built on dimensional principles: a central booking_fact table (grain: one row per booking) connects to dim_guest (guest attributes including segment and acquisition channel), dim_host (host attributes including superhost status and geography), dim_listing (property attributes including category, price tier, and amenities), and dim_date. This star schema allows Airbnb's 200+ analysts to self-serve analytics across any combination of these dimensions — answering questions like 'What is the average booking value by guest segment, listing category, and quarter?' in a single SQL query without any data preparation.

**So what:** Dimensional modelling creates a data model that maps to how business analysts think about business questions — which is why it has been the foundation of enterprise business intelligence for 30 years and remains relevant in the modern data stack (dbt + Snowflake/BigQuery).

## Template
Complete one definition per fact table. Map every measure and every dimension. Review grain definition with a business analyst before building.

- [ ] Business process being modelled (e.g., sales, web visits, customer service interactions)
- [ ] Grain definition (one row per: what?)
- [ ] Fact table name + list of numeric measures
- [ ] Dimension tables: name + key attributes + SCD type (if slowly changing)
- [ ] Foreign keys in fact table pointing to each dimension
- [ ] Metrics layer: list of canonical metrics defined on this fact table with their calculation
- [ ] Known grain conflicts or fan trap risks (where joining two fact tables on a shared dimension produces incorrect aggregations)

## Pitfalls
- Choosing too coarse a grain: counter: pre-aggregated daily totals cannot be drilled into. Always choose the finest grain feasible within storage/performance constraints — you can always aggregate up, but you cannot disaggregate.
- Putting descriptive attributes in the fact table: counter: descriptions belong in dimension tables. Fact tables should contain only measures and foreign keys — this is what keeps fact tables compact and fast to scan.
- Not implementing SCD Type 2 for slowly-changing dimensions: counter: if a customer's segment changes and you do not track history, you will attribute current-segment revenue to all historical transactions — producing incorrect segment analyses.
