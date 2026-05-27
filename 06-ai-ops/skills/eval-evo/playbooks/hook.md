---
playbook_for: hook
judge_persona: "@cto"
proposer_persona: eval-evo-orchestrator
composite_range: [0, 100]
sub_score_count: 10
allowed_paths_for_proposer:
  - ".claude/hooks/<name>.md"
  - ".claude/hooks/<name>-tests/**"   # added v1.1 — co-located hook tests (e.g., from /update hook test-gen)
  - ".claude/hooks/cases/<name>/**"   # added v1.1 — known-good/known-bad fixtures
sub_scores:
  - id: C1
    name: "Trigger correctness"
    what_10_looks_like: "Fires on intended events ONLY; documented trigger conditions match implementation pattern; no false-positive fires."
    what_0_looks_like: "Fires too often (noise) OR misses cases it should catch."
  - id: C2
    name: "Block / pass decision matrix"
    what_10_looks_like: "Has explicit decision table: input → block/pass + rationale; matches governance/HITL.md tier policy."
    what_0_looks_like: "No decision table; behavior reverse-engineered from code."
  - id: C3
    name: "Error fallback"
    what_10_looks_like: "Documents what happens if hook itself errors (safe-fail = pass? safe-fail = block? per HITL.md)."
    what_0_looks_like: "Hook error behavior undefined; could break workflow silently."
  - id: C4
    name: "Performance budget"
    what_10_looks_like: "Documents wall-clock budget; respects timeouts; doesn't block main flow >1s."
    what_0_looks_like: "No budget; could hang or slow every action."
  - id: C5
    name: "Test fixture coverage"
    what_10_looks_like: "Has known-good + known-bad fixtures in cases/<name>/; both paths tested."
    what_0_looks_like: "No fixtures; behavior brittle."
  - id: C6
    name: "Tier classification"
    what_10_looks_like: "Cites its HITL tier explicitly; cites what HITL.md actions it enforces."
    what_0_looks_like: "No tier mention."
  - id: C7
    name: "Audit logging"
    what_10_looks_like: "Writes to ops.audit_log on every fire (especially blocks); includes context for forensics."
    what_0_looks_like: "No audit trail; investigations require code-archaeology."
  - id: C8
    name: "Security posture"
    what_10_looks_like: "Threat model documented (what attack does this hook prevent); refuses to skip on --no-verify (or documents why skip is safe)."
    what_0_looks_like: "No threat model; skip-flag accepted blindly."
  - id: C9
    name: "Cross-refs to enforcement spec"
    what_10_looks_like: "Cites governance/HITL.md section; cites SECRETS.md or other relevant policies."
    what_0_looks_like: "Hook is policy-free; floats independently."
  - id: C10
    name: "Recovery from rejection"
    what_10_looks_like: "When hook blocks, user gets specific error + remediation steps; not generic 'denied'."
    what_0_looks_like: "Generic block message; user stuck."
version: 0.1.0
spearman_holdout_status: pending_founder_ratings
spearman_holdout_threshold: 0.6
---

# Playbook — Scoring `hook`-type entities

> Version 0.1.0 (Sprint 1 stub). Frontmatter canonical; prose in Sprint 2.

## Composite

`composite = sum(sub_scores)`, 0-100.

## Judge persona

**@cto** per spec §6.3. Hooks are safety infrastructure — code-aware persona.

## Allowed paths

`.claude/hooks/<name>.md`.

## Tier note

Hooks are **Tier C** per HITL.md (hooks govern safety). /evolve on a hook
ALWAYS opens a PR (no in-place install). Founder reviews the diff +
fixture changes together.

## Test fixtures (required, not optional)

Hooks are programs. Per C5 above, hooks MUST have known-good + known-bad
fixtures in cases/<name>/. Sprint 3 seeds 2 cases per hook; v1.1 grows the
fixture battery.
