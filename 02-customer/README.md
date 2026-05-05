# 02-customer — Customer Operations Pillar

> Trụ cột "Vận hành khách hàng": onboarding, support, retention, churn prevention.

**Status:** Scaffold (Wave 3-5 implementation)
**Pillar code:** CUSTOMER
**Bài toán reference:** Bài #13 (state machines), Bài #16 (customer data + GDPR), Bài #11 (events)

---

## Scope

Pillar 02-customer chịu trách nhiệm:

- **Onboarding** — new customer activation, first-value time
- **Support** — tickets, complaints, troubleshooting
- **Success** — usage tracking, expansion, upsell
- **Retention** — churn prediction, win-back campaigns
- **Customer feedback** — NPS, surveys, interview programs
- **Account management** — for higher-tier customers

## SOP namespace

```
sops/
├── SOP-CUSTOMER-001-onboarding-activation/
├── SOP-CUSTOMER-002-support-triage/
├── SOP-CUSTOMER-003-churn-risk-detection/
├── SOP-CUSTOMER-004-account-deletion-gdpr/
├── SOP-CUSTOMER-005-feedback-collection/
└── ...
```

## Agents specific to customer ops

```
agents/
├── support-triager.md          ← classify tickets, route
├── onboarding-coach.md          ← guide new customers
├── churn-predictor.md           ← analyze usage signals
└── feedback-synthesizer.md      ← aggregate insights
```

## Key cross-pillar dependencies

- **01-growth/** — receives qualified leads
- **03-product/** — receives feature requests, bug reports
- **07-compliance/** — GDPR data subject requests
- **knowledge/state-machines.yaml** (Bài #13) — customer state machine
- **knowledge/data-retention.yaml** (Bài #16) — retention policies

## Customer state machine (Bài #13)

Defined in `knowledge/state-machines.yaml`:

```
signed_up → onboarding → activated → engaged → at_risk → churned
                                  ↓
                                  expanded (upsell)
```

## Ritsu-specific notes

- B2C: 1-to-many customer relationship (one founder, thousands of learners)
- Onboarding KPI: time-to-first-lesson < 5 minutes
- Churn signal: no lessons in 7 days
- Tier upgrade flow: Free → Plus → Pro → Ultra

## GDPR machinery (Bài #16)

3 critical SOPs (must implement Wave 5):
- SOP-CUSTOMER-004-account-deletion-gdpr (right to erasure)
- SOP-CUSTOMER-005-data-access-request-gdpr (right to access)
- SOP-CUSTOMER-006-data-rectification-gdpr (right to rectify)

## Wave 3-5 implementation tasks

- [ ] SOP-CUSTOMER-001: Onboarding (Wave 3, customer state machine)
- [ ] SOP-CUSTOMER-002: Support triage (Wave 5, HITL Tier B)
- [ ] SOP-CUSTOMER-003: Churn detection (Wave 5, scheduled, Bài #8)
- [ ] SOP-CUSTOMER-004 + 005 + 006: GDPR machinery (Wave 5, deterministic)
- [ ] First support-triager agent

---

*Pillar 02-customer scaffolded by Agent OS Boilerplate. Customize SOPs per project.*
