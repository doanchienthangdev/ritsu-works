# Entry Conditions: 08-finance sub-pillars

| Trigger | Activates sub-pillar | First SOPs | Stage promotion |
|---|---|---|---|
| 50 paying users | `01-invoicing/` | SOP-FIN-002-invoice-generation, SOP-FIN-003-invoice-delivery | skeleton → lite |
| VN entity formation decision | `placeholders/compliance-vn/` (separate pillar) | (in that pillar) | n/a here |
| $10K MRR | `02-accounting-integration/` | SOP-FIN-004-accounting-tool-sync | lite → deep |
| Founder decides to raise | `03-investor-financials/` | SOP-FIN-005-investor-update-monthly, SOP-FIN-006-runway-deck-current | lite → deep |
| First contractor / employee hired | (separate `placeholders/people-ops/`) | (payroll there) | n/a here |

## Process

1. Trigger observed (founder confirms or `09-founder/weekly-review/` flags)
2. Founder approval to activate (Tier C minimum)
3. PR opens with sub-pillar README + scaffolded SOPs + manifest.yaml update
4. Hooks in `06-ai-ops/hooks-enforcement/` reload to recognize new SOPs
