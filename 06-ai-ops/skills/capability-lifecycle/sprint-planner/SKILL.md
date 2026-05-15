---
name: sprint-planner
description: Phase 6 of CLA workflow (Bài #20). Breaks approved capability spec into 2-week sprints với clear deliverables, acceptance criteria, Wave alignment. Outputs sprint-plan.md.
---

# Sprint Planner (CLA Phase 6)

## When to use

After Phase 5 Tier C HITL approves architecture. Capability state = `planning`.

## Inputs

- `spec_path`: Approved spec.md
- Current Phase B Wave (per chương 28)
- `feature-flags.yaml` (LLM mode determines what's automatable)

## Process

### Step 1: Decompose into work items

From spec.md, list every:
- New skill needed
- New SOP needed
- Tier 1 yaml change
- Database migration
- New integration
- Frontend page
- External service signup

### Step 2: Topological sort

Order work items:
- Foundation (migrations, Tier 1) FIRST
- Skills depending on foundation
- SOPs depending on skills
- Integrations
- Frontend

### Step 3: Group into 2-week sprints

Typical pattern:
- **Sprint 1: Foundation** (migrations + Tier 1 + cost setup)
- **Sprint 2: Skills** (new skills implementation + tests)
- **Sprint 3: SOPs + integration** (SOP YAMLs + chain skills + first integration)
- **Sprint 4: External + E2E** (external service integration + end-to-end testing)

Adjust per capability complexity. Simple = 2 sprints, complex = 6 sprints.

### Step 4: Per-sprint acceptance criteria

Each sprint:
- **Deliverables:** specific files + commits
- **Acceptance:** automated tests pass + manual verification done
- **HITL:** Tier B per sprint completion
- **Effort estimate:** founder hours
- **Cost:** monthly delta

### Step 5: Wave alignment

Map sprints to Phase B Wave (chương 28):
- Wave 1-3: foundation work
- Wave 4-6: most capabilities
- Wave 7+: advanced capabilities

Ensure sprints align với current Wave (e.g., if currently Wave 4, capability should leverage Wave 4 infrastructure).

### Step 6: Output sprint-plan.md

```markdown
# Sprint Plan: <capability>

## Overview
- Total sprints: N
- Total weeks: 2N
- Total founder hours: X
- Monthly cost delta: $Y
- Wave alignment: Wave Z

## Sprint 1: Foundation (Week 1-2)
**Deliverables:**
- [ ] Migration <num>_<name>.sql applied
- [ ] Tier 1 yaml updates merged
- [ ] Cost-bucket tracker setup

**Acceptance:**
- [ ] supabase db push succeeds
- [ ] validate-tier1.js passes
- [ ] cost-bucket entries flowing

**Effort:** Xh
**HITL:** Tier B at sprint end
**Cost:** $0/mo (foundation only)

## Sprint 2: ...
[same structure]

## Total
- Founder time: X hours
- Monthly recurring cost: $Y
- One-time setup cost: $Z
- Time to production: 2N weeks
```

## Outputs

- `wiki/capabilities/<id>/sprint-plan.md`
- HITL Tier B record (sprint plan approval)

## State transition

`planning → implementing`

## Cost estimate

- Anthropic API: ~$0.30 per invocation
- Founder time: 30-45 min review

---

**Next phase:** `implementation-coordinator`
