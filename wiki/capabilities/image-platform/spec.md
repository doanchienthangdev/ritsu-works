# Capability Spec: `image-platform` (`/image` command)

**Phase:** 5 (canonical capability spec) · **ID:** `image-platform`
**Selected option (Phase 4):** **A+ — lean, table-ready** (founder, 2026-06-02)
**HITL tier:** C (APPROVED 2026-06-02) · **Decision row:** `ops.decisions.id = d7e92ec2-bcfb-4b7f-a140-bfb14a12dacf`
**Generated:** 2026-06-02 · **CLA run:** `f494f9c9-b4be-4308-a1c2-d006a0e0476e`
**Version:** 0.2.0

---

> **v0.2.0 (2026-06-02, `/cla extend`):** **first-class `--style` design-system** — `scripts/image/lib/compose.cjs` deterministically resolves the DESIGN.md (palette/typography/personality via `resolveStyle`) + the `--art-style` genre (`resolveArtStyle`) and injects them into the prompt inside `gen.cjs` (out-of-band, no LLM; parity with `/deepask`'s design-system layer but deterministic; brand palette wins). **`--ref`/`--mask` reference-guided generation** built via the OpenAI `/v1/images/edits` multipart endpoint (`gen.cjs callOpenAiEdit`; `ref`/`mask` moved `supports_stretch` → `supports`). 87 image tests pass; deepask untouched. The §-body below is the Phase-5 design record; authoritative current surface = `.claude/commands/image.md` + `06-ai-ops/skills/image/**` + `scripts/image/**` + `knowledge/image-adapters.yaml`.
>
> **v0.1.1 (2026-06-02, `/cla fix`-class):** the quality flag was renamed **`--tier` → `--quality`** and its values **`draft|standard|high` → `low|medium|high`** (1:1 with OpenAI's native `quality` param; default `medium`; behaviour-preserving — old `standard` = new `medium`). The `tierToQuality` translation layer is gone (`--quality` IS the native value); `params.cjs` exports `QUALITIES` + `QUALITY_TO_LONG_EDGE` + `normalizeQuality`. **This spec body below is the Phase-5 design record and still uses the original `--tier` naming** — the authoritative current surface is `.claude/commands/image.md` + `06-ai-ops/skills/image/**` + `knowledge/image-adapters.yaml`.

---

## 1. Problem statement (carried from Phase 1)

ritsu-works has no general-purpose image-generation primitive — image gen lives only inside deepask. Build `/image <prompt> [flags]`: a **model-agnostic front door** with a **pluggable adapter layer** (`--use=<adapter>`) so new image models plug in without command-side code change, plus a **universal, sensibly-defaulted parameter vocabulary** that each adapter maps to native params (warning, never silently dropping, on unsupported params). v0.1 builds the `gpt-image-2` adapter for real; `nano-banana`/`midjourney`/`flux` are registered-not-built stubs.

## 2. Selected approach (Phase 4 → A+)

Lean v0.1 = exactly the brief's scope, **no Tier-2 table**, but `scripts/image/gen.cjs` emits a **structured `run.json`** carrying every column a future `ops.image_runs` would need — so adding observability later is pure wire-up via `/cla extend`, zero rework. Spend guard = per-run `--max-cost-usd` breaker; `ai-ops-image` cost-bucket captures in-session orchestration tokens.

## 2a. Architecture refinements discovered in Phase 5 (improve on the brief — @cto to ratify)

The brief's reuse map is ~95% accurate; verifying the actual helper code surfaced three corrections that make the design **more correct**, not less reusable:

- **R1 — `resolveImageSpec` is NOT reusable.** `scripts/deepask/image-spec.cjs` `resolveImageSpec({format, orientation})` is hard-coupled to deepask's `{infographics, img-slide}` formats with hardcoded sizes. **Reusable from that module = `parseSize` + `centeredCropBox` only** (pure geometry). `gen.cjs` writes its own `resolveAspectRatio(ar, tier)`.
- **R2 — gpt-image-2 is FLEXIBLE-sized, not a fixed enum.** Per the OpenAI image-gen guide (cited in image-spec.cjs): any size with **edges multiple of 16, AR ≤ 3:1, max edge < 3840px**. ⇒ `--ar` resolves to a **native** size (compute W:H at the tier's pixel budget → round edges to ×16 → clamp AR ≤ 3:1 + edge < 3840, **warn on clamp**) and is passed directly — **no post-crop for in-range ratios.** This supersedes brief §7's "fixed-enum snap + crop" and **closes open-question A6** (there is no enum to freeze; there is a constraint set). `centeredCropBox` is retained only as the fallback for extreme ratios / future fixed-size backends.
- **R3 — cost is pixel-area-linear.** COST_TABLE rates are ~**$0.0105/Mpx (low)** · **$0.040/Mpx (medium)** · **$0.159–0.169/Mpx (high)** (@cto-verified; the 2048×1152 "high" row is deliberately rounded UP ~6%). ⇒ for an arbitrary `--ar` size, estimate by **per-tier interpolation between the two nearest COST_TABLE keys** (NOT one global high rate); reuse `checkCostBudget` (generic breaker) + `COST_TABLE` as the anchor. Keep `isEstimate:true` + "verify at platform.openai.com/pricing" discipline.

> Net: the load-bearing `--ar` translation is **simpler and higher-quality** than the brief assumed, because gpt-image-2 accepts native flexible sizes. The novelty/risk of the whole capability is confined to `resolveAspectRatio` + the `supports()`/warn layer.

## 3. Per-Bài-toán impact analysis

| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth (4-tier) | Tier-1 new registry + skills + command + SOP; Tier-3 artifacts to `.archives/` (local) | `knowledge/image-adapters.yaml` (+schema) |
| #2 HITL | Generation = **Tier A** (reversible, local writes, metered+capped); explicit-invoke only | none (within existing tiers) |
| #4 Memory | none (no episodic state) | none |
| #5 Multi-Agent | `/image` is a single in-session command + one out-of-band script; no subagents | none |
| #7 Cost | **NEW cost-bucket `ai-ops-image`**; per-run `--max-cost-usd` breaker; in-session token attribution | `governance/ROLES.md` gps `per_task_kind_caps`: `image-gen {unit:usd,cap:0.50}`, `image-enhance {unit:usd,cap:0.10}`; registry cost-bucket (done Phase 0) |
| #8 Schedule | none (no cron) | none |
| #9 SOP | **NEW** runtime-contract SOP | `06-ai-ops/sops/SOP-AIOPS-008-image-runtime-contract/` (mirror SOP-AIOPS-005/007) |
| #10 Visibility | **A+ defers KPIs** (no Tier-2 table v0.1); run.json is table-ready | none v0.1 (KPIs land with future `/cla extend`) |
| #11 Events | optional `ritsu.image.generated` event (deferred; not required v0.1) | none v0.1 |
| #12 MCP | none — no new MCP server; OPENAI via out-of-band Node script | none |
| #13 State machine | none (stateless command) | none |
| #14 Knowledge graph | adapters/command registered in resolver catalog | `knowledge/recipients/{skills,commands}.md` + INDEX regen |
| #15 Decision | **This spec is a Tier C decision** (Muse panel + @cto attached, §9/§10) | `ops.decisions` row |
| #16 Customer data | none (internal tool) | none |
| #17 Multi-surface | `/image` is a Claude Code command surface | none |
| #18 Ingestion | none | none |
| #19 Founder capacity | build ≈ 1–2 sprints; ongoing ≈ 0 (build-once primitive) | — |
| #20 CLA | produced by CLA; promotes to `wiki/capabilities/image-platform/` at Phase 8 | — |

## 4. Component changes

### 4.1 New skills
| Skill | Path | Purpose |
|---|---|---|
| `image` (umbrella) | `06-ai-ops/skills/image/SKILL.md` | dispatcher only: parse universal flags → resolve `--use` against `image-adapters.yaml` → invoke adapter; routing table; consumes adapter `{ok,files[],model,cost_usd,warnings[]}`; reuses image-compose/aesthetic for prompt assembly + the two style axes. |
| `image/adapters/gpt-image-2` | `06-ai-ops/skills/image/adapters/gpt-image-2/SKILL.md` | the one real adapter: `Supports`, `Param mapping` (universal→native incl. `--ar`→flexible size + `--tier`→quality+pixel-budget), `Generate` (→ `scripts/image/gen.cjs`), `Output contract`, `Auth/billing`, `Failure modes`. |
| `image/enhance` | `06-ai-ops/skills/image/enhance/SKILL.md` | optional **in-session** (subscription) prompt-refinement stage; the "pro-max" concept. NOT routed through any external API. |

### 4.2 New SOPs
| SOP | Path | Trigger |
|---|---|---|
| SOP-AIOPS-008-image-runtime-contract | `06-ai-ops/sops/SOP-AIOPS-008-image-runtime-contract/{flow.yaml,README.md}` | invoked-by-`/image`; defines the runtime contract (param resolution order, supports()/warn, cost breaker, artifact layout, billing lanes, output contract). Mirror SOP-AIOPS-005 (deepask) / 007 (design-system). |

### 4.3 Tier 1 yaml changes
See `draft/tier1-diffs.yaml`. Summary:
- **NEW** `knowledge/image-adapters.yaml` + `knowledge/schemas/image-adapters.schema.json` (split-registry, mirror design-systems).
- `governance/ROLES.md` — gps `economic_budget.per_task_kind_caps`: `image-gen {unit:usd,cap:0.50}`, `image-enhance {unit:usd,cap:0.10}`.
- `knowledge/capability-registry.yaml` — entry + `ai-ops-image` cost-bucket (**done in Phase 0**).
- `knowledge/recipients/{skills,commands}.md` + `INDEX.md` — resolver registration (catalog-generator regen).
- `knowledge/manifest.yaml` — version bump + migration_note (no Tier-2 migration; declares the new registry + validator + `.archives/image/` artifact path).

### 4.4 Database migrations
**NONE** (Option A+). The `run.json` schema is the table-ready forward-compat contract; a future `/cla extend` adds `ops.image_runs`.

### 4.5 New scripts
| Script | Path | Purpose |
|---|---|---|
| `gen.cjs` | `scripts/image/gen.cjs` | thin orchestrator — `require()`s `scripts/deepask/{image-gen(ensureOpenAiKey,extractImageBuffer,OPENAI_IMAGES_URL),image-cost(checkCostBudget,COST_TABLE),image-spec(parseSize,centeredCropBox),slide-deck(assembleDeckPdf)}`; builds a **richer** OpenAI payload (`output_format`,`background`,`moderation` where supported); owns `resolveAspectRatio` (R2) + area-cost (R3); writes PNG(s) + `run.json` + prompt sidecar; emits the `{ok,files[],model,cost_usd,warnings[]}` contract. |
| `lib/params.cjs` | `scripts/image/lib/params.cjs` | universal param parser + `supports()`/warn engine (shared; pure + unit-tested). |
| `validate-image-adapters.cjs` | `scripts/cross-tier/validate-image-adapters.cjs` | **L2 critical** validator (mirror validate-design-systems): schema-validates the registry; checks `installed` adapters have an existing generator path + the gpt-image-2 generator exists; `registered-not-built` need no file; status enum; supports[] keys ⊆ universal param set. |

### 4.6 Frontend pages
None.

### 4.7 New commands / agents
| Trigger | Type | File |
|---|---|---|
| `/image` | slash command | `.claude/commands/image.md` (thin orchestrator: parse flags → umbrella skill → adapter → write artifacts → report cost + warnings) |

## 4b. Registry shape (`knowledge/image-adapters.yaml`)

```yaml
version: "1.0.0"
schema: knowledge/schemas/image-adapters.schema.json
adapters:
  - id: gpt-image-2
    status: installed                 # installed | registered-not-built
    generator: scripts/image/gen.cjs
    skill: 06-ai-ops/skills/image/adapters/gpt-image-2
    default_model: gpt-image-2
    supports: [ar, tier, count, format, style, art-style, enhance, background, safety, max-cost-usd, dry-run, out, deck]
    supports_stretch: [ref, mask]     # MF2: need /v1/images/edits multipart endpoint (2nd code path); Phase-7 stretch. Until built → WARN-as-unsupported.
    unsupported_warn: [seed, ref-style, ref-character, ref-strength, negative, stylize, raw, variety, weird, tile, resolution]
    auth: { env: OPENAI_API_KEY, billing: out-of-band }
    cost_table_ref: scripts/deepask/image-cost.cjs#COST_TABLE
    notes: "Default backend. Flexible sizing (×16 edges, AR≤3:1, edge<3840). webp/jpeg/png. No seed. --ref/--mask via edits endpoint = Phase-7 stretch (MF2)."
  - id: gpt-image-2-pro-max
    status: installed                 # PRESET alias, not a distinct backend
    preset_of: gpt-image-2
    preset_flags: { enhance: true, tier: high }
    generator: scripts/image/gen.cjs
    default_model: gpt-image-2
    supports: [ar, tier, count, format, style, art-style, enhance, background, safety, max-cost-usd, dry-run, out, deck]   # inherits gpt-image-2's capability map
    auth: { env: OPENAI_API_KEY, billing: out-of-band }
    notes: "Preset = gpt-image-2 --enhance --tier=high. Inherits gpt-image-2 supports/stretch. The GitHub gpt-image-2-pro-max skill is a prompt tool, not a generator."
  - id: nano-banana
    status: registered-not-built
    default_model: gemini-3-pro-image
    supports: [ar, tier, resolution, ref, ref-character, format]
    auth: { env: GOOGLE_API_KEY, billing: out-of-band }
    notes: "Gemini 3 Pro Image / Nano Banana Pro. True 4K + strongest character refs. NOT built v0.1."
  - id: midjourney
    status: registered-not-built
    supports: [ar, seed, ref-style, ref-character, ref-strength, negative, stylize, raw, variety, weird, tile]
    auth: { env: null, billing: third-party-bridge }
    notes: "No official API → needs 3rd-party bridge. NOT built v0.1."
  - id: flux
    status: registered-not-built
    default_model: flux-1.1-pro-ultra
    supports: [ar, tier, seed, format, ref, raw]
    auth: { env: BFL_API_KEY, billing: out-of-band }
    notes: "BFL/fal/Replicate. NOT built v0.1."
```

> `supports()` lives in the **YAML registry** (OQ4 = registry, not SKILL.md frontmatter) so the L2 validator can machine-check it; the adapter SKILL.md documents it in prose. Schema enforces: `supports[]` ∪ `supports_stretch[]` ∪ `unsupported_warn[]` ⊆ the universal param set (kept in sync with `lib/params.cjs` UNIVERSAL_PARAMS); `installed` ⇒ `generator` path exists on disk (the disk-check fires ONLY for `installed`, never `registered-not-built`/`preset_of` — model `MATERIALIZED_STATUSES` like `validate-design-systems.cjs`); `preset_of` ⇒ target id exists. Also register the YAML in `validate-tier1.cjs` (L1 schema) **and** the L2 validator — two registrations.

## 4c. `run.json` (the A+ table-ready contract)

```json
{ "ts": "<iso8601>", "command": "/image", "adapter": "gpt-image-2", "model": "gpt-image-2",
  "outcome": "success",                 // success | moderation_block | breaker_refusal | api_error | dry_run  (MF3/Muse)
  "prompt_input": "<raw user prompt>",
  "prompt_enhanced": "<after --enhance, or null>",   // enhance before/after legibility (Muse pragmatist)
  "prompt_sent": "<EXACT string sent to the API>",   // the one that actually spent money
  "ar": "16:9", "tier": "high", "size": "2048x1152", "size_clamped": false,
  "count": 1, "format": "png", "style": "ritsu", "art_style": "swiss-international",
  "enhance": false, "dry_run": false, "cost_usd": 0.40, "is_estimate": true,
  "breaker_tripped": false, "max_cost_usd": 1.00,
  "warnings": ["--seed ignored — gpt-image-2 output is NOT reproducible"],
  "error": null,                        // populated on moderation_block / api_error
  "files": [".archives/image/2026-06-02-foo/01.png"] }
```
`outcome` is the typed disposition (success / moderation_block / breaker_refusal / api_error / dry_run) so week-1 failures are legible and an OpenAI content-policy refusal is distinguishable from a breaker refusal (Muse pragmatist). Columns are a 1:1 superset of a future `ops.image_runs` row → later extension is INSERT-wiring only.

## 5. Cost-bucket impact (Bài #7)

- **New cost-bucket:** `ai-ops-image` (under role `gps`). Registry entry done Phase 0.
- **Per-task-kind caps (ROLES.md):** `image-gen {unit:usd, cap:0.50}` (out-of-band OpenAI), `image-enhance {unit:usd, cap:0.10}` (in-session refine).
- **⚠️ MF1 — `image-gen` cap is ADVISORY in v0.1, NOT hook-enforced.** Out-of-band OpenAI spend is invisible to the `pre-llm-call-budget` hook (which sees only in-session Claude calls). So:
  - **Real point-of-action enforcement = the per-run `--max-cost-usd` breaker** (`checkCostBudget`, refuse-up-front before the API call). This IS enforced.
  - The `image-gen` ROLES cap is **documentary/advisory** (a stated intent), not auto-enforced, in v0.1. Operators must not read it as "the hook will stop a runaway `--count` loop" — it won't; the breaker is per-run.
  - `image-enhance` (in-session) IS hook-enforced (it's a Claude call).
  - **Cross-run + hook-level image enforcement + a reconcile-vs-OpenAI-usage job arrive with the future `ops.image_runs` extend.**
- Alert 80% / escalate 100% / hard-block 150% per ROLES.md defaults (apply to the in-session `image-enhance` lane).
- v0.1 image $ is captured in `run.json` (local, full audit row) + the per-run breaker; queryable monthly image spend arrives with the future `ops.image_runs` extension (run.json is its forward-compat superset).

## 6. Acceptance criteria

### Phase 7 (Implementation) — the 8 brief criteria
1. no-flag `/image` → 1 PNG (gpt-image-2, `--ar 1:1 --tier standard`) + run.json with cost_usd.
2. `--ar 16:9 --tier high --style ritsu --art-style swiss-international` → branded+genre 16:9 high.
3. `--use=gpt-image-2-pro-max` → enhanced prompt + high tier (preset).
4. `--dry-run` → composed prompt sidecar + cost estimate, no API spend.
5. `--use=midjourney` → clean `not_built` error citing `image-adapters.yaml`.
6. unsupported param (e.g. `--seed`) → image generated + warning (never silent drop).
7. `--max-cost-usd` trip → abort before API call.
8. `validate-image-adapters.cjs` green in `pnpm check` **AND** GitHub CI; deepask image branch unchanged (regression-free).
- [ ] `pnpm check` clean per PR; husky pre-commit green.
- [ ] All-Edge-Cases-Test on `gen.cjs` + `lib/params.cjs` + validator (pure helpers unit-tested; the fetch is the impure edge, mocked).

### Phase 8 (Catalog)
- [ ] registry → `operating`; spec.md + retrospective.md promoted to `wiki/capabilities/image-platform/`; CATALOG.md updated; final `pnpm check` clean.

### Operating
- [ ] First real `/image` run produces a usable branded asset; cost within estimate; no deepask regression.

## 7. HITL points
| Phase | Tier | Action |
|---|---|---|
| 4 Options | B | Founder picked A+ ✅ |
| 5 Architecture | C | **Founder approves this spec** (gate below) |
| 7 per PR | B | Founder reviews + merges each sprint PR |

## 8. Rollback plan
1. **Code:** `git revert` the sprint merge commits.
2. **Migrations:** none (A+).
3. **Tier-1 yaml:** revert via PR (registry/ROLES/manifest/recipients).
4. **State:** `ops.capability_runs` → mark superseded/deprecated (append row; MCP is INSERT-only).
- **Reversibility rating: 5/5** — pure additive, no migration, no external surface, no product-data path. deepask untouched (decision #2) so no blast radius on an operating capability.

## 9. CTO sanity-check (Phase 5)

**Verdict: APPROVE-WITH-NITS** (Tier A review, ~$0.14). Architecture sound; R1/R2/R3 confirmed against code.

- **R1/R2/R3 confirmed** (`image-spec.cjs:9-16,24,96-128`; `image-cost.cjs:28-36`). R3 number correction: medium anchor ≈ **$0.040/Mpx**, high ≈ **$0.159–0.169/Mpx** (the 16:9 row is rounded UP ~6%) — **interpolate per-tier from the two nearest COST_TABLE keys**, do not assume one global high rate.
- **require() is clean** — deepask helpers guard execution behind `if (require.main === module)`; one hop, no circular risk; `REPO_ROOT=__dirname/../..` stays correct regardless of caller. No re-export shim (it'd be a drift surface).
- **ROLES.md (must-fix for green CI):** add an `EXPECTATIONS` row to `scripts/cross-tier/validate-roles-task-kind-caps-units.cjs`: `{ match: /^image-(gen|enhance)$/, unit: 'usd', source: 'image-platform spec §5' }`. Without it the caps still pass (unrecognized-but-well-formed tagged entries are silently accepted), but the row is the convention + gives unit-mismatch protection.
- **CI validator (must-fix):** add an `l2-image-adapters` job to `.github/workflows/cross-tier-consistency.yml` mirroring `l2-art-styles:100-113` (needs `l1-tier1-yaml-schemas`; **no** `continue-on-error`; `pnpm install --frozen-lockfile` then `node scripts/cross-tier/validate-image-adapters.cjs`). Register in `check-consistency.cjs` too (two-edit rule).
- **schema double-registration:** `knowledge/image-adapters.yaml` must be wired into `scripts/validate-tier1.cjs` (L1 schema map) **AND** the dedicated L2 validator — two registrations, not one.
- **disk-existence check** in the L2 validator must fire ONLY for `installed` adapters (model `MATERIALIZED_STATUSES` like `validate-design-systems.cjs:88-98`) — `registered-not-built` + `preset_of` must NOT trigger a file check, or CI fails on the stubs.
- **A+ cost-logging:** acceptable, don't block — breaker is the hard guard at point-of-action, run.json preserves the audit row for backfill, deepask set the out-of-band precedent.
- **SOP-AIOPS-008 number confirmed free** (007-design-system is current max).

### CTO MUST-FIX items (folded into the spec below — gate on these for Phase-7)
- **MF1 — the `image-gen` per_task_kind cap is ADVISORY, not hook-enforced** (out-of-band → budget hook is blind). Real enforcement = the per-run `--max-cost-usd` breaker. Hook/cross-run enforcement arrives with the future `ops.image_runs` extend. → §5 now states this plainly.
- **MF2 — `--ref`/`--mask` need the `/v1/images/edits` multipart endpoint**, a different code path than `gen.cjs`'s JSON `/generations`. → moved to a v0.1 **stretch** (else `unsupported_warn` for gpt-image-2); §4b/§4c + Phase-6 sprint scoping reflect it. Don't over-promise in `supports[]`.

## 10. Muse panel synthesis (Phase 5) — 3-lens adversarial

- **Rams (minimalism):** the adapter layer is "speculative generality" — 1 real backend + 3 stubs + `supports()` + `--use=` is an extension point with nothing yet to extend; ~⅓ of the ~25 flags exist only to be WARNED on the one real backend. Honest-minimal v0.1 = gpt-image-2 only.
- **Ops pragmatist:** (a) `supports()/WARN` papercut — `--seed` warns but still returns a non-reproducible image ("succeeded but did something else"); (b) in-session `--enhance` ↔ out-of-band `gen` handoff is fragile (pay for enhance, get nothing if the breaker then refuses); (c) OpenAI **moderation refusals** unhandled (400-block vs breaker-refusal vs success ambiguity). → run.json must capture exact final prompt + enhance before/after + a typed outcome.
- **Security/governance:** the per-run breaker **can't see a loop** — N scripted `/image --count 4` calls each pass $1.00 but spend $N×; the per-task caps are unenforced without a ledger to sum against. "run.json is a superset of the table" is the tell that INSERTing now is near-zero cost.
- **Consensus: SHIP-WITH-ADJUSTMENTS** — (1) add the ledger now; (2) drop stubs + `--use=` + cross-model flags from v0.1; (3) richer typed run.json.

### Founder-facing dispositions (how each adjustment is resolved — see §10b gate)
| Adjustment | Disposition | Rationale |
|---|---|---|
| Muse-3 / Pragmatist: richer typed run.json (exact prompt, enhance diff, typed outcome incl. `moderation_block`) | **ACCEPTED — folded into §4c** | Cheap; makes week-1 failures legible; handles moderation refusals explicitly. |
| CTO MF1 (advisory-cap honesty) + MF2 (`--ref` endpoint scoping) | **ACCEPTED — folded into §5/§4b** | Correctness + honest governance; no scope change. |
| All-Edge-Cases tests for `params.cjs` + `resolveAspectRatio` + validator | **ACCEPTED — Phase-6 sprint scope** | New risk surface; commit-before-vitest per repo memory. |
| Muse-1 (add `ops.image_runs` table NOW = Option B) | **SURFACED at gate §10b — recommend HOLD on A+** | Founder already weighed this at Phase 4 (chose A+ with full info). run.json is backfill-ready; breaker is the real point-of-action guard; the loop-aggregate guard is the explicit job of the future extend. But two reviewers converged here → founder reaffirms or flips. |
| Muse-2 (drop the adapter layer + cross-model vocab) | **SURFACED at gate §10b — recommend DECLINE** | Contradicts locked decision #3 + the founder's explicit "build-once, model-agnostic, foundational primitive" thesis. The abstraction is a *cheap* copy of two operating patterns (docs-engine/design-systems), so speculative-generality cost is low. The cross-model flags are honestly **forward-vocabulary** (warn-only on gpt-image-2 in v0.1), now framed as such. |

## 10a. supports()/WARN papercut — resolution
The pragmatist's "warns but still produces a different image" is real. Resolution (no scope change): the umbrella classifies unsupported params into **two severities** — (i) **cosmetic/no-op** (e.g. `--stylize` on gpt-image-2) → WARN + proceed; (ii) **semantics-changing** (e.g. `--seed` implies reproducibility the backend can't honor) → WARN that names the consequence explicitly ("`--seed` ignored — gpt-image-2 output is NOT reproducible"). Both are recorded in `run.json.warnings[]`. The command still succeeds (never a hard fail on an unsupported convenience flag), but the warning is consequence-honest.

## 10b. Founder gate — two surfaced tensions (Tier C)
Both reviewers approved the core build. Two adjustments touch **founder-locked decisions**, so they are surfaced, not auto-applied:
1. **Observability** — reaffirm A+ (lean, ledger-deferred, with the MF1 honesty + richer run.json) **[recommended]**, or upgrade to B (`ops.image_runs` now)?
2. **Adapter scope** — keep the pluggable adapter layer + 3 stubs + forward-vocabulary **[recommended, per locked decision #3]**, or ship gpt-image-2-only minimal (Rams)?

## 11. Tier C decision record
- **`ops.decisions.id = d7e92ec2-bcfb-4b7f-a140-bfb14a12dacf`** (slug `image-platform-architecture-a-plus`, state `decided`).
- **Approved by:** founder · **at:** 2026-06-02 · **method:** Claude Code inline (Tier C per governance/HITL.md).
- **Gate answers:** §10b-Q1 observability → **A+ reaffirmed** (B declined). §10b-Q2 adapter scope → **keep adapter layer** (Rams-minimize declined). Both locked decisions reaffirmed.
- All CTO must-fixes (MF1/MF2 + validator/EXPECTATIONS/schema wirings) + Muse pragmatist run.json improvements folded into this spec PRIOR to approval.

## 12. Next phase
Phase 6: Sprint Planning (`sprint-planner`).
