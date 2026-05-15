# SOP-AIOPS-003 — SOP Runtime Contract

> **The canonical contract for what an SOP is, how it's invoked, and what `flow.yaml` must contain.**
> Every other SOP in this repo MUST conform to the schema defined here. The validator (`validator/validate.ts`) enforces it. Smoke test SOP-AIOPS-004 runs the validator across every `flow.yaml` in repo.

**Sequence note:** Numbered 003 because 001 (capability-lifecycle) and 002 (cross-tier-consistency) already existed at this prefix in `05-ai-ops/sops/`. Conceptually 003 is the load-bearing foundation — the runtime contract that defines what 001/002 ARE. Future re-org (sub-pillar reorganization of the flat `sops/` dir) may renumber.

**Pillar:** AI-Ops · `01-sop-engine` sub-pillar
**Owner role:** aiops-engineer
**HITL tier:** C (changes to schema affect every SOP)
**Status:** v1.0 (initial spec, will iterate)

---

## What is an SOP?

A **Standard Operating Procedure (SOP)** is a versioned, executable workflow definition that:

1. **Has a single purpose** — does one specific thing for one specific outcome
2. **Has a triggered invocation model** — fires on cron, event, manual, manual_gate, or api
3. **Is owned by exactly one pillar** — the `owner_pillar` field is canonical
4. **Has a HITL tier** — every SOP run is governed per `governance/HITL.md`
5. **Has a cost ceiling** — the `cost_estimate` field is a budget gate enforced by `pre-llm-call-budget` hook
6. **Is auditable** — every run produces a row in `ops.agent_runs` referencing the SOP version

SOPs are NOT:
- Long-running services (those are agents)
- Adhoc scripts (those are skills)
- Data definitions (those are schemas/migrations)

## Anatomy of an SOP directory

```
sops/SOP-<CODE>-<NNN>-<slug>/
├── README.md           # What this SOP does, when it fires, what success looks like
├── flow.yaml           # Conforms to flow-schema.yaml (validated by SOP-AIOPS-004)
├── examples/           # Optional: example invocations + expected outputs
├── steps/              # Optional: per-step prompt templates / scripts
└── tests/              # Optional: integration tests (called by smoke test)
```

## Lifecycle

```
PR opens with new SOP
    │
    ▼
flow.yaml validated against flow-schema.yaml (via SOP-AIOPS-004 smoke test in CI)
    │
    ▼
PR merged
    │
    ▼
SOP runtime registers SOP at start (reads flow.yaml from disk)
    │
    ▼
Triggered (cron / event / manual / api / manual_gate)
    │
    ▼
Pre-flight: HITL tier check, cost estimate vs budget, dependencies resolved
    │
    ▼
Execute steps in order; each step produces output rows
    │
    ▼
Post-flight: write ops.agent_runs row with full state, cost, outcome
    │
    ▼
On failure: rollback per `rollback` field; alert per severity
```

## Invocation models (the `trigger` field)

- **`cron`** — fires on schedule (`cron_schedule` required, eg `0 9 * * MON`). Idempotent strongly preferred.
- **`event`** — fires on a row appearing in `ops.events` matching a filter. SOP defines the filter. Best for reactive flows.
- **`manual`** — invoked explicitly by gps or a human via Telegram. No automatic firing.
- **`manual_gate`** — like manual, but the SOP is a gate in a larger workflow — doesn't run on its own; another SOP awaits its approval.
- **`api`** — invoked via HTTP from an Edge Function or external system. Use sparingly; most flows should be event-driven.

## Required `flow.yaml` fields

See `flow-schema.yaml` for the JSONSchema. Summary:

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | SOP name in slug form (matches dir name) |
| `version` | string | yes | semver |
| `owner_pillar` | string | yes | Must match a pillar in `manifest.yaml` `tier1_canonical.pillars` |
| `owner_role` | string | yes | Must match a role in `governance/ROLES.md` |
| `trigger` | enum | yes | `cron` \| `event` \| `manual` \| `api` \| `manual_gate` |
| `cron_schedule` | string | conditional | Required iff `trigger=cron`; cron expression |
| `event_filter` | object | conditional | Required iff `trigger=event` |
| `inputs` | object | yes | Typed input schema (can be empty `{}`) |
| `outputs` | object | yes | Typed output schema |
| `steps` | array | yes | Ordered list of step definitions |
| `hitl_tier` | enum | yes | `A` \| `B` \| `C` \| `D-Std` \| `D-MAX` |
| `cost_estimate` | number | yes | USD ceiling per run; budget gate fails if estimated cost exceeds |
| `idempotent` | boolean | yes | true if running this SOP multiple times produces same result |
| `partial_idempotent` | boolean | yes | true if SOP-level idempotent but individual steps may have side effects on retry |
| `rollback` | enum | yes | `none` \| `automatic` \| `manual_runbook` |
| `rollback_steps` | array | conditional | Required if `rollback=automatic` |

## Step types (within `steps`)

| Step type | Purpose | Cost contribution |
|---|---|---|
| `llm_call` | Invoke Claude API for reasoning | High (variable) |
| `tool_call` | Invoke MCP tool (eg Supabase query, Stripe API) | Low |
| `subprocess` | Spawn local script | Low |
| `human_approval` | Wait for HITL approval per HITL.md tier | None (blocks until human acts) |
| `db_write` | Write to ops.* tables | Low |

## Validation

Before merging any SOP PR:

1. `pnpm check` runs SOP-AIOPS-004 smoke test → validator runs over every `flow.yaml`
2. Validator checks: schema conformance, owner_pillar exists, owner_role exists, hitl_tier valid, cost_estimate present
3. CI fails if any flow.yaml is invalid

## Examples

See `examples/` directory:

- `examples/cron-example.yaml` — daily SOP firing at 09:00 UTC
- `examples/event-example.yaml` — fires when ops.events has matching row
- `examples/manual-example.yaml` — invoked by founder via Telegram
- `examples/manual-gate-example.yaml` — gates another SOP's progress
- `examples/api-example.yaml` — invoked via HTTP from Edge Function

Each example is fully valid and passes the validator.

## When to update this contract

This SOP itself follows HITL tier C (per `pre-edit-tier1.md` line 12 reference to gtm-001 — same pattern applies here). Schema changes require:

1. PR with proposed schema delta
2. Migration plan for existing SOPs that don't conform
3. Update validator + smoke test
4. Founder approval

Never bypass the schema. The whole point of this SOP is to ensure consistency across ~80+ SOPs.
