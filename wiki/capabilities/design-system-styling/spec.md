# Capability Spec: Multi design-system + universal `--style` output layer

**Phase:** 5 (canonical capability spec)
**ID:** design-system-styling
**Selected option (from Phase 4):** Option A — "deepask-twin" (thin command + 1 skill family + helper-heavy, no v1 migration)
**HITL tier:** C
**Decision row:** `ops.decisions.id = bf3a6323-21b9-4f76-b3fb-2d7012efcdac` (slug: `design-system-styling-architecture-option-a`, state: decided)
**ops.capability_runs id:** `fbd8edb1-9436-42c0-9e60-8c3b72c46914`
**Generated:** 2026-06-01
**gbrain_concept_slug:** _(none — Brain decision = NONE, see §5.8)_

---

## 1. Problem statement (carried from Phase 1)

Give every output-producing ritsu-works command a universal `--style=<name>` flag that renders its artifact in a named, version-controlled `DESIGN.md` design system (default omitted = plain). v1 = a SPLIT registry + a `/design-system` command + a unit-tested `resolve-style.cjs` helper + a documented adoption contract + **deepask wired as first consumer** + the **`ritsu`** brand system installed in Tier-1. **`--style` is orthogonal to `--format`** (artifact-type) and composes by injecting the resolved DESIGN.md as design context into whichever renderer `--format` dispatches to.

## 2. Selected approach (carried from Phase 4)

**Mirror the proven deepask shape:** a thin `/design-system` command + ONE `06-ai-ops/skills/design-system/` family + the brains in deterministic, unit-tested `scripts/design-system/*.cjs` helpers (mirroring `scripts/deepask/*.cjs`). Full locked v1 scope; **no migration in v1** — the 3 KPIs are derived deterministically / reuse `ops.deepask_runs` (a dedicated table can be added later via `/cla extend` if usage justifies first-class observability). Carries @cto's two Phase-2 adjustments (below) + the founder's Q1/Q2/Q3 answers.

### Locked decisions (founder 2026-06-01) — see `problem.md`
DESIGN.md format (adopt `google-labs-code/design.md`) · SPLIT registry · CLI-first/no-key/no-MCP download · full universal-layer v1 · `--style`⟂`--format` seam · `ritsu` seed. **Q1:** pre-seed `ritsu` + top-10 from each source (~21). **Q2:** skip resolver external-source entry. **Q3:** defer logo SVG.

### Architecture decisions finalized in this phase
- **AD-1 (graduation method = G1, sidesteps @cto's must-fix):** `00-core/design-system.md` **survives as the canonical index/overview doc** (status `stub`→`canonical`); a sibling `00-core/design-system/` folder holds the owned systems (`ritsu/DESIGN.md` + `assets/` + previews). `scripts/core/validate.cjs` checks a **hardcoded `EXPECTED_DOCS` list (no glob, no recursion)** — so a sibling folder + a surviving (re-statused) `design-system.md` needs **ZERO validator-code change**, only the doc's frontmatter rewrite + the manifest `sub_files` status flip. (The G2 alternative — delete the `.md`, fold into a folder — would require the `validate.cjs:38/:73` edits @cto flagged; G1 avoids that risk.)
- **AD-2 (designmd-key, @cto-adopted):** register all ~21 systems in `knowledge/design-systems.yaml` as **metadata-first** (registration ≠ download). getdesign top-10 → `origin: downloaded` (key-free `npx getdesign add`, materialized on-demand). designmd top-10 → `origin: built-from-repo`, hydrated via the `build --from=<public repo>` verb — **never needs `DESIGNMD_API_KEY`**. The key stays an optional operator-only shell var for a manual `vendor` promote; it appears in NO MCP/registry env. Honors locked decision #3 verbatim.
- **AD-3 (CI/offline determinism):** `resolve-style.cjs` in **non-interactive mode reads ONLY Tier-1 `00-core/design-system/` (+ vendored)**; a cache-miss on an `origin: downloaded` system **hard-fails (never silently shells `npx`)**. `npx`-on-demand fetch happens only in interactive sessions. The `vendor` verb promotes a cached system into Tier-1 for CI reproducibility.
- **AD-4 (no new renderers):** `--style` resolves to *design context* (normalized tokens + previewPath) injected INTO the renderer that `--format` already dispatches to. The deepask `format/SKILL.md` 13-row dispatch table is **not modified** (a test asserts row-count unchanged). `--style` is an honest no-op for non-visual formats (inline/text/article/xlsx-data).

## 3. Per-Bài-toán impact analysis

| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth (4-tier) | yes | Tier-1: NEW `knowledge/design-systems.yaml` index + schema; `00-core/design-system/` owned systems; `runtime/design-systems/` = T4-like rebuildable cache (gitignored, already covered by `runtime/*`). |
| #2 HITL | yes | New tiers per verb: read/list/search/show = A; add/build/preview (write runtime cache) = A→B; `vendor` (cache→Tier-1 PR) + `remove` owned = C; `remove` cached = B. No D-tier. |
| #4 Memory | none | no embeddings/summary tables. |
| #5 Multi-Agent | yes | 2 NEW skills (umbrella `design-system` + `design-system/build`); thin `/design-system` command. No new agent/subagent. |
| #7 Cost | yes | NEW cost-bucket `ai-ops-design-system`; `per_task_kind_caps` in `governance/ROLES.md` (owning role = `gps`). |
| #8 Schedule | none (v1) | no cron. (Optional future: a weekly `design-systems.yaml` freshness/`last_synced` sweep — deferred.) |
| #9 SOP | yes | NEW `SOP-AIOPS-007-design-system-runtime-contract` (the "how a command adopts `--style`" contract + tier table). |
| #10 Visibility | yes | 3 NEW KPIs (derive/reuse, no table): `design_system.library_size`, `design_system.styled_artifact_rate`, `design_system.style_resolve_failure_rate`. |
| #11 Events | yes | `ritsu.design_system.style_resolved`, `ritsu.design_system.added`, `ritsu.design_system.vendored` (emitted to `ops.events`). |
| #12 MCP | **none (deliberate)** | NO MCP server, NO API key (locked decision #3). Download = CLI-on-demand via `Bash(npx …)`. |
| #13 State machine | none | design-system has a trivial lifecycle (`registered → cached → vendored`); captured as a `status` enum in the yaml, not a state-machine yaml. |
| #14 Knowledge graph | none | design systems are not wiki entities. |
| #15 Decision | yes | this spec is a Tier C `ops.decisions` row (Muse panel attached). |
| #16 Customer data | none | no `public.*` change. |
| #17 Multi-surface | yes (positive) | the `--style` adoption contract is surface-agnostic; `/docs`, playbook-builder inherit it near-free post-v1. |
| #18 Ingestion | none | the `add`/`build` download is NOT the wiki ingestion pipeline. |
| #19 Founder capacity | yes | ~6–10h total across sprints (PR review + this Tier-C approval + 2–3 taste calls); <4h/wk during build; ~0 ongoing. |
| #20 CLA | yes | this capability is itself CLA-produced (run `fbd8edb1`). |
| #20.1 Brain integration | **NONE** | see §5.8. |

## 4. Component changes

### 4.1 New skills (2 — INDEX-cap-conscious; @cto "one command + one skill family")
| Skill | Path | Purpose |
|---|---|---|
| `design-system` (umbrella) | `06-ai-ops/skills/design-system/SKILL.md` | Registry model, resolution order, the `--style` adoption contract, verb dispatch. The doc deepask + future consumers read. |
| `design-system/build` | `06-ai-ops/skills/design-system/build/SKILL.md` | The `build --from=<repo>` generator — read a codebase's theme tokens → emit a valid `DESIGN.md` (HSL→hex). The `ritsu` path + designmd build-from-repo hydration. |

> Verbs `list/show/search/add/preview/lint/vendor/remove` are deterministic → live in the command + helpers, NOT separate registered skills (respects the ~15K INDEX cap).

### 4.2 New SOPs
| SOP | Path | Trigger |
|---|---|---|
| `SOP-AIOPS-007-design-system-runtime-contract` | `06-ai-ops/sops/SOP-AIOPS-007-design-system-runtime-contract/flow.yaml` | reference contract (mirrors `SOP-AIOPS-005-deepask-runtime-contract`); documents `--style` adoption + per-verb HITL tiers. |

### 4.3 Tier 1 yaml changes
See `draft/tier1-diffs.yaml`. Summary: NEW `knowledge/design-systems.yaml` + `knowledge/schemas/design-systems.schema.json`; `00-core/design-system.md` stub→canonical; `knowledge/manifest.yaml` (sub_files status + new registry pointer + runtime subpath); `knowledge/kpi-registry.yaml` + `knowledge/kpi-ownership.yaml` (3 KPIs); `governance/ROLES.md` (cost-bucket + caps); `knowledge/capability-registry.yaml` cost_buckets (new bucket). *(capability-registry capability entry + recipients catalog = DONE in Phase 0; finalized at Phase 8.)*

### 4.4 Database migrations
**NONE in v1** (Option A). `draft/migrations/` is intentionally empty. KPI substrate = derive/reuse `ops.deepask_runs` (jsonb `metadata.style`) + deterministic file scan. A dedicated `ops.design_system_runs` table is a documented **future `/cla extend`** if first-class observability is later justified.

### 4.5 New integrations / MCP servers
**NONE.** External tooling reached via `Bash(npx getdesign@latest add <name>)` (key-free) + `build --from=<repo>` (git read). No persistent MCP, no API key (locked #3).

### 4.6 Frontend pages
None.

### 4.7 New commands / agents
| Trigger | Type | File |
|---|---|---|
| `/design-system` | slash command | `.claude/commands/design-system.md` (verbs: list, show, search, add, build --from, preview, lint, vendor, remove) |
| (deepask wiring) | extend | `.claude/commands/deepask.md` (parse `--style`) + `06-ai-ops/skills/deepask/format/SKILL.md` (inject resolved tokens; no new dispatch rows) |

### 4.8 New helpers (the brains — mirror `scripts/deepask/*.cjs`)
| Helper | Path | Contract |
|---|---|---|
| resolve-style | `scripts/design-system/resolve-style.cjs` | `(name\|undefined, {interactive}) → {mode:'plain'\|'styled'\|'needs-download', name, designMdPath, tokens, previewPath, origin}`; `undefined`→`{mode:'plain'}` zero-cost early return; cache-miss on `origin:downloaded` in non-interactive → throws `StyleResolveError` (AD-3). |
| parse-design-md | `scripts/design-system/parse-design-md.cjs` | parse YAML tokens + Markdown body; resolve `{token.refs}` (detect cycles); validate sRGB hex; return normalized tokens. Pure. |
| registry-io | `scripts/design-system/registry-io.cjs` | read/write/validate `knowledge/design-systems.yaml` against its schema. |
| download | `scripts/design-system/download.cjs` | wrappers: `npx getdesign add` (→ runtime cache) + `build --from=<repo>` hydration; updates the index. Side-effecting (Tier A/B). |

## 5. Cost, KPIs, HITL, Brain

### 5.1 Cost-bucket impact (Bài #7)
- NEW cost-bucket `ai-ops-design-system` (registered in `knowledge/capability-registry.yaml` cost_buckets).
- Owning role `gps`; `per_task_kind_caps` in `governance/ROLES.md`: `design-system-build` `{unit: usd, cap: 0.50}` (repo→DESIGN.md LLM generation), `design-system-resolve` `{unit: usd, cap: 0.02}` (mostly deterministic), `design-system-add` `{unit: usd, cap: 0.05}`.
- Recurring ~$0/mo (build-once layer; `--style` resolve is deterministic/near-free).

### 5.2 NEW KPIs (Bài #10 — derive/reuse, NO migration)
| KPI | Source | Owner |
|---|---|---|
| `design_system.library_size` | count of entries in `knowledge/design-systems.yaml` (deterministic scan) | ai_ops / gps |
| `design_system.styled_artifact_rate` | % of deepask **file-mode** artifacts with non-plain `--style` — from `ops.deepask_runs.metadata.style` (jsonb; no schema change) | ai_ops / gps |
| `design_system.style_resolve_failure_rate` | `StyleResolveError` count / total resolves — from `ops.agent_runs.output_payload` | ai_ops / gps |

### 5.3 HITL points (per verb)
| Action | Tier | Why |
|---|---|---|
| list / show / search / lint | A | read-only |
| add / build / preview (write `runtime/design-systems/` cache) | A→B | reversible local cache write; B if it shells `npx` (notify-after) |
| `vendor` (cache → Tier-1 `00-core/design-system/` PR) | C | Tier-1 graduation = PR |
| `remove` cached | B | reversible (re-downloadable) |
| `remove` owned | C | refuses without a PR |

### 5.8 Brain integration — **NONE**
Step 2.5 decision: Q1 (READ) = no, Q2 (WRITE) = no, Q3 (COST) = no. **Rationale:** the capability resolves design-system *files* + injects tokens into renderers; the systems live in Tier-1/runtime files + a yaml index, not the brain. It produces *styled artifacts*, not knowledge pages future capabilities would search for. No role gains a `gbrain` grant; no per-task brain cost. (If a future "which design system did we use for X / why" memory need emerges, add a READ-only touchpoint via `/cla extend`.)

## 6. Acceptance criteria (per phase)

### Phase 7 (Implementation)
- [ ] `scripts/design-system/{resolve-style,parse-design-md,registry-io,download}.cjs` implemented + All-Edge-Cases unit tests pass (mirror `tests/` for `scripts/deepask/*`).
- [ ] `resolve-style.cjs`: `undefined→{mode:'plain'}`; non-interactive cache-miss on `origin:downloaded` → `StyleResolveError` (no silent npx). Tested.
- [ ] `knowledge/design-systems.yaml` + `knowledge/schemas/design-systems.schema.json` + `scripts/cross-tier/validate-design-systems.cjs` (L1) registered in `scripts/check-consistency.cjs`; `pnpm check` clean.
- [ ] `/design-system` command + `design-system` umbrella skill + `design-system/build` skill exist + invocable.
- [ ] `00-core/design-system.md` graduated stub→canonical (passes `validate.cjs`); `00-core/design-system/ritsu/DESIGN.md` + `assets/` installed; `build ritsu --from=/Users/doanchienthang/omg/ritsu` regenerates equivalent tokens.
- [ ] deepask `--style` wiring: `--format=html --style=ritsu` produces cyan-themed artifact; omitted → plain; non-visual format → no-op; **dispatch-table row-count unchanged** (asserted by test).
- [ ] Library pre-seeded ~21: `ritsu` (owned) + getdesign top-10 (`origin:downloaded`) + designmd top-10 (`origin:built-from-repo`). At least 1 designmd `build-from-repo` hydration verified without a key.
- [ ] docs-engine walker confirmed to NOT mis-render `00-core/design-system/**` (charter-adapter exclusion if needed — see Risk R3).
- [ ] `pnpm check` clean per PR (husky).

### Phase 8 (Catalog)
- [ ] `capability-registry.yaml` state→operating, version set; `wiki/capabilities/design-system-styling/spec.md` + `retrospective.md` promoted; `pnpm check` clean.

### Operating
- [ ] `design_system.library_size` ≥ 21; a styled deepask artifact produced + visually verified; `style_resolve_failure_rate` < 5%.

## 7. HITL points
| Phase | Tier | Action |
|---|---|---|
| 4 (Options) | B | Founder picked Option A ✓ (`ops.hitl_runs` ec41ce64) |
| 5 (Architecture) | C | Founder approves this spec (ceremony below) |
| 7 (per PR) | B | Founder reviews + merges each sprint PR |

## 8. Rollback plan
1. **Code rollback:** `git revert` the sprint merge commits.
2. **Migrations:** none (nothing to roll back).
3. **Tier-1 rollback:** revert the `00-core/design-system.md` graduation + `design-systems.yaml` + manifest edits via PR (additive; clean revert).
4. **Cache:** `runtime/design-systems/` is gitignored + rebuildable — delete freely.
5. **State:** mark `ops.capability_runs.state = 'deprecated'` (via `/cla deprecate`).

**Reversibility rating:** 4/5 (additive, no migration; the stub→canonical + owned-systems folder are the only semi-sticky Tier-1 moves, both clean git reverts).

## 9. CTO sanity-check (Phase 5) — **verdict: NITS** (proceed)
Verified against `scripts/core/validate.cjs:31-42,69` + `scripts/cross-tier/validate-core-pillar.cjs:21`.
- **AD-1/G1 CONFIRMED correct:** `EXPECTED_DOCS` is a flat hardcoded array iterated by exact filename join — no glob, no `readdirSync`, no recursion. A surviving `design-system.md` + an invisible sibling folder needs **ZERO validator-code change** (strictly safer than G2). 
- **NIT-1:** the new `00-core/design-system/ritsu/DESIGN.md` is never iterated by `validate.cjs` (escapes `CORE_SCHEMA`) — intentional (it's a design artifact, not a core doc); `validate-design-systems.cjs` owns its schema. ✅ confirmed in design.
- **NIT-2 (must verify Phase 7):** the **docs-engine charter-adapter** is "Adapter for `00-core/*.md`." If its walker globs `00-core/**/*.md` **recursively**, it will pick up `design-system/ritsu/DESIGN.md` and emit a stray MDX page (drift/secret-scrub surprise). → verify glob depth; if recursive, add `00-core/design-system/**` to the walker exclude (same pattern as `founder-profile.md walker_excluded: true`). Already in `tier1-diffs.yaml` verify_in_phase_7.
- **NIT-3:** reusing `ops.deepask_runs.metadata.style` couples design-system KPIs to deepask's run lifecycle — acceptable v1 (only because `--style` is deepask-scoped today); the day `--style` serves a non-deepask renderer, that jsonb has no row to land in → revisit the substrate then.
- **NIT-4 (Phase-7 pnpm-check gaps):** register `validate-design-systems.cjs` in `scripts/check-consistency.cjs` AND add the `design-systems.yaml`→manifest reverse-direction entry (manifest↔DB coherence validators fail if a new Tier-1 YAML isn't manifest-referenced). Both already in `tier1-diffs.yaml`.

## 10. Muse panel synthesis (Phase 5) — `high-stakes-decision-panel` — **Consensus: 2/5 (BELOW 3/5 threshold)**
- **🔴 cynic — REJECT:** "yak-shaving dressed as foundational infra"; pre-PMF, ~20 pre-seeded systems will rot; the honest version is a 30-line flag, not 4 helpers + split registry + 2 sources.
- **🟢 optimist — APPROVE-WITH-NITS:** compounding leverage on every future artifact at trivial cost; riding the Stitch/`design.md` standard (not inventing) is right; strip the vanity systems, ship `ritsu` + the layer.
- **⚖️ ethical-compass — APPROVE-WITH-NITS:** low ethical surface, BUT (a) **license-check** each third-party system before caching ("downloaded ≠ redistributable"); (b) ensure polished internal artifacts never bleed into unverified customer-facing claims. Both → into the SOP.
- **📊 data-pragmatist — REJECT:** the KPIs are **unfalsifiable as scoped** (N≈1 emitter, no denominator) → can't be evolved/killed on evidence. **Demand ONE binary observable revert-criterion before coding.**
- **⏳ time-honest — REJECT:** 6–8 calendar weeks of pre-PMF founder *attention* (the scarce resource) vs recruiting the next 10 paying users; the low-risk pattern makes it seductively over-buildable.

**Panel's convergent path:** don't build full Option A; build the **`ritsu`-only minimal slice** (layer + ritsu + deepask consumer), **defer the ~20 third-party pre-seed + second-source machinery to lazy/on-demand**, and **attach one binary revert-criterion**.

> **Orchestrator note (correction the panel lacked):** the build is **AI-workforce-executed**, not founder-hand-coded → the time-honest/cynic "6–8 founder-weeks" cost is materially overstated (founder time is review + taste calls, ~<4h/wk). And per **AD-2 the pre-seed is already metadata-first + lazy-materialized** (registration ≠ download; getdesign on-demand, designmd build-from-repo) — i.e. NOT 20 eager committed downloads. These two facts blunt the cynic + time-honest REJECTs; the **surviving, must-fix objections are the data-pragmatist's falsifiability gate + the ethical-compass license check** — both folded in below (§5.9).

## 5.9 Phase-5 review refinements (folded in — address the surviving objections)
- **R1 — Falsifiability/revert-criterion (data-pragmatist, NON-NEGOTIABLE):** add to Operating acceptance — **"≥ 6 distinct artifacts rendered with a non-default `--style` within 60 days of v1 ship; else `/cla deprecate` (or de-scope to ritsu-only)."** A binary, observable kill-criterion so the capability is falsifiable despite N≈1.
- **R2 — License gate (ethical-compass):** the `add`/`build`/pre-seed flow MUST record each third-party system's license in `knowledge/design-systems.yaml` (`license:` field) and SKIP/flag any whose license forbids caching/redistribution — even into the gitignored `runtime/` cache. Encoded in `SOP-AIOPS-007` + the schema.
- **R3 — Pre-seed is lazy by construction (cynic):** make explicit in the seed task that the ~20 third-party entries are **registered metadata-first** (`status: not_cached`); only `ritsu` is materialized at ship. Others materialize on first real `--style`/`show` use. No eager 20-download.
- **R4 — Customer-facing guard (ethical-compass):** `SOP-AIOPS-007` notes that a styled internal artifact never licenses unverified external claims (style ≠ substance).

## 5.10 Falsifiable kill-criterion (Operating)
`design_system.styled_artifact_rate`: ≥ **6 distinct non-default-`--style` artifacts in the first 60 days** → keep. Else → founder decides `/cla deprecate` or de-scope to ritsu-only. (This is the data-pragmatist's gate; it makes the capability evidence-killable.)

## 11. Tier C decision record
Stored in `ops.decisions WHERE id = bf3a6323-21b9-4f76-b3fb-2d7012efcdac` (slug `design-system-styling-architecture-option-a`, state `decided`).
- **Approved by:** founder
- **Approved at:** 2026-06-01 (Claude Code inline HITL Tier-C ceremony; `ops.hitl_runs` row recorded)
- **Method:** Claude Code inline AskUserQuestion (dissent surfaced: @cto NITS + Muse 2/5; founder chose "Approve Option A + refinements")
- **Decision:** Build full Option A (deepask-twin) + the §5.9 refinements (R1 falsifiability gate, R2 license gate, R3 lazy metadata-first pre-seed, R4 customer guard) + @cto's 4 nits. Reversibility 4/5.

## 12. Next phase
Phase 6 — Sprint Planning (`sprint-planner` skill). Indicative sprints: **S1** helpers + schema + validator + ritsu seed + stub graduation; **S2** `/design-system` command + verbs; **S3** deepask `--style` wiring + SOP-AIOPS-007 + adoption contract; **S4** ~21 pre-seed + 3 KPIs + docs + Phase-8 promotion.
