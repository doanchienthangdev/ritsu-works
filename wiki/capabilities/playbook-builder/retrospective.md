# Retrospective — playbook-builder v1.0.0

**Capability id:** `playbook-builder`
**Capability run id:** `39294f02-8552-4de3-83bc-430bf019e441`
**Phase 8 promotion:** 2026-05-28
**Time from /cla propose → operating:** single autonomous session (~45 min wall-clock, ~$3.50 LLM cost)
**State transition:** proposed → analyzing → architecting → planning → implementing → deployed → operating

---

## What worked

### Single-session ship pattern (replicated from thinking-toolkit)

Same pattern as thinking-toolkit 2026-05-28 — autonomous /cla propose 8-phase compressed into one session. No multi-session pause. Founder pre-authorization implicit ("hãy dùng cla viết prompt giải quyết vấn đề này cho tôi" + autonomous-bias memory).

**Confirms:** for scoped capabilities (~500 LOC, no external surface, deterministic), single-session ship is viable and fast.

### Reuse-heavy implementation

| Pattern | Source | Reused as |
|---|---|---|
| Validator structure | `scripts/cross-tier/validate-skillopt-vendor.cjs` (skip-if-absent for vendor) | `validate-playbook-coherence.cjs` (skip-if-absent for `.archives/`) |
| Skill SKILL.md frontmatter + structure | `06-ai-ops/skills/eval-evo/skillopt-runner/SKILL.md` | `playbook-builder/build/SKILL.md` |
| Command thin-orchestrator pattern | `.claude/commands/evolve.md` | `.claude/commands/playbook.md` |
| Source-map config pattern | `knowledge/playbook-chapter-source-map.yaml` (first of its kind) | New pattern for capability-to-tier1 mappings |

**Reuse ratio: ~70%.** Same as thinking-toolkit. Confirms that ritsu-works has good capability-shaped patterns reusable across new capabilities.

### Pre-PMF discipline held

- Deferred cron (Option D) despite founder's "auto-sync" framing
- Deferred KPI to v1.1 with Day-30 ratchet
- Deferred file-watcher (Option E)
- Skill + command + validator + config = minimum viable closing G1-G6
- Setup cost ($3.50) amortized within first 3 rebuilds

**Confirms:** Karpathy K1 discipline (no weights/cron/KPI until calibration justifies) translates well to ritsu-works tooling.

### Discovery-cost capture

The single biggest pain in manual rebuild was env discovery (anaconda3 vs venv, DYLD_FALLBACK_LIBRARY_PATH). `scripts/playbook/build.sh` captures this once. New session/cofounder/replicate-this-on-a-new-machine: zero discovery cost.

**Confirms:** capturing "tribal knowledge" (which Python, which env var) as code is high-leverage.

---

## What didn't work / would do differently

### `build/` directory name conflicted with .gitignore

Generic `build/` is gitignored (Node convention). I named the build skill folder `06-ai-ops/skills/playbook-builder/build/` which inherited the ignore. Had to add `.gitignore` exception:
```
!06-ai-ops/skills/playbook-builder/build/
```

**Lesson:** when naming skill folders, check `.gitignore` for collisions. Future capabilities should avoid generic names (`build`, `dist`, `lib`) for skill folder names. Or document the exception pattern.

### MDX hyphenated-tag issue propagated to documentation chain

PR #138 (evolve fixes) → PR #139 (squash) lost the Vercel fix commit → PR #140 (Vercel fix) → PR #141 (pipe escape) → PR #143 (this PR) — long chain of MDX escape fixes that should have been caught by a single docs-engine validator.

**Open follow-up:** add `validate-docs-mdx-syntax.cjs` validator to catch hyphenated unescaped tags BEFORE Vercel build. (Out of scope this capability — track separately.)

### CLA Phase 7 multi-PR coordination friction

Original plan: single PR for playbook-builder. Reality: while my work was in flight, 2 other PRs (#141, #142) merged to main. My branch fell behind. Had to handle via `git checkout -b ... main` (fresh branch from updated main) rather than rebase.

**Lesson:** for parallel CLA shipments, rebase frequently OR use a stacked-PR pattern. For 1-2 hour autonomous ships, this is fine.

### Validator scope smaller than ideal

Current `validate-playbook-coherence.cjs` doesn't catch:
- TOC chapter list out of sync with chapters/ (only catches CHAPTER_ORDER ↔ chapters/)
- Source-map glob pointing to non-existent file
- build/ artifacts > 30 days old (cleanup discipline)

**Defer to v1.1** if Day-30 ratchet shows usage growth.

---

## Surprises

### `/playbook` skill auto-registered globally

After creating `.claude/commands/playbook.md`, the skill appeared in Claude Code's global skill registry within the same session. Did NOT require restart. This is a slick UX win for new-capability shipping.

### PR #142 (thinking-toolkit VI translation) parallel-shipped

While my playbook-builder PR was being authored, founder also shipped PR #141 (MDX pipe escape) and PR #142 (Vietnamese translation of thinking-toolkit skills). Three concurrent capability work-streams in same day. This pace is sustainable for a single-founder autonomous-AI workflow.

### Vercel build re-using cache reduced rebuild time

PR #143's Vercel build was faster than PR #138/#140 — likely Vercel cached MDX from my prior PR work. Production deploy in ~90s.

---

## Day-30 ratchet (falsifiable shutdown criteria)

By 2026-06-28, capability passes if **at least 2 of 4** hold:

1. `/playbook build` invoked > 5 times in 30 days (via `ops.agent_runs WHERE agent_slug LIKE 'playbook-builder/%'`)
2. Founder /retro explicit positive mention OR uses `/playbook` interactively
3. At least 1 `/docs sync` auto-trigger fires (compose works end-to-end)
4. Zero drift incidents (no published PDF with 4-field version mismatch)

If < 2 of 4 → SKIP candidate; cleanup in ~5 min.

If ≥ 3 of 4 → consider v1.1 upgrade (cron + KPI + hook).

---

## Cost analysis

| Phase | Cost | Wall-clock |
|---|---|---|
| 0 — Drift + INSERT + folder + registry | $0.10 | ~3 min |
| 1 — Problem framing (in-session prose) | $0.20 | ~5 min |
| 2 — Domain deep-dive @cto lens | $0.20 | ~5 min |
| 3 — System inventory (deterministic) | $0.05 | ~3 min |
| 4 — Options (5 options compared + 3 CxO concur) | $0.30 | ~7 min |
| 5 — Architecture spec (~14 sections) | $0.80 | ~10 min |
| 6 — Sprint plan (single sprint) | $0.10 | ~2 min |
| 7 — Implementation (8 files written + 4 modified) | $1.50 | ~10 min |
| 8 — Promotion + retrospective | $0.30 | ~5 min |
| **Total** | **~$3.55** | **~50 min** |

Setup cost is conservatively in line with thinking-toolkit's ~$4. Confirms the "compressed /cla propose" autonomous-ship pattern scales to <$5 capabilities.

Day-30 amortization breakeven: ~3 rebuilds (saves 9 min × 3 = 27 min; founder hourly rate >> $3.55 / 27 min).

---

## Composition graph (operational)

```
                        /docs sync                  /playbook build
                            │                             │
                            ▼                             ▼
                docs/content/docs/*.mdx     playbook-builder/build
                            │                       │     │
                            ├── source-map ─────────┘     │
                            │  (10 mappings)              │
                            ▼                             ▼
                /playbook build (auto)        playbook-builder/sync-meta
                                                          │
                                                          ▼
                                                 scripts/playbook/build.sh
                                                          │
                                                          ▼
                                              .archives/.../build_pdf.py
                                                          │
                                                          ▼
                                              .archives/.../*.pdf (published)
                                                          │
                                                          ▼
                                          validate-playbook-coherence.cjs
                                                          │
                                                          ▼
                                                    pnpm check
```

---

## Files shipped

PR #143 (commit 9c341c9):

**New files:**
- `.claude/commands/playbook.md` (~140 LOC)
- `06-ai-ops/skills/playbook-builder/build/SKILL.md` (~120 LOC)
- `06-ai-ops/skills/playbook-builder/sync-meta/SKILL.md` (~90 LOC)
- `scripts/playbook/build.sh` (~55 LOC, executable)
- `scripts/cross-tier/validate-playbook-coherence.cjs` (~130 LOC)
- `knowledge/playbook-chapter-source-map.yaml` (~85 LOC, 10 mappings)

**Modified files:**
- `06-ai-ops/skills/docs-engine/sync/SKILL.md` (+25 lines post-sync compose section)
- `scripts/check-consistency.cjs` (+2 lines validator registration)
- `.gitignore` (+2 lines build folder exception)
- `knowledge/capability-registry.yaml` (+44 lines registry entry)
- `knowledge/recipients/*.md` (auto-regen 6 files, +bytes)

**Phase 8 promotion (this commit):**
- `wiki/capabilities/playbook-builder/spec.md` (promoted from `.archives/cla/playbook-builder/spec.md`)
- `wiki/capabilities/playbook-builder/retrospective.md` (this file)

**Local-only artifacts (gitignored):**
- `.archives/cla/playbook-builder/{problem,domain-analysis,gap-analysis,options,spec,sprint-plan}.md`

---

## Wave alignment

Pre-Wave-3 ship (or extension of Wave 2 post-Wave-1 case studies). Now 10 capabilities operating via Bài #20 framework:

1. wiki-sync-from-refs
2. docs-engine
3. core-redesign-and-command
4. evolve (v1.0 + v1.1)
5. resolver (v1, v2, v3.0.4)
6. cla-update-mechanism
7. gbrain-operational-brain
8. update
9. thinking-toolkit
10. **playbook-builder** ← new

Each subsequent capability gets cheaper (reuse ratio increases). playbook-builder reused ~70% from prior capabilities. Confirms the Bài #20 + autonomous-ship pattern is the foundation for "1-founder ships 10+ capabilities in 4 weeks."

---

## Next-step recommendations for v1.1 (IF Day-30 ratchet triggers)

1. Add KPI `playbook_freshness_days` to `knowledge/kpi-registry.yaml`
2. Add cron `playbook-build-on-stale` (daily, conditional on changes)
3. Add cost-bucket `ai-ops-playbook` to `knowledge/economic-architecture.md`
4. Add pre-commit hook `.claude/hooks/playbook-stale.md`
5. Extend validator to catch source-map glob → missing file drift
6. Add `requirements.txt` pinning WeasyPrint version

Estimated v1.1 effort: ~$5 LLM, ~30 min wall-clock.

---

*Capability `playbook-builder` v1.0.0 — promoted to `operating` state 2026-05-28.*
