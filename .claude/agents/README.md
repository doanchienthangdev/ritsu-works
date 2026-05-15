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

## Wave plan

### Wave 1 (current)
No agents yet — Claude Code default behavior với CLA workflow recognition.

### Wave 4-5 (Bài #5 multi-agent)
Add specialized agents (paths reflect post pillar architecture v1.0.1 restructure):
- `support-agent.md` — classify tickets, route per `05-customer/03-support/sops/`
- `cs-coach.md` — activation funnel per `05-customer/01-success/sops/`
- `customer-lead.md` — weekly customer health review per `05-customer/`
- `gtm-orchestrator.md` — funnel orchestration per `03-gtm/sops/`
- `product-orchestrator.md` — weekly product review per `04-product/sops/`
- `metrics-curator.md` — KPI registry + dashboards per `10-metrics/01-kpi-registry/sops/`
- `cost-watchdog.md` — Bài #7 cost monitoring per `06-ai-ops/05-cost-budget-architecture/sops/`
- `trust-safety.md` — DMCA, GDPR, hallucination triage per `07-trust-safety/sops/`
- `founder-coach.md` — top-idea drift detection per `09-founder/01-cognition/sops/`
- `hitl-router.md` — Telegram bot logic per `09-founder/03-hitl-flow/sops/`

### Wave 6+
Per-pillar specialized agents as capabilities deploy.

## Cross-references

- `governance/HITL.md` — HITL tier definitions per agent
- `knowledge/mcp-tools.yaml` — tools each agent can call
- `knowledge/mcp-roles.yaml` — per-role tool whitelists
- `06-ai-ops/skills/` — composable skills agents invoke

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
