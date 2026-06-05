---
description: |
  Project-scoped command for ritsu-works. Front-end for the
  **thinking-toolkit** capability (v3.2.0). Routes to 13 McKinsey/Minto-derived
  thinking-discipline skills under `06-ai-ops/skills/thinking-toolkit/`.

  Use when you want to apply a specific thinking framework to the current
  problem, output, or decision — without having to remember each skill's
  exact name. Subcommands map 1:1 to skills; `list` enumerates available
  frameworks; `flow` recommends a multi-skill sequence for ambiguous
  starting points.

  Extensible by design: new thinking frameworks (Cynefin, OODA, Wardley
  Mapping, etc.) are added by dropping a SKILL.md under
  `06-ai-ops/skills/thinking-toolkit/<slug>/` and adding one row to the
  subcommand table below — no command-side code changes.

  Tier A (guidance only — no external action, no money, no user impact).

argument-hint: "[triage <problem> | mckinsey <problem> | tosca <problem> | mece [list] | pyramid [conclusion] | so-what [conclusion] | 2x2 <axis-x> <axis-y> | driver-tree <metric> | hypothesis <problem> | premortem [decision] | root-cause [symptom] | design-thinking <problem> | debias [decision] | list | flow [problem]]"
---

# /think

Project-scoped command for ritsu-works. Front-end for the **thinking-toolkit**
capability (v3.2.0). Capability spec at `wiki/capabilities/thinking-toolkit/spec.md`.

The command is a **thin orchestrator**. All thinking discipline lives in the 12
skills under `06-ai-ops/skills/thinking-toolkit/`. Subcommands invoke those
skills via the `Skill` tool with the current context as input.

Per `governance/HITL.md`, all `/think` invocations are **Tier A** — guidance
documents read by the invoking agent; no external action, no money movement,
no user impact, no escalation paths.

## Subcommands (v3.5 — 17 verbs)

| Invocation | Maps to skill | Purpose | HITL |
|---|---|---|---|
| `/think` | — | Show menu + composition flow + skill index | A |
| `/think list` | — | Table of all 13 skills (12 atomic + the mckinsey-workflow engine; name, one-line, when to use) | A |
| `/think triage <problem>` | `thinking-toolkit/problem-triage` | **Route a problem to the right WEIGHT** — mckinsey / deepask / a single atom / direct. The front door that makes mckinsey the PRIMARY solver for consequential problems without over-applying it (v3.2) | A |
| `/think flow [problem]` | — | Recommend a multi-skill sequence (TOSCA → MECE → driver-tree → 2x2 → pyramid → so-what) | A |
| `/think mckinsey <problem> [flags]` | `thinking-toolkit/mckinsey-workflow` | Run a problem as a McKinsey 4S **TEAM** — pull real data · validate · living one-day answer · re-route · ask founder-only data (v1.4) · load+select from the unified thinking-tool library — **631 frameworks + 20 inherited ex-McKinsey domain processes** via fast per-checkpoint maps (v1.5 registry → **v3.0** consulting library) · mechanically scaffold + gate (v1.6) · **HITL receipt gate** (v1.8) · **team operating model** (v2.0): `--mode=interactive`(default)`/auto`, 7 team-session checkpoints (frame/hypothesize/plan/prioritize/porpoise/dissent/pre-wire) with a `pre-wire`+`dissent` gate, thorough data-sweep + completeness-critic, and a **Sell formatter** to McKinsey templates in any `/deepask` format+design-system · **v2.1**: sell templates GROUNDED in real McKinsey reports (not guessed) + **`--workflow=off/steps/full`** runs each high-leverage step as a dynamic multi-agent WORKFLOW · **v3.1**: the 3 paths + 5 decision-gates of the 4S diagram restored as first-class catalog sections (`paths`/`decision_gates`), an **auto-run gate hook** at Sell, and **coherence-validated** tool counts (631/20). Flags: `--mode --depth --sell --audience --style --art-style --sources --format --workflow` (see SKILL.md) | A |
| `/think tosca <problem>` | `thinking-toolkit/tosca-problem-framing` | Frame ambiguous problem via T/O/S/C/A before solutioning | A |
| `/think mece [list]` | `thinking-toolkit/mece-decomposition-check` | 2-test quality gate on list/decomposition (overlap + exhaustive) | A |
| `/think pyramid [conclusion]` | `thinking-toolkit/pyramid-principle-output` | Top-line first; reader can stop at any level | A |
| `/think so-what [conclusion]` | `thinking-toolkit/so-what-test` | Force conclusion to survive 2× "so what?" challenges | A |
| `/think 2x2 <axis-x> <axis-y>` | `thinking-toolkit/2x2-synthesis-matrix` | Synthesize 4+ options on 2 orthogonal axes | A |
| `/think driver-tree <metric>` | `thinking-toolkit/driver-tree-decomposition` | Decompose target metric into actionable upstream drivers | A |
| `/think hypothesis <problem>` | `thinking-toolkit/hypothesis-driven` | Falsify-first analysis sequencing + running one-day answer (v1.2) | A |
| `/think premortem [decision]` | `thinking-toolkit/pre-mortem` | Assume it failed; work backward to why before committing (v1.2) | A |
| `/think root-cause [symptom]` | `thinking-toolkit/root-cause` | Trace a CONFIRMED symptom to its fundamental cause — Five Whys, scoped (v1.2) | A |
| `/think design-thinking <problem>` | `thinking-toolkit/design-thinking` | Generative path for human-centered problems: empathize→HMW→ideate→prototype (v1.2) | A |
| `/think debias [decision]` | `thinking-toolkit/debias` | Pre-commit bias checklist — name the bias, apply the counter (v1.2) | A |
| `/think trace <slug>` | `thinking-toolkit/reasoning-trace` | **Reasoning-trace journey** — turn a completed `mckinsey` run into a narrated McKinsey **client walkthrough** PDF: a journey-map + 4 acts × milestones in a 5-beat rhythm (bối cảnh → options+chart → chose+why → dropped+why → ✓ sign-off), chart-rich, `-vi-day-du` register; v3.5 foregrounds **tool-selection** (the `toolkit_map`: which tool for which task, ✓/✗ + why) + the MECE **`issue_tree`** (kept ✓ · knock-out ★ · cut ✗ + reason) (v3.5) | A |
| `/think verify [claim]` | `thinking-toolkit/data-verification` | **Data verification** — triangulate a load-bearing external number across ≥2 independent web/deep-research sources → a verification status (v3.3) | A |

Argument conventions:
- Positional args (e.g. `<problem>`, `<metric>`) are passed to the skill as the primary input.
- Optional bracketed args (e.g. `[list]`, `[conclusion]`) — if omitted, the skill uses the most recent conversation context (the agent's prior reasoning) as input.
- Multi-word args may be quoted: `/think tosca "Why is free→paid conversion stalled at 8%?"`

## Workflow per verb

### `/think` (no args)

Print a compact menu:

```
/think — McKinsey/Minto thinking discipline (15 skills, capability v3.5.0)

  triage <problem>       Route a problem to the right weight (the front door)  (v3.2)

  tosca <problem>        Frame an ambiguous problem (T/O/S/C/A)
  mece [list]            Check a list for overlap + exhaustive
  pyramid [concl]        Structure output: top-line first
  so-what [concl]        Force conclusion to action ("so what?" 2×)
  2x2 <x> <y>            Synthesize 4+ options on 2 axes
  driver-tree <metric>   Decompose a metric into drivers
  hypothesis <problem>   Falsify-first sequencing + one-day answer   (v1.2)
  premortem [decision]   Assume it failed; find why before committing (v1.2)
  root-cause [symptom]   Trace a confirmed symptom to its root        (v1.2)
  design-thinking <prob> Generative path: empathize→HMW→prototype      (v1.2)
  debias [decision]      Pre-commit bias checklist                     (v1.2)

  trace <slug>         Reasoning-trace journey: narrated walkthrough + toolkit_map + issue_tree → PDF (v3.5)
  verify [claim]       Triangulate an external number (≥2 sources)      (v3.3)

  list                 Detailed table (when to use, pairs with)
  flow [problem]       Suggest multi-skill sequence
  mckinsey <problem>   Run a problem as a McKinsey 4S TEAM (--mode interactive/auto,
                       team-session checkpoints, sell formatter)         (v2.0)

Spec: wiki/capabilities/thinking-toolkit/spec.md
Skills: 06-ai-ops/skills/thinking-toolkit/
```

### `/think list`

Read `06-ai-ops/skills/thinking-toolkit/README.md` and render the "What's in this folder" table. Auto-discovers any new framework added by dropping a SKILL.md under the parent folder.

### `/think flow [problem]`

Recommend a multi-skill workflow. If `[problem]` provided, lightly tailor; otherwise show the canonical flow.

Canonical flow (per `06-ai-ops/skills/thinking-toolkit/README.md`):

```
ambiguous problem
       │
       ▼
  TOSCA framing  ─────►  measurable goal
       │                       │
       ▼                       ▼
  gap analysis            driver tree (if metric-driven)
       │                       │
       ▼                       │
  options enumerated           │
       │                       │
       ▼                       │
  MECE check ◄─────────────────┘
       │
       ▼
  2x2 synthesis (if 4+ options)
       │
       ▼
  recommendation
       │
       ▼
  pyramid-principle-output (structure)
       │
       ▼
  so-what-test (quality gate)
       │
       ▼
  ship
```

Not every workflow uses every skill. The command surfaces this as guidance; the agent picks which links of the chain to invoke.

### `/think triage <problem>` (v3.2 — the front door)

Invoke `thinking-toolkit/problem-triage`. Routes the problem to the right WEIGHT on two axes (consequence × shape): **① direct answer · ② `/deepask` · ③ a single `/think` atom · ④ `/think mckinsey`** (the full 4S engine, for consequential + ambiguous + multi-source). This is what makes `/think mckinsey` the **primary problem solver** for the hardest decisions while reserving the big gun (anti–"anxious parade of knowledge"). It is the FIRST step of `SOP-AIOPS-012-consequential-problem-solving` and the @ceo/@cgo/@cpo routing reflex.

```
/think triage "Is the US college-STEM wedge the right first-100 ICP, or Vietnam-first?"
→ Route: ④ /think mckinsey (consequential + ambiguous + multi-source) → invoking the engine.
```

### `/think tosca <problem>`

Invoke `thinking-toolkit/tosca-problem-framing` skill with `<problem>` as input. The skill produces a 1-page T/O/S/C/A document. The agent writes the output to the conversation; founder may optionally `--to=<path>` capture to file (deferred — revisit post-v1.2).

```
/think tosca "Why is free→paid conversion stalled at 8% despite 3x signup growth?"
```

→ Output: Trouble / Owner / Success criteria / Constraints / Actors per `tosca-problem-framing` template.

### `/think mece [list]`

Invoke `thinking-toolkit/mece-decomposition-check`. If `[list]` provided as inline arg, use directly; otherwise apply to the most recent list-shaped output in the conversation.

```
/think mece "fixed-cost: rent, salaries, software; variable-cost: stripe-fees, ad-spend, vendor-payments"
```

→ Output: 2-test gate (overlap? exhaustive?) with remediation suggestions if any.

### `/think pyramid [conclusion]`

Invoke `thinking-toolkit/pyramid-principle-output`. Restructures a paragraph/argument to top-line-first form. Mandatory pair with `so-what-test`.

### `/think so-what [conclusion]`

Invoke `thinking-toolkit/so-what-test`. Forces a conclusion to survive two iterations of "so what?". Output: either a strengthened conclusion or the action item that was missing.

### `/think 2x2 <axis-x> <axis-y>`

Invoke `thinking-toolkit/2x2-synthesis-matrix`. Plots 4+ items on the two orthogonal axes the founder supplies.

```
/think 2x2 "founder-effort-required" "expected-MRR-uplift"
```

→ Output: 2x2 matrix with items placed in quadrants, plus per-quadrant insight + recommendation.

### `/think driver-tree <metric>`

Invoke `thinking-toolkit/driver-tree-decomposition`. Decomposes a target metric into upstream drivers via the 5 logic-tree types (per Conn & McLean Ch 3).

```
/think driver-tree "free_to_paid_conversion"
```

→ Output: tree showing decomposed drivers, MECE-checked, with action recommendations at the leaves.

## Chart types for the McKinsey Sell (via `/dataviz`)

`/think mckinsey`'s **Sell** step is exhibit-led — every exhibit is rendered through **`/dataviz`** (the action-title becomes the chart `--message`/title; the analysis line becomes the source footer; `--style` flows the brand). The chart follows the **message, not the data** (Zelazny). `/dataviz` offers **60 built chart types across 6 families** (full catalog: `06-ai-ops/skills/dataviz/catalog.md`; registry: `knowledge/dataviz-renderers.yaml`):

| Family | Chart types |
|---|---|
| **Comparison** | `bar` `column` `grouped` `lollipop` `dot` `dumbbell` `slope` `radar` `quadrant` `bullet` `small-multiples` `range` `matrix-chart` `table-chart` |
| **Correlation** | `scatter` `bubble` `heatmap` `connected-scatter` `hexbin` |
| **Part-to-whole** | `stacked` `stacked100` `pie` `donut` `marimekko` `diverging` `funnel` `waffle` `treemap` `population-pyramid` `sunburst` `dendrogram` `venn` `semicircle-donut` |
| **Change-over-time** | `line` `area` `stacked-area` `waterfall` `bump` `spline` `step-line` `gantt` `candlestick` `ohlc` `barcode` |
| **Distribution** | `histogram` `box` `density` `ridgeline` `violin` `strip` `jitter` `beeswarm` `horizon` |
| **Flow** | `sankey` `chord` `arc` `network` `flowchart` `tile-map` |

Plus `kpi` (big-number tile). The McKinsey **message → chart** heuristics the Sell applies: **waterfall** for a bridge (start → drivers → end), **funnel** for conversion/drop-off, **quadrant/matrix** for positioning, **gantt** for a roadmap/plan, **slope** for before-vs-after on two periods, ranked **bar** for "who's biggest" (never `pie`/`donut` for ranking), **line/area** for a trend. Selection is LLM-native — the agent reads the catalog + the situation and picks; see `/dataviz`.

## Composition

### With `/muse` personas

`/muse <persona>` uses different cognitive lenses (Feynman, Socrates, Kotler, etc.). `/think` uses *output discipline* (structure, decomposition, conclusion testing). They compose well:

```
/muse:paul-graham "Should we kill the Plus tier?"     # cognitive lens
→ paragraph of PG-style argument
/think pyramid                                         # restructure for founder reading
/think so-what                                         # force action item
```

### With `/cla propose`

`/cla propose` Phase 1 (problem-framer) invokes `tosca-problem-framing` implicitly. Use `/think tosca` standalone when you want TOSCA framing WITHOUT triggering full CLA ceremony (e.g., exploratory thinking).

### With `/office-hours`

`/office-hours` (gstack) startup mode forces 6 questions. `/think tosca` is the lighter version when you already know the problem space but need disciplined framing.

### With C-suite personas

`@ceo` / `@cto` / `@cgo` / `@cpo` already reference `pyramid-principle-output` + `so-what-test` as MANDATORY in their output contracts (per persona files in `.claude/agents/`). `/think pyramid` + `/think so-what` are the *manual* invocations — same skills, direct surface.

## Extensibility — adding a new thinking framework

To add a new framework (e.g., Cynefin sense-making, OODA loop, Wardley mapping):

1. **Author the skill** at `06-ai-ops/skills/thinking-toolkit/<framework-slug>/SKILL.md`.
   Follow the established structure: frontmatter, when-to-use, when-NOT-to-use,
   how-to-apply, output format, ≥3 worked examples, composition notes,
   anti-claims, references.

2. **Add one row** to the "Subcommands" table above:
   ```
   | `/think <framework-slug> [arg]` | `thinking-toolkit/<framework-slug>` | <one-line purpose> | A |
   ```

3. **Update `06-ai-ops/skills/thinking-toolkit/README.md`** with the new framework
   in the "What's in this folder" table.

4. **Regenerate resolver catalog:**
   ```bash
   pnpm resolver:sync --apply
   pnpm resolver:index
   ```

5. **Docs MDX auto-generates** via docs-engine skill-adapter on next `/docs sync`.

6. **Commit + PR + merge.** No `/cla` ceremony needed if pure-additive (per `/cla extend` HITL B threshold).

No code changes to `/think` command itself for new frameworks — the table is the registry.

## State persistence

Each `/think <subcommand>` invocation = single `ops.agent_runs` row (agent_slug=`thinking-toolkit/<skill-name>`). Cost-bucket: `ai-ops-skill-library`. Per-invocation LLM cost: $0 (skills are guidance documents; LLM cost is attributed to the calling agent's existing reasoning budget, not a separate `/think` cost line).

## Drift gates

- `pnpm check` includes `resolver-v2 catalog` validator — fails CI if new skill added but catalog not regenerated.
- No dedicated `/think` validator (command file is its own source of truth).

## HITL discipline

- All operations Tier A. No HITL escalation in any subcommand.
- This is the highest-frequency-acceptable-invocation surface in the workforce (founder can call `/think` hundreds of times per month at $0 LLM cost).

## Errors

- `UnknownSubcommandError` — argument doesn't match any verb in the table; show menu.
- `SkillNotFoundError` — referenced skill file missing on disk (means catalog drift; suggest `pnpm resolver:sync`).
- `MissingPositionalArgError` — required positional (e.g., `<problem>` for tosca) absent; print usage hint.

## Defensive notes

- This command does NOT replace reading the skill. Subcommands are *invocation* convenience; the actual thinking discipline lives in the SKILL.md files. Encouraging skim-then-pattern-match defeats the point.
- Output is by default in-conversation (no file writes). Future `--to=<path>` capture is deferred (revisit post-v1.2 if founder demands).
- `/think list` and `/think flow` are auto-discovery surfaces — they read the README + skill folder on disk. They will reflect any framework added to the folder without command edits.

## Related commands

- `/muse <persona>` — cognitive-lens personas (different angle on the same problem).
- `/cla propose` — full capability proposal (uses tosca implicitly in Phase 1).
- `/office-hours` (gstack) — YC-style problem interrogation.
- `/core` — canonical doc surface (read-only reference to charter/values/etc.).

## Spec reference

Canonical: `wiki/capabilities/thinking-toolkit/spec.md` (v3.2.0).
Retrospective: `wiki/capabilities/thinking-toolkit/retrospective.md`.
Sub-flow draft notes: `.archives/cla/thinking-toolkit/v1.1-extension-delta.md`.

## Origin

Capability `thinking-toolkit` v1.0 (shipped 2026-05-28) authored 6 skills under
`06-ai-ops/skills/thinking-toolkit/` distilled from:
- Garrette, Phelps & Sibony (2018) — *Cracked it!* — the 4S method (State / Structure / Solve / Sell)
- Conn & McLean (2018) — *Bulletproof Problem Solving* — 7-step method
- Minto (1987) — *The Pyramid Principle*
- BCG Growth-Share matrix (1970)
- Descartes (1637) — *Discourse on the Method* — MECE roots

v1.1 (this command, shipped 2026-05-28) adds the `/think` invocation surface — pure
additive, zero changes to the underlying skills.
