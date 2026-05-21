# TODOS

Project-level deferred work. Append-only; do not delete completed items —
move to a `## Done` section instead.

## P2 — 00-core stubs awaiting graduation (capability core-redesign-and-command v1.0.0)

Each stub has explicit `entry_condition` in frontmatter. When triggered, run
`/core fill <slug>` to graduate stub → v0.1-draft (or canonical). Tracked here
for founder weekly review (`SOP-FOUNDER-014`).

### 00-core/glossary.md
- **Status**: stub
- **Entry condition**: First 10 SOPs land (vocabulary stabilized via real usage)
- **Trigger**: SOP count in 03-gtm + 04-product + 05-customer ≥ 10 total
- **Action when fires**: `/core fill glossary` — interactive AskUserQuestion-based fill of 15-30 canonical terms
- **Why deferred**: pre-PMF vocabulary unstable; codifying now risks contradicting downstream experience

### 00-core/design-system.md
- **Status**: stub
- **Entry condition**: First marketing visual needed AND `brand-tokens.yaml` exists
- **Trigger**: first paid campaign OR blog post requiring branded visual OR landing page redesign
- **Action when fires**: build `brand-tokens.yaml` first (see below), then `/core fill design-system`
- **Why deferred**: product UI design system separate (omg/ritsu/.omgkit/design/); company design system earns existence when first multi-channel visual needed

### 00-core/wedge.md
- **Status**: stub
- **Entry condition**: SOP-PRODUCT-002 (N=10 strangers observed using product) complete
- **Trigger**: `ops.sop_runs WHERE sop_slug = 'SOP-PRODUCT-002' AND state = 'completed'`
- **Action when fires**: `/core fill wedge` — based on N=10 observed usage data
- **Why deferred**: PG gate enforced — wedge is DISCOVERED not declared; filling pre-N=10 = guessing

### 00-core/pricing-philosophy.md
- **Status**: stub
- **Entry condition**: First SOP-PRODUCT-010 (pricing-pull-test) executes
- **Trigger**: `ops.sop_runs WHERE sop_slug = 'SOP-PRODUCT-010' AND state = 'completed'`
- **Action when fires**: `/core fill pricing-philosophy` — based on first pricing experiment results
- **Why deferred**: pricing principles need evidence from first pricing experiments

### 00-core/operating-cadence.md
- **Status**: stub
- **Entry condition**: Cofounder formal join OR 50 paying users
- **Trigger**: cofounder agent definition active OR `ops.kpi_snapshots paying_users ≥ 50`
- **Action when fires**: `/core fill operating-cadence` — daily/weekly/monthly/quarterly rhythm
- **Why deferred**: solo founder = cadence in head + 09-founder/weekly-review; codifying matters when 2+ people coordinate

### 00-core/decision-rights-narrative.md
- **Status**: stub
- **Entry condition**: Cofounder formal join
- **Trigger**: cofounder agent definition active
- **Action when fires**: `/core fill decision-rights-narrative` — narrative layer above HITL.md
- **Why deferred**: solo founder = founder decides; narrative layer earns existence at 2+ humans

## P2 — Soon

### knowledge/design-tokens/brand-tokens.yaml (precursor to 00-core/design-system.md)

Lightweight design-system v0 — machine-readable color/font/spacing tokens.
`/core design-system:build` (Phase 2 verb) consumes this to generate company
output assets (slide templates, social cards, email signatures, ad layouts).

**Why**: precursor to 00-core/design-system.md graduation. Earns existence at
first marketing visual need.

**Pros**: machine-readable; can ship before full design-system.md is written.
**Cons**: deferred per Sprint 1 brainstorm right-size (Reviewer Concern: not
blocking 30-day push; trigger = first marketing visual).
**Effort**: S (CC ~30 min)
**Priority**: P2 — when first marketing visual needed
**Depends on**: none (can start anytime)
**Surfaced from**: capability core-redesign-and-command brainstorm 2026-05-21

### Hook runtime implementation (covers all 10 hook specs incl. persona hooks)

### Hook runtime implementation (covers all 10 hook specs incl. persona hooks)

All hooks in `.claude/hooks/*.md` are SPECS — markdown documentation of intended behavior. **None execute at runtime.** Per `.claude/hooks/README.md`: "This folder contains **specs** for hooks at v0.2. Implementation (actual executable code) happens in Phase C of `_build/ROADMAP.md`."

Affected hooks (10 total):
- 8 pre-existing: `pre-bash-dangerous`, `pre-delegate-check`, `pre-edit-tier1`, `pre-llm-call-budget`, `pre-tool-customer-message`, `pre-tool-publish`, `pre-tool-secrets`, `pre-tool-supabase-product`
- 2 new (added by workforce Phase 1, PR #19): `pre-persona-resolve`, `post-persona-log`

**Consequences of unwired runtime:**
- `ops.agent_runs.persona_slug` column (migration 00024) exists but stays NULL — `post-persona-log` is supposed to populate it.
- `06-ai-ops/workforce-personas/<slug>/dossier.md` files stay at empty stubs — `post-persona-log` is supposed to append entries.
- HITL tier classification of actions is on the honor system — `pre-delegate-check` is supposed to enforce.
- The 5 invariants in `validate-personas.cjs` still enforce drift via `pnpm check`, so static state stays consistent. Only runtime state (persona_slug + dossier) is missing.

**What's needed to close the gap:**
1. Pick implementation language per SPEC.md (Python or TypeScript; "whichever the team picks first; don't mix per-hook").
2. Implement each `.md` spec as a script in same folder. Input: JSON via stdin. Output: JSON via stdout (per SPEC.md §Input/Output).
3. Add `.claude/settings.json` with hook entries pointing to the script paths.
4. Test with `claude --debug` to verify hooks fire on tool calls.
5. Add hook-test fixtures in `tests/hooks/`.

**Why:** Currently every governance rule (HITL tiers, budget caps, persona narrowing, Tier 1 edit gating) is on the honor system. Hooks are the difference between "agents should follow HITL.md" and "agents cannot violate HITL.md."
**Pros:** Eliminates trust requirement on agents. Activates the persona_slug audit trail. Auto-populates dossier.md files.
**Cons:** ~3-5 hours engineering work per hook (10 hooks total = ~30-50h). Tests need real Claude Code session fixtures. Hook errors can hard-block agent if not careful — needs fail_mode=open default during rollout.
**Effort:** L (full implementation), M (per-hook MVP)
**Priority:** P2 — the static validators provide most of the safety today. Runtime hooks are the proper enforcement; workaround is human review at PR/Telegram time.
**Depends on:** Phase C of `_build/ROADMAP.md` (not yet authored)
**Surfaced from:** workforce Phase 1.5 hardening review 2026-05-15

---

### Migrate 2 pre-contract SOPs to flow-schema.yaml conformance

`05-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/flow.yaml` and `06-ai-ops/sops/SOP-AIOPS-002-cross-tier-consistency/flow.yaml` (paths post Phase 2 rename) predate SOP-AIOPS-003 runtime contract. Both currently fail validation by SOP-AIOPS-004 smoke test.

**Why:** These SOPs work today but would fail CI gating once SOP-AIOPS-004 is wired to `pnpm check`. Either migrate them to the schema, or document an explicit exemption in the validator.
**Pros:** Brings full repo to single contract. Removes "two formats" cognitive load.
**Cons:** Touches working code. Requires understanding existing flow.yaml semantics.
**Effort:** S (CC ~30 min for both)
**Priority:** P2 — not blocking pillar restructure, but blocking CI gating of new SOPs.
**Depends on:** Phase 2 of pillar architecture v1.0.1 migration (rename 05-ai-ops → 06-ai-ops)
**Surfaced from:** /plan-eng-review 2026-05-15 (pillar architecture v1.0.1, validator first run)

---

### Update ops.campaigns.pillar default value (was '01-growth')

`supabase/migrations/00018_orchestration_storage_growth.sql` line 64 sets `pillar text NOT NULL DEFAULT '01-growth'`. After pillar architecture v1.0.1 migration, '01-growth' is deprecated. New campaigns inserted without explicit pillar value get a deprecated value.

**Why:** Currently no production campaigns (0 paying users), so no real data corruption today. But before launching marketing operations, fix the default.
**Pros:** Prevents silent default-to-deprecated-value bug at scale.
**Cons:** Requires a new migration. Needs decision on new default value (likely '03-gtm' for stage-pillar-owned campaigns, or '01-marketing' for evergreen-owned).
**Effort:** S (CC ~15 min for migration + decision)
**Priority:** P2 — pre-launch, before first campaign created.
**Depends on:** Phase 2 of pillar architecture v1.0.1 migration
**Surfaced from:** /plan-eng-review 2026-05-15 (post-eng-review scan, retroactive Eng E6)

---

### E5 — Pre-edit linkage warning hook
Extend `.claude/hooks/pre-edit-tier1.md` to read `knowledge/cross-tier-invariants.yaml`
and warn when the file being edited has linked invariants. Format: "this file is
linked to X, Y, Z via invariants A, B, C — consider checking them after your edit."

**Why:** Catches drift BEFORE commit, earlier than L1/L2/L3 sweeps. Zero token
cost, zero runtime overhead.
**Pros:** Earliest possible detection point. Educative — shows linkage graph
during edit.
**Cons:** Only fires when agent reads the hook; humans editing directly don't
benefit. Limited scope.
**Effort:** S (CC ~15 min)
**Priority:** P2
**Depends on:** v1.0 ship (needs `cross-tier-invariants.yaml` to exist)
**Surfaced from:** /plan-ceo-review 2026-05-14 (cross-tier consistency engine)

---

### F1 — Drift weekly retro skill
New skill `drift-weekly-retro` in `06-ai-ops/skills/`. Aggregates
`ops.consistency_checks` over past 7 days. Outputs: most-drifting invariants,
average MTTD, false-positive rate, recurring patterns suggesting architectural
refactor. Posts to Telegram + appends to `_build/notes/`.

**Why:** Turns operational data into architectural insight. Drift patterns
reveal coupling problems worth refactoring upstream.
**Pros:** Compounds value of the consistency engine. Makes systemic problems
visible.
**Cons:** Only valuable after 30+ days of data. Premature to ship before then.
**Effort:** M (CC ~30 min)
**Priority:** P3
**Depends on:** v1.1 ship + 30 days runtime
**Surfaced from:** /plan-ceo-review 2026-05-14

---

### F4 — Telegram PR approve/reject UX
Build inline Telegram buttons on drift-fix PR notifications: `[Approve & merge]`
`[Reject]` `[View diff]`. Bot calls gh CLI to action the PR.

**Why:** Founder ergonomic for PR review without leaving Telegram.
**Pros:** True "30-second review" experience promised in vision.
**Cons:** GitHub mobile is already excellent. Building this only worthwhile if
PR volume grows past ~5/day. Most likely permanent-deferred.
**Effort:** L (CC ~1h)
**Priority:** P3
**Depends on:** PR volume exceeding manual-review capacity (unlikely v1.x)
**Surfaced from:** /plan-ceo-review 2026-05-14

---

### MCP-1 — Wire pre-tool-supabase-product hook to inspect official plugin calls
The `.claude/hooks/pre-tool-supabase-product.md` spec currently only matches
tool name patterns. If the founder ever auths the official Supabase plugin
(`mcp__supabase__*`) to BOTH Product (`ixfvqxnohlmayzuesrrq`) and Operating
(`mntobbmieuoaxipnjaau`) projects, the hook needs to inspect the project_ref
parameter and block any call targeting Product. The shim only protects
`mcp__supabase-ops__*` paths.

**Why:** Defense in depth — supabase-ops shim blocks the dangerous path for
governed skills, but ad-hoc plugin calls bypass it.
**Pros:** Closes the only known gap in the project-ref allowlist coverage.
**Cons:** Hook needs runtime first (TODOS P2 § "Hook runtime implementation").
**Effort:** S (CC ~30 min once hook runtime exists)
**Priority:** P2
**Depends on:** Hook runtime implementation
**Surfaced from:** /plan-eng-review 2026-05-16 (MCP Phase 1)

---

### MCP-2 — validate-mcp-tools-skill-refs.cjs cross-tier validator
Build `scripts/cross-tier/validate-mcp-tools-skill-refs.cjs` and wire to CI.
For every `06-ai-ops/skills/*/SKILL.md` `allowed-tools:` entry matching
`mcp__supabase-ops__*`, assert the tool exists in `knowledge/mcp-tools.yaml`
with `server: supabase-ops`. Also assert the calling skill is referenced by
some role's allowlist (cross-check governance/ROLES.md).

**Why:** Prevent silent drift — a skill referencing a non-existent tool name
would only fail at runtime.
**Pros:** Catches MCP drift in CI; symmetric to existing validators in
`scripts/cross-tier/`.
**Cons:** Need to parse SKILL.md YAML frontmatter properly.
**Effort:** M (CC ~1h)
**Priority:** P2
**Depends on:** none
**Surfaced from:** /plan-eng-review 2026-05-16 (MCP Phase 1)

---

### MCP-3 — Switch from tsx to pre-built dist/ if cold-start > 500ms
Phase 1 uses `npx -y tsx mcp-server/src/server.ts` for zero-build dev ergonomics.
If session-startup latency becomes annoying (anything > 500ms felt), switch
`.mcp.json` to point at `node mcp-server/dist/server.js` and add a build step
to the bootstrap script.

**Why:** Faster Claude Code session starts.
**Pros:** ~3-5× faster MCP cold start.
**Cons:** Adds a build step; needs CI to publish dist/ or have devs build locally.
**Effort:** S (CC ~30 min)
**Priority:** P3
**Depends on:** Observed slowness (anecdotal)
**Surfaced from:** /plan-eng-review 2026-05-16 (MCP Phase 1)

---

### MCP-4 — Periodic audit-row-presence alert
Add a `kpi-snapshots` cron (or `scheduled-run-dispatcher` entry) that confirms
≥1 row added to `ops.mcp_calls` per day per active role. Alert via
`ops.alerts` (rule_id=`mcp_audit_pipeline_silent`, severity=warning) if any
active role goes 24h with no audit rows.

**Why:** Detect silent audit failure. Phase 1 is fail-open — without this,
audit could be broken for days unnoticed.
**Pros:** Closes the obvious observability gap of the fail-open design.
**Cons:** Need to define "active role" — count of agent_runs in last 7d?
**Effort:** S (CC ~45 min — one cron + one rule + one alert handler)
**Priority:** P2
**Depends on:** none (uses existing ops.alerts infrastructure)
**Surfaced from:** /plan-eng-review 2026-05-16 (MCP Phase 1)

---

### MCP-5 — Phase 1.5: add update/upsert/delete tools with stricter HITL
Skills like `cost-optimization-review` and capability lifecycle may need
UPDATE for marking recommendations as applied or capability_runs phase
transitions. Phase 1 ships INSERT only. Phase 1.5 adds:
- `update` (Tier C default — every update is approve-before unless role overrides)
- `upsert` (Tier C default)
- `delete` (Tier D-Std default — never autonomous)

**Why:** Closes the read+insert-only gap so skills don't need direct
`supabase db query --linked` for state transitions.
**Pros:** Reduces founder manual-CLI burden for routine UPDATE patterns.
**Cons:** Higher blast radius; requires careful per-table HITL mapping.
**Effort:** M (CC ~2h — handlers + sql-guard for UPDATE/DELETE + tests)
**Priority:** P2
**Depends on:** Phase 1 in production, real demand from a specific skill
**Surfaced from:** /plan-eng-review 2026-05-16 (MCP Phase 1)

---

### CLA-MCP-1 — system-inventory-scanner: switch to Phase 1 paths

`06-ai-ops/skills/capability-lifecycle/system-inventory-scanner/SKILL.md:49-51`
Step 5 reads `mcp/servers.yaml` (legacy Bài #12 design path that was never
created). After Phase 1 (PR #29), the canonical sources are:
- `.mcp.json` at repo root — registered MCP servers from Claude Code's POV
- `knowledge/mcp-tools.yaml` — registered tools + role_scope + tier_default
- `mcp-server/` — actual server source (presence = supabase-ops live)

Same file lines 105 + 161 also reference `mcp/servers.yaml`; update all three.

**Why:** When `/cla propose` runs Phase 3 on a capability that needs MCP
integration, it will currently miss the live shim entirely and report "MCP
layer not configured" — wrong, would lead architect (Phase 5) to design a
duplicate server.
**Pros:** Future capabilities correctly enumerate existing tools and reuse
`mcp__supabase-ops__query/insert` instead of recreating.
**Cons:** Minor edit, low risk; ~15 min CC. Side effect: a smoke test of CLA
Phase 3 should be run before next `/cla propose`.
**Effort:** S (CC ~15 min)
**Priority:** P2 — block first `/cla propose` that touches MCP
**Depends on:** none
**Surfaced from:** founder Q on /cla integration with MCP, 2026-05-16

---

### CLA-MCP-2 — architect: update Bài #12 impact mapping path

`06-ai-ops/skills/capability-lifecycle/architect/SKILL.md:42`
Row 12 of Bài-toán impact table says "MCP | mcp/servers.yaml entry". After
Phase 1, the impact for a capability needing MCP integration is:
- **Use existing tool**: declare in skill `allowed-tools:` (no architect work)
- **Extend shim**: add tool entry to `knowledge/mcp-tools.yaml` + handler to
  `mcp-server/src/tools/<name>.ts` + test under `tests/mcp-server/`
- **New external MCP server** (not supabase-ops): add to `.mcp.json` + write
  the server source (Phase 2 semantic tools may also fit here)

Architect's `mcp-configs/` draft folder convention from line 73 is still OK
conceptually but should output to the 3 destinations above, not a stub
`mcp/servers.yaml`.

**Why:** Without this, architect generates dead artifacts when a capability
needs MCP work — drafts at wrong paths that nothing reads.
**Pros:** Architect's `spec.md` template stays accurate; sprint-planner can
consume drafts correctly.
**Cons:** ~20 min CC; need to choose template format for the 3 paths.
**Effort:** S (CC ~20 min)
**Priority:** P2 — block first `/cla propose` that proposes a new MCP tool
**Depends on:** CLA-MCP-1 (path conventions consistent)
**Surfaced from:** founder Q on /cla integration with MCP, 2026-05-16

---

### CLA-MCP-3 — sprint-planner: 3-path MCP work classification

`06-ai-ops/skills/capability-lifecycle/sprint-planner/SKILL.md:42, 53, 220`
Section 4.5 + topological sort currently treats "MCP work" as one bucket
("new MCP server THIRD"). Post-Phase 1, MCP work has 3 distinct paths with
different effort + risk:

| Path | Sprint cost | Risk | Examples |
|---|---|---|---|
| **A. Use existing tool** | 0 (just skill frontmatter) | Low | new skill that reads `ops.tasks` |
| **B. Extend supabase-ops shim** | S-M | Low (1 file + 1 test) | add `update` tool to Phase 1.5 |
| **C. New external MCP server** | L | High (server lifecycle) | Discord MCP, GitHub MCP, etc. |

Sprint-planner should classify and order:
- A → no MCP sprint phase needed
- B → 1 sprint phase (extend shim BEFORE skills that use it)
- C → multi-sprint (server scaffold → tools → auth → skills)

Currently treats all 3 as Path C, inflating estimates and risk for trivial
Path A capabilities.

**Why:** Right-sizing CLA sprint plans — currently any capability touching
MCP gets the full-server-build treatment.
**Pros:** Faster CLA workflow for capabilities that only consume MCP.
**Cons:** Template changes need example flow per path; ~30 min CC.
**Effort:** S (CC ~30 min)
**Priority:** P2 — block when first `/cla propose` reaches Phase 6
**Depends on:** CLA-MCP-1, CLA-MCP-2 (consistent classification)
**Surfaced from:** founder Q on /cla integration with MCP, 2026-05-16

---

### CLA-MCP-4 — cla.md line 69: clarify shim is the audit insert path

`.claude/commands/cla.md:69`
"INSERT row into `ops.capability_runs` (via supabase MCP)" — was design
intent in v1.0. After Phase 1 the supabase-ops shim is live; CLA Phase 1
problem-framer could literally use `mcp__supabase-ops__insert` to write the
capability_runs row instead of bash + `supabase db query --linked`.

To take this further: 10 CLA skills (`system-inventory-scanner`, `architect`,
`sprint-planner`, `catalog-updater`, `dependency-scanner`, `domain-analyst`,
`implementation-coordinator`, `options-generator`, `problem-framer`,
`version-bumper`) currently don't declare `mcp__supabase-ops__*` in their
`allowed-tools` frontmatter. Adding the declaration makes every CLA state op
audited automatically in `ops.mcp_calls`. Useful for debugging "why was CLA
Phase 5 slow last Tuesday."

**Why:** Observability for CLA workflow itself + dogfood the shim.
**Pros:** Every CLA write attributed in audit log; consistent path with
other skills.
**Cons:** Touches 10 skill files + cla.md prose; ~45 min CC. No functional
change (skills still do same work, just routed through shim).
**Effort:** M (CC ~45 min)
**Priority:** P3 — observability win, not a blocker
**Depends on:** CLA-MCP-1..3 (consistent baseline)
**Surfaced from:** founder Q on /cla integration with MCP, 2026-05-16

---

### CLA-FN-1 — `ops.capability_acquire_update_lock` fails when same capability has both `operating` and `implementing` rows

`supabase/migrations/00028_capability_lock_allow_implementing.sql` (function definition)

**Symptom (observed 2026-05-18T08:05Z during `/cla resume wiki-sync-from-refs`):**

```sql
SELECT ops.capability_acquire_update_lock(
  'wiki-sync-from-refs',
  'caf0cd84-af27-45e0-807d-e15912ebb926'
);
-- ERROR: query returned more than one row
```

**Root cause:** the function's UPDATE matches `WHERE capability_id = $1 AND state IN ('implementing', 'operating', 'deployed') AND update_lock_session_id IS NULL AND superseded_by_id IS NULL`. During an active revise sub-flow, the parent row (v3.0.0, `state='operating'`, `superseded_by_id IS NULL` because v4.0 hasn't promoted yet) AND the new in-flight row (v4.0.0, `state='implementing'`) BOTH match. The UPDATE locks both. Then `RETURNING id INTO v_row_id` fails because that's a scalar assignment and Postgres got 2 rows.

**Workaround used today:** direct `UPDATE ops.capability_runs SET update_lock_session_id = '<uuid>', update_lock_acquired_at = now() WHERE id = '<specific row id>'` via supabase CLI. Bypasses the broken function.

**Fix options:**

1. **Function update — accept `p_run_id` parameter.** Add an overload `ops.capability_acquire_update_lock(p_capability_id, p_session_id, p_run_id uuid DEFAULT NULL)`. When `p_run_id` is non-NULL, scope UPDATE to that specific row. When NULL, retain current behavior (which is fine for the create flow before any v2/v3 exists).
2. **Function update — prefer non-operating row.** Order the UPDATE selection by `(state = 'implementing') DESC` and use `LIMIT 1` semantics (PL/pgSQL: switch to SELECT FOR UPDATE + UPDATE BY id pattern).
3. **Caller responsibility — only call after marking parent superseded.** Forces the v3→v4 transition to set `superseded_by_id` early. Semantically wrong: v3.0 isn't truly superseded until v4 deploys.

**Recommended: option 1.** Minimum-disruption; preserves existing callers; gives revise sub-flow the precision it needs. Optional sweep on existing callers later.

**Why:** Blocks `/cla resume` and any future `/cla force-unlock` + re-acquire path during in-flight revisions. Will hit again every time a `/cla revise` resumes from a fresh session.

**Pros:** Solid fix; removes a real Bash + CLI workaround from the resume flow.
**Cons:** Migration file + adapter sweep in calling skills (where `mcp__supabase-ops__rpc` would be the natural call site).
**Effort:** M (CC ~30-45 min — write migration, update problem-framer skill's lock-acquire snippet, update `/cla` doc).
**Priority:** P2 — manifested during real founder use today; not catastrophic (workaround exists) but disrupts the audited path.
**Depends on:** none.
**Surfaced from:** `/cla resume wiki-sync-from-refs` 2026-05-18; force-unlock + re-acquire ceremony; audit_log id `e6f5e17b-6db6-466f-a616-0907dcaf1213`; capability v4 row id `f75502d4-c7b2-44c1-86a5-395b4578f93d`.
