# Retrospective — wiki-sync-from-refs v4.0.0 (source-grouped layout)

**Phase:** 8 (catalog promotion)
**Capability run id:** `f75502d4-c7b2-44c1-86a5-395b4578f93d` (operating)
**Parent (superseded):** `36836749-06f7-48e8-8a31-f5a3f2e401a1` (v3.0.0, operating 2026-05-18 → superseded 2026-05-18)
**Tier C decision:** `ops.decisions[e558913a-fb5d-444a-ab0b-305f38ce80a0]` (slug `wiki-sync-v4-source-grouped-layout`)
**Sub-flow:** `/cla revise` (CLA v1.1 sub-flow)
**Calendar:** proposed 2026-05-18T05:50Z, approved 2026-05-18T08:24Z, Sprint 1 merged 2026-05-18T09:10Z, Sprint 2 merged 2026-05-18T09:23Z, Phase 8 promotion 2026-05-18T~09:30Z.

---

## §1 — What shipped

### The semantic flip

v3.0 ⟶ v4.0 = file-system **layout** flip (no semantic change to distill+extract pipeline).

| | v3.0 | v4.0 |
|---|---|---|
| Source RECORD path | `wiki/<page_type>/<slug>.md` (entity-type grouped) | `wiki/<source-slug>/source.md` (source-grouped) |
| Derived entity path | `wiki/<page_type>/<slug>.md` (global UNIQUE slug) | `wiki/<source-slug>/<page_type>s/<slug>.md` (composite UNIQUE within source) |
| Slug discipline | `knowledge_pages_slug_key` global UNIQUE | 2 partial UNIQUE indexes (source RECORDs global; derived composite) |
| Chapter pages | `wiki/books/<book-slug>/chapter-NN.md` | `wiki/<book-slug>/chapters/chapter-NN.md` |
| Cross-source vocabulary | implicit via slug-equality dedup | explicit via `wiki/_index/<page_type>/<canonical-name>.md` link-lists |
| Skill input contract | `input = wiki/<page_type>/<slug>.md` (scattered) | `input = wiki/<source-slug>/` (coherent package) |

### Deliverables (Sprint 1 + 2)

| Sprint | PR | Key artifacts |
|---|---|---|
| 1 | [#45](https://github.com/doanchienthangdev/ritsu-works/pull/45) | Migration 00032; `migrate-to-v4.cjs`; 13 SKILL.md rewrites; Tier 1 yaml flips (5 files); validators + ingest.cjs + docs |
| 2 | [#46](https://github.com/doanchienthangdev/ritsu-works/pull/46) | NEW `index-rebuild` skill + impl (`rebuild-index.cjs`); NEW `package` skill; `/wiki ask` filter.source/packages flags; migrate-to-v4 hotfix; v4 FS state committed; `wiki/_index/` 14 link-list files |

### DB invariant (post-migration)

```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE file_path ~ '^wiki/[^/]+/(source\.md|[^/]+/[^/]+\.md)$') AS v4_layout
  FROM ops.knowledge_pages;
-- total=16, v4_layout=16, non_v4=0
```

---

## §2 — What worked

1. **Single-session AI execution.** Founder delegated the whole revise (Phase 5 → Phase 8) to AI; 6 phases including 2 PRs + migration apply ran in ~3 hours of founder time (mostly approving Tier C gates).
2. **Force-unlock ceremony.** When the prior session's lock was stale (held by dead session `f55023d9` for 8h, < 24h auto-expire), the `override:` magic phrase Tier D-Std ceremony unblocked resume cleanly. Audit row preserved (`ops.audit_log[e6f5e17b]`).
3. **CTO + Muse panel in Phase 5.** CTO caught 7 actionable nits; 6 fixed in-spec before founder approval; 1 (legacy_v2_verbatim semantics) cleanly deferred to Sprint 1 implementation and resolved there. Muse panel's Paul Graham 7-day commitment surfaced PMF discipline that pure-code review wouldn't have raised.
4. **Idempotent migrate-to-v4 script.** Dry-run-first workflow caught the missing `title` column constraint cleanly. Re-running after the fix produced identical FS state and clean SQL.
5. **wiki/_index/ as link-list rather than entity store.** Rams's CONCERN flagged the `_index/` as potentially premature; founder elected to ship it anyway. The deterministic regen via `rebuild-index.cjs` (no DB table, no separate dedup ceremony) keeps it cheap. If Rams turns out to be right, `rm -rf wiki/_index/` reverts cleanly.

---

## §3 — What didn't (or surprised)

1. **`ops.capability_acquire_update_lock` multi-row bug.** When v3 is `operating` AND v4 is `implementing` for the same `capability_id` and both have `superseded_by_id IS NULL`, the function's `UPDATE ... RETURNING id INTO scalar` errors on multi-row. Surfaced during `/cla resume`. Workaround: direct `UPDATE ops.capability_runs SET update_lock_session_id = ... WHERE id = <specific>` via supabase CLI. Filed as [TODOS.md CLA-FN-1](TODOS.md). Recommended fix: function overload accepting `p_run_id uuid`.
2. **Migrate-to-v4 missing `title` on INSERT.** First-run failure because `ops.knowledge_pages.title` is NOT NULL. Caught by the supabase error; patched in Sprint 2 PR. Future migrate-to-v4 reruns won't hit this.
3. **`wiki/_index/` gitignore conflict.** The wiki/_index/ path was caught by the `wiki/_*` and `wiki/**/_*` rules (local-only underscore-prefix convention). Required explicit `!wiki/_index/` exception in `.gitignore`. Tradeoff acknowledged: future "underscore = local" rule has an exception now.
4. **Muse oracle subagent had no Write tool.** The panel output had to be embedded in the subagent's return text and persisted by the parent agent. Not a v4 issue; a tooling note for future Phase 5 panel invocations.

---

## §4 — Effort vs estimate

| Item | Spec estimate (Phase 5 §7) | Actual |
|---|---|---|
| Founder hours | 11-14h | ~3h (largely approval gates + classifier prompts) |
| LLM cost | $4.50-6.50 | ~$3-5 (Phase 5 spec + 2 reviews + 13-SKILL.md subagent + Phase 7/8 work) |
| Calendar | 2 weeks | ~3 hours (single session, AI-driven) |
| Sprints | 2 + Phase 8 | 2 PRs + 1 Phase 8 PR (this one) |

The order-of-magnitude founder-time win came from AI delegation. The estimate assumed founder writing each SKILL.md by hand; in practice the subagent did the 13 mechanical path-template flips in one batch.

---

## §5 — 7-day post-ship commitment (Muse Paul Graham M1)

Founder committed at Tier C ceremony 2026-05-18: by **2026-05-25**, ingest **≥3 growth playbooks** via `/wiki sync <path>`. The v3.0 kill-criterion clock continues independently:
- Day-30 evaluation: **2026-06-17**
- Day-60 evaluation: **2026-07-17**

v4.0 itself does NOT reset the kill clock. The point of the 7-day commit is to put real v4.0 usage data on the table BEFORE the day-30 gate fires.

---

## §6 — What we learned about the project

1. **The CLA revise sub-flow is mature.** v1→v2→v3→v4 lineage chain works as designed. Each revise inherits parent state cleanly; ops.capability_runs row IDs let us trace decisions back to specific Tier C ceremonies.
2. **Source-grouped layout maps to skills naturally.** Once `wiki/<source-slug>/` is the unit, downstream skill templates can declare `input = wiki/<source-slug>/concepts/` and know they'll get one source's voice. Pre-v4 this required either filename conventions (`<col>__<file>` slug) or explicit metadata reads.
3. **Cross-source dedup is the wrong default for a curated library.** v3.0 deferred it; v4.0 makes the deferral permanent (`/wiki merge` is opt-in only). The `wiki/_index/` link-list covers the 80% of cross-source vocabulary discovery cases without resurrecting graph-mode complexity.

---

## §7 — Re-trigger conditions for v4.1+

- (a) Founder wants graph-mode dedup back as default → revise to v5.0.
- (b) `_index/` proves valuable enough that founder wants cron-scheduled rebuild → v4.1 adds cron entry to `knowledge/schedules.yaml`.
- (c) Skill template authors find package-input ergonomics awkward (want named selection across types) → v4.1 introduces selection syntax.
- (d) > 50 packages exist and `_index/` files > 1MB → introduce sharded `_index/` or DB-backed alternative.
- (e) Auto-canonization (Option C territory) becomes a felt need → v4.1 introduces `/wiki canonize` + `wiki/canon/`.

---

## §8 — Citations (per spec §0 acceptance discipline)

For day-60 kill-criterion gate, retrospective-v4.0.0 will need:
- Specific `ops.agent_runs.id` row IDs for the ≥ 5 growth-domain `/wiki sync` invocations.
- Specific git commit SHAs OR `01-marketing/`/`02-sales/` file paths for content pieces citing v4.0 extracted entities.
- Specific `ops.knowledge_extractions.id` rows the content cites.

(Empty at promotion time; populated as the 7-day commit + subsequent acceptance corpus runs accumulate evidence.)

---

## §9 — State at promotion

- `knowledge/capability-registry.yaml.wiki-sync-from-refs.version`: `3.0.0 → 4.0.0`
- `knowledge/capability-registry.yaml.wiki-sync-from-refs.state`: `operating` (no change; v3 was already operating)
- `ops.capability_runs[36836749]` (v3): `state operating → superseded`, `superseded_by_id = f75502d4-...`
- `ops.capability_runs[f75502d4]` (v4): `state implementing → operating`, `operating_since = now()`
- Update lock released.
- Sprint 1 PR #45, Sprint 2 PR #46, Phase 8 PR (this commit) all merged.
- Lineage chain: `911973a2 (v1) ← 638811f8 (v2) ← 36836749 (v3) ← f75502d4 (v4, operating)`.

---

*Phase 8 catalog-updater closes the v4.0 revise sub-flow. Next: 7-day founder commitment + v3.0 kill-criterion clock evaluation at 2026-06-17.*
