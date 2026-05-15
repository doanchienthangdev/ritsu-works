# SOP-AIOPS-004 — flow.yaml Smoke Test

> Runs `SOP-AIOPS-003/validator/validate.sh` across every `flow.yaml` in repo. Fails CI if any flow.yaml violates the runtime contract schema.

**Pillar:** AI-Ops · `01-sop-engine` sub-pillar
**Owner role:** aiops-engineer
**HITL tier:** A (verification only, no side effects)
**Status:** v1.0
**Trigger:** manual (invoked from `pnpm check` and CI)

## What this SOP does

One thing: walk the repo, find every `flow.yaml`, validate against `flow-schema.yaml`, exit nonzero on any failure.

## Why it exists

Per CEO review Finding 4 + Eng review Finding E3 from `.archives/pillars/PLAN.md` Appendices A+B: with ~80 SOP scaffolds being created in Phase 4, format drift is inevitable without a CI-enforced validator. This SOP is the gate.

## How to invoke

### Locally
```bash
05-ai-ops/01-sop-engine/SOP-AIOPS-003-sop-runtime-contract/validator/validate.sh
```

### From `pnpm check`
Add to root `package.json`:
```json
{
  "scripts": {
    "check:sop-flow-yaml": "05-ai-ops/01-sop-engine/SOP-AIOPS-003-sop-runtime-contract/validator/validate.sh",
    "check": "pnpm run check:sop-flow-yaml && pnpm run check-drift"
  }
}
```

### From CI
GitHub Actions workflow:
```yaml
- name: Validate SOP flow.yaml conformance
  run: pnpm run check:sop-flow-yaml
```

## What success looks like

```
$ ./validate.sh
Validating 7 flow.yaml file(s) against flow-schema.yaml

  PASS  ./05-ai-ops/01-sop-engine/SOP-AIOPS-003-sop-runtime-contract/examples/cron-example.yaml
  PASS  ./05-ai-ops/01-sop-engine/SOP-AIOPS-003-sop-runtime-contract/examples/event-example.yaml
  ...

Summary: 7 pass, 0 fail
```

## What failure looks like

```
$ ./validate.sh
Validating 8 flow.yaml file(s) against flow-schema.yaml

  PASS  ...
  FAIL  ./03-gtm/sops/SOP-GTM-002-stealth-end-checklist/flow.yaml
        data.cron_schedule is required

Summary: 7 pass, 1 fail

Failed files:
  ./03-gtm/sops/SOP-GTM-002-stealth-end-checklist/flow.yaml
```

The error message points to the exact schema violation. Fix the flow.yaml and re-run.

## Dependencies

- `ajv-cli` (preferred, fast) — `npm i -g ajv-cli ajv-formats`
- OR `python3` with PyYAML + jsonschema — `pip3 install pyyaml jsonschema`

The validator script auto-detects which is available.
