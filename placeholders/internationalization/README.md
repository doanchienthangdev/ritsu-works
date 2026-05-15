# Placeholder: Internationalization

## Why this pillar exists (eventually)
Ritsu serves a global audience (per `00-charter/product.md` personas). When non-English usage exceeds 30%, operating without localization infrastructure becomes a tax on every product update and marketing message.

## Entry condition
**Trigger:** 30%+ of WAU (or paying users) are in a non-English locale, tracked via `metrics.product_dau_snapshot.extra->>'primary_locale'`.

Until trigger: do NOT activate. Premature localization = playing house at infrastructure layer.

## Initial sub-pillars when activated
- `i18n-string-extraction` — extract user-facing strings to i18n catalog, integrate with build
- `rtl-support` — right-to-left language support (Arabic, Hebrew if relevant)
- `locale-payment` — currency conversion, regional payment methods (eg Vietnamese banks via VNPay)

## On activation
1. Founder approval Tier C
2. PR opens with sub-pillar tree + first 3 SOPs
3. Update `manifest.yaml`: move from `placeholders` to top-level (eg `11-internationalization/`)
4. Stage: skeleton at activation; deepens as user base diversifies further
