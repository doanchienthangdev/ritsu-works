---
name: deepask
description: Federated retrieval + capability-execution + cited synthesis over the ENTIRE internal IA. Zero-routing pure consumer of resolver-plan. Decompose → resolve → execute/fan-out → synthesize → completeness-critic → format. Returns a Pyramid, 100%-cited, authority-ranked, conflict-aware, freshness-tagged answer in 1 of 12 formats, OR an honest no-coverage gap + remedy. Internal-first (web leg delegated to deep-research). Tier A runtime (Tier-B+ legs surfaced, never auto-run).
argument-hint: "\"<question>\" [--format=<...>] [--sources=<...>] [--depth=quick|standard|deep|exhaustive] [--dry-run]"
---

# /deepask

> Thin orchestrator over the `deepask/*` skill suite (`06-ai-ops/skills/deepask/`). Owns flag
> parsing; delegates ALL routing to `resolver-plan` (deepask has ZERO routing of its own — no
> parallel source-map, ever). Capability spec: `wiki/capabilities/deepask/spec.md` (Phase-8
> promotion target; current `.archives/cla/deepask/spec.md`). Tier C decision
> `ops.decisions[861f8eb4-6572-4df5-b1cc-44aac0a7b014]`.

## Implementation status (built incrementally per sprint-plan.md)

| Sprint | Status | Surface |
|---|---|---|
| S1 | merged (#165) | command + `orchestrator` (resolver-budget accountant) + `decompose` + `execute` (READ-only legs) + migration 00045 |
| S2 | merged (#166) | `synthesize` (Pyramid + citation guardrail + authority + conflict + freshness + adversarial-verify) + `completeness-critic` (coverage matrix + MECE + live-probe + honest-gap verdict) |
| S3 | merged (#167) | `execute` capability-RUN leg via `capability-gate.cjs` (Tier-A auto / Tier-B+ surface / D-MAX refuse) + gbrain-cap + `deep-research` delegation → **full 5-stage loop end-to-end** |
| S4 | merged (#168) | Format Engine (`deepask/format` umbrella + dispatch table) — **doc family** (text·article·pdf·docx·pptx·xlsx) + `smartauto` via `format-select.cjs` |
| **S5** | **this PR** | Format Engine — **visual adapters** (mermaid·chart·dashboard·html·interactive·canvas); `smartauto` default flipped to `ALL_FORMATS`; `artifact-path.cjs` layout helper → **all 12 formats live** |
| S6 | pending | 3 KPIs + SOP-AIOPS-005 + docs + Phase-8 promotion |

After S5, **all 12 `--format` values produce a valid artifact** (or degrade gracefully) and `smartauto` can pick visual formats; the answer always also lands as canonical `answer.md` in `.archives/deepask/<date>-<slug>/`. Only S6 (KPIs + SOP + Phase-8 promotion → `operating`) remains.

## Flags

| Flag | Values | Effect |
|---|---|---|
| `--format` | text·article·pdf·docx·pptx·xlsx·mermaid·chart·dashboard·html·interactive·canvas·**smartauto** (default) | format adapter (S4–S5; pre-S4 → `article`/`answer.md` only) |
| `--sources` | csv of {pillars,ops,metrics,wiki,brain,external,scratch} · **auto** (default) | constrain which IA types deepask may touch (passed to resolver-plan as a filter) |
| `--depth` | quick·**standard** (default)·deep·exhaustive | sub-need bound (≤6 standard / ≤12 deep) + parallel fan-out + adversarial-verify votes (0/1/2/3) |
| `--dry-run` | flag | show decomposition + **real** ResolverPlans + predicted coverage + cost estimate; perform zero reads/runs/writes EXCEPT one `ops.deepask_runs` dry-run row. NB: dry-run DOES call resolver-plan → consumes resolver-breaker budget → labeled honestly. |

## Dispatch (the 5-stage loop)

0. **Pre-flight (orchestrator):** the **resolver-budget accountant** — read the latest `session_finds_count`, call `scripts/deepask/breaker-budget.cjs` `computeBreakerBudget({sessionFindsCount, subNeedCount, ...})`; if not viable → emit honest PARTIAL up front (`gap_reason='breaker_budget'`), never a fabricated `no_coverage`; if `capped_to_budget` → reduce depth and tell the operator.
1. `deepask/decompose` — question → MECE sub-needs (≤6/≤12), IA-type A/B/C/D tags.
2. `deepask/orchestrator` → per sub-need call `resolver-plan` (`/resolver plan` / `mcp__supabase-ops__resolver_find`) → `ResolverPlan v1`.
3. `deepask/execute` — parallel subagents: **READ** `content_axis` (S1); **RUN** Tier-A `capability_axis` + surface Tier-B+ + delegate web→`deep-research` (S3). Authors the concrete read-only SQL / `wiki_ask` question / skill params, **grounded in `grounding_ref`/`columns_hint`; never invents column names**.
4. `deepask/synthesize` (S2) — Pyramid + citation + authority + conflict + freshness + adversarial-verify → format-agnostic IR.
5. `deepask/completeness-critic` (S2) — coverage matrix + MECE + live-probe → COMPLETE | PARTIAL+remedy; ≤1 bounded follow-up.
6. Format (S4–S5) → artifact in `.archives/deepask/<YYYY-MM-DD>-<slug>/` (always `answer.md` + `plan.json` + `sources.json` + rendered artifact).
7. **Observe** → `ops.deepask_runs` + `ops.deepask_coverage`; founder edit/reject → `ops.corrections`.

## Guards (always-on)
- **Firewall:** product data only via `metrics.*` (hook `pre-tool-supabase-product`); never `product.*`.
- **gbrain:** reads under the $100/mo cap; prefer `search`/`recall` over `think`.
- **resolver breaker:** 20-find/4h/session — budgeted by the accountant (Stage 0).
- **Billing:** subscription in-session; API key out-of-band/embeddings only.
- **HITL:** runtime = Tier A (read/synthesize); any Tier-B+ capability leg is **surfaced**, never auto-run.

## Boundary
`/deepask` federates + **composes** `/brain` (gbrain) + `/wiki ask` + supabase-query + `/think` frameworks, delegating the web leg to `deep-research`. It does NOT route (that's `resolver-plan`) and does NOT create/modify (that's `/cla` · `/evolve` · `/update`). Internal-first.
