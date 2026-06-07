---
title: "Digital & Channel Strategy — The Channel Foundation for the First 100 Paying Who Love"
type: strategy-doc
pillar: 01-marketing
layer: foundation
status: v1.0-draft
owner: founder
domont_component: "Pillar-5 — Digital & Channel Strategy"
confidence_posture: "true-zero — `observed` only where grounded in supabase-analytics Door-2; otherwise inferred/hypothesis"
grounded_in:
  - 00-core/positioning.md
  - 00-core/icp-summary.md
  - 00-core/product.md
  - 00-core/north-star.md
  - 00-core/brand_voice.md
  - 01-marketing/icp/persona-portrait.md
  - 01-marketing/icp/customer-journey.md
  - knowledge/analytics-sync-contract.yaml
  - knowledge/kpi-ownership.yaml
  - knowledge/kpi-registry.yaml
  - 03-gtm/distribution-engine
  - 03-gtm/funnel-orchestration
last_updated: 2026-06-07
source_run: ritsu-foundational-layer-v1
---

> **Marketing Pillar-5 (Domont commercial-strategy: Positioning · Communication · Distribution · Pricing · Digital).** This is the **digital & channel foundation** — the per-channel ROLE map, the PRIORITY channel set for the first-100 wedge, the situational-content-cluster map, and the **cost-per-activated** discipline — that the downstream GTM SOPs (`SOP-GTM-003` public-launch-channels, `SOP-GTM-006` multi-channel-deploy, `SOP-GTM-008` YouTube-influencer-discovery, `SOP-GTM-009` channel-attribution-and-doubling-down) execute against without re-deriving strategy.
>
> **It answers ONE question:** *where do we show up, in what role, with what content, and how do we know a channel is working — at true-zero, with zero proven WTP and a free shadow rival?*
>
> **The line that governs this doc:** marketing owns the **channel STRATEGY** (roles, priority, content clusters, the metric definition). GTM owns the **channel EXECUTION** (the dated sequence, the budgets, the daily ad-manager work). This is the foundation; `03-gtm/` is the campaign. They must not contradict.

---

## 0. The framing decision (read this first — it changes everything below)

The textbook digital-marketing mix (`raw/consultant/.../digital-marketing-mix.md`) treats SEO / PPC / Social / Email / Website as five co-equal channels you balance with a budget pie. **For Ritsu at true-zero, that framing is wrong, and following it would burn the runway.** Two facts override it:

1. **The audience is search-and-community-PULL, not paid-PUSH.** The locked persona is *deliberately skeptical, accuracy-first, gimmick-averse* (`persona-portrait.md` S9 attr 13; `customer-journey.md` §6.1: "a trust gauntlet, not a convenience sell"). They discover tools through a peer in a course Discord, a study-science YouTuber they already trust, or a top Reddit answer — and they **punish ad-tone in communities that police it** (`customer-journey.md` A1 drop-off #3). A cold paid-search push at this audience converts worse than an earned community mention by an order of magnitude. Paid is a *probe*, not the engine.

2. **The shadow rival is FREE.** Google NotebookLM does doc→quiz→grounded-explanation→share-link and, as of April 2026, basic mastery-tracking — for $0 (`icp-summary.md` §8 R2). This **breaks the classic LTV:CAC math** the way it broke for Dropbox (`raw/consultant/.../marketing-roi-analysis.md` — Dropbox's paid LTV:CAC was <1, so the *only* viable strategy was the referral pivot at >50:1). Ritsu cannot out-spend a free Google product on paid acquisition. The economically-forced engine is the **same as Dropbox's**: the **in-product share-loop** (the PLG viral mechanism, `product.md` §7) — earned, near-zero-CAC distribution — backstopped by *targeted* (never broad) paid probes.

**Therefore the channel strategy is NOT a budget pie. It is a sequenced, role-differentiated portfolio with one dominant earned engine (the share-loop) and a strict cost-per-activated gate on every paid probe.** Everything below flows from this.

> **Honesty banner (true-zero):** Ritsu has **0 real paying customers, 0 organic stranger-referrals, 25 founder/test profiles, 656 founder-era learning sessions, 15 founder-only share-links** (Door-2 `supabase-analytics`, per `analytics-sync-contract.yaml`). Every CAC, LTV, ROAS, and conversion-rate number in this doc is a **target or a hypothesis, not an observation**. The single load-bearing unknown — *does the wedge pay at the first hard limit?* (`icp-summary.md` §8 R1) — is upstream of all channel economics. **No channel can be judged on cost-per-PAID until the N=10 watch (`SOP-PRODUCT-002`) settles R1; until then channels are judged on cost-per-ACTIVATED.** §6 makes this the governing discipline.

---

## 1. The digital mix — channel ROLES (not a balanced pie)

The framework's core insight is correct and we keep it: *each channel plays a different role in the customer journey, has a different cost structure, and a different optimisation lever* (`digital-marketing-mix.md` "Why it works"). What changes is the **role each channel plays for Ritsu's specific 5A journey** (`customer-journey.md`) and the **priority** (which get funded for the first 100). The five textbook channels map to Ritsu reality as follows — and we add the two channels the textbook omits that are actually dominant for us: **Community (earned)** and the **in-product Share-Loop (the engine)**.

| Channel | Textbook role | **Ritsu role (mapped to 5A)** | 5A stage it owns | Priority for first-100 | Why this priority |
|---|---|---|---|---|---|
| **Community (earned)** *(textbook omits)* | — | **The discovery engine.** Help-first seeding in Reddit/Discord where the persona already lives + decides. This is where AWARE and ASK are actually won. | A1 AWARE, A3 ASK | **★ P0 — primary** | The persona's "primary platform" is Reddit (`persona-portrait.md` S9 ★1, conf 64%); trust flows through communities, not ads. Near-zero cash CAC, high founder-time CAC. |
| **In-product Share-Loop (PLG)** *(textbook omits)* | — | **The growth engine — the only acquisition that beats a free rival on economics.** A loved user's share-link is a near-zero-CAC AWARE event for a stranger. | A5 ADVOCACY → loops to A1 | **★ P0 — the engine** | The Dropbox lesson (`marketing-roi-analysis.md`). Mechanism EXISTS (15 links) but is **0% organic** — un-ignited (`customer-journey.md` A5). Igniting it is the single highest-leverage channel act. |
| **Social (organic video + creator)** | Awareness, community, retargeting | **Awareness + method-credibility + ASK proof.** YouTube Shorts / X #studytwt / study-creator co-sign. The audience's "secondary platforms" (`persona-portrait.md` S9 attr 2, **observed** 16% YouTube material). | A1 AWARE, A2 APPEAL, A3 ASK | **P1 — high** | Where the trusted study-science creators live (Justin Sung 99, Ali Abdaal 94 — `persona-portrait.md` S9-A). Authority > reach for a skeptical audience. |
| **Website (ritsu.ai)** | Conversion engine, brand hub | **The conversion + activation engine. The product IS the pitch** — ACT has no human/sales step (`customer-journey.md` A4). The <60s magic moment lives here. | A2 APPEAL, A4 ACT | **★ P0 — non-negotiable** | Every other channel routes here; if the landing→upload→aha path leaks, all upstream spend is wasted. This is also the share-link *destination* (must prove the PATH, not a paywall). |
| **Email** | Retention, nurture, conversion | **Activation rescue + the money-moment nudge.** NOT acquisition. The Day-1/3/7 onboarding flow + the deadline-scoped "you're 6 days out and mid-path" upgrade nudge (`customer-journey.md` A4 lever). | A4 ACT (activation + free→paid) | **P1 — high** | High-ROI, owned, near-zero marginal cost. Directly moves the two observable-today leading metrics (aha completion + re-upload). |
| **SEO (long-tail content)** | Long-term organic discovery | **The compounding authority moat — the trust-first content engine.** Each homepage situational workflow = a long-tail cluster (`product.md` §8). This is the **preemptive POD** made operational (`positioning.md` §6: learning-science authority compounds; features don't). | A1 AWARE, A3 ASK | **P2 — seed now, harvest later** | 6–12 month payoff (`digital-marketing-mix.md`). Plant the seeds in the first 100 (esp. the NotebookLM-comparison page — see §4); do not *expect* first-100 paid customers from it. |
| **PPC / Paid (targeted probes)** | Immediate paid demand capture | **A measurement probe + a message-fit test — NOT the engine.** Precisely-targeted placements on the S9-A high-fit surfaces to *test* which message + which channel produces the cheapest activated user. | A1 AWARE → A4 ACT | **P2 — probe, capped** | Cannot out-spend free NotebookLM (§0). Use to *price-discover* channels under a hard cost-per-activated cap (§6), then double-down only on a winner. Avoid broad reach; the *placement* (study/ML creators + communities) converts, the *platform's broad audience* does not (`persona-portrait.md` S9 attr 13). |

**The portfolio shape in one line:** *two P0 earned engines (Community + Share-Loop) feed a P0 conversion surface (Website), supported by P1 trust-builders (Social creator + Email activation), with P2 long-game (SEO) and P2 probes (Paid) seeded but not relied upon.* This is the **opposite** of an equal-fifths budget pie — and it is the only allocation that survives a free rival and zero proven WTP.

---

## 2. The PRIORITY channel set for the first 100 (the funded list)

Concentration is the discipline (`icp-summary.md` §0: "go for a large share of one segment, not a small share of everyone"; `digital-marketing-mix.md` pitfall #1: "spreading budget equally across all five channels — concentrate spend where your ICP actually is"). For the first 100, fund **exactly these**, ranked. Channels we explicitly **do NOT fund** are named in §2b — naming exclusions prevents scope creep (the BRAVO Audience discipline, `icp-summary.md` §7).

The priority set is drawn straight from the **scored S9-A 628-channel map** (`persona-portrait.md` §S9-A) — every entry below carries its S9-A fit-score and ad/seeding mechanism so the GTM SOPs can act without re-scoring.

| Rank | Channel (specific surface) | Role | S9-A fit | Mechanism | First-100 play |
|---|---|---|---|---|---|
| **1** | **Reddit communities** — r/learnmachinelearning (92), r/GetStudying (97/99), r/Anki (96/99), r/studytips (96), r/cs231n, r/Mcat (87), r/premed (86), r/medicalschool (86) | Discovery (A1) + ASK proof (A3) | top platform, avg 83 | **Organic seeding first** (help-first answers, link second); Reddit Ads community+keyword targeting as a *probe* only | Seed genuinely useful answers in the on-persona subs; hand-recruit the N=10 here (`persona-portrait.md` S9 attr 17). The single most on-persona surface. |
| **2** | **In-product Share-Loop** — the share-link mechanism + its landing destination | The growth engine (A5→A1) | — (product) | Product feature + the "share your path" prompt fired at the love-moment (`customer-journey.md` A5 lever) | **Ignite it.** Make the link destination prove the PATH + Knowledge Map (not a paywall); hand-seed ONE live cs231n/6.S191 cohort (`SOP-CUSTOMER-006` Collison install) so one Discord reaches share critical mass and the first stranger-referral fires. |
| **3** | **ritsu.ai (Website)** — hero + 3-step demo + the upload→<60s-aha path + the NotebookLM-comparison page | Conversion + activation (A2, A4) | — (owned) | Landing optimization (Core Web Vitals <2.5s LCP; aha in <10s — `digital-marketing-mix.md` step 6) | Default the demo to a **dense-STEM artifact** (cs231n/backprop or a real ML paper page w/ equations + code) so a backprop-stuck learner believes it works on her hardest material (`customer-journey.md` A2 lever). |
| **4** | **YouTube — study-science + ML creators** — Justin Sung (99), Ali Abdaal (94), Thomas Frank (99), StatQuest (92), Karpathy (92), 3Blue1Brown-adjacency, Benjamin Keep PhD (97) | Awareness + method-credibility + ASK (A1–A3) | avg 86, top 99 | **Creator co-sign / sponsorship** (host-read or managed-placement) + own Shorts; custom-intent seeded from their video URLs | Co-sign ONE learning-science authority (Justin Sung is the highest-fit — his whole audience IS the thesis) before broad spend. Authority > raw reach for this skeptical audience (`persona-portrait.md` S9 attr 18). |
| **5** | **X (Twitter) #studytwt** + study/ML accounts (Ali Abdaal 99) | Awareness + community (A1, A3) | avg 86 | Organic #studytwt participation + X Ads keyword/handle targeting as probe | Build-in-public + share the trust-first content; cheap to test, real watering hole. |
| **6** | **Email (owned)** — Day-1/3/7 onboarding flow + deadline-scoped money-moment nudge | Activation rescue + free→paid (A4) | — (owned) | Transactional + lifecycle automation (pre-approved templates; `governance/HITL.md` Tier B) | The two flows that move the observable-today metrics. Lowest marginal cost, highest activation ROI. |
| **7** | **SEO long-tail clusters** (§4) — seed the 9 situational-workflow clusters + the comparison page | Compounding authority (A1, A3) | — (owned) | Trust-first content engine (the preemptive POD) | Plant now; the NotebookLM-comparison cluster is the highest-priority seed (it wins the ASK head-to-head, `customer-journey.md` A3). 6–12mo harvest. |
| **8** | **Discord — course/study servers** (fast.ai, DeepLearning.AI, cs231n cohorts; Clarity Learning 94) | Discovery + the Collison-install surface (A1, A5) | avg 83 | **Organic seeding only** (explicitly NOT paid — `persona-portrait.md` S9-A Discord row) | The highest-trust surface. Where the hand-seeded cohort lives → where the share-loop ignites. |

**The two P0 engines (Reddit-community + Share-Loop) carry the first 100. Everything else supports them or is a capped probe.** If forced to cut to three channels under runway pressure: **Reddit-community seeding + the Website conversion path + the Share-Loop.** Those three are the irreducible spine.

### 2b. Channels we deliberately do NOT fund (first 100)

| Channel | Why excluded now | Re-activates when |
|---|---|---|
| **LinkedIn** | Wrong surface for individual learners (`icp-summary.md` §6; "cold LinkedIn wastes budget" `persona-portrait.md` S9 attr 13). | Educator B2B layer (year 2) or career-changer professional expansion. |
| **TikTok / IG / Facebook (broad feed)** | Low upload-intent; intent-less mass-blast wastes budget (`persona-portrait.md` S9 attr 13). *Precisely-targeted* study-creator placements may convert, but the broad feed does not — avoid the reach, not always the platform. | Post-PMF, only via Spark/creator-audience placements at proven cost-per-activated. |
| **Press / PR** | Vanity pre-PMF; "press doesn't pay" (`north-star.md` §3). | A real launch milestone or a fundable narrative post-PMF. |
| **Pinterest** | No upload intent. | Never (for this wedge). |
| **Broad paid search (generic "study app" / "AI tutor" terms)** | Highest-cost, lowest-trust; loses the head-to-head to free NotebookLM on a cold click. | Only the *branded* + *comparison* terms (defensive), never generic category terms, pre-PMF. |

> **Vietnam is NOT excluded as a channel decision — it is a de-prioritized secondary market** (`icp-summary.md` §7). The product serves VN learners; we simply do not *target* VN channels in the first 100. VN channel optionality (Vietnamese study communities, local creators) is preserved for post-PMF i18n.

---

## 3. Each channel's optimisation lever + cost structure (the framework, filled)

The framework demands one primary KPI and one optimisation lever per channel (`digital-marketing-mix.md` step-by-step). Here it is, Ritsu-specific, with the **cost structure** that determines which channels scale:

| Channel | Optimisation lever (the ONE thing to move) | Cost structure | Scales how? |
|---|---|---|---|
| **Community (Reddit/Discord)** | *Help-to-link ratio + community trust* — give value 5×, link 1×; a downvoted self-promo post is a permanent reputation cost. | Founder/AI **time**, ~$0 cash. | Sub-linearly (founder time is the cap) → which is *why* the Share-Loop must take over as the scalable engine. |
| **Share-Loop (PLG)** | *Shares-per-activated-user (K-factor) × stranger-open-conversion* — the destination must prove the PATH. | Near-zero marginal CAC (server/bandwidth of the free tier, the Dropbox cost model). | **Super-linearly** (viral) — the only channel that does. The whole strategy bets on igniting this. |
| **Website** | *Landing→upload→<60s-aha completion rate* — default demo to dense-STEM; LCP <2.5s. | Fixed (build once). | Leverage multiplier on ALL upstream traffic — a +5pp aha-rate lift is worth more than any new channel. |
| **YouTube creator** | *Cost-per-activated from the co-signed creator's audience* — one high-fit co-sign beats ten cold placements. | Sponsorship cash OR own-Shorts time. | Linearly with spend, but trust-gated (authority caps effective reach). |
| **X #studytwt** | *Engagement→qualified-click rate on trust-first content.* | Time (organic) + cheap ad probes. | Linearly; cheap to test, modest ceiling. |
| **Email** | *Onboarding-flow open→activation lift + money-moment nudge→paid lift.* | Near-zero (owned list). | With the list (only as large as activated base) — a multiplier, not an acquirer. |
| **SEO clusters** | *Cluster ranking → organic qualified sessions* (6–12mo lag). | Content-production time. | Compounding (authority accrues) — the long-game moat. |
| **Paid probes** | *Cost-per-activated vs the cap (§6)* — kill anything failing the gate fast. | Direct cash, metered. | Only as far as the cost-per-activated stays under cap — structurally capped by the free-rival reality. |

**The strategic read:** the channels that *scale* (Share-Loop super-linear, SEO compounding, Website-leverage) are the **earned/owned** ones; the channels that *cost cash* (Paid, sponsorship) are linear-and-capped. This is the mathematical restatement of §0: **build the earned engine, probe paid, never depend on it.**

---

## 4. The situational-content-cluster map (each homepage workflow = an owned cluster)

`product.md` §8 lists 9 situational workflows on the homepage; `product.md` §12 mandates each is "a long-tail content cluster owned by `01-marketing`." This is the **content-architecture foundation** for the SEO + Social channels. Each cluster is a *benefit entry-point into the wedge* — a piece of content that names a specific JTBD, ranks on its long-tail query, and routes to the matching landing variant + the <60s aha. The clusters are **ranked by wedge-proximity** (how directly they hit the deadline-bearing masterer), and each maps to a primary channel + a search query the persona actually types (`icp-summary.md` §2 "how they search"; `persona-portrait.md` S6 attr 1).

| # | Situational workflow (homepage) | The JTBD it names | Long-tail query the persona types | Primary channel(s) | Wedge proximity | Notes |
|---|---|---|---|---|---|---|
| **1** | **★ Ritsu vs NotebookLM** *(NOT a homepage tile — the strategic gap-filler)* | "Will it lie to me, and is it more than a free quiz toy?" | "NotebookLM vs Ritsu", "best AI to study from lecture pdf reddit" | SEO + Reddit + a Justin-Sung-style review | **HIGHEST** | **The single most important content asset.** Wins the A3 ASK head-to-head; leads on the PATH + 17 activities + mastery-map + citations, honest where NotebookLM wins (`customer-journey.md` A3 lever). Without this, the free rival wins the comparison by default-inertia. |
| **2** | **Ace your exam in N days** | "I have a graded deadline and re-reading isn't working." | "how to study for [orgo/MCAT/calc] in [N] days", "exam in 3 days study plan" | SEO + Reddit (r/GetStudying) + Shorts | **HIGHEST** | The sharpest WTP-*trigger* surface (`icp-summary.md` §4). Frame as the multi-week PATH, not a one-night cram (the crammer churns; the masterer retains). |
| **3** | **Master a textbook chapter** *(most popular tile)* | "Turn this dense chapter into practice that sticks." | "how to actually remember what I study", "active recall app" | SEO + Reddit (r/Anki, r/studytips) | **HIGH** | The default upload intent; "most popular" per the live homepage. |
| **4** | **Break down a research paper** | "Decompose a dense paper into testable knowledge." | "how to read ML papers", "research paper explained" | YouTube (Two Minute Papers 92, Yannic Kilcher 92) + SEO | **HIGH** | Hits the ML/grad slice; a named S9-A creator audience. |
| **5** | **Learn from any YouTube video** | "Turn a 90-min lecture recording into practice." | "turn youtube lecture into quiz", "study from video" | YouTube + Shorts | **HIGH** | Matches the **observed** 16% YouTube-source mix — real upload behavior. |
| **6** | **Solve textbook exercises** | "I can't *do* the problem set, not just read it." | "cs231n assignment too hard", "how to solve [topic] problems" | Reddit (r/learnmachinelearning, r/cs231n) | **HIGH** | The A1 trigger verbatim — the problem-set wall (`customer-journey.md` A1). |
| **7** | **Learn a new framework fast** | "Master a new framework from docs under time pressure." | "learn [framework] from docs fast" | Reddit (r/learnpython) + X | **MEDIUM** | The engineer/career-changer slice (Tier-1 expansion-adjacent). |
| **8** | **Build a multi-source learning project** | "Stitch many sources into one mastery path." | "study multiple sources", "self-study plan tool" | SEO + X #studytwt | **MEDIUM** | The self-learner reach-layer (soft WTP — top-of-funnel, not paying-core). |
| **9** | **Remember what you read online (URL→quiz)** | "Retain dense articles I read for class." | "remember what I read", "turn article into quiz" | SEO + X | **MEDIUM** | Matches the **observed** ~9% URL-source mix. |
| **10** | **Create a course for your students** | "Build practice for my students from my material." | "AI quiz generator for teachers" | (Educator — post-PMF) | **LOW (now)** | The B2B expansion ladder; seed content but do not prioritize for the first 100. |

**Cluster discipline (the rules a content SOP inherits):**
1. **Lead the wedge clusters (1–6) first** — they hit the deadline-bearing masterer directly and carry the WTP trigger. Clusters 7–10 are reach/expansion; seed lightly.
2. **Every cluster routes to a matched landing variant + the <60s aha**, never to a generic homepage. The content's job is the qualified click; the *product* closes (`customer-journey.md` A4: the product IS the pitch).
3. **Every cluster leads on the moat, never on "we also make quizzes"** — the structured PATH + mastery-tracking + 17 activities + learning-science citations (`icp-summary.md` §8 R2). This is the constant anti-NotebookLM thread.
4. **Voice is locked** to `00-core/brand_voice.md` + `positioning.md` §10–§13 (forbidden phrases; substitution-test). A cluster that reads as engagement-bait "study hack" content *fails the brand mantra* (`positioning.md` §2) and repels the gimmick-averse persona.
5. **Cluster #1 (NotebookLM comparison) is P0** even though it is not a homepage tile — it is the asset that wins the head-to-head that the whole funnel narrows onto.

---

## 5. Channel sequencing through the 5A journey (how the channels hand off)

The framework's deepest point is that channels must be **integrated and sequenced, not siloed** — HubSpot's mix worked because "SEO for awareness, email for nurture, PPC for intent capture" fed each other (`digital-marketing-mix.md` real-life example, "So what"). Ritsu's sequence maps the priority channels onto the 5A funnel (`customer-journey.md`), so each channel hands the user to the next:

```
A1 AWARE      Community (Reddit/Discord seeding) + YouTube creator co-sign + Shorts + SEO clusters
                  │  earns the qualified click
                  ▼
A2 APPEAL     ritsu.ai landing (dense-STEM demo on the hero) + workflow tiles
                  │  "I'll try this with MY file"
                  ▼
A3 ASK        NotebookLM-comparison page + creator review + Reddit/Discord answers
                  │  wins the accuracy + PATH argument before signup
                  ▼
A4 ACT        Website upload→<60s aha (the product IS the pitch) → Email activation flow
                  │  → hard limit → Email deadline-scoped money-moment nudge → FREE→PAID
                  ▼
A5 ADVOCACY   In-product Share-Loop (share-link fired at the love-moment)
                  │  destination proves the PATH (not a paywall)
                  ▼
              ──► loops back to A1 (a stranger's qualified click) ── the engine ──┘
```

**The two channel hand-offs that the company lives or dies on** (`customer-journey.md` §6.2):
- **A3→A4: the comparison content → the <60s aha on dense math.** If the landing demo and the comparison page do not *visibly* beat free NotebookLM on the PATH, the skeptical learner defaults to the free tool. The content channel and the product channel must hand off seamlessly here.
- **A5→A1: the love-moment → the share-link → a stranger's click.** This loop has **never once fired organically** (0 organic referrals, `customer-journey.md` A5). Igniting it via the hand-seeded cohort is the highest-leverage single act in the entire channel strategy — it converts the sub-linear Community engine into the super-linear Share-Loop engine.

---

## 6. Per-channel KPIs — the cost-per-ACTIVATED discipline (the governing metric)

This is the section the GTM attribution SOP (`SOP-GTM-009`) and the metrics pillar (`channel_cac_by_channel`, `blended_ltv_proxy` — GTM-owned per `kpi-ownership.yaml`) execute against. It adapts the framework's marketing-ROI discipline (CAC / LTV / LTV:CAC / payback — `marketing-roi-analysis.md`) to **true-zero reality**, where the textbook metrics are not yet measurable.

### 6.1 Why cost-per-PAID is the wrong gate (for now), and cost-per-ACTIVATED is the right one

The framework wants LTV:CAC per channel (target >3×) and payback (<18mo). **Ritsu cannot compute either yet**: LTV requires retention + ARPU from paying users, and there are **0 real paying users** (`analytics-sync-contract.yaml`: `payments(paid)=2`, both founder test cards). Forcing a cost-per-PAID metric now would divide by zero and reward whatever channel happened to convert the founder.

**The substitute gate is cost-per-ACTIVATED** — cost per user who reaches the <60s magic moment (the activation event, the strongest leading indicator of retention, `north-star.md` §1.3: first-session activation → 4–5× retention). Activation is **measurable at true-zero** (via the proxy in §6.3), it *predicts* paid conversion, and it lets us rank channels *before* R1 is settled. The gate flips to cost-per-PAID the moment `SOP-PRODUCT-002` produces the first cohort of real paying users.

### 6.2 The per-channel KPI table (the metric definition each channel inherits)

| Channel | Primary KPI (now, true-zero) | Primary KPI (post-R1) | Diagnostic / guardrail KPIs | Target posture |
|---|---|---|---|---|
| **Community (Reddit/Discord)** | Qualified wedge landing sessions w/ UTM × landing→signup rate; **community mentions** ("anyone tried Ritsu") | Cost-per-activated (founder-time-valued) | Help-to-link ratio; downvote/removal rate (reputation guardrail) | **0 organic mentions today** → first non-zero = working |
| **Share-Loop (PLG)** | **Non-founder share-links created** (currently 0); stranger-open rate | Referral cost-per-activated (≈ server cost); K-factor | Shares-per-activated-user; founder-vs-organic share ratio (15/15 founder today) | **0 organic today** → first organic stranger-referral = flywheel ignition (the true PMF heartbeat) |
| **Website** | **Landing→upload→<60s-aha completion rate**; LCP <2.5s | Same + landing→paid | Bounce rate; workflow-tile CTR ("exam in 3 days") | The leverage multiplier — optimize first |
| **YouTube creator** | Cost-per-activated from the co-signed audience | Cost-per-activated → cost-per-paid; channel LTV:CAC | View→qualified-click rate; sponsorship cost ÷ activations | Single co-sign at a measured cost-per-activated before scaling |
| **X #studytwt** | Engagement→qualified-click; signup-source share | Cost-per-activated | Click→signup rate | Cheap probe; kill if cost-per-activated > cap |
| **Email** | Onboarding-flow open→activation lift; money-moment-nudge→paid lift | Money-moment-nudge→paid conversion | Open >25%, CTR >3% (`digital-marketing-mix.md` benchmarks); unsubscribe rate | Owned, near-zero cost — always-on |
| **SEO clusters** | Cluster ranking + organic qualified sessions (6–12mo lag) | Organic cost-per-activated → cost-per-paid | Comparison-page rank for "NotebookLM vs Ritsu" | Seed now; do not judge on first-100 paid |
| **Paid probes** | **Cost-per-activated vs the cap** | Cost-per-paid; channel LTV:CAC >3× to scale | ROAS (post-R1); CTR/CPC as health only | **Hard kill** anything failing the cost-per-activated cap |

### 6.3 The activation PROXY (the Door-2 reality — this is load-bearing)

**CRITICAL measurement constraint.** The activation event is the <60s first-quiz aha. The natural metric is `quiz_attempts` / `activity_results`. **But those Door-2 tables are exposed yet EMPTY (0 rows)** per the task's Door-2 reality (the schema is synced via `analytics-sync-contract.yaml` v1.2.0, but no quiz/activity rows have ever been logged). **Therefore no channel KPI may depend on `quiz_attempts` / `activity_results` / `flashcard_reviews` until those tables fill.**

The **activation proxy** must be built only from what IS logged (`analytics-sync-contract.yaml` synced + populated):
- `learning_sessions` (656 rows, founder-era — a *session* is the strongest available activation proxy: a user who started a learning session reached the product),
- `profiles.onboarding_completed_at` (the onboarding-complete signal),
- `sources` count per user (uploaded ≥1 source = crossed the upload threshold),
- `session_shares` (the share-loop signal — 15, founder-only).

**Proxy definition (until quiz_attempts fills):** *an "activated" user = a non-founder `user_hash` with `onboarding_completed_at` set AND ≥1 `sources` row AND ≥1 `learning_sessions` row.* The **strongest pre-paywall activation signal we can observe today is the week-1 re-upload** (a 2nd `sources` row within 7 days — the observed 4-source/10-session revisit pattern, `customer-journey.md` A4). Re-upload and session-start are the **two observable-today leading metrics** where instrumentation must begin (`customer-journey.md` §6.5).

> **Instrumentation debt (flag for `04-product` + `06-ai-ops`):** the product must start logging `quiz_attempts` / `activity_results`. Until it does, every "aha completion rate" in this doc is a *session-and-upload proxy*, not a true quiz-aha measurement — an honest gap, not a measured fact. This is the #1 channel-measurement blocker.

### 6.4 The CAC/LTV math (the target, honestly framed)

When R1 settles and paying users exist, the framework's full ROI discipline applies (`marketing-roi-analysis.md`):
- **CAC per channel** = channel spend (cash + time-valued) ÷ new paying users attributed (first-touch, instrumented at signup per `SOP-GTM-009`).
- **LTV proxy** = (ARPU × gross-margin) ÷ monthly churn, **truncated to 12 months** at early stage (`marketing-roi-analysis.md` step 2). ARPU anchors on live prices (Plus $29 / Pro $59 / Ultra $119; blended ~$30–45/mo per `north-star.md` §4). Gross margin is high (AI cost target <5% of MRR, `north-star.md` §4) → LTV is favorable *if* retention holds.
- **The gate to scale a paid channel:** LTV:CAC **>3×** AND CAC-payback **<90 days** (the tighter of the framework's <18mo and `north-star.md` §2's counter-metric guardrail). A channel below 3× is marginal; below 1× is destroying value → kill (the Dropbox lesson).
- **Attribution honesty:** first-touch at signup (`persona-portrait.md` S6 attr 15) — but the journey is 6–9 touches (`persona-portrait.md` S6 attr 7), so last-touch undervalues the top-of-funnel Community + creator channels (`marketing-roi-analysis.md` pitfall #1). The earned engines will look *better* under multi-touch than last-touch; do not cut them on last-touch data.

**The honest expectation:** the earned engines (Community + Share-Loop) will show the best LTV:CAC by far (the Dropbox >50:1 analog), and paid will struggle to clear 3× against a free rival. **This is the expected result, and it confirms the strategy: build earned, probe paid.** `SOP-GTM-009`'s "double-down after the first 20 paying" decision should, by this thesis, double down on whichever *earned* surface produced them.

---

## 7. The decision rules this foundation hands downstream (the contract)

A downstream SOP/engine can act on these without re-opening strategy:

1. **Concentrate, don't spread.** Fund the §2 priority set; do not fund the §2b exclusion list. Equal-fifths budgeting is a banned pattern (`digital-marketing-mix.md` pitfall #1).
2. **Earned-first.** The two P0 engines are Community-seeding and the Share-Loop. Paid is a capped probe, never the engine (§0, §3). This is non-negotiable while the rival is free.
3. **Ignite the Share-Loop as priority #1 within ADVOCACY:** make the share-link destination prove the PATH + hand-seed one live cohort (`SOP-CUSTOMER-006`). First organic stranger-referral = the success signal.
4. **Gate every paid probe on cost-per-ACTIVATED** (not cost-per-paid) until R1 is settled; flip the gate when paying users exist (§6.1).
5. **Never measure activation on `quiz_attempts`/`activity_results` until they fill** — use the §6.3 session-and-upload proxy. (And escalate the instrumentation debt.)
6. **Every content cluster + ad leads on the moat** (PATH + mastery-map + 17 activities + learning-science), never on "we also make quizzes" (`icp-summary.md` §8 R2). Constant anti-NotebookLM thread.
7. **Voice is locked** to `brand_voice.md` + `positioning.md` §10–§13 on every channel and cluster. A surface that reads as study-hack engagement-bait fails the brand mantra and repels the persona.
8. **Default the Website demo to dense-STEM**, optimize landing→aha first (the leverage multiplier), keep LCP <2.5s (§3, `digital-marketing-mix.md` step 6).
9. **First-touch attribution at signup, multi-touch correction for the earned channels** — do not cut top-of-funnel Community/creator on last-touch data (§6.4).
10. **All numbers herein are targets/hypotheses at true-zero.** The N=10 watch (`SOP-PRODUCT-002`) settling R1 is upstream of judging any channel on paid economics.

---

## 8. Coherence + how this evolves

**Coheres with (cite, do not contradict):**
- `positioning.md` — §5 strategic-vs-tactical split (positioning owns strategic WHO; this doc + `03-gtm/` own the tactical HOW/WHERE); §6 the preemptive learning-science-authority POD = the SEO content-engine moat; §10–§13 the locked voice every channel inherits.
- `icp-summary.md` — §6 the strategic "where" (Reddit/YouTube/X/Discord); §2 "how they search" → the content-cluster queries; R1 (unproven WTP — gates the metric) + R2 (free NotebookLM — the anti-positioning thread).
- `product.md` — §8 the 9 situational workflows = the content clusters; §7 the magic moment = the activation event the Website channel delivers.
- `north-star.md` — §1.3 activation as the top leading indicator (→ cost-per-activated gate); §2 CAC-payback <90d + refund/incident guardrails.
- `persona-portrait.md` §S9-A — the scored 628-channel map (the source for §2's priority set and §4's channel assignments) + the 5A journey it shares with `customer-journey.md`.
- `analytics-sync-contract.yaml` — the Door-2 signal boundary (what is measurable; the quiz_attempts empty-table constraint).
- `kpi-ownership.yaml` / `kpi-registry.yaml` — `channel_cac_by_channel`, `blended_ltv_proxy`, `signup_to_activation_pct`, `free_to_plus_conversion`, `nps_very_disappointed_pct` (the metrics §6 defines the channel-level discipline for).

**The strategy↔execution boundary (do not blur):** this doc is the **channel FOUNDATION** (roles, priority, clusters, metric definitions). The **dated channel SEQUENCE, the budgets, the daily ad-manager work, and the attribution mechanics** live in `03-gtm/` (`SOP-GTM-003/006/008/009`) — composed from this foundation, never contradicting it. If a GTM campaign drifts from this doc, the campaign is the bug.

**Evolves on:**
- **R1 settled (N=10 → first paying cohort)** → flip the §6 gate from cost-per-ACTIVATED to cost-per-PAID; compute real LTV:CAC per channel; let `SOP-GTM-009` double-down on the winning (likely earned) surface.
- **`quiz_attempts`/`activity_results` start logging** → replace the §6.3 session-and-upload proxy with the true quiz-aha activation metric; close the instrumentation debt.
- **First organic stranger-referral fires** → the Share-Loop graduates from "un-ignited" to a measured engine; re-rank the priority set around its real K-factor.
- **30-paying signal** → replace inferred channel behavior with observed first-touch data from real customer interviews (`SOP-CUSTOMER-006`); re-score the S9-A map on conversion data, not fit-hypothesis.
- **Med/pre-med co-beachhead validated** (`icp-summary.md` §4b) → activate the r/Mcat / r/premed / r/medicalschool cluster + the med-creator surface (Cajun Koi 95) as a parallel priority track.
- **Channel-strategy default refresh:** quarterly, paired with the ICP review cadence.

## 9. Visual brand governance — the asset layer (the missing half of "branding guidelines")

> **Why this section exists (gap closed):** the Domont Pillar-5 spec is explicit that *"brand guidelines govern all digital assets"* (process.md §Pillar-5). This doc already locks the **verbal** half rigorously (decision-rule #7 + cluster-rule #4 → `brand_voice.md` + `positioning.md` §10–§13). It was silent on the **visual** half — and for a *deliberately gimmick-averse, accuracy-first persona* (`customer-journey.md` §6.1 "a trust gauntlet, not a convenience sell"; `persona-portrait.md` S9 attr 13), visual slop reads as untrustworthy exactly the way salesy copy does. Off-brand, AI-generic-looking creative on the landing demo, a share-link preview, or a Shorts thumbnail **breaks the same trust the voice rules protect**. So every digital surface in §1–§6 inherits a single visual identity, not just a single voice.

**The canonical visual system:** `00-core/design-system.md` → `00-core/design-system/ritsu/DESIGN.md` ("Electric Cyan V2": primary `#0ABCD0`, Inter + JetBrains Mono, 8px radius, the four-blade pinwheel mark; logo/mark/favicon assets in `design-system/ritsu/assets/`). It is the **artifact** design system for everything `01-marketing` *emits* (social cards, blog visuals, share-link previews, ad creative, PDFs) — distinct from the **product-UI** system in the product repo (which owns the in-app landing/upload surface itself).

**The four high-leverage surfaces this governs (each maps to a §1–§6 channel):**

| Surface | Channel it serves (§) | Why visual brand is load-bearing here |
|---|---|---|
| **Share-link preview / OG card** | Share-Loop, the P0 engine (§1, §5 A5) | The preview is a *stranger's first-ever Ritsu impression* and the success-signal of the whole strategy. It must look like the credible multi-week PATH, not a generic AI quiz — on-brand pinwheel + Electric-Cyan path/Knowledge-Map visual, never a stock-AI thumbnail. |
| **Landing dense-STEM demo frame** | Website, P0 (§2 rank 3, §3 lever) | The hero demo carries the `#0ABCD0` + Inter/JetBrains-Mono system so the LaTeX/code artifact reads as a *serious tool a serious learner trusts*. (The build is product-repo; the brand spec it must hit is this one.) |
| **YouTube/Shorts thumbnails + X / Reddit cards** | Social, P1 (§2 ranks 4–5) | A consistent mark + palette compounds recognition across the creator co-sign and #studytwt surfaces; ad-tone-AND-visual-slop is what the policed communities punish (§1 fact 1). |
| **Paid-probe ad creative** | PPC probe, P2 (§1, §6) | Every capped probe's creative inherits the system, so a winning placement scales a *recognizable* brand, not a one-off look. |

**The decision rule this hands downstream (extends §7):**

> **11. Every digital asset inherits the visual system, not just the voice.** All creative — share-link previews, landing demo frames, social cards, thumbnails, ad units, PDFs — renders in the `ritsu` design system (`00-core/design-system/ritsu/DESIGN.md`; `--style=ritsu` for any `ritsu-works`-emitted artifact). A surface that is on-voice but off-brand-visually (stock-AI imagery, wrong palette, missing mark) **fails the brand mantra exactly as engagement-bait copy does** (`positioning.md` §2) and repels the gimmick-averse persona. Voice-lock (rule #7) and visual-lock (this rule) are the two halves of the same "branding guidelines" the Pillar-5 spec requires.

**Boundary (no scope creep):** this doc governs the **marketing-emitted** assets above. It does **not** redefine the in-product UI (product repo owns that) and does **not** restate the tokens — it *cites* `00-core/design-system.md` as the single source, mirroring how it cites `brand_voice.md` for voice. When the `ritsu` brand evolves, that file changes (PR); this section needs no edit.
