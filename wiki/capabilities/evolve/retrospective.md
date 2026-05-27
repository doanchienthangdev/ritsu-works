---
capability_id: evolve
version: 1.0.0
state: deployed
deployed_at: 2026-05-22
authors: [founder, claude (Opus 4.7) via /cla + /plan-ceo-review + /plan-eng-review]
---

# Retrospective — /evolve v1.0

## Summary

`/evolve` is ritsu-works' iterative evaluate→propose-improvement→install→
re-evaluate feedback loop on any leaf entity (skill, command, agent, hook,
SOP). Shipped 2026-05-22 in a single overnight session covering /cla Phases
0-8.

## Stage timeline

| Stage | Date | Output | Cost (est) |
|---|---|---|---|
| /plan-ceo-review + /plan-eng-review | 2026-05-22 daytime | 522-line PLAN.md + 11 review sections + outside-voice YELLOW absorbed + spec-review iter-2 PASS 8/10 | ~$5 |
| /cla Phase 0 (drift + INSERT + refs) | 2026-05-22 evening | capability_runs row 9c456d98; 152K refs copied | ~$0.10 |
| /cla Phase 1-4 (problem/domain/inventory/options) | 2026-05-22 evening | 4 .md files in .archives/cla/evolve/; HITL B Approach A approved | ~$0.30 |
| /cla Phase 5 (architect) | 2026-05-22 evening | spec.md (337 lines) + tier1-diffs.yaml + 6 draft scaffolds; ops.decisions[5a617fa2]; HITL C APPROVED | ~$0.50 |
| /cla Phase 6 (sprint planner) | 2026-05-22 evening | sprint-plan.md (3 sprints, ~23-28h CC scale); HITL B APPROVED | ~$0.10 |
| /cla Phase 7 Sprint 1 (foundation) | 2026-05-22 overnight | Commit ed8d893 — 16 files, 1906 insertions | ~$2 |
| /cla Phase 7 Sprint 2 (breadth) | 2026-05-22 overnight | Commit 8e7fcd7 — 4 files, 253 insertions | ~$0.50 |
| /cla Phase 7 Sprint 3 (discipline + governance) | 2026-05-22 overnight | Commit <pending> — outside-voice + 10 cases + SOP + scripts + migration + runbook + governance | ~$2.50 |
| /cla Phase 8 (catalog + promotion) | 2026-05-22 overnight | This file + spec.md promotion + CATALOG.md update | ~$0.30 |

**Total session cost:** ~$11 (well under $50/mo eval-evo-orchestrator role cap).
**Founder time:** ~3-4h interactive (during HITL B/C STOPs); remainder autonomous.

## Locked-in decisions (per /plan-ceo-review)

1. **Command name:** `/evolve` (over /eval-evo, /refine, /iter)
2. **Approach A:** top-level command parallel to /cla (over sub-flow or per-entity)
3. **Karpathy fit BALANCED:** per-type single composite metric, HITL by tier, ~500-tok cross-iter memory
4. **v1.0 entity types:** 5 leaf (skill, command, agent, hook, SOP); folder/pillar deferred to v1.1
5. **E5 outside-voice + E6 golden case scaffolding** accepted to v1.0
6. **Strategic reframe (STOP 3):** /evolve is the **quality engine for product/GTM/first-100-customers entities**, NOT meta-work
7. **Falsifiable efficacy gate:** day-30 retro pauses /evolve if median gain < 1.5× judge σ
8. **Spearman rubric hold-out validation** per playbook (≥0.6 ship gate)
9. **Git stash + restore** (not git worktree — per outside-voice T2 finding)

## What shipped

### Artifacts (net new)

| Path | Lines | Purpose |
|---|---|---|
| `.claude/commands/evolve.md` | ~250 | Slash command orchestrator |
| `06-ai-ops/skills/eval-evo/orchestrator/SKILL.md` | ~165 | Loop runner |
| `06-ai-ops/skills/eval-evo/score-{skill,command,agent,hook,sop}/SKILL.md` | ~30 ea × 5 | Per-type judge invokers |
| `06-ai-ops/skills/eval-evo/propose-improvement/SKILL.md` | ~100 | Diff generator |
| `06-ai-ops/skills/eval-evo/install-improvement/SKILL.md` | ~80 | Tier-aware writer |
| `06-ai-ops/skills/eval-evo/outside-voice/SKILL.md` | ~135 | Codex + subagent fallback chain |
| `06-ai-ops/skills/eval-evo/playbooks/{skill,command,agent,hook,sop}.md` | ~80 ea × 5 | 10-criterion rubrics |
| `06-ai-ops/skills/eval-evo/{_SCHEMA,playbooks/_SCHEMA,cases/_SCHEMA}.yaml` | ~80 ea × 3 | JSON schemas |
| `06-ai-ops/skills/eval-evo/cases/{README,_HOLDOUT}.yaml` + 10 seed cases | ~50 ea × 12 | Golden case battery (E6 scaffold) |
| `06-ai-ops/sops/SOP-AIOPS-004-evolve/{flow.yaml, README.md}` | ~150 + ~120 | SOP loop spec |
| `scripts/eval-evo/{calibrate-efficacy, playbook-validate}.cjs` | ~140 + ~140 | Day-30 gate + Spearman validator |
| `scripts/cross-tier/validate-eval-evo-schemas.cjs` | ~140 | L1 validator (wired into pnpm check) |
| `supabase/migrations/00033_corrections_entity_slug_index.sql` | 5 | CREATE INDEX (apply post-merge) |
| `wiki/runbooks/evolve.md` | ~200 | Operational guide |
| `wiki/capabilities/evolve/{spec.md, retrospective.md}` | 337 + this | Canonical reference (Phase 8 promotion) |

### Governance changes (Tier C)

| File | Change |
|---|---|
| `governance/ROLES.md` | Add `eval-evo-orchestrator` role (~50 lines: budget $50/mo, 3 task_kind caps, hitl_max_tier C) |
| `knowledge/schedules.yaml` | Add `evolve-day30-calibration` cron entry |
| `knowledge/manifest.yaml` | Add `eval-evo` sub-pillar to ai_ops |
| `knowledge/capability-registry.yaml` | `evolve` row v0.1.0 → v1.0.0; state proposed → deployed |
| `supabase/functions/minion-worker/index.ts` | Register `eval-evo-calibrate-efficacy` deferred stub |
| `scripts/check-consistency.cjs` | Wire `validate-eval-evo-schemas.cjs` into pnpm check |

## What's deferred to v1.1

Per /plan-ceo-review STOP 2 cherry-pick decisions:

- **E7: folder + pillar composite entity types** — composite scoring needs leaf types stable for 30 days first
- **E9: dedicated `ops.eval_evo_runs` table** — YAGNI until /evolve invocation count >50
- **Weekly auto-pass cron** (SOP-AIOPS-005)
- **Cross-entity pattern transfer recommender**
- **Shadow-mode A/B install for high-volume skills**
- **Meta-evolution CI test** (/evolve on /evolve must not regress)
- **3-judge median for judge stability** (R2 mitigation upgrade)
- **Native `cto-sceptic` subagent_type** (for outside-voice fallback B)

## What went well

1. **Locked spec → fast Phase 7.** The /plan-ceo-review + /plan-eng-review session
   front-loaded the design (522-line PLAN + 11 sections + outside-voice).
   Phases 1-4 of /cla were short-circuits ("re-confirm Approach A"). Phase 5
   was the only heavy LLM phase. Sprint 1-3 implementation followed the
   pre-decided architecture exactly.
2. **Validator + schema discipline.** Three JSON schemas + the cross-tier
   validator caught real issues during Sprint 3 (requires_api enum mismatch,
   missing SKILL_REGISTRY entry). `pnpm check` is the canonical truth.
3. **Goodhart-aware design.** 4-layer mitigation stack (proposer≠judge persona
   + golden cases + outside-voice + corrections) + falsifiable day-30 gate
   means /evolve cannot silently fail. Critical for a self-improvement tool.
4. **Codex CLI available locally.** Outside-voice has a real second-model path
   (different family from proposer + judge), not just a subagent fallback.

## What went sideways

1. **Worktree fiction caught by outside-voice.** Initial spec claimed "reuse /cla
   worktree pattern" — outside-voice verified /cla doesn't actually use
   worktrees. Downgrade to git stash + restore saved ~2h Sprint 1 effort.
2. **`requires_api` enum mismatch.** Schedules schema only allowed
   anthropic/openai/supabase_product_read; supabase_access_token (what
   calibrate-efficacy actually needs) isn't listed. Sprint 3 workaround:
   remove the requires_api field + document via comment. v1.1 schema bump
   to add supabase_ops_read or supabase_access_token.
3. **SKILL_REGISTRY entry needed even for deferred-stub.** The L2 validator
   `schedules ↔ skill registry` flagged eval-evo-calibrate-efficacy missing.
   Fixed by adding a deferred stub to minion-worker/index.ts that just
   reports "founder runs manually for v1.0."
4. **Founder hold-out ratings cannot be auto-generated.** Spec gates /evolve
   invocation on 25 founder ratings in `_HOLDOUT.yaml`. v1.0 ships with all
   placeholders; orchestrator refuses to invoke until founder completes.
   Honest gate — protects against systematic rubric bias (R7).

## Day-30 efficacy gate (post-ship discipline)

30 days after capability transitions to `operating` (which happens after
founder completes _HOLDOUT.yaml), `scripts/eval-evo/calibrate-efficacy.cjs`
fires automatically (cron via `knowledge/schedules.yaml`).

- **PASS** if median composite-score gain across ≥10 evolved entities ≥ 1.5× judge σ → /evolve continues
- **PAUSE-RECOMMENDED** otherwise → orchestrator refuses new invocations; founder retro decides v1.1 redesign vs continue

This is the most important discipline. Without it, /evolve is theater.

## Lessons learned (for future capabilities)

1. **Pre-decide via /plan-ceo-review then /cla short-circuits.** The 522-line
   PLAN took ~3h interactive. Compared to a /cla that re-discovers
   everything in Phase 1-5 (would take 10+h). Front-loading pays.
2. **Outside-voice is worth $0.10/run.** It caught the worktree fiction
   AND the unfalsifiable-success problem. Both would have shipped without
   it. Mandatory for Tier C+ /evolve runs, optional but recommended for
   pre-ship plan reviews.
3. **Spearman hold-out validation is the right shape, not a sample size.**
   v1.0 uses N=5 per playbook. Not statistically rigorous but ENOUGH to
   catch systematic bias. v1.1 may grow N to 10-15 per type if budget allows.
4. **Karpathy is inspiration, not authority.** The substrate is different
   (subjective LLM-judged vs deterministic numerical training). Borrow the
   discipline (single metric, fixed budget, keep-or-discard) but justify
   each design choice on its own merit.
5. **Self-improvement tools need explicit shutdown criteria.** The day-30
   1.5× σ gate is what separates /evolve-as-tool from /evolve-as-theater.

## Boilerplate-extractable patterns

For `notes/boilerplate-candidates.md`:

1. **Per-type playbook + judge skill pattern** — reusable for any
   classify-and-improve workflow on multi-type entities.
2. **Spearman hold-out validation gate** — applicable to any rubric-based
   scoring system that needs anti-bias discipline.
3. **Falsifiable efficacy gate via day-N retro** — generalizable to any
   exploratory v1.0 capability where success could be theater.
4. **Outside-voice 3-tier fallback chain** — codex → subagent → annotate.
   Reusable wherever independent verification is needed but external
   dependencies are flaky.
5. **Deferred-stub SKILL_REGISTRY pattern** — minion-worker stubs that
   document the manual founder-invocation while satisfying the L2 validator.

## Founder onboarding next steps

1. ✅ /cla Phases 0-8 complete (this session).
2. ⏳ Founder completes `06-ai-ops/skills/eval-evo/cases/_HOLDOUT.yaml` (25 ratings, ~2h).
3. ⏳ Founder runs `node scripts/eval-evo/playbook-validate.cjs`.
4. ⏳ For each playbook with Spearman <0.6: revise rubric, re-validate.
5. ⏳ State transitions deployed → operating once all 5 playbooks PASS.
6. ⏳ Founder runs first `/evolve skill <real-entity>` — typically wiki-sync/distill
   or content-drafter as the quality-engine-for-revenue target.
7. ⏳ Day-30 calibration fires automatically; founder reviews verdict.

## Acknowledgments

This capability was designed and shipped by Claude Opus 4.7 (1M context)
in a single overnight session at founder's authorization. The /plan-ceo-review
and /plan-eng-review prior session (~3h founder + AI) was the load-bearing
strategic work; /cla itself was mostly mechanical assembly.

Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) provided
the conceptual scaffolding (one metric, fixed budget, keep-or-discard).

Outside-voice via codex CLI (OpenAI gpt-5) caught the two highest-leverage
issues (worktree fiction; unfalsifiable success). Cross-model adversarial
review is the single best investment in self-improvement infrastructure.

---

# v1.1 retrospective — SkillOpt integration (Sprint 1-5)

**Promoted to operating:** 2026-05-27 via Sprint 5 Phase 8 (this PR).
**Capability run:** ops.capability_runs[20595190-adff-40ba-bdc6-b67a60651f04]
(supersedes 9c456d98 v1.0.0).
**Tier C decision:** ops.decisions[748044a7-d213-475f-be63-323549cb94e9].

## What we built

`/evolve skillopt <skill>` — an OUT-OF-BAND task-completion measurement path
complementary to v1.0's in-session judge-persona rubric. Architecture A':
vendor microsoft/SkillOpt as git submodule + Ritsu file-queue backend
(subscription billing, zero direct HTTP from Python) + session bridge
dispatching `skillopt-target-rollout` / `skillopt-optimizer-reflect`
subagents (both `tools: []` for prompt-injection defense).

Shipped across 6 PRs over Sprints 1-5:

| PR | Sprint | Commit | Scope |
|---|---|---|---|
| #128 | 1A | `294f6b0` | vendor + Python backend + L1 SHA validator + install-vendor.sh |
| #129 | 1B | `a19ffe0` | 2 SkillOpt agents + hook unit dispatch + ROLES.md migration |
| #130 | 1C | `f6126bb` | queue protocol + session bridge + postinstall + L1 unit validator |
| #131 | 2 | `70f4f46` | gen-data + judge skills + skill-skillopt playbook + helper scripts |
| #132 | 3 | `ca62f58` | skillopt-runner orchestrator + /evolve skillopt cmd + SOP + R18 |
| #133 | 4 | `3939b86` | fixture + L1 staleness + correlation cron + 3 KPIs + 2 alerts + runbook |
| (this) | 5 | TBD | Phase 8 promotion: spec → wiki, retrospective, capability_runs state |

**Aggregate:** ~62 files, ~+4,500 LOC. Tier C ceremony fired once at Sprint 1
sub-PR A; remaining sprints were Tier B (pre-approved at Phase 5).

## What went well

1. **Architecture A' was the right answer (4 brainstorm revisions paid off).**
   Subscription-billed via session bridge means zero per-call API costs.
   Founder hit the constraint hard ("no API key") and the synthesis landed
   in revision 4 (file 09) after a sequence that surfaced and discarded
   3 simpler-looking-but-wrong options. The session-message-count caps
   (`{unit: messages}` tagged form in ROLES.md) are the right abstraction
   for measuring this cost.

2. **Sub-PR chunking of Sprint 1 (A/B/C).** Splitting the ~13-15h Tier C
   sprint into three smaller PRs with natural seams kept review surface
   manageable. @cto caught real bugs in each pass (3 MUST-FIX across the
   3 sub-PRs); each was fixed in-PR before merge.

3. **Patch-on-install vs vendor-mirror.** Per Sprint 1 sub-PR A's @cto
   review, we discovered the spec's "ONLY ADDITION inside submodule" claim
   was structurally impossible (git submodules don't allow parent-repo
   tracking of files inside). Patch-on-install (backend + router.patch in
   our repo; install-vendor.sh applies them) avoided a founder-action
   prereq while preserving the architectural intent.

4. **Folding @cto SHOULD-FIX items in subsequent sprints.** Sub-PR B
   absorbed sub-PR A's SHOULD-FIX list before sub-PR C bridge writes
   started hitting real traffic. This created a cumulative quality
   ratchet without blocking any single PR's merge.

## What surprised us

1. **Upstream SkillOpt structure didn't match spec assumptions.** Sprint
   1 sub-PR A discovered the spec assumed `model/backends/` subdir +
   class-based interface; actuality is flat `<name>_backend.py` files +
   module-level functions. Spec §19 will get a corrective amendment
   (deferred to v1.2 — not blocking v1.1 promotion).

2. **Pillars 2 + 4 needed deferral.** Sprint 2 @cto review surfaced that
   `ops.evolve_extractions.ref_source_kind` enum doesn't include
   `'run-summary'` (Pillar 2) or `'gbrain'` (Pillar 4). Adding migration
   00045 inside Sprint 2 would have escalated to Tier C and blown scope.
   Deferred cleanly to v1.2 with active set `[1, 3, 5]` per spec §19.5.

3. **Documentation drift was the dominant bug class.** Across 4 @cto
   reviews (Sprints 1A, 1B, 1C, 2, 3, 4), every MUST-FIX was a
   doc-vs-reality discrepancy (kind enum, schema-vs-spec, response field
   precedence, line-number citations, lock duplication, R18 inert,
   alert-rules unstaged, KPI threshold semantics). The actual code was
   sound on first attempt; the prose around it lagged. Lesson for v1.2:
   author docs LAST after running the code at least once.

## Day-30 efficacy gate (the falsifiable test)

v1.1 promises a complementary held-out signal. The gate per spec §15.S2:
- 3 real skills evaluated within 30 days
- ≥2 produce held-out test-split delta > 0
- Production correction-rate delta < 1.5× baseline
- KPI `skillopt_synth_to_prod_correlation` ≥ 0.5 measured monthly

If 0/3 produce positive delta OR correlation < 0.3 critical fires twice,
mandatory founder retro on whether the bridge IPC or synth-data quality
is at fault — and v1.1 PAUSES pending revision.

## Pending follow-ups (deferred from v1.1)

| Item | Why deferred | Sprint to address |
|---|---|---|
| Pillars 2 (run_summaries) + 4 (gbrain) | enum extension migration | v1.2 (post-PMF) |
| Vendor rescue mirror fork | founder gh CLI action | Sprint 1 task 1.15 (still pending) |
| S1 E2E acceptance smoke run | requires `pip install -r vendor/skillopt/requirements.txt` | Founder runs after pip install |
| Cross-run R18 sweep daemon | within-run sweep on `scan` is the v1.1 mechanism | v1.2 if needed |
| Edge Function dispatch for cron handler | deferred-stub in v1.1 | Sprint 5+ when first real /evolve skillopt run produces data |
| `direction` field for low-=-bad KPIs | schema extension | separate Sprint |

## What to do differently for v1.2

1. **Author the runtime FIRST, docs SECOND.** Every doc-vs-reality MUST-FIX
   would have been caught by writing the code path first then describing it.

2. **Schema-validate spec drafts.** The spec.md frontmatter went through
   4 sprints with `state: architecting, phase: 5` stale. A pre-commit
   lint on spec frontmatter (`state` ∈ `{architecting | planning | implementing | operating}`,
   `phase` ≤ 8) would have caught it Sprint 2.

3. **Audit the cap convention.** `kpi-registry.yaml` thresholds assume
   "high = worse", but the same file holds adoption metrics where
   "low = bad". Add a `direction` field OR keep two registries.

## Acknowledgments (v1.1)

- **Founder** (4 brainstorm revisions on the SkillOpt synthesis; the
  "Hold all constraints; synthesize don't oscillate" rule was the
  forcing function that produced Architecture A').
- **@cto subagent** (6 PR reviews; ~$2.50 cumulative review cost vs
  prevented bugs — likely 10× ROI given the schema MUST-FIX catches
  would have caused first-INSERT runtime failures).
- **Microsoft SkillOpt team** (MIT-licensed upstream; the Liu et al.
  2025 paper at arXiv:2605.23904 supplied the rollout/optimizer agent
  pattern verbatim).
- **Karpathy autoresearch** (still the conceptual anchor for "one
  composite metric, fixed budget, K4 keep-or-revert").
