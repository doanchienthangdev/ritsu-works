---
title: Resolver v2.1 — Hướng dẫn đầy đủ cơ chế + cách tích hợp nền
capability_id: resolver-v2.1
version: 2.1.0
status: operating
audience: [founder, cofounder, ai-workforce]
written_at: 2026-05-24
written_by: founder + assistant (single conversation; resolver dogfood)
purpose: |
  Canonical reference cho cách dùng resolver v2.1 ambient-integrated. Covers
  cơ chế, 3 consumer modes, 11 recipient kinds, integration patterns với
  /cla và problem-solving workflows. Document này được founder reference
  khi triển khai capabilities mới hoặc khi onboard team mới.
---

# Resolver v2.1 — Hướng dẫn đầy đủ cơ chế + cách tích hợp nền

## Phần 1: Cơ chế (Mechanism)

### 1.1 Vấn đề resolver giải quyết

Ritsu-works có **252+ recipients** across **11 kinds** (skill, command, agent, persona, mcp, wiki, sop, capability, workflow, schedule, hook). Khi founder hoặc một AI workforce member gặp vấn đề:

- **Without resolver:** grep filesystem, hardcode routes, miss composition opportunities. Mỗi developer/agent re-discover routing tự.
- **With resolver:** natural-language query → `{primary, supporting[], rationale}` composition. Catalog ambient trong mọi Claude Code session.

### 1.2 Architecture flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  Source frontmatter (SKILL.md, command.md, agent.md, ...)          │
│  + structured registries (workforce-personas.yaml, schedules.yaml,  │
│  capability-registry.yaml, mcp-tools.yaml)                          │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │  catalog-generator.cjs walks
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  knowledge/recipients/*.md (11 files, ~252 entries, ~30K tokens)   │
│  Single source of truth                                             │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │  CLAUDE.md @imports
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│  Ambient context in EVERY Claude Code session                       │
│  Mode A: LLM (you, Claude) reasons naturally — no extra call       │
│  Mode B: /resolver query loads as structured prompt — audit row    │
│  Mode C: keyword-fallback.cjs reads same catalog — CRON/edge fn    │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Three consumer modes

| Mode | Khi nào dùng | Latency | Cost | Recall |
|---|---|---|---|---|
| **A (Ambient)** | 90%+ — bạn đang trong Claude Code session | 0ms | $0 | ~80%+ |
| **B (Explicit)** | 9% — debugging, audit trail, operator-facing | 5-500ms | $0 in-session | ~80%+ |
| **C (Keyword)** | 1% — CRON jobs, edge functions, pre-commit hooks | <5ms | $0 | ~30% |

### 1.4 The 11 recipient kinds

| Kind | Số lượng | Catalog file | Source |
|---|---|---|---|
| skill | 67 | `skills.md` | `06-ai-ops/skills/**/SKILL.md` |
| command | 12 | `commands.md` | `.claude/commands/*.md` |
| agent | 5 | `agents.md` | `.claude/agents/*.md` |
| persona | 21 | `personas.md` | `workforce-personas.yaml` + `cla-routing-keywords.yaml` |
| mcp | 9 | `mcps.md` | `knowledge/mcp-tools.yaml` |
| wiki | 4 | `wikis.md` | `wiki/<source-slug>/source.md` |
| sop | 106 | `sops.md` | `**/sops/SOP-XXX-*/flow.yaml` |
| capability | 7 | `capabilities.md` | `knowledge/capability-registry.yaml` |
| workflow | 0 | `workflows.md` | `workflows/` (placeholder) |
| schedule | 11 | `schedules.md` | `knowledge/schedules.yaml` |
| hook | 10 | `hooks.md` | `.claude/hooks/*.md` |

### 1.5 Catalog format (strict)

```markdown
## skill/customer-onboarding

**Kind:** skill
**When to use:** Onboarding a new paying customer (especially the first 30
high-touch Zoom onboardings).

**Invoke:** `Skill({ skill: "customer-onboarding" })`

**Composes with:**
- persona/cs-coach
- sop/SOP-CUSTOMER-006-founder-onboards-first-30
- mcp/supabase-ops__insert

**Role scope:** founder, cs-coach, customer-lead
**Status:** active
**Pillar:** 05-customer/success
```

**Required:** id (heading), Kind, When to use, Invoke, Status
**Optional:** Composes with, Role scope, Pillar, Aliases, Disambiguator

### 1.6 Audit table (`ops.resolver_decisions`)

v2.1 columns: `run_id, ts, trigger, matched_route_id, confidence, alternatives, mode (A/B/C), llm_reasoning, composition_supporting, catalog_files_loaded, caller_role, latency_ms`.

---

## Phần 2: Cách dùng (How to use)

### 2.1 Mode A — Ambient reasoning (PRIMARY pattern, 90%+)

**Bạn KHÔNG cần invoke gì cả.** Catalog đã ambient. Chỉ nói natural language về vấn đề:

```
Tôi muốn onboard customer mới
```

→ Claude reads ambient catalog, naturally identifies primary + supporting + rationale. Executes through invocations. **Không cần `/resolver` slash command.**

### 2.2 Mode B — Explicit `/resolver query`

Dùng khi: debugging, audit, operator exploration, onboarding.

```bash
/resolver query "<trigger>" [--kind=<k>] [--role=<r>] [--json]
```

**Example output:**
```
[dispatch_silently] persona/cco  conf=0.92  latency=18ms  mode=B
  rationale: "CCO persona owns customer success; first 30 high-touch falls
              under this scope. Supporting recipients identified."
  supporting:
    sop/SOP-CUSTOMER-006-founder-onboards-first-30
    wiki/collison-protocol
    mcp/supabase-ops__insert
  audit: ops.resolver_decisions.run_id=<uuid>
```

### 2.3 Mode C — Programmatic (Node.js, CRON, Edge Function)

```bash
node -e "
const { match } = require('./scripts/resolver-v2/keyword-fallback.cjs');
const r = match({ trigger: 'evolve a skill', kind: 'command' });
console.log(r.matched?.recipient?.id);
// → command/evolve
"
```

Recall ~30% (vs Mode A's 80%+). Whole-word matching only. Use chỉ when LLM not available.

### 2.4 /resolver subcommands

| Verb | Mục đích | HITL |
|---|---|---|
| `query` | Mode B lookup | A |
| `list` | Enumerate catalog | A |
| `validate` | Run 4 cross-tier validators | A |
| `sync` | Regenerate catalog từ frontmatter | A/B/C |
| `explain` | Verbose match trace | A |

---

## Phần 3: Tích hợp nền (Ambient integration)

### 3.1 "Ambient integration" nghĩa là gì?

**Traditional approach:** agent gọi resolver explicitly mỗi khi cần routing.
```
Agent → resolver.query("X") → recipient → execute
       (extra LLM call + latency + cost)
```

**Resolver v2.1 approach:** catalog **ambient trong context**. Agent reason naturally.
```
Agent (Claude session, catalog ambient) → naturally identify → execute
       (zero overhead — recall happens during normal reasoning)
```

### 3.2 Cách catalog flow vào context

Mỗi Claude Code session start:
1. CLAUDE.md loaded (root + nested per pillar)
2. `@knowledge/recipients/*.md` imports resolve (11 files)
3. ~30K tokens of recipient knowledge ambient
4. Anthropic prompt cache (5-min TTL)
5. Claude reasons about user request → identifies recipients → executes

### 3.3 Token budget impact

- Catalog: ~30K tokens (~15% of 200K context window)
- Remaining: 170K for conversation
- Cache discount: 90% off after first call in 5-min window
- Effective cost long sessions: ~$0.005/turn

### 3.4 Inheritance to sub-agents

| Invocation | Inherits catalog? |
|---|---|
| Direct chat | ✓ Yes |
| `Skill({...})` | ✓ Yes |
| `Agent({subagent_type, ...})` | ✓ Yes |
| `mcp__*` calls | ✗ No (caller has catalog) |
| CRON / Edge fn | ✗ No (use Mode C) |
| Pre-commit hook | ✗ No (use Mode C or hardcode) |

### 3.5 Catalog refresh triggers

- **Auto on session start** — every new session loads fresh
- **mtime cache in-session** — auto-invalidates on file mtime change
- **Manual `/resolver sync`** — regenerate from source
- **CI drift check** — `pnpm check` validates consistency

---

## Phần 4: Project delivery integration

### 4.1 Pattern: Founder gặp vấn đề X

1. **State problem:** *"Tôi cần research market cho EU launch"*
2. **Claude reasons from ambient catalog:**
   - `persona/cgo` for strategic lens
   - `wiki/<existing-sources>` for prior knowledge
   - `capability/wiki-sync` for new ingest
   - `command/wiki` to sync new sources
   - `mcp/supabase-ops__wiki_ask` for RAG
3. **Propose composition** + execution plan
4. **Founder approves**
5. **Execute** through identified recipients

**Cost:** $0 marginal — reasoning happens in existing session.

### 4.2 Pattern: `/cla propose` integration

| /cla Phase | Resolver kinds consulted | Example query |
|---|---|---|
| 0: Drift pre-flight | (no resolver) | `pnpm check` |
| 1: Problem framing | capability | "Is there already a capability for X?" |
| 2: Domain dispatch | persona | "Which CxO owns this domain?" |
| 3: System inventory | sop, capability, skill, agent | "What components exist?" |
| 4: Options generation | capability case studies + wiki | "How did similar problems get solved?" |
| 5: Spec | All kinds | "References existing skills/SOPs/MCPs by ID" |
| 6: Sprint planning | skill, mcp, schedule | "What active components compose?" |
| 7: Implementation | All kinds | "Invoke recipients per spec" |
| 8: Promotion | capability registry update | "Mark new capability operating" |

### 4.3 Worked example: "Onboard first 30 customers"

**Mode A composition output:**
```yaml
primary: persona/cco
rationale: |
  CCO persona owns customer success lifecycle. SOP-CUSTOMER-006 defines
  founder-led Zoom procedure. No dedicated capability exists yet → propose
  using existing components instead of /cla propose for new one.

supporting:
  - sop/SOP-CUSTOMER-006-founder-onboards-first-30
  - wiki/collison-protocol
  - mcp/supabase-ops__insert
  - mcp/supabase-ops__query
  - hook/pre-tool-customer-message

execution_plan:
  1. Read sop/SOP-CUSTOMER-006 to understand procedure
  2. Read wiki/collison-protocol for strategic framing
  3. Schedule Zoom with customer
  4. Post-Zoom: mcp__supabase-ops__insert customer record
  5. Send follow-up (hook auto-adds AI disclosure)
  6. Schedule day-3 check-in

NOT_RECOMMENDED:
  - /cla propose "customer-onboarding" — premature; SOP-CUSTOMER-006
    covers first-30 by design; capability needed only at N=31+
```

### 4.4 Worked example: "Weekly cost report"

```yaml
primary: skill/cost-report
supporting:
  - skill/cost-optimization-review (weekly companion)
  - mcp/supabase-ops__query
  - persona/cfo (when active)

execution_plan:
  1. Skill({skill: "cost-report"}) — fetches 7 days from ops.cost_attributions
  2. Skill({skill: "cost-optimization-review"}) — identifies candidates
  3. Compose Telegram digest
  4. Send to founder (route through hitl-router if Tier B/C)
```

### 4.5 Pattern: "Reuse before build" (HIGHEST LEVERAGE)

Resolver fundamentally enables **avoiding unnecessary new capability builds**.

**Example:** Founder says *"Tôi muốn track user feedback từ cancel flow"*.

**Without resolver:** founder might spawn `/cla propose "cancel-flow-feedback"` → full ceremony, ~$5 cost, days of build.

**With resolver ambient:** Claude reasons:
- `skill/feedback-aggregator` exists (canonical trong `skills.md`)
- `mcp/supabase-ops__insert` for `ops.cancel_feedback` table
- `sop/SOP-CUSTOMER-014-cancel-flow-feedback-protocol` may exist
- → Compose using existing; **don't build new capability**

Saves: /cla ceremony cost + sprint time. Founder validates: *"Yeah let's just use what's there."*

---

## Phần 5: Composition patterns (4 archetypes)

### 5.1 Context Assembly
**Task:** "Gather background on X"
**Composition:** wiki + capability + persona

### 5.2 Process Execution
**Task:** "Run procedure Y"
**Composition:** sop + skill + mcp + hook

### 5.3 Strategic Review
**Task:** "Review area Z"
**Composition:** persona + capability + wiki + schedule

### 5.4 Build New Capability
**Task:** "Ship new thing"
**Composition:** command/cla + persona + past capability case studies + existing reusable skills

---

## Phần 6: When NOT to use resolver

- **You already know exact recipient** → direct invocation faster
- **Recipient not in catalog** → propose creating via /cla (Mode B validates IDs to prevent hallucination)
- **Non-LLM contexts** → use Mode C OR hardcode
- **Performance-critical hot paths >100/min** → cache decisions or hardcode

---

## Phần 7: Maintenance + Troubleshooting

### 7.1 `/resolver sync` — refresh catalog

**When:** after adding new SKILL.md / command.md / agent.md / SOP-XXX/. Weekly per founder discipline.

```bash
/resolver sync                # Default: --dry-run (D-2 invariant)
/resolver sync --apply        # Tier B: write to working tree
/resolver sync --auto-pr      # Tier C: open PR via gh CLI
/resolver sync --kind=sop     # Limit to single kind
```

### 7.2 Drift detection (4 validators auto-run on `pnpm check`)

| Validator | Checks |
|---|---|
| `validate-resolver-v2-schema.cjs` | Every entry: required fields + valid kind + valid status |
| `validate-resolver-v2-uniqueness.cjs` | No duplicate recipient IDs across catalog files |
| `validate-resolver-v2-coverage.cjs` | All source entities have catalog entries (warn-only) |
| `validate-resolver-v2-link-integrity.cjs` | "Composes with" refs resolve to real entries |

### 7.3 Manual overrides

Edit catalog files within markers:
```markdown
<!-- override-start: alias for backward compat -->
**Aliases:** old-name, deprecated-trigger
<!-- override-end -->
```

`sync.cjs` preserves content within `override-start`/`override-end`.

### 7.4 Adding new kinds (v2.2+ template)

1. Add to `KINDS` array in `catalog-generator.cjs`
2. Add CONFIG entry với `sourceDir`/`sourceFile` + `invokeTemplate` + `file`
3. Write `generateXxx()` function
4. Add to generators map in main()
5. Add to `CATALOG_FILES` in `catalog-loader.cjs`
6. Add to `VALID_KINDS` in `errors.cjs`
7. Add `@knowledge/recipients/xxxs.md` import to `CLAUDE.md`
8. Write tests in `tests/resolver-v2/v22-xxx.test.ts`

---

## Phần 8: Quick reference

### Common workflows

| Bạn cần | Cách làm |
|---|---|
| Find recipient cho task | Just describe task — Mode A handles |
| Debug routing decision | `/resolver query "<trigger>"` |
| Refresh catalog after edits | `/resolver sync --dry-run` then `--apply` |
| Verify catalog health | `pnpm check` (runs 4 validators) |
| See all recipients of kind | `/resolver list --kind=<k>` |
| Add new recipient kind | See §7.4 |
| Override description | Edit catalog within override markers |

### Files to know

```
knowledge/recipients/*.md                            # Catalog (source of truth)
scripts/resolver-v2/*.cjs                            # Engine
scripts/cross-tier/validate-resolver-v2-*.cjs        # Validators
.claude/CLAUDE.md                                    # Auto-import declarations
.claude/commands/resolver.md                         # /resolver verbs
06-ai-ops/skills/resolver-query/SKILL.md             # Consumer contract
supabase/migrations/00034 + 00035                    # Audit table schema
ops.resolver_decisions                               # Audit table (live)
```

### Capabilities lineage

- v1 (deprecated): `wiki/capabilities/resolver/spec.md`
- v2.0 (superseded): `.archives/cla/resolver-v2/spec.md`
- v2.1 (operating): `.archives/cla/resolver-v2.1/spec.md`
- Playbook chapters: 38 (v1) → 39 (v2) → 40 (v2.1)

---

## Phần 9: Mental model cho founder

**3 câu hỏi khi gặp vấn đề mới:**

1. **"Catalog đã có gì gần?"** (Mode A reasons from ambient)
   - Skim 11 kinds for relevant existing components
   - If composition emerges → execute. Done.

2. **"Cần debug decision?"** (Mode B explicit)
   - `/resolver query "<trigger>"` → audit row + rationale

3. **"Có nên build mới?"** (Pattern: Reuse before build)
   - Only spawn `/cla propose` nếu catalog ambient KHÔNG có composition
   - Most common answer: reuse existing skills/SOPs/MCPs

**Sai lầm phổ biến cần tránh:**

- ❌ Hardcode skill names trong agent code → Defeats catalog purpose; use ambient lookup
- ❌ Spawn `/cla propose` cho everything → Many tasks composable from existing
- ❌ Skip catalog reasoning → Miss composition opportunities
- ❌ Manually edit catalog files outside override markers → Lost on next sync
- ❌ Use Mode C trong LLM context → 30% recall vs 80% Mode A

**Best practices:**

- ✅ Always reason from catalog before assuming need new capability
- ✅ Use Mode A for 90%+ cases (zero overhead)
- ✅ Reserve Mode B for audit/debug
- ✅ Run `/resolver sync` after editing source frontmatter
- ✅ Run `pnpm check` before commit (drift validators auto-run)

---

*Document này là canonical reference cho resolver v2.1 usage. Khi đến v2.2+, founder hoặc maintainer cập nhật trực tiếp tại đây. Cross-references: spec.md (architecture), retrospective.md (lessons), playbook Chương 38-40 (case study journey).*
