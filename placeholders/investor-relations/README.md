# Placeholder: Investor Relations

## Why this pillar exists (eventually)
If founder decides to raise (seed, Series A, strategic), need data-room infrastructure, monthly investor updates, current runway deck on tap. Without this pillar, fundraising becomes a fire drill that eats founder's top-idea slot for months (PG: Nile Perch warning).

## Entry condition
**Trigger:** Founder decides to raise (explicit decision logged in `ops.decisions` per Bài #15).

This is a strategic decision, not a metric. PG bias for current stage: **don't raise until PMF.** Raising before PMF distracts from making something people want.

Possible catalysts for the raise decision:
- PMF achieved (≥100 paying retained 30d) and growth rate needs capital to sustain
- Strategic acquisition opportunity that needs capital
- Competitive threat requiring faster scaling than runway allows

Until trigger: defer. **Default: do not raise.** Operating profitably with low burn is the better outcome.

## Initial sub-pillars when activated
- `data-room` — virtual data room organization (financials, metrics dashboards, legal docs, technical architecture)
- `investor-update-monthly` — monthly metric snapshot + narrative (cadence even before close, builds momentum)
- `runway-deck-current` — always-current pitch deck reflecting latest metrics

## On activation
1. Founder approval Tier D-Std minimum (irreversible to "I am fundraising" mode)
2. PR opens with sub-pillar tree
3. Move from `placeholders/` to top-level (eg `12-investor-relations/`)
4. Coordinate with `08-finance/03-investor-financials/` (gets activated simultaneously)
5. **Top-idea warning:** activate `09-founder/01-cognition/SOP-FOUNDER-002-nile-perch-detection/` to track whether fundraising is eating attention from product
