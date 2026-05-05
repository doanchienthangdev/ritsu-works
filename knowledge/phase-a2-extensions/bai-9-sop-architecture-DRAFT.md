# Bài #9 — SOP Architecture (DRAFT)

**Status:** DRAFT — derived from G5 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G5-sop-architecture.md`
**Dependencies:** Bài #1 (Tier 1), #2 (HITL), #5 (orchestration), #7 (cost), #8 (scheduling — DRAFT)

## Why
~50+ business workflow issues in catalog assume SOP layer exists.
Phase A has skills (procedural primitives) but no SOP layer (business workflow composition).
Without SOP layer:
- Each workflow as ad-hoc decomposition (Bài #5) = no codification
- Each workflow as 1 giant skill = no per-step audit, error handling, versioning
- Founder cognitive load impossible to scale

SOP = the missing layer between business intent and technical execution.

## Decisions (tentative)

### Axis 1 — SOP Definition Format
**Choice:** Tier 1 declarative YAML files, schema documented.
- Per-step granularity (each step = 1 skill invocation)
- Built-in error handling (on_failure per step)
- Quality gates (quality_gate per step)
- Cross-references skills, MCP servers, knowledge files, secrets

### Axis 2 — SOP Storage
**Choice:** Per-pillar `sops/` folder, naming `SOP-<PILLAR>-<NNN>-<slug>.yaml`
- Pillar template: README + orchestrator + sops/ + skills/ + knowledge/
- Cohesion + ownership + discovery
- Manifest extends with `pillars` section

### Axis 3 — SOP Execution Engine
**Choice:** New skill `sop-execute` + reuse ops.tasks + new ops.sop_runs index table
- sop-execute orchestrates step invocations as subagents (Bài #5 pattern)
- ops.tasks.state_payload tracks step-level state
- ops.sop_runs = summary index for analytics

### Axis 4 — Authoring Discipline + Governance
**Choice:** 3 rules + automated detection + pre-sop-execute hook
- Rule 1: 3+ ad-hoc runs → must codify
- Rule 2: SOP must be testable (quality gates)
- Rule 3: SOP tier ≥ max step tier
- Hook validates schema, dependencies, tier alignment, budget, HITL

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.sop_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_id          text NOT NULL,
  sop_version     text NOT NULL,
  task_id         uuid REFERENCES ops.tasks(id),
  triggered_by    text NOT NULL,
  trigger_ref     text,
  status          text NOT NULL,
  current_step    text,
  steps_completed text[],
  steps_failed    text[],
  inputs          jsonb,
  outputs         jsonb,
  total_cost_usd  numeric(10,6),
  started_at      timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  error_summary   text
);

CREATE INDEX ON ops.sop_runs (sop_id, started_at DESC);
```

## SOP YAML schema (excerpt)

```yaml
id: SOP-<PILLAR>-<NNN>
version: <semver>
title: <human readable>
status: draft | active | deprecated | retired
home_pillar: <pillar-name>
owner_role: <role>
hitl_tier: A | B | C | D-Std | D-MAX

description: |
  <markdown description>

triggers:
  - type: scheduled
    schedule_id: <id from schedules.yaml>
  - type: manual
    invocation: <command>
  - type: event
    event_type: <event>

inputs: [...]
outputs: [...]
estimated_cost_usd: <float>
estimated_duration_min: <int>

steps:
  - id: <step-id>
    title: <human readable>
    depends_on: [<step-id>, ...]
    invoking_role: <role>
    skill: <skill-name>
    inputs: <templated>
    outputs: <schema>
    on_failure:
      action: abort | retry | skip | escalate
      ...
    quality_gate:
      condition: <expression>
      on_fail: <action>
    timeout_sec: <int>

dependencies:
  skills: [...]
  mcp_servers: [...]
  knowledge_files: [...]
  secrets: [...]

quality_metrics:
  target_<metric>: <value>
  alert_if_<condition>: <threshold>
```

## New components (15)

| ID | Component | Type | Phase |
|---|---|---|---|
| CN5.1 | `<pillar>/sops/` folder convention | Tier 1 structure | A.2 |
| CN5.2 | SOP YAML schema | Tier 1 spec | A.2 |
| CN5.3 | `ops.sop_runs` table | Tier 2 schema | Phase B |
| CN5.4 | `ops.tasks.state_payload` SOP extension | Tier 2 update | Phase B |
| CN5.5 | Skill `sop-execute` | Procedural | Phase C |
| CN5.6 | Skill `sop-author` | Procedural | Phase C |
| CN5.7 | Skill `sop-candidate-detector` | Procedural | Phase C |
| CN5.8 | Hook `pre-sop-execute` | Runtime | Phase D |
| CN5.9 | Pillar template (`_build/templates/pillar/`) | Meta | A.2 |
| CN5.10 | Recipe `codify-sop.md` | Meta | A.2 |
| CN5.11 | Recipe `add-pillar.md` | Meta | A.2 |
| CN5.12 | Checklist `sop-pre-flight.md` | Meta | A.2 |
| CN5.13 | manifest.yaml `pillars` section | Tier 1 update | A.2 |
| CN5.14 | ROLES.md `permissions.sops` field | Governance update | A.2 |
| CN5.15 | Brainstorm note `problem-9-sop-architecture.md` | Meta | A.2 |

## Open questions

- OQ5.1: Cross-pillar SOPs (handoff between pillars)?
- OQ5.2: SOP composition (SOP invokes SOP)?
- OQ5.3: Conditional branching?
- OQ5.4: Rollback / Saga pattern?
- OQ5.5: Authoring tooling UX?
- OQ5.6: Multilingual SOPs?

## Anti-patterns

- ❌ SOP as 1 giant skill
- ❌ SOP in code (Python)
- ❌ Global sops/ folder
- ❌ Step state in skill memory
- ❌ SOP without quality gates
- ❌ Auto-promote ad-hoc to SOP

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| YAML parsing | Standard library |
| Subagent invocation | Bài #5 pattern |
| Ops state machine | ops.tasks (Phase A) |
| HITL | governance/HITL.md (Phase A) |
| Cost attribution | Bài #7 |
| Scheduling | Bài #8 (DRAFT) |

## Ritsu adds (Outer Harness)

1. SOP YAML schema (definition format)
2. Per-pillar `sops/` folder structure
3. `sop-execute` skill (orchestration engine)
4. `sop-author` + `sop-candidate-detector` skills
5. `pre-sop-execute` hook (governance enforcement)
6. ops.sop_runs index table
7. Pillar template
8. Authoring discipline (3 rules)

## Lessons captured

1. SOP layer ≠ skill layer ≠ task decomposition. Three distinct abstractions.
2. YAML > Python for SOP definition (declarative, agent-readable).
3. Per-pillar storage > global sops/ folder.
4. Reuse ops.tasks, don't create new state machine.
5. Hook + skill defense pattern continues.
6. Authoring discipline is content-level, not infrastructure.
7. Pillars emerge from SOP need.
8. SOP tier ≥ max step tier (escalation gap prevention).
