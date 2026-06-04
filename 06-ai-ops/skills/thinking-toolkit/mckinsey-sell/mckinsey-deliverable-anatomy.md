# The anatomy of a real McKinsey deliverable (the grounding for mckinsey-templates.yaml)

> **Extracted from REAL McKinsey reports, not guessed from principles** (v2.1, capability thinking-toolkit). `mckinsey-sell` reads this to render a deliverable that matches what McKinsey actually ships. Every `grounded_in` citation in `knowledge/mckinsey-templates.yaml` traces here.
>
> **Fetchability note:** live `mckinsey.com` SPA/PDF pages were largely un-fetchable in the research run (bot mitigation); the anatomy is grounded in (a) a full reproduction of a real MGI report and (b) deconstructions that quote verbatim from named real reports. Every structural claim traces to a URL below.

## The 9 recurring, ordered components

A standard McKinsey deliverable is built from these — a "guessed from principles" pyramid template captures the *logic* but misses this *physical furniture*:

1. **Preface / framing paragraph** — a short "why we did this and what's inside" note (the SCQA *Situation* set-up). *(MGI 'AI: The Next Digital Frontier' opens "In this independent discussion paper, we examine investment in artificial intelligence…")*
2. **The boxed "IN BRIEF"** — a boxed bullet summary at the very front, BEFORE the body, distinct from the executive summary; the governing thought stated up top. MGI even publishes standalone "In Brief" PDFs. *Most-missed by generic templates.* *(MGI AI report carries a distinct "IN BRIEF"; MGI 'A Future That Works' is a standalone In-Brief PDF.)*
3. **Executive summary, SCR/SCQA-structured** — the answer section, 3-4 supporting arguments, leading with the resolution. *(McKinsey exec summaries "follow the Situation-Complication-Resolution framework".)*
4. **Action-title section headers** — each chapter/section header is a full declarative *conclusion*, not a topic label. *(Verbatim: "Despite modest progress, women are still dramatically underrepresented in leadership" / "'The great breakup': women leaders are leaving their companies at the highest rate in years" — Women in the Workplace 2022; MGI all-caps "ARTIFICIAL INTELLIGENCE IS GETTING READY FOR BUSINESS, BUT ARE BUSINESSES READY FOR AI?")*
5. **Action-title EXHIBIT captions + a source footer** — every chart's *caption* is a sentence-conclusion (not "Exhibit 1: AI investment"); a source line sits in the footer of every quantitative visual. *Most-missed.* *(Verbatim caption: "Technology giants dominate investment in AI"; footers require "Source: …; McKinsey analysis".)*
6. **A MECE body of 2-5 (ideally 3) supporting chapters** — "the issues list contains 2-5 items, with 3 being optimal"; "don't boil the ocean."
7. **An "implications / where to start / act now" closing block** — a *named* section translating findings into action, not just a conclusion. *(Verbatim: "Businesses, developers, and governments need to act now to realize AI's full potential"; State of Fashion 2026 closes with "What does it mean for 2026 and beyond?")*
8. **A methodology / technical appendix + the survey-N** — the rigor that earns the authority. *(MGI AI report: "Appendix B: Technical appendix"; surveyed 3,073 companies.)*
9. **A city-tagged author box** + the Preface. *(Verbatim: "Jacques Bughin | Brussels   Eric Hazan | Paris   Sree Ramaswamy | Washington, DC   Michael Chui | San Francisco".)*

Plus the off-page ritual: **the pre-wire** — "a McKinsey team will take all the relevant players through their findings in private" before the readout.

## The genre nuance (a v2.0 BUG, fixed in v2.1)

Action titles are for **analytical / recommendation** deliverables. **Trend/survey pieces correctly use TOPIC-LABEL headers**, not imperatives — *(State of Fashion 2026: "Sourcing shifts persist as tariffs bite", "Resale continues to gain ground")*. So the v2.0 rule "every section header is a full declarative sentence" mis-fit the survey genre. v2.1's `insights-article` template allows topic labels; `mckinsey-sell` matches header style to genre.

## Per-type skeletons (real McKinsey publication formats → the templates)

| Real format | Skeleton (as seen in real reports) | Template id |
|---|---|---|
| **Long MGI research report** | Preface → IN BRIEF → exec summary (SCR) → MECE action-title chapters → action-title exhibits + source footers → "act now"/where-to-start → technical appendix + survey-N → city-tagged authors | `mgi-research-report` |
| **Short Insights article** | dek/thesis → optional In-Brief → 3-7 themed sections (topic-labels for trend/survey) → "what it means" close → author box | `insights-article` |
| **Executive briefing / "In Brief"** | the boxed-bullet summary (answer first), standalone | `executive-briefing` |
| **Slide-style deck** | SCQA slides 1-4 → Pyramid body (action-titled slides + exhibit + source footer) → next-steps slides; "presentable in under a minute" | `action-titled-deck` |
| **Decision memo (SCR / SCQA / pyramid / governing-thought)** | governing thought first → MECE key line → cited support → where to start | `governing-thought-memo` / `scr-storyline` / `scqa-memo` / `pyramid-doc` / `exec-one-pager` |

## How `mckinsey-sell` uses this

When building the synthesis IR for `--sell=<template>`, apply the components above that the template declares: lead with the answer (In-Brief / governing thought), write action-title section headers AND exhibit captions (unless it's a survey/trend `insights-article` → topic labels), put a **source footer on every quantitative exhibit**, end with a named **"where to start"** block, and (for `mgi-research-report`) carry the methodology/appendix + survey-N + the author box. Then render via `deepask/format` with `--style`/`--art-style`.

## Sources

- MGI — *Artificial Intelligence: The Next Digital Frontier?* (full report reproduction): https://anyflip.com/hhxry/mlmg/basic
- MGI — *A Future That Works*: "In Brief" PDF (mckinsey.com): https://www.mckinsey.com/~/media/mckinsey/featured%20insights/digital%20disruption/harnessing%20automation%20for%20a%20future%20that%20works/mgi-a-future-that-works_in-brief.pdf
- Supernormal — McKinsey presentation playbook (deconstructs *Women in the Workplace 2022*, *Jobs Lost/Jobs Gained*, *Reinventing Construction*): https://www.supernormal.com/blog/mckinsey-presentation-playbook
- Slideworks — 160+ real McKinsey presentations deconstructed: https://slideworks.io/resources/47-real-mckinsey-presentations
- Deckary — Consulting slide standards (action title, source line, ghost deck): https://deckary.com/blog/consulting-slide-standards
- K3 — Key insights from McKinsey's *State of Fashion 2026* (topic-label theme headers): https://k3fashionsolutions.com/knowledge-hub/key-insights-from-mckinseys-state-of-fashion-2026/
- SlideUpLift — McKinsey style presentation (SCR exec summary): https://slideuplift.com/blog/mckinsey-style-presentation/
- ConsultingSuccess — The McKinsey Way (MECE 2-5, pre-wiring, "don't boil the ocean"): https://www.consultingsuccess.com/the-mckinsey-way

> Refresh cadence: re-run the extraction if McKinsey materially changes its house style. The `grounded_in` citations in `mckinsey-templates.yaml` are the per-template provenance pointers into this file.
