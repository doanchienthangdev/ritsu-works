# Thinking Toolkit

> 6 standalone composable skills extracted from McKinsey/Minto thinking discipline. NOT the whole process — discrete high-leverage tools.

## What's in this folder

| Skill | One-line | Pairs with |
|---|---|---|
| [`tosca-problem-framing`](./tosca-problem-framing/SKILL.md) | Frame ambiguous problem via T/O/S/C/A before solutioning | gap-analysis, pyramid |
| [`mece-decomposition-check`](./mece-decomposition-check/SKILL.md) | 2-test quality gate on lists: overlap + exhaustive | pyramid, driver-tree |
| [`pyramid-principle-output`](./pyramid-principle-output/SKILL.md) | Top-line first; reader can stop at any level | so-what, mece (mandatory) |
| [`so-what-test`](./so-what-test/SKILL.md) | Every conclusion survives 2× "so what?" | pyramid (mandatory pair) |
| [`2x2-synthesis-matrix`](./2x2-synthesis-matrix/SKILL.md) | Synthesize 4+ options on 2 orthogonal axes | pyramid, driver-tree |
| [`driver-tree-decomposition`](./driver-tree-decomposition/SKILL.md) | Decompose target metric into actionable upstream drivers | pyramid, mece, so-what |

## When to use this folder

Composing thinking-toolkit into a workflow:

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

Not every workflow uses every skill. Compose as needed.

## C-suite persona integration

The 4 C-suite personas (`@ceo`, `@cto`, `@cgo`, `@cpo`) reference `pyramid-principle-output` + `so-what-test` as MANDATORY in their output contract. The other 4 skills are invoked situationally.

## Origin

Extracted from:
- Barbara Minto, *The Pyramid Principle* (1987) — pyramid + so-what + MECE
- McKinsey internal training — TOSCA, driver-tree
- BCG Growth-Share matrix (1970) — 2x2 synthesis

Filtered for ritsu-works fit (B2C self-serve EdTech, PLG, 1-founder):
- ✅ Kept: high-leverage daily-use skills
- ❌ Rejected: Issue Tree (overlap with /muse + MECE), Ghost Deck (corporate-only), 5 Whys (overlap with /muse:socrates), 80/20 (overlap with /muse:paul-graham), 7S (1-person org N/A), PEST/Porter (overlap with /muse:kotler)

## Capability lifecycle

This folder is the deliverable of capability `thinking-toolkit` v1.0 (proposed + shipped 2026-05-28). See `.archives/cla/thinking-toolkit/spec.md` (local) or `wiki/capabilities/thinking-toolkit/spec.md` (post Phase 8 promotion).

## Anti-claims

- This is NOT a McKinsey method wholesale. We took 6 discrete tools, not the whole consulting process.
- This is NOT thinking quality. Skills structure output; humans must still think.
- This is NOT mandatory for every output. Each skill has a when-NOT-to-use section preventing over-application.
