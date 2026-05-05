# 07-compliance — Compliance, Trust & Safety Pillar

> Trụ cột "Tuân thủ": GDPR, EU AI Act, content moderation, copyright, minor users.

**Status:** Scaffold (Wave 5 implementation, critical path)
**Pillar code:** COMPLIANCE
**Bài toán reference:** Bài #16 (customer data + GDPR), Bài #2 (HITL Tier C+)

---

## Scope

Pillar 07-compliance chịu trách nhiệm:

- **GDPR** — data subject rights, retention, breach notification
- **EU AI Act** — risk classification, transparency obligations
- **Content moderation** — user-uploaded content review
- **Copyright** — DMCA responses, fair use compliance
- **Minor user protection** — under-18 safeguards (B2C EdTech)
- **Hallucination guardrails** — AI accuracy in EdTech context
- **Audit trails** — regulatory inquiry response readiness

## SOP namespace

```
sops/
├── SOP-COMPLIANCE-001-gdpr-deletion/         ← critical, Wave 5
├── SOP-COMPLIANCE-002-gdpr-data-access/      ← critical, Wave 5
├── SOP-COMPLIANCE-003-gdpr-data-rectification/ ← critical, Wave 5
├── SOP-COMPLIANCE-004-data-breach-notification/
├── SOP-COMPLIANCE-005-copyright-takedown/
├── SOP-COMPLIANCE-006-content-moderation/
├── SOP-COMPLIANCE-007-minor-user-verification/
└── SOP-COMPLIANCE-008-ai-act-risk-classification/
```

## Agents specific to compliance

```
agents/
├── gdpr-officer.md              ← coordinate GDPR responses
├── content-moderator.md         ← classify user content
├── copyright-checker.md         ← detect IP violations
└── compliance-auditor.md        ← regular audits
```

## Key cross-pillar dependencies

- **02-customer/** — customer data subject of GDPR rights
- **knowledge/data-retention.yaml** (Bài #16) — declarative retention policies
- **05-ai-ops/skills/customer-data-scan/** — scans for personal data
- **knowledge/surface-compliance.yaml** (Bài #17) — per-surface rules

## Bài #16 GDPR machinery (critical Wave 5)

3 mandatory SOPs (€20M fine risk if missing):

### SOP-COMPLIANCE-001-gdpr-deletion
- Trigger: customer deletion request OR account close + retention period expires
- HITL Tier C: founder reviews deletion plan
- Deterministic SQL execution after approval
- Audit log: who, when, what was deleted

### SOP-COMPLIANCE-002-gdpr-data-access  
- Trigger: customer data access request
- Aggregates ALL data per customer across all tables + storage
- Export to encrypted ZIP, deliver to customer
- 30-day SLA per GDPR

### SOP-COMPLIANCE-003-gdpr-data-rectification
- Trigger: customer data correction request
- Update applicable fields
- Audit trail
- Notify downstream systems (analytics, etc.)

## Ritsu-specific compliance scope

- **B2C EdTech with potential minor users:** under-18 user identification + parental consent
- **Multi-locale:** GDPR (EU), CCPA (California), PDPA (Vietnam, Singapore)
- **AI tutoring:** EU AI Act high-risk classification (educational use)
- **User-generated content:** copyright + content moderation

## Wave 5 implementation tasks (CRITICAL)

- [ ] SOP-COMPLIANCE-001: GDPR deletion (deterministic SQL, HITL Tier C)
- [ ] SOP-COMPLIANCE-002: Data access request (export aggregation)
- [ ] SOP-COMPLIANCE-003: Data rectification
- [ ] customer-data-scan skill (per Bài #16)
- [ ] data-retention.yaml fully populated (per Bài #16)
- [ ] First gdpr-officer agent

## Wave 6+ tasks

- [ ] SOP-COMPLIANCE-004: Breach notification (72-hour SLA)
- [ ] SOP-COMPLIANCE-005: Copyright/DMCA workflow
- [ ] SOP-COMPLIANCE-006: Content moderation (cho user-uploaded content)
- [ ] SOP-COMPLIANCE-007: Minor user verification
- [ ] SOP-COMPLIANCE-008: EU AI Act risk classification

---

*Pillar 07-compliance scaffolded by Agent OS Boilerplate. Customize SOPs per project — different domains (EdTech, content, e-commerce) have different regulatory scope.*
