# Consulting-deck deliverable anatomy — the visual grammar (v0.1)

> The slide grammar the reconstructed decks follow — the **"slide giống slide mẫu sample"** spec. Derived from the Domont overview decks (a generic top-tier *consulting-deck* genre: action-titled slides; framework = description + visual pair; placeholder templates; navy/cyan/gold/quadrant palette). Original content in that genre — **not** copies of source slides; footer is neutral ("Ritsu Works · Consulting Toolkit"), never "Domont Consulting".
>
> Companion to [`STRUCTURE.md`](STRUCTURE.md). The renderer (`scripts/consulting-toolkit/render.cjs`) implements exactly the layouts + tokens below. Sibling discipline: the McKinsey *report* genre lives in `../thinking-toolkit/mckinsey-sell/mckinsey-deliverable-anatomy.md` — that is report/exhibit grammar; THIS is toolkit-deck grammar.

## 1. Design tokens (exact)

```
--navy   #0A2156   primary: titles, chevrons, rules, key shapes
--cyan   #00A0E3   accent: subtitles, the brand dot, links, highlights
--gold   #F2A900   highlight tags, question-mark quadrant, callouts
--green  #2E9E5B   positive / star / cash-cow / "more investment"
--red    #C0392B   negative / dog / "no investment"
--amber  #E8A33D   mid quadrant
--ink    #1A1A1A   body text
--gray   #6B6B6B   secondary text
--rule   #0A2156   header underline (3px), footer rule (1px #D8D8D8)
--panel  #F2F2F2   light content panels / tiles
--panel2 #E8EDF5   pale-blue panels (callouts, key-points)
font: Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif
```

Geometry: **1280×720** (16:9). Margins 56px top/bottom, 64px sides. Title block top; thin footer bottom.

## 2. Slide chrome (every non-cover slide)

- **Header** — `title` in navy, bold, 28–32px, **action-title style** (a claim/sentence, not a label: *"The profit across all BUs has been increasing"* not *"Profit"*). Optional `subtitle` in gray beneath. A **3px navy rule** spans the content width under the header. Optional small navy icon top-right.
- **Body** — the layout-specific content (§3).
- **Footer** — 1px `#D8D8D8` rule; left: small gray brand `Ritsu Works · Consulting Toolkit`; right: page number. Optional `source` line ("Source: …") sits just above the footer in 10px gray.

## 3. Layout catalog (renderer dispatches on `slide.layout`)

Each slide: `{ layout, title?, subtitle?, source?, phase?, ...fields }`. Field shapes per layout:

| `layout` | fields | use |
|---|---|---|
| `cover` | `{title, subtitle, kicker?, band?: "navy"\|"image"}` | deck title slide |
| `toc` | `{items:[{n,label}]}` | agenda / phase list |
| `process-map` | `{phases:[{n,name,bullets?:[...]}], active?:n}` | ⭐ the N-phase chevron spine |
| `section` | `{n, name, goal?, phases:[name…], active:n}` | phase divider w/ progress chevrons |
| `exec-summary` | `{governing, reasons:[{title,body}]}` | pyramid: 1 governing thought + 3–4 reason tiles |
| `content` | `{body:[blocks], columns?:1\|2, takeaways?:[...]}` block = `"text"` \| `{bullets:[...]}` \| `{sub, bullets}` | general title+bullets/prose |
| `two-col` | `{left:{title,body[]}, right:{title,body[]}}` | what/who; desc + points |
| `framework-desc` | `{name, what, origin?, logic?, points?:[...]}` | framework description slide |
| `matrix-2x2` | `{x_label,y_label, axes?:{x:[lo,hi],y:[lo,hi]}, quadrants:[{pos:tl\|tr\|bl\|br,label,desc?,strategy?,color?:navy\|gold\|green\|red\|amber}], caption?}` | ⭐ BCG/GE/Ansoff quadrant |
| `staircase` | `{steps:[{n,label,desc?}]}` | ascending steps (e.g. 7 Degrees of Freedom) |
| `process-flow` | `{boxes:[{label,sub?}], arrows?:true, note?}` | value chain / SCOR / left→right flow |
| `tutorial` | `{steps:[{n,title,desc}]}` | ⭐ numbered step-by-step how-to |
| `table` | `{headers:[...], rows:[[...]], firstcol_head?:true, highlight?:[r,c]}` | styled grid |
| `comparison` | `{columns:[{title,color?,rows:[...]}], rowlabels?:[...]}` | red-ocean vs blue-ocean; option compare |
| `kpi-tiles` | `{tiles:[{value,label,color?}]}` | big-number stat tiles |
| `chart` | `{chart_type: bar\|column\|line\|stacked-column, categories:[...], series:[{name,values:[...],color?}], y_unit?, key_takeaways?:[...]}` | data exhibit (inline SVG) |
| `example` | `{company, narrative, data?:{label,value}[]}` | real-company worked example |
| `quote` | `{text, attribution?}` | oversized pull-quote divider |
| `close` | `{message, next_steps?:[...]}` | closing / next steps |
| `html` | `{html}` | escape hatch — raw Domont-styled body for exotic visuals |

**Rules:** prefer the structured layouts; use `html` only when no structured layout fits. One message per slide (the action-title IS the message). Charts always carry a `source`. Quadrant/caption colors follow the token semantics (green=invest/positive, red=divest/negative, gold=question/caution).

## 4. `frameworks[].visual.spec` ⇄ layout mapping

A framework's `visual.kind` maps to the layout used on its visual slide:

```
matrix-2x2     → matrix-2x2 spec
staircase      → staircase spec
funnel         → process-flow (vertical) or html
value-chain    → process-flow spec
process-flow   → process-flow spec
tree           → html (decision/issue tree) or table
cycle          → html (virtuous cycle) or process-flow
table          → table spec
chart          → chart spec
kpi-tiles      → kpi-tiles spec
comparison     → comparison spec
none           → framework-desc only (no visual slide)
```

## 5. Deck spine (default order the agent builds)

1. `cover` → 2. `exec-summary` (core value + governing thought) → 3. `process-map` (the spine) → 4. for each phase: `section` divider + 1–3 `content`/framework slides → 5. **signature frameworks** (≥3): `framework-desc` + its visual layout + `tutorial` + `example` → 6. `example` (end-to-end) → 7. `close`.

Target 18–34 slides. Depth over count; every slide earns its place via a real message.
