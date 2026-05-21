# 04-content — Content Strategy & Production Pillar

> Trụ cột "Sản xuất nội dung": ideation, drafting, editorial, multi-surface publishing.

**Status:** Scaffold (Wave 6 implementation)
**Pillar code:** CONTENT
**Bài toán reference:** Bài #17 (multi-surface), Bài #18 (knowledge ingestion)

---

## Scope

Pillar 04-content chịu trách nhiệm:

- **Content ideation** — topic research, trend analysis
- **Editorial calendar** — scheduling, themes, campaigns
- **Drafting** — long-form blog posts, scripts, threads
- **Multi-surface adaptation** — same idea → 13+ surfaces
- **Brand voice consistency** — voice rules per locale
- **SEO optimization** — keyword research, on-page SEO
- **Content performance** — engagement, retention metrics

## SOP namespace

```
sops/
├── SOP-CONTENT-001-blog-post-publish/
├── SOP-CONTENT-002-cross-surface-adaptation/
├── SOP-CONTENT-003-podcast-episode-publish/
├── SOP-CONTENT-004-video-script-draft/
├── SOP-CONTENT-005-newsletter-send/
└── ...
```

## Agents specific to content

```
agents/
├── topic-researcher.md          ← trend + keyword research
├── content-drafter.md           ← long-form drafting (brand voice)
├── surface-adapter-orchestrator.md  ← coordinate cross-surface variants
├── seo-optimizer.md             ← on-page optimization
└── editorial-reviewer.md        ← review + approve
```

## Key cross-pillar dependencies

- **00-core/brand_voice.md** — voice rules
- **01-growth/** — distributes content
- **05-ai-ops/surface-adapters/** (Bài #17) — publishing infra
- **05-ai-ops/format-converters/** — adapt content per surface
- **knowledge/channels.yaml** + **locales.yaml** + **surface-compliance.yaml**

## Cross-surface adaptation pattern (Bài #17)

Single content piece → adapter pattern → multiple surface variants:

```
Original: "How spaced repetition works" (long-form blog post)
  ↓
Adapter outputs:
  - Twitter thread: 8 tweets
  - LinkedIn post: 1500 chars
  - YouTube script: 5-min explainer
  - TikTok script: 60-sec hook
  - Instagram carousel: 7 slides
  - Email newsletter: 800 words
```

Each surface has:
- Format rules (max chars, multimedia requirements)
- Compliance rules (per surface-compliance.yaml)
- Brand voice variant (per locale)

## Ritsu-specific notes

- Content theme: language learning, study techniques, cognitive science
- Multilingual: Vietnamese primary, English secondary, expand to 10 locales
- Content cadence: 3 long-form/week + 7 short-form/week
- Content as growth engine: educational content brings learners

## Wave 6 implementation tasks

- [ ] SOP-CONTENT-001: Blog post → wiki/articles + cross-surface
- [ ] SOP-CONTENT-002: Cross-surface adapter orchestrator
- [ ] First content-drafter agent (with Bài #14 knowledge graph context)
- [ ] First surface-adapter (Twitter, LinkedIn, YouTube)
- [ ] First format-converter library

---

*Pillar 04-content scaffolded by Agent OS Boilerplate. Customize SOPs per project.*
