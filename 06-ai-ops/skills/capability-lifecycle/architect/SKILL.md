---
name: architect
description: Phase 5 of CLA workflow (Bài #20). Designs architecture integration của selected option vào Agent OS. Per-Bài-toán impact analysis. Outputs canonical capability spec.md + drafts for migrations, Tier 1 diffs, skill stubs. Tier C HITL critical decision.
---

# Architect (CLA Phase 5)

## When to use

After Phase 4 HITL Tier B (founder picks option). Capability state = `architecting`.

## Inputs

- `selected_option_id`: From HITL Tier B response
- All Phase 1-4 artifacts

## Process

### Step 1: Per-Bài-toán impact analysis

For each of 19 prior bài toán, analyze impact:

```
| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth | Tier 1 file affected | Add entry to channels.yaml |
| #4 Memory | New embeddings? | Yes, lead profiles |
| #7 Cost | New cost-bucket? | Yes, lead-acquisition |
| #11 Events | New events fired? | Yes, ritsu.lead.captured |
| ... | | |
```

### Step 2: Generate canonical spec.md

Use template `wiki/capabilities/_TEMPLATE/spec.md`. Fill in:
- Problem statement (from problem.md)
- Domain analysis summary (from domain-analysis.md)
- Selected option (from options.md)
- Per-Bài-toán impact
- Component changes (skills, SOPs, Tier 1, migrations, integrations, frontend)
- Cost-bucket impact
- HITL points
- Decision tier
- Acceptance criteria
- Rollback plan

### Step 3: Generate working drafts

Pre-generate (not committed):
- `wiki/capabilities/<id>/draft/migrations/<num>_<name>.sql` (DB changes)
- `wiki/capabilities/<id>/draft/tier1-diffs.yaml` (which YAML files change, what changes)
- `wiki/capabilities/<id>/draft/skill-stubs/<skill>/SKILL.md` (new skills outlined)

These are reviewed in Phase 5 HITL, then implemented in Phase 7.

### Step 4: Compute aggregate metrics

- **Total components:** N skills + M SOPs + K integrations
- **Cost-bucket annual impact:** $X/year
- **Founder time impact:** Y hours setup + Z hours/month ongoing
- **Time to production:** W weeks

### Step 5: HITL Tier C decision

Tier C = critical, irreversible decision. Per Bài #15, invoke Muse panel:

```
[HITL Tier C] Architecture proposal for <capability_id>

Spec: wiki/capabilities/<id>/spec.md
Components: N skills, M SOPs, K integrations, J external services

Cost impact: $X setup, $Y/mo recurring
Founder time: Z hours setup, W hours/week ongoing
Time to production: V weeks

Reversibility: <reversible/partial/irreversible>

Muse panel synthesis attached. Personas: cynic, optimist, time-honest, cost-conscious, ethical-compass.

Decision required:
1. Approve architecture as proposed
2. Approve với modifications (specify)
3. Reject (return to Phase 4)
4. Defer (specify trigger to revisit)
```

## Outputs

- `wiki/capabilities/<id>/spec.md` (canonical)
- `wiki/capabilities/<id>/draft/` (working drafts for Phase 7)
- HITL Tier C record
- Decision record (Bài #15)

## State transition

After HITL approval: `architecting → planning`

## Cost estimate

- Anthropic API: ~$1.00 per invocation (heavy analysis + drafts)
- Founder time: 60-90 min review + Tier C decision

---

**Next phase:** `sprint-planner`
