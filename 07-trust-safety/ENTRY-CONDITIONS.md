# Entry Conditions: 07-trust-safety sub-pillars

> When skeleton → active. Each row PRs the relevant sub-pillar into existence with founder approval.

## Active triggers

| Trigger | Activates sub-pillar | First SOPs |
|---|---|---|
| First DMCA notice received | `01-dmca/` | SOP-TS-002-dmca-evaluation, SOP-TS-003-counter-notice-protocol |
| First ToS report | `02-tos-violations/` | SOP-TS-004-tos-classification, SOP-TS-005-suspension-criteria |
| First user-reported hallucination causing harm | `03-hallucination-triage/` | SOP-TS-006-incident-triage, SOP-TS-007-product-team-handoff |
| EU launch confirmed (first EU paying user) | `04-gdpr-deep/` | SOP-TS-008-dsr-automation, SOP-TS-009-data-retention-audit |
| 100 paying users milestone | `05-content-moderation/` | SOP-TS-010-upload-classification, SOP-TS-011-takedown-protocol |
| Asia launch (first PDPA-jurisdiction paying user) | `06-pdpa-asia/` | SOP-TS-012-vn-pdpd-compliance, SOP-TS-013-sg-pdpa-compliance |

## Process when trigger fires

1. **Stop and assess.** Don't reactively create sub-pillar in the middle of an incident.
2. **Founder approval (Tier C minimum, often D-Std).** Issue is real, pillar activation is real.
3. **Open PR titled `ts-activate-<sub-pillar-name>`** with:
   - Sub-pillar README per template in `PLAN.md` §9
   - First 2-3 SOPs scaffolded
   - Update `manifest.yaml` `pillars.trust_safety.stage_status` from `skeleton` → `lite` (or `deep` if multiple sub-pillars activate)
4. **Inline incident response** continues per `SOP-TS-001-incident-response-template` while the sub-pillar is being built. Don't block the user.

## Anti-trigger

Do NOT activate sub-pillars proactively "just in case." This pillar is incident-driven. Premature activation = playing house at T&S layer.

Exception: when founder is about to ship a feature that the founder knows will trigger one of these conditions imminently (eg launching EU billing tomorrow), pre-activate the sub-pillar 1 week ahead so SOPs exist when the first incident hits.
