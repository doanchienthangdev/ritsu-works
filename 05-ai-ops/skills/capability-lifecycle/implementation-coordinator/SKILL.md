---
name: implementation-coordinator
description: Phase 7 of CLA workflow (Bài #20). Executes sprints sequentially. Multi-session resilient — state in ops.capability_runs. HITL Tier B per PR. Spans 1-4 weeks per capability.
---

# Implementation Coordinator (CLA Phase 7)

## When to use

After Phase 6 sprint-plan.md approved. Capability state = `implementing`.

## Inputs

- `sprint_plan_path`: Approved sprint-plan.md
- `spec_path`: Approved spec.md
- `draft_artifacts_path`: wiki/capabilities/<id>/draft/

## Process — multi-session, multi-week

### Sub-state machine

```
implementing.sprint_1_foundation
implementing.sprint_2_skills
implementing.sprint_3_sops
implementing.sprint_4_external
implementing.testing
deployed
```

State persisted in `ops.capability_runs.state_payload.implementation_phase`.

### Per sprint

#### Step 1: Read sprint deliverables
From sprint-plan.md, extract sprint N items.

#### Step 2: Execute deliverables
For each item:
- Apply migration (if SQL)
- Implement skill (if skill stub)
- Configure Tier 1 (if yaml diff)
- Setup integration (if external)

Use draft artifacts từ Phase 5 as starting point.

#### Step 3: Test
Run automated tests:
- Tier 1 schema validation: `node scripts/validate-tier1.js`
- Migration apply test: `supabase db reset && supabase db push`
- Skill unit tests
- E2E test (last sprint)

#### Step 4: PR creation
Create PR với:
- Description: "Sprint N implementation for <capability_id>"
- Files changed: list
- Tests: pass status
- Cost impact: actual vs estimated

#### Step 5: HITL Tier B
```
[HITL Tier B] Sprint N PR ready for <capability_id>

PR: <url>
Tests: <pass/fail>
Cost actual vs estimated: <delta>

Approve, request changes, or reject.
```

#### Step 6: Merge + state advance
After approval, merge PR, advance state, fire event:
```
ritsu.capability.sprint_N_completed
```

### Multi-session resilience

If session ends mid-sprint:
- State persisted in ops.capability_runs
- Next session: read state, resume from last completed item
- Notify founder: "Resuming sprint N for <capability_id>, last completed: <item>"

### Failure handling

- **Test fails:** PR blocked, founder notified, debug iteration
- **Cost overrun:** Alert if actual > estimated × 1.5
- **Time overrun:** Alert if sprint takes > 3 weeks (planned 2)

### Final sprint: production deploy

Last sprint includes:
- E2E test
- Production deploy
- Monitoring setup (KPIs added to Bài #10)
- Customer/operator-facing announcement (if applicable)

## Outputs

- PRs in git history (one per sprint)
- ops.events trail
- Updated `ops.capability_runs.actual_cost_setup_usd`, `actual_founder_hours`

## State transition

`implementing → deployed` (after final sprint passes)

## Cost estimate

- Anthropic API: ~$0.50-2.00 per sprint (depends on complexity)
- Founder time: per sprint plan estimates

---

**Next phase:** `catalog-updater`
