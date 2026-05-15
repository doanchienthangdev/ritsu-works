# 07-trust-safety — Trust & Safety Pillar

> DMCA, content moderation, GDPR/PDPA, hallucination triage, minor-user handling. Active only on first incident; skeleton at current stage.

**Layer:** Evergreen
**Stage status:** Skeleton (entry-condition driven)
**Pillar code:** TS
**Owner role(s):** trust-safety
**HITL baseline:** C (all user-affecting decisions go to founder)

---

## Scope

This pillar owns:
- **DMCA / copyright** — copyright takedown notice handling (Ritsu users upload copyrighted material like textbooks)
- **ToS violations** — abuse classification, account suspension policy
- **GDPR / PDPA policy** — data subject rights, retention rules, EU/Asia compliance
- **Hallucination triage** — user-reported AI errors, root cause analysis
- **Minor user handling** — under-18 protection (some Ritsu personas like Students include minors)
- **Content moderation** — user-uploaded content (Ritsu accepts PDF/video/slides — needs vetting at scale)

This pillar does NOT own:
- Account-deletion mechanics → `05-customer/customer-data/SOP-CUSTOMER-023-gdpr-account-deletion/` (TS owns POLICY, Customer owns EXECUTION)
- Code-level safety (input validation, prompt injection defenses) → that's product team in separate repo
- Tax/regulatory financial compliance → `placeholders/compliance-vn/` (separate concern)

## Sub-pillars

No sub-pillars at this stage. Skeleton only. See entry conditions below.

## SOPs

`sops/SOP-TS-NNN-<slug>/` — namespace reserved. Only one skeleton SOP at current stage:
- `SOP-TS-001-incident-response-template` — generic template; copied + specialized when first incident hits

## Agents

- `trust-safety` (home) — defined in ROLES.md. Routes user-flagged content, applies policy. Direct escalation to founder per ROLES.md (T&S does NOT route through gps).

## KPIs owned

(Surfaced in `10-metrics/kpi-registry/` once active.)

- DMCA notice volume (per month)
- Average DMCA response time
- ToS violation count + resolution time
- Hallucination incident rate (per 10K user-prompts)
- GDPR/PDPA data request response time

## Dependencies

- **Composes from:** `governance/HITL.md` (all T&S actions are Tier C minimum)
- **Composed by:** `05-customer/customer-data/` (GDPR deletion execution)

## HITL baseline

Every T&S action affects user rights or legal posture. Default tier:
- Routine FAQ-handled response (eg "we need more info"): Tier B
- DMCA evaluation + counter-notice: Tier C
- ToS suspension up to 7 days: Tier C
- ToS suspension >7 days: Tier D-Std
- Public incident statement: Tier D-MAX
- Any legal correspondence: Tier D-MAX

## Entry conditions (when to deepen)

This pillar promotes from skeleton to active sub-pillars when:

| Trigger | Activates |
|---|---|
| **First DMCA notice received** | `01-dmca/` sub-pillar with SOP-TS-002-dmca-evaluation, SOP-TS-003-counter-notice-protocol |
| **First ToS report** | `02-tos-violations/` sub-pillar with SOP-TS-004-tos-classification, SOP-TS-005-suspension-criteria |
| **First user-reported hallucination causing harm** | `03-hallucination-triage/` with SOP-TS-006-incident-triage, SOP-TS-007-product-team-handoff |
| **EU launch confirmed (any EU user paid)** | `04-gdpr-deep/` with full DSR (Data Subject Request) automation |
| **100 paying users milestone** | `05-content-moderation/` for proactive review at scale |
| **Asia launch (any PDPA-jurisdiction user paid)** | `06-pdpa-asia/` |

Each trigger PRs the relevant sub-pillar into existence with founder approval. Until then, skeleton + generic template SOP is sufficient. Founder + general-purpose agent handles ad-hoc.

## Why this pillar exists if dormant

Two reasons:
1. **Reserves the namespace.** When (not if) first incident hits, the response is "open sub-pillar `01-dmca/`" not "where do we put this?"
2. **Documents the policy commitment.** Ritsu.ai already has DMCA/GDPR/Security/Terms pages live. The legal commitment exists; this pillar is where the operational backing lives.
