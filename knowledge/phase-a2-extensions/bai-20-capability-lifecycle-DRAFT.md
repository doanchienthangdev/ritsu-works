# Bài #20 — Capability Lifecycle Architecture (CLA) — DRAFT

> **Status:** Phase A.2 — final bài toán bridging architecture với operations.
> **Priority:** P0 — without CLA, every bài toán nghiệp vụ mới = ad-hoc reinvention.
> **Cross-cuts:** All 19 prior bài toán.

## Vấn đề

Phase A + A.2 đã build **kernel của Agent OS** — 19 bài toán, 18 Tier 1 files, 10 layers. Nhưng có gap critical:

> *"Mỗi khi tôi đề xuất 1 bài toán nghiệp vụ mới (ví dụ 'Làm sao kiếm thêm khách hàng mới mỗi ngày'), tôi không có quy trình chuẩn để đi từ ý tưởng → giải pháp tích hợp vào Agent OS."*

Hiện tại, mỗi bài toán nghiệp vụ:
- Founder phải hand-hold Claude Code qua từng phase
- Approach inconsistent across capabilities
- Không có catalog của capabilities đã solve
- Không có versioning capability
- Không có lessons-learned capture
- Không có decision frame (build hay skip?)
- Không có cost projection chuẩn
- Không có rollback plan template

**Analogy:** Phase A + A.2 = Linux kernel. Bài #20 = `apt-get install` + `dpkg` + package format. Without #20, every "install software" = manual `make`.

## Khái niệm: Capability

**Capability** = đơn vị giá trị nghiệp vụ deployed trên Agent OS, package gồm:

- 1+ Skills (`05-ai-ops/skills/`)
- 0-N SOPs (`<pillar>/sops/`)
- 0-N Tier 1 changes (`knowledge/*.yaml`)
- 0-N Database migrations (`supabase/migrations/`)
- 0-N Integrations (`08-integrations/`)
- 0-N Frontend pages (`frontend/`)
- 0-N External services (Typeform, Stripe, etc.)
- 1 Capability spec (`wiki/capabilities/<id>/spec.md`)

**Examples:**
- "Daily customer acquisition pipeline"
- "Auto-triage support tickets"
- "Multi-locale content publishing"
- "Founder weekly review automation"

## CLA Workflow — 8 phases

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: Problem Framing      (10-15 min, HITL: A)              │
│  Phase 2: Domain Deep-Dive     (20-30 min, HITL: A)              │
│  Phase 3: System Inventory     (15-20 min, HITL: A)              │
│  Phase 4: Options Generation   (30-45 min, HITL: B founder picks)│
│  Phase 5: Architecture Design  (30 min,    HITL: C founder approves)│
│  Phase 6: Sprint Planning      (20 min,    HITL: B)              │
│  Phase 7: Implementation       (1-4 weeks, HITL: B per PR)       │
│  Phase 8: Catalog Update       (5 min,     HITL: A)              │
└──────────────────────────────────────────────────────────────────┘
```

## State machine (Bài #13 convention)

```
proposed → analyzing → architecting → planning → implementing → 
  deployed → operating → deprecated/superseded
```

Each transition logged in `ops.capability_runs` + audit trail.

## Trigger paths (3 ways)

### Trigger 1: Voice note (Bài #18)

Founder gửi voice note via Telegram:
```
"Tôi cần kiếm thêm 10 khách hàng mới mỗi ngày. Hiện đang có 2-3."
```

Pipeline:
1. Bài #18 ingestion: Whisper transcribe
2. Voice classifier detects `decision_request` + new capability proposal
3. Auto-creates `wiki/capabilities/<auto-slug>/problem.md`
4. Notifies founder: "Capability proposal logged. Start CLA workflow?"

### Trigger 2: Claude Code command

```bash
$ claude code .
> /cla propose "Kiếm 10 khách hàng mới mỗi ngày"
```

Or in-session:
```
"Bắt đầu CLA cho việc kiếm thêm khách hàng mỗi ngày"
```

Claude Code reads CLA SOP, kicks off Phase 1.

### Trigger 3: Manual wiki entry

Founder tạo `wiki/capabilities/daily-customer-acquisition/problem.md` rồi commit.
Pre-commit hook detects new capability + creates `ops.capability_runs` row in state `proposed`.

## Phase details

### Phase 1: Problem Framing

**Subagent:** `problem-framer`
**Input:** raw problem statement
**Outputs:**
- `wiki/capabilities/<id>/problem.md` (canonical statement)
- 5-7 clarifying questions answered
- Success criteria draft (measurable)
- Constraints identified (budget, time, ethics)

**Required clarifications template:**
- Đối tượng: ai là customer mục tiêu?
- Định nghĩa: "kiếm khách hàng" = signup? activated? paid?
- Volume: 10/day = floor or ceiling? sustainable hay burst?
- Budget: tối đa bao nhiêu/khách hàng?
- Time horizon: production-ready by when?
- Constraints: founder bandwidth, ethics, channels off-limits?

**HITL:** Tier A (auto-proceed sau khi founder confirm clarifications).

### Phase 2: Domain Deep-Dive

**Subagent:** `domain-analyst` (uses Bài #15 Muse panel với domain experts)
**Personas invoked from `muse-personas.yaml`:**
- Domain expert (e.g., growth-strategist for acquisition)
- Industry-benchmark analyst
- Customer-advocate
- Cost-conscious cynic

**Outputs:**
- `wiki/capabilities/<id>/domain-analysis.md`
- Industry benchmarks (CAC, conversion rates, channel ROI)
- Customer journey map
- Competitive landscape brief
- Channel comparison matrix

**HITL:** Tier A (founder spot-checks).

### Phase 3: System Inventory

**Subagent:** `system-inventory-scanner`
**Reads:**
- All `05-ai-ops/skills/` (existing skills)
- All `<pillar>/sops/` (existing SOPs)
- All `knowledge/*.yaml` (Tier 1 configs)
- `mcp-tools.yaml` (existing tools)
- `08-integrations/` (existing integrations)
- `ops.capability_runs` (deployed capabilities)
- Recent `ops.kpi_snapshots` (current performance)

**Output:** `wiki/capabilities/<id>/gap-analysis.md`

```markdown
# Gap Analysis: <capability>

## Existing relevant capabilities
- ✅ Have: morning-brief assembly, voice-note classification
- ✅ Have: Telegram surface adapter, email surface adapter
- ❌ Don't have: lead source polling
- ❌ Don't have: automated outreach personalization
- ❌ Don't have: lead scoring

## Existing skills usable
- `surface-adapter-orchestrator` (reusable)
- `cost-bucket-tracker` (reusable)

## Existing Tier 1 to extend
- `channels.yaml`: add lead-capture channels
- `kpi-registry.yaml`: add `daily_new_customers`

## Existing SOPs to chain
- SOP-CONTENT-002 (cross-surface publishing) — could feed leads

## Skills/SOPs/integrations needed
- Lead source poller (NEW skill)
- Lead scorer (NEW skill)
- Outreach personalizer (NEW skill)
- SOP-GROWTH-002 daily lead generation (NEW SOP)
- Typeform webhook (NEW integration)
- Apollo.io adapter (NEW integration)
- Instantly.ai adapter (NEW integration)
```

**HITL:** Tier A.

### Phase 4: Options Generation

**Subagent:** `options-generator`

Sinh ra 3-5 options, mỗi option:

```markdown
## Option <X>: <name>

### Approach
<how it works>

### Components needed
| Component | Type | New/Reuse |
|---|---|---|
| ... | skill/SOP/integration/external | ... |

### Architecture impact
- Tier 1 changes: [...]
- Database migrations: [...]
- Integrations: [...]
- Frontend: [...]

### Cost projection (Bài #7)
- Setup: $X
- Recurring monthly: $Y/mo
- Per-customer-acquired: $Z

### Founder time impact (Bài #19)
- Setup: X hours one-time
- Ongoing: Y hours/week
- HITL volume: Z decisions/week

### Time to value
- MVP: X weeks
- Production: Y weeks

### Risks
- ...

### Decision tier (Bài #15)
Tier <A/B/C/D/E>

### Recommendation strength
<weak/medium/strong>
```

**Output:** `wiki/capabilities/<id>/options.md`

Cuối options doc, có **`## Recommended Option`** với reasoning.

**HITL:** Tier B (founder reviews 3-5 options, picks one or asks for combination).

### Phase 5: Architecture Design

**Subagent:** `architect`
**Input:** selected option from Phase 4
**Process:**
- Per-Bài-toán impact analysis (#1, #4, #5, #7, #8, #9, #10, #11, #13, #14, #15, #16, #17, #18, #19)
- Generate canonical `spec.md` (template ở section 32.5 dưới)
- Generate migration draft
- Generate Tier 1 yaml diffs
- Generate skill stubs

**Output:** `wiki/capabilities/<id>/spec.md` (canonical capability spec)

**HITL:** Tier C (founder approves architecture trước khi implement).

### Phase 6: Sprint Planning

**Subagent:** `sprint-planner`
**Input:** approved spec
**Process:**
- Break into 2-week sprints
- Each sprint: clear deliverables + acceptance criteria
- Identify Wave alignment (Wave 1-8 in chương 28)
- Estimate effort + cost

**Output:** `wiki/capabilities/<id>/sprint-plan.md`

```markdown
# Sprint Plan: <capability>

## Sprint 1 (Week 1): Foundation
**Deliverables:**
- [ ] Migration 10003_lead_tracking.sql applied
- [ ] Tier 1 yaml updates merged
- [ ] Cost-bucket tracker setup

**Acceptance:**
- [ ] `supabase db push` succeeds
- [ ] `validate-tier1.js` passes
- [ ] Cost-bucket entries flowing to ops.cost_bucket

**Effort:** 8h
**HITL:** Tier B (founder approves migration)

## Sprint 2 (Week 2): Skills
...

## Sprint 3 (Week 3): SOPs + Integration
...

## Sprint 4 (Week 4): External + End-to-end
...

## Total: 4 weeks, 32h founder time, $114/mo recurring
```

**HITL:** Tier B.

### Phase 7: Implementation

**Subagent:** `implementation-coordinator`
**Process:**
- Execute sprints sequentially
- Each PR triggers `ops.events` event
- Auto-run validation (Tier 1 schemas, tests)
- HITL Tier B per PR

**State machine:**
```
implementing.sprint_1_foundation
implementing.sprint_2_skills
implementing.sprint_3_sops
implementing.sprint_4_external
implementing.testing
deployed
```

Multi-session resilient: state in `ops.capability_runs` allows resume after Claude Code session restart.

**HITL:** Tier B per PR review.

### Phase 8: Catalog Update

**Subagent:** `catalog-updater`
**Process:**
- Update `wiki/capabilities/_CATALOG.md` (index)
- Update `capability-registry.yaml`
- Generate retrospective: `wiki/capabilities/<id>/retrospective.md`
- Update playbook chương 33 if novel patterns
- Update `notes/boilerplate-candidates.md` (chương 31 discipline)

**Output:** Catalog entry + retrospective

**HITL:** Tier A.

## Tier 1 file: capability-registry.yaml

Tier 1 file #19 (after feature-flags.yaml = #18).

Schema: see `knowledge/schemas/capability-registry.schema.json`.

Example:
```yaml
version: "1.0.0"
capabilities:
  - id: daily-customer-acquisition
    name: "Daily Customer Acquisition Pipeline"
    state: implementing
    state_since: 2026-05-15
    proposed_at: 2026-05-10
    pillar_owner: 01-growth
    bài_toán_touched: [11, 13, 16, 17]
    spec_path: wiki/capabilities/daily-customer-acquisition/spec.md
    sprint_plan: wiki/capabilities/daily-customer-acquisition/sprint-plan.md
    cost_bucket: lead-acquisition
    target_kpis: [daily_new_customers]
    target_value: 10
    current_value: 3
    estimated_completion: 2026-06-12
    
  - id: support-triage-automation
    name: "Auto-triage support tickets"
    state: deployed
    state_since: 2026-04-01
    deployed_at: 2026-04-15
    pillar_owner: 02-customer
    spec_path: wiki/capabilities/support-triage-automation/spec.md
    cost_bucket: support-ops
    target_kpis: [support_response_time, support_auto_resolution_rate]
```

## Database: ops.capability_runs

Tracks lifecycle of each CLA workflow run.

```sql
CREATE TABLE ops.capability_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  
  capability_id   text NOT NULL,
  capability_name text NOT NULL,
  
  -- State machine (Bài #13)
  state           text NOT NULL DEFAULT 'proposed',
  state_since     timestamptz NOT NULL DEFAULT now(),
  state_payload   jsonb,
  state_version   text NOT NULL DEFAULT '1.0.0',
  
  -- Phase tracking
  current_phase   integer NOT NULL DEFAULT 1,
  phases_completed integer[] DEFAULT ARRAY[]::integer[],
  
  -- Artifacts
  problem_path    text,
  domain_analysis_path text,
  gap_analysis_path text,
  options_path    text,
  spec_path       text,
  sprint_plan_path text,
  retrospective_path text,
  
  -- Cost & impact (Bài #7 + #19)
  estimated_cost_setup_usd numeric(10, 2),
  estimated_cost_recurring_usd numeric(10, 2),
  estimated_founder_hours numeric(6, 2),
  
  actual_cost_setup_usd numeric(10, 2),
  actual_cost_recurring_usd numeric(10, 2),
  actual_founder_hours numeric(6, 2),
  
  -- Decision (Bài #15)
  decision_id     uuid REFERENCES ops.decisions(id),
  
  -- Lifecycle
  proposed_by     text NOT NULL DEFAULT 'founder',
  approved_at     timestamptz,
  deployed_at     timestamptz,
  deprecated_at   timestamptz,
  superseded_by_id uuid REFERENCES ops.capability_runs(id),
  
  CONSTRAINT capability_runs_state_valid CHECK (
    state IN ('proposed', 'analyzing', 'architecting', 'planning', 
              'implementing', 'deployed', 'operating', 'deprecated', 'superseded')
  )
);

CREATE INDEX idx_capability_runs_state ON ops.capability_runs (state, state_since);
CREATE INDEX idx_capability_runs_pillar ON ops.capability_runs (capability_id);
CREATE INDEX idx_capability_runs_active ON ops.capability_runs (state) 
  WHERE state IN ('proposed', 'analyzing', 'architecting', 'planning', 'implementing');

CREATE TRIGGER trg_capability_runs_state_since
  BEFORE UPDATE ON ops.capability_runs
  FOR EACH ROW
  EXECUTE FUNCTION ops.touch_state_since();
```

## Integration với 19 prior bài toán

| Bài toán | Integration |
|---|---|
| #1 Truth | Capability spec = Tier 1 truth, retrospective = Tier 3 |
| #2 HITL | Phase 4 (Tier B options), Phase 5 (Tier C architecture), Phase 7 (Tier B per PR) |
| #4 Memory | Capability catalog searchable via knowledge graph (Bài #14) |
| #5 Multi-Agent | 8 subagents per phase, deterministic where possible |
| #7 Cost | Each option has cost projection, actual tracked vs estimated |
| #8 Schedule | Long-running implementations have weekly progress checks |
| #9 SOP | CLA itself = meta-SOP |
| #10 Visibility | Dashboard shows capability pipeline (proposed → deployed) |
| #11 Events | Each phase transition fires `ritsu.capability.<phase>_completed` |
| #13 State Machine | Capability lifecycle = state machine |
| #14 Knowledge Graph | Spec links to entities (customers, decisions, etc.) |
| #15 Decision | Phase 5 architecture decision = Tier C+ decision |
| #16 Customer Data | Many capabilities affect customer schema |
| #17 Multi-Surface | Capabilities often need new surfaces |
| #18 Ingestion | Trigger 1 (voice note) uses ingestion pipeline |
| #19 Founder Capacity | CLA respects founder rhythm, schedules deep-work for Phase 5 |

## CLA itself = capability

Meta: CLA tự nó là capability đầu tiên implementing on Agent OS.

```yaml
- id: capability-lifecycle-architecture
  name: "Capability Lifecycle Architecture (Bài #20)"
  state: deployed
  deployed_at: 2026-05-04
  pillar_owner: 05-ai-ops
  bài_toán_touched: [1, 2, 4, 5, 7, 8, 9, 10, 11, 13, 14, 15, 16, 17, 18, 19]
  spec_path: knowledge/phase-a2-extensions/bai-20-capability-lifecycle-DRAFT.md
```

## Failure modes to avoid

1. **Skip Phase 4 (Options).** Founder jumps straight to Phase 5 → architecture biased toward first idea.
2. **Phase 5 without Tier C HITL.** Architecture decision irreversible → expensive rollback.
3. **Phase 7 without state persistence.** Session restart loses context → wasted work.
4. **No retrospective (Phase 8).** Lessons not captured → repeat mistakes.
5. **Treating CLA as one-shot.** Each X iterates Agent OS — capabilities depend on each other.

## Open questions

- OQ-CLA-1: Cost-bucket cho CLA itself (founder time per X workflow)?
- OQ-CLA-2: Capability deprecation flow (when superseded, how to safely remove)?
- OQ-CLA-3: Cross-capability dependency graph (capability A depends on B's deployment)?
- OQ-CLA-4: Public capability marketplace (open-source after Maturity Level 4)?
- OQ-CLA-5: Auto-detection of capability proposal in voice notes (vs manual classification)?

---

**Bài #20 = bridge giữa "Agent OS architecture" (chương 1-32) và "Agent OS operations" (Wave 1+ founder usage). Without Bài #20, every X = ad-hoc. With Bài #20, X = standardized package install.**

---

## v1.0 update (2026-05-15) — `/cla` command shipped

The 8-phase workflow above is now operationalised by the `/cla` slash command
(`.claude/commands/cla.md`). Two changes vs. the original spec:

1. **Phase 0 (Drift Pre-Flight) added** — runs `pnpm check` before any LLM
   work, generates the slug, creates `.archives/cla/<id>/` from
   `_TEMPLATE/`, INSERTs `ops.capability_runs` row, appends to
   `knowledge/capability-registry.yaml`. Phase 0 is inline in the command,
   not a skill. Aborts cleanly if drift is detected.

2. **`.archives/cla/<id>/` is the working location; canonical specs are
   promoted to `wiki/capabilities/<id>/` in Phase 8.** The original spec
   wrote everything to `wiki/capabilities/<id>/` directly. This violated
   the workspace plane discipline in CLAUDE.md (wiki = synced reference;
   `.archives/` = local working scratch). v1.0 fixes by:
   - Phases 1-7 write to `.archives/cla/<id>/` (local-only).
   - Phase 8 `catalog-updater` promotes `spec.md` + `retrospective.md` to
     `wiki/capabilities/<id>/` once state advances to `operating`.
   - The `.archives/cla/<id>/` folder stays local for retrospective context
     (not deleted post-promotion).

Other v1.0 additions:
- CxO routing in Phase 2 via `knowledge/cla-routing-keywords.yaml`
  (9 routes → CxO + fallback role).
- Parallel CxO polling in Phase 4 (top-2 options × max-3 chiefs).
- `@cto` sanity review + Muse `high-stakes-decision-panel` in Phase 5.
- Multi-session resume via `state_payload.completed_sprints` in Phase 7.
- Drift gates at Phases 0/3/5/8.

See `.archives/cla/PLAN.md` (local-only) for the full v1.0 plan and the
PR series #23 / #24 / #25 that shipped it.

---

## v1.1 update (2026-05-15) — `/cla` evolution sub-flows shipped

Resolves **OQ-CLA-2** (capability deprecation flow) plus adds 4 right-sized
update workflows for operating capabilities. Capability `cla-update-mechanism`
is the first non-meta capability built via Approach E (use `/cla` on itself).

### New surfaces

| Trigger | Purpose | HITL | SOP |
|---|---|---|---|
| `/cla fix <id>` | Bug fix — light delta | B | `SOP-AIOPS-001-fix/` |
| `/cla extend <id>` | Scope expansion — auto-escalates Tier C if substantial | B → C | `SOP-AIOPS-001-extend/` |
| `/cla revise <id>` | Architecture revision — full ceremony | C | `SOP-AIOPS-001-revise/` |
| `/cla tune <id>` | KPI re-tuning — registry edit only | B | `SOP-AIOPS-001-tune/` |
| `/cla deprecate <id>` | Sunset capability + cleanup (resolves **OQ-CLA-2**) | C | `SOP-AIOPS-001-deprecate/` |
| `/cla history <id>` | Lineage chain timeline | A | (read-only — `ops.v_capability_lineage`) |
| `/cla force-unlock <id>` | Break stuck update lock | **D-Std** | (lock break ceremony) |
| `@cla` | Subagent for mid-conversation invocation | inherited | — |

### New infrastructure

- **Migration 00025** — `update_lock_session_id` + `update_lock_acquired_at`
  + `version` columns on `ops.capability_runs`. Helper functions:
  `capability_acquire_update_lock()`, `capability_release_update_lock()`.
  View: `ops.v_capability_lineage` (recursive supersedes_id chain).
- **2 new skills** — `dependency-scanner` (deterministic; scans
  `wiki/capabilities/*/spec.md` for cross-references; mandatory blocker
  in `:deprecate`) + `version-bumper` (pure semver helper; per-sub-flow
  bump rules).
- **8 existing skills extended** with `## Mode awareness (v1.1)` subsection
  mapping each sub-flow mode to skill behavior.
- **Spec versioning convention**: `wiki/capabilities/<id>/spec.md`
  always-current; prior versions archived as `spec-v<X.Y.Z>.md`.
- **Lineage chain**: NEW `ops.capability_runs` row per update, with
  `supersedes_id` pointing to prior. Original state → `'superseded'`.
  Deprecation terminal state is `'deprecated'` (NOT `'superseded'`).
- **Concurrency lock**: 24h auto-expiry on read; founder `/cla force-unlock`
  override (Tier D-Std magic phrase per HITL.md).

### Updated phases (per sub-flow)

Sub-flows execute subsets of the original 8 phases plus new Phase 0
(pre-flight + lock acquisition):

| Sub-flow | Phases executed |
|---|---|
| `:fix` | 0, 1-delta, 7, 8-light |
| `:tune` | 0, 1-delta, 8-tune |
| `:extend` | 0, 1-delta, 3 (with dep scan), 5-delta, 6, 7, 8 |
| `:revise` | 0, 1-delta, 3, 4, 5 (always Tier C), 6, 7, 8 |
| `:deprecate` | 0, 1-delta, 3 (mandatory dep scan), 8-deprecate |

`/cla propose` (v1.0) remains the path for NEW capabilities (full Phase 0-8).

### Auto-classification logic

- `:extend` Phase 5 architect classifies the spec.md diff:
  - Light (≤ 20% lines, no Section 4 component changes) → Tier B
  - Substantial (> 20% lines OR component add/remove) → auto-Tier C with
    full ceremony (@cto + Muse panel)
- `@cla update <id> <description>` LLM-classifies the description into
  fix/extend/revise; states classification before proceeding; refuses if
  ambiguous.

### Cost projection (cumulative across update sub-flows)

| Sub-flow | Per-invocation LLM cost | Founder time |
|---|---|---|
| `:tune` | ~$0.10 | ~10 min |
| `:fix` | ~$0.50 | 30 min - 2h |
| `:deprecate` | ~$0.30 | ~30 min |
| `:extend` | ~$1.50 (~$3 if escalated to C) | 2-4h or 1 week |
| `:revise` | ~$3-5 | 1-2 weeks |

All update sub-flows use `ai-ops-cla` cost-bucket (shared with parent
capability).

### Resolved Bài #20 open questions

- **OQ-CLA-2** (deprecation flow) — resolved by `/cla deprecate` sub-flow
  with mandatory dependency scan + schedule cleanup + Tier C ceremony +
  terminal `'deprecated'` state.

Other open questions (OQ-CLA-1 cost-bucket detail, OQ-CLA-3 cross-cap
dependency graph, OQ-CLA-4 capability marketplace, OQ-CLA-5 voice-note
auto-detect) remain open per current scope.

See `.archives/cla/cla-update-mechanism/spec.md` (local-only) for the
full v1.1 spec and PR series #26 / #27 / #28 that shipped it.

## v1.2.0 — Brain + Resolver mechanism (2026-05-25)

Direct hand-applied extension (not via `/cla extend` ceremony — founder
request to fix mechanism gap surfaced same day as `gbrain-operational-brain`
v1.0 promoted to operating). Retroactive `/cla extend` trail in commit
message + this changelog entry.

### Problems closed

**Gap 1 — Brain decision was implicit.** Phase 5 architect generated specs
without a structured brain-integration decision. Brain READ/WRITE for the
*built capability* depended on architect's memory + judgment, not a forced
checkpoint. Risk: capabilities that would benefit from brain READ silently
skipped it; capabilities that produced valuable knowledge artifacts never
wrote them to brain.

**Gap 2 — Resolver catalog drift required manual sync.** Phase 8 catalog-
updater updated `wiki/capabilities/CATALOG.md` + `knowledge/capability-
registry.yaml` but did NOT regenerate `knowledge/recipients/*.md`. New
skills/commands/agents/SOPs/schedules/hooks from a fresh capability did
not appear in the Mode A ambient catalog until founder ran `node scripts/
resolver-v2/sync.cjs --apply` by hand. `pnpm check` flagged the drift but
didn't auto-fix.

**Gap 3 (latent) — `sync.cjs` only wired 5 of 16 recipient kinds.**
`catalog-generator.cjs` had generator functions for all 16 kinds (added
in resolver v2.1 + v2.2) but `sync.cjs` main()'s default `targetKinds`
list and inline `generators` tables in `diffCatalog` / `runApply` only
referenced the original 5 (skill, command, agent, persona, mcp). Test:
`node scripts/resolver-v2/sync.cjs --kind=sop --dry-run` crashed.

### Changes

| Surface | Change | Tier |
|---|---|---|
| `scripts/resolver-v2/sync.cjs` | Wire all 16 kinds via shared `ALL_GENERATORS` constant + import `CONFIG` from `catalog-generator.cjs` for filename mapping (handles irregular plurals: `capability`→`capabilities.md`, `external-source`→`external-sources.md`). Default `targetKinds` = 16. | B (bug fix) |
| `scripts/resolver-v2/catalog-generator.cjs` | Export `KINDS` + `CONFIG` for sync.cjs consumption. | B |
| `06-ai-ops/skills/capability-lifecycle/architect/SKILL.md` | Insert Step 2.5 (brain-integration decision, REQUIRED) between Step 2 (per-Bài-toán impact) and Step 3 (generate spec.md). 3-question rubric → 5 possible outputs. New row in per-Bài-toán table: `20.1 / Brain integration / none\|read\|read+write\|write`. | B |
| `06-ai-ops/skills/capability-lifecycle/catalog-updater/SKILL.md` | Insert Step 6.5 (regenerate resolver v2 catalog, REQUIRED) between Step 6 (boilerplate patterns) and Step 7 (final `pnpm check`). Calls `node scripts/resolver-v2/sync.cjs --apply`. Idempotent. Failure handling: lock → retry once + abort; generator error → abort + log. | B |
| `knowledge/capability-registry.yaml` | Version 1.1.0 → 1.2.0. Description updated. | B |

### Downstream effects

- Any new capability launched after v1.2.0 will receive a forced brain
  decision (Step 2.5) — captured in spec.md § 5.X.
- Phase 8 will regenerate all 16 recipient catalogs idempotently before
  the final drift gate, closing the resolver-v2-coverage validator gap.
- `--kind=<any of 16>` now works in `sync.cjs` for ad-hoc operator use.

### Skipped vs full /cla extend ceremony

Direct hand-application chosen because:
- Total surface = 5 files; pure additive (no removals, no schema changes).
- Step 2.5 + Step 6.5 are docs-level mechanism additions, not new code.
- `sync.cjs` patch fixes a pre-existing bug (was always intended to cover
  all kinds — see catalog-generator.cjs KINDS array).
- All Tier B per `governance/HITL.md`; founder reviews via PR.

Audit trail: commit message references this changelog. No `ops.decisions`
row written (Tier B doesn't require). No `ops.capability_runs` row written
(no formal `/cla extend` session). If full discipline retroactively desired,
a separate `/cla fix capability-lifecycle-architecture` session can record
the run; for now this changelog block IS the trail.

