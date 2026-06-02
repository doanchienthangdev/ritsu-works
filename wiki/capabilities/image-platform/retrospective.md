# Retrospective — `image-platform` v0.1

**Capability:** image-platform (`/image`) · **State:** operating (2026-06-02)
**CLA run:** `ops.capability_runs.id = f494f9c9-b4be-4308-a1c2-d006a0e0476e`
**Tier-C decision:** `ops.decisions.id = d7e92ec2-bcfb-4b7f-a140-bfb14a12dacf` (Option A+ lean, table-ready)
**Shipped:** PR #197 (foundation) → #198 (surface) → #199 (Phase-8), all merged 2026-06-02.

---

## What shipped

A foundational, model-agnostic image-generation command `/image <prompt> [flags]` with a **pluggable adapter layer** (`--use=<adapter>`) — new image models plug in via a registry row + an `adapters/<id>/` skill, **no command-side code change**. v0.1 ships one real backend (gpt-image-2) + a preset + three registered-not-built stubs.

- **Registry:** `knowledge/image-adapters.yaml` (+ schema) — SPLIT-registry mirroring `design-systems.yaml`. `scripts/cross-tier/validate-image-adapters.cjs` (L2 critical) wired into `check-consistency.cjs` AND `.github` CI.
- **Engine:** `scripts/image/gen.cjs` (`require()`s the in-place deepask helpers — deepask untouched) + `scripts/image/lib/params.cjs` (universal vocab, `resolveAspectRatio`, area-cost, `supports()`/WARN). 55 All-Edge tests.
- **Surface:** `06-ai-ops/skills/image/{SKILL.md, adapters/gpt-image-2, enhance}` + `.claude/commands/image.md`.
- **Governance:** `governance/ROLES.md` gps `per_task_kind_caps` (image-gen advisory / image-enhance hook-enforced); cost-bucket `ai-ops-image`; `SOP-AIOPS-008-image-runtime-contract`. Tier A.

## Key decisions

- **A+ (lean, table-ready)** over B (Tier-2 table now): no `ops.image_runs` in v0.1; `run.json` is the forward-compat superset → adding the table later is INSERT-wiring via `/cla extend`, not a rewrite. Both Phase-5 reviewers flagged the cost story; founder reaffirmed A+ with the MF1 honesty folded in.
- **Locked founder decisions held:** default gpt-image-2; `/image` is a NEW peer consumer (deepask untouched, verified zero-diff in every PR); one real adapter + stubs.

## Phase-5 refinements (the architecture phase earned its keep)

Reading the actual deepask helper code corrected three brief assumptions:
- **R1** — `resolveImageSpec` is deepask-format-coupled, NOT reusable; only `parseSize`+`centeredCropBox` are. `gen.cjs` got its own `resolveAspectRatio`.
- **R2** — gpt-image-2 is **flexible-sized** (×16 edges, AR ≤ 3:1, edge < 3840), so `--ar` → a native size with no fixed-enum-snap + no in-range crop. *Better* than the brief's §7, and it closed open-question A6 (no enum to freeze; a constraint set).
- **R3** — `COST_TABLE` is pixel-area-linear → per-tier interpolation for arbitrary sizes.

Two @cto must-fixes folded before merge: **MF1** the `image-gen` cap is advisory (out-of-band → invisible to the budget hook; the per-run `--max-cost-usd` breaker is the real guard); **MF2** `--ref`/`--mask` need the `/v1/images/edits` multipart endpoint → scoped to `supports_stretch` (WARN-as-unsupported in v0.1).

## What worked

- **Composition over construction:** ~70% reuse (4 deepask helpers + 2 style axes + 2 art-direction skills + 2 structural precedents). Novelty confined to `resolveAspectRatio` + the `supports()`/WARN layer.
- **Per-PR drift discipline:** the `resolver-v2-coverage` critical gate forced catalog regen in the PR that introduced each source entity (capability/page in #197; skills/command in #198; SOP in #199) — caught immediately, never deferred.
- **Reviews were real, not theater:** @cto verified R1/R2/R3 against code (corrected R3's numbers); the Muse panel surfaced the cost-ledger tension that became MF1.

## What to watch

- **Resolver `INDEX.md` token budget** — ~14.8K against a 15K hard cap after #196's 3 books + the image entries. The operating-flip adds image-platform to the ambient INDEX. Tighten the INDEX (or raise the cap deliberately) if the generator starts failing.
- **MF1 cost visibility** — image $ is in `run.json` only (not a queryable ledger). If `/image` becomes high-frequency, do the Option-B `/cla extend` (`ops.image_runs` + KPIs + cross-run/hook enforcement). The kill/grow signal is real usage.
- **`--ref`/`--mask`** remain `supports_stretch` until the edits-endpoint path is built.

## Follow-ups (not v0.1)

- `nano-banana` / `midjourney` / `flux` generation (stubs today — the abstraction is proven; plug them in when needed).
- `deepask` image branch → delegate to `/image` (a future `/cla revise deepask` for a single pipeline; documented, not executed).
- Vendored prompt-corpus for `--enhance` (retrieval-augmented refinement vs in-session rewrite).
