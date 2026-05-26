---
playbook_for: agent
judge_persona: "@ceo"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - ".claude/agents/<name>.md"
sub_scores:
  - id: C1
    name: "Persona voice consistency"
    what_10_looks_like: "Agent prose reads in a consistent voice across all sections; matches its bound persona's character."
    what_0_looks_like: "Voice shifts mid-document; corporate one paragraph, casual the next."
  - id: C2
    name: "Bound-role permission alignment"
    what_10_looks_like: "Agent's claimed actions all map to its bound role in knowledge/workforce-personas.yaml; nothing claimed that role can't do."
    what_0_looks_like: "Agent claims actions outside its role's permission boundary."
  - id: C3
    name: "Routing accuracy"
    what_10_looks_like: "Agent knows when to delegate vs handle; routing rules explicit and match cla-routing-keywords.yaml."
    what_0_looks_like: "Always handles in-house OR always delegates; no judgment."
  - id: C4
    name: "Decision style fit"
    what_10_looks_like: "Decision-making style (deliberative / fast / cautious) matches the persona's stated character."
    what_0_looks_like: "Generic decision-making; could be any agent."
  - id: C5
    name: "Tool / skill cross-refs"
    what_10_looks_like: "Lists which skills the agent invokes most often; documents the canonical invocation pattern."
    what_0_looks_like: "No tool/skill references."
  - id: C6
    name: "HITL discipline"
    what_10_looks_like: "Knows its hitl_max_tier; refuses actions above tier without explicit override."
    what_0_looks_like: "No tier awareness; could attempt Tier D actions silently."
  - id: C7
    name: "Escalation path"
    what_10_looks_like: "Documents who/what the agent escalates to (per governance/ROLES.md escalation_role)."
    what_0_looks_like: "No escalation path; stuck states have no handler."
  - id: C8
    name: "Test prompts"
    what_10_looks_like: "Has 3-5 golden prompts in cases/<name>/; expected responses documented."
    what_0_looks_like: "No test prompts; behavior unverifiable."
  - id: C9
    name: "Brand voice alignment"
    what_10_looks_like: "Voice matches 00-core/brand_voice.md when agent speaks externally."
    what_0_looks_like: "Voice off-brand; risks brand inconsistency in customer-facing outputs."
  - id: C10
    name: "Failure modes documented"
    what_10_looks_like: "Lists what the agent CANNOT do (refusal cases); explicit boundaries."
    what_0_looks_like: "No documented refusals; agent may exceed scope silently."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `agent`-type entities

> Version 0.1.0 (Sprint 1 stub). Frontmatter is canonical; prose body
> expanded in Sprint 2.

## Composite

`composite = sum(sub_scores)`, 0-100.

## Judge persona

**@ceo** per spec §6.3. Persona consistency + decision style judged by
the strategic founder-y persona.

## Allowed paths

Single file: `.claude/agents/<name>.md`.

## Note on agent vs command

- Agent file (`.claude/agents/<name>.md`) defines a subagent's persona +
  permissions for invocation via Anthropic Agent tool.
- Command file (`.claude/commands/<name>.md`) is the founder's slash-command
  entry point.

Sometimes both exist for the same logical role (e.g., `cla.md` exists in
both); they evolve independently.

## Resolver propagation discipline (normative addendum, capability `resolver-v3-jit-loading` v3.0.4)

When scoring a Phase 1+ persona agent (`ceo.md`, `cgo.md`, `cto.md`,
`cpo.md`, future `cmo.md`, `cso.md`, etc.), check for a section titled
**"## Resolver discipline (per-role propagation)"** or equivalent.

**What 10 looks like (intersects C2 Bound-role permission alignment + C5 Tool/skill cross-refs):**

- Agent explicitly states its bound role from `knowledge/workforce-personas.yaml`.
- Documents that when calling `mcp__supabase-ops__resolver_find()`, the
  `role` parameter MUST be passed explicitly with the agent's bound role
  value — NOT relied on from `MCP_CALLER_ROLE` env (which inherits the
  founder's role at MCP subprocess boot).
- Provides a code example showing the correct invocation pattern:
  ```ts
  mcp__supabase-ops__resolver_find({
    intent: "...",
    role: "<bound-role>",  // ← agent's explicit role, not env default
    limit: 5,
  })
  ```
- Explains the consequence of omission: parent's filter slice (gps/founder)
  is returned, NOT the agent's correct narrower scope.

**What 0 looks like:**

- Agent has no Resolver discipline section.
- Agent calls `resolver_find()` without `role` param in any examples.
- Agent relies on `MCP_CALLER_ROLE` env propagation (broken assumption per
  v3.0.4 finding — env doesn't auto-change on subagent spawn).

**Scoring incidence:**

This addendum does NOT introduce a new sub-score (would require version
bump + Spearman invalidation). Instead, it acts as a deduction signal
across C2 + C5:
- If agent has Resolver discipline section → +1 to C2 (correct
  permission/scope awareness) and +1 to C5 (documents canonical invocation
  pattern with `role` arg).
- If agent calls `resolver_find()` in examples WITHOUT `role` → -2 to C5
  (incorrect tool cross-ref; missing critical parameter).
- If agent's claimed actions include cross-pillar work that its bound role
  cannot do → C2 unchanged (already covered by rubric).

**Why normative (not a sub-score):**

Per-role propagation is one of MANY invocation patterns the agent must
follow correctly. Adding it as C11 would inflate rubric without proving
distinct signal. Better: judge applies it as part of C2 + C5 reasoning.
Future rubric version 0.2.0 may absorb it formally if 30-day calibration
shows persistent under-scoring of this gap.

**Reference:** Chương 40 §40.11.2 (playbook v4.0), spec change log v3.0.4 entry in
`wiki/capabilities/resolver-v3-jit-loading/spec.md`, PR #116.
