# Placeholder: Enterprise Sales

## Why this pillar exists (eventually)
Some personas (Educators creating courses for students, Researchers at institutions) suggest institutional contracts will arrive. When the first one does, PLG self-serve mechanics in `02-sales` are insufficient — need contract templates, procurement handling, security questionnaires, multi-seat onboarding.

## Entry condition
**Trigger (either suffices):**
- 1 paying deal ≥ $500/mo, OR
- 3 enterprise inbound leads in a quarter (where "enterprise" = >5 seats requested OR institutional buyer named)

Until trigger: do NOT activate. The PLG motion in `02-sales` handles single-seat self-serve. Enterprise without trigger = playing house.

## Initial sub-pillars when activated
- `outbound-motion` — outbound sales playbook (Apollo prospecting, cold email sequences targeted at institutions, LinkedIn campaigns)
- `contract-templates` — MSA, DPA (GDPR), order forms, security exhibits, SOC2-readiness statements
- `procurement-handling` — security questionnaires (SIG Lite, custom), purchase order workflows, NDA process

## On activation
1. Founder approval Tier C
2. PR opens with sub-pillar tree
3. **Promote `02-sales` from LITE to DEEP** in `manifest.yaml`
4. Update sub-pillar `03-distribution-engine/sops/SOP-GTM-007-apollo-outbound-cold-email/` from "deferred" to "active"
