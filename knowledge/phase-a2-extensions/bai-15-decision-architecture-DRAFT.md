# Bài #15 — Decision Architecture & Muse Integration (DRAFT)

**Status:** DRAFT — derived from G10 walkthrough, not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G10-decisions.md`
**Dependencies:** Bài #1, #2, #4, #8 DRAFT, #10 DRAFT, #11 DRAFT, #13 DRAFT, #14 DRAFT

## Why
~12 issues directly across decision tracking + Muse cross-cutting.

Phase A 4-tier truth model incomplete: decisions don't fit TIER1/2/3/Insight cleanly. They're judgment events với rationale + alternatives + participants + reversibility — **5th truth category**.

Phase A doesn't address Muse integration. Founder uses Muse personally; without architecture, outputs lost, personas not formalized.

Without Bài #15:
- Decisions in Slack/Notion → lost in 6 months
- Rationale/alternatives not captured → "why X?" unanswerable
- No reversibility assessment → trapped in choice
- No revisit triggers → stale decisions persist
- Muse outputs ephemeral
- Cross-decision patterns invisible

## Decisions (tentative)

### Axis 1 — Decision Page Format & Schema
**Choice:** Extend Bài #14 page format với decision-specific frontmatter
- type: decision, decision_status, decision_tier, reversibility
- revisit_triggers, revisit_cadence, next_review_at
- participants, muse_panel reference, supersedes/superseded_by
- ops.decisions mirror table for queryability
- Markdown file primary (Bài #14 leverage), DB mirror sync

### Axis 2 — Muse Persona Registry & Panel
**Choice:** knowledge/muse-personas.yaml Tier 1 + muse-panel skill
- 29 personas seed (strategist, analyst, skeptic, budget-hawk, founder-context-keeper, etc.)
- Each persona: invocation_prompt + skill_used + cost_bucket
- Pre-defined panel templates (tech-stack, hiring, policy, product-prioritization)
- ops.muse_runs table tracks invocations
- HITL Tier C synthesis required (founder cannot auto-decide)

### Axis 3 — Time-Decay & Supersession
**Choice:** Decision domain state machine (Bài #13) + staleness scheduled check
- States: active → stale → superseded/reversed/reaffirmed/archived
- Daily decision-staleness-check skill (Bài #8)
- Stale event → alert founder (Bài #10)
- Supersession edges → knowledge graph (Bài #14)
- Cross-decision pattern recognition monthly Muse run

### Axis 4 — Dashboard + Outcome Linking + Insight
**Choice:** Bài #10 dashboard pages + outcome metrics + monthly pattern Muse
- /governance/decisions/{active,stale,by-tier,recent}
- /governance/muse-runs
- Decision page timeline tracks outcomes vs projections
- Monthly pattern Muse run → Insight pages (Bài #1)
- Persona effectiveness deferred to v1.x (need 6+ months data)

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.decisions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  decision_status text NOT NULL,
  decision_tier   text NOT NULL,
  reversibility   text NOT NULL,
  revisit_cadence interval,
  next_review_at  timestamptz,
  superseded_by   text,
  supersedes      text,
  participants    text[],
  muse_panel_run  uuid,
  rationale_summary text,
  created_at      timestamptz DEFAULT now(),
  last_assessed_at timestamptz DEFAULT now()
);
CREATE INDEX ON ops.decisions (decision_status, next_review_at);

CREATE TABLE ops.muse_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_topic  text NOT NULL,
  panel_id        text,
  personas        text[],
  context_pages   text[],
  alternatives    jsonb,
  status          text NOT NULL,
  cost_usd        numeric,
  invoked_by      text,
  invoked_at      timestamptz DEFAULT now(),
  papers_ready_at timestamptz,
  synthesized_at  timestamptz,
  decision_slug   text
);
```

## Page format (extends Bài #14)

```yaml
---
type: decision
slug: decision/<topic-slug>
tags: [...]
participants: [founder, advisor/...]
decision_status: active | superseded | reversed | stale | archived
decision_tier: tier_b | tier_c | tier_d
reversibility: easy | reversible_with_effort | hard | irreversible
revisit_triggers: [<condition>, ...]
revisit_cadence: <interval>
muse_panel:
  invoked: bool
  personas: [...]
  invocation_id: <uuid>
superseded_by: <slug or null>
supersedes: <slug or null>
related_decisions: [...]
---

# Decision: <Title>

## Compiled Truth
**Final choice:** <choice>
**Rationale:** <1-paragraph>
Connected to: [[concept/...]], [[architecture/...]]

---

## Alternatives considered
### Option A: <alt>
- Pros, Cons, Disqualifying factors
### Option B: <alt>
...

## Muse panel positions
[Auto-populated, links to muse_runs/<id>]
### <persona-name>
> <position quote/summary>

## Reversibility assessment
- Category: <reversibility>
- Migration cost, lock-in level, exit path

## Revisit triggers
- <trigger 1>
- <trigger 2>

---

## Timeline (append-only)
- <date> — Decision made
- <date> — <outcome event>
```

## YAML schemas

```yaml
# knowledge/muse-personas.yaml
personas:
  - id: <slug>
    name: <human readable>
    domain: <category>
    description: <markdown>
    invocation_prompt: <markdown>
    skill_used: <skill name>
    cost_bucket: <bucket>

panels:
  - id: panel:<slug>
    description: <markdown>
    personas: [<persona-ids>]
```

## New components (24)

24 components: page format + 2 schemas + 6 skills + 2 dashboards + 5 cross-bài-toán updates + 4 meta + 29 personas + 4-6 panel templates.

## Initial 29 personas (seed)

Strategist, Analyst, Skeptic, Budget-Hawk, Founder-Context-Keeper, Customer-Advocate, Compliance-Officer, Product-Manager, Engineering-Architect, Cultural-Fit, Skill-Match, ROI-Projection, Risk-Assessor, Technical-Debt-Tracker, Time-Horizon-Steward, Optimist, Pessimist, Devil's-Advocate (specialized variant), Creative-Synthesizer, Pattern-Recognizer, Negotiation-Coach, Communication-Critic, Privacy-Guardian, Security-Auditor, Localization-Expert (VI/EN), Brand-Voice-Keeper, Investor-Lens, Competitor-Mirror, Future-Self.

## Pre-defined panel templates

1. **panel:tech-stack-decision** — strategist + analyst + skeptic + budget-hawk + founder-context-keeper
2. **panel:hiring-decision** — cultural-fit + skill-match + roi-projection + risk-assessor + founder-context-keeper
3. **panel:policy-decision** — compliance-officer + customer-advocate + founder + skeptic
4. **panel:product-prioritization** — customer-advocate + analyst + strategist + skeptic + founder-context-keeper
5. **panel:investment-decision** — analyst + investor-lens + skeptic + budget-hawk
6. **panel:positioning-decision** — competitor-mirror + brand-voice-keeper + customer-advocate + strategist

## Open questions

- OQ15.1: Persona effectiveness metrics?
- OQ15.2: Multi-decision dependency tracking?
- OQ15.3: Tier B operator-level decisions architecture?
- OQ15.4: Muse panel cost budget management?
- OQ15.5: Persona disagreement handling (2-2 split)?
- OQ15.6: Decision archival when area obsolete?
- OQ15.7: Cross-org B2B decisions?
- OQ15.8: Visual decision tree?

## Anti-patterns

- ❌ Decisions in Slack only
- ❌ Skip Muse panel for Tier C+
- ❌ No revisit triggers
- ❌ Treat decisions as Insight
- ❌ Personas as freeform prompts
- ❌ No reversibility assessment
- ❌ No outcome linking
- ❌ Skip supersession edges
- ❌ Muse panel without HITL synthesis
- ❌ Single persona for major decision
- ❌ Persona effectiveness tracked from day 1 (premature)

## GBrain heritage notes

- **Compiled-truth + timeline format** (Bài #14 lineage)
- **Skill files are code** philosophy applies to persona definitions
- **Knowledge graph integration** for founder-context-keeper persona
- **No direct GBrain Muse equivalent** — this is Ritsu-specific innovation, but GBrain patterns inform structure

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Decision storage | Markdown files (wiki/) + Postgres mirror |
| Muse runs tracking | Postgres |
| Persona invocation | Skills + Anthropic API |
| Staleness check | Bài #8 schedules |
| Dashboard | Bài #10 pages |
| Knowledge graph integration | Bài #14 |

## Ritsu adds (Outer Harness)

1. Decision page format extension
2. ops.decisions mirror table
3. ops.muse_runs table
4. muse-personas.yaml registry (29 personas)
5. Panel templates (4-6 pre-defined)
6. muse-panel skill
7. decision-capture / supersede / reaffirm skills
8. decision-staleness-check scheduled skill
9. Decision domain state machine (Bài #13)
10. Dashboard /governance/decisions/* pages
11. Cross-bài-toán updates (#1, #2, #14, #11, #10)

## Lessons captured

1. Decisions = 5th truth category (beyond Bài #1's 4-tier).
2. Muse panel = systematic cognitive diversity.
3. Persona registry as Tier 1 declarative.
4. Pre-defined panels accelerate.
5. Time-decay critical (revisit triggers + staleness alerts).
6. Supersession edges in knowledge graph (Bài #14).
7. Decision entity type unlocks rich queries.
8. Outcome linking closes the loop.
9. Reversibility category for risk assessment.
10. Cross-decision patterns → procedural memory updates.
