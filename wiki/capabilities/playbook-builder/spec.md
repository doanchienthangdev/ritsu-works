# Capability Spec — playbook-builder v1.0.0

**Capability id:** `playbook-builder`
**Version:** 1.0.0 (initial)
**State:** proposed → architecting (Phase 5)
**CLA run id:** `39294f02-8552-4de3-83bc-430bf019e441`
**Pillar owner:** 06-ai-ops
**Cost-bucket:** `ai-ops-skill-library` (reuse — same as thinking-toolkit)
**Bài-toán touched:** [4, 5, 11, 14, 19, 20]

---

## 1. Summary

Automation layer for the AI-Native Company Playbook PDF rebuild cycle. Closes critical gaps G1-G6 + G11 from Phase 3 gap-analysis.md via Option C (Skill + Command + Validator + Source-map) per Phase 4 options.md.

**Founder UX (single command):**
```
/playbook build                                      # auto-detect changes, bump version, build, publish
/playbook build --version=4.3.0                      # explicit version
/playbook build --add-chapter=phase-a2/44-foo.md     # add chapter file + TOC + CHAPTER_ORDER + build
/playbook check                                      # drift gate (no rebuild)
/playbook history                                    # list published versions
```

**Composition:**
- `/docs sync` reads `knowledge/playbook-chapter-source-map.yaml`. If sync touched any source listed there, post-sync auto-invokes `/playbook build`.

---

## 2. Scope

### In-scope (v1.0)

- Detect chapter changes (mtime vs latest published PDF)
- Auto-bump version (semver patch for content tweak, minor for new chapter, major requires founder confirm)
- Sync TOC entries from chapter H1s + maintain prose Phần section descriptions
- Sync CHAPTER_ORDER in build_pdf.py from chapters/ directory listing
- Build PDF via captured env (anaconda3 + brew DYLD)
- Publish PDF to playbook root
- Drift validator catching 4-field version mismatch
- Source-map for /docs sync composition
- Local-only operation (`.archives/` gitignored)

### Out-of-scope (v1.0, deferred to v1.1+)

- Cron auto-rebuild (G7-G8) — defer to v1.1 if Day-30 usage > 15 invocations
- File-watcher (G13) — brittle for single-founder transient sessions
- Multi-platform CI build (G10/G14) — single-Mac reality acceptable
- Translation (G15) — VI-only by design
- Public hosting (G16) — local-only artifact
- Chapter content quality scoring — separate concern (/evolve future)
- Pre-commit hook (G_optional) — defer to v1.1

### Hard non-goals

- NOT a Markdown editor (chapter authoring stays in Claude session)
- NOT a Fumadocs replacement (docs-engine site is separate concern)
- NOT cloud-hosted

---

## 3. Components

### 3.1 Skills (2)

**`06-ai-ops/skills/playbook-builder/build/SKILL.md`** (~150 lines)

Inputs:
- `version` (optional, explicit override)
- `add_chapter` (optional, file path)
- `dry_run` (bool, default false)
- `force` (bool, skip change detection)

Process:
1. Drift gate (invoke validator)
2. Detect chapter changes (compare chapter mtimes vs latest published PDF mtime)
3. Auto-bump version (or use explicit override)
4. If add_chapter: copy chapter file, invoke `sync-meta` skill
5. Invoke `sync-meta` skill (TOC + CHAPTER_ORDER sync)
6. Invoke `scripts/playbook/build.sh` (env setup + build_pdf.py)
7. Copy `build/playbook-vX.Y.pdf` → playbook root
8. INSERT `ops.agent_runs` row with cost-bucket
9. Emit `ritsu.playbook.built` event

**`06-ai-ops/skills/playbook-builder/sync-meta/SKILL.md`** (~100 lines)

Inputs:
- `version` (string)
- `chapters_dir` (default `.archives/ritsu-handoff-bundle/playbook/chapters`)

Process:
1. Scan `chapters/` directory recursively for `*.md` files
2. Parse H1 of each chapter → derive title
3. Update `00-toc.md`:
   - `**Phiên bản:** v<X.Y>`
   - `**Ngày:** ... (cập nhật cuối: <YYYY-MM-DD>)`
   - Section descriptions (preserve prose, regenerate chapter entry list)
4. Update `build_pdf.py`:
   - `CHAPTER_ORDER` array (file ordering: numeric prefix sort within section)
   - `pdf_path = BUILD_DIR / "ai-native-company-playbook-v<X.Y>.pdf"`
   - `cover-meta div`: `<div>v<X.Y> · <YYYY-MM-DD></div>`

### 3.2 Command

**`.claude/commands/playbook.md`** (~80 lines)

Thin orchestrator. Subcommands:
- `/playbook build` → invoke `playbook-builder/build`
- `/playbook check` → invoke validator only
- `/playbook history` → list `*.pdf` in playbook root + parse versions

### 3.3 Helper script

**`scripts/playbook/build.sh`** (~40 lines)

```bash
#!/usr/bin/env bash
# Playbook PDF builder — env preset + invocation
set -euo pipefail

PYTHON="${PLAYBOOK_PYTHON:-/opt/anaconda3/bin/python3}"
PLAYBOOK_ROOT=".archives/ritsu-handoff-bundle/playbook"

# Sanity checks
[ -x "$PYTHON" ] || { echo "[playbook] PYTHON not found at $PYTHON. Install anaconda3 or set PLAYBOOK_PYTHON."; exit 2; }
[ -d /opt/homebrew/lib ] || { echo "[playbook] /opt/homebrew/lib missing. Install brew + pango/cairo/gdk-pixbuf/glib/harfbuzz."; exit 2; }
[ -f "$PLAYBOOK_ROOT/build_pdf.py" ] || { echo "[playbook] build_pdf.py missing at $PLAYBOOK_ROOT"; exit 2; }

# Run build with proper env
export DYLD_FALLBACK_LIBRARY_PATH="/opt/homebrew/lib:${DYLD_FALLBACK_LIBRARY_PATH:-}"

cd "$PLAYBOOK_ROOT"
"$PYTHON" build_pdf.py
```

### 3.4 Validator

**`scripts/cross-tier/validate-playbook-coherence.cjs`** (~80 lines)

Skip if `.archives/ritsu-handoff-bundle/playbook/` doesn't exist (gitignored — CI/clean clones).

Otherwise check:
- Every `phase-a2/*.md` file in `CHAPTER_ORDER`
- Every `CHAPTER_ORDER` entry has a file
- TOC version (`**Phiên bản:** vX.Y`) matches `build_pdf.py pdf_path` version
- TOC version matches `build_pdf.py cover-meta` version
- TOC date (`cập nhật cuối`) ≥ youngest chapter file mtime
- (Optional) latest published PDF version matches current TOC version

Register in `scripts/check-consistency.cjs` as L1 (warn-only since `.archives/` is local).

### 3.5 Source-map config

**`knowledge/playbook-chapter-source-map.yaml`**

```yaml
# Playbook chapter ↔ Tier 1 source mapping
# Used by /docs sync to detect when a Tier 1 change should trigger /playbook build.
#
# Format:
#   - chapter: <relative path from chapters/>
#     sources:
#       - <Tier 1 source path or glob>
#       - ...
#
# When /docs sync writes MDX from any source listed here, post-sync triggers
# /playbook build for the affected chapter.

version: "1.0.0"
owner: founder
last_updated: "2026-05-28"

mappings:
  - chapter: phase-a2/37-capability-case-evolve.md
    sources:
      - .claude/commands/evolve.md
      - wiki/capabilities/evolve/spec.md
      - .claude/agents/skillopt-optimizer-reflect.md

  - chapter: phase-a2/41-capability-case-update.md
    sources:
      - wiki/capabilities/update/spec.md
      - .claude/commands/update.md

  - chapter: phase-a2/42-capability-case-evolve-v1-1-skillopt-forensic.md
    sources:
      - .claude/agents/skillopt-optimizer-reflect.md
      - scripts/skillopt/upstream-patches/configs-ritsu_skill-default.yaml
      - scripts/skillopt/upstream-patches/ritsu_skill/adapter.py

  - chapter: phase-a2/43-thinking-toolkit.md
    sources:
      - 06-ai-ops/skills/thinking-toolkit/**/*.md
      - .claude/agents/{ceo,cto,cgo,cpo}.md
```

### 3.6 docs-engine integration

Add new section to `06-ai-ops/skills/docs-engine/sync/SKILL.md`:

```markdown
## Post-sync composition: playbook-builder

After sync writes MDX, check `knowledge/playbook-chapter-source-map.yaml`.
For each mapping where a source file matched the sync's write set:
- Invoke `/playbook build` (or `Skill: playbook-builder/build` directly)
- Captures playbook drift from Tier 1 changes without manual `/playbook build`

Skip if `playbook-chapter-source-map.yaml` missing (capability not deployed yet).
Skip if `.archives/ritsu-handoff-bundle/playbook/` not present (clean clones / CI).
```

---

## 4. State machine

```
[idle] ──/playbook build──→ [validating]
                                  │
                                  ├── drift FAIL → [error: drift]
                                  │
                                  └── drift PASS
                                            │
                                            ▼
                                       [bumping]
                                            │
                                            ├── major bump → ASK founder (Tier B)
                                            │   └── confirm → [building]
                                            │   └── reject  → [aborted]
                                            │
                                            └── minor/patch → [building]
                                                                  │
                                                                  ├── build FAIL → [error: build]
                                                                  │
                                                                  └── build PASS
                                                                            │
                                                                            ▼
                                                                       [publishing]
                                                                            │
                                                                            ▼
                                                                         [done]
```

Persisted to `ops.agent_runs.state_payload`.

---

## 5. Cost model

| Operation | LLM cost | Wall-clock |
|---|---|---|
| `/playbook build` (no changes, fast path) | $0 | ~0.5s |
| `/playbook build` (full rebuild) | $0 | ~3s (WeasyPrint) |
| `/playbook check` (validator only) | $0 | ~0.2s |
| Setup (Phase 5-8 LLM) | ~$4 one-time | n/a |

**Per-invocation: $0.** Zero LLM cost is structural — capability is deterministic Python/Node orchestration.

---

## 6. HITL discipline

| Operation | Tier | Trigger |
|---|---|---|
| `/playbook build` (auto-detect, minor/patch bump) | A | Founder invokes; auto-build |
| `/playbook build` (major bump detected) | B | AskUserQuestion: "Major restructure detected — confirm version 5.0.0?" |
| `/playbook check` | A | Read-only |
| `/playbook history` | A | Read-only |
| `pnpm check` drift validator | A | Read-only |
| `/docs sync` auto-trigger | A | Composition — uses /playbook build's own HITL |
| Adding new mapping to source-map.yaml | A | Local config edit |

**No Tier C operations.** Local-only artifact, no external surface.

---

## 7. Drift gates

L1 validator `validate-playbook-coherence.cjs` registered in `scripts/check-consistency.cjs`. Skip-if-absent for CI safety. Local enforcement only.

Checks (all warn-tier — `.archives/` is gitignored, so failures don't block CI):
1. Every chapter in CHAPTER_ORDER
2. Every CHAPTER_ORDER entry has matching file
3. TOC version == build_pdf.py pdf_path version
4. TOC version == build_pdf.py cover-meta version  
5. TOC date ≥ youngest chapter mtime
6. (Optional) Latest published PDF version == TOC version

---

## 8. KPIs (v1.1 — DEFER)

NOT in v1.0. Day-30 ratchet collects passive metrics for decision:
- `/playbook build` invocation count (via `ops.agent_runs WHERE agent_slug LIKE 'playbook-builder/%'`)
- Time savings (compare estimated_founder_hours vs actual)

If invocations > 15 in 30 days, upgrade to v1.1 with KPIs:
- `playbook_freshness_days` — days since latest published PDF
- `playbook_drift_incidents` — count of validator failures

---

## 9. Test plan

### Unit (validator)

`scripts/cross-tier/__tests__/validate-playbook-coherence.test.cjs`:
- Empty playbook dir → exit 0 (skip)
- Missing chapter file in CHAPTER_ORDER → fail (warn)
- Orphan chapter file (not in CHAPTER_ORDER) → fail (warn)
- Version mismatch TOC vs build_pdf.py → fail (warn)
- All consistent → exit 0

### Integration (build)

Smoke test via Sprint 1 acceptance:
- `bash scripts/playbook/build.sh` produces `build/playbook-v4.X.pdf`
- File size > 3 MB (sanity)
- Exits 0

### End-to-end (compose)

After Sprint 1 deploy:
- Edit any chapter (e.g., add line to chapter 42)
- Run `/playbook build`
- Verify PDF updated, version patch-bumped, published

Source-map compose test:
- Edit a source listed in `playbook-chapter-source-map.yaml`
- Run `/docs sync`
- Verify `/playbook build` auto-triggered

---

## 10. Rollout plan (high-level — Phase 6 details)

**Sprint 1 (single sprint, ~1-2 hours):**
- Create skill files (build + sync-meta)
- Create command file
- Create helper script
- Create validator + register in check-consistency
- Create source-map.yaml with 4 initial mappings
- Add docs-engine integration section
- Run `pnpm check` clean
- Smoke test: `/playbook build` succeeds locally
- Smoke test: validator catches synthetic drift
- INSERT `ops.capability_phase_events` rows for Phase 7 + 8
- Commit + PR + merge

**Phase 8: registry promotion (state operating).**

**Total Sprint 1 estimate:** 1-2 hours, founder-autonomous.

---

## 11. Falsifiable acceptance criteria (Day-30 ratchet)

Per problem.md §"Falsifiable acceptance criteria":

1. **Reduced orchestration time per rebuild:** baseline ~10 min → target ≤2 min (5× reduction). Measured via `ops.agent_runs` duration field.
2. **Zero drift incidents:** no published PDF with TOC version ≠ build_pdf.py version ≠ cover-meta version (≥3 published versions during window).
3. **Integration uplift:** at least 1 `/docs sync` auto-triggers `/playbook build` during window.
4. **Founder usage:** `/playbook build` invoked >5 times in 30 days, OR founder /retro mention.

If none of #1-4 hold → capability is SKIP candidate per /evolve falsifiable shutdown discipline.

---

## 12. Risks + mitigations (consolidated from Phase 2)

| Risk | Severity | Mitigation in v1.0 |
|---|---|---|
| R1 — WeasyPrint native libs break | Med | Document required brew packages in helper script; `requirements.txt` pin deferred to v1.1 |
| R2 — Auto bump miscategorizes content change | Med | Conservative heuristic: any new chapter = minor; any chapter rename/move = founder confirm |
| R3 — Compose loop with /docs sync | Low | Source-map cycles caught by validator; max-depth=1 guard in compose |
| R4 — Source-map drift | Med | New chapter authoring guideline: founder adds mapping when adding chapter; validator catches stale entries |
| R5 — .archives/ artifacts diverge across machines | Low | Acceptable — local-only by design |
| R6 — Capability over-engineered | Low | Day-30 ratchet provides shutdown signal |

---

## 13. Decision log

**Tier C founder decision** (per HITL.md): Architecture C selected. 5 components (2 skills + 1 command + 1 script + 1 validator + 1 source-map + 1 docs-engine integration). Defers cron + KPI + hooks to v1.1.

**Decision id:** TBD (INSERT to ops.decisions during Phase 7).

---

## 14. Sprint plan handoff (Phase 6)

Single Sprint 1, ~1-2 hours, founder-autonomous (same pattern as thinking-toolkit autonomous ship 2026-05-28).

See sprint-plan.md.
