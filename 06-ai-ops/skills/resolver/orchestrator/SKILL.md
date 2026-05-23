---
name: resolver/orchestrator
description: Top-level orchestrator for /resolver command — parses argv, dispatches to verb sub-skills (query/sync/explain), renders output (human-readable default; --json machine-readable). Per capability `resolver` v1.0 spec §6.
---

# resolver/orchestrator SKILL

## When to use

Invoked by `.claude/commands/resolver.md` as the top-level dispatcher. Routes
to the right verb sub-skill based on parsed argv.

## Process

1. Parse argv: first positional is subcommand; rest are positional args + flags
2. Validate subcommand against enum: `query | list | validate | sync | explain`
3. Dispatch to corresponding sub-skill:
   - `query` → `resolver/query`
   - `list` → render via load-index directly (no dedicated sub-skill)
   - `validate` → spawn `scripts/cross-tier/validate-resolver-*.cjs`
   - `sync` → `resolver/sync`
   - `explain` → `resolver/explain`
4. Capture sub-skill output; render per `--json` flag

## Error handling

- Unknown subcommand → print usage + valid list, exit 1
- Missing required positional → print usage for that verb
- All sub-skill errors propagated to caller

## See also

- Command file: `.claude/commands/resolver.md`
- Sub-skills: `resolver/query`, `resolver/sync`, `resolver/explain`
- Engine: `scripts/resolver/*.cjs`
