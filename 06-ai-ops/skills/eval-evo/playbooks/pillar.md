---
playbook_for: pillar
judge_persona: "@ceo"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - "<entity-dir>/README.md"
  - "<entity-dir>/CLAUDE.md"
sub_scores:
  - id: C1
    name: "Pillar identity clarity"
    what_10_looks_like: "Opens with single-sentence purpose; reader knows scope in 30 seconds."
    what_0_looks_like: "Vague aspirational prose; scope unclear."
  - id: C2
    name: "Cross-pillar boundary"
    what_10_looks_like: "Explicit IN/OUT scope; names adjacent pillars + their concerns."
    what_0_looks_like: "No boundary statements; reader can't tell which pillar owns adjacent work."
  - id: C3
    name: "Sub-pillar enumeration"
    what_10_looks_like: "Lists sub-pillars with one-line descriptions; status (alive/skeleton/deferred) called out."
    what_0_looks_like: "Sub-pillars implicit or scattered through prose."
  - id: C4
    name: "SOP namespace"
    what_10_looks_like: "Documents SOP-PILLAR-NNN namespace; which SOPs are alive vs stub."
    what_0_looks_like: "No SOP guidance; reader must search."
  - id: C5
    name: "KPI ownership"
    what_10_looks_like: "References owned KPIs with link to knowledge/kpi-ownership.yaml."
    what_0_looks_like: "No KPI references."
  - id: C6
    name: "Stage status alignment"
    what_10_looks_like: "stage_status (deep/lite/skeleton) matches actual density; entry_conditions stated."
    what_0_looks_like: "stage_status mismatches reality; entry_conditions vague or absent."
  - id: C7
    name: "CLAUDE.md instruction quality (if present)"
    what_10_looks_like: "Concise pillar-specific rules; tells Claude what to do DIFFERENTLY here."
    what_0_looks_like: "Generic rules duplicate global CLAUDE.md; or missing when pillar is alive."
  - id: C8
    name: "Strategic positioning"
    what_10_looks_like: "Pillar's role in 00-core/charter.md narrative explicit; founder intent surfaced."
    what_0_looks_like: "Tactical-only; no link to charter."
  - id: C9
    name: "Cross-references"
    what_10_looks_like: "Links to other pillars + governance + knowledge yamls correct + non-broken."
    what_0_looks_like: "Stale links; broken paths; unresolved refs."
  - id: C10
    name: "Brand voice"
    what_10_looks_like: "Matches 00-core/brand_voice.md (or pillar-specific override for marketing/sales)."
    what_0_looks_like: "Voice generic; mid-document tone shifts."
---

# Eval-Evo Playbook: pillar

Judges + scores pillar-level docs (top-level pillar's README.md + CLAUDE.md).
Used by /update pillar (capability `update` v1.1 Sprint 1) and `/evolve pillar`
(not currently supported by /evolve; future).

## Per Karpathy K3 (ONE editable artifact)

```yaml
allowed_paths_for_proposer:
  - "<entity-dir>/README.md"
  - "<entity-dir>/CLAUDE.md"
```

`<entity-dir>` resolves to the pillar's own folder (e.g., `01-marketing/`,
`05-customer/`). Proposer must NOT write outside this folder (no sub-pillar
recursion, no SOP folder writes, no skill folder writes — those have their
own /update flows).

## Tier classification

- Pillar updates ALWAYS classify as Tier C minimum (PR required).
- Structural detector (in `scripts/update/classify-diff.cjs` v1.1): edits to
  `pillar_code:`, `status:`, `composes_from:`, `sops_namespace:`,
  `pillar_owner:`, or `entry_conditions:` → STRUCTURAL → forward to
  `/cla extend update`.

## Judge persona: @ceo

Pillar docs are STRATEGIC identity statements. @cto would over-index on
technical correctness (which matters less here). @ceo evaluates positioning,
narrative coherence, charter alignment.

## Cost discipline

Per /update pillar invocation: ~$0.40-0.60 (distill cap $0.30 + score-pre
$0.15 + propose $0.25 + score-post $0.15; no test-gen for prose).

## v1.0 → v1.1 evolution

Sprint 1 of /update v1.1 introduces this playbook. Sub-pillar handling is
explicitly OUT of scope; /update pillar `05-customer/success/` REFUSES.

## Reuse outside /update

This playbook is callable by /evolve in the future (pillar self-improvement
without refs) — not yet wired in v1.1, but the interface is symmetric to other
playbooks.
