# 06-ai-ops/workforce-personas — C-suite Persona Layer

> The façade plane. CEO, CTO, CGO, CPO and (later) CMO, CSO, CCO, CDO, CFO, CISO, CDS, COO. Each persona is a voice + decomposition + routing overlay on top of a technical role defined in `governance/ROLES.md`.

**Layer:** Evergreen (sub-pillar of `06-ai-ops`)
**Stage status:** Phase 1 active (CEO, CTO, CGO, CPO) — see `knowledge/workforce-personas.yaml`
**Owner role(s):** `aiops-engineer` (TBD — see STATUS.md), `gps` (CEO binds here)
**HITL baseline:** inherited from each persona's bound role

---

## Why this exists

A persona is what the founder *talks to*. A role is what *acts under the hood*. A pillar is where *the work lives on disk*. Three planes; explicit mapping.

```
  ┌───────────────────────────────────────────────────────────┐
  │ PERSONA LAYER (this sub-pillar)                            │
  │ /ceo, /cmo, /cgo, /cto, /cpo, ...                          │
  │ Voice, decomposition, routing, escalation defaults         │
  └────────────────────┬──────────────────────────────────────┘
                       │  binds via knowledge/workforce-personas.yaml
                       ▼
  ┌───────────────────────────────────────────────────────────┐
  │ ROLE LAYER (governance/ROLES.md)                           │
  │ gps, gtm-orchestrator, product-orchestrator, ...           │
  │ Secrets, budgets, MCP grants, HITL tier                    │
  └────────────────────┬──────────────────────────────────────┘
                       │  home_pillar
                       ▼
  ┌───────────────────────────────────────────────────────────┐
  │ PILLAR LAYER (manifest.yaml)                               │
  │ Where SOPs/skills/data live on disk                        │
  └───────────────────────────────────────────────────────────┘
```

Personas do NOT redeclare permissions. They MAY narrow defaults below the bound role's ceiling. They MAY NEVER broaden. Validators in `scripts/cross-tier/` enforce this.

## What lives here

```
06-ai-ops/workforce-personas/
├── README.md                  (this file)
├── ceo/                       Phase 1 — bound to `gps`
│   ├── README.md
│   ├── PERSONA.md             voice, posture, decision style
│   ├── playbook.md            common workflows + decision trees
│   ├── routing-matrix.md      ← CEO owns the master copy
│   ├── kpis.md                what this persona is measured on
│   ├── agent.md               spec for .claude/agents/ceo.md
│   ├── command.md             spec for .claude/commands/ceo.md
│   └── dossier.md             auto-updated chronological log
├── cto/                       Phase 1 — bound to `code-reviewer`
├── cgo/                       Phase 1 — bound to `gtm-orchestrator`
└── cpo/                       Phase 1 — bound to `product-orchestrator`
```

Phase 2-4 sub-folders ship when the corresponding business trigger fires (see `knowledge/workforce-personas.yaml` `activation_trigger` fields).

## How to add or modify a persona

1. Spec lives in `.archives/workforces/` planning area first (local-only).
2. When approved, copy spec files to `06-ai-ops/workforce-personas/<slug>/`.
3. Add or update the row in `knowledge/workforce-personas.yaml`.
4. Add `personas_bound: [<slug>]` back-reference to the bound role in `governance/ROLES.md`.
5. Compile `<slug>/agent.md` → `.claude/agents/<slug>.md`.
6. Compile `<slug>/command.md` → `.claude/commands/<slug>.md`.
7. Update CEO's `routing-matrix.md` to include the new persona.
8. Run `pnpm check` — drift validators (PR 2/4 in workforce phase 1 stack) catch missing pieces.
9. Open PR (Tier C per HITL.md).

## Invariants enforced by `check-drift`

- L1: every active persona has a folder here with the 7 canonical files.
- L1: every active persona's bound role exists in `governance/ROLES.md`.
- L1: every active persona has matching `.claude/agents/<slug>.md` + `.claude/commands/<slug>.md`.
- L2: `default_hitl_max` ≤ bound role's `hitl_max_tier` (never broadens).
- L2: voice block in `<slug>/PERSONA.md` matches the inlined block in compiled agent.md/command.md (whitespace-tolerant).
- L2: CEO's `routing-matrix.md` has entries for every active persona.

(Validators land in PR 2/4 of the workforce-phase1-stack.)

## Audit trail

Every invocation writes one row to `ops.agent_runs` with BOTH:
- `agent_slug` = bound technical role doing the work
- `persona_slug` = persona façade that routed/invoked it

One row, two planes. Cost is attributed to the role; observability flows through both.

## See also

- `governance/ROLES.md` — technical role permissions (the source of truth for what each role can do)
- `governance/HITL.md` — Tier A/B/C/D ceremony (personas inherit; never broaden)
- `knowledge/workforce-personas.yaml` — the binding registry
- `.claude/agents/README.md` — how persona files coexist with role-named agents
- `.archives/workforces/` — design history (planning artifacts, ADRs, scaffolds for Phase 2-4)
