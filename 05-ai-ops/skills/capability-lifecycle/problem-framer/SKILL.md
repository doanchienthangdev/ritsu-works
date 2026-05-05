---
name: problem-framer
description: Phase 1 of CLA workflow (Bài #20). Frames raw capability proposal into canonical problem statement với clarifying questions, success criteria, constraints. Use this skill when founder proposes new business capability ("Tôi cần X", "Làm sao Y") and SOP-AIOPS-001 is invoked.
---

# Problem Framer (CLA Phase 1)

## When to use

Invoke this skill khi:
- Founder proposes new business capability
- SOP-AIOPS-001 phase 1 fires
- `ops.capability_runs.current_phase = 1`

## Inputs

- `raw_proposal` (string): Founder's raw text proposal
- `capability_id` (string, optional): Pre-assigned slug; otherwise auto-generate
- `triggered_by` (enum): voice_note | cla_command | wiki_entry

## Process

### Step 1: Parse raw proposal
Extract:
- Verb (what action): "kiếm", "automate", "scale", etc.
- Object (what entity): "khách hàng", "support tickets", "content"
- Constraints (if mentioned): volume, time, budget

### Step 2: Generate slug
From extracted terms, generate kebab-case slug:
- "Kiếm thêm 10 khách hàng mới mỗi ngày" → "daily-customer-acquisition"
- "Tự động xử lý support tickets" → "support-triage-automation"

If similar capability exists trong registry, append qualifier: `-v2`, `-extended`.

### Step 3: Generate clarifying questions (5-7)
Required dimensions:
- **Đối tượng:** Ai là target (B2C learner? B2B admin? specific segment)?
- **Định nghĩa:** "Khách hàng" = signup? activated? paid? specific tier?
- **Volume:** N/day = floor or ceiling? sustainable hay burst?
- **Budget:** CAC ceiling? monthly recurring max?
- **Time horizon:** Production-ready by when? MVP date?
- **Constraints:** Founder bandwidth limits? Channels off-limits? Ethics red lines?
- **Existing fit:** Touches which pillar (01-growth? 02-customer?)?

### Step 4: Draft success criteria (measurable)
Format: "X happens, measured by Y, target Z, by date D"

Example:
- "10 new customers signed up daily, measured by ops.kpi_snapshots[daily_new_customers], target = 10, by 2026-06-12"

### Step 5: Surface assumptions

Explicit list ASSUMING:
- Current state of metric (e.g., "Currently 2-3 customers/day")
- Available resources (e.g., "Budget $200/mo for paid acquisition")
- Channels in scope (e.g., "Content + organic + paid; no cold calling")

### Step 6: Output problem.md

Generate `wiki/capabilities/<id>/problem.md`:

```markdown
# Capability: <name>

**ID:** <id>
**Proposed:** <date>
**Proposer:** <founder>
**Pillar (tentative):** <pillar>
**Current phase:** 1 (problem-framing)

## Raw proposal
<original text from founder>

## Refined problem statement
<concise, unambiguous version>

## Success criteria
- [ ] <measurable criterion 1>
- [ ] <measurable criterion 2>

## Clarifying questions

### Q1: <question>
**Founder answer:** <to be filled>
**Why this matters:** <impact on solution>

(Q2-Q7 same format)

## Assumptions
- <assumption 1>
- <assumption 2>

## Out of scope
<things explicitly NOT covered>

## Next phase
Phase 2: Domain Deep-Dive
```

### Step 7: HITL prompt

After draft generated, present to founder via Telegram or Claude Code session:

```
[HITL Tier A] Capability proposal framed: <name>

Review at: wiki/capabilities/<id>/problem.md

7 clarifying questions need answers. Respond:
- Inline answers in problem.md, OR
- "/cla answer <id>" to provide via Telegram, OR
- "/cla skip" to proceed với assumptions

Auto-proceed in 24h if no response.
```

## Outputs

- `wiki/capabilities/<id>/problem.md` (canonical)
- Updated `ops.capability_runs.problem_path`
- Audit log entry: `phase_1_completed`
- Event fired: `ritsu.capability.problem_framed`

## State transition

`proposed → analyzing` (when founder confirms or 24h passes)

## Failure modes

- **Ambiguous proposal:** > 50% words vague → request rewrite
- **Duplicate capability:** Similar slug already in registry → ask if extending or net-new
- **Out of scope:** Proposal not actually a capability (e.g., bug report) → re-route

## LLM mode awareness (per chương 30)

- **Subscription mode:** Founder uses Claude Code session manually → prompt-based interaction
- **Hybrid/Full API:** Auto-proceed với LLM-generated clarifying questions
- **Fallback:** Queue for founder review, no auto-generation

## Cost estimate (Bài #7)

- Anthropic API: ~$0.05 per invocation (1 LLM call to draft problem.md)
- Founder time: 5-10 min answering clarifying questions

## Examples

### Example 1
**Input:** "Tôi cần kiếm thêm 10 khách hàng mới mỗi ngày"
**Output slug:** `daily-customer-acquisition`
**Output:** problem.md với 7 clarifying questions covering segments, definition of customer, sustainability, budget, etc.

### Example 2
**Input:** "Tự động xử lý support tickets từ Telegram"
**Output slug:** `telegram-support-auto-triage`
**Output:** problem.md với 6 clarifying questions covering ticket types, escalation criteria, response SLA, etc.

---

**Next phase invokes:** `domain-analyst` skill
