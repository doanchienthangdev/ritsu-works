# Capability Spec: consulting-toolkit — reconstruct executable processes from clues

**ID:** consulting-toolkit
**Pillar owner:** 06-ai-ops (sub-pillar: skill-library)
**State:** operating (single-session ship 2026-06-04; v0.1.1 2026-06-05 — 20th toolkit #18 CX & Design Thinking + .pptx clue support)
**Spec version:** 0.1.0
**Bound role:** gps (orchestrator) — Tier A generation; Tier C to ship the capability
**Selected option:** Option B — standalone parent-namespaced skill + thin `/toolkit` command + deterministic render pipeline + a Workflow for the reconstruction fan-out (NO Tier-2 migration; content is local-only).

> CLA-disciplined spec (the 8-phase thinking applied; the literal `/cla` slash
> command was not invoked because its Tier-C HITL gates would block with the
> founder away — see §3). Source of truth for the capability.

---

## 1. Problem statement

The founder holds 20 partial **consulting-toolkit "clues"** (Domont Consulting
overview/preview decks — commercial ex-McKinsey/BCG/Deloitte toolkits, each a
~20-page preview that reveals a full toolkit's *process spine* + *named
frameworks* + a few *sample slides*, but not the 900-slide whole). The goal:
**reconstruct the full, step-by-step, executable process** behind each clue into
a rich artifact bundle (detailed handbook PDF + sample-style deck + markdown +
machine-readable spine + per-framework anatomy) — a private business-problem-
solving process library for ritsu-works, and a feeder for the `thinking-toolkit`
McKinsey capability. The clues' strength is **logical, step-by-step
executability** (a runnable workflow), not a flat list of elements — the
reconstruction must preserve and complete that.

## 2. Why this belongs in ritsu-works

ritsu-works already builds McKinsey-grade business-problem-solving capability
(`thinking-toolkit` v2.2: `/think mckinsey`, the McKinsey TEAM operating model,
`mckinsey-sell`, a 207-framework registry). These 19 reconstructed domain
processes (strategy, M&A, supply chain, Lean Six Sigma, risk, FP&A, …) are a
direct, high-value extension of that line — and a reusable *reconstruction
engine* turns any future framework clue into the same standard. The founder's
note "important for both ritsu-works and McKinsey" reflects this.

## 3. CLA discipline applied (the 8 phases, executed autonomously)

| Phase | What was done |
|---|---|
| 0 Drift pre-flight | Confirmed no existing capability covers process-from-clue reconstruction; `thinking-toolkit` is adjacent (atomic disciplines), not overlapping (whole processes). |
| 1 Problem framing | §1. The job: clue → executable process bundle, rigor-first. |
| 2 Domain analysis | Read the master index + the exemplar (#5) deck end-to-end; identified the universal toolkit anatomy (phase chevron → modules → named frameworks → per-framework Description→Tutorial→Example→Template slide grammar). |
| 3 System inventory | Reused: `js-yaml`; pdftotext; headless Chrome + weasyprint (both verified); the `mckinsey-deliverable-anatomy` discipline (sibling genre). New: render lib + Workflow. |
| 4 Options | A: one mega-agent/toolkit (rejected — output bloat, shallow). **B: split reconstruct→deck pipeline + deterministic renderer + disk-handoff** (chosen). C: hand-author all 19 (rejected — not scalable, not a capability). |
| 5 Architecture | §4–§6. @cto-style self-review: validated the renderer on a 19-layout smoke test + the prompts on a 1-toolkit pilot before the full fan-out. |
| 6 Sprint plan | P0 investigate · P1 extract · P2 structure · P3 pipeline+exemplar · P4 capability · P5 reconstruct(workflow) · P6 render · P7 assemble · P8 ship. |
| 7 Implementation | This PR. |
| 8 Promotion | Registry/CATALOG entry + this spec; state → operating. |

Decision recorded in `ops.decisions` (audit). HITL: founder delegated
"tự thực hiện, tự ship"; session role = founder.

## 4. Architecture

```
clue PDF ─pdftotext→ _extractions/NN-raw.txt ─build-briefs.cjs→ briefs.json ─split→ worktree briefs/<slug>.md
                                                                                          │
reconstruct.workflow.js (Workflow, fan-out, 1 pipeline/toolkit):                          ▼
  Stage 1 Reconstruct (strong model, deep + research) → runtime/.../specs/<slug>.core.json
  Stage 2 Deck        (Sonnet, transform)            → runtime/.../specs/<slug>.deck.json
                                                                                          │
build-all.cjs (main loop): merge core+deck → bundle-spec.json (validate) ─────────────────┤
                                                                                          ▼
render.cjs (+ lib/{styles,md,chart,deck,doc}.cjs):
  deck.pdf      ← headless Chrome (exact 1280×720 16:9)
  handbook.pdf  ← weasyprint (A4, paged page-numbers)
  + process.md/.yaml, frameworks/*.md, templates/*, README.md, sources.md
```

**Key constraint that shaped the design (D4):** Workflow subagents are
**worktree-sandboxed** — they can read/write the worktree fs but cannot read the
main-root `raw/` source PDFs. So: extraction happens in the main loop; clues are
written worktree-local; agents write spec JSON to the worktree `runtime/`; the
renderer (main loop) reads those and writes finished bundles to `raw/`. The
orchestrator's context stays near-empty regardless of corpus size (agents hand
off via disk, return one-line acks). Verified by an explicit fs-write probe.

## 5. The artifact bundle (deliverable #1)

Canonical structure in
[`06-ai-ops/skills/consulting-toolkit/STRUCTURE.md`](../../../06-ai-ops/skills/consulting-toolkit/STRUCTURE.md);
slide grammar in
[`domont-deliverable-anatomy.md`](../../../06-ai-ops/skills/consulting-toolkit/domont-deliverable-anatomy.md).
Per toolkit: `README.md · process.md · process.yaml · <slug>-handbook.pdf ·
<slug>-deck.pdf · bundle-spec.json · slides/ · frameworks/*.md · templates/* ·
sources.md`. The executability invariant: every step names goal + tool + how +
input + output + gate; every framework carries the 6-part anatomy
(description · visual · tutorial · real example · template · pitfalls).

## 6. Files (what ships)

- `06-ai-ops/skills/consulting-toolkit/{SKILL.md, STRUCTURE.md, domont-deliverable-anatomy.md}`
- `.claude/commands/toolkit.md`
- `scripts/consulting-toolkit/{build-briefs,build-all,render}.cjs`, `reconstruct.workflow.js`, `lib/{styles,md,chart,deck,doc,toolkit}.cjs`, `_smoketest.cjs`
- `wiki/capabilities/consulting-toolkit/spec.md` (this), `CHANGELOG.md`

**What does NOT ship:** the reconstructed content (19 bundles + master index) —
it lives in `raw/consultant/tookits/` (local-only). It is original synthesis in
the consulting-deck genre, not a copy of any source deck, and is not
redistributed (clean-IP posture; the founder chose `raw/`).

## 7. Quality & validation

- Renderer validated on a synthetic 19-layout smoke test (visual inspection).
- Prompts validated on a 1-toolkit pilot (#5) before the 19-toolkit fan-out.
- `render.cjs` warns on cross-ref breaks (step→framework, framework→source).
- `build-all.cjs` validates JSON + required keys + reports per-bundle coverage
  (phases, frameworks, slides, doc words).
- Per-bundle `self_grade.coverage_pct` + STRUCTURE.md §7 checklist baked into the
  reconstruction prompt; founder spot-checks rendered bundles.

## 8. Future (deferred)

- A `process-registry.yaml` indexing all reconstructed frameworks → feed the
  `thinking-toolkit` 207-framework registry.
- Bilingual (VI) handbook rendering (reuse docs-engine translate discipline).
- `/toolkit reconstruct "<freeform clue>"` first-class ad-hoc path with its own
  brief synthesis (currently expects an extraction).
- Optional `ops.toolkit_runs` observability table (Option-B-lean defers it).

## 9. Changelog

| Version | Date | Change |
|---|---|---|
| 0.1.0 | 2026-06-04 | Initial ship. Render pipeline (19 layouts) + reconstruction Workflow + 19 Domont toolkit bundles + master index. |
| 0.1.1 | 2026-06-05 | 20th toolkit #18 (CX & Design Thinking, `.pptx` clue → new `pptx-extract.py`); 9-phase bundle (54 frameworks). Deck render fix: `expandGrp()` tolerates literal `{grp:"…"}` gate markers. Set complete: 20 toolkits + index. |
