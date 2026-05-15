# SOP-AIOPS-001 — Capability Lifecycle Architecture

**Status:** Scaffold (Wave 1 implementation, deployed self-bootstrap)
**Version:** 1.0.0
**Pillar:** 05-ai-ops
**Bài toán:** #20

---

## Purpose

Master SOP cho **Bài #20 Capability Lifecycle Architecture (CLA)**. Standardizes 8-phase X workflow để propose → analyze → architect → build → deploy new capabilities trên Agent OS.

**Without this SOP:** Every business problem (e.g., "kiếm thêm khách hàng mỗi ngày") = ad-hoc thinking, inconsistent solutions, no capability catalog.

**With this SOP:** Every business problem flows through 8 standardized phases, producing canonical artifacts, deployed capability, retrospective learnings.

## When to invoke

Founder triggers via 1 of 3 paths:

### Path 1: Voice note (Bài #18)
Founder gửi voice note via Telegram:
```
"Tôi cần kiếm thêm 10 khách hàng mới mỗi ngày."
```
Bài #18 ingestion classifies as `decision_request`. If contains capability proposal signal, auto-fires SOP-AIOPS-001.

### Path 2: Claude Code command
```bash
> /cla propose "Kiếm 10 khách hàng mới mỗi ngày"
```
Or in conversation:
```
Bắt đầu CLA cho việc kiếm thêm khách hàng mỗi ngày
```

### Path 3: Manual wiki entry
Founder tạo `wiki/capabilities/<id>/problem.md`. Pre-commit hook detects new capability folder → creates `ops.capability_runs` row → fires SOP.

## 8 Phases

See `flow.yaml` for full spec. Summary:

| Phase | Skill | HITL | Time |
|---|---|---|---|
| 1. Problem Framing | problem-framer | A | 30min |
| 2. Domain Deep-Dive | domain-analyst | A | 60min |
| 3. System Inventory | system-inventory-scanner | A | 30min |
| 4. Options Generation | options-generator | **B** (founder picks) | 90min |
| 5. Architecture Design | architect | **C** (founder approves) | 120min |
| 6. Sprint Planning | sprint-planner | B | 45min |
| 7. Implementation | implementation-coordinator | B (per PR) | 1-4 weeks |
| 8. Catalog Update | catalog-updater | A | 30min |

**Total time before implementation:** ~6h (Phase 1-6), then 1-4 weeks Phase 7.

## Artifacts produced

```
wiki/capabilities/<id>/
├── problem.md             ← Phase 1
├── domain-analysis.md     ← Phase 2
├── gap-analysis.md        ← Phase 3
├── options.md             ← Phase 4
├── spec.md                ← Phase 5 (canonical)
├── sprint-plan.md         ← Phase 6
├── retrospective.md       ← Phase 8
└── draft/                 ← Phase 5 working drafts
    ├── migrations/
    ├── tier1-diffs.yaml
    └── skill-stubs/
```

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
