# Bài #19 — Founder Capacity & Interface Architecture (DRAFT)

**Status:** DRAFT — derived from G9 walkthrough (FINAL), not yet brainstormed/decided
**Walkthrough:** `_build/notes/phase-a2/walkthroughs/G9-founder-capacity.md`
**Dependencies:** Bài #1, #2, #4, #6, #7, #8 DRAFT, #10 DRAFT, #11 DRAFT, #12 DRAFT, #14 DRAFT, #15 DRAFT, #16 DRAFT, #17 DRAFT, #18 DRAFT

## Why
~15 issues + Phase A roadmap chương 13 explicitly warned: "founder bandwidth = failure mode #1."

After 11 walkthroughs building infrastructure, founder still = scarcest resource. All 11 prior bài toán produce signals/decisions/work that flow to founder. Without architecture for founder capacity, system overwhelms founder → burnout → all 11 systems fail.

Without Bài #19:
- 4+ hours/day on triage = no time for strategic work
- Context-switching kills deep work
- Routine work creeps into founder time
- Decisions delayed → bottleneck for entire AI workforce
- Customer relationships suffer
- Burnout fulfills Phase A's failure mode #1

## Decisions (tentative)

### Axis 1 — Rhythm Registry + Workspace Concept
**Choice:** Founder profile (extends Bài #6) + knowledge/founder-rhythm.yaml Tier 1 + workspace mapping
- 00-charter/founder-profile.md với Bài #14 page format
- Daily rhythm: morning-deep-work, morning-brief, meeting-block, lunch, afternoon-reactive, evening-reflection, sleep
- Weekly rhythm: Monday strategy / Friday review / weekend lighter
- Special modes: customer_call_mode, deep_work_mode
- Workspace: Claude Code + Telegram + Dashboard + Email (each optimized for strength)

### Axis 2 — Attention Budget + Triage Scoring
**Choice:** ops.attention_log + founder-triage-score skill + budget alerts
- ops.attention_log tracks per-category attention spend
- 5 scoring factors: urgency, leverage, reversibility, founder_uniqueness, rhythm_block_match
- Routing: 9-10 immediate, 6-8 batch, 3-5 defer evening, 0-2 AI autonomous
- Daily attention budget targets (deep work 37.5%, meetings 25%, hitl 12.5%, etc.)
- Alert thresholds (high triage, low deep work, hitl overflow)

### Axis 3 — Morning Brief + Pre-Call Dossier + Weekly Review
**Choice:** 3 dedicated SOPs leveraging full Phase A.2 stack
- SOP-FOUNDER-001-morning-brief: daily 05:45 ICT, leverages 8 prior bài toán
- SOP-FOUNDER-002-pre-call-dossier: 30 min before calendar events, knowledge graph + customer 360 + episodic recall
- SOP-FOUNDER-003-weekly-review: Friday 17:00, cross-decision Muse + attention analysis + voice aggregation

### Axis 4 — Cognitive Load Distribution + Boundary Protection
**Choice:** Tier 1 distribution rules + DND modes + recovery tracking + effectiveness metrics
- 4 cognitive load buckets: founder_only / founder_drafts / ai_drafts / ai_autonomous
- Telegram /focus N command → deep_work_mode for N minutes
- Recovery time tracking (lightweight, after Tier C+ decisions)
- 4 founder dashboard pages (attention budget, effectiveness, leverage distribution, decision velocity)

## Schema additions (Tier 2)

```sql
CREATE TABLE ops.attention_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  founder_id      text NOT NULL DEFAULT 'founder',
  category        text NOT NULL,         -- 'deep_work' | 'meeting' | 'hitl' | 'triage' | 'reactive' | 'reflection' | 'recovery'
  duration_minutes numeric NOT NULL,
  source          text,
  related_entities jsonb,
  estimated_leverage text,               -- 'high' | 'medium' | 'low'
  notes           text
);

CREATE INDEX ON ops.attention_log (occurred_at DESC);
CREATE INDEX ON ops.attention_log (category, occurred_at DESC);
```

## YAML schemas

```yaml
# knowledge/founder-rhythm.yaml
timezone: <iana-tz>

daily_rhythm:
  - id: <slug>
    start: <HH:MM>
    end: <HH:MM>
    mode: focus | meeting | reactive | reflection | break | sleep
    interrupt_level: emergency_only | scheduled_only | tier_b_plus | tier_c_plus | critical_only
    suggested_activities: [<activity-list>]
    do_not_disturb: <bool>

weekly_rhythm:
  - day: <day>
    theme: <theme>
    activities: [<list>]

special_modes:
  - id: <mode-slug>
    trigger: <description>
    duration: <duration or pattern>
    effects: [<list>]

daily_attention_budget:
  total_focus_minutes: <int>
  target_distribution:
    <category>: <minutes>

alert_thresholds:
  - condition: <expression>
    severity: <level>
    message: <markdown>

cognitive_load_distribution:
  founder_only: { description, examples }
  founder_drafts_ai_executes: { ... }
  ai_drafts_founder_reviews: { ... }
  ai_handles_autonomously: { ... }
```

## Founder profile page format (extends Bài #14)

```yaml
---
type: identity
slug: founder/<name>
created_at: <date>
last_assessed_at: <date>
---

# Founder: <Name>

## Compiled Truth
**Cognitive style:** <description>
**Communication style:** <description>
**Time zone:** <tz>
**Primary surfaces:** [<ordered list>]
**Focus blocks:** [<rhythm summary>]
**Boundaries:** [<list>]

---

## Timeline
- <date> — <event>
```

## SOPs definition

**SOP-FOUNDER-001-morning-brief:** daily 05:45, 8 gather steps + synthesize + deliver
**SOP-FOUNDER-002-pre-call-dossier:** 30 min before calendar events, 6 gather steps + assemble + deliver
**SOP-FOUNDER-003-weekly-review:** Friday 17:00, 6 analysis steps + assemble + deliver+archive

## New components (28)

28 components — 2 Tier 1 + ops.attention_log + 1 skill + 3 SOPs + 4 synthesis skills + 4 dashboards + Telegram /focus + DND infrastructure + 2 MCP tools + 6 cross-bài-toán updates + meta.

## Open questions

- OQ19.1: Per-founder customization (operator joins)?
- OQ19.2: Energy/state ML prediction?
- OQ19.3: Customizable rhythm per day type?
- OQ19.4: Health/wellness integration?
- OQ19.5: Founder coaching feedback loop?
- OQ19.6: Multi-founder rhythms?
- OQ19.7: Recovery time scientific basis?
- OQ19.8: Vacation mode (extended OOO)?
- OQ19.9: Pair-programming-with-AI as cognitive mode?

## Anti-patterns

- ❌ Founder as unlimited resource (Phase A roadmap warned)
- ❌ No rhythm registry
- ❌ All interrupts equally weighted
- ❌ No attention budget tracking
- ❌ Morning brief manual
- ❌ Pre-call prep manual
- ❌ Cognitive load rules in founder's head only
- ❌ No boundary protection
- ❌ Skip weekly review
- ❌ Single-surface workspace
- ❌ Ignore founder energy/state
- ❌ Premature ML attention prediction (need 6+ months data)

## GBrain heritage notes

- **USER.md / HEARTBEAT.md** identity files (founder profile)
- **Compiled-truth + timeline format** (Bài #14)
- **Soul-audit pattern** — founder profile reviewed quarterly

## Ritsu uses (platform primitives)

| Need | Platform |
|---|---|
| Calendar | Google Calendar (MCP Bài #12) |
| Telegram | Telegram Bot API (Bài #17) |
| Dashboard | Next.js (Bài #10) |
| Knowledge graph | Postgres (Bài #14) |
| Customer 360 | mv_customer_360 (Bài #16) |
| Episodic recall | pgvector (Bài #4) |

## Ritsu adds (Outer Harness)

1. founder-rhythm.yaml + founder-profile.md (Tier 1)
2. ops.attention_log table
3. founder-triage-score skill
4. 3 founder SOPs (morning brief, pre-call dossier, weekly review)
5. 4 synthesis skills
6. 4 founder dashboard pages
7. Telegram /focus command + DND infrastructure
8. 2 MCP tools (brief_today, attention_check)
9. Cross-bài-toán updates (#2, #6, #8, #10, #11, #12)

## Lessons captured

1. Founder = scarcest resource; all 11 prior bài toán produce work flowing to founder.
2. Rhythm registry = Tier 1 declarative.
3. Triage scoring prevents drowning.
4. Attention budget finite (8h/day) — tracking essential.
5. Morning brief = highest-leverage SOP for founder.
6. Pre-call dossier = knowledge graph + customer 360 + episodic recall.
7. Weekly review = pattern recognition.
8. Cognitive load distribution rules make explicit.
9. Boundary protection = first-class, not founder discipline alone.
10. Founder profile = identity entity in knowledge graph.
11. Single workspace concept across surfaces.
12. **Bài #19 = capstone — closes 11-walkthrough loop với human-side architecture.**
