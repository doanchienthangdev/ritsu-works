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
