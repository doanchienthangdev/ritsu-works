# 05-ai-ops — AI Operations Pillar

> Trụ cột "Vận hành AI": skills, agents, SOPs, surface-adapters, ingestion-adapters, format-converters, MCP server.

**Status:** Active (Wave 1 deployed, Wave 2-8 expansion)
**Pillar code:** AI-OPS
**Bài toán reference:** All 20 (cross-cutting infrastructure)

---

## Scope

Pillar 05-ai-ops chịu trách nhiệm AI workforce infrastructure:

- **Skills** — composable, callable units of AI work (Anthropic SKILL.md convention)
- **Agents** — Claude Code agent definitions (`.claude/agents/`)
- **SOPs** — meta-orchestration cho cross-pillar workflows
- **Surface adapters** — Bài #17 multi-surface publishing
- **Ingestion adapters** — Bài #18 knowledge ingestion
- **Format converters** — surface-specific transformations
- **MCP server** — Bài #12 tool exposure cho Claude Code

## Folder structure

```
05-ai-ops/
├── README.md                       ← this file
├── skills/                         ← skill library
│   ├── ai-disclosure-check/
│   ├── capability-lifecycle/       ← Bài #20 CLA (8 sub-skills)
│   ├── cost-optimization-review/
│   ├── cost-report/
│   ├── episodic-recall/
│   ├── monthly-learning-review/
│   ├── task-decompose/
│   └── task-status/
├── sops/                           ← meta SOPs (cross-pillar)
│   └── SOP-AIOPS-001-capability-lifecycle/  ← Bài #20
├── surface-adapters/               ← Bài #17 (Wave 6)
├── ingestion-adapters/             ← Bài #18 (Wave 6)
├── format-converters/              ← surface adaptation
└── agents/                         ← Claude Code agents (Phase B)
```

## Skill conventions

Each skill = folder with `SKILL.md`:

```
skills/<skill-name>/
├── SKILL.md            ← description, usage, examples (Anthropic convention)
├── prompt.md           ← optional: detailed prompt template
├── tests/              ← optional: test cases
└── examples/           ← optional: example invocations
```

YAML frontmatter:
```yaml
---
name: skill-name
description: When to use this skill (1-2 sentences)
---
```

## SOP conventions

Each SOP = folder with `flow.yaml` + `README.md`:

```
sops/SOP-<PREFIX>-<XXX>-<name>/
├── flow.yaml           ← orchestration spec
├── README.md           ← human-readable doc
├── steps/              ← per-step implementation refs
└── tests/              ← E2E test scenarios
```

## Wave 1 deployed

- ✅ Skills: ai-disclosure-check, cost-optimization-review, cost-report, episodic-recall, monthly-learning-review, task-decompose, task-status
- ✅ Bài #20 CLA: 8 specialized skills + SOP-AIOPS-001
- ⏳ Surface adapters: Wave 6
- ⏳ Ingestion adapters: Wave 6
- ⏳ MCP server: Wave 4

## Cross-pillar dependencies

- All other pillars (01-08) reference skills + SOPs từ here
- `governance/HITL.md` — defines when AI ops require human approval
- `knowledge/manifest.yaml` — declares skill registry
- `knowledge/feature-flags.yaml` — gates LLM-dependent skills (chương 30)

## Adding new skills

Standard flow (per Bài #20 CLA):
1. Capability proposed → CLA Phase 5 generates skill stub trong `wiki/capabilities/<id>/draft/skill-stubs/`
2. Phase 7 implements skill in `05-ai-ops/skills/<skill-name>/`
3. Phase 8 catalogs in `manifest.yaml`

## Adding new SOPs

1. Identify cross-pillar workflow (single-pillar SOP belongs in that pillar's `sops/`)
2. Create `SOP-AIOPS-<XXX>-<name>/` folder
3. Define `flow.yaml` (steps, HITL tiers, integrations)
4. Document `README.md`

---

*Pillar 05-ai-ops scaffolded by Agent OS Boilerplate. Customize per project — different domains may not need all skills/adapters.*
