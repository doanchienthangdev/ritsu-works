---
description: |
  Turn a data source into a McKinsey-caliber chart — model-agnostic front door with
  a pluggable renderer layer (--use=<renderer>). Default backend svg-native (in-repo,
  zero-dependency, pure-Node, byte-stable SVG). Chooses the chart type FROM THE MESSAGE
  (Zelazny "Say It With Charts"), encodes the McKinsey aesthetic (one-highlight,
  data-ink minimalism, direct labels, action-title-on-the-chart, source footer), and
  brands via the SAME --style design-system + --art-style axes as /image + /deepask.
  Pure/offline (NO API key). Tier A; artifacts to .archives/dataviz/<date>-<slug>/.
  Thin orchestrator over the `dataviz` umbrella skill (scripts/dataviz/gen.cjs).
argument-hint: "<message> --data=<path|json|csv> [--chart=auto|<type>] [--style=<ds>] [--source=...] [--format=svg|html|inline] [--theme=mckinsey] [--highlight=<series>]"
---

# /dataviz

Project-scoped command for ritsu-works. Front-end for the **dataviz** capability
(v0.1) — a general, reused-many-times data-visualization platform like `/image`, but
for **data → chart**. Capability spec: `wiki/capabilities/dataviz/spec.md` (after Phase 8).

The command is a **thin orchestrator**. The brains live in `scripts/dataviz/`
(all PURE + unit-tested): `select.cjs` (the Zelazny message→chart-type selector),
`render.cjs` (the McKinsey-grade SVG renderer), `lib/{theme,params,svg}.cjs`. The
umbrella skill `06-ai-ops/skills/dataviz/SKILL.md` documents the flow.

Per `governance/HITL.md`, `/dataviz` is **Tier A** — pure compute, no money, no
external surface, no user impact, **no secret/API key** (the renderer is pure/offline,
unlike `/image`'s `OPENAI_API_KEY`). Cost-bucket `ai-ops-dataviz`; the per-run cost is
~$0 (deterministic; the only LLM cost is the *calling* agent authoring `--message`/`--data`).

## Run

```bash
node scripts/dataviz/gen.cjs --message="<one-sentence message>" --data=<path|json|csv> [flags]
```

The agent runs `gen.cjs` and reports the typed outcome (`inline` returns the SVG into
the conversation; file modes write to `.archives/dataviz/<date>-<slug>/`).

## Parameters

| Flag | Values | Default | Effect |
|---|---|---|---|
| `<message>` / `--message` | one sentence | — | the MESSAGE (Zelazny: drives the chart choice AND becomes the action-title) |
| `--data` | path (.json/.csv) \| inline JSON \| inline CSV | — | the series-data (NOT pixels) |
| `--chart` | `auto` \| `bar`/`column`/`line`/`stacked`/`stacked100`/`grouped`/`scatter`/`waterfall`/`kpi` | `auto` | force a type or auto-select from `--message` |
| `--title` / `--title-style` | string / `action`\|`topic` | `--message` / `action` | exhibit caption override; topic labels for survey/trend genre |
| `--source` | string | — | the mandatory source footer (`Source: <data>; McKinsey analysis` or survey form) |
| `--footnotes` | `a \| b \| c` | — | footnote lines (incl. the `Note: …rounding` line on stacked) |
| `--highlight` | series name \| index | first series | the ONE loud series (one-highlight rule) |
| `--style` | design-system \| `auto` | classic mckinsey | brand palette/type override (reuse `/image`+`/deepask`) |
| `--theme` | `mckinsey` \| `mckinsey-rebrand` | `mckinsey` | the built-in McKinsey palette |
| `--art-style` | genre | — | secondary accent only (honest no-op on a pure data chart) |
| `--format` | `inline` \| `svg` \| `html` | `inline` | output medium (png/pdf raster = v0.2 stretch) |
| `--ar` / `--width` / `--height` | `W:H` / px / px | `4:3` / 720 | exhibit size (aspect is SEMANTIC — never auto-stretched) |
| `--unit` / `--decimals` / `--percent` / `--thousands` | … | — | number formatting (stated once, consistent per exhibit) |
| `--use` | `svg-native` \| (stubs) | `svg-native` | pluggable renderer (`knowledge/dataviz-renderers.yaml`) |
| `--out` / `--dry-run` / `--max-cost-usd` | path / — / usd | — | output path / plan-only / breaker (symmetry with /image) |

## What makes it McKinsey-grade

1. **Chart from the MESSAGE, not the data** (Zelazny). 2. **One highlight only** (the rest neutral gray). 3. **Data-ink minimalism** (no gridlines/legend/3D/fill). 4. **Direct data labels** (no legend). 5. **Bar value-axis from zero** (no truncation). 6. **Action-title ON the chart** + a **source footer on every exhibit**. 7. **Structure ⊥ brand** — `--style` overrides the palette/type, never the structure. Grounded in 3 real McKinsey reports (see `06-ai-ops/skills/dataviz/renderers/svg-native/SKILL.md` + the dataviz-design-brief).

## Composition

- **`/think mckinsey` (`mckinsey-sell`)** calls `/dataviz` per exhibit — the exhibit's action-title is the `--message`+`--title`, the survey/analysis line is `--source`. (v2.2 integration.)
- **`/deepask`** can route its `chart` format here (the repo's only deterministic McKinsey-grade SVG chart renderer).
- **`--style`/`--art-style`** flow through as the SAME design context tokens `/image` + `deepask/aesthetic` consume.

## Related
`/image` (raster generation — the sibling platform this mirrors) · `/deepask` (federated synthesis; routes charts here) · `/think mckinsey` (the McKinsey engine; consumes this for exhibits) · `/design-system` (the `--style` registry).
