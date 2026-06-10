# Writing frameworks — the `/write --framework` library

100 ranked formulas the writer applies with `/write --framework=<id>`. A framework is a **structure/formula** (composable with `--type` / `--template` / `--author-style`), not a full skeleton. Indexed + scored in [`knowledge/write-frameworks.yaml`](../../knowledge/write-frameworks.yaml); resolved by `scripts/write/lib/frameworks.cjs`.

Ranked by fit to Ritsu + ritsu-works (AI-Native Company marketing a learning product). Rubric (Σ max 50): **C1 Ritsu-learning-core ×3** · C2 GTM-marketing ×2.5 · C3 frequency ×2 · C4 template-ability ×1.5 · C5 authority ×1.

## Use
```
/write "..." --framework=pas --type=ad --author-style=david-ogilvy
/write "..." --framework=feynman-technique --type=tutorial
/write frameworks
```

## Learning / education (Ritsu core)  (27)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `tutorial-step-by-step` | Step-by-Step Tutorial | Prereqs → numbered steps (do → see) → verify → troubleshoot → next | The default teaching structure: get the reader to a working result. | 46.5 |
| `feynman-technique` | Feynman Technique | Concept → explain to a 12-year-old → find the gaps → simplify + analogy | Teach/explain any concept so the reader truly gets it (and to expose what they don't). | 40.5 |
| `worked-example` | Worked Example | State problem → show every step + the why → fade to a you-try | Teach a procedure/skill by showing then fading the scaffolding. | 40.5 |
| `educational-video-khan` | Khan-style Explainer | Start where they are → one idea → narrate the work → check understanding | A calm, build-from-zero teaching video (Ritsu's house style). | 39.5 |
| `exam-cram-3-day` | Exam-in-3-Days Plan | Triage by weight → active recall blocks → spaced reviews → simulate the test | Ritsu's sharpest wedge: a high-stakes timed study plan. | 39 |
| `retrieval-practice-prompt` | Retrieval-Practice Prompt | One atomic question → recall-before-reveal → immediate feedback → spaced repeat | Write a quiz/flashcard prompt that forces recall (Ritsu's core mechanic). | 38 |
| `deliberate-practice-loop` | Deliberate-Practice Loop | Specific goal → full focus → immediate feedback → repeat at the edge of ability | Design practice that actually builds skill (Ericsson). | 38 |
| `dual-coding` | Dual Coding (words + visuals) | Pair each idea with a diagram/image that carries the same meaning | Make explanations stick by combining text and a picture (use /image). | 37 |
| `concept-example-question` | Concept → Example → Question loop | Concept → concrete example → a question that makes them apply it | The Ritsu micro-loop: never explain without an example + a check. | 37 |
| `spaced-repetition-card` | Spaced-Repetition Card (Matuschak rules) | One fact per card → focused + tractable + consistent + effortful → minimal cue | Author flashcards that actually build durable memory. | 36.5 |
| `blooms-taxonomy` | Bloom's Taxonomy | Remember → Understand → Apply → Analyze → Evaluate → Create | Design quizzes/activities that climb cognitive levels, not just recall. | 36 |
| `mind-map` | Mind Map | Central idea → branches → sub-branches → cross-links | Show how concepts connect (a Ritsu activity type; use /dataviz). | 35.5 |
| `gradual-release` | Gradual Release (I do / We do / You do) | I do (model) → We do (guided) → You do (independent) | Structure a lesson or how-to so the reader ends up doing it alone. | 35 |
| `analogy-teaching` | Analogy / Bridge | Unknown ← map to → a familiar known → note where the analogy breaks | Make an abstract idea felt via something the reader already knows. | 35 |
| `kwl` | KWL (Know / Want / Learned) | What I Know → what I Want to know → (after) what I Learned | Frame a study session or article around the learner's gap. | 34 |
| `mnemonic-device` | Mnemonic Device | Map the to-remember to an acronym, image, story, or memory palace | Make a list or set durable with a memory hook. | 34 |
| `5e-instructional` | 5E Instructional Model | Engage → Explore → Explain → Elaborate → Evaluate | Build an inquiry-based lesson that ends in self-check. | 33.5 |
| `misconception-correction` | Misconception → Correction | Name the common wrong belief → why it feels right → the correct model → proof | Teach by dismantling the specific error learners actually make. | 33.5 |
| `learning-by-teaching` | Learning by Teaching (Protégé Effect) | Learn it → prepare to teach it → explain it aloud → answer questions | Frame content so the reader learns by having to teach it back. | 33.5 |
| `metacognition` | Metacognition (Plan-Monitor-Evaluate) | Plan the approach → monitor understanding mid-way → evaluate + adjust | Teach learners to manage their own learning. | 33.5 |
| `chunking` | Chunking | Break content into 5-7 meaningful chunks → label each → connect | Beat cognitive overload; make material learnable. | 33.5 |
| `gagne-9-events` | Gagné's 9 Events of Instruction | Attention → objective → recall prior → present → guide → practice → feedback → assess → transfer | Full lesson scaffold for a course/module. | 32.5 |
| `interleaving` | Interleaving | Mix related topics/problem-types instead of blocking one | Design practice sets that build flexible, durable skill. | 32.5 |
| `elaborative-interrogation` | Elaborative Interrogation | For each fact, ask "why is this true?" and answer it | Deepen understanding by forcing the reader to justify each claim. | 31.5 |
| `pretest-effect` | Pretest / Prequestioning | Ask before teaching → reveal → the wrong guesses prime real learning | Open with a quiz the reader will get wrong — then teach. | 31.5 |
| `socratic-questioning` | Socratic Questioning | Ask → let them answer → probe the answer → arrive at the insight themselves | Lead the reader to discover the conclusion instead of telling them. | 31.5 |
| `cornell-notes` | Cornell Notes | Notes column + cue column + summary | A note-taking structure that builds review-able recall. | 31 |

## Copywriting / sales  (20)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `aida` | AIDA | Attention → Interest → Desire → Action | The universal persuasion arc for ads, emails, pages. | 41 |
| `pas` | PAS (Problem-Agitate-Solution) | Problem → Agitate (twist the knife) → Solution | Lead with the reader's pain; the workhorse of direct response. | 41 |
| `bab` | Before-After-Bridge | Before (pain world) → After (dream world) → Bridge (your offer) | Fast, vivid framing for ads, emails, hooks. | 40 |
| `5-awareness-levels` | 5 Stages of Awareness (Schwartz) | Unaware → Problem → Solution → Product → Most-aware | Match the message to what the reader already knows — pick the lead. | 38.5 |
| `jobs-to-be-done` | Jobs To Be Done | When [situation], I want to [job], so I can [outcome] | Write from the job the customer hires the product to do. | 38.5 |
| `pastor` | PASTOR | Problem → Amplify → Story → Transformation → Offer → Response | Long-form persuasion that sells with a story. | 38 |
| `fab` | FAB (Features-Advantages-Benefits) | Feature → Advantage → Benefit (so-what to the reader) | Turn product specs into reasons to care. | 38 |
| `quest` | QUEST | Qualify → Understand → Educate → Stimulate → Transition | Educate-then-sell — bridges teaching and selling (good for Ritsu). | 37.5 |
| `the-one-thing` | The One Message | Cut to the single idea the piece must land | Resist saying five things; say one thing well. | 37 |
| `4ps-copy` | 4 Ps (Promise-Picture-Proof-Push) | Promise → Picture → Proof → Push | Balanced persuasion: claim, vision, evidence, CTA. | 36.5 |
| `pppp` | PPPP (Picture-Promise-Prove-Push) | Picture → Promise → Prove → Push | Henry Hoke's classic ad arc. | 36.5 |
| `rule-of-one` | Rule of One | One reader · one big idea · one promise · one CTA | The discipline that makes any piece convert. | 36.5 |
| `usp` | Unique Selling Proposition (Reeves) | One specific benefit only you can claim, stated as a fact | Find + state the one reason to buy you. | 35.5 |
| `marketing-mix-4ps` | Marketing Mix (4 Ps) | Product · Price · Place · Promotion | Frame a go-to-market or campaign brief (Kotler). | 35.5 |
| `feel-felt-found` | Feel-Felt-Found | I understand how you feel → others felt the same → here's what they found | Handle an objection with empathy, not argument. | 34.5 |
| `market-sophistication` | 5 Stages of Market Sophistication (Schwartz) | Claim → bigger claim → mechanism → bigger mechanism → identification | Decide how hard to push the claim given how jaded the market is. | 34 |
| `4cs` | 4 Cs (Clear-Concise-Compelling-Credible) | Clear → Concise → Compelling → Credible (an edit checklist) | A quality gate for any persuasive copy. | 34 |
| `oath-awareness` | OATH (Oblivious-Apathetic-Thinking-Hurting) | Match message to the reader's pain stage | Pick the lead by how much the reader is already hurting. | 32.5 |
| `reason-why` | Reason-Why Copy | Make a claim → give the concrete reason it's true | Earn belief by always answering "why should I believe that?" | 32 |
| `slippery-slide` | Slippery Slide (Sugarman) | Every element's only job: get the next line read | Engineer momentum so the reader can't stop. | 32 |

## Headlines / hooks  (6)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `how-to-headline` | "How to" Headline | How to [achieve desired outcome] [without the feared obstacle] | The highest-utility headline — also teaches. | 46 |
| `4u-headline` | 4 U's Headline | Useful + Urgent + Unique + Ultra-specific | Score and sharpen any headline/subject line. | 40 |
| `number-listicle-headline` | Number/Listicle Headline | [N] [things] that [specific payoff] | A countable promise that earns the click. | 39 |
| `ogilvy-headline` | Ogilvy Headline (the specific fact) | A precise, checkable claim — the fact, not the adjective | Win belief with specificity (Rolls-Royce clock). | 37.5 |
| `curiosity-gap` | Curiosity Gap | Open a loop the reader needs closed (without clickbait lying) | Create a knowledge gap that pulls the reader in. | 35.5 |
| `fascination-bullets` | Fascination Bullets | What + the hidden benefit/curiosity, stacked | Tease content/benefits so the reader must have it. | 35 |

## Email  (6)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `newsletter-3-2-1` | Newsletter 3-2-1 (Clear) | 3 ideas (you) · 2 quotes (others) · 1 question — recurring | A scannable, shareable recurring newsletter format. | 38.5 |
| `cold-email-rva` | Cold Email (Relevance-Value-Ask) | Relevance line → one idea/value → one low-friction ask | Get a stranger to read + reply in the preview pane. | 38 |
| `3-sentence-email` | 3-Sentence Email | Why you → one idea → the ask. Done. | Respect-their-time outreach that gets replies. | 37 |
| `welcome-sequence` | Welcome / Onboarding Sequence | Welcome → quick win → core value → habit → ask | Activate a new signup (Ritsu's activation moment). | 36.5 |
| `re-engagement-email` | Re-engagement Email | Notice the silence → remind of value → one easy step back | Win back a lapsed user (Ritsu retention). | 33.5 |
| `soap-opera-sequence` | Soap-Opera Sequence (Brunson) | Drama hook → backstory → epiphany → hidden benefit → CTA, across days | Build a serialized email story that sells. | 32 |

## Landing / sales page  (6)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `hero-section` | Hero Section | Promise headline → subhead → CTA → instant proof | The above-the-fold that earns the scroll. | 40 |
| `value-prop-canvas` | Value Proposition Canvas | Jobs → pains → gains ↔ pain-relievers → gain-creators → product | Engineer messaging from what the customer actually wants. | 38.5 |
| `long-form-sales-letter` | Long-Form Sales Letter | Headline → lead → problem → mechanism → offer → proof → objections → CTA → P.S. | The full direct-response page for high-stakes offers. | 37.5 |
| `vsl` | VSL (Video Sales Letter) | Hook → problem → unique mechanism → proof → offer → urgency → CTA | Script a video that sells. | 36.5 |
| `above-the-fold` | Above-the-Fold Checklist | What is it · who for · why care · what to do — visible without scrolling | Make the first screen answer the four questions. | 35.5 |
| `pricing-anchor` | Pricing-Page Anchoring | Anchor high → contrast → "most popular" → value recap → CTA | Frame tiers so the target plan feels obvious. | 34.5 |

## Social / short-form  (11)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `hook-retain-reward` | Hook-Retain-Reward | 3-sec hook → retain (open loops) → reward (payoff) → CTA | The short-video retention spine (Reel/Short/TikTok). | 42 |
| `x-thread-formula` | X / Thread Formula | Post 1 = whole promise → one beat per post → payoff + ask | A thread where each post earns the next. | 42 |
| `tiktok-hcp` | TikTok Hook-Context-Payoff | Hook → minimal context → payoff → one CTA | Vertical short script optimized for completion. | 41 |
| `story-lesson-application` | Story-Lesson-Application | A small true story → the lesson → how the reader applies it | Teach through narrative on social (Ritsu-friendly). | 39 |
| `myth-vs-fact` | Myth vs Fact | State the myth → the fact → the evidence | Bust a common misconception (teaching + shareable; Ritsu-friendly). | 39 |
| `linkedin-hsl` | LinkedIn Hook-Story-Lesson | Hook line → short story → the lesson → soft CTA | The native LinkedIn post that gets read + shared. | 39 |
| `open-loop` | Open Loop | Pose the intrigue → delay the answer → pay it off | Hold attention by keeping a question alive. | 38.5 |
| `contrarian-take` | Contrarian Take | State the consensus → flip it → defend with one proof | Earn attention by credibly disagreeing. | 38.5 |
| `carousel` | Carousel / Slide Deck Post | Cover hook → one idea per slide → recap → CTA | A swipeable mini-lesson or argument. | 38.5 |
| `content-pillars` | Content Pillars (Hub & Spoke) | 3-5 pillar themes → many spoke posts → recurring cadence | Plan a whole channel's content around a few owned topics. | 37.5 |
| `pov-hook` | POV / Pattern-Interrupt Hook | A surprising first line that breaks the scroll pattern | Stop the thumb in the first second. | 35 |

## Blog / article / SEO  (11)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `ultimate-guide` | Ultimate Guide / Pillar Page | Promise mastery → chaptered sections → internal links → CTA | The definitive resource that owns a topic + teaches. | 44 |
| `listicle-post` | Listicle Article | Title number = promise → each item a claim + payoff → through-line close | A scannable list where every item earns its place. | 42 |
| `skyscraper` | Skyscraper | Find the best existing piece → make it more complete/current → promote | Rank by out-doing the top result. | 41 |
| `problem-solution-blog` | Problem-Solution Article | Name the problem → why it persists → the solution → how to apply | The default helpful-content shape (teaches + ranks). | 40.5 |
| `comparison-x-vs-y` | Comparison (X vs Y) | Frame the decision → criteria → head-to-head → who-should-pick-what | Capture high-intent "X vs Y" search + help a real choice. | 40 |
| `case-study-blog` | Case Study | Subject + goal → problem → approach → result (numbers) → takeaway | Proof-driven story that sells without selling. | 39.5 |
| `inverted-pyramid` | Inverted Pyramid | Most important first → supporting detail → background | Journalism's structure: the reader can stop anytime. | 39.5 |
| `definition-post` | Definition / "What is X" Post | Plain definition → why it matters → example → related | Own the "what is X" query and teach the basics. | 38.5 |
| `app-intro` | APP Intro (Agree-Promise-Preview) | Agree (with their problem) → Promise (a fix) → Preview (what's coming) | Brian Dean's sticky intro that beats the bounce. | 38 |
| `tofu-mofu-bofu` | TOFU-MOFU-BOFU | Top (awareness) → Middle (consideration) → Bottom (decision) content | Map a content piece to its funnel stage + intent. | 37.5 |
| `nut-graf` | Nut Graf | Lede (scene) → nut graf (why it matters now) → body | Earn the rest of a feature with a why-care paragraph. | 35.5 |

## Video scripts  (2)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `explainer-ps` | Explainer (Problem-Solution-How) | Problem → solution → how it works → CTA | A 60-90s explainer that also teaches. | 42.5 |
| `youtube-hivc` | YouTube Hook-Intro-Value-CTA | Hook → promise/intro → value beats → CTA | Long-form YouTube retention structure. | 38.5 |

## Storytelling / structure  (7)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `abt` | ABT (And-But-Therefore) | Setup AND context → BUT the problem → THEREFORE the resolution | One-sentence narrative engine (great for science communication). | 43.5 |
| `scqa` | SCQA / Minto (Situation-Complication-Question-Answer) | Situation → Complication → Question → Answer | Open any doc or pitch with a tight, logical setup. | 42.5 |
| `pixar-spine` | Pixar Story Spine | Once upon a time… every day… until one day… because of that… until finally… | A reliable mini-story skeleton. | 40.5 |
| `heros-journey` | Hero's Journey | Ordinary world → call → trials → transformation → return changed | Epic narrative arc for brand/origin/case stories. | 40 |
| `sparkline` | Sparkline (Duarte) | Oscillate: what is ↔ what could be → end on new bliss | Persuasive talk structure that builds tension to a vision. | 37 |
| `storybrand-sb7` | StoryBrand SB7 | Hero → problem → guide → plan → CTA → stakes → success | Make the customer the hero, your brand the guide. | 36.5 |
| `three-act` | Three-Act Structure | Setup → confrontation → resolution | Classic dramatic shape for stories/scripts. | 34.5 |

## Business / ops / memo  (4)

| id | Framework | Structure | When | Σ |
|---|---|---|---|--:|
| `pyramid-principle` | Pyramid Principle (Minto) | Answer first → grouped supporting arguments → data | Structure any argument top-down, MECE. | 40 |
| `star-case` | STAR (Situation-Task-Action-Result) | Situation → Task → Action → Result | Bios, case studies, and accomplishment write-ups. | 38.5 |
| `bluf` | BLUF (Bottom Line Up Front) | Decision/ask first → context → options → next step | Get a decision made fast; lead with the answer. | 34.5 |
| `prfaq` | Amazon PR/FAQ (6-pager) | Future press release → customer FAQ → internal FAQ | Work-backwards from the launch you want. | 33.5 |

---
_Generated from `knowledge/write-frameworks.yaml` (rank order within family)._
