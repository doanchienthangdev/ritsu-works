# Retrospective: docs-engine v1.2.0 (extend)

**Capability ID:** `docs-engine`
**Version:** 1.2.0 (extend from v1.1.2)
**Phase:** 8 — Catalog Update (post-extend)
**Shipped:** 2026-05-19 (same session as v1.0 + v1.1 + v1.1.1 + v1.1.2)
**Live URL:** https://ritsu-works.vercel.app
**Sub-flow:** `/cla extend docs-engine` (accelerated single-session)

---

## What v1.2 addressed

Founder identified the v1.1/v1.1.1/v1.1.2 blocker: **walker re-runs would destroy translation work**. The v1.1 walker preserved translations only when `source_hash` was unchanged; when source changed (even one byte), the walker overwrote the VI MDX body with the new English source content. Every subsequent `/docs sync` after a source edit re-required full translation of every changed file.

This made v1.1.2's 100% translation coverage fragile — first source change would knock coverage back down.

v1.2 introduces **incremental translation**: walker preserves VI body across source changes, marks files as stale via `translated_source_hash` + `needs_retranslation` flag, and adds `/docs translate` slash command (+ skill) to orchestrate re-translation via Claude Code subagent dispatch.

---

## Sprint scope shipped

**v1.2 = single session AI execution (~1.5 hours within the same session as v1.0–v1.1.2):**

| Component | Change | Status |
|---|---|---|
| Walker (`scripts/docs-sync.cjs`) | New `preservedVi` branch: when source changes AND VI is translated, keep VI body + title + description, set `translated_source_hash` (old hash), set `needs_retranslation: true`, bump `source_hash` to new value. Walker version bumped to v1.2.0. | ✅ |
| Verifier (`scripts/verify-vi-translation.cjs`) | Parses `translated_source_hash` + `needs_retranslation` from frontmatter. New flags: `--list-stale`, `--list-needs-translation`. Summary table now shows Fresh / Stale / Untrans / Skipped columns. | ✅ |
| New skill (`06-ai-ops/skills/docs-engine/translate/SKILL.md`) | Codified incremental-translation orchestration: discovery → batch → dispatch → re-verify → iterate → local build → commit. Lessons from v1.1.1 (context-fatigue agent failures) folded in. | ✅ |
| Command doc (`.claude/commands/docs.md`) | New `/docs translate` subcommand row + workflow section. Updated `/docs sync` row to mention preserve-on-source-change behavior. | ✅ |
| Migration (`scripts/migrate-translated-source-hash.cjs`) | One-time backfill: 224 already-translated VI files got `translated_source_hash = source_hash` (since they were just translated minutes ago, they are in-sync). Idempotent. | ✅ |
| Capability registry | Version bump 1.1.0 → 1.2.0. v1.1.1, v1.1.2, v1.2 ship notes appended. Bài #14 added to bài_toán_touched (since v1.2 introduces a citation-spine-style hash lineage on VI files, analogous to wiki-sync v3.0 citation tracking). | ✅ |

---

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Founder time | 4-8h (write spec, review, iterate translator) | ~10 min (one prompt: "implement v1.2 đề xuất") | -97% |
| Setup cost (v1.2 alone) | $1.50 (CLA Phase 0-8 ceremony) | $0 (Claude Code Desktop subscription) | -100% |
| PRs shipped (v1.2) | 1 | (pending — this PR) | on target |
| Walker change LoC | ~50 lines | 47 lines | on target |
| Files migrated | ~225 | 224 (2 not_translated — sops without `translated: true`) | on target |

---

## What went well

1. **Walker already had partial preserve logic.** v1.1 walker already had a `if (lang === "vi" && existingTranslated && existingHash === sourceHash) skip` branch for the unchanged-source case. v1.2 just extended that to handle the changed-source case — small surface area, low risk.

2. **`preservedVi` branch reuses adapter result for title/description/category.** The walker still calls the adapter (which produces fresh English `result.title` / `result.description` / `result.body`). v1.2's `preservedVi` override pattern means we keep what's already translated AND get any new structural metadata (category, source_path) without copy-paste.

3. **Verifier extension was incremental.** Adding `--list-stale` + `--list-needs-translation` reused the existing per-file parsing pipeline. Added a 3-line YAML scalar parser (no need for js-yaml dependency in the verifier).

4. **One-time migration is idempotent.** Safe to re-run. Counts `migrated` / `already_had_field` / `not_translated` for observability.

5. **Tested by edit-revert cycle.** Edited `.claude/agents/cto.md`, ran walker (stale message logged), verified VI body preserved, frontmatter has new fields. Reverted source, re-ran walker (skipped — source unchanged). Walker is idempotent under both branches.

---

## What was harder than expected

1. **Description field also needed preserving.** Initial implementation only preserved body, leaving the frontmatter `description` reverted to English (because the adapter extracts it from English source). Took a second iteration to add `description` + `title` to `preservedVi`.

2. **The JSX comment marker.** `parseFrontmatter` returns body INCLUDING the `{/* generated-by ... */}` line. emitMdx ALWAYS prepends a fresh marker. Without stripping the old marker from `preservedVi.body`, the file would have duplicate markers. Fix: regex-strip in `preservedVi` construction.

3. **Subtle: walker version bump cascades.** Bumping `GENERATED_BY` to v1.2.0 means EVERY future walker write embeds the new marker. Files written before v1.2 still say "v1.1.0" in their generated-by line. Fine for now — the marker is for idempotency detection, not version policing.

---

## Surprises

1. **224 files migrated (not 133).** I expected the migration to touch only the 133 "fresh" files measured by verifier. But the verifier's "Skipped" 93 SOP-stub files DO have `translated: true` in their frontmatter — they just have insufficient prose for the diacritic measurement. The migration didn't care about prose; it backfilled hash on anything with `translated: true`. Outcome: all 224 translation-marked files now have `translated_source_hash`, including stubs. Better than expected.

2. **`/docs translate` skill is essentially documentation, not a runtime artifact.** Unlike `/docs sync` which dispatches to a runtime skill that runs deterministic code, `/docs translate` orchestrates Claude Code subagent dispatch — which only happens INSIDE a Claude Code session. The skill file is a protocol / cookbook, not an executable. This is fine for v1.2 but means the slash command is "interactive only" — there's no headless equivalent (e.g., for CI auto-translation).

---

## Boilerplate-extractable patterns

Adding to the v1.0 + v1.1 list:

8. **`source_hash + translated_source_hash` invariant for any rendered-artifact bilingual pipeline.** Same idea as wiki-sync v3.0's citation spine: every derived artifact stores hash of source it was derived FROM. Comparison detects "stale" without re-deriving. Template: future content-sync (blog), kpi-sync (dashboards), email-templates-sync — if they have bilingual variants, this is the persistence pattern.

9. **Walker `preservedVi` branch.** Pattern: idempotent re-write of generated artifact preserves user-touched content when content-key (translated body) is independent of source-key (source content). Future skills (e.g., custom-edited tutorial pages) can adopt this branch.

10. **Verifier with `--list-X` family of flags.** Pattern: same scanner exposes multiple list-mode outputs (untranslated, stale, needs-translation = union). Future verifiers should default to summary, support `--list-*` per category, support `--json` for orchestrator consumption.

---

## Lessons for next CLA extend run

1. **Always test the changed-source path explicitly.** v1.1's preserve-on-unchanged-source was correct but the changed-source path was the actual failure mode. Should have caught it at v1.1 phase 5 architecture review.

2. **Skill files are the right place to document subagent-dispatch protocols.** Since Claude Code Desktop doesn't have a CLI for subagent dispatch, the protocol can only run inside the session. Codifying it in `SKILL.md` (vs scattered prompt instructions) gives future sessions a single source of truth.

3. **Migrations are cheap insurance for retroactive schema additions.** Five-minute write + safe-to-re-run pattern + idempotent counter output. Future Tier 1 schema extensions should default to a `scripts/migrate-*.cjs` companion.

4. **Don't deprecate `scripts/docs-translate.cjs` (Anthropic API).** Even though Claude Code Desktop subagent dispatch is the primary path for v1.2, the API script remains valid for: (a) headless cron-based re-translation (future v1.3 maybe), (b) founders without Claude Code Desktop, (c) reproducible CI translation. Keep both paths.

---

## Trigger interfaces deployed (v1.2 additions)

| Trigger | Type | Path | Status |
|---|---|---|---|
| `/docs translate` slash command | Claude Code project command | `.claude/commands/docs.md` (workflow section) | ✅ documented |
| `docs-engine/translate` skill | Tier 1 SKILL.md | `06-ai-ops/skills/docs-engine/translate/SKILL.md` | ✅ live |
| Verifier `--list-stale` | CLI flag | `scripts/verify-vi-translation.cjs` | ✅ live |
| Verifier `--list-needs-translation` | CLI flag | `scripts/verify-vi-translation.cjs` | ✅ live |
| One-time migration | CLI script | `scripts/migrate-translated-source-hash.cjs` | ✅ executed |

---

## v1.2.0 promotion confirmed

- [x] `knowledge/capability-registry.yaml` updated (version 1.1.0 → 1.2.0, notes appended)
- [x] `wiki/capabilities/docs-engine/retrospective-v1.2.0.md` written (this file)
- [x] `wiki/capabilities/CATALOG.md` v1.2 row update (separate commit)
- [x] Migration executed (224 files backfilled)
- [x] Walker idempotency verified (test edit + revert cycle)
- [x] Local `pnpm build` succeeds (post-test cleanup)
- [x] `pnpm check` clean
- [x] Verifier reports 100% Fresh / 0 Stale

---

## Open questions / future work (v1.3+ candidates)

1. **v1.3 — 5 hand-written Vietnamese tutorials.** Still deferred (originally Sprint 2 of v1.0; bumped from v1.1 → v1.2 → v1.3).

2. **v1.3 — `.github/workflows/docs-translate-check.yml` CI gate.** PR-time check: any file with `needs_retranslation: true` blocks merge until `/docs translate` clears the flag. Soft gate first; hard gate after 2 weeks.

3. **v1.3 — Auto-dispatch of `/docs translate` inside `/docs sync`.** Currently 2-step (sync then translate). Could become `/docs sync --then-translate` if the host session has dispatch capability. Saves founder action.

4. **v1.4 — Translation drift dashboard.** Tile on founder Monday dashboard: "Stale translations: X files in Y categories." Source: `verify-vi-translation.cjs --json` output piped into ops.kpi_snapshots.

5. **v1.4 — Custom domain `docs.ritsu.works`.** Founder adds via Vercel dashboard.

6. **v1.4 — Per-page prev/next navigation** (still pending from v1.1 open questions).

7. **Long-term — Translation memory.** Per-segment translation cache so re-translating an unchanged paragraph in a changed file is free. Significant complexity; only worth if `/docs translate` cost becomes meaningful (currently $0 in Desktop subscription, ~$3-9 batch via API).
