# Retrospective: capability-lifecycle-architecture v1.1.0 (extend)

**Capability ID:** `capability-lifecycle-architecture`
**Version:** 1.1.0 (extend from v1.0.0 bootstrap)
**Phase:** 8 — Catalog Update (post-extend)
**Shipped:** 2026-05-21
**Sub-flow:** `/cla extend capability-lifecycle-architecture` (accelerated single-session)

---

## What v1.1 addressed

Founder observed: after shipping `/wiki get` v4.4 (semantic + spec retrieval bundler), the natural next step is composition with `/cla propose`. Without integration, founder still has to:

1. Run `/wiki get --src=<spec> --to=.archives/X.md` manually
2. Then type `/cla propose "<problem>" --refs=.archives/X.md`
3. For a multi-source problem: repeat step 1 N times, then concatenate all paths in step 2

This is mechanical busywork that AI should absorb. Founder asked: extend `--refs` to accept `wiki:src=<spec>` and `wiki:query="<text>"` forms — orchestrator auto-runs `/wiki get` during CLA Phase 0, generates intermediate files under `runtime/cla/refs/<slug>/`, and treats them as primary refs.

This pattern emerges constantly when solving any problem grounded in the founder's extensive knowledge corpus (books, playbooks, market research, distilled wiki). Pre-v1.1: friction. Post-v1.1: zero-friction wiki composition.

---

## Sprint scope shipped

**v1.1 = single session AI execution (~45 min):**

| Component | Change | Status |
|---|---|---|
| `.claude/commands/cla.md` | (1) Updated `/cla propose` row to document new `--refs=wiki:` forms. (2) Replaced Phase 0 step 6 (was simple file copy) with full ref-resolver workflow: grammar table, auto-filename rules, runtime vs archives location rationale, 3 examples. (3) Step 7 confirmation summary updated to break out file refs vs wiki refs. | ✅ |
| `06-ai-ops/skills/capability-lifecycle/problem-framer/SKILL.md` | (1) Added `wiki_refs_dir` input. (2) Step 1 now lists BOTH ref folders and treats wiki refs as "founder-curated knowledge" (higher trust signal vs ad-hoc file dump). | ✅ |
| `scripts/cla/resolve-refs.cjs` (NEW, ~200 LoC) | Parses `--refs` CSV with mixed file paths + `wiki:` forms. Handles deterministic refs (file + `wiki:src=`) via direct `get.cjs` invocation. Returns JSON with `wiki-query-pending` markers for orchestrator-only refs. Slug-trim fix for clean filenames. | ✅ |
| `knowledge/capability-registry.yaml` | Version 1.0.0 → 1.1.0; state `deployed` → `operating`; notes updated; retrospective_path added; bài_toán_touched +#20 (CLA self-extended via CLA). | ✅ |
| `wiki/capabilities/capability-lifecycle-architecture/retrospective-v1.1.0.md` (this file) | Phase 8 retro. First retrospective for the OG meta-capability. | ✅ |
| `wiki/capabilities/CATALOG.md` | Capability-lifecycle-architecture row updated to v1.1.0 + retrospective link. | ✅ |

---

## `--refs` grammar (v1.1 final spec)

Each `--refs <value>` argument may be a comma-separated list. Each item one of:

| Form | Resolves to | Output location |
|---|---|---|
| `<file-path>` | Existing file (e.g. `raw/notes.md`) | Copied to `.archives/cla/<slug>/refs/` (existing v1.0 behavior) |
| `wiki:src=<spec>` | `/wiki get --src=<spec>` | `runtime/cla/refs/<slug>/<ordinal>-wiki-<slugified-spec>.md` |
| `wiki:query="<text>"` | `/wiki get --query="<text>"` (orchestrator workflow) | `runtime/cla/refs/<slug>/<ordinal>-wiki-query-<slugified>.md` |
| `wiki:query="<text>":src=<source>` | `/wiki get --query="<text>" --src=<source>` (scoped) | same as above |

Multiple `--refs` flags concatenate. CSV inside one flag also concatenates.

**Why two folders** (`.archives/cla/<slug>/refs/` vs `runtime/cla/refs/<slug>/`):
- `.archives/` is shell-committed (subfolder structure tracked, contents gitignored). Files copied here are operator's personal scratch — keep.
- `runtime/` is fully gitignored (entire folder). Wiki bundles can be regenerated deterministically from source — no need to persist long-term.
- Separation honest about origin: hand-curated vs auto-extracted.

---

## Orchestrator + script split

For deterministic refs (file paths + `wiki:src=`), the helper script `scripts/cla/resolve-refs.cjs` handles everything. The orchestrator (Claude session running `/cla propose`) just invokes it.

For `wiki:query=` refs, script can't run (semantic retrieval needs MCP `wiki_ask` — Claude session-only). The script returns these as `kind: "wiki-query-pending"` with intended filepath. The orchestrator then:

1. Calls `mcp__supabase-ops__wiki_ask({question: <query>, filter.source: <src> if set, k=15, entity_only=true})`.
2. If results: orchestrator builds entity CSV from results, calls `node scripts/wiki-sync/get.cjs --entities=<csv> --query-context-header="<query>" --to=<intended_path>`.
3. If `no_coverage`: orchestrator falls back to filesystem keyword grep on slug + title (same v4.4 query mode fallback), then invokes get.cjs with --entities.

After all refs resolved, Phase 0 continues with the combined ref list passed to Phase 1 problem-framer.

---

## Tested invocations (3 scenarios pass)

1. ✓ Dry-run mixed: file + wiki:src + wiki:query → correct kind classification + warnings
2. ✓ Real execution `wiki:src=` only → file written to `runtime/cla/refs/<slug>/01-wiki-...md`
3. ✓ Filename trim: 60+ char spec slugified + truncated cleanly (no trailing `-` artifact)

---

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Founder time | 1-2h (write spec, review, test) | ~5 min (one ask) | -95% |
| LLM cost | $0.50 | ~$0.01 (1 brief skill dispatch) | -98% |
| Wall-clock | 2-4h | ~45 min | -85% |
| LoC added | 150-250 | ~200 (resolve-refs.cjs) + ~50 (docs) | on target |

---

## What went well

1. **Composability with wiki-sync v4.4 was natural.** `/wiki get --to=<path>` was designed in v4.3 with exactly this composition in mind. v1.1 just wires the call site.

2. **CSV + multi-flag parsing reused common pattern.** `parseArgs` collects all `--refs` values, comma-splits each, unions. Works for any future skill that takes mixed ref lists.

3. **Wiki ref grammar (`wiki:key=value:key=value`) is unambiguous + extensible.** Easy to add `wiki:type=<type>:src=<spec>` later for filter-by-type. Easy to add `wiki:limit=<N>` for cap.

4. **Auto-filename slugify with ordinal + max-length + trim**. Clean filenames like `01-wiki-principles-of-marketing-kotler-concepts-market-segmentation.md` — readable, sortable, deterministic.

5. **`runtime/cla/refs/<slug>/` location separation honest.** Operator can `ls runtime/cla/refs/<slug>/` to see exactly what wiki context was provided to a capability. Cleanup is `rm -rf runtime/cla/refs/<slug>/` when capability is deprecated.

---

## What was harder than expected

1. **Wiki ref CSV inside --refs needs careful tokenization.** `wiki:query="email lifecycle":src=foo` contains `:` inside both quoted value AND between key-value pairs. Wrote a small state machine for parseWikiRef. Tested with quoted + unquoted forms.

2. **Filename slugify edge case.** First version sliced to 60 chars but didn't re-trim trailing `-`. Caught in test. Fix: trim trailing `-` after slice.

3. **`runtime/` vs `.archives/` confusion**. Initial design wanted to put wiki refs in `.archives/cla/<slug>/refs/` alongside file refs. Rejected: `.archives/` is committable-shell-only (operator scratch), `runtime/` is fully local-only (regenerable). Wiki bundles are regenerable from source → `runtime/` is the right home. Documented rationale in cla.md.

---

## Boilerplate-extractable patterns

This is the FIRST capability to chain another capability's output as input. Reusable patterns:

16. **Cross-capability composition via slash command flag.** Pattern: capability A produces artifacts; capability B's CLI flag accepts `<other-cap>:<spec>` form; B's orchestrator runs A's command, gets artifact path, uses it. Reusable for any future capability that needs to consume another's output (e.g. `@cpo --kpi-context=<query>`, `/cla propose ... --metric-baseline=<spec>`).

17. **`runtime/` for regenerable intermediate artifacts**. Distinct from `.archives/` (operator scratch) and `wiki/` (source projection). Anything that can be re-built deterministically from canonical sources lives here.

18. **Orchestrator + script split with "pending" markers**. When script can't fulfill some refs (network/MCP-bound), return them as `kind: "X-pending"` with `intended_path` so the orchestrator knows what to do next. Cleaner than failing the whole batch.

---

## Lessons for next CLA extend run

1. **`/cla extend` of meta-capabilities (CLA, wiki-sync, docs-engine) is fast.** This is the second time CLA-extended itself (first was v1.0 → cla-update-mechanism v1.1). Both took <1h with high confidence because the test surface is small + reversible.

2. **Composition patterns multiply value.** v4.4 `/wiki get --query=` alone is useful but rarely used directly. Wired into `/cla propose --refs=wiki:query=`, it becomes the default knowledge-loading path for every new capability. Future: `@cpo --wiki-context=`, `/cla extend --wiki-context=`, `/docs translate --wiki-glossary=` etc.

3. **Document the orchestrator workflow as a sequence, not "magic".** The cla.md Phase 0 step 6 now includes a 4-step letter list (a-d) PLUS a script-helper paragraph. Explicit sequence makes future operators (human or AI) follow the same pattern.

---

## v1.1.0 promotion confirmed

- [x] `knowledge/capability-registry.yaml` 1.0.0 → 1.1.0, state `deployed` → `operating`
- [x] `wiki/capabilities/capability-lifecycle-architecture/retrospective-v1.1.0.md` written (this file)
- [x] `wiki/capabilities/CATALOG.md` row updated
- [x] `scripts/cla/resolve-refs.cjs` tested (3 scenarios pass)
- [x] `.claude/commands/cla.md` updated (subcommand row + Phase 0 step 6)
- [x] `06-ai-ops/skills/capability-lifecycle/problem-framer/SKILL.md` updated
- [ ] Final `pnpm check` clean (last gate)
- [ ] Docs site reflects v1.1 wiki: ref grammar (after `/docs sync` + translate)

---

## Open questions / future work (v1.2+ candidates)

1. **v1.2 — Auto-distill of file refs.** When a `--refs=<file-path>` is large (>50KB), run `/wiki sync <file-path>` automatically to distill into wiki + use the distillation result as the ref. Saves Phase 1 problem-framer context budget.

2. **v1.2 — `--refs=wiki:` with `--type=` filter.** `wiki:type=concept:src=<source>` → only pull concept entities. Useful when founder wants strategic frameworks (concepts) but not operational anecdotes (observations).

3. **v1.2 — `--refs=playbook:<chapter>` shortcut.** For the AI-Native Company Playbook (in `.archives/ritsu-handoff-bundle/playbook/chapters/`), provide a clean shortcut. Pulls chapter content as ref.

4. **v1.2 — Ref deduplication.** If founder passes both `raw/notes.md` AND `wiki:src=<spec>` that overlap, surface a dedup hint in Phase 0 confirmation summary.

5. **v1.3 — `--wiki-context=` flag on `@cxo` personas.** Same composition pattern: `@cgo --wiki-context=wiki:query="email channels"` injects bundle into agent prompt automatically. Already noted as v4.6 in wiki-sync retrospective.

6. **v1.3 — Auto-archive of wiki refs after capability promotion.** When `/cla` reaches Phase 8 (promotion), copy `runtime/cla/refs/<slug>/` snapshot to `.archives/cla/<slug>/refs-wiki-snapshot/` so the historical refs are preserved alongside the capability spec.
