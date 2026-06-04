---
type: concept
slug: data-source-mapping
title: Data Source Mapping
source_collection: consulting-toolkits
toolkit: executive-dashboard
domain: metrics
category: metrics
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Data Source Mapping

*Category: metrics · Toolkit: Executive Dashboard*

## What it is
A structured inventory documenting, for each KPI, the system of record (source database or application), the specific table/field/query, the data owner, the refresh frequency, and the data extraction method. It is the data architecture specification that makes a dashboard maintainable.

**Origin:** Data source documentation is a standard deliverable in data governance frameworks (DAMA International Data Management Body of Knowledge, DMBOK) and in enterprise data warehouse design methodologies (Kimball, Inmon). Applied to executive dashboards as a lightweight operational practice.

## Why it works
Dashboards fail most often not because of design failures but because of data failures: the source system changes, the data owner leaves, the extraction process breaks. A data source map documents the 'how does this number get here?' for every metric, so that when something breaks, the responsible team can trace and fix it in minutes rather than hours.

## When to use
Create during Phase 2 (Functional Dashboards) before building any data Input tab. Update as part of any system change or dashboard redesign.

## Visual
`table`

## Step-by-step tutorial
1. For each KPI in the KPI Dictionary, add a row in the Data Source Map.
2. Name the source system exactly: not 'CRM' but 'Salesforce.com, Production org, sf.salesforce.com/XXXXX'.
3. Specify the extraction method: manual export to CSV; scheduled ODBC connection; Power Query refresh; API call via Python script.
4. Name the data owner by role and name — the person who is accountable when the data is late or wrong.
5. Record the refresh frequency (daily, weekly, monthly) and the data availability deadline (e.g., 'available by 9am on the 3rd business day of the following month').
6. Document known data quality issues in the last column — this prevents re-discovering the same issues each month.

## Real-life example — A multinational professional services firm
The firm's partner dashboard included Revenue, Utilisation, and Realisations KPIs sourced from three different systems (Finance ERP, Project Management Tool, and HR System). When the HR system was upgraded in Q3, the Utilisation data stopped flowing. Because the data source map was up-to-date, the IT team identified the break within 2 hours (the extraction query used a field name that changed in the new system version) and restored the data feed without the finance team needing to escalate to IT management.

**So what:** The data source map pays for itself the first time a data feed breaks: the difference between a 2-hour fix and a 3-day crisis is having the map.

## Template
Complete one row per KPI. This document is maintained by the Finance/FP&A team and reviewed quarterly.

- [ ] KPI Name: [link to KPI Dictionary]
- [ ] Source System: [exact name and environment]
- [ ] Table / Field / Report: [precise location within the system]
- [ ] Extraction Method: [manual export / Power Query / API / ODBC / etc.]
- [ ] Data Owner: [name + role]
- [ ] Refresh Frequency: [daily / weekly / monthly]
- [ ] Data Availability: [hours or days after period close]
- [ ] Known Quality Issues: [any systematic limitations or known discrepancies]

## Pitfalls
- Treating the data source map as a one-time deliverable — systems change; the map must be updated whenever a source system is upgraded or replaced.
- Using vague source descriptions ('from Finance') — vague descriptions are useless when the data breaks; names must be specific enough to find the problem independently.
