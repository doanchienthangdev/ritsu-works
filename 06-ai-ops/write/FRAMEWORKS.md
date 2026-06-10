# Writing frameworks — the `/write --framework` library

100 formulas the writer applies with `/write --framework=<id>`. Each carries its **structure** (the steps), **how to apply** (the process + key discipline, so a writer who doesn’t know it can apply it reliably), a concrete **example**, and **when** to reach for it. A framework is composable with `--type` / `--template` / `--author-style`.

`--framework` default is **`auto`** — the orchestrator picks the best-fit formula OR writes **free-style** (not every piece needs one). `none`/`free` forces free-style; `<id>` applies a specific one.

Ranked by fit to Ritsu + ritsu-works (Σ max 50: C1 learning-core ×3 · C2 GTM ×2.5 · C3 frequency ×2 · C4 template-ability ×1.5 · C5 authority ×1). Indexed in [`knowledge/write-frameworks.yaml`](../../knowledge/write-frameworks.yaml); resolved by `scripts/write/lib/frameworks.cjs`.

```
/write "..."                                   # auto: writer decides framework-or-free-style
/write "..." --framework=pas --type=ad        # apply a specific formula
/write frameworks                              # list all
```

## Learning / education (Ritsu core)  (27)

### `tutorial-step-by-step` — Step-by-Step Tutorial  ·  Σ 46.5  ·  fits: tutorial, video-script
**Structure:** Prereqs → numbered steps (do → see) → verify → troubleshoot → next  
**How to apply:** List the prerequisites a reader must already have, then write numbered steps where each step pairs ONE action with the exact result they should see, so they can self-check before moving on. The #1 failure is skipping the 'see' half — a step that says 'click Upload' but never shows the confirmation leaves the reader unsure they succeeded; always include the observable outcome, a verify checkpoint at the end, and a short troubleshoot list for the 2-3 ways it commonly breaks.  
**Example:** Prereqs: a PDF on your device. 1. Drop the file into Ritsu → you'll see 'Analyzing…'. 2. Wait ~30s → a quiz appears. Verify: 5 questions on screen.  
**When:** The default teaching structure: get the reader to a working result.

### `feynman-technique` — Feynman Technique  ·  Σ 40.5  ·  fits: tutorial, essay, blog, video-script
**Structure:** Concept → explain to a 12-year-old → find the gaps → simplify + analogy  
**How to apply:** Write the explanation as if speaking to a curious 12-year-old: short sentences, plain words, no jargon unless you immediately define it. The discipline is to hunt for the spots where you reach for a technical term or hand-wave — those are the gaps where YOUR understanding is thin; rewrite each with a concrete analogy until a smart child would nod. Never let an undefined abstraction survive the second pass.  
**Example:** 'Spaced repetition' = reviewing a fact right before you'd forget it, like watering a plant only when the soil dries — not too soon, not too late.  
**When:** Teach/explain any concept so the reader truly gets it (and to expose what they don't).

### `worked-example` — Worked Example  ·  Σ 40.5  ·  fits: tutorial, blog
**Structure:** State problem → show every step + the why → fade to a you-try  
**How to apply:** Pick one representative problem and solve it completely on the page, annotating not just each step but WHY you chose it ('we factor here because the equation is quadratic'). Then strip the scaffolding progressively: a second near-identical problem with one blank for them to fill, then a full 'you try' with no help. The common mistake is showing the steps but omitting the reasoning, which teaches imitation instead of judgment.  
**Example:** Solve 2x+6=14: subtract 6 (isolate the x-term) → 2x=8; divide by 2 (undo the multiply) → x=4. Now you try: 3x+9=24.  
**When:** Teach a procedure/skill by showing then fading the scaffolding.

### `educational-video-khan` — Khan-style Explainer  ·  Σ 39.5  ·  fits: video-script
**Structure:** Start where they are → one idea → narrate the work → check understanding  
**How to apply:** Open at the viewer's current knowledge, not the textbook's starting point, and commit to teaching exactly ONE idea per video. Narrate your thinking out loud as you work a live example — including a small hesitation or correction so it feels human, not pre-baked — then close with a quick understanding-check the viewer can pause and attempt. The mistake to avoid is cramming three concepts in; if you can't name the single takeaway, split the script.  
**Example:** 'You already know how to divide. Today: what a fraction really is. Watch me cut this pizza into 4… so 3/4 means three of those slices. Pause — shade 2/4.'  
**When:** A calm, build-from-zero teaching video (Ritsu's house style).

### `exam-cram-3-day` — Exam-in-3-Days Plan  ·  Σ 39  ·  fits: tutorial, blog, email
**Structure:** Triage by weight → active recall blocks → spaced reviews → simulate the test  
**How to apply:** Start by ranking every topic by its weight on the actual exam and the learner's current weakness, then allocate the scarce hours to the high-weight/weak intersection first — never study in syllabus order under time pressure. Fill the days with active-recall blocks (closed-book self-quizzing), schedule short spaced reviews of earlier material each day, and end with a full timed mock under real conditions. The #1 error is passive rereading, which feels productive but builds almost no retrieval strength.  
**Example:** Day 1: triage — 60% of marks are Units 3 & 5, both shaky → drill those with closed-book quizzes. Day 2: re-quiz + new weak spots. Day 3: full timed mock exam.  
**When:** Ritsu's sharpest wedge: a high-stakes timed study plan.

### `retrieval-practice-prompt` — Retrieval-Practice Prompt  ·  Σ 38  ·  fits: faq, tutorial
**Structure:** One atomic question → recall-before-reveal → immediate feedback → spaced repeat  
**How to apply:** Write a single atomic question that targets exactly one fact or relationship, and design it so the reader MUST attempt an answer from memory before any reveal — hide the answer behind a flip/scroll, never adjacent. Give immediate, specific feedback on reveal (not just right/wrong but why), and tag the item to resurface after a spaced interval. The trap is making the question so broad it can't be recalled cleanly, or showing the answer where the eye catches it before recall happens.  
**Example:** Q: What does the mitochondrion produce for the cell? [flip] A: ATP — the cell's energy currency. (You recalled it? Good. This card returns in 3 days.)  
**When:** Write a quiz/flashcard prompt that forces recall (Ritsu's core mechanic).

### `deliberate-practice-loop` — Deliberate-Practice Loop  ·  Σ 38  ·  fits: tutorial, blog
**Structure:** Specific goal → full focus → immediate feedback → repeat at the edge of ability  
**How to apply:** Define a narrow, specific performance goal for the session ('nail balancing redox equations', not 'study chemistry'), then design a task that demands full focus at the edge of the learner's current ability — slightly too hard, not comfortable. Wire in immediate feedback after every attempt so errors are caught and corrected on the spot, and prescribe focused repetition on the exact weak sub-skill. The mistake is letting practice drift into easy, mindless reps; if it feels comfortable, raise the difficulty.  
**Example:** Goal: balance redox equations in under 90s. Attempt one → Ritsu flags the half-reaction you mis-balanced → redo just that step → repeat with a harder equation.  
**When:** Design practice that actually builds skill (Ericsson).

### `dual-coding` — Dual Coding (words + visuals)  ·  Σ 37  ·  fits: tutorial, presentation, blog
**Structure:** Pair each idea with a diagram/image that carries the same meaning  
**How to apply:** For each key idea, create a visual (diagram, timeline, labeled image) that encodes the SAME meaning as the words, not mere decoration — the picture should let a reader reconstruct the point without the text. Place word and image together and make them reference each other; generate the visual with /image or /dataviz. The common failure is pairing prose with a generic stock image that adds no information, which gives the cognitive benefit of neither channel.  
**Example:** Text explains the water cycle; beside it, a labeled diagram with arrows: ocean → (evaporation) → cloud → (precipitation) → river → ocean. Each label matches a sentence.  
**When:** Make explanations stick by combining text and a picture (use /image).

### `concept-example-question` — Concept → Example → Question loop  ·  Σ 37  ·  fits: tutorial, blog, faq
**Structure:** Concept → concrete example → a question that makes them apply it  
**How to apply:** State the concept in one clean sentence, immediately ground it in one concrete example the reader can picture, then pose a question that forces them to APPLY it to a slightly new case (not just restate it). Run this micro-loop for every idea — the discipline is to never explain a concept without both the example and the application check attached. Avoid questions that merely echo the definition; the question must require transfer.  
**Example:** Concept: osmosis is water moving toward higher solute. Example: a raisin swells in plain water. Question: what happens to a cucumber slice left in salty brine?  
**When:** The Ritsu micro-loop: never explain without an example + a check.

### `spaced-repetition-card` — Spaced-Repetition Card (Matuschak rules)  ·  Σ 36.5  ·  fits: faq
**Structure:** One fact per card → focused + tractable + consistent + effortful → minimal cue  
**How to apply:** Put exactly one fact on each card and stress-test it against the four rules: focused (one idea), tractable (answerable from memory most times), consistent (same cue always yields the same answer), and effortful (recall, not recognition). Strip the cue to the minimum prompt that still uniquely points to the answer. The dominant mistake is overloaded cards that bundle several facts — split them, because a card you can't answer cleanly teaches frustration, not memory.  
**Example:** Front: 'Capital of Australia?' Back: 'Canberra.' (Not Sydney — and NOT a card listing all six state capitals at once.)  
**When:** Author flashcards that actually build durable memory.

### `blooms-taxonomy` — Bloom's Taxonomy  ·  Σ 36  ·  fits: faq, tutorial, research
**Structure:** Remember → Understand → Apply → Analyze → Evaluate → Create  
**How to apply:** Treat the six levels as a ladder and deliberately write items at the higher rungs, not just Remember/Understand — use the level verbs to drive question stems (Apply='use X to solve', Analyze='compare/contrast', Evaluate='judge which is better and why', Create='design a new'). The discipline is to audit a quiz and notice if every question is recall; if so, rewrite some to climb. Don't mislabel a recognition question as 'analysis' just because it's hard — match the verb to the actual cognitive demand.  
**Example:** Remember: name the parts of a cell. Apply: predict what happens if the membrane fails. Create: design an experiment to test whether the nucleus controls protein-making.  
**When:** Design quizzes/activities that climb cognitive levels, not just recall.

### `mind-map` — Mind Map  ·  Σ 35.5  ·  fits: tutorial, research
**Structure:** Central idea → branches → sub-branches → cross-links  
**How to apply:** Place the single central idea in the middle, branch out to its major sub-topics, then add sub-branches for details — and crucially draw cross-links between branches that relate, since those connections are where real understanding lives. Keep node labels to a word or two and let structure carry meaning; render it with /dataviz. The mistake is producing a tidy outline-as-tree with no cross-links, which is just a bulleted list bent into a circle.  
**Example:** Center: 'French Revolution'. Branches: Causes, Key Figures, Phases, Outcomes. Cross-link: 'Economic crisis' (under Causes) → 'Rise of Napoleon' (under Outcomes).  
**When:** Show how concepts connect (a Ritsu activity type; use /dataviz).

### `gradual-release` — Gradual Release (I do / We do / You do)  ·  Σ 35  ·  fits: tutorial, video-script
**Structure:** I do (model) → We do (guided) → You do (independent)  
**How to apply:** Move responsibility from you to the reader in three deliberate phases: 'I do' (you model the full skill while thinking aloud), 'We do' (you and the reader work a problem together with prompts and hints), 'You do' (they perform it alone). The key discipline is not skipping the 'We do' middle — jumping from demonstration straight to independent practice is where most learners fall off. Each phase should use a fresh but parallel problem.  
**Example:** I do: watch me balance this equation. We do: let's balance this one together — what's the first step? You do: now balance these three on your own.  
**When:** Structure a lesson or how-to so the reader ends up doing it alone.

### `analogy-teaching` — Analogy / Bridge  ·  Σ 35  ·  fits: tutorial, essay, blog
**Structure:** Unknown ← map to → a familiar known → note where the analogy breaks  
**How to apply:** Find something the reader already understands deeply, map the unfamiliar concept onto it point-by-point, then — non-negotiable — state explicitly where the analogy breaks down. The discipline most writers skip is that boundary note; an analogy left un-bounded plants a misconception the reader will over-extend later. Choose a source domain truly familiar to your specific audience, not just to you.  
**Example:** An atom is like a tiny solar system: nucleus = sun, electrons = orbiting planets. Where it breaks: electrons don't follow fixed paths — they exist in fuzzy probability clouds.  
**When:** Make an abstract idea felt via something the reader already knows.

### `kwl` — KWL (Know / Want / Learned)  ·  Σ 34  ·  fits: tutorial, blog
**Structure:** What I Know → what I Want to know → (after) what I Learned  
**How to apply:** Open by eliciting what the learner already Knows (activating prior memory), then have them name what they Want to learn (which sets the goal and creates the gap), teach to that gap, and close by capturing what they Learned (consolidating and revealing remaining holes). The discipline is to let the W genuinely steer the content rather than running a fixed script; the article or session should answer the reader's stated questions. Don't treat K and W as throwaway warm-ups.  
**Example:** K: 'I know plants need sunlight.' W: 'But HOW does light become food?' [article teaches photosynthesis] L: 'Light splits water and powers sugar-making — I still wonder where the oxygen goes.'  
**When:** Frame a study session or article around the learner's gap.

### `mnemonic-device` — Mnemonic Device  ·  Σ 34  ·  fits: tutorial, faq
**Structure:** Map the to-remember to an acronym, image, story, or memory palace  
**How to apply:** Take the hard-to-remember set and bind it to an easier structure — an acronym, a vivid image, a tiny story, or a spatial memory palace — choosing the type that fits the material (acronyms for ordered lists, images for single facts, stories for sequences). Make the hook vivid, slightly absurd, or personal, because bland mnemonics don't stick. The mistake is forcing an acronym onto items with no natural order when an image or story would bind them far better.  
**Example:** Order of operations: 'PEMDAS' → 'Please Excuse My Dear Aunt Sally' (Parentheses, Exponents, Multiply, Divide, Add, Subtract).  
**When:** Make a list or set durable with a memory hook.

### `5e-instructional` — 5E Instructional Model  ·  Σ 33.5  ·  fits: tutorial, presentation
**Structure:** Engage → Explore → Explain → Elaborate → Evaluate  
**How to apply:** Run the five phases in order: Engage with a hook or puzzle that surfaces curiosity, let learners Explore the phenomenon before you define anything, only THEN Explain the formal concept, Elaborate by extending it to a new context, and Evaluate with a self-check. The signature discipline is keeping Explore before Explain — front-loading the definition kills the inquiry and turns it into a lecture. Each phase should hand off naturally to the next.  
**Example:** Engage: why does ice float? Explore: drop objects in water, observe. Explain: density vs. water. Elaborate: predict for oil. Evaluate: 'Will a steel ship float? Why?'  
**When:** Build an inquiry-based lesson that ends in self-check.

### `misconception-correction` — Misconception → Correction  ·  Σ 33.5  ·  fits: blog, tutorial, faq
**Structure:** Name the common wrong belief → why it feels right → the correct model → proof  
**How to apply:** Name the specific wrong belief learners actually hold (state it plainly, even sympathetically), explain WHY it feels right so the reader recognizes their own thinking, then present the correct model and back it with a concrete proof or counterexample. The discipline is targeting the real, documented misconception — not a strawman — because the correction only lands if the reader thought 'yes, that's what I believed.' Skipping the 'why it feels right' step makes the reader defensive instead of curious.  
**Example:** Wrong belief: 'heavier objects fall faster.' Why it feels right: a feather drifts slowly. Correct: gravity accelerates all mass equally. Proof: in a vacuum, a feather and hammer land together.  
**When:** Teach by dismantling the specific error learners actually make.

### `learning-by-teaching` — Learning by Teaching (Protégé Effect)  ·  Σ 33.5  ·  fits: tutorial, essay, social-post
**Structure:** Learn it → prepare to teach it → explain it aloud → answer questions  
**How to apply:** Frame the content so the reader's job is to TEACH it, not just absorb it: prompt them to explain the idea aloud as if to a friend, prepare a mini-lesson, or anticipate the questions a student would ask. The discipline is making the teach-back active and externalized — writing or saying the explanation, not silently thinking it — because the gaps only surface when they try to produce it. Don't let 'prepare to teach' collapse into 'reread.'  
**Example:** After learning recursion: 'Now explain recursion to a beginner in 3 sentences, then answer the question they'd ask: what stops it from looping forever?'  
**When:** Frame content so the reader learns by having to teach it back.

### `metacognition` — Metacognition (Plan-Monitor-Evaluate)  ·  Σ 33.5  ·  fits: tutorial, blog
**Structure:** Plan the approach → monitor understanding mid-way → evaluate + adjust  
**How to apply:** Build the lesson around three self-management prompts: Plan ('how will I approach this, and what's my goal?'), Monitor ('am I actually getting this, or just nodding along?' checked partway through), and Evaluate ('did it work, and what will I change?' at the end). The discipline is making these prompts explicit to the learner rather than assuming they self-regulate — most don't. The goal is to teach the thinking-about-thinking, not just the content.  
**Example:** Plan: 'I'll skim the chapter, then quiz myself.' Monitor (mid-way): 'Can I explain this without looking? No — slow down.' Evaluate: 'Quizzing worked; next time I'll start with it.'  
**When:** Teach learners to manage their own learning.

### `chunking` — Chunking  ·  Σ 33.5  ·  fits: tutorial, presentation, blog
**Structure:** Break content into 5-7 meaningful chunks → label each → connect  
**How to apply:** Break the material into 5-7 meaningful groups (working memory's limit), give each chunk a clear label that captures its gist, and show how the chunks connect into the whole. The discipline is that chunks must be MEANINGFUL units, not arbitrary slices by length — group by concept so each chunk is independently graspable. The failure mode is one undifferentiated wall of content, or splitting at random page breaks that cut a single idea in half.  
**Example:** A 30-step setup guide → 5 labeled phases: 'Install', 'Configure', 'Connect data', 'Test', 'Deploy' — each with its steps, plus an arrow showing they run in sequence.  
**When:** Beat cognitive overload; make material learnable.

### `gagne-9-events` — Gagné's 9 Events of Instruction  ·  Σ 32.5  ·  fits: tutorial, presentation
**Structure:** Attention → objective → recall prior → present → guide → practice → feedback → assess → transfer  
**How to apply:** Walk the full nine in order as a lesson scaffold: grab Attention, state the Objective, recall Prior knowledge, Present the content, Guide with examples, have them Practice, give Feedback, Assess, then promote Transfer to new situations. The discipline is not dropping the back-half events (feedback, assessment, transfer) that learning actually requires — many drafts present content and stop. Treat it as a checklist for a complete module, not a rigid script for every paragraph.  
**Example:** Hook with a real bug → objective: 'debug a null error' → recall variables → present the fix → guided example → you-try → feedback → quiz → 'apply it to your own project.'  
**When:** Full lesson scaffold for a course/module.

### `interleaving` — Interleaving  ·  Σ 32.5  ·  fits: tutorial, faq
**Structure:** Mix related topics/problem-types instead of blocking one  
**How to apply:** Deliberately mix related but distinct problem types within a practice set instead of blocking all of one type together — alternate so the learner must first decide WHICH method applies, then apply it. The discipline is resisting the cleaner-feeling blocked layout; interleaving feels harder and slower in the moment but builds the discrimination skill that real tests demand. Only mix topics that are confusable enough that telling them apart is the point.  
**Example:** Instead of 10 area problems then 10 volume problems, alternate: area, volume, area, volume — forcing the student to pick the right formula each time, like the real exam will.  
**When:** Design practice sets that build flexible, durable skill.

### `elaborative-interrogation` — Elaborative Interrogation  ·  Σ 31.5  ·  fits: tutorial, research
**Structure:** For each fact, ask "why is this true?" and answer it  
**How to apply:** For each fact you present, pose 'why is this true?' and supply a real causal answer that connects it to what the reader already knows — turning isolated facts into a reasoned web. The discipline is answering the 'why' with genuine mechanism, not a circular restatement; 'because that's the rule' teaches nothing. Use it most where facts seem arbitrary, since that's where the why-link does the most memory work.  
**Example:** Fact: arteries have thick walls. Why? Because they carry blood at high pressure straight from the heart, so they need strength to not burst — veins, lower-pressure, don't.  
**When:** Deepen understanding by forcing the reader to justify each claim.

### `pretest-effect` — Pretest / Prequestioning  ·  Σ 31.5  ·  fits: tutorial, faq, blog
**Structure:** Ask before teaching → reveal → the wrong guesses prime real learning  
**How to apply:** Open with a question on material the reader hasn't studied yet and let them guess — even wrong — before you reveal and teach. The mechanism is that the act of guessing primes the brain to encode the correct answer more strongly when it arrives, so the wrong attempts are a feature, not a bug. The discipline is reassuring the reader that getting it wrong is the point; don't apologize for the pretest or make it feel like a graded gotcha.  
**Example:** Before teaching: 'Guess — what % of the air you breathe is oxygen?' (Most say ~50%.) Now learn: it's about 21%, and your wrong guess just made that number stick.  
**When:** Open with a quiz the reader will get wrong — then teach.

### `socratic-questioning` — Socratic Questioning  ·  Σ 31.5  ·  fits: essay, tutorial, social-post
**Structure:** Ask → let them answer → probe the answer → arrive at the insight themselves  
**How to apply:** Lead with a question, give the reader space to form an answer, then probe THAT answer with a follow-up that exposes a tension or pushes one step deeper — chaining questions until the reader reaches the insight themselves rather than being told. The discipline is restraint: resist supplying the conclusion, and make each question build on the prior answer so it feels like guided discovery, not interrogation. Bad Socratic writing asks rhetorical questions then immediately answers them.  
**Example:** 'Why does a heavier backpack feel harder uphill?' → 'You said gravity — so what's gravity actually pulling against as you climb?' → 'Then what IS work, in physics?'  
**When:** Lead the reader to discover the conclusion instead of telling them.

### `cornell-notes` — Cornell Notes  ·  Σ 31  ·  fits: tutorial
**Structure:** Notes column + cue column + summary  
**How to apply:** Lay the page in three zones: a wide right column for notes taken live, a narrow left 'cue' column where you later write questions or keywords that prompt each note, and a bottom strip for a 2-3 sentence summary in your own words. The discipline — and the whole point — is that the cue and summary are written AFTER, as active review, then used to self-quiz by covering the notes column. Notes alone, without the cues and summary, lose the method's recall power.  
**Example:** Notes: 'Photosynthesis: light + CO₂ + water → glucose + O₂, in chloroplast.' Cue: 'What are the inputs/outputs?' Summary: 'Plants turn light into food, releasing oxygen.'  
**When:** A note-taking structure that builds review-able recall.

## Copywriting / sales  (20)

### `aida` — AIDA  ·  Σ 41  ·  fits: ad, landing-page, email, social-post
**Structure:** Attention → Interest → Desire → Action  
**How to apply:** Write four distinct beats in order: a hook that earns the first glance (a question, stat, or pattern-break), a hook of relevance that connects the topic to the reader's situation, a vivid picture of the win that makes them WANT it, then one unmistakable next step. The #1 mistake is collapsing Interest and Desire into a feature list — Interest is 'this is about you,' Desire is 'imagine having this,' and they must feel different.  
**Example:** Failing the exam Friday? Your 80-page textbook is unstudiable as-is. Upload it; get a quiz that drills exactly what you'll be tested on. Start free.  
**When:** The universal persuasion arc for ads, emails, pages.

### `pas` — PAS (Problem-Agitate-Solution)  ·  Σ 41  ·  fits: ad, email, landing-page, social-post
**Structure:** Problem → Agitate (twist the knife) → Solution  
**How to apply:** Name the specific pain in the reader's own words, then Agitate by making the cost vivid and near-term (what it leads to, how it feels, what it's already costing) before offering the Solution as relief. The key discipline: Agitate must twist a pain the reader already feels — never manufacture fake urgency — and stay on the consequence, not yet the product.  
**Example:** You reread the chapter three times and still blank on the test. Cramming harder won't fix passive reading. Ritsu turns any document into active recall practice.  
**When:** Lead with the reader's pain; the workhorse of direct response.

### `bab` — Before-After-Bridge  ·  Σ 40  ·  fits: ad, email, social-post, landing-page
**Structure:** Before (pain world) → After (dream world) → Bridge (your offer)  
**How to apply:** Paint the Before as the reader's frustrating present in concrete sensory detail, jump to the After as the same person in their solved future (same life, problem gone), then make the Bridge the shortest possible path from one to the other — your offer. The common failure is a weak contrast: Before and After must describe the same person's day so the gap feels real and personal, not generic.  
**Example:** Before: highlighting pages, hoping it sticks. After: walking into the exam already quizzed on every concept. Bridge: drop your PDF into Ritsu, study active in 30 seconds.  
**When:** Fast, vivid framing for ads, emails, hooks.

### `5-awareness-levels` — 5 Stages of Awareness (Schwartz)  ·  Σ 38.5  ·  fits: ad, landing-page, email
**Structure:** Unaware → Problem → Solution → Product → Most-aware  
**How to apply:** First diagnose where your reader sits — do they not know they have a problem (Unaware), feel the pain but not solutions (Problem), know solutions exist (Solution), know your product (Product), or just need a nudge (Most-aware)? Then start the copy at that stage: lead with the problem for Problem-aware, lead with the offer/price for Most-aware. The cardinal error is pitching product features to an Unaware or Problem-aware reader — you must first lead with their pain or world, never your name.  
**Example:** For a Problem-aware student: lead 'Rereading doesn't build memory — testing does,' not 'Ritsu has 17 activity types.' Save the product name for after they nod.  
**When:** Match the message to what the reader already knows — pick the lead.

### `jobs-to-be-done` — Jobs To Be Done  ·  Σ 38.5  ·  fits: landing-page, ad, memo, product-description
**Structure:** When [situation], I want to [job], so I can [outcome]  
**How to apply:** Fill in the template literally from the customer's situation, not your product's features: the triggering moment, the progress they're trying to make, and the real-life outcome they want. Then write copy that speaks to that job. The discipline is to name the FUNCTIONAL and emotional job (e.g. 'feel ready,' not 'use flashcards') — people hire outcomes, so describe the outcome, and let the product be the means.  
**Example:** When I have a dense research paper due, I want to actually understand it fast, so I can write my response without bluffing. Ritsu breaks it into testable pieces.  
**When:** Write from the job the customer hires the product to do.

### `pastor` — PASTOR  ·  Σ 38  ·  fits: landing-page, email, video-script
**Structure:** Problem → Amplify → Story → Transformation → Offer → Response  
**How to apply:** Run all six beats in sequence: state the Problem, Amplify its stakes, tell a relatable Story (often someone who struggled then won), show the Transformation that's now possible, make the Offer explicit, then ask for a Response. The make-or-break move is the Story-into-Transformation hinge — use one specific, believable character (a student, a name, a moment), not a montage, so the reader sees themselves crossing over.  
**Example:** Mai failed her first stats midterm. She uploaded every lecture to Ritsu, drilled the auto-quizzes nightly, and scored an A on the final. You can start the same way today — free.  
**When:** Long-form persuasion that sells with a story.

### `fab` — FAB (Features-Advantages-Benefits)  ·  Σ 38  ·  fits: product-description, ad, landing-page
**Structure:** Feature → Advantage → Benefit (so-what to the reader)  
**How to apply:** For each feature, write the chain explicitly: the Feature (what it is), the Advantage (what it does), the Benefit (what that means for the reader's life). Then in the final copy, lead with the Benefit and use the Feature as proof. The classic mistake is stopping at Advantage ('auto-generates quizzes') — always push to the human so-what ('so you walk in genuinely prepared, not just hopeful').  
**Example:** Feature: auto-generates quizzes from your file. Advantage: no manual flashcard-making. Benefit: you spend your study time actually being tested, the only thing that makes it stick.  
**When:** Turn product specs into reasons to care.

### `quest` — QUEST  ·  Σ 37.5  ·  fits: landing-page, email, blog
**Structure:** Qualify → Understand → Educate → Stimulate → Transition  
**How to apply:** Move through five stages: Qualify (signal who this is for so the right reader leans in), Understand (mirror their struggle so they feel seen), Educate (teach the insight that reframes the problem), Stimulate (make them want the better way), then Transition to the offer. The discipline that makes this work for a learning brand: the Educate step must genuinely teach something useful even if they never buy — earn trust before you ask.  
**Example:** For students drowning in reading: you don't have a memory problem, you have a method problem — passive review fades, active recall lasts. Here's how Ritsu makes recall automatic.  
**When:** Educate-then-sell — bridges teaching and selling (good for Ritsu).

### `the-one-thing` — The One Message  ·  Σ 37  ·  fits: ad, social-post, email
**Structure:** Cut to the single idea the piece must land  
**How to apply:** Before drafting, write the single sentence the reader must believe or remember after reading — then ruthlessly cut anything that doesn't serve it, including good ideas that belong in a different piece. The hardest discipline is subtraction: if you're tempted to add a second benefit or a 'but also,' move it to another email or page; one piece, one idea.  
**Example:** One message for this ad: 'Ritsu turns your own materials into a quiz in 30 seconds.' Not also: pricing, personalities, 10 languages. Just that one promise.  
**When:** Resist saying five things; say one thing well.

### `4ps-copy` — 4 Ps (Promise-Picture-Proof-Push)  ·  Σ 36.5  ·  fits: ad, landing-page, email
**Structure:** Promise → Picture → Proof → Push  
**How to apply:** Make a bold, specific Promise; Picture the reader living the result; Prove it with evidence (numbers, testimonials, a mechanism, a demo); then Push with a clear CTA. The balance is the point — a strong Promise+Picture with no Proof reads as hype, and Proof with no Picture is dry; include all four and make Proof concrete enough to answer 'says who?'  
**Example:** Promise: be exam-ready in 3 days. Picture: confident, every concept already drilled. Proof: 600 free credits, no card; built on active-recall science. Push: upload your first file now.  
**When:** Balanced persuasion: claim, vision, evidence, CTA.

### `pppp` — PPPP (Picture-Promise-Prove-Push)  ·  Σ 36.5  ·  fits: ad, landing-page
**Structure:** Picture → Promise → Prove → Push  
**How to apply:** Open by Picturing a vivid scene the reader wants (lead with imagery, not a claim), then make the Promise that scene can be theirs, Prove it can happen, and Push them to act. This differs from the 4 Ps by starting with the picture — so the opening line must be sensory and in-scene, dropping the reader into the dream before you ever make a claim.  
**Example:** Picture: you close the laptop the night before the exam, calm, every topic quizzed. Promise: Ritsu gets you there. Prove: auto-built from your notes. Push: try it free.  
**When:** Henry Hoke's classic ad arc.

### `rule-of-one` — Rule of One  ·  Σ 36.5  ·  fits: ad, email, landing-page, social-post
**Structure:** One reader · one big idea · one promise · one CTA  
**How to apply:** Before writing, lock four decisions: the one reader (picture a single named person), the one big idea, the one promise, the one CTA — and write the whole piece to that one person as if it were a letter. The discipline is enforcement throughout the draft: every time you add a second audience, idea, or ask, the piece weakens, so cut back to one each time.  
**Example:** One reader: a sophomore with a chem final in 3 days. One idea: active recall beats rereading. One promise: quizzed-ready fast. One CTA: 'Upload your chem notes.'  
**When:** The discipline that makes any piece convert.

### `usp` — Unique Selling Proposition (Reeves)  ·  Σ 35.5  ·  fits: ad, landing-page, product-description
**Structure:** One specific benefit only you can claim, stated as a fact  
**How to apply:** Find the one benefit that is both true for you and not credibly claimable by competitors, then state it as a concrete fact, not an adjective. The work is in the specificity: 'best study app' is not a USP; a sharp, ownable, provable claim is — and it must pass the test that a rival literally cannot say the same thing without lying.  
**Example:** 'The only study tool that builds your quiz from YOUR exact document — not a generic question bank.' Specific, ownable, and a competitor can't honestly copy it.  
**When:** Find + state the one reason to buy you.

### `marketing-mix-4ps` — Marketing Mix (4 Ps)  ·  Σ 35.5  ·  fits: memo, report, proposal
**Structure:** Product · Price · Place · Promotion  
**How to apply:** Structure the brief around four decisions: Product (what value, for whom), Price (tier and rationale), Place (the channels and surfaces it reaches the buyer), Promotion (the message and tactics). Use it as a coverage checklist so no lever is left undefined — the frequent gap is writing rich Product+Promotion while leaving Price and Place vague, which sinks the plan at execution.  
**Example:** Product: exam-prep tutor from any file. Price: free tier + $29 Plus. Place: Reddit, YouTube Shorts, study creators. Promotion: 'exam in 3 days' demo clips.  
**When:** Frame a go-to-market or campaign brief (Kotler).

### `feel-felt-found` — Feel-Felt-Found  ·  Σ 34.5  ·  fits: email, landing-page, faq
**Structure:** I understand how you feel → others felt the same → here's what they found  
**How to apply:** Acknowledge the reader's exact concern ('I understand how you feel'), normalize it with others who shared it ('many students felt the same'), then resolve with the concrete discovery that changed their mind. The discipline is to lead with genuine empathy before any counter-argument — validate first, never rebut first, or the reader feels dismissed and stops listening.  
**Example:** Worried an AI will just give you the answers? I get it — many learners felt that. What they found: Ritsu makes YOU do the recall, which is exactly why it works.  
**When:** Handle an objection with empathy, not argument.

### `market-sophistication` — 5 Stages of Market Sophistication (Schwartz)  ·  Σ 34  ·  fits: ad, landing-page
**Structure:** Claim → bigger claim → mechanism → bigger mechanism → identification  
**How to apply:** Gauge how many similar claims your market has already heard, then pitch one level beyond the noise: a fresh market hears a plain claim, a tired one needs a bigger claim or a unique mechanism (the 'how'), and the most jaded needs identity-level resonance. The error is making a simple benefit claim into a market that's heard it a thousand times — when claims are exhausted, sell the mechanism, then sell identity.  
**Example:** Market sick of 'study smarter' claims? Don't repeat it — lead with the mechanism: 'active-recall quizzes auto-built from your own document, grounded in cited evidence.'  
**When:** Decide how hard to push the claim given how jaded the market is.

### `4cs` — 4 Cs (Clear-Concise-Compelling-Credible)  ·  Σ 34  ·  fits: ad, email, landing-page
**Structure:** Clear → Concise → Compelling → Credible (an edit checklist)  
**How to apply:** Run a finished draft through four passes: Clear (could a tired reader understand it in one read?), Concise (cut every word that doesn't earn its place), Compelling (does it make them want the outcome?), Credible (is every claim backed?). Use it strictly as an edit gate after drafting, not a writing formula — and treat 'fails any one of the four' as 'revise,' since one weak C undermines the rest.  
**Example:** Draft 'Leverage our AI-powered learning ecosystem' fails Clear and Concise. Edit to 'Upload a file, get a quiz' — clear, concise, compelling, and provable.  
**When:** A quality gate for any persuasive copy.

### `oath-awareness` — OATH (Oblivious-Apathetic-Thinking-Hurting)  ·  Σ 32.5  ·  fits: ad, email, landing-page
**Structure:** Match message to the reader's pain stage  
**How to apply:** Place your reader on the pain ladder — Oblivious (doesn't know they have it), Apathetic (knows, doesn't care), Thinking (actively considering fixes), or Hurting (desperate now) — then set message intensity to match. The discipline: Hurting readers want the solution fast and direct, while Oblivious readers need education first; pitching hard to the Oblivious or soft to the Hurting both miss.  
**Example:** To a Hurting student ('exam tomorrow, nothing memorized'): skip the education, go direct — 'Upload it now, drill the auto-quiz tonight, walk in ready.'  
**When:** Pick the lead by how much the reader is already hurting.

### `reason-why` — Reason-Why Copy  ·  Σ 32  ·  fits: ad, landing-page, email
**Structure:** Make a claim → give the concrete reason it's true  
**How to apply:** After every claim, immediately answer the reader's silent 'why should I believe that?' with a concrete, specific reason — a mechanism, a number, a credential, or a cause. The discipline is to never leave a bald assertion standing: if you can't supply the reason, either soften the claim or find the proof, because an unbacked claim reads as marketing and gets discounted.  
**Example:** 'Ritsu helps you remember more — because it forces active recall and self-testing, the two methods cognitive science shows actually move material into long-term memory.'  
**When:** Earn belief by always answering "why should I believe that?"

### `slippery-slide` — Slippery Slide (Sugarman)  ·  Σ 32  ·  fits: landing-page, email, ad
**Structure:** Every element's only job: get the next line read  
**How to apply:** Engineer the copy so each element's only job is to get the next one read: a short, intriguing opening line, easy sentences, curiosity gaps, and 'but there's more' transitions that pull the eye down. The discipline is to read your draft only for friction — any sentence that lets the reader pause and leave must be cut or rewritten, because momentum, not logic, keeps them going.  
**Example:** 'It takes 30 seconds. Less, actually. You drop in your file — and that's where it gets interesting. Because what Ritsu builds next isn't a summary…' (reader can't stop).  
**When:** Engineer momentum so the reader can't stop.

## Headlines / hooks  (6)

### `how-to-headline` — "How to" Headline  ·  Σ 46  ·  fits: blog, ad, video-script
**Structure:** How to [achieve desired outcome] [without the feared obstacle]  
**How to apply:** State the exact outcome the reader wants, then name the SPECIFIC obstacle they're sure will block them and negate it with 'without' or 'even if'. The #1 mistake is a vague obstacle ('without the hassle') — pin down the real fear your reader voices ('without re-reading the whole textbook', 'even if you procrastinated all semester'). The 'without' clause is what makes it credible, so spend most of your effort there.  
**Example:** How to pass your anatomy final without re-reading 400 pages — even if your exam is in 3 days.  
**When:** The highest-utility headline — also teaches.

### `4u-headline` — 4 U's Headline  ·  Σ 40  ·  fits: ad, blog, email, social-post
**Structure:** Useful + Urgent + Unique + Ultra-specific  
**How to apply:** Treat this as a scoring rubric, not a template: rate your draft headline 1-4 on each U (Useful, Urgent, Unique, Ultra-specific), find the weakest, and rewrite to lift it. Most headlines fail on Ultra-specific and Urgent — swap abstractions for numbers/timeframes and add a real reason to act now. Don't force all four to maximum; a forced 'unique' often reads as gimmicky — aim to clear a 3 on each.  
**Example:** Turn tonight's lecture PDF into a 20-question quiz before you sleep — in 30 seconds, no signup.  
**When:** Score and sharpen any headline/subject line.

### `number-listicle-headline` — Number/Listicle Headline  ·  Σ 39  ·  fits: blog, social-post, ad
**Structure:** [N] [things] that [specific payoff]  
**How to apply:** Pick a specific count (odd numbers and oddly-precise figures like 7 or 13 outperform round ones), name the concrete 'things', and put the PAYOFF in the headline so the number isn't a bare promise. The common failure is stopping at '[N] tips' — always answer 'so they can do what?'. Make sure the article actually delivers exactly that many items, or you break trust.  
**Example:** 7 study activities that turn a boring PDF into something you'll actually remember on exam day.  
**When:** A countable promise that earns the click.

### `ogilvy-headline` — Ogilvy Headline (the specific fact)  ·  Σ 37.5  ·  fits: ad, blog
**Structure:** A precise, checkable claim — the fact, not the adjective  
**How to apply:** Replace every adjective and superlative with one precise, checkable fact — a number, a timeframe, a measurable detail — because a specific fact is believed where 'amazing' is dismissed. The discipline: hunt for the single most concrete true detail you can cite, the way 'the clock is the loudest sound' beats 'whisper-quiet'. If you can't verify the number, don't use it; a false specific destroys more trust than a vague claim.  
**Example:** Students who quiz themselves 3 times recall 80% more a week later than students who only re-read.  
**When:** Win belief with specificity (Rolls-Royce clock).

### `curiosity-gap` — Curiosity Gap  ·  Σ 35.5  ·  fits: social-post, blog, ad, email
**Structure:** Open a loop the reader needs closed (without clickbait lying)  
**How to apply:** Reveal enough to make the reader feel a gap in what they know, then withhold the resolution so they must click — but the gap must be honest and the payoff must actually land inside. The cardinal sin is clickbait that lies or never pays off ('You won't believe...'); instead, tease a real, surprising, specific insight. Test it: if the reader would feel cheated after reading, rewrite it.  
**Example:** The reason you forget 90% of what you study by Friday — and the one 5-minute habit that fixes it.  
**When:** Create a knowledge gap that pulls the reader in.

### `fascination-bullets` — Fascination Bullets  ·  Σ 35  ·  fits: landing-page, email, ad
**Structure:** What + the hidden benefit/curiosity, stacked  
**How to apply:** Write each bullet as 'what you'll get' fused with a hidden benefit or open loop, then stack several so the cumulative tease makes the offer irresistible. The key move is to name the payoff while concealing the 'how' (the mechanism is what they click/buy to learn) — lead with verbs or 'The...' and add specificity (a number, a surprising twist). Avoid flat feature bullets; every line should make the reader think 'wait, how?'.  
**Example:** • The upload trick that turns a 2-hour video into a quiz in under a minute — page numbers and all.  
**When:** Tease content/benefits so the reader must have it.

## Email  (6)

### `newsletter-3-2-1` — Newsletter 3-2-1 (Clear)  ·  Σ 38.5  ·  fits: newsletter, email
**Structure:** 3 ideas (you) · 2 quotes (others) · 1 question — recurring  
**How to apply:** Pick exactly 3 of YOUR own ideas (short, punchy, one sentence each), 2 quotes from OTHER people that earn their place by saying something you can't, and 1 question that makes the reader pause and reply. The discipline is brutal selection plus self/other separation — the #1 mistake is padding it into a long digest; if an item isn't sharp enough to stand alone, cut it rather than soften the format.  
**Example:** 3 ways to beat the forgetting curve · 2 quotes on active recall (a cognitive scientist, a med student) · 1 ask: what's the one chapter you keep re-reading but never quite get?  
**When:** A scannable, shareable recurring newsletter format.

### `cold-email-rva` — Cold Email (Relevance-Value-Ask)  ·  Σ 38  ·  fits: email
**Structure:** Relevance line → one idea/value → one low-friction ask  
**How to apply:** Open with a specific, true Relevance line that proves you know THIS person (their post, role, or trigger event) — never a generic 'Hi, hope you're well.' Deliver exactly one concrete Value/idea, then make ONE ask so small it's answerable in five seconds ('worth a look?' not 'can we book 30 minutes?'). The #1 mistake is stacking multiple asks or burying the value behind a paragraph of company throat-clearing; everything must survive being read in the preview pane.  
**Example:** Saw you teach 200-person bio lectures. We turn a lecture PDF into a ready quiz in 30 seconds — students self-test before class. Want a sample from your syllabus?  
**When:** Get a stranger to read + reply in the preview pane.

### `3-sentence-email` — 3-Sentence Email  ·  Σ 37  ·  fits: email
**Structure:** Why you → one idea → the ask. Done.  
**How to apply:** Write literally three sentences: sentence 1 establishes who you are and why you're emailing them specifically, sentence 2 states the single idea or context, sentence 3 is the ask. The discipline is ruthless deletion — and the key is making the ask a real yes/no question, not an open-ended 'let me know your thoughts.' The #1 mistake is cheating with semicolons and sub-clauses to smuggle in a fourth point; if it needs more, it's not a 3-sentence email.  
**Example:** I run onboarding at a study-tool startup and you mentioned struggling with exam prep. We turn your notes into practice quizzes free. Can I set one up from your next chapter?  
**When:** Respect-their-time outreach that gets replies.

### `welcome-sequence` — Welcome / Onboarding Sequence  ·  Σ 36.5  ·  fits: email
**Structure:** Welcome → quick win → core value → habit → ask  
**How to apply:** Map one email to each stage: Welcome (warm, set the one expectation), quick win (get them to ONE successful action fast), core value (show the deeper payoff), habit (tie it to a recurring trigger), ask (upgrade/refer once trust exists). Sequence the quick win before any pitch — the #1 mistake is front-loading features or the upsell before the user has felt a single moment of success, which kills activation.  
**Example:** Email 2 (quick win): 'Upload one page and watch it become a quiz in 30 seconds — try it now.' Then later: habit email tying daily review to their morning coffee.  
**When:** Activate a new signup (Ritsu's activation moment).

### `re-engagement-email` — Re-engagement Email  ·  Σ 33.5  ·  fits: email
**Structure:** Notice the silence → remind of value → one easy step back  
**How to apply:** Name the silence honestly and without guilt-tripping ('It's been a while'), re-anchor on the specific value they once got (reference their actual past usage if you can), then offer ONE frictionless step back in — not a full re-onboarding. The #1 mistake is leading with what's new on your side; the lapsed user cares about their own unfinished goal, so make the path back a single click toward that.  
**Example:** You built 12 quizzes last month, then went quiet. Your biology deck is still here, ready. Pick up one 5-minute review where you left off?  
**When:** Win back a lapsed user (Ritsu retention).

### `soap-opera-sequence` — Soap-Opera Sequence (Brunson)  ·  Σ 32  ·  fits: email
**Structure:** Drama hook → backstory → epiphany → hidden benefit → CTA, across days  
**How to apply:** Spread one story across several daily emails: day 1 opens mid-drama with an unresolved hook, then walk backstory → the epiphany that changed things → a hidden benefit they didn't expect → the CTA. The engine is open loops — each email must end on a cliffhanger that makes opening the next one irresistible. The #1 mistake is resolving the tension too early or making it a fake story; the drama must be real and the payoff must connect honestly to what you're selling.  
**Example:** Day 1: 'I almost failed out of my master's — until 2am the night before finals, when I tried one thing...' (cliffhanger). Day 3 reveals active recall; day 5 CTA: start your first deck.  
**When:** Build a serialized email story that sells.

## Landing / sales page  (6)

### `hero-section` — Hero Section  ·  Σ 40  ·  fits: landing-page
**Structure:** Promise headline → subhead → CTA → instant proof  
**How to apply:** Lead with the single transformation the visitor wants, stated as a concrete outcome (not your feature or category). Write the headline first as a specific promise, let the subhead name WHO it's for plus the mechanism that makes the promise believable, make the CTA a verb-first next step, and place proof (a number, logo, or rating) within eyeball range of the button. The #1 mistake is a vague or clever headline that describes the product instead of the result — if a stranger can't tell what they GET in 5 seconds, rewrite it.  
**Example:** Headline: "Turn any PDF into an exam-ready tutor in 30 seconds." Subhead names students + the AI quiz engine. CTA: "Upload your first file free." Proof: "Trusted by 40,000 learners."  
**When:** The above-the-fold that earns the scroll.

### `value-prop-canvas` — Value Proposition Canvas  ·  Σ 38.5  ·  fits: landing-page, memo, ad
**Structure:** Jobs → pains → gains ↔ pain-relievers → gain-creators → product  
**How to apply:** Work right-to-left from the customer, not from your product. First list the customer's functional jobs and the pains/gains around them; only THEN map each product feature to a specific pain it relieves or gain it creates, discarding any feature that matches nothing. The discipline is one-to-one mapping — every claim on the page must trace back to a real pain or gain you wrote down first, or it's noise. Most people skip the jobs/pains step and just list features, producing messaging that sounds good but answers nothing the customer asked.  
**Example:** Job: pass tomorrow's exam. Pain: rereading notes doesn't stick. Gain-creator: auto-generated quizzes that test recall → headline "Stop rereading. Start remembering."  
**When:** Engineer messaging from what the customer actually wants.

### `long-form-sales-letter` — Long-Form Sales Letter  ·  Σ 37.5  ·  fits: landing-page, email
**Structure:** Headline → lead → problem → mechanism → offer → proof → objections → CTA → P.S.  
**How to apply:** Move the reader down one logical step at a time: a headline that stops them, a lead that dramatizes the problem they feel, a unique mechanism that explains WHY your solution works differently, then the offer, then stack proof and dismantle objections one by one before the CTA. Each section must earn the next — write the objections section by literally listing every reason someone wouldn't buy and answering each. The classic failure is jumping to the offer before the reader believes the problem is urgent and your mechanism is real; sell the problem and the mechanism first, and never waste the P.S. (most-read line — restate the core promise or risk-reversal there).  
**Example:** Lead: "You studied 6 hours and still blanked." Mechanism: active-recall AI. Offer: free trial. Objection: "too busy" → "works in 10-min sessions." P.S. restates the guarantee.  
**When:** The full direct-response page for high-stakes offers.

### `vsl` — VSL (Video Sales Letter)  ·  Σ 36.5  ·  fits: video-script, landing-page
**Structure:** Hook → problem → unique mechanism → proof → offer → urgency → CTA  
**How to apply:** Open with a pattern-interrupt hook in the first 5-10 seconds that names the viewer's exact problem or a surprising claim, agitate that problem, then reveal your unique mechanism as the 'why this is different' before showing proof, the offer, and a reason to act now. Write it to be HEARD, not read — short spoken sentences, one idea per line, constant forward momentum so there's never a reason to click away. The biggest error is a slow or self-introducing open ('Hi, I'm…'); the viewer leaves before the value, so front-load the hook and earn every next second.  
**Example:** Hook: "If you forget what you read within a day, it's not you — it's how you study." Then problem, the recall engine, student results, free-trial offer, "before exam season fills up."  
**When:** Script a video that sells.

### `above-the-fold` — Above-the-Fold Checklist  ·  Σ 35.5  ·  fits: landing-page
**Structure:** What is it · who for · why care · what to do — visible without scrolling  
**How to apply:** Treat the first screen as a four-question test and answer all four where no scrolling is needed: what is it, who is it for, why should I care, and what do I do next. Audit a draft by covering everything below the fold and asking a stranger those four questions — any unanswered one is a leak. The most common miss is 'why care' (the benefit) or a buried CTA; clever branding often answers 'what is it' poorly, so prioritize plain clarity over personality up top.  
**Example:** What: AI study tutor. Who: students & self-learners. Why: master any material 3x faster. Do: "Upload a file — free, no card." All four visible, no scroll.  
**When:** Make the first screen answer the four questions.

### `pricing-anchor` — Pricing-Page Anchoring  ·  Σ 34.5  ·  fits: landing-page, product-description
**Structure:** Anchor high → contrast → "most popular" → value recap → CTA  
**How to apply:** Set the highest-value tier first so it frames everything below as a relative bargain, then make the plan you actually want chosen visually dominant with a 'Most popular' badge and a one-line value recap of what it unlocks. Order and contrast do the persuading — list tiers high-to-low or center the target plan, and restate the benefit (not just features) beside the price right before the CTA. The frequent mistake is listing tiers as a neutral feature grid with no anchor and no recommended plan, forcing the visitor to do the math and often leaving without choosing.  
**Example:** Anchor: Ultra $119. Then Pro $59. "Plus — Most popular, $29/mo": "everything to ace your courses." CTA: "Start Plus." Free tier shown last as the on-ramp.  
**When:** Frame tiers so the target plan feels obvious.

## Social / short-form  (11)

### `hook-retain-reward` — Hook-Retain-Reward  ·  Σ 42  ·  fits: video-script, social-post
**Structure:** 3-sec hook → retain (open loops) → reward (payoff) → CTA  
**How to apply:** Front-load the single most arresting visual or claim into the first 3 seconds — before any logo, intro, or setup — because viewers decide to stay or swipe almost instantly. Then plant an open loop ('here's what almost nobody does') so curiosity carries them through the middle, deliver the concrete payoff they were promised, and close with one CTA. The #1 mistake is a slow warm-up: if the hook is context instead of payoff-tease, you lose half the audience before the value lands.  
**Example:** Hook: 'You're studying wrong.' Retain: 'Re-reading feels productive but it's the weakest method.' Reward: 'Upload notes, get quizzed instead.' CTA: 'Try it free.'  
**When:** The short-video retention spine (Reel/Short/TikTok).

### `x-thread-formula` — X / Thread Formula  ·  Σ 42  ·  fits: thread, social-post
**Structure:** Post 1 = whole promise → one beat per post → payoff + ask  
**How to apply:** Make post 1 a self-contained promise that states the full payoff and a reason to keep reading — it must work even if no one expands the thread. Then give exactly one idea per post (no post does double duty) and end each on a small cliff that pulls to the next, before closing with the payoff and a clear ask. The most common failure is a vague or cute opener; if post 1 doesn't promise something specific and worth the scroll, the rest is never read.  
**Example:** Post 1: '7 study habits that quietly waste hours. The fix for each takes 2 minutes.' Then one habit per post, ending: 'Want this automated? Link below.'  
**When:** A thread where each post earns the next.

### `tiktok-hcp` — TikTok Hook-Context-Payoff  ·  Σ 41  ·  fits: video-script, social-post
**Structure:** Hook → minimal context → payoff → one CTA  
**How to apply:** Open on the result or the tension, not the backstory, then give only the minimum context needed to make the payoff land — usually one sentence. Reach the payoff fast and add a single CTA so completion (the metric the algorithm rewards) stays high. The classic error is over-explaining context: every extra setup second is a swipe risk, so cut anything the payoff doesn't strictly require.  
**Example:** Hook: 'I crammed a 40-page chapter in one night.' Context: 'I stopped re-reading.' Payoff: 'I turned it into a quiz and drilled the gaps.' CTA: 'Try it.'  
**When:** Vertical short script optimized for completion.

### `story-lesson-application` — Story-Lesson-Application  ·  Σ 39  ·  fits: social-post, blog, essay
**Structure:** A small true story → the lesson → how the reader applies it  
**How to apply:** Tell one small, true, specific moment — a single scene with a real detail, not a generalized anecdote — so the reader feels it before you teach. Then name the one lesson it proves in a single clear sentence, and hand the reader a concrete next action they can take today. Writers usually botch the application step: don't end on the moral; end on 'here's exactly what to do with this,' or the post inspires without changing behavior.  
**Example:** Story: 'A student failed a quiz on a chapter she'd re-read four times.' Lesson: 'Recognition isn't recall.' Application: 'Quiz yourself before you trust that you know it.'  
**When:** Teach through narrative on social (Ritsu-friendly).

### `myth-vs-fact` — Myth vs Fact  ·  Σ 39  ·  fits: social-post, blog, faq
**Structure:** State the myth → the fact → the evidence  
**How to apply:** State the myth plainly in the reader's own words so they recognize a belief they actually hold — overstating it into a strawman kills the effect. Counter with the fact in one crisp line, then back it with a single piece of evidence (a study, a number, a mechanism) so it reads as credible, not just contrarian. The usual mistake is asserting the fact with no proof; one solid piece of evidence beats three unsupported claims.  
**Example:** Myth: 'Highlighting helps you remember.' Fact: 'It mostly helps you feel productive.' Evidence: 'Studies rank it among the least effective study methods tested.'  
**When:** Bust a common misconception (teaching + shareable; Ritsu-friendly).

### `linkedin-hsl` — LinkedIn Hook-Story-Lesson  ·  Σ 39  ·  fits: social-post
**Structure:** Hook line → short story → the lesson → soft CTA  
**How to apply:** Write a one-line hook that stands alone above the 'see more' fold and creates a reason to expand — a tension, a stat, or a confession. Follow with a short, white-spaced story (short lines, not paragraphs), distill the professional lesson, and end on a soft CTA (a question or gentle invite, not a hard sell, which LinkedIn audiences punish). The frequent error is a buried hook: if the first line is setup rather than intrigue, the post never gets expanded or shared.  
**Example:** Hook: 'My best student almost quit over one bad grade.' Story: short scene. Lesson: 'Feedback speed matters more than feedback volume.' Soft CTA: 'How do you give faster feedback?'  
**When:** The native LinkedIn post that gets read + shared.

### `open-loop` — Open Loop  ·  Σ 38.5  ·  fits: social-post, video-script, thread
**Structure:** Pose the intrigue → delay the answer → pay it off  
**How to apply:** Pose a specific, answerable question or tease a specific outcome early, then deliberately withhold the answer while you deliver intermediate value — the gap is what holds attention. Critically, you must actually close the loop with a real, satisfying payoff; an unresolved or anticlimactic loop reads as clickbait and erodes trust. The #1 mistake is making the loop vague ('something surprising happened') instead of concrete ('one change cut her study time in half') — specific gaps pull harder.  
**Example:** Open: 'One student cut her study time in half — without studying less.' Delay: explain what she changed first. Payoff: 'She replaced re-reading with active recall.'  
**When:** Hold attention by keeping a question alive.

### `contrarian-take` — Contrarian Take  ·  Σ 38.5  ·  fits: social-post, thread, blog
**Structure:** State the consensus → flip it → defend with one proof  
**How to apply:** State the consensus accurately and fairly first, so readers nod before you turn — misrepresenting the mainstream view makes the flip feel cheap. Then flip it with a sharp, falsifiable claim and immediately defend it with one strong proof (evidence, mechanism, or lived result) so you read as credible rather than merely edgy. The big failure is being contrarian for attention with no defense; a hot take without proof gets dunked on, not shared.  
**Example:** Consensus: 'More study hours = better grades.' Flip: 'Hours barely predict results.' Proof: 'Active recall in 30 minutes beats 3 passive hours — retention is about method, not time.'  
**When:** Earn attention by credibly disagreeing.

### `carousel` — Carousel / Slide Deck Post  ·  Σ 38.5  ·  fits: social-post, presentation
**Structure:** Cover hook → one idea per slide → recap → CTA  
**How to apply:** Make the cover slide a standalone hook that promises the payoff and earns the first swipe, then put exactly one idea on each slide with a tiny forward cue so momentum carries to the next. End with a recap slide that compresses the whole argument (the screenshot-worthy slide) and a final CTA. The common mistake is cramming multiple points or dense paragraphs onto one slide — one idea per slide is what makes a carousel swipeable instead of skippable.  
**Example:** Cover: '5 ways to actually remember what you read.' Slides 2-6: one technique each. Recap: all five listed. CTA: 'Upload a doc, get a quiz built for it.'  
**When:** A swipeable mini-lesson or argument.

### `content-pillars` — Content Pillars (Hub & Spoke)  ·  Σ 37.5  ·  fits: social-post, blog
**Structure:** 3-5 pillar themes → many spoke posts → recurring cadence  
**How to apply:** Pick 3-5 pillar themes you can credibly own and want to be known for, then generate many specific 'spoke' posts under each so every post reinforces a pillar instead of drifting. Maintain a recurring cadence (e.g., one pillar per weekday) so the audience learns what to expect from you. The usual error is choosing pillars too broad to own ('education') or too many to sustain — narrow, distinct pillars compound your authority; a scattershot feed doesn't.  
**Example:** Pillars: study science, exam strategy, beating procrastination, tools. Spokes: dozens of posts each. Cadence: Mon science, Tue strategy, Wed procrastination, Thu tools, Fri story.  
**When:** Plan a whole channel's content around a few owned topics.

### `pov-hook` — POV / Pattern-Interrupt Hook  ·  Σ 35  ·  fits: social-post, video-script
**Structure:** A surprising first line that breaks the scroll pattern  
**How to apply:** Open with a single line that violates the reader's expectation — a confession, a reframe, or a 'POV:' that drops them mid-scene — so it breaks the scroll pattern in the first second. Make it specific and slightly uncomfortable or surprising rather than safe; a generic opener blends into the feed and gets swiped. The top mistake is leading with context or a greeting: the pattern-interrupt must be the very first words, with the explanation following only after attention is caught.  
**Example:** 'POV: you re-read the chapter five times and still blanked on the test.' (Then:) 'Recognition isn't memory — here's the method that fixes it.'  
**When:** Stop the thumb in the first second.

## Blog / article / SEO  (11)

### `ultimate-guide` — Ultimate Guide / Pillar Page  ·  Σ 44  ·  fits: article, blog, tutorial
**Structure:** Promise mastery → chaptered sections → internal links → CTA  
**How to apply:** Open by promising a complete outcome ('by the end you'll be able to X'), then break the topic into self-contained chapters ordered by how a learner actually progresses, not alphabetically. Make each chapter skimmable with its own H2 and a one-line takeaway, and link sibling sections so the page works as a hub. The #1 mistake is padding for word count — every section must teach something the reader can't get from a thin competitor, or cut it.  
**Example:** 'The Complete Guide to Studying for Finals': chapters on spaced repetition, active recall, building a quiz from your notes — each linking to a focused how-to, closing with a free upload CTA.  
**When:** The definitive resource that owns a topic + teaches.

### `listicle-post` — Listicle Article  ·  Σ 42  ·  fits: blog, article
**Structure:** Title number = promise → each item a claim + payoff → through-line close  
**How to apply:** Make the number in the title a real promise, then ensure every item delivers a distinct claim plus a concrete payoff (what the reader gains by doing it) — no filler entries added just to hit a round number. Order items by impact or logical sequence, not randomly, and end with a through-line sentence that ties them into one idea so it reads as an argument, not a pile. The common failure is items that overlap or restate each other; each should survive a 'why is this separate?' test.  
**Example:** '7 Ways to Actually Remember What You Read': each item names a technique, gives a 2-line how, and a payoff — closing 'all seven share one move: retrieve, don't reread.'  
**When:** A scannable list where every item earns its place.

### `skyscraper` — Skyscraper  ·  Σ 41  ·  fits: blog, article
**Structure:** Find the best existing piece → make it more complete/current → promote  
**How to apply:** Find the current top-ranking piece for your target query, list exactly where it falls short (outdated stats, missing steps, no examples, poor depth), then build a version that beats it on completeness, recency, and clarity — not just length. After publishing, actively promote it to sites already linking to the inferior piece, since the technique only works if the better asset gets seen. The mistake is making it merely longer; 'better' means more useful per the reader's actual job, with fresher data and clearer structure.  
**Example:** Competitor's '2019 guide to flashcard apps' omits AI auto-generation; you publish a 2026 version covering auto-quiz-from-PDF, with side-by-side screenshots and updated pricing, then pitch it to their linkers.  
**When:** Rank by out-doing the top result.

### `problem-solution-blog` — Problem-Solution Article  ·  Σ 40.5  ·  fits: blog, article, tutorial
**Structure:** Name the problem → why it persists → the solution → how to apply  
**How to apply:** Name the problem in the reader's own words so they feel seen, briefly explain why it persists (the failed obvious fixes), then present your solution and walk through applying it step by step. Spend real estate on the 'why it persists' beat — that's what earns trust and separates you from surface advice. The frequent error is jumping to the solution before the reader believes you understand the pain, which makes the fix feel generic.  
**Example:** 'Why you forget 80% of a lecture by Friday': cramming fails because recall isn't practiced → solution: turn the slides into a daily 5-question quiz → here's how in 30 seconds.  
**When:** The default helpful-content shape (teaches + ranks).

### `comparison-x-vs-y` — Comparison (X vs Y)  ·  Σ 40  ·  fits: blog, article, review
**Structure:** Frame the decision → criteria → head-to-head → who-should-pick-what  
**How to apply:** Open by framing the actual decision the reader faces, define 3-6 criteria that matter for that decision, then go head-to-head on each criterion before closing with clear 'pick X if… / pick Y if…' verdicts. Stay genuinely useful and fair — name where each option wins — because high-intent comparison readers smell bias instantly. The mistake is declaring one universal winner; real buyers differ, so segment the recommendation by use case.  
**Example:** 'Flashcards vs. Practice Quizzes for exam prep': criteria = recall depth, setup time, retention. Verdict: flashcards for vocab, auto-generated quizzes for applying concepts under time pressure.  
**When:** Capture high-intent "X vs Y" search + help a real choice.

### `case-study-blog` — Case Study  ·  Σ 39.5  ·  fits: blog, article, proposal
**Structure:** Subject + goal → problem → approach → result (numbers) → takeaway  
**How to apply:** Introduce the subject and their concrete goal, establish the problem they faced, describe the approach taken, then report results with real numbers and end on a transferable takeaway. The discipline is quantifying the result (percentages, time saved, scores) — a case study without numbers is just an anecdote. The common failure is making it a thinly veiled ad; let the data sell and keep the narrative honest, including what was hard.  
**Example:** 'How a pre-med student raised her quiz scores 40%': drowning in 200-page notes → uploaded them, drilled auto-generated questions nightly → 62%→87% in three weeks. Takeaway: test before you reread.  
**When:** Proof-driven story that sells without selling.

### `inverted-pyramid` — Inverted Pyramid  ·  Σ 39.5  ·  fits: article, press-release, blog
**Structure:** Most important first → supporting detail → background  
**How to apply:** Lead with the single most important fact or conclusion in the first sentence, then layer supporting details in descending order of importance, with background last. Write so a reader who stops after one paragraph still gets the core message — assume they will. The mistake is burying the lede with throat-clearing context or chronology; the newest/most-consequential point goes first, always.  
**Example:** 'Ritsu now turns any YouTube lecture into a quiz in 30 seconds.' Then: which formats, who it's for, accuracy notes — and finally, the backstory of why we built it.  
**When:** Journalism's structure: the reader can stop anytime.

### `definition-post` — Definition / "What is X" Post  ·  Σ 38.5  ·  fits: blog, faq, tutorial
**Structure:** Plain definition → why it matters → example → related  
**How to apply:** Open with a plain-language definition a beginner could repeat (avoid defining the term with the term), then explain why it matters, give one concrete example, and point to related concepts. The discipline is the first sentence — it must stand alone as a quotable, jargon-free answer, because that's what search and skimmers grab. The error is academic over-precision that loses the newcomer you're writing for.  
**Example:** 'What is active recall? It's testing yourself on material instead of rereading it.' Why it matters (it builds durable memory), example (quiz yourself on a chapter), related: spaced repetition.  
**When:** Own the "what is X" query and teach the basics.

### `app-intro` — APP Intro (Agree-Promise-Preview)  ·  Σ 38  ·  fits: blog, article
**Structure:** Agree (with their problem) → Promise (a fix) → Preview (what's coming)  
**How to apply:** Write three tight moves: Agree — validate the reader's exact frustration so they nod; Promise — state the specific fix this piece delivers; Preview — tease what's coming so they keep scrolling. Keep it to a few sentences total; APP is a hook, not a section. The mistake is a vague agree ('studying is hard') instead of a sharp, specific one the reader recognizes as their own situation.  
**Example:** 'You highlighted the whole chapter and still blanked on the test. (Agree) There's a faster way to make it stick. (Promise) Here are the three steps — the second one takes 30 seconds. (Preview)'  
**When:** Brian Dean's sticky intro that beats the bounce.

### `tofu-mofu-bofu` — TOFU-MOFU-BOFU  ·  Σ 37.5  ·  fits: blog, article, landing-page
**Structure:** Top (awareness) → Middle (consideration) → Bottom (decision) content  
**How to apply:** First decide the reader's funnel stage, then match the content: TOFU answers a broad problem-aware question without selling, MOFU compares approaches and introduces solution categories, BOFU addresses a ready-to-decide reader with proof and a clear CTA. Pick ONE stage per piece and write to its intent — mixing a hard product pitch into awareness content kills it. The error is bolting a BOFU CTA onto a TOFU article and wondering why it doesn't convert.  
**Example:** TOFU: 'Why students forget what they study.' MOFU: 'Flashcards vs. AI quizzes.' BOFU: 'Ritsu vs. Quizlet for exam prep — and why testers switched.' with a trial CTA.  
**When:** Map a content piece to its funnel stage + intent.

### `nut-graf` — Nut Graf  ·  Σ 35.5  ·  fits: article, blog
**Structure:** Lede (scene) → nut graf (why it matters now) → body  
**How to apply:** Open with a vivid lede — a scene, person, or moment — then immediately follow with the nut graf: one paragraph that states why this story matters now and what the piece will deliver. The lede earns attention; the nut graf earns the rest of the read, so don't let the scene run more than a few sentences before you cash it in. The mistake is a beautiful anecdote that never explains the stakes, leaving readers asking 'so what?'  
**Example:** Lede: a student stares at 80 unread pages the night before an exam. Nut graf: this scene plays out for millions each semester — and why turning notes into self-tests changes the outcome.  
**When:** Earn the rest of a feature with a why-care paragraph.

## Video scripts  (2)

### `explainer-ps` — Explainer (Problem-Solution-How)  ·  Σ 42.5  ·  fits: video-script
**Structure:** Problem → solution → how it works → CTA  
**How to apply:** Open by naming the viewer's pain in their own words within the first 5 seconds (no logo intro), then name your product as the solution in one plain sentence before showing how it works in 2-3 concrete steps tied to a visible on-screen action. The #1 mistake is front-loading features before the viewer feels the problem — earn the 'how' by making the pain land first, and keep 'how it works' to the smallest demo that proves the claim, ending on one specific CTA (not 'learn more').  
**Example:** "Cramming a 60-page PDF the night before? Drop it into Ritsu, get a quiz in 30 seconds, and test yourself till it sticks. Try your first upload free."  
**When:** A 60-90s explainer that also teaches.

### `youtube-hivc` — YouTube Hook-Intro-Value-CTA  ·  Σ 38.5  ·  fits: video-script
**Structure:** Hook → promise/intro → value beats → CTA  
**How to apply:** Lead with a hook that creates an open loop or stakes in the first 15 seconds, then immediately state the concrete promise (what the viewer will be able to do by the end) so they know why to stay. Deliver 3-5 self-contained value beats, each opening its own mini-loop to pull retention across the dip, and only place the CTA after value is delivered. The most common failure is a vague hook plus a CTA crammed in too early — make the promise specific and measurable, and let each beat pay off before the next begins.  
**Example:** Hook: "I memorized a whole textbook in 3 days — here's the system." Promise: turn any chapter into recall practice. Beats: upload, auto-quiz, spaced review. CTA: try it free.  
**When:** Long-form YouTube retention structure.

## Storytelling / structure  (7)

### `abt` — ABT (And-But-Therefore)  ·  Σ 43.5  ·  fits: essay, blog, speech, social-post
**Structure:** Setup AND context → BUT the problem → THEREFORE the resolution  
**How to apply:** Write the AND clause as agreed, friendly common ground (no conflict yet), then pivot hard on a single BUT that names ONE specific tension, then let THEREFORE state the consequence or action that resolves it. The discipline: keep it to one sentence with exactly one 'but' — the #1 mistake is stacking multiple problems (an 'AND-AND-AND' list) so the contrast goes flat and nothing feels at stake.  
**Example:** Students highlight their textbooks and feel productive, BUT highlighting doesn't build recall, THEREFORE Ritsu turns each chapter into a quiz that actually makes it stick.  
**When:** One-sentence narrative engine (great for science communication).

### `scqa` — SCQA / Minto (Situation-Complication-Question-Answer)  ·  Σ 42.5  ·  fits: memo, proposal, report, essay
**Structure:** Situation → Complication → Question → Answer  
**How to apply:** State the Situation as stable facts the reader already accepts, introduce the Complication as the change or problem that destabilizes it, let that tension raise the Question the reader is now asking, then make your Answer the direct, governing reply (which becomes the doc's thesis). The discipline: the Question must arise naturally from the Complication — the #1 mistake is a Situation that's secretly already the problem, which collapses the setup and makes the Answer feel unearned.  
**Example:** Situation: teachers assign reading. Complication: students arrive unprepared and can't self-test. Question: how do we make any document practice-ready? Answer: Ritsu auto-generates quizzes from the upload.  
**When:** Open any doc or pitch with a tight, logical setup.

### `pixar-spine` — Pixar Story Spine  ·  Σ 40.5  ·  fits: story, social-post, speech
**Structure:** Once upon a time… every day… until one day… because of that… until finally…  
**How to apply:** Fill each clause in order: establish a normal world ('once upon a time'), show the stable routine ('every day'), break it with one inciting event ('until one day'), then chain the consequences ('because of that…' repeated as needed) to a clear payoff ('until finally'). The discipline: the 'until one day' must overturn the 'every day' you just set up — the #1 mistake is a routine and a disruption that don't connect, so the consequence chain has nothing to push against.  
**Example:** Once upon a time a med student crammed flashcards every day, until one day exams stacked up; because of that she uploaded her notes to Ritsu, until finally she walked in prepared.  
**When:** A reliable mini-story skeleton.

### `heros-journey` — Hero's Journey  ·  Σ 40  ·  fits: story, video-script, speech
**Structure:** Ordinary world → call → trials → transformation → return changed  
**How to apply:** Anchor the reader in the hero's ordinary world and dissatisfaction, hit them with a call (a problem or goal), show real trials and a low point where the old way fails, then deliver a transformation via a tool/mentor and a return where they're visibly changed. The discipline: keep the audience (or customer) as the hero and your brand as the mentor, not the hero — the #1 mistake is making your product the protagonist, which kills reader identification; also don't skip the trials, since the struggle is what makes the change credible.  
**Example:** An anxious self-learner drowning in PDFs answers the call to truly master them, fails with passive rereading, meets Ritsu as guide, and returns acing the material he once feared.  
**When:** Epic narrative arc for brand/origin/case stories.

### `sparkline` — Sparkline (Duarte)  ·  Σ 37  ·  fits: speech, presentation
**Structure:** Oscillate: what is ↔ what could be → end on new bliss  
**How to apply:** Build a rhythm that repeatedly contrasts 'what is' (the painful status quo) against 'what could be' (the better world), making each swing bigger to ratchet up tension, then land the final beat on a concrete 'new bliss' the audience can step into. The discipline: actually oscillate — return to the gap several times rather than describing the problem once — and the #1 mistake is ending on abstract inspiration instead of a specific, do-this-now vision the listener can picture themselves living.  
**Example:** What is: you reread and forget. What could be: you recall on demand. (Repeat, widening.) New bliss: upload tonight, quiz yourself, walk into Friday's exam certain.  
**When:** Persuasive talk structure that builds tension to a vision.

### `storybrand-sb7` — StoryBrand SB7  ·  Σ 36.5  ·  fits: landing-page, ad, email, bio
**Structure:** Hero → problem → guide → plan → CTA → stakes → success  
**How to apply:** Cast the customer as the hero with a clear external problem (and the internal frustration beneath it), position your brand as the guide showing empathy plus authority, give a dead-simple 3-step plan, then issue a direct CTA while naming the stakes (what failure costs) and painting success. The discipline: lead with the customer's problem, not your features, and keep the plan to about three steps — the #1 mistake is making the brand the hero or burying the single clear call-to-action under multiple competing asks.  
**Example:** You're a student buried in readings (problem). Ritsu is your study guide (guide). Upload, get quizzed, master it (plan). Start free (CTA) — or keep forgetting (stakes).  
**When:** Make the customer the hero, your brand the guide.

### `three-act` — Three-Act Structure  ·  Σ 34.5  ·  fits: story, screenplay, video-script
**Structure:** Setup → confrontation → resolution  
**How to apply:** In Act 1 establish the character, world, and the inciting incident that sets the goal; in Act 2 escalate obstacles and raise stakes through rising conflict to a midpoint turn and a crisis; in Act 3 deliver the climax and a resolution that pays off the Act 1 setup. The discipline: Act 2 must keep complicating with real obstacles, not stall — the #1 mistake is a sagging middle where tension plateaus and the resolution arrives without the hero having genuinely struggled or changed.  
**Example:** Act 1: learner faces a brutal exam. Act 2: every cram method fails, time shrinking. Act 3: Ritsu-built quizzes turn panic into mastery; she passes.  
**When:** Classic dramatic shape for stories/scripts.

## Business / ops / memo  (4)

### `pyramid-principle` — Pyramid Principle (Minto)  ·  Σ 40  ·  fits: memo, report, proposal, research
**Structure:** Answer first → grouped supporting arguments → data  
**How to apply:** Lead with your single governing answer in one sentence, then group every supporting point under 3-5 MECE buckets (mutually exclusive, collectively exhaustive — no overlaps, no gaps), and only drop into data at the bottom of each branch. The discipline most people miss: each group must independently prove the line above it, and you must resist burying the answer under throat-clearing context — if a reader stops after sentence one, they should already have the takeaway.  
**Example:** "Switch the free tier to 3 quizzes/day. Usage caps drive upgrades, our churn data confirms it, and rivals already gate harder." Then evidence under each.  
**When:** Structure any argument top-down, MECE.

### `star-case` — STAR (Situation-Task-Action-Result)  ·  Σ 38.5  ·  fits: bio, report, proposal
**Structure:** Situation → Task → Action → Result  
**How to apply:** Walk through four beats in order: set the Situation (context + stakes), name the specific Task (the goal or problem owned), detail the Action (what the subject concretely did — verbs, decisions, not adjectives), then close on a quantified Result. The key discipline: spend the most words on Action and make Result measurable; the common failure is a vague Situation that swallows the story and a Result like "it went well" instead of a number.  
**Example:** "A med student faced 600 pages before boards (S). She needed recall, not rereading (T). She uploaded each chapter for daily quizzes (A). Scored 18% higher (R)."  
**When:** Bios, case studies, and accomplishment write-ups.

### `bluf` — BLUF (Bottom Line Up Front)  ·  Σ 34.5  ·  fits: memo, report, email
**Structure:** Decision/ask first → context → options → next step  
**How to apply:** Put the decision you need or the answer you're giving in the very first line — before any setup — then layer context, the options you weighed, and the explicit next step beneath it. The discipline: the opening line must be self-sufficient enough that a busy reader could reply "approved" without scrolling; the classic mistake is writing BLUF but softening the first line into background so the actual ask hides in paragraph three.  
**Example:** "Requesting approval to ship the YouTube-to-quiz feature Thursday. Context: 3 weeks of beta, 40% activation lift. Options were Thu vs. next sprint. Next step: your sign-off by Wed."  
**When:** Get a decision made fast; lead with the answer.

### `prfaq` — Amazon PR/FAQ (6-pager)  ·  Σ 33.5  ·  fits: proposal, memo, report
**Structure:** Future press release → customer FAQ → internal FAQ  
**How to apply:** Write the launch-day press release first — as if the product already shipped, dated in the future, in plain customer-benefit language — then a customer FAQ answering what real users would ask, then an internal FAQ confronting the hard execution, cost, and risk questions. The discipline: work backwards from the customer outcome, not forward from the feature; the failure mode is a press release stuffed with internal jargon and an internal FAQ that dodges the uncomfortable questions instead of answering them.  
**Example:** PR: "Today Ritsu launched Exam Cram — upload your syllabus, get a personalized 3-day study plan." FAQ: "What if my PDF is scanned?" Internal FAQ: "OCR cost per upload?"  
**When:** Work-backwards from the launch you want.

---
_Generated from `knowledge/write-frameworks.yaml`. To add a framework: append to the yaml + regenerate._
