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

## Origin (authentic sources)

Distilled from two McKinsey-derived primary textbooks (both in `raw/mckinsey/`):

- **Garrette, B., Phelps, C., & Sibony, O. (2018). *Cracked it! How to solve big problems and sell solutions like top strategy consultants*.** Palgrave Macmillan. The 4S method (State / Structure / Solve / Sell) is the textbook spine. Chapter map:
  - Ch 4 (pp. 53-67) → `tosca-problem-framing`
  - Ch 5 (pp. 69-92) → `mece-decomposition-check` + `driver-tree-decomposition`
  - Ch 6 (pp. 95-115) → `2x2-synthesis-matrix`
  - Ch 10 (pp. 197-220) → `pyramid-principle-output` + `so-what-test`

- **Conn, C., & McLean, R. (2018). *Bulletproof Problem Solving: The One Skill That Changes Everything*.** Wiley. McKinsey alumni Charles Conn (Rhodes Trust) + Rob McLean (McKinsey Director Emeritus). Chapter map:
  - Ch 2 (pp. 31-47) → `tosca-problem-framing` (Pacific Salmon case)
  - Ch 3 (pp. 49-86) → `driver-tree-decomposition` (5 logic-tree types) + `mece-decomposition-check`
  - Ch 7 (pp. 179-194) → `pyramid-principle-output` + `so-what-test`

Plus canonical originals:
- **Minto, Barbara. *The Pyramid Principle* (1987)** — pyramid + so-what + MECE roots.
- **Descartes, René (1637). *Discourse on the Method*** — 4 rules underlying MECE (Cracked it! Ch 5 traces explicitly).
- **BCG Growth-Share matrix (1970)** — 2x2 synthesis pattern.

Filtered for ritsu-works fit (B2C self-serve EdTech, PLG, 1-founder):
- ✅ Kept: 6 high-leverage daily-use skills
- ❌ Rejected: Issue Tree (Cracked it! Ch 5 treats as twin to hypothesis pyramid — we picked the higher-leverage one), Ghost Deck (corporate-only), 5 Whys (Cracked it! p. 58 explicitly rejects: *"asking why isn't always specific enough"*), 80/20 Pareto (overlap with /muse:paul-graham), 7S (1-person org N/A), PEST/Porter (overlap with /muse:kotler)

## Capability lifecycle

This folder is the deliverable of capability `thinking-toolkit` v1.0 (proposed + shipped 2026-05-28). See `.archives/cla/thinking-toolkit/spec.md` (local) or `wiki/capabilities/thinking-toolkit/spec.md` (post Phase 8 promotion).

## Anti-claims

- This is NOT a McKinsey method wholesale. We took 6 discrete tools, not the whole consulting process.
- This is NOT thinking quality. Skills structure output; humans must still think.
- This is NOT mandatory for every output. Each skill has a when-NOT-to-use section preventing over-application.
