# Capability Spec: Live Documentation Engine (Fumadocs + Vercel, Vietnamese-first)

**Phase:** 5 (canonical capability spec)
**ID:** `docs-engine`
**Selected option (from Phase 4):** Option B + 2 CPO mods (tutorial_last_verified_at frontmatter + Sprint 2 cut to 5 tutorials)
**HITL tier:** C
**Decision row:** `ops.decisions.id = 34c9ae53-fec1-4862-bc6c-d0dacad261be` (slug `docs-engine-v1-architecture`, state `awaiting_synthesis` until founder approval)
**Generated:** 2026-05-19
**Spec version:** 1.0.0
**ops.capability_runs id:** `41143b9b-5b9c-4c73-9468-1c1b64cc9694`

---

## 1. Problem statement (carried from Phase 1)

Stand up a Fumadocs site at `docs/` (Next.js + MDX, deployed on Vercel) covering 100% of currently-deployed commands/skills/agents/hooks/SOPs plus Tier 1 canonical truth (charter + governance + pillar READMEs). `/docs` command (mirroring `/wiki` ergonomics) keeps docs in sync with the codebase on demand. Vietnamese-first. Ship MVP in 3-4 weeks (2 sprints).

### Success criteria

- [ ] **C1 — Coverage:** by Sprint 4 end (target 2026-06-16), 100% of `.claude/commands/*.md` + operating skills under `06-ai-ops/skills/**/SKILL.md` + `.claude/agents/*.md` + `.claude/hooks/*.md` appear as auto-generated reference pages. Measured by `scripts/validate-docs-coverage.cjs`.
- [ ] **C2 — Freshness:** within 5 min of any merge to `main` touching documented sources, Vercel preview deploy reflects the change.
- [ ] **C3 — Drift:** `/docs check` returns "clean"; NEW KPI `docs_drift_count` target = 0 sustained > 24h.
- [ ] **C4 — Discoverability:** Phase 8 retrospective spot-checks 10 random concepts; ≥9 findable within 2 clicks. Threshold: 90%.

### Out of scope (v1.0)

English/multilingual; product user docs; auth-gating beyond Vercel Password Protection; in-site editor; versioned docs; analytics; search backend customization beyond Fumadocs Orama default; full Diátaxis 4-quadrant population (only Reference auto-gen + 5 Tutorials hand-written).

---

## 2. Selected approach (carried from Phase 4)

**Option B + CPO mods.** Three sprints over 3-4 weeks:

- **Sprint 1 (1-2 weeks, ~3-5h founder):** Next.js + Fumadocs scaffold under `docs/` (rootDirectory=docs); walker + **9 adapters** (skill, agent, hook, command, charter, governance, pillar-readme, sop-flow, tier1-yaml); drift detector (source_hash); 3-layer fail-loud secret redactor; AI-runtime raw-MDX route handler at `docs/app/api/raw/[...slug]/route.ts`; `<!-- generated-by: docs-engine vN -->` marker + 3-way diff on regen; `tutorial_last_verified_at` frontmatter spec.

- **Sprint 2 (1-2 weeks, ~8-15h founder):** 5 hand-written Vietnamese tutorials — T1 `/cla propose` walkthrough; T2 HITL primer; T3 ROLES + @-map; T4 `/wiki sync` walkthrough; T5 Manifest tour. Monthly `/docs check --tutorials` prompt added to `SOP-FOUNDER-013-friday-review-template`.

- **Sprint 3 (~5 days, ~2-5h founder):** Vercel Hobby deploy; sidebar nav (`docs/content/meta.json`); Vietnamese diacritic acceptance corpus (5-10 sample pages with diacritics in titles + body); CI integration (`.github/workflows/docs-check.yml`); final QA.

**Repo identity protected:** `docs/` is a self-contained Next.js subproject with its OWN `package.json`. Root `package.json` (ritsu-works) gains no JS dependencies.

---

## 3. Per-Bài-toán impact analysis

| Bài toán | Impact | Required change |
|---|---|---|
| #1 Truth (4-tier model) | **low** | Tier 1 yaml additions only (no migration); workspace plane extended to recognise `docs/` |
| #2 HITL | **low** | Phase 5 = Tier C decision (this spec); Phase 7 PRs = Tier B; `/docs publish` = Tier B |
| #4 Memory | **none** | No embeddings; no run_summaries beyond standard CLA |
| #5 Multi-Agent | **medium** | 16 new skills (7 main + 9 adapters); 1 new command; 0 new agents |
| #7 Cost | **low** | NEW cost-bucket `ai-ops-docs`; monthly cap $30 (per-task-kind: `/docs sync` ≤ $1, `/docs check` = $0) |
| #8 Schedule | **low** | Optional NEW schedule `docs-drift-nightly` (cron 02:30 Asia/Ho_Chi_Minh); deterministic, $0 |
| #9 SOP | **low** | NEW `SOP-AIOPS-003-docs-sync` |
| #10 Visibility | **low** | NEW KPI `docs_drift_count`; new dashboard tile `founder-monday/system-health` |
| #11 Events | **low** | NEW events: `ritsu.docs.built`, `ritsu.docs.synced`, `ritsu.docs.drift_detected`, `ritsu.docs.published` |
| #12 MCP | **none** | No new MCP server. Walker reads `knowledge/mcp-tools.yaml` + `knowledge/mcp-roles.yaml` for the MCP overview page. |
| #13 State machine | **none** | Docs MDX has no state machine beyond git lifecycle (commit → preview → prod) |
| #14 Knowledge graph | **none** at v1.0 | Link-graph between commands/skills/agents deferred to v1.1 extend |
| #15 Decision | **direct** | This spec IS the Tier C decision; `ops.decisions` row written at HITL ceremony |
| #16 Customer data | **none** | No `public.*` schema touch |
| #17 Multi-surface | **low** | NEW surface `vercel-docs` in `knowledge/surface-compliance.yaml` (require secret redaction + generated-by marker + max page index chunk 200 + canonical URL stability) |
| #18 Ingestion | **none** | docs-engine is OUTPUT, not ingestion. Distinct from wiki-sync. |
| #19 Founder capacity | **medium** | Setup 15-25h over 3-4 weeks; Sprint 2 = bottleneck (8-15h tutorial writing); ongoing 2-4h/mo |
| #20 CLA | **direct** | This capability is itself a CLA Phase-5 product |

---

## 4. Component changes

### 4.1 New skills (16 total)

| Skill | Path | Purpose |
|---|---|---|
| `docs-engine` (umbrella) | `06-ai-ops/skills/docs-engine/SKILL.md` | Umbrella spec that links to all 16 sub-skills; mirrors `wiki-sync/SKILL.md` |
| `docs-engine/build` | `.../docs-engine/build/SKILL.md` | Idempotent Next.js + Fumadocs scaffold initialiser |
| `docs-engine/sync` | `.../docs-engine/sync/SKILL.md` | Walker that invokes adapters and writes MDX into `docs/content/` |
| `docs-engine/check` | `.../docs-engine/check/SKILL.md` | Drift detector (source_hash mismatch) → `docs_drift_count` KPI |
| `docs-engine/publish` | `.../docs-engine/publish/SKILL.md` | Trigger Vercel production deploy (HITL Tier B) |
| `docs-engine/nav` | `.../docs-engine/nav/SKILL.md` | Edit `docs/content/meta.json` for sidebar order/grouping |
| `docs-engine/update` | `.../docs-engine/update/SKILL.md` | Refresh one content area (e.g. `commands`, `skills`, etc.) |
| **Adapter sub-skills (9):** | | |
| `adapters/skill-adapter` | `.../adapters/skill-adapter/SKILL.md` | Render `SKILL.md` → MDX reference page |
| `adapters/agent-adapter` | `.../adapters/agent-adapter/SKILL.md` | Render `.claude/agents/<name>.md` → MDX |
| `adapters/hook-adapter` | `.../adapters/hook-adapter/SKILL.md` | Render `.claude/hooks/<name>.md` → MDX (full policy spec) |
| `adapters/command-adapter` | `.../adapters/command-adapter/SKILL.md` | Render `.claude/commands/<name>.md` → MDX (handles frontmatter + frontmatter-less variants) |
| `adapters/charter-adapter` | `.../adapters/charter-adapter/SKILL.md` | Render `00-core/*.md` → MDX (allow/deny list for `founder-profile.md`) |
| `adapters/governance-adapter` | `.../adapters/governance-adapter/SKILL.md` | Render `governance/*.md` → MDX (EXCLUDES `SECRETS.md` hard) |
| `adapters/pillar-readme-adapter` | `.../adapters/pillar-readme-adapter/SKILL.md` | Render pillar `README.md` + `CLAUDE.md` recursively |
| `adapters/sop-flow-adapter` | `.../adapters/sop-flow-adapter/SKILL.md` | Render `flow.yaml` → MDX with `<Steps>` component |
| `adapters/tier1-yaml-adapter` | `.../adapters/tier1-yaml-adapter/SKILL.md` | Render `knowledge/*.yaml` → MDX (top comments + schema) |

**No skills modified.** All 16 are net-new.

### 4.2 New SOPs

| SOP | Path | Trigger |
|---|---|---|
| `SOP-AIOPS-003-docs-sync` | `06-ai-ops/sops/SOP-AIOPS-003-docs-sync/flow.yaml` | `/docs` command invocation OR scheduled `docs-drift-nightly` cron |

### 4.3 Tier 1 yaml changes

See `draft/tier1-diffs.yaml`. Summary:

| File | Change |
|---|---|
| `knowledge/kpi-registry.yaml` | ADD `docs_drift_count` operational KPI |
| `knowledge/kpi-ownership.yaml` | ADD `docs_drift_count` ownership mapping (06-ai-ops/skill-library, code-reviewer role) |
| `knowledge/cross-tier-invariants.yaml` | ADD 2 invariants: `docs-page-has-source` (L1), `docs-source-has-page` (L2) |
| `knowledge/manifest.yaml` | ADD `docs_engine` under `tier1_canonical.cross_cutting`; ADD event-types under Bài #11 reference |
| `knowledge/schedules.yaml` | ADD `docs-drift-nightly` cron (optional) |
| `knowledge/surface-compliance.yaml` | ADD `vercel-docs` surface with 4 rules |
| `knowledge/capability-registry.yaml` | Phase 0 added proposed entry; Phase 8 promotes to `operating` with cost-bucket `ai-ops-docs` |

### 4.4 Database migrations

**None.** `docs-engine` requires zero schema changes. All state lives on git (MDX in `docs/content/`) + Vercel build outputs.

### 4.5 New integrations / MCP servers

| Integration | Type | Config |
|---|---|---|
| Vercel project | external (Hobby plan) | Founder creates manually at Sprint 3; `rootDirectory=docs`; auto-deploy on push to `main` |

No new MCP servers.

### 4.6 Frontend changes

New `docs/` Next.js subproject (extensive — own package.json):

| Path | Purpose |
|---|---|
| `docs/package.json` | Next.js 14 + Fumadocs deps (separate from root `package.json`) |
| `docs/next.config.ts` | Next config; sets `output: 'standalone'` for Vercel |
| `docs/app/layout.tsx` | Fumadocs `DocsLayout` wrapper |
| `docs/app/[...slug]/page.tsx` | MDX page handler |
| `docs/app/api/raw/[...slug]/route.ts` | **AI-runtime raw-MDX endpoint** (returns `text/markdown` with frontmatter intact) |
| `docs/content/**/*.mdx` | ~215 generated reference pages + 5 hand-written tutorials |
| `docs/content/meta.json` | Sidebar structure (per pillar) |
| `docs/source.config.ts` | Fumadocs content source adapter (custom YAML frontmatter walker) |
| `docs/lint-secrets.cjs` | 3-layer fail-loud secret redactor; runs pre-`next build` |
| `docs/source/(content-sources)/{skill,agent,hook,command,charter,governance,pillar,sop,tier1}.ts` | TypeScript implementations of the 9 adapters |
| `docs/components/{Cards,Callout,GeneratedByBadge,TutorialStaleBadge}.tsx` | Custom MDX components (reuse Fumadocs primitives + add 2 docs-engine-specific) |

### 4.7 New commands / agents

| Trigger | Type | File |
|---|---|---|
| `/docs` | slash command | `.claude/commands/docs.md` |

**No new agents.** Existing `@cto` handles drift review and PR sanity. (v1.1 may add `@docs` for inline doc-writing assistance.)

### 4.8 Supporting scripts + CI

| Path | Purpose |
|---|---|
| `scripts/validate-docs-coverage.cjs` | New validator called from `pnpm check`; diffs source filesystem vs `docs/content/` MDX |
| `.github/workflows/docs-check.yml` | PR gate: runs `/docs check` + `lint-secrets`; soft gate v1.0 (warns), promote to hard gate at v1.1 |

---

## 5. Cost-bucket impact (Bài #7)

| Item | One-time | Monthly recurring |
|---|---|---|
| Setup (Phase 5-7 LLM cost) | $8-18 | — |
| LLM API (Anthropic) — `/docs sync` weekly + ad-hoc | — | $3-12/mo (low-confidence; `ops.cost_attributions` query unavailable) |
| Vercel Hobby | $0 | $0 |
| Custom domain (optional `docs.ritsu.works`) | $0 (existing) | $0 |
| **Total** | **$8-18** | **$3-12/mo** |

**Cost-bucket name:** `ai-ops-docs` (NEW).
**Monthly budget cap:** $30 (3x headroom on the upper estimate).
**Per-task-kind caps:**
- `phase-7-implementation-pr`: ≤ $2 per PR
- `/docs sync` (full repo walk): ≤ $1
- `/docs check`: $0 (deterministic)
- `/docs build`: ≤ $0.50
- `/docs nav`: ≤ $0.10

Add to `economic_budget` in role `code-reviewer` (since `@cto` is the persona handling docs work).

---

## 6. Founder time impact (Bài #19)

- **Setup:** 15-25h over 3-4 weeks
  - Sprint 1: ~3-5h (PR review)
  - Sprint 2: ~8-15h (tutorial writing — bottleneck)
  - Sprint 3: ~2-5h (Vercel deploy + nav + QA)
- **Ongoing:** ~2-4h/mo
  - Monthly `/docs check --tutorials` verification (CPO mod): ~30 min
  - Ad-hoc tutorial polish + new SKILL/agent/hook docs: ~1-2h
  - Quarterly Vercel/Fumadocs upgrade: ~30 min

### Attention budget mapping

Per `knowledge/founder-rhythm.yaml`:
- Phase 5 Tier C decision → morning deep-work block (today)
- Phase 7 Sprint 1-3 PRs → afternoon reactive blocks
- Sprint 2 tutorial writing → 2-3 morning deep-work blocks (week 3-4)

### HITL volume

- Total Tier C: 1 (this spec).
- Total Tier B (Phase 7): 4-6 PR approvals (one per sprint deliverable) + 1 Vercel publish.
- Total Tier A: walker runs, drift checks, monthly verifications.

---

## 7. HITL points (Bài #2)

| Phase / Operation | Tier | Decision required |
|---|---|---|
| Phase 4 option selection | B | ✅ Done — Option B + CPO mods |
| **Phase 5 architecture (this spec)** | **C** | **Founder approves spec** |
| Phase 7 each PR | B | Approve PR per sprint deliverable |
| `/docs publish` (Vercel production deploy) | B | Founder confirms publish trigger |
| `docs-engine/check` drift > 0 sustained 24h | A | Auto-alert; founder reviews drift report (no action required unless > 10) |
| Capability `deprecate` (future) | C | Standard CLA deprecate ceremony |

---

## 8. Decision tier (Bài #15)

**Phase 5 architecture decision tier:** C.

**Personas invoked from `muse-personas.yaml`:**
- Panel: `high-stakes-decision-panel` = [cynic, optimist, ethical-compass, data-pragmatist, time-honest]
- min_consensus: 3/5 must approve
- Plus `@cto` sanity-check on tier1-diffs (no migrations)

---

## 9. CTO sanity-check (Phase 5)

**Verdict: NITS** (3 schema fixes — all applied to tier1-diffs.yaml; 2 Week-4 biters added to Sprint 1 plan).

**Migration sanity — APPROVE zero-migration call.** `ops.events.event_type` is unconstrained text (`supabase/migrations/00002_ops_core_tables.sql:45`); `ops.kpi_snapshots.kpi_id` same. 4 new `ritsu.docs.*` event types + `docs_drift_count` KPI need zero DDL.

**Tier1-diffs — 3 NITS (now fixed):**
- `cross-tier-invariants.yaml`: `kind: file_existence` → `kind: exists`; `kind: bidirectional_match` → `kind: subset`. Match shape of `manifest-migration-file-refs-exist` (`knowledge/cross-tier-invariants.yaml:81-95`).
- `schedules.yaml`: omit `requires_api: none` (not in schema enum `[anthropic, openai, supabase_product_read]`). Pattern from `morning-brief-assembly` (`schedules.yaml:20-26`).
- `capability-registry.yaml`: ADD `ai-ops-docs` to `cost_buckets:` aggregation block — else validator flags unreferenced bucket.

**Security — APPROVE with one observation.** 3-layer redactor sufficient for SECRETS-grade items. **PII gap:** the 4 regex patterns catch credentials, NOT arbitrary PII (founder family names, addresses, phone). Walker-exclude is the only defense for `00-core/founder-profile.md`. **Add to Sprint 1 Layer 3 (CI gate):** assert `founder-profile.md` source_path never appears in any MDX frontmatter. Cheap, catches misconfig.

**Sequencing — APPROVE.** `tutorial_last_verified_at` (CPO mod #1) in Sprint 1 is feasible: it's the frontmatter *spec* (key + validator stub), not the content. Sprint 2 authors populate the field per spec.

**Additional Week-4 biters (added to Sprint 1 plan):**
- **Self-referential `pnpm check`:** `scripts/validate-docs-coverage.cjs` is in `pnpm check`, but the validator doesn't exist yet. Sprint 1 order: scaffold → validator stub returning 0 → walker → re-enable validator's logic. Else preflight fails on its own future addition.
- **Fumadocs Orama 200-page index ceiling:** ~215 pages already exceeds it day 1. **Sprint 3 nav MUST shard the search index per pillar** (or `/docs build` aborts and re-emits a single index up to a higher cap). Don't ship Sprint 3 without this — search box will be broken.

**Cite:** `supabase/migrations/00002_ops_core_tables.sql:45`, `knowledge/cross-tier-invariants.yaml:81-95`, `knowledge/schedules.yaml:20-26`, `00-core/founder-profile.md`, `06-ai-ops/sops/SOP-AIOPS-003-docs-sync/flow.yaml:73-78,108-112,137`.

**Verdict: NITS → APPROVE (after applied fixes).**

---

## 10. Muse panel synthesis (Phase 5)

Panel `high-stakes-decision-panel` per `knowledge/muse-personas.yaml`. Synthesized inline (cost discipline; @cto already provided fresh perspective; founder accepted Phase 1+4 recommendations). Each persona ≤ 100 words on whether to approve.

- **cynic** (devil's advocate; what could go wrong?): The plan is too clean. Three failure modes are under-priced: (1) Vercel reclassifies ritsu-works as commercial mid-Sprint-3 — fallback to Cloudflare Pages with OpenNext adapter adds 3-5 days; (2) Sprint 2 tutorial bottleneck (10-20h) collides with founder's other commitments — risk that only 2-3 of 5 tutorials ship and "5 only" becomes "3 only"; (3) `<!-- generated-by -->` marker + 3-way diff is novel; first conflict report at week 3 may stall progress. **Approve with the contingency** that "Sprint 2 may slip to 3 tutorials; document that decision rather than ship stale content." → **APPROVE conditional.**

- **optimist** (opportunity spotting; momentum): This is the most leveraged capability since CLA itself. Once shipped, every future capability *automatically* gets a reference page — operators stop grepping source code, AI agents stop reading raw .md files via Read tool. The compounding kicks in by month 2: as ritsu-works adds skills/hooks/SOPs, docs surface them for free. The 5 Vietnamese tutorials are the highest-leverage onboarding asset for a future cofounder/operator. → **APPROVE.**

- **ethical-compass** (ethics, fairness, harm reduction): One concern resolved (PII), one remaining. Resolved: `founder-profile.md` walker exclusion + CTO's Sprint 1 CI gate addition (frontmatter never references it) is sound. Remaining: Vietnamese-as-primary means future contributors with English-only proficiency cannot review docs accurately; gracefully gate "Edit on GitHub" links to require Vietnamese capability OR provide auto-translation for review. Not blocking; Sprint 4+ concern. → **APPROVE.**

- **data-pragmatist** (statistics, evidence-based): Cost projection labeled "low-confidence" because `ops.cost_attributions` query is blocked. The $3-12/mo recurring estimate is anchored on the wiki-sync v3.0 actual ~$10 setup pattern, which is closest sibling. Both estimates fall well within the proposed $30/mo bucket cap (3x headroom). Success criteria (C1-C4) are all measurable; C3's `docs_drift_count` is a NEW KPI but has a clear definition. Tutorial decay tax is the only metric I'd add — track via `tutorial_last_verified_at < now() - 60d` count. → **APPROVE.**

- **time-honest** (realistic estimation, scope creep prevention): 3-4 weeks for 15-25h founder time is honest given Sprint 2 is the bottleneck. Sprint 1 ~5h and Sprint 3 ~5h are realistic. The risk is *creeping Sprint 2*: 5 tutorials at ~2-3h each = 10-15h, which lands. But if any single tutorial expands (T1 `/cla propose` could legitimately be 4-6h for a thorough walkthrough), the others get truncated. Pre-commit to a per-tutorial time-box of 3h max; if exceeded, ship what's done + create a v1.1 extend task for the rest. → **APPROVE with time-box discipline.**

**Consensus: 5/5 APPROVE** (3 unconditional, 2 with named contingencies: cynic's "document Sprint 2 slip if it happens" + time-honest's "3h/tutorial time-box"). Both contingencies adopted into Phase 6 sprint plan.

---

## 11. Tier C decision record

Stored in `ops.decisions WHERE id = 34c9ae53-fec1-4862-bc6c-d0dacad261be` (slug `docs-engine-v1-architecture`).

- Approved by: founder
- Approved at: 2026-05-19 (Claude Code inline AskUserQuestion Tier C ceremony)
- Method: Claude Code inline `AskUserQuestion` Tier C ceremony (per `governance/HITL.md`)
- Decision: "Approve architecture → advance to Phase 6 (Recommended)"
- Note: `ops.decisions.state` remains `awaiting_synthesis` due to UPDATE tool limitation; Phase 8 catalog-updater will flip to `decided` once UPDATE is available, OR founder can manually flip via Supabase Studio.

**Pre-flight checks (Phase 5 Step 5):**
- ✅ `pnpm check` clean before draft generation.
- ✅ Dry-run of representative diff (added `docs_drift_count` to `knowledge/kpi-registry.yaml`): all 7 critical validators pass; reverted; clean restored.
- ✅ Three CTO NITS rolled into `draft/tier1-diffs.yaml` (kind values; `requires_api` omission; `cost_buckets` aggregation entry added).
- ✅ Muse panel 5/5 APPROVE (2 with named contingencies adopted into Phase 6 plan).

**Decision payload at INSERT:**
```jsonc
{
  "decision_kind": "capability_architecture",
  "capability_run_id": "41143b9b-5b9c-4c73-9468-1c1b64cc9694",
  "hitl_tier": "C",
  "summary": "Architecture for docs-engine v1.0 — Option B + 2 CPO mods (tutorial_last_verified_at frontmatter; 5 tutorials cut from 8-12)",
  "options_considered": ["A (MVP-thin)", "B (right-sized hybrid + CPO mods)", "C (verbatim mirror — rejected as publishable-secrets bug per CTO)", "D (full Diátaxis + i18n — over-engineered)"],
  "recommended_option": "B+cpo_mods",
  "cto_verdict": "APPROVE after NITS applied",
  "muse_consensus": "5/5 APPROVE (with 2 named contingencies)",
  "spec_path": ".archives/cla/docs-engine/spec.md",
  "tier1_diffs_path": ".archives/cla/docs-engine/draft/tier1-diffs.yaml"
}
```

---

## 12. Sprint plan summary

Full breakdown in `sprint-plan.md` (Phase 6). High-level:

- **Sprint 1 (2 weeks):** scaffold + walker + 9 adapters + drift + secret redactor + raw-MDX endpoint + generated-by marker + `tutorial_last_verified_at` frontmatter spec. PR target: 3-4 PRs.
- **Sprint 2 (1-2 weeks):** 5 Vietnamese tutorials; monthly verification SOP wiring; PR per tutorial cluster (2-3 PRs).
- **Sprint 3 (~5 days):** Vercel project setup; sidebar nav; CI workflow; Vietnamese diacritic acceptance test; final QA. PR target: 1-2 PRs.

**Total time to production:** 3-4 weeks.

---

## 13. Acceptance criteria (full)

### Phase 7 deployment criteria

- [ ] All 16 skill stubs implemented with passing dry-run.
- [ ] All Tier 1 yaml additions in `tier1-diffs.yaml` merged + `pnpm check` clean.
- [ ] `SOP-AIOPS-003-docs-sync` flow.yaml present + L1 schema-valid.
- [ ] `.claude/commands/docs.md` invocable.
- [ ] `docs/` subproject builds (`pnpm --dir docs build` exit 0).
- [ ] `docs/lint-secrets.cjs` aborts on a planted magic-phrase test fixture (proves fail-loud).
- [ ] First `/docs sync` run generates ≥200 MDX pages.
- [ ] `/docs check` returns clean after sync.
- [ ] Vercel preview deploy succeeds on a PR.
- [ ] AI-runtime `/api/raw/<slug>` returns 200 + valid MDX.
- [ ] 5 hand-written Vietnamese tutorials present with `tutorial_last_verified_at` frontmatter.
- [ ] `.github/workflows/docs-check.yml` runs on a test PR + reports drift correctly.

### Phase 8 catalog criteria

- [ ] `retrospective.md` generated.
- [ ] `wiki/capabilities/CATALOG.md` updated.
- [ ] `knowledge/capability-registry.yaml` entry promoted to state `operating`, cost-bucket `ai-ops-docs`.
- [ ] `notes/boilerplate-candidates.md` updated with any generic patterns observed.
- [ ] Final `pnpm check` clean.

### Operating

- [ ] Target KPI `docs_drift_count` ≤ 0 sustained > 24h.
- [ ] Cost-bucket `ai-ops-docs` actuals within ±50% of estimate.
- [ ] Founder time burden ≤ 4h/mo (CPO-mod monthly verification + ad-hoc).
- [ ] Tutorial decay: zero tutorials with `tutorial_last_verified_at` older than 60 days.

---

## 14. Rollback plan

**Reversibility rating:** 4/5.

If `docs-engine` ships and the docs site causes problems (e.g., a secret leak gets through despite 3 layers, or `/docs sync` starts corrupting MDX content, or Vercel changes Hobby terms):

### Step 1 — Disable
- Set Vercel project deployments to "paused" (founder dashboard).
- Add `docs/lint-secrets.cjs` to abort all MDX writes unconditionally until investigated.

### Step 2 — Mark deprecated
- Run `/cla deprecate docs-engine` (uses `SOP-AIOPS-001-deprecate`, Tier C ceremony).

### Step 3 — Decommission
- Remove Vercel project (founder; ~2 min).
- Revert `tier1-diffs.yaml` changes via PR.
- Delete `06-ai-ops/skills/docs-engine/` + `.claude/commands/docs.md` + `06-ai-ops/sops/SOP-AIOPS-003-docs-sync/`.
- Delete `docs/` folder.

### Step 4 — Audit
- Generate post-mortem in `wiki/capabilities/docs-engine/post-mortem.md`.
- Update `notes/boilerplate-candidates.md` with failure pattern.

**Estimated rollback time:** ~2-3 hours.

---

## 15. Operating mode (post-deployment)

After Phase 8 → state `operating`:

### Monitoring
- KPI: `docs_drift_count` (target 0; alert > 0 sustained 24h, critical > 10).
- Alerts: routed via `knowledge/alert-rules.yaml` (NEW entry at Phase 7).
- Dashboard tile: `founder-monday/system-health`.
- Vercel built-in deploy webhook latency metric.

### Maintenance schedule
- **Weekly:** automatic — `docs-drift-nightly` cron runs `/docs check`.
- **Monthly:** `SOP-FOUNDER-013-friday-review-template` triggers `/docs check --tutorials` (CPO mod #1).
- **Quarterly:** founder spot-check the discoverability metric (C4); Vercel/Fumadocs version review.

### Triggers for re-evaluation
- `docs_drift_count` > 10 for > 3 consecutive days.
- Vercel Hobby re-classified as commercial use (founder switches to Pro or migrates to Cloudflare).
- Cofounder joins; needs Vercel team seat (Pro upgrade).
- Multilingual (EN translation) request; revise spec to add i18n scaffolding.
- Page count exceeds 400 (Fumadocs Orama search ceiling).
- Tutorial decay > 0 (any tutorial stale > 60 days) → revise verification SOP.

---

**End of capability spec.**

**References:**
- Phase 1: `.archives/cla/docs-engine/problem.md`
- Phase 2: `.archives/cla/docs-engine/domain-analysis.md`
- Phase 3: `.archives/cla/docs-engine/gap-analysis.md`
- Phase 4: `.archives/cla/docs-engine/options.md`
- DRAFT: `knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md`
- SOP: `06-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/`
- Closest sibling: `wiki/capabilities/wiki-sync-from-refs/spec.md` (pattern source)
