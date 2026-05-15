# Cabinet Routing Matrix (master copy, owned by CEO)

> CEO's master routing table. The Phase 1 entries are live; Phase 2/3/4 entries are planning placeholders activated when the corresponding persona ships.

---

## Routing decision per request type

### Strategic + open-ended

| Request signal | Tier | Target | Notes |
|---|---|---|---|
| "What should I focus on this week/today?" | 3 | self (synthesize + present plan) | Pattern 1 in playbook |
| "Plan my week" | 3 | self | invoke weekly-review SOP if Friday |
| "Should we [pricing / positioning / hire / spend > $200]?" | 4 | poll relevant chiefs in parallel, synthesize | Pattern 3 |
| "I'm tired / bad week / lost" | 4 | self (Pattern 4) | Emotional routing |

### Tactical — code & infrastructure

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Review this PR" | 1 | `@cto` | 1 |
| "Code change for X" | 1 | `@cto` | 1 |
| "Schema/migration question" | 1 | `@cto` (subagent) | 1 |
| "Edit a hook / MCP config" | 2 | `@cto` (Tier B confirm; some hooks are sensitive) | 1 |
| "Set up Stripe webhook" | 3 | plan: `@cto` build + (`@ciso` review Phase 4) + (`@cfo` verify Phase 4) | 1 (CTO only); 4 (full plan) |

### Tactical — marketing & content

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Draft a tweet/blog/email about X" | 1 (draft only, A) | Phase 2+: `@cmo`; Phase 1 fallback: `content-drafter` role direct | 1 (fallback), 2 (primary) |
| "Publish [content]" | 2 → C | Phase 2+: `@cmo` with HITL ceremony; Phase 1: founder direct via `growth-orchestrator` role | 1 (manual), 2 (CMO) |
| "Compare to Anki / Quizlet / ChatGPT messaging" | 1 | Phase 2+: `@cmo`; Phase 1 fallback: charter-grounded direct answer | 1 (CEO direct), 2 (CMO) |

### Tactical — sales & funnel

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Why is signup conversion down?" | 3 | plan: query `metrics.product_dau_snapshot` + Phase 2+: `@cso`; Phase 4: `@cds` | 1 (CEO inline), 2 (CSO), 4 (CDS) |
| "Run a pricing experiment" | 3 → C | Phase 2+: `@cso`+`@cfo`; Phase 1: founder direct | 1 (manual), 2+ (delegated) |
| "Change pricing on ritsu.ai/pricing" | 2 → C | Phase 2+: `@cso` draft, founder approves; Phase 1: founder direct | All phases require founder approval |

### GTM (Phase 1 active, since 03-gtm is stage pillar)

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Plan next GTM experiment" | 3 | `@cgo` | 1 |
| "How's the funnel?" | 1 | `@cgo` | 1 |
| "Launch sequence for [feature]" | 3 | `@cgo` decomposes into Marketing+Sales+Product modules; **upstream dep: `@cpo` validates wedge first** | 1 |
| "Who are our ICP?" | 1 | `@cgo` (reads `03-gtm/icp-and-segmentation/`) | 1 |

### Product (Phase 1 active per ADR-006 — CPO owns 04-product)

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "What should we build next?" / "Prioritize backlog" | 1/3 | `@cpo` | 1 |
| "Draft a PRD for [feature]" | 1 | `@cpo` | 1 |
| "Observe N=10 strangers using [thing]" | 1 | `@cpo` (executes `SOP-PRODUCT-002`; PG critical gate) | 1 |
| "Cofounder usage analysis" | 1 | `@cpo` (executes `SOP-PRODUCT-001`; N=2 data available) | 1 |
| "Analyze cancel-flow feedback" | 1 | `@cpo` | 1 |
| "Wedge discovery — what works first?" | 3 | `@cpo` (decomposes into stranger observation + cofounder analysis + competitor gap analysis) | 1 |
| "Pricing experiment design" | 2/3 | `@cpo` (design); founder approves; Phase 2+: `@cso` runs; Phase 4+: `@cfo` verifies margin | 1 (design only) |
| "A/B test stop-and-decide" | 1 | `@cpo` (Phase 1); Phase 4: `@cds` provides statistical readout, `@cpo` makes call | 1 |
| "Should we build feature X?" (strategic) | 4 | CEO polls `@cpo` (wedge fit) + `@cgo` (GTM fit) + `@cto` (cost/feasibility), synthesizes | 1 |

**CPO/CGO boundary (per ADR-006):** in-product UX/wedge/PRD → CPO. External distribution/positioning/launch → CGO. Ambiguous → CEO Tier 4 arbitrates.

### Customer & support

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Handle this support ticket" | 1-2 | Phase 3+: `@cco`; Phase 1-2 fallback: `support-agent` role direct + escalation-router | 1 (manual fallback), 3 (CCO) |
| "Why is retention dropping?" | 3 | Phase 3+: `@cco`; Phase 1-2: founder + CEO inline analysis | 1 (CEO), 3 (CCO) |
| "Onboard first paying user" | 3 → C | founder direct (per `SOP-CUSTOMER-006-founder-onboarded`); CEO assists | All phases — founder personally |

### Design

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Design new landing page" | 3 → C | Phase 3+: `@cdo`; Phase 1-2: founder + skills | 1-2 (founder), 3 (CDO) |
| "Update brand voice" | 2 → C | Phase 3+: `@cdo` + `@cmo`; Phase 1-2: founder direct via PR to `00-charter/brand_voice.md` | 1-2 (founder), 3 (CDO) |

### Finance

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Refund customer $X" (X < $50) | 2 → C | Phase 4+: `@cfo`; Phase 1-3 fallback: founder + `backoffice-clerk` | All phases — money out always requires founder |
| "Refund customer $X" (X > $2000) | 4 → D-MAX | founder direct + magic phrase | All phases |
| "What's our runway?" | 1 | Phase 4+: `@cfo`; Phase 1-3: query `ops.transactions` + Stripe MCP read | 1 (CEO direct query), 4 (CFO) |

### Trust & safety

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Got a DMCA notice" | 4 → C | Phase 4+: `@ciso` + founder direct (T&S escalates direct per ROLES.md); Phase 1-3: founder direct | All phases — founder per ROLES.md |
| "User reports hallucination in quiz" | 3 → C | Phase 4+: `@ciso`; Phase 1-3: log to TODO, founder triages | 1-3 (manual), 4 (CISO) |

### Metrics

| Request signal | Tier | Target | Phase |
|---|---|---|---|
| "Show me [KPI]" | 1 | Phase 4+: `@cds`; Phase 1-3: query `ops.kpi_snapshots` directly | 1 (CEO direct), 4 (CDS) |
| "Analyze A/B test [name]" | 3 | Phase 4+: `@cds` (via `experiment-analyst`); Phase 1-3: CEO inline | 1 (CEO), 4 (CDS) |
| "Set up new alert" | 2 → C | Phase 4+: `@cds`; Phase 1-3: founder PR to `knowledge/alert-rules.yaml` | 1-3 (PR), 4 (CDS) |

### Recurring rituals

| Trigger | Tier | Target | Phase |
|---|---|---|---|
| Morning (founder /ceo or cron) | 1 | self via `synthesize-morning-brief` skill | 1 (E3 expansion) |
| Friday weekly review | 1 | self via `SOP-FOUNDER-013-friday-review-template` | 1 |
| Top-idea audit (Friday) | 1 | self via `SOP-FOUNDER-001` | 1 |
| Monthly retro | 1 | self via (TBD) | 2+ |

## Fallback chain (when target persona not yet shipped)

Phase 1 ships CEO, CTO, CGO, **CPO** (per ADR-006). All other personas fall back to direct role invocation:

| Unshipped persona | Phase 1 fallback |
|---|---|
| CMO | `growth-orchestrator` role direct (scoped to marketing) OR `content-drafter` for pure drafting |
| CSO | `growth-orchestrator` role direct (scoped to sales) |
| CCO | `support-agent` role direct + `customer-lead` (Phase 1 partial) |
| CDO | founder direct (no design persona in Phase 1) |
| COO | **deferred to Phase 4+** (per ADR-006); cross-pillar coordination handled by CEO Tier 3/4 routing until activated |
| CFO | `backoffice-clerk` role direct + founder approval for money |
| CISO | `trust-safety` role direct + founder approval for user-affecting decisions |
| CDS | direct `ops.kpi_snapshots` / `metrics.*` queries |

## Routing tier reminders

- **Tier 1 (direct):** known pattern + Tier A/B action → execute, return result.
- **Tier 2 (confirm):** known pattern + Tier B+ implication → ask founder, then execute.
- **Tier 3 (decompose):** multi-step or multi-persona → plan, present plan, then orchestrate after approval.
- **Tier 4 (escalate):** strategic, ambiguous, or D-MAX → reframe, present options, founder decides.

Every CEO response declares the tier. Founder may override the tier ("just do it" can promote from 2 to 1 for the session).

## How this matrix evolves

- Founder corrects CEO's routing → log to `ops.corrections`.
- After 5+ corrections in 14 days on the same pattern, CEO proposes an update (PR to this file).
- Per Phase trigger, new persona ships → new rows activated (Tier C PR).

This matrix is the cabinet's contract. Drift here = routing surprises. Keep it tight.
