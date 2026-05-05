# BUDGET — Cost Caps & Economic Discipline

> Hard limits + soft thresholds cho AI workforce spending. Per Bài #7 economic architecture + chương 30 LLM modes.

**Status:** v1.0
**Last updated:** 2026-05-04
**Owner:** founder
**Tier 1 link:** `knowledge/feature-flags.yaml`

---

## Overall budget envelope

### LLM mode (per chương 30)

Default: **Cell 5 — Bước B (VPS) + Hybrid mode** (recommended startup posture)

Per-mode budget targets:

| Mode | Monthly LLM API | Monthly infra | Total target |
|---|---|---|---|
| Subscription-only | $0 (Claude Pro $20 included) | $0-5 | $20-25 |
| **Hybrid (recommended)** | **$25-45** | **$10-20** | **$45-65** |
| Full API | $140-280 | $20-40 | $160-320 |

## Hard caps (per cost-bucket — Bài #7)

These trigger **hard halt** if exceeded. Configured trong `knowledge/feature-flags.yaml.cost_limits`.

| Cost-bucket | Daily cap | Monthly cap | Hard stop? |
|---|---|---|---|
| `llm-anthropic` | $5 | $80 | ✅ Yes |
| `llm-openai` | $3 | $40 | ✅ Yes |
| `whisper` | $1 | $20 | ✅ Yes |
| `embeddings` | $1 | $15 | ✅ Yes |
| `external-services` | $5 | $100 | ⚠️ Alert + 2x cap |
| `infra` (Supabase + VPS) | n/a (fixed) | $25 | n/a |

**Total hard ceiling:** $260/month — beyond this, system halts pending founder review.

## Soft thresholds (per cost-bucket)

Trigger **alert** (per Bài #10 alert-rules.yaml):

| Threshold | Action |
|---|---|
| 50% monthly | Info alert |
| 75% monthly | Warning alert |
| 90% monthly | Critical alert + pause non-essential schedules |
| 100% monthly | Hard halt (per above) |

## Per-capability budget (per Bài #20 CLA)

Each capability proposed via CLA workflow has cost projection (Phase 4 options + Phase 5 spec).

Tracking:
- **Setup cost:** projected vs actual (Phase 8 retrospective)
- **Recurring cost:** monthly delta vs estimate
- **Cost-bucket assignment:** mandatory per capability

Trigger Tier C HITL re-review if:
- Actual recurring > 1.5x estimated for 2 consecutive months
- Setup cost > 2x estimated

## Founder time budget (per Bài #19)

Per `knowledge/founder-rhythm.yaml`:

| Category | Daily target |
|---|---|
| Deep work | 4 hours |
| Meetings | 2 hours |
| HITL decisions | 1 hour |
| Reactive (triage, support) | 30 min |
| Reflection | 30 min |

**Total founder budget:** 8 hours/day, 5 days/week.

Tier C decisions (Bài #2) consume disproportionate budget — limit to 1-2 per week.

## Burn rate monitoring

Weekly review (per `knowledge/schedules.yaml`):
- Total spend vs budget
- Per-cost-bucket breakdown
- Trend (increasing/decreasing)
- Top 3 cost drivers

Monthly review:
- Capability cost actual vs estimated
- Mode evaluation (still Hybrid? upgrade Full API?)
- Boilerplate-extractable cost savings

## Override authority

| Override action | Authority | Audit |
|---|---|---|
| Temporary increase 1 cost-bucket cap (24h) | Founder | ops.audit_log |
| Permanent cap change | Founder PR | git history |
| Mode switch (Hybrid → Full API) | Founder PR | git + audit |
| Disable cost limits entirely | NOT ALLOWED | n/a |

## Failure modes

### Mode 1: Silent runaway (caps disabled)
**Mitigation:** Cost caps mandatory in `feature-flags.yaml`. CI rejects PR if caps removed.

### Mode 2: Cap too high (no early warning)
**Mitigation:** 50/75/90% thresholds → progressive alerts.

### Mode 3: External service surprise bill
**Mitigation:** External services tracked separately với 2x cap (Stripe webhooks, etc.).

### Mode 4: Founder time overrun
**Mitigation:** Bài #19 attention budget logging + weekly review.

## Cross-references

- `knowledge/feature-flags.yaml` — runtime cost limits config
- `knowledge/alert-rules.yaml` — alert conditions
- `knowledge/kpi-registry.yaml` — cost KPIs
- `knowledge/founder-rhythm.yaml` — founder time budget
- `knowledge/economic-architecture.md` — Bài #7 design rationale

---

*Customize per project. Different domains have different cost profiles (B2C EdTech ≠ B2B SaaS ≠ content channel).*
