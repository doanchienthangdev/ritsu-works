---
playbook_for: workflow
judge_persona: "@cto"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - "workflows/<name>.yaml"
  - "workflows/<name>/README.md"
  - "workflows/<name>/tests/**"
sub_scores:
  - id: C1
    name: "Schema validity"
    what_10_looks_like: "Parses against workflows/_SCHEMA.yaml (when it lands); required fields present."
    what_0_looks_like: "Malformed yaml or missing required fields."
  - id: C2
    name: "Step reachability"
    what_10_looks_like: "Every step reachable from entry; no orphan steps; explicit terminals."
    what_0_looks_like: "Unreachable steps; missing terminals."
  - id: C3
    name: "Trigger clarity"
    what_10_looks_like: "Entry conditions explicit; matches event/scheduled trigger documentation."
    what_0_looks_like: "Trigger implicit or undocumented."
  - id: C4
    name: "Error handling completeness"
    what_10_looks_like: "Every step has error path; rollback strategy stated."
    what_0_looks_like: "Happy path only."
  - id: C5
    name: "HITL placement"
    what_10_looks_like: "Tier B/C/D-Std checkpoints explicit per governance/HITL.md."
    what_0_looks_like: "No HITL checkpoints; auto-runs through irreversible actions."
  - id: C6
    name: "Cost discipline"
    what_10_looks_like: "Per-step cost-bucket attribution; hard caps per phase."
    what_0_looks_like: "No cost tracking."
  - id: C7
    name: "Idempotence"
    what_10_looks_like: "Re-running workflow yields same result; no duplicate side effects."
    what_0_looks_like: "Each re-run creates new state; not idempotent."
  - id: C8
    name: "Cross-tier discipline"
    what_10_looks_like: "Reads from manifest; writes attributed; respects 4-tier model."
    what_0_looks_like: "Bypasses manifest; writes direct to product Supabase."
  - id: C9
    name: "Run-summary emission"
    what_10_looks_like: "Workflow run writes to ops.run_summaries; future workflows can recall."
    what_0_looks_like: "Amnesic — no run summary."
  - id: C10
    name: "Founder time impact"
    what_10_looks_like: "Founder time well-bounded; HITL volume estimated; cost projected."
    what_0_looks_like: "Unbounded founder time demand."
---

# Eval-Evo Playbook: workflow (STUB v1.1)

**Status: STUB until workflows/ folder ships.**

Per `knowledge/manifest.yaml` `workflows.status: planned`, the `workflows/`
folder does not yet exist in ritsu-works. `/update workflow <name>` REFUSES
at runtime via the orchestrator until the workflows capability lands.

When the capability ships:
1. `workflows/` folder is created
2. `workflows/_SCHEMA.yaml` defines required fields per workflow
3. /update workflow REFUSE branch in the orchestrator naturally falls through
4. Sub_scores above may need refinement based on real workflow yamls — track
   via `/cla tune workflow-playbook` after first 5 workflow updates

## Per Karpathy K3 (ONE editable artifact)

```yaml
allowed_paths_for_proposer:
  - "workflows/<name>.yaml"
  - "workflows/<name>/README.md"
  - "workflows/<name>/tests/**"
```

## Why we ship the stub now

Per `.archives/cla/update/v1.1-brainstorming/04-workflow.md`:

1. **Symmetry**: founder asked for hook/pillar/folder/workflow/file coverage. 4 of 5 alone leaves a documentation gap.
2. **Forward-compat**: when workflows ship, /update workflow JUST WORKS.
3. **Minimal cost**: stub is ~50 LOC playbook + REFUSE branch in orchestrator.

## Runtime REFUSE message

```
/update workflow blocked until workflows/ folder ships.

knowledge/manifest.yaml workflows.status: planned

Track progress:
  /cla list --state=implementing | grep workflow

For now, hand-edit workflow yamls (none exist yet) + commit via PR.
```

## Cross-tier invariant (declared v1.1 Sprint 3 — status: deferred)

`update-workflow-requires-workflows-folder` — see `knowledge/cross-tier-invariants.yaml`.
Vacuously true until workflows/ ships (runtime REFUSE prevents any state=completed
runs of /update workflow until then).

## Judge persona: @cto

Workflows are technical orchestration definitions; @cto over @ceo for the judge role.
