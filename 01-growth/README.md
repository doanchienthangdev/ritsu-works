# 01-growth — Marketing, Sales, Partnerships Pillar

> Trụ cột "Đầu phễu": tìm khách hàng, chuyển đổi lead → customer, mở rộng partnerships.

**Status:** Scaffold (Wave 2-3 implementation)
**Pillar code:** GROWTH
**Bài toán reference:** Bài #11 (events), Bài #15 (decisions), Bài #17 (multi-surface)

---

## Scope

Pillar 01-growth chịu trách nhiệm:

- **Marketing content** — blog posts, social media, SEO, video content
- **Lead generation** — landing pages, lead magnets, email capture
- **Lead nurturing** — email sequences, drip campaigns, retargeting
- **Sales pipeline** — lead → MQL → SQL → trial → conversion
- **Partnerships** — affiliate, integration, distribution deals
- **Brand awareness** — PR, community building, thought leadership

## SOP namespace

Tất cả SOPs trong pillar này có prefix `SOP-GROWTH-XXX`:

```
sops/
├── SOP-GROWTH-001-content-publishing-cross-surface/
│   ├── flow.yaml
│   ├── steps/
│   ├── tests/
│   └── README.md
├── SOP-GROWTH-002-lead-magnet-distribution/
├── SOP-GROWTH-003-email-nurture-sequence/
├── SOP-GROWTH-004-affiliate-onboarding/
└── ...
```

## Agents specific to growth

```
agents/
├── content-strategist.md      ← brand voice + topic ideation
├── lead-scorer.md              ← prioritize leads
├── outreach-personalizer.md    ← cold email crafting
└── ...
```

## Key cross-pillar dependencies

- **04-content/** — provides creative content (blog posts, videos)
- **02-customer/** — receives qualified leads, handles onboarding
- **05-ai-ops/** — provides skills + adapters
- **knowledge/channels.yaml** (Bài #17) — defines surfaces

## Ritsu-specific notes

- B2C EdTech context: lead = potential learner
- Conversion funnel: visitor → trial signup → first lesson → paid subscription
- 4-tier subscription: Free / Plus $29 / Pro $59 / Ultra $119
- Primary growth surfaces (per channels.yaml): YouTube tutorials, TikTok shorts, Instagram reels, Twitter threads

## Tier 1 governance

Edits to growth strategy require PR review. See `governance/HITL.md` for tier classification.

## Wave 2-3 implementation tasks

- [ ] SOP-GROWTH-001: Cross-surface content publishing (depends on Bài #17)
- [ ] SOP-GROWTH-002: Lead capture → CRM
- [ ] SOP-GROWTH-003: Email nurture sequence (Bài #11 events)
- [ ] First content-strategist agent (skill = brand-voice + topic-research)

---

*Pillar 01-growth scaffolded by Agent OS Boilerplate. Customize SOPs per project.*
