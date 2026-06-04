# The Consulting-Toolkit Artifact Bundle — Common Structure (deliverable #1)

> **The canonical structure every reconstructed toolkit follows**, and the **JSON contract** (`bundle-spec`) that the reconstruction agent emits and the renderer consumes. One source of truth for: what a bundle contains, what "good" looks like, and how the pieces are produced.
>
> Capability: `consulting-toolkit` v0.1. Companion: [`domont-deliverable-anatomy.md`](domont-deliverable-anatomy.md) (the slide visual grammar). Lives in the skill so it ships; copied to `raw/consultant/tookits/_structure/` at assembly so the content folder is self-describing.

---

## 1. Why this structure exists

The source decks (Domont "Overview" previews) are **partial clues**: they reveal each toolkit's *process spine* (an N-phase chevron map), its *module list per phase*, the *named frameworks/tools*, and a handful of *rendered sample slides*. They do **not** contain the full 900-slide toolkit.

Our job is **reconstruction, not copying**: take the clue + world-class public knowledge of each framework + targeted research, and rebuild the *full, step-by-step, executable process* — the thing that lets a practitioner actually *run* the engagement, not merely recognize the framework names.

The structure below is engineered around one principle the source decks embody and the founder prized:

> **A process is executable when every step names (a) its goal, (b) the framework/tool that does the work, (c) the concrete how-to, (d) the input it consumes and output it produces, and (e) how you know it's done.** A list of framework names is *not* a process.

## 2. The bundle on disk

Each toolkit → one folder `raw/consultant/tookits/<NN>-<slug>/`:

```
<NN>-<slug>/
├── README.md                     # bundle index: what this is, the spine at a glance, how to use, file map
├── process.md                    # ⭐ THE detailed reconstruction (the core IP) — full markdown
├── process.yaml                  # machine-readable process spine (phases→steps→frameworks→io→kpis→raci)
├── <slug>-handbook.pdf           # "pdf diễn giải chi tiết" — process.md rendered, branded, A4 portrait
├── <slug>-deck.pdf               # "slide giống slide mẫu sample" — the 16:9 consulting deck
├── bundle-spec.json              # the structured contract (agent output; renderer input) — kept for re-render
├── slides/
│   ├── deck.html                 # editable deck source (the HTML the PDF was printed from)
│   └── deck.spec.json            # slide-by-slide spec (subset of bundle-spec.deck)
├── frameworks/
│   └── <framework-slug>.md        # one file per framework: what · origin · logic · visual · tutorial · example · template · pitfalls · sources
├── templates/
│   └── <name>.{md,csv}            # fill-in-the-blank working templates + worked-example variants
└── sources.md                    # every external citation used in the reconstruction (research provenance)
```

Top-level of `tookits/`:
```
tookits/
├── INDEX.md                       # master index of all bundles + the cross-toolkit "meta-process" map
├── _PROGRESS.md                   # living status (this run)
├── _structure/                    # deliverable #1 copied here (STRUCTURE.md + anatomy) so the folder self-describes
├── _assets/                       # shared brand kit: domont-style.css, deck.css, fonts note, palette
└── _extractions/                  # the verbatim pdftotext clues + briefs.json (provenance)
```

## 3. The `bundle-spec.json` contract (agent output ⇄ renderer input)

The reconstruction agent returns exactly this object (validated by the workflow `schema`). The renderer reads it to emit both PDFs. Markdown fields are GitHub-flavored.

```jsonc
{
  "id": 5,
  "slug": "management-consulting",
  "title": "Management Consulting",
  "domain": "consulting",
  "core_value": "<what the buyer is really buying — the 'I can finally run this engagement' outcome>",
  "one_liner": "<≤25-word positioning>",
  "when_to_use": "<the trigger situation(s)>",
  "audience": ["<role>", "..."],

  "process": {
    "model_name": "<e.g. '5-phase consulting engagement' | 'DMAIC' | 'SCOR' | 'ISO 31000'>",
    "model_rationale": "<why this spine; cite the canonical method if standard>",
    "phases": [
      {
        "n": 1,
        "name": "<phase name>",
        "goal": "<the outcome of this phase in one sentence>",
        "key_question": "<the question this phase answers>",
        "duration": "<typical, e.g. '2–3 weeks'>",
        "steps": [
          {
            "n": 1,
            "name": "<step>",
            "how": "<2–4 sentences: concretely how to do it>",
            "frameworks": ["<framework-slug>"],
            "input": "<what it consumes>",
            "output": "<the artifact it produces>",
            "owner": "<RACI-ish role>"
          }
        ],
        "frameworks": ["<framework-slug>"],
        "deliverable": "<the phase's headline artifact>",
        "kpis": ["<how you measure this phase worked>"],
        "gate": "<the go/no-go decision to exit this phase>"
      }
    ]
  },

  "frameworks": [
    {
      "slug": "bcg-growth-share-matrix",
      "name": "BCG Growth-Share Matrix",
      "category": "<portfolio | growth | diagnosis | analysis | financial | ...>",
      "what": "<1–2 sentences: what it is>",
      "origin": "<who/when, e.g. 'Bruce Henderson, BCG, 1968'>",
      "logic": "<the underlying theory / why it works>",
      "visual": { "kind": "matrix-2x2|staircase|funnel|value-chain|process-flow|tree|cycle|table|chart|kpi-tiles|comparison|none",
                  "spec": { /* layout-specific structured data — see anatomy doc §4 */ } },
      "tutorial": ["<step 1 (imperative, executable)>", "<step 2>", "..."],
      "example": { "company": "<real named company>", "narrative": "<how they used it>", "takeaway": "<the so-what>" },
      "template": { "instructions": "<how to fill it>", "fields": ["<blank to fill>", "..."] },
      "pitfalls": ["<common failure mode + the counter>"],
      "when_to_use": "<the trigger>",
      "sources": ["<citation key into sources[]>"]
    }
  ],

  "deck": {
    "subtitle": "Reconstructed process & toolkit",
    "slides": [ /* ordered slide specs — layouts + fields per domont-deliverable-anatomy.md §3 */ ]
  },

  "document_md": "<the FULL handbook markdown — see §4 for the mandated section order>",

  "templates": [ { "name": "<name>", "format": "md|csv", "content": "<...>" } ],
  "worked_example": { "title": "<end-to-end example>", "content_md": "<a realistic run through the whole process>" },
  "sources": [ { "key": "s1", "title": "<...>", "url": "<...>", "note": "<what it grounded>" } ],

  "self_grade": { "coverage_pct": 0.0, "rigor_note": "<honest gaps>", "frameworks_count": 0, "phases_count": 0 }
}
```

**Hard rules for the agent**
- Every `step.frameworks[]` slug MUST exist in `frameworks[]`. Every `frameworks[].sources[]` key MUST exist in `sources[]`. (The renderer asserts this.)
- **Cover every phase and every named framework that appears in the source clue.** Do not silently drop modules. If the clue names "GE-McKinsey Matrix", it must appear as a framework.
- The process spine must be a *sequence with gates*, not a bag of modules. If the toolkit has a canonical method (DMAIC, SCOR, ISO 31000, Ansoff, McKinsey 7S), name it and follow its real structure.
- **Ground claims.** Use web research for any framework you are not 100% sure of (origin, exact steps, real example). Put what you used in `sources[]`. No fabricated data, no fabricated citations.
- Original synthesis only. Do **not** reproduce verbatim slide text from the source; reconstruct in your own words.

## 4. `document_md` — mandated section order (the handbook)

The detailed PDF renders from `document_md`. Required sections, in order:

1. **Title + one-liner + core value** (what you're really buying).
2. **When to use this toolkit** (trigger situations; who it's for).
3. **The process at a glance** — the phase map as a table (phase · goal · key question · deliverable · gate).
4. **Phase-by-phase** — for each phase: goal, key question, the ordered steps (each with how/input/output/owner), the frameworks used, the deliverable, KPIs, and the exit gate.
5. **The frameworks & tools** — for each framework, the full anatomy (§5).
6. **A worked end-to-end example** — one realistic narrative running the whole process.
7. **Templates** — index + how to use each.
8. **Pitfalls & best practices** — the top failure modes across the process.
9. **Sources** — research provenance.

Length target: substantive (this is the IP) — typically **3,000–6,000 words**, depth over padding. Action-titles (a claim, not a label) for every H2/H3 where natural.

## 5. The per-framework anatomy (the executability unit — D7)

Every framework in `frameworks/<slug>.md` and in the handbook follows the **6-part anatomy** lifted from the source decks (e.g., the "7 Degrees of Freedom" slide sequence): 

1. **Description** — what it is, who created it & when, and the *logic* (why it works).
2. **Visual** — the diagram (matrix / staircase / funnel / tree / table / chart …) rendered in the deck; described in the handbook.
3. **Step-by-step tutorial** — numbered, imperative, *executable* steps to actually apply it.
4. **Real-life example** — a real named company, concretely.
5. **Template** — the fill-in-the-blank version a practitioner uses on their own situation.
6. **Pitfalls / when-to-use** — the failure modes and the trigger that makes this the right tool.

A framework entry missing the **tutorial** or **template** is incomplete — those two are what make it *do-able* rather than merely *known*.

## 6. How the bundle is produced (pipeline)

```
pdftotext clue  ──►  reconstruction agent (deep research + knowledge)  ──►  bundle-spec.json
                                                                              │
        ┌─────────────────────────────────────────────────────────────────┘
        ▼
  render.cjs ──► <slug>-handbook.pdf (document_md → branded A4 portrait)
            └──► <slug>-deck.pdf      (deck.slides → 16:9 consulting deck)
  + emit process.md, process.yaml, frameworks/*.md, templates/*, sources.md, README.md
```

The reconstruction runs in a **Workflow** (one agent per toolkit, with a completeness-critic pass). Rendering is deterministic (headless Chrome HTML→PDF). See `wiki/capabilities/consulting-toolkit/spec.md`.

## 7. Quality bar (the completeness-critic checklist)

A bundle passes only if:
- [ ] Every phase in the source clue is present, ordered, with a goal + gate.
- [ ] Every named framework is present with all 6 anatomy parts.
- [ ] Every step names a how + input + output.
- [ ] At least one real, named worked example exists for the whole process.
- [ ] Every non-obvious factual claim has a source.
- [ ] The deck has: cover · exec-summary · process-map · per-phase coverage · ≥3 signature-framework deep-dives · worked example · close.
- [ ] No verbatim copying of source slides; original synthesis throughout.
