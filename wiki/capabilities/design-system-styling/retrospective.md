# Retrospective — design-system-styling v1.0

**Capability:** design-system-styling — multi design-system library + universal `--style` output layer
**State:** operating (Phase 8, 2026-06-01)
**ops.capability_runs:** `fbd8edb1-9436-42c0-9e60-8c3b72c46914` · **Tier-C decision:** `bf3a6323` (slug `design-system-styling-architecture-option-a`)
**Sprints:** 4 · **PRs:** #175 (S1), #178 (S2), #179 (S3), + S4/Phase-8 · **Build cost:** ~$3–5 (as estimated)

## What shipped
A "build once, use forever" output-styling layer:
- **Format**: adopted the emerging `DESIGN.md` standard (Google Stitch / `google-labs-code/design.md`) — YAML tokens + Markdown rationale. Did NOT invent a format.
- **SPLIT registry**: owned/canonical in Tier-1 `00-core/design-system/<name>/`; downloaded third-party in gitignored `runtime/design-systems/<name>/`; `knowledge/design-systems.yaml` (+ schema + L1 validator) the single index. `vendor` verb promotes cache→Tier-1.
- **Helpers** (`scripts/design-system/*.cjs`, mirror `scripts/deepask/*.cjs`): `resolve-style` (the universal resolver — `undefined`→plain, present→styled, miss+interactive→needs-download, **miss+non-interactive→`StyleResolveError`** [AD-3]), `parse-design-md` (tokens + `{ref}` resolution + sRGB), `registry-io`, `download`, `license-gate` (R2 fail-closed).
- **`/design-system` command** (list/show/search/add/build --from/preview/lint/vendor/remove) + `design-system{,/build-from-repo}` skills.
- **`ritsu` seed**: `00-core/design-system.md` graduated stub→canonical (G1); `00-core/design-system/ritsu/{DESIGN.md,assets,previews}`.
- **deepask wired as first consumer**: `--format=html --style=ritsu` injects tokens into the renderer; dispatch table unchanged (AD-4). `/docs` + playbook-builder inherit the contract (`SOP-AIOPS-007`).
- **No migration · no MCP server · no API key.** ~186 tests across the helper + integration suites.

## Key architecture calls
- **AD-1 / G1 graduation** — keeping `00-core/design-system.md` as a *surviving* canonical doc + a sibling `00-core/design-system/` folder needs **zero `validate.cjs` change** (it iterates a hardcoded `EXPECTED_DOCS` list, no glob; charter-adapter is `00-core/*.md` non-recursive). This *sidestepped* @cto's Phase-2 "must-fix :38/:73" (which assumed deleting the .md). Cleaner + lower-risk than the file→folder alternative.
- **AD-2 designmd no-key** — register metadata-first; getdesign top-N = `origin:downloaded` (key-free), designmd = `origin:built-from-repo` via the `build --from=<public repo>` verb. Honored the "no API key" lock verbatim.
- **AD-3 CI determinism** — non-interactive reads owned/vendored only; cache-miss hard-fails (never silent `npx`).
- **AD-4 no new renderers** — `--style` injects token *data* into the existing `--format` renderer; never a new dispatch row.

## What went well
- The **deepask-twin** pattern (Option A) made execution low-risk: reusing `scripts/deepask/*.cjs` shape + the dispatch-table discipline meant the only genuinely new surface was `resolve-style.cjs`, which @cto told us to attack first.
- The **Tier-C Muse panel earned its keep**: it landed 2/5 (opportunity-cost + falsifiability dissent). We corrected the panel's two weakest assumptions (AI-built ≠ founder-weeks; pre-seed is lazy/metadata-first) but **adopted its two strongest, surviving objections as R1 (falsifiability gate) + R2 (license gate)** — both now shipped.
- **@cto review caught real bugs each sprint**: S1 the `getByPath` prototype-chain leak (`{toString}`/`{constructor}` resolved to native built-ins — fixed with `hasOwnProperty` + 5 regression tests); S2 confirmed G1; S3 confirmed deepask wasn't broken.

## What went wrong (lessons)
- **`build/` is gitignored.** The sub-skill folder `06-ai-ops/skills/design-system/build/` matched a global `.gitignore build/` rule → the file silently never staged, AND the resolver catalog (which walks the filesystem) registered an orphan recipient that would have failed CI. **Lesson: skill/command sub-folders must avoid build-output names** (`build/`, `dist/`, `node_modules/`, `coverage/`). Renamed → `build-from-repo/`. → candidate for a new validator or a `.gitignore`-aware catalog-sync check.
- **The full vitest suite mutates the working tree** (bundler tests rewrite `_shared/*.generated.ts`; a stale `/update` cap-format test fails) — commit before running it; the stale test was flagged as a separate task. CI runs `pnpm check`, NOT vitest, so neither gated this capability.

## Falsifiability (R1 — the kill criterion)
`design_system.styled_artifact_rate`: **≥ 6 distinct non-default `--style` artifacts within 60 days** of v1 (by ~2026-07-31) → keep. Else → founder decides `/cla deprecate` or de-scope to ritsu-only. This makes the capability evidence-killable despite N≈1 emitter (the data-pragmatist's gate).

## KPIs
`design_system.library_size` · `design_system.styled_artifact_rate` (R1 gate) · `design_system.style_resolve_failure_rate` (< 5%). Registered in `knowledge/kpi-registry.yaml`; derived/reuse `ops.deepask_runs.metadata` + a deterministic registry scan (no new table — deferred to a future `/cla extend` if first-class observability is justified).

## Try it
`/deepask "<q>" --format=html --style=ritsu` · `/design-system show ritsu` · `00-core/design-system/ritsu/preview.html`.
