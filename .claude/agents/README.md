# Claude Code Agents

> Custom agent definitions cho Claude Code. Each `.md` file = one agent với specialized scope.

**Convention:** [Anthropic agent definition format](https://docs.claude.com)

---

## Agent file structure

Each agent is a markdown file với YAML frontmatter:

```markdown
---
name: agent-name
description: When to invoke this agent (1-2 sentences)
tools: [Read, Write, Edit, Bash, ...]  # optional whitelist
---

# Agent Name

Detailed prompt + behavior specification.

## When invoked
- ...

## What this agent does
- ...

## Constraints
- ...
```

## Two kinds of agent files coexist here

This directory holds TWO distinct kinds of `.md` files, both following the Anthropic agent definition format. They serve different purposes and must coexist:

### 1. Persona-named agents (C-suite façade)

User-facing C-suite personas: `ceo.md`, `cto.md`, `cgo.md`, `cpo.md` (Phase 1), `cmo.md`, `cso.md`, `cco.md`, `cdo.md`, `cfo.md`, `ciso.md`, `cds.md`, `coo.md` (later phases). These are **invoked directly by the founder** via `@<slug>`. Each persona file:

- Is the runtime façade for one C-suite persona.
- Binds to a technical role through `knowledge/workforce-personas.yaml`.
- Does NOT redeclare permissions, budgets, or secrets — those live in `governance/ROLES.md` against the bound role.
- Has a parallel slash command at `.claude/commands/<slug>.md` for multi-turn sessions.
- Is compiled from the spec in `06-ai-ops/workforce-personas/<slug>/agent.md`. Drift caught by `pnpm check`.

See `06-ai-ops/workforce-personas/README.md` for the full model.

### 2. Role-named agents (technical workers)

Low-level workers named by their technical role: `support-agent.md`, `cs-coach.md`, `customer-lead.md`, etc. These are **invoked internally by personas** (or directly when a persona doesn't fit). Each role-named agent:

- Implements one technical role from `governance/ROLES.md`.
- Carries the role's permissions, budget, secrets, HITL ceiling.
- Is NOT typically invoked by the founder directly; the persona layer is the entry point.

Example flow: founder types `@cmo "draft the launch blog post"` → CMO persona resolves to `growth-orchestrator` role per registry → `growth-orchestrator.md` agent does the work → audit row in `ops.agent_runs` has both `agent_slug=growth-orchestrator` and `persona_slug=cmo`.

## Wave plan

### Wave 1 (Phase 1 — workforce personas)
Phase 1 ships the four C-suite personas:
- `ceo.md` — bound to `gps` (General Purpose Steward)
- `cto.md` — bound to `code-reviewer`
- `cgo.md` — bound to `gtm-orchestrator`
- `cpo.md` — bound to `product-orchestrator`

### Wave 4-5 (Bài #5 multi-agent — role-named workers)
Add role-named agents (paths reflect post pillar architecture v1.0.1 restructure):
- `support-agent.md` — classify tickets, route per `05-customer/support/sops/`
- `cs-coach.md` — activation funnel per `05-customer/success/sops/`
- `customer-lead.md` — weekly customer health review per `05-customer/`
- `gtm-orchestrator.md` — funnel orchestration per `03-gtm/sops/`
- `product-orchestrator.md` — weekly product review per `04-product/sops/`
- `metrics-curator.md` — KPI registry + dashboards per `10-metrics/kpi-registry/sops/`
- `cost-watchdog.md` — Bài #7 cost monitoring per `06-ai-ops/cost-budget-architecture/sops/`
- `trust-safety.md` — DMCA, GDPR, hallucination triage per `07-trust-safety/sops/`
- `founder-coach.md` — top-idea drift detection per `09-founder/cognition/sops/`
- `hitl-router.md` — Telegram bot logic per `09-founder/hitl-flow/sops/`

### Wave 6+
Per-pillar specialized agents as capabilities deploy + Phase 2/3/4 personas (CMO, CSO, CCO, CDO, CFO, CISO, CDS) when business triggers fire.

## Cross-references

- `governance/HITL.md` — HITL tier definitions per agent
- `governance/ROLES.md` — technical role permissions (source of truth for personas via `personas_bound`)
- `knowledge/workforce-personas.yaml` — persona → role binding registry
- `knowledge/mcp-tools.yaml` — tools each agent can call
- `knowledge/mcp-roles.yaml` — per-role tool whitelists
- `06-ai-ops/skills/` — composable skills agents invoke
- `06-ai-ops/workforce-personas/` — persona specs (PERSONA.md, playbook.md, routing-matrix.md, kpis.md)

## Agent vs Skill

| Aspect | Agent | Skill |
|---|---|---|
| Granularity | Coarse (broad role) | Fine (specific task) |
| Invocation | Claude Code session-level | Inline within session |
| State | Stateful conversation | Stateless function-like |
| Examples | support-triager, content-strategist | cost-report, episodic-recall |

Agents compose multiple skills. Skills are reusable across agents.

---

*Add agent definitions as Wave 4+ capabilities deploy via CLA workflow (Bài #20).*
