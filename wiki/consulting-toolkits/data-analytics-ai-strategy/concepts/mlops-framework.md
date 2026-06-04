---
type: concept
slug: mlops-framework
title: MLOps Framework
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: AI/ML
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# MLOps Framework

*Category: AI/ML · Toolkit: Data Analytics & AI Strategy*

## What it is
A set of practices, processes and tooling that applies DevOps discipline to the full ML lifecycle — training, versioning, deployment, monitoring and retraining — keeping models performing reliably in production after deployment.

**Origin:** Coined by Databricks (2015); formalised by Google's 'MLOps: Continuous Delivery and Automation Pipelines in Machine Learning' (2020), defining three maturity levels. Endorsed by the Linux Foundation MLOps SIG.

## Why it works
A model that is not monitored will silently degrade — data distributions shift, the world changes, and training data no longer reflects reality. MLOps applies CI/CD discipline to ML, adapted for the unique challenge that a model has two inputs: code AND data. Without MLOps, AI investments erode within months of deployment. The feature store concept addresses training-serving skew (the single most common failure mode: features computed differently in training vs serving).

## When to use
For every model deployed to production in Phase 5. Rigour scales with business criticality: fraud detection (revenue + compliance) needs full MLOps; an internal scheduling tool needs only basic versioning.

## Visual
`process-flow`

## Step-by-step tutorial
1. Audit existing production models: for each, document (1) training data version, (2) whether training code is version-controlled, (3) whether any monitoring is in place. Most organisations find 50–80% of production models are unmonitored — this is the baseline.
2. Implement a model registry (MLflow, Vertex AI Model Registry, or SageMaker): every model versioned, performance metrics documented on a held-out test set, named owner accountable for production behaviour.
3. Build automated retraining pipelines for the top-5 most business-critical models: define the data-drift threshold and retraining cadence (event-triggered on drift breach, or time-triggered weekly for lower-stakes models).
4. Set up three-layer monitoring: (1) data quality (input feature distributions vs training baseline, using PSI for categorical, KS test for continuous), (2) model performance (accuracy, AUC, RMSE on labelled ground-truth sample), (3) prediction distribution (are model outputs in the expected range?).
5. Implement champion/challenger deployment: new model serves 10% of traffic until it demonstrably outperforms the champion on the business metric over a statistically significant sample.
6. Define a human-in-the-loop escalation protocol: when model confidence falls below a threshold, or drift exceeds the monitoring threshold, route the decision to a human reviewer.

## Real-life example — Uber
Uber's Michelangelo platform codified MLOps at scale: a unified feature store (features for driver-matching also power surge pricing without duplication), automated training every few hours, canary deployment, and monitoring that detected the COVID-19 demand shock in March 2020 within 48 hours — triggering retraining and preventing demand models from recommending surge pricing into a market with 80% fewer rides. Without MLOps, the models would have continued using 2019 demand patterns for months.

**So what:** MLOps is the difference between AI that adapts when the world changes and AI that becomes a liability. A model without monitoring is not a business asset — it is a time bomb.

## Template
Audit each production model against all seven layers. Score R/A/G per layer. Prioritise Red items for models most critical to revenue or compliance.

- [ ] Model name + business use case + owner
- [ ] Data pipeline automated and schema-monitored? (R/A/G)
- [ ] Feature store used with version control? (R/A/G)
- [ ] Training pipeline reproducible and version-controlled? (R/A/G)
- [ ] Model registered with baseline performance documented? (R/A/G)
- [ ] CI/CD deployment with canary testing? (R/A/G)
- [ ] Monitoring in place (data drift / model drift / prediction distribution)? (R/A/G)
- [ ] Retraining trigger defined and tested? (R/A/G)
- [ ] Overall MLOps maturity (1–5) + top priority improvement

## Pitfalls
- Monitoring dashboards nobody looks at: counter: monitoring must trigger automated alerts with a named on-call owner, not produce charts reviewed monthly.
- Training-serving skew: counter: use a feature store that computes features once and serves them identically in training and production.
- Retraining without a champion/challenger gate: counter: automatic retraining without a quality test can deploy a worse model — always test against the current champion before promoting.
