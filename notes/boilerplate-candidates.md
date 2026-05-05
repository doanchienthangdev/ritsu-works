# Boilerplate Candidates — Tracking Patterns for Future Generalization

**Purpose:** Document patterns observed during Ritsu implementation that could be generalized into Agent OS boilerplate.

**Reference:** Playbook chương 31 — Agent OS Boilerplate Strategy

**When to use:** Update continuously during Ritsu Phase B implementation. When 2nd project starts, this file becomes the audit list for boilerplate extraction.

---

## How to use

After each implementation session, document:

1. **Pattern observed** — what code/config repeated
2. **Generic level** — 0-100% how much is reusable
3. **Customization needed** — what would change for another project
4. **Friction points** — what was hard

---

## Patterns observed

### Wave 1 — Foundation Schema

#### 2026-MM-DD — Bài #13 schema convention
- **Pattern:** 4-column convention (state, state_since, state_history, audit) applied to all ops.* tables
- **Generic level:** 100%
- **Customization:** None — pattern works for any domain
- **Note:** Confirm GBrain heritage applicable across projects

#### 2026-MM-DD — Tier 1 YAML scaffolding
- **Pattern:** All Tier 1 files có version + schema validation
- **Generic level:** 100% schemas, 0% values
- **Customization:** Values change per project
- **Action:** Create `templates/` folder with `{{PLACEHOLDER}}` patterns

---

### Wave 2 — Triggers + Orchestration

(Update during implementation)

---

### Wave 3 — State + Knowledge

(Update during implementation)

---

### Wave 4 — Visibility + Access

(Update during implementation)

---

### Wave 5 — Judgment + Privacy

(Update during implementation)

---

### Wave 6 — Multi-Surface + Ingestion

(Update during implementation)

---

### Wave 7 — Founder Capacity

(Update during implementation)

---

## Friction points (anti-patterns to avoid in boilerplate)

### 2026-MM-DD — Example friction
- **Issue:** [what was hard]
- **Workaround:** [what we did]
- **Boilerplate solution:** [how to avoid in template]

---

## Generic skills inventory

Track skills that are 80%+ generic:

| Skill | Generic % | Notes |
|---|---|---|
| state-transition | 100% | Pure framework, no domain logic |
| auto-link-extract | 100% | Regex patterns generic |
| schedule-dispatcher | 100% | Reads schedules.yaml |
| event-dispatcher | 100% | Reads event-subscriptions.yaml |
| muse-panel | 90% | Persona definitions specific |
| voice-note-classify | 70% | Classification categories specific |
| founder-triage-score | 95% | Scoring factors generic |
| morning-brief-synthesizer | 80% | Sources specific, synthesis generic |
| pre-call-dossier | 85% | Knowledge graph queries generic |
| customer-data-scan | 95% | GDPR machinery generic |

---

## Domain-specific overrides

Track project-specific code that won't generalize:

| Component | Why specific | Recommendation |
|---|---|---|
| Ritsu pricing tiers | EdTech pricing model | Keep in `01-growth/` pillar SOPs |
| Vietnamese-primary brand voice | Locale-specific | `00-charter/brand_voice/brand_voice.vi.md` |
| 4-tier subscription | Ritsu business model | Domain-specific state machine |
| 17 activities × 7 modes | Product UX | Domain-specific entities |

---

## Tier 1 file split (generic schema vs specific values)

| File | Schema generic? | Values |
|---|---|---|
| schedules.yaml | ✅ | Ritsu rhythms |
| event-subscriptions.yaml | ✅ | Ritsu events |
| state-machines.yaml | ✅ | Ritsu entities |
| muse-personas.yaml | ✅ | Ritsu personas (29) |
| data-retention.yaml | ✅ | Ritsu data types |
| channels.yaml | ✅ | Ritsu surfaces |
| locales.yaml | ✅ | Ritsu locales |
| ingestion-sources.yaml | ✅ | Ritsu source kinds |
| founder-rhythm.yaml | ✅ | Founder-specific |
| feature-flags.yaml | ✅ | Ritsu features |

**Action:** When tách boilerplate, create `*.template.yaml` versions with `{{PLACEHOLDERS}}`.

---

## Open questions for boilerplate design

- OQ-BP-1: Should boilerplate include example data (fixtures) for testing?
- OQ-BP-2: How to version migrations across projects?
- OQ-BP-3: Should boilerplate be open-source eventually?
- OQ-BP-4: Plugin architecture (extensions package per domain)?
- OQ-BP-5: Multi-tenant within single boilerplate instance?

---

## Decision log

### 2026-MM-DD — Decision: not generalize during Wave 1-3
- **Decision:** Focus Ritsu, document patterns, defer extraction
- **Rationale:** Architecture not battle-tested, premature generalization risk
- **Reviewer:** Founder
- **Next review:** After Wave 3 stable

### (future entries)

---

## Generalization triggers (review monthly)

Re-evaluate quarterly:

- [ ] Is Ritsu Wave 1-3 stable?
- [ ] Is there a concrete 2nd project planned?
- [ ] Are 3+ patterns clearly identified as generic?
- [ ] Has founder articulated boilerplate value proposition?

If 3+ checkboxes ticked, start Phase 1 generalization (per chương 31.5).

---

*This file is a living document. Update during every implementation session that touches generic patterns.*
