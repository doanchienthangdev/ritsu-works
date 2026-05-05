# wiki/ — extracted reference knowledge

This folder contains **reference knowledge** extracted from `raw/` sources. It is **synced to GitHub by default**, but individual notes can be kept local using the underscore-prefix convention.

## What goes here

Notes about the world, written for the company's future self to consult:

- Competitor analysis (`wiki/competitors/quizlet.md`)
- Market research summaries (`wiki/market/edtech-2026-q2.md`)
- Paper notes (`wiki/research/active-recall-evidence.md`)
- Customer interview synthesis (`wiki/customer/student-personas.md`)
- Industry intel (`wiki/industry/ai-tutor-pricing-benchmarks.md`)
- Technical reference notes (`wiki/tech/supabase-rls-patterns.md`)

The unifying property: these are **observations, summaries, and references** — *notes about the world*, not *statements about who Ritsu is or how Ritsu operates*.

## Wiki vs Tier 1 — the boundary that matters

| | wiki/ | Tier 1 (charter, pillars, skills) |
|---|---|---|
| **Voice** | "Quizlet charges $7.99/month for premium." | "Ritsu replaces Quizlet by generating from any source in seconds." |
| **Authority** | A note. Could be wrong. Has a date. | Canonical. Authoritative. PR-reviewed. |
| **Lifecycle** | Updated freely; staleness expected | Changes only via PR + human review |
| **Use** | Inform decisions | Drive behavior |
| **If outdated** | Annoying; refresh when needed | Bug; fix immediately |

**Rule of thumb:** If an agent reads this and changes its behavior accordingly, it belongs in Tier 1. If an agent reads this to *inform* a decision it documents elsewhere, it belongs in wiki.

## Promotion path: when wiki notes become Tier 1

A wiki note never *automatically* affects agent behavior. To act on it:

1. Agent (or human) reads the wiki note.
2. Decides whether the insight should change canonical truth (e.g. "Quizlet just dropped to $3.99 — our pricing positioning needs revisit").
3. Opens a PR to the relevant Tier 1 file (`00-charter/product.md`, an SOP, a skill).
4. The PR description **cites the wiki note** by path: "Per `wiki/competitors/quizlet.md` (updated 2026-04-28), …"
5. Human (or designated reviewer agent) approves the PR.

This explicit promotion step is what prevents wiki from becoming "shadow Tier 1."

## Optional sync — keeping a note local-only

By default, every file in `wiki/` is committed and pushed. To keep a specific note local-only:

**Prefix the filename with an underscore:** `wiki/_my-private-draft.md` or `wiki/research/_unfinished-thoughts.md`.

The root `.gitignore` excludes `wiki/_*` and `wiki/**/_*` from version control. This is useful for:
- Drafts you're not ready to share with the team yet
- Sensitive competitor info under NDA
- Personal notes the founder hasn't decided to publish to the operating workforce

When the note is ready, rename to drop the underscore and `git add` normally.

## Suggested structure

Not enforced. Adjust to taste. Recommended top-level subfolders:

```
wiki/
├── competitors/      # per-competitor notes
├── market/           # macro market data
├── customer/         # personas, interview synthesis, segment analyses
├── research/         # academic papers, reports
├── tech/             # technical reference (libraries, patterns, debugging notes)
├── industry/         # broader industry intel — pricing, positioning, channel data
└── people/           # external people: investors, advisors, partners (consent-aware)
```

Within each subfolder, prefer one note per topic, one topic per note.

## Front-matter convention (recommended)

Each wiki note should start with a small YAML block:

```yaml
---
title: Quizlet — pricing and positioning
last_updated: 2026-04-28
sources:
  - raw/competitors/quizlet-pricing-2026-04.png
  - https://quizlet.com/pricing
  - raw/customer/call-2026-04-20-student-anna.m4a (timestamp 12:30)
status: current  # current | stale | superseded
related:
  - wiki/competitors/anki.md
  - 00-charter/product.md
---
```

This lets agents reason about freshness, traceability, and connections.

## Rules for agents

1. **Cite raw sources.** Every wiki note should trace back to `raw/` paths or external URLs.
2. **Date everything.** `last_updated` matters — a 2-year-old competitor note is dangerous.
3. **Don't synthesize Tier 1 statements here.** If you find yourself writing "Ritsu should…" or "Ritsu is…", stop and open a PR to the relevant Tier 1 file instead.
4. **One note per topic.** Don't accumulate sprawling docs. If a note exceeds ~500 lines, split it.
5. **Cross-link, don't duplicate.** If two notes reference the same fact, link rather than copy.

## What does NOT go here

- **Agent-generated drafts in progress** → `.archives/`
- **Raw exports, screenshots, binaries** → `raw/`
- **Statements about Ritsu's identity, strategy, or operations** → `00-charter/` or pillars
- **Procedural knowledge for reuse** → `skills/`
- **Live operational data** → Tier 2 (Supabase)
