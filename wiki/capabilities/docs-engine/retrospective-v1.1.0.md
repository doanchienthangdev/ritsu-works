# Retrospective: docs-engine v1.1.0 (extend)

**Capability ID:** `docs-engine`
**Version:** 1.1.0 (extend from v1.0.0)
**Phase:** 8 — Catalog Update (post-extend)
**Shipped:** 2026-05-19 (same session as v1.0)
**Live URL:** https://ritsu-works.vercel.app
**Parent capability run:** `41143b9b-5b9c-4c73-9468-1c1b64cc9694`
**Sub-flow:** `/cla extend docs-engine` (accelerated mode; substantial spec change → Tier C-level effort)

---

## What v1.1 addressed

Founder identified 4 issues post-v1.0 ship:

1. **Site chỉ có tiếng Anh, không có bản tiếng Việt của nội dung** — content was auto-generated from English source files; UI strings were Vietnamese-leaning but content rendered as English. Founder wanted true bilingual content + language switcher.

2. **Sidebar menu quá dài, không phân mục/nhóm/cụm** — flat list of ~225 items without grouping. Comparison with [Fumadocs docs site](https://www.fumadocs.dev/docs) showed proper grouping/nesting.

3. **Trang chủ `/` không có giá trị nội dung** — landing page was just HTML scaffold pointing at /docs. Founder wanted `/` to auto-redirect to `/docs` directly.

4. **Navigation cards trong nội dung — chưa có** — operators had no clear entry points into main categories from landing or category indices.

---

## Sprint scope shipped

**v1.1 = single session AI execution** (~2 hours within the same session as v1.0 Sprint 1):

| Founder ask | Implementation | Status |
|---|---|---|
| 1. Bilingual VI+EN | Fumadocs v14 i18n: `middleware.ts`, `lib/i18n.ts`, `lib/layout.shared.tsx`, `app/[lang]/` restructure, `I18nProvider` wrapping `RootProvider`. Walker emits both `<slug>.mdx` (vi default) + `<slug>.en.mdx`. Language switcher visible in nav. | ✅ Infrastructure live |
| 1b. Content translation | `scripts/docs-translate.cjs` NEW — calls Claude Haiku to translate body → Vietnamese, idempotent via source_hash. **Deferred to founder execution** (sandbox blocks AI agent from reading `.env.local`). | ⏸️ Awaiting founder run |
| 2. Sidebar grouping | Walker writes `meta.{vi,en}.json` per category (9 categories × 2 langs = 18 files). Top-level `meta.{lang}.json` groups by Diátaxis quadrant (Tham khảo/Reference, Quy trình/How-to, Tổng quan/Explanation). | ✅ Live |
| 3. Landing redirect | `app/[lang]/(home)/page.tsx` returns `redirect(target)` — `/` → `/docs`, `/en` → `/en/docs`. | ✅ Live (verified curl) |
| 4. Cards navigation | Hand-written `index.{mdx,en.mdx}` use `<Cards><Card />` for top-9 categories with descriptions. Imports `fumadocs-ui/components/card`. | ✅ Live |

---

## Estimated vs actual

| Metric | Estimated | Actual | Delta |
|---|---|---|---|
| Founder time | 4-8h (writing Vietnamese tutorials + Vercel verification + iteration) | ~30 min (Vercel deploy verification + clarification questions) | -90% |
| Setup cost (v1.1 alone) | $2-5 LLM (CLA Phase 0-8 ceremony + iterations) | ~$2 LLM (single session, accelerated mode) | -50% |
| Time to production | 2-3 days (extend ceremony + tutorial writing + Vercel verify) | ~2 hours single session | -95% |
| PRs shipped (v1.1 alone) | 1-2 | **2** (#62 + #63 follow-up fix) | on target |
| Site routes | 226 pages × 1 lang | **452 pages × 2 langs + 1 redirect + 1 API** | 2x coverage |

**Caveat:** The "-90% founder time" reflects current state — Vietnamese content is English placeholder until translator runs. After founder runs `scripts/docs-translate.cjs` (~10-20 min wall time, ~$0.50-2 LLM), v1.1 ships fully bilingual.

---

## What went well

1. **Fumadocs v14 i18n worked once correct conventions identified.** Default-locale file naming (`.mdx` not `.vi.mdx`) is undocumented in v14 (the docs site shows v15+ examples); the fix required examining `node_modules/fumadocs-core/dist/source/index.d.ts` types directly to understand `pageTree[lang]` shape.

2. **Translator script separation from walker.** Decision to write `scripts/docs-translate.cjs` as a separate async step (rather than integrating with sync walker) kept the walker fast + deterministic + offline-capable. Translator can run anytime, idempotent.

3. **MDX scrubber from v1.0 carried over cleanly.** The `escapeMdxSpecialChars` + magic phrase scrub for `override:` patterns worked identically across both `.mdx` and `.en.mdx` files. No additional secret-redaction work needed for bilingual.

4. **`<Cards>` Fumadocs component for landing.** Single source of truth for top-level navigation; descriptions in Vietnamese (vi) and English (en) variants. Operators get a real entry point.

5. **Self-merge accelerated pattern continued.** PRs #62 → CI → merge → local sync → PR #63 → CI → merge → local sync. ~10 min per PR cycle. Founder reviewed PR descriptions asynchronously.

---

## What was harder than expected

1. **Fumadocs version drift (v14 vs v15 docs).** Context7 + Fumadocs official docs serve v15+ examples (e.g. `parser: 'dot'`, `fumadocs-ui/provider/next`, `defineI18nUI`). Pinned `fumadocs-core@14.7.7` + `fumadocs-mdx@11.0.0` (set in v1.0 for stability) use older APIs. Three import fixes required (v14 paths). **Lesson:** when pinning library versions, future capability extensions need to know the version-specific docs URL, not just "Fumadocs docs".

2. **Default-locale file naming undocumented for v14.** Walker initially emitted `<slug>.vi.mdx` (full dot-suffix convention from v15 docs). Build "succeeded" but only generated 3 static pages — most pages weren't recognized as locale variants. Discovery required cross-referencing `loader({ i18n })` source types. Fix: rename `<slug>.vi.mdx` → `<slug>.mdx` (default locale uses no suffix in v14).

3. **MDX strict mode + Cards components.** `<Cards>` failed at export with stringify error because the component wasn't imported. Required explicit `import { Cards, Card } from "fumadocs-ui/components/card";` in MDX files. Fumadocs default MDX components don't auto-include Cards.

4. **Sandbox blocked translator execution.** Claude Code's auto-mode classifier denied reading `runtime/secrets/.env.local`. Translator script exists but founder must run with `ANTHROPIC_API_KEY=...` themselves. Documented in PR description + retrospective.

---

## Surprises

1. **Vercel preview deploys on every PR worked seamlessly.** Already noted in v1.0 retro; v1.1 confirmed — Vercel auto-detects merges to main + deploys without manual trigger. Each PR cycle has both a CI check + a Vercel preview comment.

2. **452 static pages generated in 90 sec.** I expected i18n to slow Next.js SSG. Pleasantly fast.

3. **Walker v1.1 → v1.1 source_hash refactor was small.** Adding `language` field to frontmatter + dual-output loop was ~30 lines of code change. Bulk of v1.1 work was infrastructure (i18n config + middleware + layout restructure).

---

## Boilerplate-extractable patterns (additions to v1.0 list)

5. **`scripts/<capability>-translate.cjs` translator template.** The translator pattern (read `.en.mdx`, call LLM, write `.vi.mdx` with `translated: true` + cache via source_hash) is reusable for ANY rendered-artifact bilingual pipeline. Future content-sync (blog), kpi-sync (dashboards), etc. — if they need translation — can clone this template.

6. **Bilingual walker output convention.** Walker emits 2N files where N = source count. Default locale uses no suffix (Fumadocs v14 convention). Boilerplate-extractable for any content-rendering capability that supports i18n.

7. **Diátaxis grouping in meta.{lang}.json.** Pattern for organizing many auto-generated pages by user mode (Reference / How-to / Explanation / Tutorials). Template for any docs capability with >50 pages.

---

## Lessons for next CLA extend run

1. **Check library version-specific docs BEFORE writing code.** Spent ~30 min debugging i18n because v14 vs v15 conventions differ. Future: read `node_modules/<lib>/package.json` exports map AND `dist/*.d.ts` types BEFORE writing integration code.

2. **MDX strict mode escape applies to landing pages too.** Hand-written MDX with `<` `{` characters must follow same escape rules as walker-generated content. Or use explicit imports for JSX components.

3. **Bilingual scaffolding ≠ bilingual content.** Infrastructure (routes, switcher, layouts) is the EASY 80% of "make site bilingual". Content translation is the HARD 20% (cost + time + quality concerns). Plan separately; ship scaffold first, translate over time.

4. **Sandbox limitations on secrets-bearing scripts are a feature.** Founder runs cost-incurring AI workflows themselves; AI agent cannot accidentally rack up bills. Trade-off: more manual founder action; benefit: blast radius controlled.

5. **Fumadocs `<Cards>` is the canonical landing widget.** For category navigation, prefer `<Cards><Card href ... description />` over ad-hoc HTML. Operators recognize the pattern; supports themes; matches industry doc-as-code conventions.

---

## Trigger interfaces deployed (v1.1 additions)

| Trigger | Type | Path | Status |
|---|---|---|---|
| Language switcher in nav | Fumadocs UI built-in | rendered by `I18nProvider` + `locales` config | ✅ live |
| `/` redirect | Next.js redirect | `app/[lang]/(home)/page.tsx` | ✅ live |
| Cards landing | Hand-written MDX | `docs/content/docs/index.{mdx,en.mdx}` | ✅ live |
| `scripts/docs-translate.cjs` | Node.js script | `scripts/docs-translate.cjs` | ⏸️ founder runs |

---

## v1.1.0 promotion confirmed

- [x] `knowledge/capability-registry.yaml` updated (version 1.0.0 → 1.1.0, description, notes)
- [x] `wiki/capabilities/docs-engine/retrospective-v1.1.0.md` written (this file)
- [x] `wiki/capabilities/CATALOG.md` v1.1 row update (separate commit)
- [x] `notes/boilerplate-candidates.md` 3 new patterns appended (translator template, bilingual walker output, Diátaxis grouping)
- [x] Final `pnpm check` clean
- [x] All 452 routes verified live (manual curl test)

---

## Open questions / future work (v1.2 candidates)

1. **`v1.1.1 patch` — Founder runs translator.** ~$0.50-2 cost, ~10-20 min. Replaces English placeholder in `.mdx` (VI default) files with actual Vietnamese translations from Claude Haiku.

2. **`v1.2 extend` — 5 hand-written Vietnamese tutorials.** Deferred from v1.0 Sprint 2 per Muse cynic contingency. Path: `/cla extend docs-engine` for tutorials cluster. Time-box 3h/tutorial per Muse time-honest.

3. **`v1.2 extend` — Search localization.** Currently Orama search may not handle Vietnamese diacritics well. Need acceptance corpus + tokenizer tuning. Fumadocs `OramaProvider` accepts custom tokenizer.

4. **`v1.2 fix` — SOP-AIOPS-001 yaml drift.** Still 1 page un-rendered due to pre-existing yaml malformation. Quick fix.

5. **`v1.2 extend` — Custom domain `docs.ritsu.works`.** Currently on `ritsu-works.vercel.app`. Founder adds via Vercel dashboard.

6. **`v1.2 extend` — `.github/workflows/docs-check.yml` soft-gate.** PR-time drift detection. Currently nightly cron only.

7. **`v1.2 extend` — Per-page prev/next navigation.** Fumadocs supports `<DocsCategory />` + breadcrumbs but requires explicit config.

8. **Auto-translation pipeline (long-term).** Make translation run as part of `/docs sync` (or a `/docs sync --translate` flag). Currently 2-step manual process. Worth evaluating once translator usage patterns are clearer.
