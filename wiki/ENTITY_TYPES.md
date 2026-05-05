# Wiki Entity Types (Bài #14 Knowledge Graph)

Per Bài #14 + migration 00006 (knowledge_pages.page_type CHECK constraint), wiki entries are organized by entity type.

## 13 entity types

| Folder | Type | Purpose | Example |
|---|---|---|---|
| `wiki/customers/` | customer | Customer entity record | `acme-corp.md` |
| `wiki/persons/` | person | Individual person record | `john-doe.md` |
| `wiki/companies/` | company | Organization record | `acme-corp.md` |
| `wiki/concepts/` | concept | Abstract idea, theory, framework | `spaced-repetition.md` |
| `wiki/decisions/` | decision | Bài #15 decision record | `2026-q2-pricing-strategy.md` |
| `wiki/meetings/` | meeting | Meeting notes, transcript synthesis | `2026-05-04-customer-interview-acme.md` |
| `wiki/articles/` | article | External article ingested via Bài #18 | `nyt-2026-edtech-trends.md` |
| `wiki/episodes/` | episode | Podcast episode notes | `lex-fridman-2026-andrej-karpathy.md` |
| `wiki/books/` | book | Book notes, summaries | `make-it-stick.md` |
| `wiki/repos/` | repo | External repos analyzed | `langchain-ai-langgraph.md` |
| `wiki/ideas/` | idea | Founder idea capture (voice notes) | `2026-05-04-mobile-app-idea.md` |
| `wiki/observations/` | observation | Data points, signals | `2026-05-04-cohort-3-churn-spike.md` |
| `wiki/weekly_reviews/` | weekly_review | Founder weekly retrospective | `2026-w18.md` |
| `wiki/capabilities/` | capability | Bài #20 capability spec | `daily-customer-acquisition/spec.md` |

## File frontmatter convention

Each wiki page should have YAML frontmatter:

```yaml
---
type: customer
slug: acme-corp
created: 2026-05-04
updated: 2026-05-04
---
```

Pre-commit hook + Phase 8 catalog-updater (Bài #20) verify type matches folder.

## Auto-link extraction (Bài #14)

Per `knowledge/link-inference-rules.yaml`, regex patterns extract links from page content:

- Person works_at Company
- Decision attributed_to Person
- Concept mentioned_in Article
- etc.

Links populate `ops.knowledge_links` table → 2x P@5 precision improvement.

## Promotion path

If wiki entry insights drive recurring behavior → promote to Tier 1 (`knowledge/*.yaml`).
See `wiki/README.md` for promotion path.

---

*See `knowledge/phase-a2-extensions/bai-14-knowledge-graph-DRAFT.md` for full architecture.*
