---
name: options-generator
description: Phase 4 of CLA workflow (Bài #20). Generates 3-5 implementation options với cost/time/complexity analysis + recommendation. Founder picks one or requests combination via Tier B HITL.
---

# Options Generator (CLA Phase 4)

## When to use

After Phase 3 gap-analysis.md ready. Capability state = `architecting`.

## Inputs

- All Phase 1-3 artifacts
- `feature-flags.yaml` (current LLM mode)
- `capability-registry.yaml` (existing capabilities for context)

## Process

### Step 1: Brainstorm options (3-5 viable)
Per capability, typical options:
- **Pure organic** (free, slow)
- **Pure paid** (fast, expensive)
- **Mostly automation + minimal external** (moderate cost, leverages Agent OS)
- **Heavy external service stack** (high cost, fast deploy)
- **Combination** (pragmatic mix — usually recommended)

### Step 2: Per-option analysis

Each option scores:
- **Cost setup** (one-time)
- **Cost recurring** (monthly)
- **Founder time setup** (hours)
- **Founder time ongoing** (hours/week)
- **Complexity** (low/medium/high)
- **Time to MVP** (weeks)
- **Time to production** (weeks)
- **Risk level** (low/medium/high)
- **Reversibility** (Bài #15)
- **Decision tier** (Bài #2 A-E)
- **Bài toán touched** (which architecture layers)

### Step 3: Recommendation

End document với `## Recommended Option`:
- Why selected
- What we trade off vs other options
- Suggested adjustments (e.g., "Option C, but defer X to Phase 2")

### Step 4: Output options.md

```markdown
# Options: <capability>

## Option A: <name>
[full analysis as above]

## Option B: <name>
[full analysis]

## Option C: <name>
[full analysis]

## Comparison matrix
| Dimension | A | B | C |
|---|---|---|---|
| Setup cost | | | |
| Recurring | | | |
| Time to MVP | | | |
| ... | | | |

## Recommended: Option <X>
**Reasoning:** <why>
**Trade-offs accepted:** <what we give up>
**Suggested adjustments:** <if any>
```

### Step 5: HITL prompt (Tier B)

```
[HITL Tier B] Options ready for <capability_id>

Reviewed: 3 options analyzed
Recommended: Option <X>

Choose:
1. Approve recommended (Option X)
2. Pick different option (specify A/B/C)
3. Request combination (specify)
4. Iterate (request more options)

Decision required by: <date>
```

## Outputs

- `wiki/capabilities/<id>/options.md`
- HITL Tier B record
- Decision record (Bài #15)

## State transition

`architecting` (continued, awaiting HITL B → Phase 5)

## LLM mode awareness

- **Subscription:** Founder + Claude Code generate options manually
- **Hybrid/Full API:** Auto-generate options, founder reviews

## Cost estimate

- Anthropic API: ~$0.50 per invocation (multiple option drafts + comparison)
- Founder time: 30-60 min review + decide

---

**Next phase:** `architect`
