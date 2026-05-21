# Golden cases — eval-evo

> Per-entity-type golden case battery. Used by `score-<type>/SKILL.md`
> during judging. Goodhart mitigation layer 2 (per spec.md §6.5).

## Layout

```
cases/
├── README.md              # this file
├── _SCHEMA.yaml           # case file format (validated by pnpm check)
├── _HOLDOUT.yaml          # Spearman validation ratings (founder must fill)
├── skill/
│   ├── <skill-name>/
│   │   ├── case-001-<short-desc>.yaml
│   │   └── case-002-<short-desc>.yaml
│   └── ...
├── command/
│   └── <command-name>/
│       └── case-NNN-*.yaml
├── agent/
├── hook/
└── sop/
```

## Adding a case

1. Create `cases/<type>/<entity-name>/case-NNN-<short-desc>.yaml`.
   Numbering: `case-001`, `case-002`, ... per entity.
2. Conform to `_SCHEMA.yaml`. Required fields: case_id, entity_type,
   entity_name, input, expected_traits.
3. Run `node scripts/cross-tier/validate-eval-evo-schemas.cjs` to confirm
   schema validity.

## v1.0 seeding

Sprint 3 seeds 2 cases per entity type as canonical examples:
- skill: `cases/skill/wiki-sync-distill/case-001-*.yaml`, `case-002-*.yaml`
- command: `cases/command/evolve/case-001-*.yaml`, `case-002-*.yaml`
- agent: `cases/agent/cto/case-001-*.yaml`, `case-002-*.yaml`
- hook: `cases/hook/pre-edit-tier1/case-001-*.yaml`, `case-002-*.yaml`
- sop: `cases/sop/SOP-AIOPS-001-capability-lifecycle/case-001-*.yaml`, `case-002-*.yaml`

Real cases are added over time via /evolve invocations (each /evolve run
may discover a new edge case worth codifying).

## Hold-out ratings (_HOLDOUT.yaml)

Separate from per-case files. Records FOUNDER hand-ratings of 5 representative
entities per type (25 total) on 1-10 quality scale. Used by
`scripts/eval-evo/playbook-validate.cjs` to compute Spearman rank correlation
between founder ratings and rubric scores.

**Ship gate:** Spearman correlation ≥ 0.6 per playbook (5 playbooks total).
If <0.6, playbook is REVISED before /evolve invocations proceed.

Founder must complete `_HOLDOUT.yaml` before /evolve becomes operational.
The orchestrator's pre-flight check refuses to run with placeholder ratings.

## Case lifecycle

- **draft**: new case being written; not yet validated
- **active**: validated; in the battery
- **deprecated**: case no longer reflects current entity behavior;
  excluded from battery but kept for history

Use frontmatter `state: <draft|active|deprecated>` (optional).
