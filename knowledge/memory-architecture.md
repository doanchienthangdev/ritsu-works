# Memory Architecture

> Canonical reference for how Ritsu's AI workforce stores, retrieves, and updates knowledge across sessions.

**Status:** v1.0 spec, Strategy E (Episodic-first)
**Last updated:** 2026-05-02
**Related:** `governance/ROLES.md` (per-role memory_config), `knowledge/manifest.yaml` (Tier definitions), `_build/notes/problem-4-memory-learning-loop.md` (decision rationale)

---

## Why this document exists

Every Ritsu agent session starts with zero working memory by default. Without a clear architecture, three failure modes cascade:

1. **Pattern recurrence** — agents repeat the same mistake across sessions because no past experience surfaces
2. **Lost corrections** — founder corrections evaporate when the session ends
3. **Drift via prompt injection** — undisciplined memory writes become attack vectors (cf. Anthropic Cowork incident, Jan 2026)

This file defines four memory categories, where each lives, who can write, and how learning compounds. If you are designing a skill or agent that needs to "remember" anything, start here.

## The four memory types

Ritsu distinguishes four categories of memory, each with different storage, governance, and trust properties. The classification mirrors how human cognitive science separates memory — declarative facts, episodic events, procedural skills, semantic world-knowledge — but adapted to a multi-agent system.

### Type 1 — Declarative memory (canonical knowledge)

**What it is.** Statements about who Ritsu is, how Ritsu operates, what Ritsu's policies and standards are.

**Examples.** "Ritsu's brand voice is X." "Tier C actions require dry-run preview." "Support replies must cite the source documentation."

**Storage.** Tier 1 — git repository.
- `00-charter/` — vision, mission, values, glossary, brand_voice, product
- `governance/` — HITL, ROLES, SECRETS, BUDGET
- `**/SOP-*/` — standard operating procedures per pillar
- `skills/<name>/SKILL.md` — codified procedural knowledge as content

**Governance.** PR-only. Hooks (`pre-edit-tier1`) enforce.

**Trust level.** Highest. Has been reviewed and merged by founder.

**How agents access.** Read at session start (CLAUDE.md `@imports`) or on-demand (path-scoped CLAUDE.md, skill discovery).

### Type 2 — Episodic memory (what happened)

**What it is.** A record of things that occurred — past sessions, decisions, outcomes, costs, approvals, corrections.

**Examples.** "growth-orchestrator drafted a blog post on 2026-04-15. Founder edited 23% of the words. Token cost: 8,400. Outcome: published."

**Storage.** Tier 2 — Supabase project `ritsu-ops`.
- `ops.agent_runs` — primary table; one row per agent action
- `ops.run_summaries` — post-hoc summary of each run (Claude-generated, ~150 tokens)
- `ops.corrections` — founder corrections with reason text
- `ops.tasks`, `ops.campaigns`, `ops.support_tickets` — domain state tables

**Governance.** Append-only by agent runtime. Schema changes are PR-controlled (`knowledge/schemas/*.sql`).

**Trust level.** High. Database rows are immutable, structured, queryable.

**How agents access.** SQL query (typically via the `episodic-recall` skill before starting a task). NOT loaded automatically at session start.

**This is Ritsu's PRIMARY learning mechanism.** See "How learning compounds" below.

### Type 3 — Procedural memory (how to do things)

**What it is.** Knowledge of how to perform a task — the steps, decisions, heuristics that make the work consistent.

**Examples.** "When drafting a Tier C email, run dry-run first." "FAQ classification of billing questions uses categories X, Y, Z." "Brand voice prefers active voice over passive."

**Storage.** Tier 1 — `skills/<name>/SKILL.md`. Procedural memory IS skills.

**Governance.** PR-only.

**Trust level.** Highest (same as Type 1).

**Why no separate "procedural store"?** Strategy E rejects file-based memory tool API for v1.0 because:
- File-based memory is the primary attack surface for prompt injection (cf. Cowork incident)
- The "promotion path" from auto-written memory to canonical skill creates a bypass for PR governance
- A solo founder cannot sustain weekly review of self-written memory at scale
- Episodic recall (Type 2) plus structured skills (Type 1) cover the use cases that file memory would address

**Memory tool API status:** disabled across all roles in v1.0 (`memory_tool_enabled: false` in every role's `memory_config`). Re-evaluate post-v1.0 if a concrete multi-day workflow demonstrates a need.

### Type 4 — Semantic memory (knowledge about the world)

**What it is.** Information about external entities — competitors, customers, industry trends, sources, reference material.

**Examples.** "Quizlet charges $7.99 for premium." "Nguyen Van A on Twitter is the founder of competitor Y." "EdTech vertical CAC ranges $30-80 per signup."

**Storage.** Workspace plane.
- `wiki/` — extracted notes, sync-by-default, `_`-prefix files stay local
- `raw/` — local-only intake before extraction

**Governance.** Loose. Anyone (founder, agent) can write. The line that matters: wiki notes never directly drive agent behavior. They inform decisions; they don't command them.

**Trust level.** Variable. Notes must cite raw sources. When promoting a wiki insight to Type 1 (Tier 1 PR), follow the recipe `_build/recipes/promote-wiki-to-tier1.md`.

**How agents access.** On-demand reads from `wiki/`. Not loaded at session start.

## Memory by tier and storage location

```
┌──────────────────────────────────────────────────────────────┐
│ Type 1: DECLARATIVE     → Tier 1 (git)        PR-only        │
│ Type 2: EPISODIC        → Tier 2 (Supabase)   append-only    │
│ Type 3: PROCEDURAL      → Tier 1 (skills/)    PR-only        │
│ Type 4: SEMANTIC        → wiki/, raw/         loose          │
└──────────────────────────────────────────────────────────────┘
```

The four maps to four different governance regimes. This is intentional — different kinds of knowledge need different accountability.

## How learning compounds in Ritsu (Strategy E)

Strategy E centers on episodic memory (Type 2) as the primary feedback loop. The cycle:

```
[1] Agent starts task
       │
       ▼
[2] Agent invokes `episodic-recall` skill before reasoning
       │   → SQL query against ops.agent_runs + ops.run_summaries
       │   → Returns N=5 most recent comparable runs (~1K tokens)
       │
       ▼
[3] Agent uses recall to inform approach
       │
       ▼
[4] Agent executes task
       │
       ▼
[5] Agent writes to ops.agent_runs (per manifest schema)
       │   + ops.run_summaries (post-hoc summary, ~150 tokens)
       │
       ▼
[6] If founder corrects/rejects → write to ops.corrections
       │   with `correction_note` (reason)
       │
       ▼
[7] Monthly: `monthly-learning-review` skill scans corrections
       │   + retry patterns + failure rates
       │   → produces candidate list for founder
       │
       ▼
[8] Founder reviews candidates → decides:
       │   - "skill update" → opens PR draft
       │   - "charter update" → opens PR draft
       │   - "discard"
       │   - "keep watching"
       │
       ▼
[9] PR merged → Type 1/3 (canonical) updated
       │
       └── (next session, agents read updated canonical)
```

### Why this loop works for a 1-founder company

- **Step 2** is automatic per skill invocation — no founder time required
- **Steps 5-6** are runtime side effects — happen for free
- **Step 7** is monthly cron — predictable cognitive load
- **Step 8** is the only step requiring founder judgment — concentrated to one ~30-60 min monthly session
- **Step 9** is PR review — already part of governance flow

Compared to file-based memory (Strategy C), this loop:
- Has zero new attack surface for prompt injection (no markdown memory files)
- Compounds learning at PR cadence (monthly) rather than instant (which causes drift)
- Requires founder attention only at the deliberate review point

### What it does NOT do well

- **Multi-day in-progress task state.** Strategy E does not preserve "where am I in this 14-day campaign launch" across session restarts. If/when this becomes a concrete need (likely at Bài #5 brainstorm or in production), the answer is to add `ops.task_state` table or selectively enable memory tool API for one role with strict scoping.
- **Cross-role pattern detection.** Episodic recall is per-role by default. Cross-role patterns require an explicit query in `monthly-learning-review`.
- **Real-time correction propagation.** A correction in session N takes effect in session N+1 only via episodic recall finding the corrections row. There's a one-task lag. Acceptable for v1.0.

## Per-role memory configuration

Each role in `governance/ROLES.md` carries a `memory_config` block:

```yaml
memory_config:
  memory_tool_enabled: false       # v1.0 default; do not enable without PR + justification
  episodic_recall_enabled: true    # query ops.agent_runs at task start
  recall_window_days: 90           # how far back to look
  recall_max_runs: 5               # how many past runs to load
  recall_match_fields:             # what makes runs "comparable"
    - action_name
    - tool_calls_pattern
  emit_run_summary: true           # write to ops.run_summaries on completion
  accept_corrections: true         # writes to ops.corrections when founder rejects
```

Tuning guidance:

| Role archetype | recall_window_days | recall_max_runs | Rationale |
|---|---|---|---|
| Orchestrator | 90 | 5 | broad horizon, balanced examples |
| Specialist drafter | 60 | 3 | recent style alignment |
| High-volume responder | 30 | 5 | fast-moving patterns |
| ETL / data plumbing | 7 | 2 | recent operations dominate |
| T&S triage | 180 | 5 | rare events, longer memory |
| Backoffice | 90 | 3 | structured workflows |

The `founder` role is exempt — humans don't need automated recall.

## Tier 2 schema additions for memory

The following extend the schemas defined in Bài #1 (`knowledge/manifest.yaml`):

### `ops.run_summaries`

```sql
CREATE TABLE ops.run_summaries (
  run_id        uuid PRIMARY KEY REFERENCES ops.agent_runs(id),
  agent_role    text NOT NULL,
  action_name   text NOT NULL,
  summary       text NOT NULL,         -- ~150 tokens; what happened, what worked, what didn't
  artifacts     jsonb,                  -- file paths, URLs, identifiers
  ts            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_run_summaries_role_action ON ops.run_summaries (agent_role, action_name, ts DESC);
```

### `ops.corrections`

```sql
CREATE TABLE ops.corrections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          uuid REFERENCES ops.agent_runs(id),
  corrected_by    text NOT NULL,        -- 'founder' typically
  correction_kind text NOT NULL CHECK (correction_kind IN
                    ('reject', 'edit', 'redirect', 'reframe')),
  correction_note text NOT NULL,        -- why; the lesson
  ts              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_corrections_run ON ops.corrections (run_id);
CREATE INDEX idx_corrections_role_time ON ops.corrections (
  (SELECT agent_role FROM ops.agent_runs WHERE id = corrections.run_id),
  ts DESC
);
```

### `ops.agent_runs` — additional columns

These add to the schema spec from `knowledge/manifest.yaml`:

```sql
ALTER TABLE ops.agent_runs ADD COLUMN
  recall_run_ids        uuid[]      DEFAULT '{}',  -- which past runs were used as context
  recall_tokens_loaded  int         DEFAULT 0;     -- cost accounting for recall
```

When agents invoke `episodic-recall`, the IDs of past runs that informed the current run are recorded. This creates an explicit lineage — "this decision was informed by these prior decisions" — which is invaluable for debugging and audit.

## Anti-patterns to refuse

- **"Let's enable memory tool API for one role just to try it."** No. Either there's a documented multi-day workflow that requires it (open issue, justify, PR through D-Std ceremony) or there isn't.
- **"Auto-memory by Claude Code is convenient, leave it on."** No. Drift outside PR governance is the failure mode this architecture is designed to prevent.
- **"Promote wiki notes directly into skills via auto-script."** No. Promotion is a deliberate decision per `_build/recipes/promote-wiki-to-tier1.md`.
- **"Cache compute results in `/memories/` instead of `.archives/`."** No. `.archives/` is the right answer for transient compute. Memory tool is for cross-session learning, which is via Type 2.

## When this architecture changes

Strategy E is a v1.0 decision. Triggers to revisit:

- A concrete multi-day workflow proves Type 3 file storage is needed (likely Bài #5 outcome)
- Anthropic ships memory tool API with built-in injection defenses
- A new role archetype emerges that breaks the episodic-only assumption (e.g. a long-horizon research agent that needs working notes across 30+ days)

Any architecture change is a PR to this file plus updates to `governance/ROLES.md` and `_build/notes/problem-4-*.md` (append, don't overwrite). Treat this document as the contract.

---

*Memory in Ritsu is intentionally constrained. The constraint is the feature: a workforce that learns through governed, audited, structured channels — not through ad-hoc files that drift outside review.*
