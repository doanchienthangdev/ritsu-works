---
playbook_for: command
judge_persona: "@ceo"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - ".claude/commands/<name>.md"
sub_scores:
  - id: C1
    name: "Invocation clarity"
    what_10_looks_like: "Argv schema (table) is the first content section; reader can write a valid invocation within 30 seconds."
    what_0_looks_like: "Argv documented as prose; reader must read the whole file to find valid syntax."
  - id: C2
    name: "Subcommand discoverability"
    what_10_looks_like: "Subcommands listed in a single table at top; each row links to a section explaining behavior."
    what_0_looks_like: "Subcommands buried in prose; no table; reader hunts."
  - id: C3
    name: "STOP discipline"
    what_10_looks_like: "Tier B/C HITL gates explicit; AskUserQuestion only at genuine decision points; NEVER asks trivia."
    what_0_looks_like: "Auto-advances through Tier C decisions; or stops at every trivial step."
  - id: C4
    name: "Persistence pattern"
    what_10_looks_like: "Lists every ops.* table written + every event fired; reader can audit the command's blast radius."
    what_0_looks_like: "Side effects hidden; no listing of writes."
  - id: C5
    name: "HITL tier classification"
    what_10_looks_like: "Tier per subcommand explicitly stated; matches governance/HITL.md table."
    what_0_looks_like: "No tier mention; founder must guess."
  - id: C6
    name: "Recovery / resume path"
    what_10_looks_like: "If interrupted, has explicit resume mechanism (/cmd resume <id> or equivalent); state persistence documented."
    what_0_looks_like: "No resume; interruption = orphan state."
  - id: C7
    name: "Cross-refs to canonical spec"
    what_10_looks_like: "Cites the canonical spec at wiki/capabilities/<id>/spec.md; links to relevant SOPs."
    what_0_looks_like: "Self-contained, no cross-refs."
  - id: C8
    name: "Console UX quality"
    what_10_looks_like: "Pre/per/post output blocks specified; founder can predict what they'll see; readable output structure."
    what_0_looks_like: "No UX documentation; output is whatever the LLM decides per invocation."
  - id: C9
    name: "Error message specificity"
    what_10_looks_like: "Each error class has specific user-visible message + actionable next-step hint."
    what_0_looks_like: "Generic 'an error occurred' or stack trace dumped."
  - id: C10
    name: "Defensive notes"
    what_10_looks_like: "Documents known gotchas, common misuse, and how to recover; references hooks that enforce safety."
    what_0_looks_like: "No defensive notes; safety relies on user vigilance."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `command`-type entities

> Version 0.1.0 (Sprint 1 stub). Prose body expanded in Sprint 2 — frontmatter
> is the canonical machine-readable rubric. Spearman hold-out validation
> happens in Sprint 3.

## Composite formula

`composite = sum(sub_scores)`, 0-100 range.

## The 10 sub-scores

See frontmatter for canonical definitions. Brief table for human readers:

| # | Name | Focus |
|---|---|---|
| C1 | Invocation clarity | argv schema discoverable |
| C2 | Subcommand discoverability | subcommands in table |
| C3 | STOP discipline | HITL gates explicit |
| C4 | Persistence pattern | ops.* writes documented |
| C5 | HITL tier classification | tier per subcommand |
| C6 | Recovery / resume path | interruption recovery |
| C7 | Cross-refs to canonical spec | wiki/spec links |
| C8 | Console UX quality | output blocks specified |
| C9 | Error message specificity | actionable error text |
| C10 | Defensive notes | gotchas + hooks |

## Judge persona

**@ceo** per spec §6.3. Commands are the founder's UX surface — strategic
persona is the right judge.

## Allowed paths

Single file: `.claude/commands/<name>.md`. Proposer must NOT touch sibling
commands or supporting skills.

## Hold-out + Spearman validation

Same discipline as skill playbook: ship gate ≥ 0.6 Spearman on founder ratings.
