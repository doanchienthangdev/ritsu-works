---
name: wiki-sync
description: |
  Umbrella for the wiki-sync capability (`wiki-sync-from-refs`). Three verbs —
  sync (ref → entity-typed wiki page + embeddings + auto-extracted links),
  ask (citation-disciplined retrieval that quotes specific wiki paths, not
  training data), audit (orphan / dead-link / stale-claim integrity check).
  Five source-kind adapters (PDF, URL, Markdown, YouTube, meeting transcript)
  cover ~95 % of founder intake. Invoked by `.claude/commands/wiki.md`
  sub-commands or programmatically via the `mcp__wiki__ask` tool. Reuses
  Bài #14 knowledge-graph schema + Bài #18 ingestion-jobs substrate.
---

# Wiki Sync (umbrella)

## When to use

- Founder runs `/wiki sync <path>` → dispatches to `wiki-sync/ingest`.
- Founder runs `/wiki ask "<q>"` → dispatches to `wiki-sync/ask`.
- Founder runs `/wiki audit` → dispatches to `wiki-sync/audit`.
- Other agent calls `mcp__wiki__ask` → dispatches to `wiki-sync/ask`.

## Inputs

- `verb` — one of `sync` / `ask` / `audit` / `resync` / `list` / `status`.
- `args` — verb-specific args (see `.claude/commands/wiki.md`).

## Process

This skill is dispatcher-only. It reads the verb and delegates:

| Verb | Sub-skill | Purpose |
|---|---|---|
| `sync` | `wiki-sync/ingest` | full 6-step pipeline (see SOP-INGEST-001) |
| `resync` | `wiki-sync/ingest` with `force=true` | re-fetch + diff |
| `ask` | `wiki-sync/ask` | RAG with citation discipline |
| `audit` | `wiki-sync/audit` | integrity check |
| `audit --fix` | `wiki-sync/audit` with `fix=true` | + open one PR per fix class |
| `list` | inline DB query (no sub-skill) | list wiki pages by type |
| `status` | inline DB query | current queue + recent audits |

Each sub-skill writes its own `ops.agent_runs` row; this umbrella does not log a run of its own.

## Cost tracking

All sub-skills attribute cost to `ai-ops-knowledge` cost-bucket. Per-task-kind soft caps from spec.md §5:
- `wiki-ingest-pdf` $1.00
- `wiki-ingest-other` $0.30
- `wiki-ask` $0.10
- `wiki-audit` $0.50

## HITL

Inherits from sub-skill. Sync = A (B if cost > cap); Ask = A; Audit = A (B with `--fix` per PR).

## Failure modes

| Symptom | Response |
|---|---|
| Unknown verb | Print usage; do not dispatch |
| Sub-skill fails | Sub-skill writes its own failure row; umbrella surfaces error to founder |
| No adapter matches `<path>` for sync | Suggest closest adapter; bail |

## Related

- Sub-skills: `wiki-sync/{ingest,ask,audit,chapter-splitter,link-extractor}/SKILL.md`
- Adapters: `wiki-sync/adapters/{pdf,url,markdown,youtube,meeting}-adapter/SKILL.md`
- SOP: `06-ai-ops/sops/SOP-INGEST-001-wiki-sync/`
- Command: `.claude/commands/wiki.md`
- Spec: `wiki/capabilities/wiki-sync-from-refs/spec.md`

## Version notes

- **v1.0.0** (Sprint 1, 2026-05-16): umbrella + ingest + 3 baseline adapters (pdf, url, markdown); chapter-splitter STUB; ask/audit stubs.
- **v2.0.0** (Sprint 2 PR2, 2026-05-17): chapter-splitter REAL (`toc | count=N | heading=h2` modes); migration 00030 adds `parent_job_id` for chapter children. Per Tier C decision `ops.decisions[fff2bf7c-efeb-4169-b430-8139ad4d4de3]`. folder-adapter + CLI helper + remaining bug fixes still in Sprint 2 PR3+.
