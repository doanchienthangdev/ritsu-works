---
name: resolver-query
description: |
  CONSUMER CONTRACT for resolver v2 LLM-native catalog. Any skill or agent MAY
  invoke this to find AI workforce recipients for a trigger across kinds (skill,
  command, agent, mcp, persona). v2 uses Mode A (in-session ambient catalog —
  preferred), Mode B (explicit LLM-mediated query — debugging/audit), and Mode C
  (keyword fallback for non-LLM consumers).
  Returns: primary recipient + supporting composition + invocation spec.
  Caller executes the invocation (D-4 INVARIANT).
status: active
version: 2.0.0
hitl_max_tier: A
role_scope: ['*']
home_pillar: 06-ai-ops
spec: .archives/cla/resolver-v2/spec.md
supersedes: resolver-query@1.0.0
---

# Skill: resolver-query (v2)

## When to use this skill

Invoke from another skill, agent, or workflow when you need to find the right
AI workforce recipient for a natural-language task — without grep'ing
filesystem or hardcoding lookups.

**Three consumer modes — choose by context:**

### Mode A (PREFERRED — in-session ambient catalog)

You are operating inside a Claude Code session. The catalog
`knowledge/recipients/{skills,commands,agents,personas,mcps}.md` is **already
loaded** in your ambient context via `.claude/CLAUDE.md` imports.

→ **You don't actually invoke this skill.** You just reason about the trigger
naturally and identify the primary + supporting recipients from ambient context.
Then invoke the recipient directly (`Skill({...})`, `Agent({...})`, etc.).

Optionally write an audit row via `audit.cjs` if the decision is significant
(e.g., orchestration delegation).

**Latency:** 0ms additional. **Cost:** $0 (no extra LLM call).

### Mode B (Explicit — operator-facing, audit/debug)

User invoked `/resolver query "<trigger>"` or programmatic skill call.

Steps:
1. Load catalog (`scripts/resolver-v2/catalog-loader.cjs#loadCatalog()`)
2. Format structured prompt:
   ```
   System: <catalog as text — all 5 files concatenated, or kind-filtered if --kind given>
   User: For trigger "<trigger>", return JSON:
     { primary: <recipient-id>, supporting: [<id>...], rationale: "...", alternatives: [<id>...] }
   ```
3. Current session LLM (you, Claude) reasons → emits JSON
4. Validate IDs exist in catalog (`byId.has()`); reject hallucinations
5. Build audit record via `audit.cjs#buildRecord` with `mode='B', llm_reasoning=<rationale>, composition_supporting=[<supporting>]`
6. Write audit via `mcp__supabase-ops__insert` to `ops.resolver_decisions`
7. Return human-readable output

**Latency:** ~5-500ms (catalog load + LLM reasoning). **Cost:** $0 in-session
(no separate API call); cached system prompt if invoked multiple times.

### Mode C (Keyword fallback — non-LLM consumers only)

CRON jobs, Edge Functions, pre-commit hooks. No LLM in loop.

Invoke `scripts/resolver-v2/keyword-fallback.cjs#match({trigger})` directly.
Single-recipient response. ~30% recall (acknowledged degradation vs Mode A).

Use this **only** if you cannot reach an LLM context. Encourage migration to
Mode A.

**Latency:** <5ms. **Cost:** $0.

## Output schema (Mode A/B)

```typescript
{
  primary: {
    id: string,           // e.g. "skill/customer-onboarding"
    kind: string,
    invoke: string,       // exact invocation snippet
    when_to_use: string,
    status: string,
  },
  supporting: Array<{     // composition — recipients to use alongside
    id: string,
    kind: string,
    invoke: string,
    why: string,          // why this supports the primary
  }>,
  alternatives: Array<{   // other valid primary choices the caller might prefer
    id: string,
    kind: string,
    confidence: number,   // LLM-judged 0-1
  }>,
  rationale: string,       // LLM's natural-language reasoning
  catalog_files_loaded: string[],
  mode: 'A' | 'B' | 'C',
  audit_run_id?: string,   // if audit written
}
```

## From a recipient list to an executable plan — `context_recipe` is first-class

`resolver-query` answers **"WHICH recipient?"** (primary + supporting +
alternatives). It does NOT partition those recipients into "read these" vs "run
these", attach HITL tiers, or ground a query — that is the job of the companion
skill **`resolver-plan`** (`06-ai-ops/skills/resolver-plan/SKILL.md`), surfaced as
`/resolver plan "<intent>"`.

`resolver-plan` returns a **populated `context_recipe`** — the **ResolverPlan v1**
object (schema: `knowledge/schemas/resolver-plan.schema.json`). As of
capability `resolver-plan` v1.0 (operating), `context_recipe` is **first-class**,
not an optional ignore-if-unknown field: it is a populated, schema-validated
2-axis plan —

- `content_axis` — recipients to **READ** (each carries `authority` / `freshness`
  / `grounding_ref` / optional `columns_hint`),
- `capability_axis` — recipients to **RUN** (each carries `hitl_tier` /
  `side_effect` / optional `cost_bucket`), HITL-gated,
- plus `governance_constraints` (ALWAYS `page/governance-HITL` when any capability
  is HITL tier B+), `goal_metrics`, optional `primary_lens`, and an honest
  `no_coverage`.

**Backward-compat:** a consumer that only reads the legacy `context_recipe`
subset (`primary_lens` / `governance_constraints` / `goal_metrics`, or just the
flat `primary` + `supporting` from this skill) still works unchanged — the
ResolverPlan is a superset (skill INV-6). New consumers (e.g. `/deepask`) read the
full 2-axis plan.

→ Use **this skill / Mode A** when you only need to identify the recipient(s).
Use **`resolver-plan`** when you need the assembled, directly-executable plan.

## INVARIANTS

**INV-1:** Zero false-positive matches. LLM hallucinations rejected.

**INV-2:** Single source of truth — only `knowledge/recipients/*.md`. No
parallel YAML route file.

**INV-3 (D-4 carryover from v1):** This skill does NOT execute the recipient.
It returns metadata + invocation spec. Caller (you) executes.

**INV-4:** Catalog auto-sync is frontmatter→catalog (one-way). Founder
overrides via direct edit + `<!-- override-start -->` markers detected on next
sync. The nightly `resolver-catalog-sync` GitHub Action
(`.github/workflows/resolver-catalog-sync.yml`) regenerates the catalog and opens
a **draft** PR on drift (capability `resolver-plan`, Sprint 4).

## Failure modes

| Code | Cause | Handling |
|---|---|---|
| `INVALID_TRIGGER` | nil/empty trigger | Throw; caller must provide |
| `CATALOG_DOWN` | recipients/ missing | Throw; fix install |
| `CATALOG_PARSE_ERROR` | malformed markdown | Throw with file+line |
| `DUPLICATE_RECIPIENT_ID` | same id in 2 files | Throw; manual fix |
| `MISSING_REQUIRED_FIELD` | catalog entry incomplete | Throw with entry ID |
| `HALLUCINATED_RECIPIENT` | LLM returned unknown ID | Mode B retries once with stricter prompt |
| `AUDIT_WRITE_FAILED` | DB unavailable | Best-effort; warn but don't throw |

## See also

- Spec: `.archives/cla/resolver-v2/spec.md`
- Catalog files: `knowledge/recipients/*.md`
- Engine: `scripts/resolver-v2/`
- Mode C fallback: `scripts/resolver-v2/keyword-fallback.cjs`
- Audit table: `ops.resolver_decisions` (+ migrations 00035 / 00038 / 00044)
- v1 retrospective: `wiki/capabilities/resolver/retrospective.md`
- **Planning companion (`context_recipe` first-class)**: `06-ai-ops/skills/resolver-plan/SKILL.md` (`/resolver plan`)
- **ResolverPlan v1 schema** (the populated `context_recipe` contract): `knowledge/schemas/resolver-plan.schema.json`
- **Planner capability spec**: `wiki/capabilities/resolver-plan/spec.md`
