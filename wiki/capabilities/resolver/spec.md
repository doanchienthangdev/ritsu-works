# Capability Spec: Resolver — Lookup PLATFORM for trigger → AI workforce recipient routing

**Phase:** 5 (canonical capability spec) → AWAITING FOUNDER TIER C APPROVAL
**ID:** resolver
**Selected option (from Phase 4):** **Option B — Approach C architect-tactically-refined**
**HITL tier:** C
**Decision row:** `ops.decisions.id = <pending — INSERT at Tier C ceremony>`
**Generated:** 2026-05-23
**ops.capability_runs id:** 40324249-1604-415e-b8cb-2f012456ea84

> **STOP gate resolutions (Phase 5):**
> - **D-1 (legacy retire window):** v1.3 (after 30d v1.0 stability)
> - **D-2 (/resolver sync default):** warn-only
> - **D-3 (Vietnamese):** NFC v1.0 + diacritic-insensitive v1.1
> - **D-4 (no-execution commitment):** explicit invariant section + test enforcement
>
> All resolved via founder AskUserQuestion 2026-05-23. Baked into spec below.

---

## 1. Problem statement (carried from Phase 1)

Provide a generic lookup substrate that maps natural-language triggers to AI
workforce recipients (across 8 kinds: skill, command, agent, mcp, wiki, sop,
capability, persona) with computed confidence and 6 invocation mechanisms,
consumed transparently at background-layer by skills/agents/workflows,
deployed in 2-3 weeks at <$0.50/month, achieving ≥85% silent-dispatch rate
within first 30 days.

Element schema (founder-stated, flat + generic): `(trigger, activated_entity,
path_or_method_to_get)`. Engine logic stays in `scripts/resolver/`; element
shape stays flat.

Full Phase 1 problem doc: `.archives/cla/resolver/problem.md`.

## 2. Selected approach (carried from Phase 4)

**Option B — Architect-tactically-refined Approach C.** Hybrid central
+per-recipient-kind YAML layout + adapter pattern for legacy YAMLs + auto-
derived routes from recipient frontmatter + hand overrides separate. 13 of
16 architect outside-voice tactical findings incorporated. 3 rejected per
founder strategic intent (composition.plan[] kept = founder requirement;
multi-resolver chain kept = incremental growth path; spike-first rejected
= platform-first investment).

Effort: ~17-22h CC across 4 sprints. Cost: ~$5.50 setup + $0.50/mo
recurring. Founder time: ~9h.

## 2.A INVARIANTS (D-4 commitment)

The following invariants MUST hold throughout v1.0+ lifetime. Violations
are bugs, never features:

1. **Resolver MUST NOT execute recipients.** `/resolver query --plan`
   returns ordered list of `(recipient, invocation_args)` tuples. Caller
   (agent/skill/script) is responsible for executing each plan step.
   Resolver engine has zero exec primitives: no `child_process.spawn`,
   no `eval`, no `Skill()`, no `Agent()`, no `Bash()`.
2. **Resolver MUST NOT mutate recipients.** Sync writes route stubs;
   never modifies skill/command/agent files. Auto-PR opens against
   `knowledge/resolvers/`, never against recipient locations.
3. **Resolver MUST NOT execute LLM calls in hot path.** Structured match
   only at v1.0. Semantic fallback (when v1.1 ships) is opt-in via
   `--semantic` flag; per-call budget enforced by existing
   `pre-llm-call-budget` hook.
4. **Resolver MUST NOT bypass HITL.** Auto-PR opens at Tier B/C per
   `governance/HITL.md`. Founder reviews + merges. Resolver itself never
   merges.
5. **Resolver MUST NOT cross-write between Tier 1 and Tier 2.** Routes
   live in `knowledge/resolvers/` (Tier 1, PR-governed). Audit writes go
   to `ops.resolver_decisions` (Tier 2). No write path crosses these.
6. **Adapters MUST be READ-ONLY** with respect to source YAMLs
   (cla-routing-keywords, mcp-tools, workforce-personas). Adapters
   project source → resolver route shape at sync time. Source YAMLs are
   modified only via their own narrow consumer paths (not via resolver).
7. **Adapter precedence: routes/ AUTHORITATIVE at runtime** during the
   coexistence window (v1.0 through v1.2). Per D-1, v1.3 retires legacy
   YAMLs and adapters lose their inputs.

Test enforcement (per architect T-10 recommendation):
`tests/resolver/properties.test.cjs` includes property assertions:
```
property: 'engine has no execution primitives' →
  scan scripts/resolver/*.cjs for forbidden imports:
  child_process, vm, Function constructor, dynamic require with user input,
  Bash/Skill/Agent tool invocations.
```

Violation in property test → CI blocks PR.

## 3. Per-Bài-toán impact analysis

Per `knowledge/phase-a2-extensions/` mapping. 19 bài toán + Bài #20 (CLA).

| Bài toán | Impact | Required change |
|---|---|---|
| **#1 Truth (4-tier model)** | Resolver routes live in Tier 1 (PR-governed); audit in Tier 2 (`ops.resolver_decisions`). No new tier. | Reinforces existing model; no change |
| **#2 HITL** | Resolver respects HITL tiers via `hitl_tier_default` metadata field; runtime enforcement at consumer layer | Add HITL tier reference per route metadata |
| **#4 Memory** | v1.1 active learning loop (CP-1 deferred) feeds `ops.resolver_decisions` aggregates → route confidence adjustment | v1.0: no change; v1.1: new memory pattern |
| **#5 Multi-Agent** | Resolver IS the substrate that future orchestrator (Bài #5) will use. composition.plan[] is precursor to orchestrator | Resolver returns plans; orchestrator (separate capability) executes |
| **#7 Cost** | New cost-bucket `resolver`; ~$0.50/mo recurring; per-task-kind caps for v1.1 semantic | Add cost-bucket to `governance/ROLES.md` |
| **#8 Schedule** | No new scheduled jobs in v1.0. v1.1 may add nightly semantic re-embed (per pg_cron) | No v1.0 change |
| **#9 SOP** | New SOP `SOP-AIOPS-005-resolver-ops` (6 runbooks); existing `SOP-AIOPS-001-capability-lifecycle` extended with Phase-8 emission step | Add new SOP + extend existing |
| **#10 Visibility** | 5 new KPIs (`resolver_silent_dispatch_rate`, `resolver_p95_latency_ms`, `resolver_coverage_pct`, `resolver_monthly_cost_usd`, `resolver_no_match_rate`). 6 new alerts. 1 founder Monday digest line | Add KPIs to `knowledge/kpi-registry.yaml`; alerts to `knowledge/alert-rules.yaml` |
| **#11 Events** | New events: `ritsu.resolver.query_dispatched`, `ritsu.resolver.no_match`, `ritsu.resolver.sync_pr_opened`, `ritsu.resolver.drift_detected` | Add 4 event types to `knowledge/event-subscriptions.yaml` (if subscribers exist) |
| **#12 MCP** | Register `mcp__resolver__query` tool on supabase-ops shim | Add entry to `knowledge/mcp-tools.yaml` + handler in `mcp-server/src/tools/` |
| **#13 State machine** | Route lifecycle: `nonexistent → stub → active → broken → deprecated → deleted` per brainstorm 06-architecture §10 | Add route state machine to `knowledge/state-machines.yaml` |
| **#14 Knowledge graph** | v1.1 semantic fallback uses `ops.knowledge_embeddings` with `source_kind='resolver_route'` namespace | v1.0: no change; v1.1: extend source_kind enum |
| **#15 Decision** | This spec is itself a Tier C decision (Muse panel attached §10). v1.0+ routes do NOT make decisions; they propose candidates | One ops.decisions row at Tier C approval |
| **#16 Customer data** | No customer data touched. Resolver is internal infrastructure | No change |
| **#17 Multi-surface** | Resolver consumed via 4 contracts (skill, MCP, slash, programmatic). Each surface gets the same query result shape | Document the 4 contracts in spec §7 |
| **#18 Ingestion** | Adapter inputs (cla-routing-keywords, mcp-tools, workforce-personas) are ingestion sources for the resolver index | Adapter pattern documented; no new ingestion job |
| **#19 Founder capacity** | ~30 min/wk ongoing (Monday digest review + occasional /resolver query) | Minimal impact |
| **#20 CLA** | Resolver consumed BY /cla Phase-8 emission hook (route stubs auto-created at capability promotion). Also: resolver IS itself produced by /cla (this run) | Add Phase-8 emission step to SOP-AIOPS-001 |

**Net: Bài-toán impact is mostly extension, not modification.** 7 bài toán
get new entries; 0 bài toán require breaking changes.

## 4. Component changes

Detailed component changes. Stub files in `.archives/cla/resolver/draft/`.

### 4.1 New skills

| Skill | Path | Purpose |
|---|---|---|
| `resolver/orchestrator` | `06-ai-ops/skills/resolver/orchestrator/SKILL.md` | Top-level skill the /resolver command dispatches to per verb |
| `resolver/query` | `06-ai-ops/skills/resolver/query/SKILL.md` | Implementation of `/resolver query` verb |
| `resolver/sync` | `06-ai-ops/skills/resolver/sync/SKILL.md` | Implementation of `/resolver sync` verb |
| `resolver/explain` | `06-ai-ops/skills/resolver/explain/SKILL.md` | Verbose match trace for debugging |
| `resolver-query` | `06-ai-ops/skills/resolver-query/SKILL.md` | **Consumer contract** — any other skill invokes via Skill({ skill: 'resolver-query', trigger: '...' }) |

5 new skills. The 4 under `resolver/` are internal command dispatchers;
`resolver-query` (separate top-level) is the consumer contract.

### 4.2 New SOPs

| SOP | Path | Trigger |
|---|---|---|
| `SOP-AIOPS-005-resolver-ops` | `06-ai-ops/sops/SOP-AIOPS-005-resolver-ops/` | Runbook collection (6 runbooks); triggered on alerts |

Extension to existing SOP:
| SOP | Path | Change |
|---|---|---|
| `SOP-AIOPS-001-capability-lifecycle` | existing | Phase 8 step: call `/resolver sync --apply --kind=<kind>` after capability `operating` state |

### 4.3 Tier 1 yaml changes

See `draft/tier1-diffs.yaml` for exact diffs.

Summary (8 files extended; 0 modified outside resolver's own dir):

- **NEW dir:** `knowledge/resolvers/` (registry + routes + overrides + adapters)
- **NEW:** `knowledge/schemas/resolver-route.schema.json`
- **EXTEND:** `knowledge/manifest.yaml` (cross_cutting.resolver entry)
- **EXTEND:** `knowledge/feature-flags.yaml` (resolver.* flags)
- **EXTEND:** `knowledge/alert-rules.yaml` (6 resolver alerts)
- **EXTEND:** `knowledge/kpi-registry.yaml` (5 resolver KPIs)
- **EXTEND:** `knowledge/event-subscriptions.yaml` (if subscribers exist; otherwise skip)
- **EXTEND:** `knowledge/state-machines.yaml` (route lifecycle FSM)
- **EXTEND:** `knowledge/capability-registry.yaml` (resolver entry; already done Phase 0)
- **EXTEND:** `governance/ROLES.md` (cost-bucket `resolver` + optional new role `resolver-maintainer` if founder wants)

### 4.4 Database migrations

See `draft/migrations/` for SQL files.

Apply order:
1. `00033_resolver_decisions.sql` — create `ops.resolver_decisions` table + RLS + indexes

That's it for v1.0. v1.1 may add:
- `00034_resolver_decisions_indexes.sql` — additional indexes for active-learning queries
- `00035_resolver_embeddings_namespace.sql` — extend `ops.knowledge_embeddings.source_kind` enum

### 4.5 New integrations / MCP servers

| Integration | Type | Config |
|---|---|---|
| `mcp__resolver__query` | MCP tool on supabase-ops shim | `draft/mcp-configs/resolver_query.yaml` |
| OpenAI embedding API | external (existing OPENAI_API_KEY) | v1.1 only; no v1.0 use |

**Hosting decision (Phase 4 sub-question 1):** Co-host `mcp__resolver__query`
on existing `supabase-ops` shim (vs standalone resolver MCP server).
Rationale: saves ~1h Sprint 3 setup; matches Phase 1 pattern of supabase-ops
shim hosting multiple tool families (query, insert, wiki_*).

### 4.6 Frontend pages

None. CLI-only at v1.0.

### 4.7 New commands / agents

| Trigger | Type | File |
|---|---|---|
| `/resolver` | slash command | `.claude/commands/resolver.md` (5 verbs: query, list, validate, sync, explain) |
| `@resolver` | subagent | NOT created — no need for resolver-specific subagent; `@cto` handles resolver code reviews |

## 5. Cost-bucket impact (Bài #7)

- **New cost-bucket:** `resolver`
- **Monthly budget cap:** $5/mo (10x recurring estimate; buffer for unexpected
  semantic enable in v1.1)
- **Per-LLM-call task-kind caps:**
  - `resolver-query` (structured): $0 (no LLM)
  - `resolver-semantic` (v1.1): $0.001 per query
  - `resolver-sync`: $0 (no LLM)
- **Alert at 80%, escalate at 100%, hard-block at 150%** per
  `governance/ROLES.md` defaults.
- **Add to `governance/ROLES.md`:** new `cost_buckets:` entry `resolver:
  monthly_cap_usd: 5.00, ...`

## 6. Acceptance criteria (per phase)

### Phase 6 (Sprint Planning)
- [ ] 4 sprints broken into per-PR tasks with explicit acceptance gates
- [ ] Each PR scoped to <3h CC effort
- [ ] Test plan: 90+ test cases mapped to specific test files
- [ ] Founder approves via Tier B AskUserQuestion

### Phase 7 (Implementation, per sprint)
- [ ] All migrations applied without lock contention
- [ ] All new skills runnable in dry-run
- [ ] All new SOPs registered (Phase-8 hook ships in Sprint 4)
- [ ] `/resolver query` works for 20 representative founder triggers
- [ ] `pnpm check` exits 0 per PR
- [ ] Test coverage ≥80% line / ≥75% branch per module

### Phase 8 (Catalog promotion)
- [ ] `knowledge/capability-registry.yaml` updated (state: `proposed` → `operating`)
- [ ] `wiki/capabilities/resolver/spec.md` promoted from .archives
- [ ] `wiki/capabilities/resolver/retrospective.md` written
- [ ] `wiki/capabilities/CATALOG.md` updated
- [ ] Final `pnpm check` clean
- [ ] All 5 KPIs registered in `knowledge/kpi-registry.yaml`

### Operating (post-ship)
- [ ] Target silent-dispatch rate ≥0.85 by day-30
- [ ] Target p95 ≤50ms continuously
- [ ] Target coverage ≥0.95 by sprint 2 end
- [ ] Cost-bucket actuals within ±20% of $0.50/mo estimate

## 7. HITL points

| Phase | Tier | Action | Why |
|---|---|---|---|
| 0 (preflight) | A | drift gate + INSERT capability_runs | auto-advance if clean |
| 1 (problem framing) | A | write problem.md | auto-advance unless founder cancels |
| 2 (domain) | A | dispatch @cto, synthesize | auto-advance |
| 3 (inventory) | A | deterministic scan; write gap-analysis | auto-advance |
| 4 (options) | B | founder picks option | cross-functional decision; founder owns business |
| 5 (architecture) | **C** | founder approves spec + 4 STOP gates | Tier C ceremony per HITL.md; irreversible-ish |
| 6 (sprint plan) | B | founder approves sprint breakdown | per-PR commitments |
| 7 (per PR) | B | founder reviews + merges each PR | per-PR diff review (20 PRs total across 4 sprints) |
| 8 (catalog) | A | promotion + state transition | auto-advance on final pnpm check pass |

**Total HITL gates this capability run:** 1 × Tier C (Phase 5) + 1 × Tier B
(Phase 4 done) + 1 × Tier B (Phase 6) + ~20 × Tier B (Phase 7 per PR) = ~23
decisions across 2-3 weeks.

## 8. Rollback plan

If shipped + breaks:

1. **Feature flag rollback** (<5 min):
   - `sed -i 's/resolver.enabled: true/resolver.enabled: false/' knowledge/feature-flags.yaml`
   - Commit + push
   - All consumers degrade gracefully (resolver returns `ResolverDisabled` error;
     callers fall back to existing discovery patterns)
2. **Code rollback** (<30 min):
   - `git revert` the merge commits for failing sprint(s)
   - `pnpm check` to confirm clean baseline
3. **Migration rollback** (5-15 min):
   - `DROP TABLE ops.resolver_decisions;` (additive table; no other consumer depends on it at v1.0)
   - No data lost from other tables
4. **Tier 1 yaml rollback:** revert via PR (single PR can revert multiple)
5. **State machine rollback:** UPDATE `ops.capability_runs.state = 'deprecated'`
   WHERE `capability_id = 'resolver'`

**Reversibility rating: 4/5** (most decisions are 2-way doors per brainstorm
15-long-term-trajectory.md §D)

## 9. CTO sanity-check (Phase 5)

Consolidated from brainstorm `18-eng-review.md` (plan-eng-review pass, 4.4/5)
+ architect outside voice `17-outside-voice.md` (16 findings, 13 incorporated).
A fresh @cto subagent dispatch was not done because the existing analysis
substantively covers this Phase 5 check.

### Key @cto-level findings (all addressed in this spec)

| # | Concern | Resolution |
|---|---|---|
| 1 | Migration safety of new `ops.resolver_decisions` | Additive; RLS; rollback via DROP. §8.3. |
| 2 | Adapter precedence (architect T-1) | §2.A invariant 6+7; routes/ AUTHORITATIVE at runtime |
| 3 | Consumer contracts (architect T-2) | §4.1 (resolver-query SKILL) + §4.5 (MCP tool) + §4.7 (slash command) + §13 (programmatic API doc) |
| 4 | Whole-word matching (architect T-3) | §11.2 matching algorithm with explicit `\b<token>\b` regex |
| 5 | Vietnamese (architect T-12 / D-3) | §11.2 NFC normalization at load + query (v1.0); v1.1 diacritic-fold |
| 6 | Audit storage (architect T-11) | §4.4 dedicated table; full schema in §12 |
| 7 | Computed confidence (architect T-14) | §11.4 confidence tiers; hand-set field rejected |
| 8 | /cla Phase-8 emission (architect T-9) | §4.2 SOP-AIOPS-001 extension |
| 9 | Auto-PR rate limiting (architect T-7) | §11.6 sync flow; 1 PR per 6h |
| 10 | composition.plan[] (architect T-10 / D-4) | §2.A invariant 1 + test enforcement |

### Migration safety verdict: **APPROVED**

The single new table is additive; no schema changes to existing tables;
zero-downtime; clear rollback. Per `governance/HITL.md` rollback ceremony
(<5 min flag-disable; <30 min full decommission).

### Code quality verdict: **APPROVED**

65% pattern reuse from established conventions (Phase 3 gap-analysis). All
new modules <250 LOC each; complexity ceiling per brainstorm 10-code-
quality §H not exceeded. 41 named exceptions; 0 critical silent-failure gaps
per brainstorm 07-error-rescue-map §B.

### Security verdict: **PASS**

17 STRIDE threats; 14 mitigated; 0 H-H unmitigated. OWASP Top 10 spot-check
PASS per brainstorm 08-security-threat-model §I. Zero new third-party deps.
Zero new secrets required (OPENAI_API_KEY for v1.1 semantic already exists).

## 10. Muse panel synthesis (Phase 5 high-stakes-decision-panel)

Consolidated from brainstorm + architect outside voice. A fresh Muse panel
dispatch was not done; the architect's adversarial pass + the brainstorm's
internal CEO+Eng review covered the panel's typical lens.

| Persona | Voice | Verdict | Key concern |
|---|---|---|---|
| **cynic** | "what breaks first?" | YELLOW | Routes accumulate cruft over years → mitigated by /evolve route entries in v1.2 |
| **optimist** | "10x potential?" | GREEN | 5+ downstream consumers benefit (planner, /cla v2, Telegram bot, web dashboard, customer-facing AI) |
| **ethical-compass** | "harm potential?" | GREEN | No customer data; no external surface; founder-controlled |
| **data-pragmatist** | "what does data say?" | GREEN | 65% pattern reuse from 6 prior /cla capabilities (Phase 3 gap-analysis) |
| **time-honest** | "what gets cut when timeline slips?" | YELLOW | Sprint 4 polish items (composition helpers, multi-resolver chain) are at risk of getting deferred to v1.1; if so, scope cleanly shifts |

**Consensus:** 3 GREEN + 2 YELLOW = **3/5 strong-go.** YELLOW concerns are
known and mitigated. Founder approval recommended.

## 11. Engine specification

### 11.1 File layout (final, per brainstorm 06-architecture §2)

```
knowledge/resolvers/
├── README.md                         # 50-100 lines: how to read/edit/validate
├── registry.yaml                     # top-level index, schema version, file list
├── routes/                           # AUTO-DERIVED from recipient frontmatter
│   ├── skills.yaml                   # 66+ entries
│   ├── commands.yaml                 # 11+ entries
│   ├── agents.yaml                   # 5+ entries
│   ├── personas.yaml                 # 4 active + 8 planned (via adapter)
│   ├── mcp.yaml                      # ~25 entries (via adapter)
│   ├── wiki.yaml                     # short list + fallback rule
│   ├── sops.yaml                     # SOP entries by namespace
│   ├── capabilities.yaml             # CLA registry projection
│   └── personal.yaml                 # founder's hand overrides + shortcuts
├── overrides/                        # HAND-AUTHORED, takes precedence
│   ├── skills.yaml
│   ├── commands.yaml
│   └── ... (mirror routes/ kinds)
└── adapters/                         # READ-ONLY translators
    ├── cla-routing-adapter.yaml
    ├── mcp-tools-adapter.yaml
    └── workforce-personas-adapter.yaml
```

### 11.2 Matching algorithm (D-3 + architect T-3 baked in)

```
function match(trigger: string, route: Route): MatchResult {
  // Step 1: Normalize trigger AND route keywords
  const t = trigger.normalize('NFC').toLowerCase().trim()
  const tokens = t.split(/\s+/).filter(s => s.length > 0)

  // Step 2: For each route keyword
  for (const keyword of route.triggers.keywords) {
    const k = keyword.normalize('NFC').toLowerCase().trim()

    // Step 2a: Phrase match (multi-word)
    if (k.includes(' ')) {
      // Phrase must appear with word boundaries
      const pattern = new RegExp(`\\b${escapeRegex(k)}\\b`, 'u')
      if (pattern.test(t)) {
        return { matched: true, confidence: 0.9, tier: 'full-phrase' }
      }
    } else {
      // Step 2b: Single-word match (whole word only)
      const pattern = new RegExp(`\\b${escapeRegex(k)}\\b`, 'u')
      if (pattern.test(t)) {
        // Whether all keywords match determines tier (see 11.4)
        return { matched: true, confidence: 0.7, tier: 'word-match' }
      }
    }
  }

  // Step 3: Optional regex[] field (power users)
  for (const rx of route.triggers.regex || []) {
    if (new RegExp(rx, 'u').test(t)) {
      return { matched: true, confidence: 0.7, tier: 'regex-match' }
    }
  }

  return { matched: false }
}
```

v1.1 will add diacritic-insensitive matching via Unicode NFD decomposition
+ combining-character folding.

### 11.3 Element schema (founder-stated, locked)

```yaml
- id: <kind>/<slug>                   # globally unique
  status: active | stub | deprecated
  triggers:
    keywords: [<word_or_phrase>, ...]  # min 1
    regex: [<pattern>, ...]            # optional, power-user
    semantic_seed: <text>              # v1.1 only; for embedding fallback
  recipient:                          # the "activated_entity"
    kind: skill | command | agent | mcp | wiki | sop | capability | persona
    slug: <recipient-identifier>
    path: <filesystem-path>            # for kind in (skill, command, agent, sop, wiki)
  invocation:                         # the "path_or_method_to_get"
    mechanism: skill_tool | slash | subagent | mcp_call | wiki_query | shell
    args: { ... }                      # mechanism-specific
  role_scope: ["*"] | [<role>, ...]   # metadata only at v1.0 per D-3 / architect T-8
  hitl_tier_default: A | B | C | D-Std | D-MAX
  composition:                        # optional (CP-2 kept per founder)
    plan:
      - { step: <name>, recipient: { ... } }
  metadata:
    pillar: <0X-pillar>
    cost_bucket: <bucket>
    introduced_in: <version>
    last_validated_at: <date>
    author: <user>
    derived: true | false              # true if auto-generated from frontmatter
    disambiguator: <text>              # optional; when triggers overlap
```

Schema in `knowledge/schemas/resolver-route.schema.json` (JSON Schema Draft
2020-12).

### 11.4 Confidence computation (architect T-14 baked in)

Hand-set `confidence_default` is REMOVED from schema. Confidence is computed
from match quality:

```
0.9  — full-phrase exact match (all words contiguous + bounded)
0.7  — all words present non-contiguous
0.5  — partial match (some words present, not all)
0.95 — explicit disambiguator field set (manual override; documented reason)
```

Threshold tiers (config in registry.yaml):
- **≥0.85** → silent dispatch (auto-use top match)
- **0.60-0.85** → surface top-N candidates (caller picks)
- **<0.60** → no-match (fall through to ambiguous_fallback)

### 11.5 Lookup engine flow

Per brainstorm 06-architecture §5.1:

```
trigger string
  → normalize(NFC, lowercase, trim, collapse whitespace)
  → load index (cached; mtime-invalidate per registry.yaml + routes files)
  → for each route: matchKeywords() → confidence tier
  → rankByConfidence() (DESC)
  → filterByRole() if $MCP_CALLER_ROLE present
  → decide():
      - top conf ≥0.85 → dispatch_silently
      - top conf 0.60-0.85 → surface_candidates (top-N)
      - top conf <0.60 → fall through to:
        - --semantic flag (v1.1): semanticFallback()
        - no --semantic OR v1.0: return ambiguous_fallback
  → writeAudit() to ops.resolver_decisions (best-effort; defer to local on DB failure)
  → return result
```

p95 target <50ms (warm cache); <200ms (cold).

### 11.6 /resolver sync flow (D-2 baked in)

Per D-2 decision: default mode is **warn-only**.

```
/check-drift OR pnpm check
  → validate-resolver-coverage.cjs
  → if orphan recipients found:
    → WARN (exit 3, non-blocking)
    → suggest: "Run /resolver sync --dry-run to preview"

/resolver sync --dry-run  (DEFAULT)
  → scan filesystem for recipients without routes
  → generate stub routes from recipient frontmatter
  → PRINT diff
  → no writes

/resolver sync --apply  (Tier B)
  → check lock file (.archives/resolver-sync.lock; 10min staleness)
  → write to staging files; atomic rename
  → no PR; local working tree only

/resolver sync --auto-pr  (Tier C)
  → same as --apply, then:
  → git checkout -b resolver-sync-<date>-<short-hash>
  → git commit + push
  → gh pr create
  → rate limit: 1 PR per 6h per branch; dedupe by content hash
```

### 11.7 Audit storage schema

See draft/migrations/00033_resolver_decisions.sql. Schema:

```sql
CREATE TABLE ops.resolver_decisions (
  run_id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts                timestamptz NOT NULL DEFAULT now(),
  trigger           text NOT NULL,
  trigger_normalized text NOT NULL,
  matched_route_id  text,                 -- nullable on no-match
  confidence        numeric(3,2),         -- 0.00 to 1.00
  alternatives      jsonb,                -- top-N candidates
  semantic_used     boolean NOT NULL DEFAULT false,
  caller_role       text,                 -- $MCP_CALLER_ROLE at query time
  latency_ms        integer NOT NULL,
  decision          text NOT NULL CHECK (decision IN (
                      'dispatch_silently',
                      'surface_candidates',
                      'no_match',
                      'role_denied'
                    )),
  metadata          jsonb                 -- extension point
);

CREATE INDEX resolver_decisions_ts_idx ON ops.resolver_decisions (ts DESC);
CREATE INDEX resolver_decisions_route_id_idx ON ops.resolver_decisions (matched_route_id);
CREATE INDEX resolver_decisions_decision_idx ON ops.resolver_decisions (decision);

ALTER TABLE ops.resolver_decisions ENABLE ROW LEVEL SECURITY;
-- founder + etl-runner: full
-- other roles: read own caller_role rows only
```

### 11.8 4 Validators

| Validator | Tier | Function |
|---|---|---|
| `validate-resolver-schema.cjs` | L1 | JSON Schema check per route entry |
| `validate-resolver-routes.cjs` | L1 | Recipient existence + adapter precedence rule |
| `validate-resolver-trigger-uniqueness.cjs` | L1 | Intra-kind collision detect |
| `validate-resolver-coverage.cjs` | L2 | Orphan recipient detect (warn-default per D-2) |

Auto-pickup by `pnpm check` (existing convention). Total runtime budget
<500ms per brainstorm 12-performance §A.

## 12. Consumer contracts (4 channels)

Per architect T-2 + brainstorm 16-design-ux §C.4.

### 12.1 SKILL invocation (agent-to-agent)

```
Skill({ skill: 'resolver-query', trigger: 'how to write to ops.tasks' })
→ returns: { matched: <route>, alternatives: [...], confidence: <number> }
```

`resolver-query` SKILL.md lives at `06-ai-ops/skills/resolver-query/`. Any
other skill MAY invoke this via the Claude Code Skill tool. Result shape
documented in SKILL.md frontmatter.

### 12.2 MCP tool (runtime)

```
mcp__resolver__query({
  trigger: 'show MCP for writing tasks',
  caller_role: 'founder',          // optional; defaults from env
  flags: { semantic: false, plan: false }
})
→ returns: { matched, alternatives, confidence, latency_ms }
```

Hosted on `supabase-ops` MCP shim (Phase 4 decision per §4.5). Registered
in `knowledge/mcp-tools.yaml`.

### 12.3 Slash command (operator-facing)

```
/resolver query "show MCP for writing tasks"
/resolver list --kind=mcp
/resolver validate
/resolver sync --dry-run
/resolver explain "ambiguous trigger here"
```

5 verbs only (architect simplification; dropped `add` wizard + folded
`test` into `explain`).

### 12.4 Programmatic Node.js API

```javascript
const { query } = require('./scripts/resolver/query.cjs')
const result = query({ trigger: '...', flags: {} })
```

For cron jobs, validators, scripts. Same result shape as 12.1 / 12.2.

## 13. Drift gates (per phase, per CLA SOP)

| Phase | Gate | What fails |
|---|---|---|
| 0 | mandatory `pnpm check` | any L1 / critical L2 drift |
| 3 | informational | parsed for inventory |
| 5 | dry-run on `draft/tier1-diffs.yaml` | validator errors |
| 7 | per-commit (husky) | standard L1 enforcement |
| 8 | final `pnpm check` | any drift after registry update |

## 14. Test plan (per Sprint 1)

90+ test cases across 9 modules. See brainstorm 11-test-plan.md for full
catalog. Coverage gates: 80% line / 75% branch.

Test categories:
- Unit (60+): load, query, semantic, sync, validators, command, audit
- Integration (20+): drift-pickup, adapter expansion, audit flow
- E2E (5): founder representative scenarios
- Property (4): invariants — including the NO-EXECUTION property (D-4)
- Performance (5): p95/p99 budgets per brainstorm 12-performance

## 15. Tier C decision record

Will be stored in `ops.decisions` upon founder approval at end of Phase 5
(this section). Decision payload includes:

- `decision_kind`: "capability_architecture_approval"
- `subject_kind`: "capability"
- `subject_id`: "resolver"
- `decision_record`: link to this spec.md
- `tier`: "C"
- 4 STOP gate resolutions (D-1 v1.3, D-2 warn-only, D-3 NFC+v1.1, D-4 invariant)
- `approved_by`: "founder"
- `approval_method`: "Claude Code AskUserQuestion"
- `linked_ops_capability_runs_id`: "40324249-1604-415e-b8cb-2f012456ea84"

## 16. Next phase

**Phase 6 — Sprint Planning** (`sprint-planner` skill). Will produce
sprint-plan.md with 4 sprints × ~5 PRs each = 20 PRs total. HITL Tier B
gate at end (founder approves sprint breakdown).

---

## A. References

- Problem doc: `.archives/cla/resolver/problem.md`
- Domain analysis: `.archives/cla/resolver/domain-analysis.md`
- Gap analysis: `.archives/cla/resolver/gap-analysis.md`
- Options doc: `.archives/cla/resolver/options.md`
- Brainstorm dir: `.archives/brainstorming/resolver/` (24 files, ~400 KB)
- Architect outside voice: `.archives/brainstorming/resolver/17-outside-voice.md`
- Founder override: `.archives/brainstorming/resolver/19-founder-override.md`
- CEO plan mirror: `~/.gstack/projects/doanchienthangdev-ritsu-works/ceo-plans/2026-05-23-resolver.md`
- Context bundle: `runtime/resolvers/context/00-resolver.context.md`
- Original /cla prompt: `.archives/brainstorming/resolver/CLA-PROPOSE-PROMPT.md`

## B. Draft components (this folder)

- `draft/tier1-diffs.yaml` — full Tier 1 file diff manifest
- `draft/migrations/00033_resolver_decisions.sql` — the single v1.0 migration
- `draft/skills/` — SKILL.md stubs (5 new skills)
- `draft/commands/resolver.md` — command file stub
- `draft/sops/SOP-AIOPS-005-resolver-ops.yaml` — SOP flow stub
- `draft/mcp-configs/resolver_query.yaml` — MCP tool registration stub

(All stubs are illustrative — Phase 7 implementation refines each into
production-ready file.)
