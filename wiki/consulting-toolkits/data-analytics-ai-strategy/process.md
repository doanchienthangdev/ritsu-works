---
type: process
slug: data-analytics-ai-strategy
title: Data Analytics & AI Strategy — Process
source_collection: consulting-toolkits
domain: technology
model_name: The 6-phase Data Analytics & AI Strategy (Strategy → 4 Pillars → Use Cases → Business Cases → Roadmap → Change Management)
---
# Data Analytics & AI Strategy

**A proven 6-phase system to design and execute a data analytics and AI strategy that delivers measurable business value.**

*What you are really buying: the structured capability to move from ad-hoc reporting to a data-driven operating model — auditing what you have, designing the right platform architecture, governing data so it is trusted, deploying analytics and AI against proven use cases, and measuring whether any of it is producing real business value.*

---

## When to Use This Toolkit

This toolkit is the right tool when:
- A board or executive asks 'how do we actually use AI?' and no one has a credible answer
- Data quality is blocking decisions — two analysts produce different revenue numbers from the same database
- The analytics team produces dashboards nobody acts on
- The company has multiple data sources but no single source of truth
- A CDO or CTO needs a defensible 3-year data roadmap to present to the board
- An organisation is launching a major digital or AI transformation and needs a structured programme framework

**Primary audience:** Chief Data Officers, CTOs, strategy consultants advising on digital and AI transformation, analytics leaders rebuilding their team, executives sponsoring AI initiatives.

---

## The Process at a Glance

| Phase | Goal | Key Question | Deliverable | Gate |
|-------|------|-------------|-------------|------|
| 1. Define Strategy | Signed-off strategy with vision, objectives, budget | What do we want to achieve and how mature are we? | Strategy document: vision, KPIs, team plan | CEO + CFO sign-off |
| 2. Build 4 Pillars | Infrastructure, governance, tools, organisation | What must we build to deliver the objectives? | 4-pillar architecture and org plan | Data governed; platform Wave 1 live |
| 3. Identify Use Cases | Prioritised portfolio of analytics and AI initiatives | Which use cases deliver the most value first? | Value-feasibility portfolio: top 15 use cases | Business sponsors validate top 10 |
| 4. Build Business Cases | Financial models for each priority use case | Does each use case justify its investment? | Investment portfolio: NPV, payback, sensitivity | CFO approves financial methodology |
| 5. Prioritise and Implement | Deliver the use-case portfolio in three waves | How do we deliver on time and within budget? | Running project portfolio; 3 use cases live in Wave 1 | Wave 1 delivers 3+ working use cases |
| 6. Change Management | Embed data-driven behaviours | How do we make this stick after the programme? | Change management system; adoption scorecard | Data in management routines |

---

## Phase 1: Define the Data Analytics & AI Strategy — Set the Direction Before Touching Any Technology

**Goal:** Produce a signed-off strategy document that captures the corporate context, current and target maturity, vision/mission/values, strategic objectives and KPIs, team and budget plan, and guiding principles.

**Key question:** What do we want to achieve with data analytics and AI, how mature are we today, and what is the plan to close the gap?

**Duration:** 4–8 weeks.

### Step 1.1: Summarise the Corporate and Business Strategy

Review the company's 3–5 year strategic plan and identify the three to five strategic priorities that data analytics and AI must directly enable. The data strategy must be in service of these priorities — not a parallel tech programme. Document the connection explicitly so every subsequent investment can be traced back to a corporate objective.

*Input:* Corporate strategic plan, annual report, CEO/CFO/COO interviews.
*Output:* Strategy summary — 3–5 corporate priorities that data and AI must enable.
*Owner:* CDO / Strategy lead (R), CEO (A).

### Step 1.2: Assess Current and Define Target Maturity

Run a structured maturity assessment using the **Data & Analytics Maturity Model** (5 levels: Ad-hoc → Foundational → Managed → Advanced → Transformational), scoring six dimensions: data governance, analytics capability, data platform, AI/ML capability, data culture, and value measurement. Produce a radar chart of current vs target state. The target should be calibrated to what the strategic priorities require — not simply 'as high as possible'.

*Input:* Stakeholder interviews, existing architecture docs.
*Output:* Maturity radar — current score per dimension, 3-year target, gap analysis.
*Owner:* CDO (R), business unit leaders (C).

### Step 1.3: Define Vision, Mission and Values

Facilitate a half-day workshop with senior leadership to articulate: Vision (where will data and AI take the organisation?), Mission (what does the data function exist to do?), and Values (non-negotiable principles — e.g., 'data quality before data volume', 'privacy by design', 'explainable AI in customer-facing decisions'). The vision must be specific enough to make trade-offs clear.

*Input:* Corporate strategy summary, maturity gap analysis.
*Output:* One-page Data Analytics & AI Vision, Mission and Values statement.
*Owner:* CDO (R), CEO and ExCo (A).

### Step 1.4: Define Strategic Objectives and KPIs

Translate the vision into 4–8 strategic objectives in OKR format. For each, define 2–4 measurable KPIs with baseline values, targets, and measurement cadence. Two tiers: Tier 1 (business outcomes — revenue from AI-powered features, cost avoidance from automation) and Tier 2 (leading indicators — data quality scores, model accuracy, dashboard adoption).

*Input:* Vision/Mission/Values, maturity gap analysis.
*Output:* Strategic objectives and KPI tree.
*Owner:* CDO (R), CFO and ExCo (A).

### Step 1.5: Size the Team and Budget

Build the headcount model bottom-up from the use-case roadmap. Benchmark against industry standards (1 data engineer per 3 data scientists). Model the 3-year platform infrastructure cost. Present as a zero-based budget with a clear return model.

*Input:* Preliminary use-case portfolio, cloud pricing, market salary data.
*Output:* 3-year team and budget plan: headcount roadmap, infrastructure cost, value model.
*Owner:* CDO + CFO (R).

### Step 1.6: Define Guiding Principles

Articulate 6–10 guiding principles that govern decisions when there are competing priorities: 'Build once, use many times', 'No AI in production without human-in-the-loop for high-stakes decisions', 'Data quality is a prerequisite for AI deployment', 'Responsible AI: fairness, explainability, and privacy are non-negotiable'.

*Input:* Vision/Mission/Values, regulatory environment.
*Output:* Guiding principles document with rationale.
*Owner:* CDO (R), Legal/Compliance (C).

**Phase 1 deliverable:** Data Analytics & AI Strategy document.
**Phase 1 gate:** Strategy signed off by CEO, CDO and CFO — including budget and KPI targets.

---

## Phase 2: Build the 4 Pillars — Create the Structural Foundations

**Goal:** Design and implement the four enablers that make the strategic objectives achievable: Data Management & Infrastructure, Data Governance & Compliance, Analytics Tools & Techniques, and Data-Driven Organisation.

**Key question:** What infrastructure, governance, tools and organisational capabilities must we build?

**Duration:** 6–18 months, phased in waves.

### Pillar 1: Data Management & Infrastructure

Design the end-to-end data platform: (1) **Data sources and acquisition** — inventory all source systems, design ingestion patterns (streaming via Kafka/Kinesis, batch ETL, API); (2) **Data storage and processing** — choose the architecture pattern (Warehouse/Lake/Lakehouse/Mesh) based on use-case requirements; (3) **Data integration and ETL** — implement dbt transformations, apply star-schema for analytics; (4) **Data quality and cleansing** — automated quality checks (completeness, accuracy, timeliness), publish a quality scorecard; (5) **Scalability** — design for 3-year data growth, model cost.

Frameworks used: Data Architecture Patterns, Data Pipeline Design, Dimensional Modelling.

### Pillar 2: Data Governance & Compliance

Three pillars: **People** (Data Owners, Data Stewards, Data Governance Council), **Policies** (data classification, retention, access control, GDPR/CCPA compliance, data ethics), and **Processes** (issue resolution, schema-change management, quality SLA enforcement). Implement a data catalogue as the operational surface — governance that lives in a PDF is not governance.

Framework used: Data Governance Framework (DAMA-DMBOK).

### Pillar 3: Analytics Tools & Techniques

Five layers: (1) **Data visualisation** — BI platform (Tableau, Power BI, Looker) plus semantic/metrics layer; (2) **Statistical analysis** — experimentation platform, A/B testing framework; (3) **Machine learning** — ML platform (MLflow, Vertex AI, SageMaker); (4) **Big data tools** — Spark/Databricks for large-scale processing; (5) **Data preparation** — dbt for version-controlled SQL transformations. Evaluate via an Analytics Tools Selection Matrix.

### Pillar 4: Data-Driven Organisation

Five capability builds: (1) **Analytics org model** — centralised, federated, or hub-and-spoke; (2) **Data literacy programme** — three-tier curriculum; (3) **Skills development** — analytics engineer, data scientist, analytics translator role architecture; (4) **User-friendly infrastructure** — self-service with guardrails, certified data marketplace; (5) **Experimentation culture** — monthly data hackathons, A/B testing platform.

**Phase 2 deliverable:** Four-pillar architecture — data platform design, governance framework, analytics tools stack, org transformation plan.
**Phase 2 gate:** Pillar readiness — is the priority data governed and quality-scored before use-case delivery begins?

---

## Phase 3: Identify Use Cases — Build and Prioritise the Portfolio

**Goal:** Build an exhaustive, prioritised portfolio of data analytics and AI use cases across all functions.

**Key question:** What are the highest-value analytics and AI use cases, and which should we fund first?

**Duration:** 4–6 weeks.

### Step 3.1: Map Use Cases to Functions and AI Technologies

Run use-case discovery workshops with every major function: Strategy, Sales, Marketing, Supply Chain, Customer Service, HR, Finance, IT, Legal, Data Analytics. For each function ask: 'What decisions are unsupported by data?' and 'What processes would you automate?'. Map each use case to its AI technology type: Machine Learning, Deep Learning, Generative AI/LLMs, or Automation.

Target: 50–100 candidate use cases across all functions.

### Step 3.2: Prioritise Using the Value-Feasibility Matrix

Score every use case on Business Value (1–10) and Implementation Feasibility (1–10). Plot on the 2×2 matrix to segment into Quick Wins (top-right), Strategic Bets (top-left), Easy Fills (bottom-right), and Deprioritise (bottom-left). Select the top 15 use cases for business-case development.

The most important discipline: do not let the data team score value alone — business sponsors must co-validate the value dimension.

**Phase 3 deliverable:** Prioritised use-case portfolio: 50–100 candidates, top 15 selected.
**Phase 3 gate:** Business-sponsor-validated top 10, each with a named sponsor willing to own value delivery.

---

## Phase 4: Build Business Cases — Justify Every Investment

**Goal:** For each priority use case, build a rigorous business case quantifying financial return, investment required, and risk.

**Key question:** Does each use case justify its investment?

**Duration:** 4–8 weeks (overlaps with Phase 3).

### Step 4.1: Build the Financial Model

For each of the top 10–15 use cases, build a DCF model with three scenarios (base, upside, downside). Quantify the value driver: revenue uplift (personalisation, pricing), cost reduction (automation, efficiency), risk reduction (fraud, churn), or speed-to-decision. Calculate 3-year NPV and payback period. A budget without a value model will not survive the next economic cycle.

### Step 4.2: Validate Assumptions

Stress-test the models: identify the top 3 assumptions driving each NPV, run sensitivity analysis (impact if the key assumption is wrong by 20%), identify data-quality or technical risks that most threaten the return. Present to business sponsors and CFO. Use cases failing the sensitivity test are de-scoped or deferred.

**Phase 4 deliverable:** Investment portfolio — validated business cases with NPV, payback, sensitivity analysis.
**Phase 4 gate:** CFO approves financial model methodology and top-5 funded use cases.

---

## Phase 5: Prioritise, Plan and Implement — Deliver in Three Waves

**Goal:** Build and execute the project portfolio with the right methodology, governance, and continuous improvement.

**Key question:** How do we deliver the portfolio on time and within budget?

**Duration:** Ongoing; Wave 1 (0–6 months), Wave 2 (6–18 months), Wave 3 (18–36 months).

### Three-Wave Delivery Architecture

**Wave 1 — Foundation (0–6 months):** Build trusted data, core pipelines, deliver 3–5 Quick Win use cases. Must prove value within 90 days to maintain stakeholder confidence. The single most important thing a data programme does is build credibility — one working, trusted dashboard used by a C-suite sponsor is worth more than ten dashboards nobody trusts.

**Wave 2 — Scale (6–18 months):** Self-service analytics, additional domains, top Strategic Bets from the value-feasibility matrix. ML models in staging and production.

**Wave 3 — Advanced (18–36 months):** ML at scale, real-time analytics, generative AI applications, data mesh if the organisation has reached Level 4+ maturity.

### Methodology Selection

- **Agile/Scrum** for iterative analytics and AI products (2-week sprints, continuous delivery)
- **CRISP-DM** layered on top of Agile for every ML use case (Business Understanding in Sprint 0, Deployment in the final sprint)
- **Design Thinking** for use cases requiring deep user research (empathise → define → ideate → prototype → test)
- **Traditional/Waterfall** for data infrastructure projects with fixed requirements and regulatory sign-off

### MLOps for Production Reliability

Every ML model in production must have: a model registry (MLflow, Vertex AI), automated retraining pipelines, monitoring dashboards (data drift, model drift, prediction distribution), champion/challenger deployment, and a human-in-the-loop escalation protocol. A model without monitoring will silently degrade.

**Phase 5 deliverable:** Running project portfolio — priority list, 3-year roadmap, governance structure, delivered use cases.
**Phase 5 gate:** Wave 1 delivers 3+ working use cases that demonstrably change a business decision.

---

## Phase 6: Change Management — Make It Stick

**Goal:** Ensure the organisation has the will, skills and management routines to adopt data-driven and AI-enabled ways of working permanently.

**Key question:** How do we make data-driven decision-making the default operating mode?

**Duration:** Concurrent with all phases; intensifies during Phases 4–5.

### ADKAR Change Framework

Apply the ADKAR model to map each stakeholder group to their change readiness: **Awareness** (do they know why this matters?), **Desire** (do they want to change?), **Knowledge** (do they know how?), **Ability** (can they do it?), **Reinforcement** (what keeps them doing it?). Design targeted interventions for each stage rather than a generic comms plan.

The hardest groups: senior leaders often have Awareness but lack Desire if data challenges their intuition — this is the most important group to address and the one most often ignored.

### Communication Strategy

Apply the Pyramid Principle to every communication: lead with the so-what (impact), then the story, then the data. The most powerful communication tool is a real story of a business decision that was better because of data — with a named executive as the protagonist.

### Adoption Measurement

Change adoption scorecard tracking: awareness (% who can articulate the data strategy), adoption (% actively using analytics products), proficiency (% citing data in business reviews), culture (data literacy scores, data-driven decisions per team per month). Review monthly; investigate low-adoption areas with targeted support, not more training.

**Phase 6 deliverable:** Change management system — ADKAR strategy, stakeholder plans, communication calendar, adoption scorecard.
**Phase 6 gate:** Data-driven decision-making embedded in management routines (business reviews, ExCo dashboards, hiring criteria).

---

## The Frameworks and Tools

### Data & Analytics Maturity Model

A five-level benchmarking model (Ad-hoc → Foundational → Managed → Advanced → Transformational) scoring six dimensions: data governance, analytics capability, data platform, AI/ML capability, data culture, and value measurement. The model provides a common language across business and IT, surfaces dimension-level gaps, and creates a measurable baseline. Run annually to track progress.

**Tutorial:** (1) Run a 2-hour self-assessment workshop with 15–20 leaders. (2) Score each of 6 dimensions 1–5 with a named evidence artefact. (3) Plot the radar chart (current vs 3-year target). (4) Identify the 2–3 dimensions with the largest gaps — these are the strategy priorities. (5) Validate with examples: name a concrete artefact for every score above 3. (6) Rerun annually.

**Pitfalls:** Self-assessment inflation (counter: require named artefacts for every score above 3). Treating Level 5 as the universal target (counter: calibrate the target to what the strategic priorities actually require).

### Value-Feasibility Matrix (Use-Case Prioritisation)

A 2×2 matrix plotting analytics and AI use cases by business value (y-axis) against implementation feasibility (x-axis) to produce an investment-priority sequence. The matrix forces an explicit trade-off conversation and ensures the portfolio is sequenced so early wins fund later complexity.

**Tutorial:** (1) List ≥15 candidate use cases. (2) Score each on Business Value (1–10). (3) Score each on Implementation Feasibility (1–10). (4) Plot on the 2×2. (5) Label quadrants: Quick Wins (tr), Strategic Bets (tl), Easy Fills (br), Deprioritise (bl). (6) Review the matrix with business sponsors — never let the data team score value alone.

**Pitfalls:** Technical team scores value without business input. Over-indexing on feasibility (building easy things that don't matter).

### CRISP-DM

The six-phase standard process for machine learning projects: Business Understanding → Data Understanding → Data Preparation → Modelling → Evaluation → Deployment. Used for every AI/ML use case from a simple regression to an LLM application. The most important discipline: treat Deployment as a first-class phase, not an afterthought.

### Data Governance Framework (DAMA-DMBOK)

A structured system of people (Data Owners, Data Stewards, Data Governance Council), policies (classification, retention, access control, GDPR compliance, data ethics), and processes (issue resolution, schema-change management, quality SLAs). Without governance, metrics definitions drift and regulatory violations become inevitable.

### Data Architecture Patterns

Four reference patterns: Data Warehouse (structured, BI-heavy, strong governance, fast queries), Data Lake (flexible, all formats, cheap storage, governance must be imposed), Data Lakehouse (hybrid: ACID on the lake, BI + ML on one platform, the default for new enterprise builds 2023+), Data Mesh (domain-decentralised ownership, data as a product, requires Level 4+ organisational maturity).

### LLM & Generative AI Strategy (Build / Buy / Fine-tune)

A decision framework routing each generative AI use case to the right approach based on data sovereignty needs and domain specificity: Cloud API + prompting (default for all new use cases), RAG + Cloud API (for knowledge-intensive applications — 80% of enterprise use cases), Self-hosted fine-tuned model (regulated industries needing domain language), Proprietary model (core IP, large scale, >$50M AI budget).

### MLOps Framework

The set of practices — CI/CD pipelines for model training and deployment, model versioning, automated retraining triggers, canary deployment, model registry — that keeps models performing in production. Without MLOps, models degrade silently. The core discipline: a model in a notebook is not a business asset.

### ADKAR Change Model

A five-element change management model (Awareness, Desire, Knowledge, Ability, Reinforcement) that maps each stakeholder group to their change readiness and prescribes targeted interventions. The model prevents the most common change failure: treating a data transformation as a technology project and ignoring the human system.

---

## A Worked End-to-End Example: RetailCo's Data Analytics & AI Transformation

RetailCo is a $3B omnichannel retailer with 400 stores and a growing e-commerce operation. The CEO wanted to double the e-commerce contribution margin within 3 years. The CDO was hired in January 2023 with a mandate to build a data and AI capability.

**Phase 1 (Months 1–2):** The CDO interviewed the CFO, CMO, COO, and Head of E-commerce. The top 5 corporate priorities requiring data: (1) personalise e-commerce to increase conversion, (2) optimise inventory to reduce markdowns, (3) predict customer churn, (4) dynamic pricing for high-velocity SKUs, (5) reduce supply chain lead time. Maturity assessment scored the organisation at 1.8 out of 5 overall — Ad-hoc on data governance, Foundational on analytics capability. The 3-year target: Managed (3.5) overall. Vision: 'RetailCo uses data to know every customer better than they know themselves, and to never be out of stock of what they want.' Budget: $12M over 3 years. Guiding principle #1: 'No personalisation without consent and transparency.'

**Phase 2 (Months 2–8):** The team built the data platform on Snowflake (lakehouse pattern — structured data dominated, team was Level 2 maturity, not ready for mesh). Ingestion: Fivetran pulling from POS, e-commerce platform, CRM, and inventory system. Transformation: dbt with a canonical customer and product data model. Data governance: appointed 4 Domain Owners (Finance, Marketing, Operations, E-commerce), launched the Data Governance Council in Month 3, published a business glossary with 120 terms. Analytics tool: Power BI with a metrics layer (so 'revenue', 'margin', and 'active customer' meant the same thing in every report for the first time). Org model: hub-and-spoke — a central team of 8 (4 data engineers, 2 analytics engineers, 2 data scientists) plus embedded analytics translators in each function.

**Phase 3 (Month 3):** Use-case discovery workshops across 8 functions produced 72 candidate use cases. Top Quick Wins: (1) unified customer 360 dashboard for the marketing team (high value, high feasibility — data existed, just wasn't connected), (2) inventory markdown prediction (high value, feasibility medium — needed 18 months of historical data), (3) personalised email recommendations (high value, high feasibility — customer data + purchase history available). Top Strategic Bets: (1) real-time dynamic pricing (high value, low feasibility — required real-time pipeline not yet built), (2) demand forecasting at SKU-store level (very high value, low feasibility — data quality issues in the inventory system).

**Phase 4 (Month 4):** Business cases for the top 10 use cases. Personalised email recommendations: investment $350K (build + 2-year run), value $2.1M NPV from 1.4% conversion lift on email (based on industry benchmarks, downside scenario 0.7% lift). Markdown prediction: investment $500K, value $3.8M NPV from 2% reduction in markdown rate on $190M markdown pool. Both passed the sensitivity test at the downside scenario.

**Phase 5 (Months 5–18):** Wave 1 delivered: (1) customer 360 dashboard (Month 7 — used by CMO in every weekly trading review within 4 weeks of launch), (2) personalised email recommendations (Month 9 — A/B test showed 1.8% conversion lift, beating the business case), (3) markdown prediction model (Month 12 — CRISP-DM: business understanding confirmed the objective, data preparation took 6 weeks due to inventory data quality, first model beat the baseline in Month 11, deployed Month 12). By Month 18: $4.7M in measured value attributed, against a $4.2M investment to date.

**Phase 6 (concurrent):** ADKAR mapping showed senior buyers (CMO, Head of Buying) had Awareness but lacked Desire — they felt the models threatened their judgment. Solution: the data team ran joint 'model + merchant' sessions where the model recommendation and the merchant's intuition were presented side-by-side. The model was right 68% of the time; the merchant added value 32% of the time. This collaborative framing shifted Desire from resistance to advocacy. By Month 12, 100% of weekly trading reviews included a data exhibit.

**Outcome at 36 months:** Maturity score moved from 1.8 to 3.4. Total value attributed: $18.7M against a $12M investment — 1.56× return in 3 years, on track to 3× by Year 5. E-commerce contribution margin grew from 8% to 13%.

---

## Templates

### Template 1: Data Analytics & AI Strategy One-Page Summary

Use this template to document and communicate the strategy at a single-page level for board and ExCo audiences.

Sections: Corporate context (3–5 strategic priorities data must enable), Maturity assessment (current vs target radar), Vision and Mission (2 sentences each), Strategic Objectives (4–8 OKRs), Top-5 use cases (name, value, wave), Team and budget (3-year summary), Guiding principles (6–10 bullet points).

### Template 2: Use-Case Business Case (per use case)

Structure: (1) Use case definition (what decision does this change?), (2) Value model (revenue uplift / cost reduction / risk reduction / speed — $ quantified, 3 scenarios), (3) Investment (build cost, run cost, change management cost), (4) NPV and payback (base, upside, downside), (5) Sensitivity analysis (top 3 assumptions, impact of being wrong by 20%), (6) Dependencies and risks, (7) Recommended wave and business sponsor.

### Template 3: Programme Dashboard (RAG Status)

Weekly programme status for the Steering Committee: Project RAG (Red/Amber/Green), milestone delivery vs plan, budget vs actual (cumulative), value realised vs business case (cumulative), top risks and mitigations, decisions required.

---

## Pitfalls and Best Practices Across the Process

**Top failure modes:**

1. **Building the platform before defining the use cases.** Counter: the use-case portfolio is the design input for the architecture, not the reverse. Every architecture decision is justified by a use case it enables.

2. **Treating data governance as IT's problem.** Counter: Data Owners must be business leaders (the CMO owns marketing data quality, the CFO owns financial data quality). IT is the steward, not the owner.

3. **Deploying AI on ungoverned data.** Counter: the governance gate in Phase 2 is explicit — no AI is deployed on data that has not been quality-scored and governed. A personalisation model trained on incomplete customer data produces worse recommendations than a rule-based system.

4. **Measuring model accuracy instead of business impact.** Counter: the only metric that matters is whether the deployed model changes a business decision in the direction of better outcomes. An AUC of 0.95 on a model nobody uses is worth nothing.

5. **Ignoring change management.** Counter: the biggest risk to any data programme is not technical — it is that the business reverts to making decisions by intuition after the programme team moves on. Change management must run concurrently from Phase 1.

6. **Fine-tuning LLMs as the default.** Counter: 80% of generative AI use cases are better served by RAG + prompt engineering. Fine-tune only when a held-out evaluation set proves a material improvement over the base model.

7. **Building dashboards, not decisions.** Counter: every dashboard has a named decision-maker as its primary user. The dashboard owner is responsible for ensuring the insight drives an action, not merely a view.

---

## Sources

See sources section for full citations. Key references: DAMA-DMBOK2 (data governance), CRISP-DM 1.0 (ML process), Google MLOps paper (2020), McKinsey Global Institute 'The Age of Analytics' (2016), Databricks Lakehouse paper (2020), Zhamak Dehghani data mesh principles (2019), Andreessen Horowitz LLM stack paper (2023), VentureBeat 87% production failure rate (2019), Prosci ADKAR model.
