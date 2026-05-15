# SOP-AIOPS-001 — Capability Lifecycle Architecture

**Status:** Active (v1.0 of `/cla` shipped — front-end orchestrator live)
**Version:** 1.0.0
**Pillar:** 06-ai-ops
**Bài toán:** #20
**Front-end:** `/cla` slash command (`.claude/commands/cla.md`)

---

## Purpose

Master SOP cho **Bài #20 Capability Lifecycle Architecture (CLA)**. Standardizes 8-phase X workflow để propose → analyze → architect → build → deploy new capabilities trên Agent OS.

**Without this SOP:** Every business problem (e.g., "kiếm thêm khách hàng mỗi ngày") = ad-hoc thinking, inconsistent solutions, no capability catalog.

**With this SOP:** Every business problem flows through 8 standardized phases, producing canonical artifacts, deployed capability, retrospective learnings.

## When to invoke

**Primary path (v1.0):** `/cla` slash command in Claude Code:

```bash
> /cla propose "Kiếm 10 khách hàng mới mỗi ngày"
> /cla resume <id>
> /cla status <id>
> /cla list
```

See `.claude/commands/cla.md` for full subcommand documentation.

**Future trigger paths (deferred to v1.1+):**

- **Voice note (Bài #18):** founder sends voice note via Telegram → ingestion
  classifies as `decision_request` → auto-fires `/cla propose`. Requires Bài #18
  pipeline live.
- **Wiki entry:** founder manually creates `wiki/capabilities/<id>/problem.md`
  → pre-commit hook detects → seeds `ops.capability_runs` row.

## 9 Phases (Phase 0 added v1.0)

See `flow.yaml` for full spec. Summary:

| Phase | Skill / step | HITL | Drift gate | Time |
|---|---|---|---|---|
| 0. Drift Pre-Flight (NEW) | inline in /cla | A | **required** | ~30s |
| 1. Problem Framing | problem-framer | A | — | 30min |
| 2. Domain Deep-Dive | domain-analyst (+ CxO routing) | A | — | 60min |
| 3. System Inventory | system-inventory-scanner | A | informational | 30min |
| 4. Options Generation | options-generator (+ parallel CxO poll) | **B** (founder picks) | — | 90min |
| 5. Architecture Design | architect (+ @cto + Muse panel) | **C** (founder approves) | dry-run on draft | 120min |
| 6. Sprint Planning | sprint-planner | B | — | 45min |
| 7. Implementation | implementation-coordinator | B (per PR) | per-commit (husky) | 1-4 weeks |
| 8. Catalog Update + Promotion | catalog-updater | A | **required** | 30min |

**Total time before implementation:** ~6h (Phase 0-6), then 1-4 weeks Phase 7.

## Artifacts produced

**Working folder (local-only, root `.archives/`):**

```
.archives/cla/<id>/                     # gitignored; root not worktree
├── README.md              ← Phase 0
├── refs/                  ← Phase 0 (optional --refs)
├── problem.md             ← Phase 1
├── domain-analysis.md     ← Phase 2
├── gap-analysis.md        ← Phase 3
├── options.md             ← Phase 4
├── spec.md                ← Phase 5 (canonical, promoted in Phase 8)
├── sprint-plan.md         ← Phase 6
├── retrospective.md       ← Phase 8 (promoted to wiki/)
└── draft/                 ← Phase 5 working drafts
    ├── README.md
    ├── migrations/        ← committed to supabase/migrations/ in Phase 7
    ├── skills/            ← committed to 06-ai-ops/skills/ in Phase 7
    ├── commands/          ← committed to .claude/commands/ in Phase 7
    ├── agents/            ← committed to .claude/agents/ in Phase 7
    ├── sops/              ← committed to <pillar>/sops/ in Phase 7
    ├── mcp-configs/       ← committed to mcp/ in Phase 7
    ├── frontend/          ← committed to frontend/ in Phase 7
    └── tier1-diffs.yaml   ← applied as PRs in Phase 7
```

**Promoted (wiki/, synced):**

```
wiki/capabilities/<id>/
├── spec.md                ← promoted from .archives in Phase 8
└── retrospective.md       ← promoted from .archives in Phase 8
```

The `.archives/cla/<id>/` folder stays local for retrospective context;
canonical references live in `wiki/capabilities/<id>/` per CLAUDE.md
workspace plane discipline.

## State machine

```
proposed → analyzing → architecting → planning → 
  implementing → deployed → operating
                                    ↓
                                  deprecated/superseded
```

State persisted in `ops.capability_runs`. Multi-session resilient — Phase 7 can span weeks.

## Cross-pillar dependencies

CLA touches all 19 prior bài toán. See `flow.yaml.integrates_with` for mappings.

Critical integrations:
- **Bài #2 HITL:** Tier A/B/C per phase
- **Bài #5 Multi-Agent:** 8 specialized subagents
- **Bài #7 Cost-bucket:** Per-capability tracking
- **Bài #15 Decision:** Phase 5 = Tier C+ decision với Muse panel

## Failure handling

See `flow.yaml.failure_handling`. Critical:
- Skip Phase 4 (Options) → BLOCK
- Skip Phase 5 Tier C HITL → BLOCK
- Phase 7 session lost > 7 days → resume from checkpoint
- Skip Phase 8 retrospective → BLOCK 'operating' transition

## Acceptance

SOP completes when:
- All 8 phases done
- Capability state = 'operating'
- All artifacts present
- `capability-registry.yaml` updated
- Retrospective captures lessons

## Wave 1 implementation

```
Wave 1 task: Bootstrap CLA itself
- [ ] Apply migration 00011_capability_runs.sql
- [ ] Validate capability-registry.yaml
- [ ] Implement 8 skill stubs (problem-framer first)
- [ ] Test với example capability proposal (dry run)
- [ ] Mark CLA capability as 'deployed' trong registry
```

After Wave 1, CLA is production-ready. Founder can propose any business capability.
