---
name: eval-evo/install-improvement
description: |
  Applies a proposer diff to the working tree via git stash isolation. Tier-aware:
  Tier B installs in-place (git apply); Tier C+ accumulates diffs through the
  loop, then orchestrator (not this skill) opens a PR after loop completes.
  Returns success/failure + post-apply state for orchestrator decision logic.
trigger: invoked-by-orchestrator-only
budget_cap_task_kind: eval-evo-iteration  # ~$0.05 (mostly bash, no LLM)
---

# Skill: eval-evo/install-improvement

Tier-aware diff applier. Wraps `git apply` + `git stash` + `pnpm check`.

## Contract

### Input (from orchestrator)
```json
{
  "diff": "<unified diff text>",
  "entity_path": "<path>",
  "tier": "B" | "C",
  "run_id": "<uuid>",
  "iter": <int>,
  "dry_run": <bool>
}
```

### Output
```json
{
  "applied": <bool>,
  "drift_clean_post_apply": <bool>,
  "error_at_step": null | "apply" | "drift" | "post_parse",
  "error_detail": "<str if error_at_step set>"
}
```

## Process

### Step 1 — Pre-apply stash

(Already done by orchestrator's Step 2.4. This skill assumes stash is in place.)

### Step 2 — Apply diff

```bash
# Write diff to temp file
DIFF_FILE=$(mktemp /tmp/eval-evo-iter-${iter}.XXXXXX.diff)
echo "${diff}" > "$DIFF_FILE"

# Apply
if [ "${dry_run}" = "true" ]; then
  git apply --check --whitespace=nowarn -- "$DIFF_FILE"
  APPLY_EXIT=$?
else
  git apply --whitespace=nowarn -- "$DIFF_FILE"
  APPLY_EXIT=$?
fi
rm -f "$DIFF_FILE"

if [ $APPLY_EXIT -ne 0 ]; then
  return { applied: false, drift_clean_post_apply: null, error_at_step: "apply", error_detail: "git apply exit ${APPLY_EXIT}" }
fi
```

### Step 3 — Post-apply parse check

For the touched file, verify it still parses correctly:
- `.md` files: best-effort frontmatter YAML parse if frontmatter present
- `.yaml` files: full YAML parse via `js-yaml`
- `.sql` files: regex check for balanced parentheses + semicolon termination
- other: skip parse check

If post-apply parse fails: return error_at_step='post_parse'. Orchestrator
auto-reverts via `git stash pop`.

### Step 4 — Drift gate (post-apply)

```bash
pnpm check
DRIFT_EXIT=$?
```

If non-zero: return error_at_step='drift', drift_clean_post_apply=false.
Orchestrator handles revert.

### Step 5 — Return

```json
{
  "applied": true,
  "drift_clean_post_apply": true,
  "error_at_step": null
}
```

## Tier-aware behavior

This skill does NOT distinguish Tier B vs Tier C+ — it just applies the
diff. The orchestrator's POST-LOOP step handles tier differentiation:
- Tier B: working tree retains the kept diff; orchestrator marks done
- Tier C+: working tree retains accumulated diff; orchestrator invokes
  outside-voice + opens PR

`dry_run` flag skips the actual apply (uses `git apply --check`). Useful
for validating proposer output without modifying the tree.

## Error handling

| Error class | When | Handling |
|---|---|---|
| `DiffApplyError` | git apply exit non-zero | Return error_at_step='apply'; orchestrator stash-pops |
| `PostApplyParseError` | post-apply file parse failed | Return error_at_step='post_parse'; orchestrator stash-pops |
| `PostIterDriftError` | pnpm check failed | Return error_at_step='drift'; orchestrator stash-pops |

All explicit. No silent failures.

## Cost

Per invocation: ~$0.05 (no LLM; just bash + ops.* writes via subprocess).

The $0.50 per-iter budget is mostly consumed by propose-improvement (~$0.15-0.20)
+ judge eval ×2 (~$0.20). Install is the cheap step.
