# 06-finance — Finance & Accounting Pillar

> Trụ cột "Tài chính": invoicing, expenses, runway, financial reporting.

**Status:** Scaffold (Wave 5 implementation)
**Pillar code:** FINANCE
**Bài toán reference:** Bài #7 (economic unit cost-bucket), Bài #16 (customer payments)

---

## Scope

Pillar 06-finance chịu trách nhiệm:

- **Revenue recognition** — Stripe → ledger
- **Expense tracking** — AI cost-bucket (Bài #7) + infra cost
- **Runway analysis** — cash flow, burn rate
- **Financial reporting** — monthly close, board reports
- **Tax compliance** — Vietnamese tax (founder), foreign sales VAT
- **Pricing experiments** — together với 03-product

## SOP namespace

```
sops/
├── SOP-FINANCE-001-monthly-close/
├── SOP-FINANCE-002-revenue-reconciliation/
├── SOP-FINANCE-003-expense-categorization/
├── SOP-FINANCE-004-runway-projection/
├── SOP-FINANCE-005-tax-quarterly-report/
└── ...
```

## Agents specific to finance

```
agents/
├── reconciler.md               ← match Stripe payments to invoices
├── expense-categorizer.md      ← classify spending
├── runway-projector.md          ← cash flow forecast
└── ...
```

## Key cross-pillar dependencies

- **02-customer/** — customer state (active subscription) drives revenue
- **08-integrations/** — Stripe webhook events (Bài #11)
- **knowledge/data-retention.yaml** — financial records retention (legal: 7+ years VN)

## Bài #7 cost-bucket integration

Every AI/infra expense logged to ops.cost_bucket:

```
cost_bucket categories:
- knowledge-ingestion (Whisper, embeddings)
- llm-anthropic (autonomous skills)
- llm-openai (Whisper, embeddings)
- supabase-cloud
- vps-hetzner (Phase B)
- founder-time (highest leverage cost)
```

## Ritsu-specific notes

- Vietnamese founder: tax compliance per Vietnamese laws
- Foreign sales: VAT considerations per customer location
- Currency: USD primary (Stripe default), VND for VN-specific transactions
- Runway target: 18 months minimum

## Wave 5+ implementation tasks

- [ ] SOP-FINANCE-001: Monthly close (scheduled, Bài #8)
- [ ] SOP-FINANCE-002: Revenue reconciliation (Stripe events)
- [ ] SOP-FINANCE-003: Cost-bucket categorization (Bài #7)
- [ ] SOP-FINANCE-004: Runway projection
- [ ] First reconciler agent

---

*Pillar 06-finance scaffolded by Agent OS Boilerplate. Customize SOPs per project.*
