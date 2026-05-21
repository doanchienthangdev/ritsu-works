---
name: eval-evo/propose-improvement
description: |
  Generates an improvement diff for an entity based on current score + sub-scores
  + memory context + corrections. Output: unified diff. Constraints: must touch
  only paths in playbook.allowed_paths_for_proposer. Reverse-Goodhart prompt
  discipline. Invoked by orchestrator each iter.
trigger: invoked-by-orchestrator-only
budget_cap_task_kind: eval-evo-iteration  # $0.50 (shared with install + drift + post-judge)
---

# Skill: eval-evo/propose-improvement

Generates an improvement diff. Type-agnostic: takes scored entity + context,
returns unified diff.

## Contract

### Input (from orchestrator)
```json
{
  "entity_path": "<path>",
  "entity_content": "<current file content>",
  "entity_type": "skill|command|agent|hook|sop",
  "playbook_path": "<path>",
  "allowed_paths": ["<glob>", ...],   // from playbook.allowed_paths_for_proposer
  "score_pre": <int>,
  "sub_scores_pre": [<10 ints>],
  "rationale_pre": "<judge's pre-score rationale>",
  "weakest_sub_scores": [<indices of 3 lowest>],  // hint for proposer focus
  "memory_context": "<combined: past run_summaries + ops.corrections + this run's failure summaries>",
  "run_id": "<uuid>",
  "iter": <int>
}
```

### Output
```json
{
  "diff": "<unified diff text>",
  "rationale": "<why this change should improve the score>",
  "targeted_sub_scores": [<indices C1..C10 this diff aims to lift>]
}
```

On no improvement found:
```json
{
  "diff": "",
  "rationale": "no improvement identified in this iter",
  "targeted_sub_scores": []
}
```

## Process

### Step 1 — Construct proposer prompt

```
prompt:
"""
You are eval-evo-orchestrator. Your job: propose ONE concrete improvement to
the entity below that will lift its quality score on the playbook rubric.

The judge (@<judge>) just scored this entity:
  Composite: <score_pre>
  Sub-scores: C1=<>, C2=<>, ..., C10=<>
  Judge rationale: "<rationale_pre>"
  Weakest dimensions: <list weakest 3 sub-score IDs + names>

Your task: write a unified diff that targets ONE OR TWO of the weakest
dimensions. DO NOT try to fix everything at once. Small targeted improvement
> sweeping rewrite.

CONSTRAINTS:
1. Touch ONLY these paths:
   <allowed_paths formatted as a list>
2. Output a unified diff, exactly parseable by `git apply`. Format:
     --- a/<path>
     +++ b/<path>
     @@ -<line>,<count> +<line>,<count> @@
     ...
3. DO NOT make changes that prior founder corrections rejected:
   <last 10 ops.corrections rows formatted>
4. DO NOT trick the rubric. The judge is checking actual quality, not
   whether the prose matches the rubric vocabulary. Improve the substance.
5. If you cannot identify a concrete improvement, return an empty diff with
   rationale "no improvement identified."

Entity content (target of the diff):
---
<entity_content>
---

Past run summaries (what's been tried before):
<memory_context>

Output JSON only:
{
  "diff": "<unified diff text or empty string>",
  "rationale": "<one sentence why>",
  "targeted_sub_scores": [<C-IDs you're targeting>]
}
"""

settings: temp=0.3, max_tokens=2000
```

### Step 2 — Validate diff

1. Parse JSON. On parse fail: raise `DiffParseError` (no retry — proposer
   should output JSON first try).
2. If `diff == ""`: return as-is (orchestrator treats as `EmptyDiffError` if
   2 consecutive iters return empty).
3. Validate diff format:
   - Parses as unified diff (use `parse-diff` library or regex)
   - All touched paths match at least one pattern in `allowed_paths`
4. On path violation: raise `DiffParseError` with detail "proposer touched
   path X outside allowed_paths".

### Step 3 — Return

Return JSON to orchestrator. Orchestrator handles apply via
`install-improvement` skill.

## Anti-Goodhart instructions baked into prompt

- Explicit "improve substance, not match rubric vocabulary"
- "Don't try to fix everything at once" (forces focus)
- "DO NOT make changes that prior founder corrections rejected" (negative signal)
- temp=0.3 (some creativity but mostly deterministic)

## Cost

Per invocation: ~$0.15-0.20 (Sonnet: ~2K tokens input, ~1.5K tokens output).
Within $0.50 per-iter cap (combined with judge eval + install).

## Reuse across entity types

This skill is type-agnostic. The PROMPT adapts via:
- `<judge>` placeholder substituted with playbook's judge_persona
- `<allowed_paths>` from playbook frontmatter
- `<entity_content>` is the entity file body — works for any text file type

No per-type skill needed for proposer (unlike scoring which is per-type).
