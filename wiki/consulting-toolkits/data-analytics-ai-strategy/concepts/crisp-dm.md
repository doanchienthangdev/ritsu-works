---
type: concept
slug: crisp-dm
title: CRISP-DM (Cross-Industry Standard Process for Data Mining)
source_collection: consulting-toolkits
toolkit: data-analytics-ai-strategy
domain: technology
category: AI/ML
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# CRISP-DM (Cross-Industry Standard Process for Data Mining)

*Category: AI/ML · Toolkit: Data Analytics & AI Strategy*

## What it is
A six-phase iterative process model for planning and executing machine learning and data-mining projects, from business understanding through to production deployment — the industry-standard ML delivery method.

**Origin:** Developed by a consortium of IBM, Daimler-Chrysler, NCR and SPSS in 1996; published as an open standard in 1999. Referenced in 43% of data-science teams (KDnuggets surveys, 2002–2022), making it the most widely-used ML process model despite being 25 years old.

## Why it works
The most common failure in ML projects is building the right model for the wrong question (skipping Business Understanding) or building a model that performs in a notebook but never reaches production (treating Deployment as an afterthought). CRISP-DM prevents both: it forces a business question definition before any data work begins, and it treats deployment as a first-class phase. The iterative nature of the model (evaluation findings send teams back to earlier phases) reflects the empirical reality that ML is a discovery process, not a linear one.

## When to use
For every AI/ML use case in Phase 5, from a simple regression to a large language model application. The phases scale — a simple model might spend 1 day per phase; a complex one, 1 month per phase.

## Visual
`process-flow`

## Step-by-step tutorial
1. Business Understanding: write a one-sentence problem statement: 'We need to predict [outcome] for [population] so that [decision-maker] can [action], improving [business metric] by [estimated impact].' If you cannot write this sentence, you are not ready to build a model.
2. Data Understanding: profile the training data — check for label leakage (does the feature only exist after the label is known?), class imbalance (is the target rare?), temporal drift (does the data distribution change over time?). Document every data source, its known quality issues, and the sample size. Flag if the sample size is insufficient for the required precision.
3. Data Preparation: split the data into train/validation/test BEFORE any modelling — no exceptions. Apply feature engineering. Document every transformation so it can be reproduced exactly in the production pipeline.
4. Modelling: train a simple baseline model first (logistic regression, decision tree, linear regression). Only add complexity (ensemble models, neural networks) if the baseline falls short of the business requirement. Complexity has a cost in interpretability, retraining time, and maintenance burden.
5. Evaluation: test on the held-out test set (not the validation set). Evaluate on the business metric (revenue lift, cost reduction), not just the model metric (AUC, RMSE). Segment results by demographic groups and key sub-populations to detect bias.
6. Deployment: build a production pipeline that mirrors the training pipeline exactly (no ad-hoc transformations at serving time). Set up monitoring for data drift (input feature distributions), model drift (performance on labelled ground truth), and prediction distribution shifts. Define the retraining trigger threshold.

## Real-life example — Spotify
Spotify's Discover Weekly recommendation engine followed the CRISP-DM pattern precisely. Business Understanding: 'Which 30 songs will a user most want to hear next week?' — the metric was 30-day retention after discovery. Data Understanding: validated that listening history (recency + frequency) and playlist co-occurrence provided sufficient signal for 80M+ users. Data Preparation: engineered user-song interaction matrices from 26 billion listening events. Modelling: compared collaborative filtering (matrix factorisation) against content-based models; CF won on the business metric. Evaluation: A/B tested on a 1% sample before full rollout. Deployment: production pipeline retraining weekly on the latest listening data, with monitoring for coverage (% of users who receive recommendations). Outcome: 40M weekly users within a year of launch.

**So what:** Treating Deployment as a first-class phase — with a production pipeline and monitoring from day one — is what separates models that create lasting business value from models that live in notebooks.

## Template
Complete one row per phase before moving to the next. Do not begin Data Preparation before completing Data Understanding. Never begin Deployment without a documented monitoring plan.

- [ ] Business Understanding: one-sentence problem statement / decision-maker / business metric / success threshold
- [ ] Data Understanding: training data sources / sample size / known quality issues / leakage check result / imbalance check result
- [ ] Data Preparation: feature list / split strategy (train/validation/test %) / transformation documentation / reproducibility verification
- [ ] Modelling: baseline model + metric / comparison models + metrics / chosen model + rationale
- [ ] Evaluation: test set performance on business metric / segment analysis results / bias check results / comparison to baseline
- [ ] Deployment: production pipeline description / monitoring plan (data drift / model drift / prediction distribution) / retraining trigger / human-in-the-loop escalation protocol

## Pitfalls
- Skipping Business Understanding and starting with data: counter: the model metric (AUC, RMSE) must be derived from the business metric. A model with AUC 0.95 that answers the wrong question delivers zero business value.
- Treating deployment as someone else's problem: counter: the data scientist owns the deployment specification and must define the monitoring requirements before the sprint ends.
- Fitting on the test set: counter: the test set is touched exactly once — at the final evaluation. Tuning on test set results produces models that fail in production.
