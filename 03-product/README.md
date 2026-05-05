# 03-product — Product Operations Pillar

> Trụ cột "Vận hành sản phẩm": roadmap, release notes, feedback triage, AROUND product (not the product code itself).

**Status:** Scaffold (Wave 3-6 implementation)
**Pillar code:** PRODUCT
**Bài toán reference:** Bài #15 (decisions), Bài #14 (knowledge graph)

---

## Scope

Pillar 03-product chịu trách nhiệm việc **vận hành xung quanh** sản phẩm (NOT product code itself — product code lives in separate repo):

- **Roadmap intake** — feature requests aggregation
- **Release notes** — changelogs, customer announcements
- **Feedback triage** — bug reports, feature requests classification
- **A/B test analysis** — aggregating results, decisions
- **Beta program** — recruitment, feedback loops
- **Product analytics review** — usage patterns, drop-off analysis
- **Pricing decisions** — tier optimization, monetization experiments

## SOP namespace

```
sops/
├── SOP-PRODUCT-001-feature-request-triage/
├── SOP-PRODUCT-002-release-note-generation/
├── SOP-PRODUCT-003-bug-report-routing/
├── SOP-PRODUCT-004-ab-test-analysis/
├── SOP-PRODUCT-005-pricing-experiment-decision/
└── ...
```

## Agents specific to product ops

```
agents/
├── roadmap-curator.md          ← prioritize feature requests
├── release-noter.md            ← write changelogs
├── bug-triager.md               ← classify severity + assignee
└── product-analyst.md           ← interpret usage data
```

## Key cross-pillar dependencies

- **02-customer/** — feeds support feedback
- **04-content/** — release announcements need content team
- **05-ai-ops/** — product decisions trigger Muse panel (Bài #15)
- **knowledge/muse-personas.yaml** — product-decision personas

## Product roadmap as decisions (Bài #15)

Each major roadmap decision = decision page với Muse panel synthesis.

Example: "Should we add SAML SSO in Q3?"
- Trigger Muse panel: customer-advocate + cynic + time-honest + pricing-strategist
- Output: decision page với reasoning + commitment

## Ritsu-specific notes

- B2C product: tutoring AI experience
- Product team = founder + AI workforce (not separate dev team initially)
- Roadmap source: customer feedback (high) + founder vision (high) + market signals (medium)
- Release cadence: weekly (small features) + monthly (major)

## Wave 3-6 implementation tasks

- [ ] SOP-PRODUCT-001: Feature request triage (Wave 3, classification)
- [ ] SOP-PRODUCT-002: Release notes generation (Wave 6, multi-surface)
- [ ] SOP-PRODUCT-005: Pricing decision (Wave 5, Muse panel)
- [ ] First product-analyst agent

---

*Pillar 03-product scaffolded by Agent OS Boilerplate. Customize SOPs per project.*
