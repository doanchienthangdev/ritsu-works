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
Add specialized agents:
- `support-triager.md` — classify tickets, route per `02-customer/sops/`
- `content-strategist.md` — `01-growth/` ideation
- `cost-watchdog.md` — Bài #7 cost monitoring
- `gdpr-officer.md` — Bài #16 + 07-compliance/
- `decision-recorder.md` — Bài #15 Muse panel orchestrator

### Wave 6+
Per-pillar specialized agents as capabilities deploy.

## Cross-references

- `governance/HITL.md` — HITL tier definitions per agent
- `knowledge/mcp-tools.yaml` — tools each agent can call
- `knowledge/mcp-roles.yaml` — per-role tool whitelists
- `05-ai-ops/skills/` — composable skills agents invoke

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
