# Writing frameworks — the `/write --framework` library

183 formulas the writer applies with `/write --framework=<id>`. Each carries its **structure** (the steps), **how to apply** (the process + key discipline, so a writer who doesn’t know it can apply it reliably), a concrete **example**, and **when** to reach for it. A framework is composable with `--type` / `--template` / `--author-style`.

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


## From the masters — distilled by `/write learn` (83)

Net-new formulas distilled from 14 master writing books (2026-06-10), routed here by family. Each is traceable to its **source book(s)**; the universal *principles* from these books live in [`CRAFT.md`](CRAFT.md).

### Advertising (Ogilvy · Hopkins · Schwartz)  (4)

#### `offer-service` — Offer Service (Lead With What They Get)  ·  Σ 36.5  ·  fits: landing-page, ad, email, product-description, social-post
**Structure:** 1) Drop the ask — never open with 'buy', 'choose us', or the brand name as if it mattered. 2) Picture the reader's selfish gain: information they want, a result they crave, a risk removed. 3) Make a service offer that proves the claim at the reader's zero cost (free sample, try-before-pay, money-back). 4) Let the natural result of the value be the purchase — earn the decision instead of demanding it.  
**How to apply:** Rewrite every 'buy/choose/get our app' line as the service the reader receives, then back it with a no-risk trial — 'the good salesman pictures the customer's side of his service until the natural result is to buy'. The #1 failure mode is talking about YOUR interest; read the draft and delete every sentence that serves the seller, not the reader.  
**Example:** Not 'Sign up for Ritsu.' Instead 'Upload your hardest chapter — get a free 10-question quiz in 30 seconds. Keep it whether or not you stay.'  
**When:** Any persuasive piece (ad, landing page, email, product page) where the instinct is to say 'sign up' or 'pick us'.  
*Sources: scientific-advertising-hopkins*

#### `preemptive-claim` — The Preemptive Claim  ·  Σ 36  ·  fits: landing-page, ad, press-release, blog, product-description
**Structure:** 1) Find a true fact about how the product or process works that EVERY competitor could also claim but none has bothered to. 2) Be the first to tell it — in vivid, specific process detail. 3) Own it: the public now associates that universal truth with you alone. 4) Bonus: pair it with a coined or descriptive name so rivals can't ride the demand you created.  
**How to apply:** Audit your process for an unstated-but-ownable mechanism and describe it concretely before anyone else does — Hopkins's brewer detailed filtered air and washing every bottle four times, claims any brewer could have made, and owned the category. The #1 discipline is vivid process specifics, not the abstract claim.  
**Example:** Every study app says 'AI-powered'. Ritsu instead: 'Every quiz question is traced to a line in YOUR document — tap it to see the exact source sentence. No invented facts.'  
**When:** Entering a crowded category where everyone makes the same vague claim ('pure', 'effective', 'AI-powered').  
*Sources: scientific-advertising-hopkins*

#### `big-idea-five-questions` — Big-Idea Five-Question Test  ·  Σ 34  ·  fits: ad, landing-page, video-script, presentation, social-post, blog
**Structure:** Score any candidate concept against five gates: 1) Did it make me gasp when I first saw it? 2) Do I wish I'd thought of it? 3) Is it unique? 4) Does it fit the strategy to perfection? 5) Could it run for 30 years? A real big idea passes all five.  
**How to apply:** Generate by stuffing your conscious mind with research then unhooking rational thought (a walk, a shower); then run each survivor through the five questions and kill anything that fails gate 4 (on-strategy) or gate 3 (unique). The #1 failure mode is 'irrelevant brilliance' — a dazzling idea that doesn't fit the strategy.  
**Example:** 'Your textbook, talking back to you' — a tutor that quizzes from your own pages — passes unique + on-strategy + durable; a generic 'study smarter' tagline fails the gasp test.  
**When:** Selecting the central creative concept or hook for a campaign or flagship piece before building everything around it.  
*Sources: ogilvy-on-advertising*

#### `rule-and-example-campaign` — Rule-and-Example Campaign  ·  Σ 33.5  ·  fits: article-series, thread, newsletter, social-post, ad, email
**Structure:** 1) Find the ONE dominant image or idea. 2) Compress it into a single fixed statement (the 'Rule'). 3) Keep that Rule constant across every piece while varying one element (the 'Example' — a new illustration, angle, or proof) each time. 4) The continuity banks past desire; the variation re-earns attention so the idea feels new again.  
**How to apply:** Hold the central idea rigid but never re-run the identical headline — present a series of variations, each emerging from the core idea yet different enough to compel a re-read. The #1 discipline is that every variation must still pass the headline test on its own.  
**Example:** Series rule: 'Turn any document into a tutor.' Examples rotate: a PDF, a YouTube lecture, lecture slides, a research paper — same promise, new proof each post.  
**When:** Any multi-asset run (a content series, email sequence, thread series, repeated social posts) where one piece isn't enough and repetition would go stale.  
*Sources: breakthrough-advertising-schwartz*


### Copy & conversion  (7)

#### `find-the-core` — Find the Core (Commander's Intent)  ·  Σ 42  ·  fits: blog, email, memo, presentation, landing-page, tutorial, report, speech, course, ad
**Structure:** 1) List everything you could say. 2) Force-rank to the SINGLE most important thing. 3) Write it as one plain 'Commander's Intent' line a novice could act on alone. 4) Make every later sentence serve that core; cut what competes. 5) State the core FIRST (inverted pyramid — don't bury the lead).  
**How to apply:** Do forced prioritization — 'if they keep only one idea, which?' — and accept that finding the core means discarding many true, good points. The #1 failure mode is decision paralysis from too many co-equal points; one ranked core beats five unranked tips.  
**Example:** For a 3-day-exam guide, the core line is 'Active recall over rereading' — every section then serves only that, stated in sentence one.  
**When:** Any piece where the reader will remember at most one thing — to set what that one thing is.  
*Sources: made-to-stick-heath*

#### `humanize-the-institution` — Humanize the Institution (I-Ness Warmth)  ·  Σ 38  ·  fits: email, landing-page, product-description, faq, press-release, memo, newsletter, proposal, report, blog, social-post
**Structure:** 1) Identify where the draft hides behind passive voice and abstraction ('initiatives were undertaken', 'utilization', concept nouns). 2) Put a person back in: switch to I/we/you with active verbs that show someone doing something. 3) If 'I' is forbidden, at least THINK 'I' as you write — or draft in first person and remove the I's afterward. 4) Use contractions and the words you'd say out loud. 5) Address the reader directly with 'you'.  
**How to apply:** Apply clarity, simplicity, brevity, humanity: 'readers identify with people, not abstractions', so every faceless sentence ('evaluative procedures were established') becomes a human one ('at the end of the year we'll see how we did'). The #1 failure mode is jargon-as-safety-blanket — it feels safe but tells the reader nothing.  
**Example:** Not 'Ritsu provides enhanced learning environments via multimodal instructional materials.' Instead 'Upload your notes and we'll turn them into quizzes you can actually pass.'  
**When:** Org-voice copy — onboarding emails, product pages, support replies, FAQ, announcements — that reads cold or corporate.  
*Sources: on-writing-well-zinsser, ogilvy-on-advertising*

#### `second-person-singular` — Second-Person-Singular Letter Voice  ·  Σ 37.5  ·  fits: email, landing-page, ad, newsletter, blog, social-post, product-description
**Structure:** 1) Picture ONE reader, alone, reading. 2) Write as if penning that person a personal letter — 'you', singular. 3) Open with a grabber first sentence, never a mushy statement of the obvious. 4) Use short sentences, short paragraphs, everyday words. 5) Tell them what it does for THEM.  
**How to apply:** Replace stadium-address phrasing ('students everywhere love…') with one-human-to-another address, and make the first paragraph seize attention rather than ease in. The #1 failure mode is opening with the obvious — 'Going on vacation is a pleasure everyone looks forward to' loses the reader in line one.  
**Example:** 'You've got the exam Friday and 80 pages you haven't touched. Drop the PDF in. In 30 seconds Ritsu hands you a quiz on exactly that chapter.'  
**When:** Any direct, reader-facing copy where warmth and one-to-one intimacy drive trust and action.  
*Sources: ogilvy-on-advertising*

#### `so-what-because-ladder` — So What? / Because Ladder  ·  Σ 37  ·  fits: landing-page, email, ad, product-description, blog, social-post, memo, proposal
**Structure:** 1) State your goal or claim plainly. 2) Ask 'So what?' 3) Answer 'Because ___'. 4) Ask 'So what?' of that answer. 5) Repeat until you hit the reader's real, felt stake. 6) Rewrite the bottom rung as one reader-facing message sentence and pin it at the top of the page.  
**How to apply:** Run the So-what?/Because volley until you exhaust any ability to come up with an answer — the last rung is the reader's true motivation. The #1 discipline is not stopping at the first 'because' (that's still a feature); the gold is 2-3 rungs down, then express it as a single clear message kept visible as your map pin.  
**Example:** 'Ritsu makes flashcards from your PDF.' So what? → you stop hand-making cards at 1am. So what? → you sleep AND remember more. → 'Spend exam week learning, not making flashcards.'  
**When:** Whenever a draft is about you or the product and you need to reframe it around the reader's benefit.  
*Sources: everybody-writes-handley*

#### `tell-me-without-telling-me` — Tell Me Without Telling Me  ·  Σ 35.5  ·  fits: landing-page, ad, product-description, email, social-post, blog, bio
**Structure:** 1) Write the literal 'Tell Me' line (the feature or description). 2) Ask: what's it LIKE? how does it FEEL to the reader? 3) Replace the description with an image, action, or sensory clue that dramatizes the benefit — without naming it. 4) Check the reader is front-and-center and can see themselves in it.  
**How to apply:** Force any 'Tell Me' line through the show-don't-tell test, connecting ALL the dots so the reader doesn't have to infer why it matters — but stop short of explaining the joke. The #1 discipline is pairing it with concrete specifics, because concrete images do the showing.  
**Example:** Tell Me: 'AI-generated quizzes from any document.' Tell Me Without Telling Me: 'Quiz yourself on tonight's reading before you've finished the chapter.'  
**When:** Headlines, home-page heroes, product copy, email subject lines — anywhere bloodless description is weakening the line.  
*Sources: everybody-writes-handley*

#### `specifics-over-superlatives` — Specifics Over Superlatives  ·  Σ 35  ·  fits: ad, landing-page, product-description, email, blog, social-post, report
**Structure:** 1) Hunt every vague claim and superlative in the draft (best, fastest, world-class, 'a lot', 'less than you think'). 2) Replace each with an exact figure, count, or named mechanism that implies you measured. 3) Prefer a number that sounds tested (78, 130, 2×) over a round invented-looking one. 4) Surface the single most surprising true specific into the headline. 5) If a claim can't be made specific, cut it.  
**How to apply:** Run a superlative-hunt pass — every 'best/most/leading' is a red flag — and convert to a definite statement, because 'a man who makes a specific claim is either telling the truth or a lie, and people don't expect an advertiser to lie'. The #1 discipline is never shipping a number you couldn't defend; a false specific destroys more trust than a vague claim.  
**Example:** Not 'Ritsu makes studying way more effective.' Instead 'Ritsu turns 1 PDF into 40 quiz questions and 25 flashcards in 30 seconds.'  
**When:** Whenever copy is leaning on adjectives and superlatives to do persuasion's job.  
*Sources: ogilvy-on-advertising, scientific-advertising-hopkins*

#### `intensification-fulfillment-stack` — Intensification (Stack Fresh Fulfillment Images)  ·  Σ 34  ·  fits: landing-page, email, ad, video-script, product-description, blog
**Structure:** 1) Name the one dominant desire. 2) Present a vivid fulfillment image (product-in-action, the result). 3) Re-present the SAME promise from a fresh angle each time — put the reader inside it, stretch benefits over time, bring in an audience, show experts approving, contrast old-vs-new, picture the downside, show how easy it is, use analogy. 4) Summarize the images, then fold them into the guarantee as the climax.  
**How to apply:** You are 'the script writer for your prospect's dreams' — translate vague desire into one concrete scene of fulfillment after another. The #1 discipline is never repeating an image: each restatement must use a new viewpoint or you bore and lose the reader, and you stop the moment a new angle stops adding desire.  
**Example:** Teaching memory: 'Tonight, read 8 pages. Then write 20 facts you could never remember before — without looking back. Tomorrow, amaze your class.'  
**When:** Body-copy desire-building — when you need to overpower skepticism, lethargy, and price.  
*Sources: breakthrough-advertising-schwartz*


### Headlines  (2)

#### `benefit-or-news-headline` — Benefit-or-News Headline  ·  Σ 38  ·  fits: ad, landing-page, email, blog, social-post, newsletter
**Structure:** 1) Lead the headline with the single strongest reader BENEFIT or a piece of NEWS. 2) Make the promise concrete and specific (a number, a named gain). 3) Put the brand or product name IN the headline. 4) Flag the target audience by name if it's a niche. 5) Telegraph plainly — no puns, no double meanings, no blind cleverness.  
**How to apply:** Write 10+ headline variants, then keep only those that promise a benefit or break news, rejecting every 'clever' headline that doesn't say what the thing does. The #1 failure mode is the witty headline that wins at the bar and loses at the cash register — five times as many people read the headline as the body, so a headline that doesn't sell wastes 90% of the work.  
**Example:** 'How to ace your biology final in 3 days — turn your textbook into 40 quiz questions.' (benefit + news + specific)  
**When:** Any short, scannable opener where most readers will only ever read that one line.  
*Sources: ogilvy-on-advertising*

#### `headline-90-10` — Headline Recipe (90% Clear, 10% Clever)  ·  Σ 37  ·  fits: blog, article, newsletter, social-post, thread, ad, email
**Structure:** 1) Be 90% clear, 10% clever (the headline must stand alone without the story). 2) Open a curiosity gap — but deliver on it, no hyperbole. 3) Put the READER in it. 4) Be specific; use oddball numbers (3½, 17, 37). 5) Signal why now. 6) Prefer 'the/these/their' over 'a/an/some'. 7) Front-load the key words. 8) Write SEVEN headlines, pick the best. 9) Read it aloud.  
**How to apply:** Spend as much time on the headline as on the piece, then run the 9-point pass and generate seven variants before choosing. The #1 discipline is that clever-without-clear fails, and the curiosity gap must be honest — '14 Surprising Ways…' only works if they're actually surprising.  
**Example:** Not '14 Study Tips.' Try '7 Things to Quiz Yourself On Before Tomorrow's Exam (Most Students Skip #4)' — reader-in-it, oddball number, why-now, honest gap.  
**When:** Every headline, blog title, subject line, and social post hook.  
*Sources: everybody-writes-handley*


### Landing & sales pages  (2)

#### `landing-page-five-things` — Landing Page Five-Things (Less Is More)  ·  Σ 36.5  ·  fits: landing-page, email, ad, product-description
**Structure:** Convey exactly five things and nothing more: 1) Where they are (match the headline to the promise that brought them). 2) What you're making available, and for whom — framed as benefit, not product. 3) Why now. 4) Validation/proof from others. 5) One clear CTA.  
**How to apply:** Strip the page to the five elements and resist 'arcade-ifying' it with bells and whistles that overwhelm. The #1 discipline is killing 'message mismatch' — the first thing the visitor sees must be exactly what the ad or email promised, and benefit-driven headlines beat product-driven ones.  
**Example:** Headline: 'Create a full study set from your lecture slides in 10 minutes' (benefit), proof: '12,000 students', why now: 'finals are 2 weeks out', CTA: 'Upload your slides.'  
**When:** Any single-goal landing page reached from a targeted email, ad, or social campaign.  
*Sources: everybody-writes-handley*

#### `editorial-not-ad` — Editorial-Not-Ad Format  ·  Σ 33  ·  fits: landing-page, blog, ad, newsletter, social-post, presentation, article
**Structure:** 1) Make the piece look like editorial content, not a promotion. 2) Order elements the way the eye scans: image → headline-under-image → copy. 3) Put a selling caption under every image (captions out-read body copy). 4) Use clean readable type — dark text on light, serif body. 5) Strip the graphic 'tells' that scream 'skip me'.  
**How to apply:** Construct it pretending you're an editor — roughly six times as many people read the average article as the average ad. The #1 levers: put the headline BELOW the image (read by ~10% more people) and never run an image without a selling caption carrying the brand name plus the promise.  
**Example:** A Ritsu blog header reading like a study-skills article — image of an annotated textbook page, headline beneath, caption: 'Ritsu turned this chapter into 40 questions.'  
**When:** Any visual piece competing for attention where 'looks like an ad' kills readership.  
*Sources: ogilvy-on-advertising*


### Email  (1)

#### `cta-lift-the-a` — Lift the A in CTA  ·  Σ 35.5  ·  fits: email, landing-page, ad, newsletter, social-post, product-description
**Structure:** 1) Start from the generic CTA ('Download', 'Register', 'Learn more'). 2) Make it literally actionable with a visible action verb. 3) Infuse brand voice or quirk. 4) Swap work-words for outcome-words (Learn → Finally understand; See how → Discover). 5) Optionally rhyme it for memorability.  
**How to apply:** Lift the A — make the Action vivid and seeable ('Access the ebook' → 'Grab your copy') — and cut words that imply work or don't hint at the outcome, because readers are a little lazy. The #1 lever is the outcome-word swap; rhyme triggers the Rhyme-as-Reason bias so people judge it more true.  
**Example:** Not 'Start free trial.' Try 'Turn your notes into a quiz — free.' Or rhymed: 'Ace it faster, be the master.'  
**When:** Every button, link, and call to action in emails, landing pages, ads, and headlines.  
*Sources: everybody-writes-handley*


### Persuasion psychology (Cialdini · Heath)  (14)

#### `success-stickiness-audit` — SUCCESs Stickiness Audit  ·  Σ 42  ·  fits: blog, social-post, email, video-script, presentation, ad, landing-page, course, speech, newsletter
**Structure:** Run any draft against six checks in order: Simple (find the core, one idea) → Unexpected (break a guessing machine; open a gap) → Concrete (sensory, specific, no abstraction) → Credible (a detail/stat/test the reader can verify) → Emotional (make them care about ONE someone) → Story (a scene they can mentally simulate). Score each present/absent; rewrite the misses.  
**How to apply:** Treat it as a checklist, not a recipe — draft first, then audit each of the six and fix only the gaps. The #1 failure is stopping at 'Simple + short' (a slogan) and skipping the other five, so force every letter to earn a yes.  
**Example:** Audit a flashcard tip: Simple yes, Unexpected no, Concrete no — rewrite 'study smart' into 'quiz yourself before you reread — recall, not rereading, is what sticks.'  
**When:** Pressure-testing or rebuilding any piece that must be remembered and acted on, not just read.  
*Sources: made-to-stick-heath*

#### `springboard-story` — Springboard Story  ·  Σ 37  ·  fits: blog, email, presentation, proposal, memo, speech, video-script, case-study-blog
**Structure:** 1) State the change you want the reader to believe is possible. 2) Tell ONE true minimal story of someone who already lived that change (set-up problem → what they did → result). 3) Stop short of preaching the moral — let the reader's inner voice infer it and supply a story of their own. 4) Keep it lean enough that the leap to 'us' is obvious.  
**How to apply:** Resist 'hitting them between the eyes' with an abstract directive — that invites the reader to argue back; a story invites participation instead. The #1 discipline is engaging the inner skeptic by giving it something to infer, so the reader co-authors the conclusion ('they stole my idea — it became their idea').  
**Example:** Pitch active recall to skeptical teachers via the one student who replaced rereading with self-quizzing and jumped a letter grade — then let them imagine their own class.  
**When:** Overcoming skepticism or creating buy-in for a new way of doing things, where a direct argument would trigger pushback.  
*Sources: made-to-stick-heath*

#### `gradualization` — Gradualization (the Belief-Bridge)  ·  Σ 36  ·  fits: landing-page, email, ad, blog, video-script, course
**Structure:** 1) Open with a statement the reader already accepts as true (a shared resentment, symptom, or fact) — NOT your strongest claim. 2) Add an inclusion-question they answer 'yes' to. 3) Stack 5-8 more small agreements (symptom lists, 'how many times this week…'). 4) Only now introduce each bigger claim, each one logically bridged from the accepted facts before it. 5) Reach the payoff claim last, when it lands as inevitable.  
**How to apply:** Build a 'Habit of Agreement': never ask the reader to jump a believability chasm — lay one stepping-stone of already-accepted fact, then the next, each prepared by the one before. The #1 failure mode is leading with your power-claim; one fully-believed promise outsells ten half-believed ones.  
**Example:** Don't open 'Ace any exam in 3 days.' Open 'Ever crammed all night and still blanked on the test?' → yes → then build to the 3-day claim.  
**When:** When your true claim is too big, too good, or too unfamiliar to be believed if stated cold — common for any 'you can do X yourself' or transformation promise.  
*Sources: breakthrough-advertising-schwartz*

#### `mass-desire-selection` — Mass-Desire Selection (Urgency × Staying-Power × Scope)  ·  Σ 36  ·  fits: ad, landing-page, email, blog, video-script, product-description
**Structure:** 1) List every desire your product could plausibly tap. 2) Score each on three dimensions: Urgency (intensity, demand to be satisfied now), Staying-power (recurring, can't be satiated), and Scope (how many people share it). 3) Pick the ONE desire that scores highest across all three right now. 4) Build the headline and lead on that single desire — every other benefit becomes supporting reinforcement.  
**How to apply:** Inventory desires and deliberately rank by the three dimensions rather than defaulting to the most obvious one. The #1 discipline is that only ONE desire can lead — 'only one is the key that unlocks maximum power' — and choosing wrong here dooms everything downstream, because the choice is embodied in your headline.  
**Example:** Ritsu taps 'study' AND 'pass-this-exam-Friday'. Friday's exam wins: urgency sky-high, scope wide, recurring every term — so lead with the deadline, not generic mastery.  
**When:** At the very start, before writing a word — to choose which existing desire to channel (copy directs desire, it cannot create it).  
*Sources: breakthrough-advertising-schwartz*

#### `reciprocity-give-first` — Reciprocity Give-First  ·  Σ 36  ·  fits: email, landing-page, ad, newsletter, social-post, blog
**Structure:** 1) Give something genuinely useful and unrequested FIRST. 2) Make the gift feel meaningful, unexpected, and customized. 3) Only after the gift lands, make the ask — which now rides an obligation to repay.  
**How to apply:** Lead the piece with the value — a free worked solution, a study plan, a cheat-sheet — delivered with no strings, THEN make the request. The #1 failure mode is asking before giving, or making the 'gift' obviously a sales prop (a coupon is not a gift); the gift must feel like a favor, not a transaction, or the rule doesn't fire.  
**Example:** 'Here's a free 3-day exam cram plan for your bio final — no signup. Want Ritsu to auto-build one from your actual textbook?'  
**When:** Any time you need a conversion (signup, upgrade, share) and have a free asset you can hand over before asking.  
*Sources: influence-cialdini*

#### `commitment-consistency-ladder` — Commitment & Consistency Ladder  ·  Σ 36  ·  fits: email, landing-page, product-description, tutorial, course, social-post
**Structure:** 1) Secure a tiny initial commitment (foot-in-the-door). 2) Make it active, public, and effortful where possible. 3) Frame it as a freely-chosen self-image. 4) Escalate to the larger ask the reader now wants to stay consistent with.  
**How to apply:** Ask for something trivial first (answer one question, set one goal aloud), because that small act quietly rewrites the reader's self-image. The #1 lever is making the first commitment ACTIVE + PUBLIC + EFFORTFUL + freely chosen — a commitment that's written, said out loud, or worked for 'grows its own legs' and self-perpetuates without further pressure.  
**Example:** 'Tap to declare your goal: I'm a person who studies daily. Now Ritsu sends one quiz a day to keep that true.'  
**When:** Onboarding, habit-forming products, and any funnel where the real goal is a sustained behavior, not a one-time click.  
*Sources: influence-cialdini*

#### `social-proof-similar-many` — Social Proof of the Similar-Many  ·  Σ 36  ·  fits: landing-page, ad, social-post, email, product-description, review, blog
**Structure:** 1) State, concretely, how many people are already doing the desired behavior. 2) Make those people maximally SIMILAR to the reader. 3) Imply the behavior is the normal, correct thing to do.  
**How to apply:** Replace vague claims with a specific count of PEERS performing the exact behavior ('most students like you…'), because people copy the many, especially the similar many, when unsure. The #1 discipline is that the proof must be REAL and similar — faked or generic proof ('thousands love it!') breeds distrust, and proof from dissimilar others barely moves the reader.  
**Example:** 'Most pre-med students who quizzed daily for 7 days passed their first exam. Join the 4,200 who study this way on Ritsu.'  
**When:** When the reader is uncertain and you can cite real numbers of similar others taking the action.  
*Sources: influence-cialdini*

#### `authority-credible-expert` — Authority Credible-Expert Frame  ·  Σ 36  ·  fits: blog, article, tutorial, landing-page, research, paper, email, video-script
**Structure:** 1) Establish a credible source up front (credentials, evidence, the science). 2) Distinguish being 'an authority' (genuine expertise) from merely 'in authority' (a title). 3) Add an honest, trust-building limitation to make the authority believable.  
**How to apply:** Front-load real evidence of expertise (cite the study, name the mechanism, show the credential) so the reader can defer to a legitimate authority instead of guessing. The strongest move is pairing the authority claim with an honest admission of a limit — a credible expert who concedes a weakness is trusted far more than one who claims perfection.  
**Example:** 'Spaced repetition is the most replicated finding in memory science (Ebbinghaus, 1885 → 100+ years of studies). It won't make studying fun — but it works.'  
**When:** Explaining a method, a claim, or a 'why this works' — anywhere credibility decides whether the reader believes you.  
*Sources: influence-cialdini*

#### `mechanization` — Mechanization (Name → Describe → Feature the Mechanism)  ·  Σ 35  ·  fits: landing-page, ad, email, product-description, blog, tutorial
**Structure:** Answer the reader's silent 'How does it work?' at one of three depths set by market sophistication: NAME the mechanism (reader already knows it — just label it, compete on price); DESCRIBE it (Promise → Reason-Why one-two punch; sell the mechanism as hard as the claim); or FEATURE it (the mechanism is so dramatic it becomes the headline itself, making a tired claim believable again).  
**How to apply:** Don't ask whether to give a mechanism — ask how much, gauged by how saturated the market is; when claims are exhausted, a fresh believable mechanism is what reopens the field. The #1 discipline is that mechanism copy is still SELLING copy: load every line with promise and emotion, never let it become dull scientific discourse.  
**Example:** 'Why this works: active recall forces your brain to retrieve the answer — and retrieval, not re-reading, is what burns a fact into long-term memory.'  
**When:** Whenever the reader thinks 'Oh yeah? How?' — to convert a desired result into a believed, deliverable result.  
*Sources: breakthrough-advertising-schwartz*

#### `redefinition` — Redefinition (Concept-Judo)  ·  Σ 35  ·  fits: landing-page, ad, email, blog, product-description, faq
**Structure:** Spot the drawback that repels the prospect (too hard / too trivial / too expensive), then redefine it: (a) Simplification — recast a scary task in smaller familiar terms; (b) Escalation — broaden the benefit so the product feels essential; (c) Price-reduction — switch the comparison to a more expensive standard so your price feels cheap; or (d) Flip-flop — turn the very liability into the proof.  
**How to apply:** Don't argue the objection head-on; give the thing a new definition so the objection dissolves before the reader names it — the flip-flop ('this rather than that') is strongest when available, otherwise lead the reader to the new definition step by step. The #1 discipline: redefine the whole frame BEFORE you bring in the product, because 'innovation without acceptance is valueless'.  
**Example:** Reframe study from a chore to leverage: 'You're not memorizing 400 pages — you're drilling the 25 ideas that 90% of the exam is built on.'  
**When:** When a real objection — difficulty, narrow appeal, or price — will kill the sale before the benefit lands.  
*Sources: breakthrough-advertising-schwartz*

#### `scarcity-loss-frame` — Scarcity Loss-Frame  ·  Σ 35  ·  fits: email, ad, landing-page, social-post, product-description
**Structure:** 1) Name what the reader stands to LOSE (not gain) by not acting. 2) Make the loss concrete and time-bound (a deadline, limited slots, expiring access). 3) Heighten with genuine uncertainty or competition where it truly exists.  
**How to apply:** Reframe the benefit as an impending loss and attach a real boundary, because loss aversion makes people fight harder to avoid losing than to gain the identical thing. The non-negotiable discipline is authenticity — manufactured fake urgency, once detected, destroys trust permanently; frame as 'what you lose', not 'what you save'.  
**Example:** 'Your exam is in 3 days. Every day you don't start a quiz cycle is a topic you won't have time to master. The window is closing, not opening.'  
**When:** Driving action now rather than later — but only when the scarcity is real.  
*Sources: influence-cialdini*

#### `rejection-then-retreat` — Rejection-Then-Retreat (Door-in-the-Face)  ·  Σ 34.5  ·  fits: landing-page, email, ad, product-description, social-post
**Structure:** 1) Open with a larger request you expect to be declined. 2) After the refusal, 'retreat' to the smaller request you wanted all along. 3) The concession triggers a reciprocal concession AND makes the real ask look small by contrast.  
**How to apply:** Anchor with the big version first (the full course, the annual plan, the 60-minute commitment), let the reader mentally decline, then present the modest real ask as a step-down. The #1 discipline is that the first request must be large but not absurd — an unreasonable opener kills credibility and forfeits the reciprocal-concession effect.  
**Example:** 'Master the whole textbook this month? Big. Start with just one chapter's quiz tonight — 5 minutes.'  
**When:** Pricing and offer copy where you want the target tier or commitment to feel like a bargain or a reasonable middle.  
*Sources: influence-cialdini*

#### `unity-one-of-us` — Unity One-of-Us Framing  ·  Σ 34.5  ·  fits: social-post, thread, email, landing-page, ad, blog, newsletter
**Structure:** 1) Invoke a shared identity ('one of us'), not mere similarity ('like us'). 2) Use the reader's in-group language, references, and category. 3) Position the product as something the tribe does together.  
**How to apply:** Write from inside the reader's tribe — use their exact slang, name their shared category (pre-meds, CS majors, MCAT-takers), and frame the action as what 'we' do. The key distinction is shared IDENTITY over surface similarity; the failure mode is generic 'people like you' language that signals you're an outsider looking in.  
**Example:** 'Fellow med students: we don't cram, we master. Ritsu is how our cohort turns Robbins into recall.'  
**When:** Community-driven copy and audience-specific content where belonging is the motivator.  
*Sources: influence-cialdini*

#### `concentration-bad-good` — Concentration (Bad/Good Interweave)  ·  Σ 34  ·  fits: landing-page, blog, ad, email, review, comparison-x-vs-y
**Structure:** Destroy the alternative ways the reader could satisfy the desire, either: (A) point-by-point — old weakness, your strength; old weakness, your strength across each factor; or (B) time-sequence — narrate the reader's recurring failure with the old way, then introduce your product as the antidote. End by returning to promise copy, now far more powerful.  
**How to apply:** Iron rule: never attack a weakness unless you supply the cure in the same breath — a one-sided attack reads as biased and breeds dislike. Frame every criticism as being for the reader's own good, and use parallel sentence structure to sharpen each contrast.  
**Example:** 'Re-reading highlights it and feels productive — but you forget 70% in a week. A 5-minute self-quiz feels harder, and it makes the same facts stick for months.'  
**When:** When you must crack an incumbent's hold or break a loyalty — especially with a smaller budget against a dominant competitor.  
*Sources: breakthrough-advertising-schwartz*


### Social  (1)

#### `hermit-crab-content` — Hermit Crab Content  ·  Σ 34.5  ·  fits: blog, social-post, newsletter, presentation, ad, thread, video-script
**Structure:** 1) Pick a familiar, ready-made format ('shell') your audience instantly recognizes — recipe, Rx prescription, magazine profile, game show, dating profile, instruction manual. 2) Move your own message or story into that shell. 3) Keep the borrowed format's conventions so the contrast is the delight. 4) Deliver real utility inside the shell.  
**How to apply:** Borrow a shell from outside marketing and pour your story in, matching the shell's tone exactly so the juxtaposition lands. The #1 discipline is that the shell must genuinely fit the message and still carry utility — novelty alone, with no payoff, is a gimmick.  
**Example:** A Ritsu study guide written as a cooking recipe: 'Ingredients: 1 messy PDF, 20 min. Method: upload, let it preheat into a quiz, serve flashcards warm.'  
**When:** When a topic is dry or over-familiar and you want stop-the-scroll novelty without a big budget.  
*Sources: everybody-writes-handley*


### Blog & article  (2)

#### `lede-kicker` — Lede + Kicker (Open With a Punch, Close With a Kick)  ·  Σ 37  ·  fits: blog, article, newsletter, essay, email, speech, social-post
**Structure:** OPENINGS (pick one): put the reader in a scene · articulate their pain · set a stage · ask a question the piece answers · open with a surprising stat · offer a curious POV · tell a personal anecdote · use an analogy · start with a quote · the fake-out swerve. CLOSINGS (pick one): recast the biggest takeaway · point to the next resource · add a tonal surprise · let an interviewee have the last word — always with a sense of completion and (if apt) a CTA.  
**How to apply:** Spend disproportionate love on line one and the last line — 'a good lede invites you to the party and a good kicker makes you wish you could stay longer'. The #1 discipline is never trailing off or ending on the lazy 'So what do you think?', and using the question-lede sparingly so you don't sound like an infomercial.  
**Example:** Lede (pain): 'It's 11pm. You have 200 pages of bio to know by 8am and no idea where to start.' Kicker (recast + CTA): 'Tomorrow you'll walk in ready. Drop your file in Ritsu tonight.'  
**When:** The first and last sentences of any piece — the two highest-leverage lines you'll write.  
*Sources: everybody-writes-handley*

#### `fifteen-angles` — Fifteen Angles to Frame a Piece  ·  Σ 35  ·  fits: blog, article, thread, newsletter, social-post, video-script, course, article-series
**Structure:** Choose a structural angle for the SAME topic: Quiz · Skeptic · Explainer (plain English) · Case study · Contrarian · How-to · Quick how-to · How NOT to · First person · Comparison · Q&A · Data · Influencers · Outrageous · Insider secrets · Literary treatment.  
**How to apply:** Hold the topic fixed and rotate the frame — the format often suggests the organization. The #1 discipline is picking the ONE angle that best serves the reader's need right now (a listicle fails when someone needs to learn how your product works); use the list to multiply one idea into a content cluster.  
**Example:** Topic 'spaced repetition' → Explainer ('Spaced Repetition in Plain English'), How-to ('5 Steps to a Routine'), Contrarian ('Why Cramming Beats Spacing — Sometimes'), Data, Quiz.  
**When:** Topic-ideation, when one subject must become many pieces, or when a draft feels generic and needs a sharper frame.  
*Sources: everybody-writes-handley*


### Story & narrative (McKee · King · Heath)  (13)

#### `story-gap-loop` — The Story Gap (Expectation vs Result)  ·  Σ 40  ·  fits: blog, story, video-script, email, social-post, thread, landing-page, essay, speech, article
**Structure:** 1) Character wants something and takes the minimal action they believe will get it. 2) The world reacts more powerfully or differently than expected. 3) A GAP cracks open between expectation and result. 4) Now at greater risk, they take a second, harder action. 5) Repeat, each gap widening, to the climax.  
**How to apply:** For each beat, name what the reader or character expects, then make reality contradict it; the surprise (the gap) is what compels the next read. The #1 failure mode is the 'non-event' — activity with no gap, where expectation and result match — so if a paragraph merely confirms what the reader already assumed, collapse it or invert it.  
**Example:** You think rereading the chapter means you know it. Then the first quiz question stumps you. That gap — felt-mastery vs real-mastery — is why Ritsu exists.  
**When:** Any narrative beat, hook, or sequence that needs to feel alive instead of flat — the universal engine of attention.  
*Sources: story-mckee*

#### `inciting-incident-upset` — Inciting Incident — Upset the Balance  ·  Σ 39  ·  fits: blog, article, story, video-script, email, newsletter, landing-page, speech, essay, social-post
**Structure:** 1) Open on a life in relative balance. 2) A single decisive event swings the value-charge sharply positive or negative. 3) The protagonist FEELS life is now out of balance. 4) They form an object of desire to restore it. 5) They actively pursue it. If a setup is needed, pay it off fast — don't strand the reader.  
**How to apply:** Lead with the dynamic event that breaks equilibrium, not with throat-clearing context, and make sure the reader immediately senses what's now at stake. The #1 discipline is that it must be a real, concrete upset (not 'I felt bored'); if a setup precedes the payoff, don't let life-as-usual fill the gap between them.  
**Example:** Your exam is Friday. You just opened the 300-page textbook for the first time. The balance of your week just broke — and that's the only sentence the intro needs.  
**When:** The opening of any piece — to hook in the first lines by knocking the reader's world off balance instead of easing in.  
*Sources: story-mckee*

#### `controlling-idea` — Controlling Idea (Value + Cause)  ·  Σ 38.5  ·  fits: blog, essay, article, video-script, speech, memo, report, presentation, newsletter, book
**Structure:** 1) Identify your piece's primary VALUE and its final charge (e.g. mastery, positive). 2) Identify the CAUSE — the chief reason it ended on that charge. 3) Compress to ONE sentence: '<Value> <result> BECAUSE <cause>'. 4) Use that sentence to judge every section — keep what expresses it, cut what's irrelevant.  
**How to apply:** Write the meaning as a full sentence, never a topic word ('mastery' is a setting, not a theme), and name the Cause, because the Value half alone is only half the meaning. The #1 discipline is one idea only — the more ideas you cram in, the more they implode into 'a rubble of tangential notions, saying nothing'.  
**Example:** Controlling idea of the post: 'Real understanding sticks BECAUSE the learner did the active work, not because the material was explained well.' Every paragraph must serve that.  
**When:** Before drafting anything with a thesis — to lock the single irreducible meaning that governs all keep/cut decisions.  
*Sources: story-mckee*

#### `three-inspirational-plots` — Three Inspirational Plots (Challenge / Connection / Creativity)  ·  Σ 37  ·  fits: blog, social-post, email, video-script, presentation, story, speech, newsletter, course
**Structure:** Pick the plot to the emotion you want: CHALLENGE (underdog beats a daunting obstacle → makes readers want to try harder); CONNECTION (a relationship bridges a gap → makes readers want to help or belong); CREATIVITY (a mental breakthrough cracks a stuck problem → makes readers want to innovate). Then tell a real one with a visible goal and a real barrier.  
**How to apply:** Match plot to intended action (kickoff → Challenge; community → Connection; ideation → Creativity), and ensure the obstacle genuinely seems daunting — a barely-stretched protagonist doesn't inspire. The #1 discipline is that spotting a real story beats inventing one; the plot is a lens for finding the story already in your material.  
**Example:** To motivate exam-week grit, tell a Challenge plot: the failing-physics student who used daily self-quizzing to climb from a D to an A in five weeks.  
**When:** You need a short true story that energizes the reader toward a specific action or mindset.  
*Sources: made-to-stick-heath*

#### `value-charge-turn` — The Value-Charge Turn (No Scene That Doesn't Turn)  ·  Σ 37  ·  fits: blog, essay, article, tutorial, report, video-script, newsletter, memo, presentation, book
**Structure:** 1) At the top of a section, name the value at stake and its charge (+/−). 2) At the end, name the same value's charge. 3) If the charge is unchanged, the section is a 'non-event' → cut it or fold its info elsewhere. 4) If it flipped, you have a true scene.  
**How to apply:** For every chunk, ask 'what value did I move, from what charge to what charge?' — the same note at both ends means it exists only to deliver information and should be cut or woven in. The #1 discipline is honesty: 'activity' (talking, describing) is not 'action' (change); every kept section must earn its place by turning something.  
**Example:** Intro section opened at 'this feels impossible' and closed at 'this feels impossible' — non-event, cut. Keep only sections that move the reader from doubt to traction.  
**When:** The editing pass on any multi-section piece — to ruthlessly delete sections where nothing actually changes.  
*Sources: story-mckee*

#### `rudolph-customer-as-hero` — Rudolph Framework (Customer-as-Hero Fill-in-the-Blank)  ·  Σ 37  ·  fits: blog, landing-page, video-script, presentation, press-release, social-post, story, case-study-blog
**Structure:** 1) Once upon a time there was ___ (your product). 2) It has the capacity to ___ (its superpower). 3) Some people doubt it because ___ (the objection). 4) But one day ___ (the inciting 'foggy Christmas Eve' event — why now). 5) Which means ___ (your customer now needs it). 6) For ___ (whom the customer serves). 7) And that matters because ___ (how the CUSTOMER becomes the hero). 8) Someone gets a kiss (the payoff).  
**How to apply:** Fill the eight blanks, then audit: the product is Rudolph, but the CUSTOMER is Santa — give the customer the credit for the win. The #1 discipline is finding the 'foggy Christmas Eve' (the why-now incident that makes the problem urgent) and resisting making your product the hero.  
**Example:** Once there was Ritsu → it turns any file into a tutor → doubters say 'AI spits out generic quizzes' → but one day finals week hits → a panicking student must master 200 pages fast → and that matters because she passes and keeps her scholarship (student = hero).  
**When:** Telling a product or brand story where you must make the customer — not the product — the hero, especially for 'boring' or technical offerings.  
*Sources: everybody-writes-handley*

#### `six-elements-marketing-story` — Six Elements of a Marketing Story  ·  Σ 37  ·  fits: blog, press-release, presentation, video-script, landing-page, speech, story, case-study-blog
**Structure:** A compelling story is: 1) True (real people, real data, cited sources). 2) Human (about how it improves actual people's lives — ideally one person). 3) Original (a fresh perspective only you can give). 4) Customer-as-hero (what you do FOR others, not what you do). 5) Emotionally moving. 6) Strategy-aligned (grows from positioning, value, and goals) — but put strategy LAST.  
**How to apply:** Score the draft against all six; a story missing any one is weaker. The #1 discipline is order — 'start with people, infuse with emotion, align with strategy', because leading with strategy makes the story read like an instruction manual; use the logo-cover test for 'original'.  
**Example:** A Ritsu student-success story: true (real grade jump) · human (one named learner) · original · student-as-hero · emotional (relief on results day) · strategy (proves the mastery promise) — strategy stated last.  
**When:** As a pre-publish checklist / quality gate on any brand or product narrative before it ships.  
*Sources: everybody-writes-handley*

#### `forces-of-antagonism` — The Principle of Antagonism  ·  Σ 36.5  ·  fits: story, blog, video-script, essay, speech, landing-page, ad, article, case-study-blog
**Structure:** 1) Identify the positive value your protagonist or argument carries. 2) Map the full opposing forces: the Contrary (mildly negative), the Contradictory (direct opposite), and the Negation of the Negation (doubly negative — worse than the opposite). 3) Make those forces strong enough that success looks like an underdog's chance. 4) The stronger the antagonism, the more compelling the win.  
**How to apply:** Put the energy into the negative side — weak obstacles make a dead piece — and spell out the real difficulty (the 300 pages, the 3-day deadline, the fear of failing) before the solution lands. The #1 discipline is not letting your protagonist win easily: 'a protagonist can only be as compelling as the forces of antagonism make them'.  
**Example:** Don't write 'studying is easy with Ritsu.' Write: the exam is Friday, the chapter is dense, you procrastinated, you're sure you'll fail — THEN the first quiz lands. The harder the wall, the bigger the win.  
**When:** Whenever a story, case study, or argument feels weak — strengthen the opposition, not the hero.  
*Sources: story-mckee*

#### `crisis-dilemma` — The Crisis Dilemma  ·  Σ 35.5  ·  fits: story, blog, video-script, email, speech, essay, report, presentation, case-study-blog
**Structure:** 1) Build pressure until the protagonist faces a genuine dilemma — two desirable things they can't both have, OR two bad options they must choose between. 2) Hold the decision as a deliberate, static moment (don't skip it). 3) The choice defines character. 4) That choice detonates into the climax.  
**How to apply:** Make sure the choice is between real values, not right-vs-wrong (a no-brainer isn't a crisis), and freeze the moment so the reader leans in — 'what will they do?' The #1 failure mode is skimming the decision or resolving it by luck; the dilemma IS the drama, so dramatize the deciding, then cut straight to the consequence.  
**Example:** Cram-study case: she could reread everything (safe, shallow) or quiz herself on what she's avoiding (painful, real). She chose the quiz. That choice is the whole story.  
**When:** Any narrative, case study, or persuasive arc that needs a true turning point — a forced choice, not a convenient win.  
*Sources: story-mckee*

#### `what-if-engine` — The What-If Situation Engine  ·  Σ 35.5  ·  fits: story, video-script, course, tutorial, blog, essay, screenplay, podcast-script
**Structure:** 1) Pose a single What-if question that puts a character in a predicament. 2) State it in one sentence (a person + a predicament). 3) Drop in flat, unfeatured characters. 4) Begin narrating and watch how they try to work free — do NOT pre-plot the escape. 5) Let incidents arise organically from the situation.  
**How to apply:** Compress your premise to a one-sentence 'What if ___?' that contains a person and a predicament, then write forward from the situation instead of outlining the ending. The #1 failure mode is reaching for plot (the 'jackhammer') to force events — trust the situation to generate the incidents, and if you're manipulating characters to a pre-decided outcome, put the jackhammer down.  
**Example:** What if a confident pre-med student aced every practice quiz but blanked cold the morning of the real MCAT? Write the hour she discovers why.  
**When:** Generating a story, scenario, case, or worked example from scratch when you have no plot yet.  
*Sources: on-writing-king*

#### `reveal-character-by-behavior` — Reveal Character by Behavior, Not Label  ·  Σ 34.5  ·  fits: story, video-script, course, tutorial, essay, screenplay, review, bio
**Structure:** 1) Decide what the audience should conclude about a character. 2) Refuse to state it. 3) Stage one concrete action or line of speech that lets them infer it. 4) Give even the antagonist their own self-justifying point of view. 5) Trust the reader to draw the conclusion.  
**How to apply:** Replace every 'X was lazy/brilliant/depressed' with a depicted behavior the reader decodes themselves — 'if I have to tell you, I lose'. The #1 discipline is writing antagonists from the inside: a character who 'seems perfectly sane and reasonable to herself' is far more real than a cackling cartoon, and talk is sneaky — what people say betrays character they don't intend to reveal.  
**Example:** Don't write 'Sam was a procrastinator.' Show Sam reorganizing his color-coded notes for the third time the night before the final, having opened the textbook zero times.  
**When:** Building any persona, character, or 'voice' in narrative content — protagonist, learner, villain, or customer.  
*Sources: on-writing-king*

#### `few-well-chosen-details` — Few Well-Chosen Details (Finish in the Reader)  ·  Σ 34  ·  fits: story, blog, essay, video-script, tutorial, course, speech
**Structure:** 1) Visualize the place or thing; open all senses. 2) Capture the first 3-4 details that surface. 3) Write only those — stop. 4) Let the reader supply the rest. 5) Cut description further if it isn't load-bearing for the piece.  
**How to apply:** Run a brief, intense recall of the scene and write down the first few sensory details, because 'description begins in the writer's imagination but should finish in the reader's'. The #1 failure mode is over-description — describing the loser pimple-by-pimple freezes out the reader's own image and breaks the bond; locale and texture beat a head-to-toe inventory.  
**Example:** Set the exam hall in three strokes — the squeak of chairs, the smell of pencil shavings, one fluorescent tube flickering — and let the reader feel their own test-day dread.  
**When:** Any scene-setting or concrete illustration where you must evoke a place, object, or person quickly without stalling momentum.  
*Sources: on-writing-king*

#### `graceful-back-story` — Graceful Back Story  ·  Σ 33.5  ·  fits: story, tutorial, course, video-script, essay, blog, research-paper, screenplay
**Structure:** 1) Identify the prior events that actually affect the present action. 2) Get them in fast — but with grace, never an info-dump. 3) Prefer a revealing gesture over an expository line. 4) Keep research 'in the back'. 5) Cut the parts your ideal reader found dull.  
**How to apply:** Two rules govern: 'everyone has a history, and most of it isn't very interesting' — so include only the parts that bear on the front story, and dramatize instead of announcing. The #1 discipline is pushing research and exposition as far into the background as you can; the reader cares about the character, not the facts you learned.  
**Example:** Don't open with 'You should already know derivatives.' Show the learner reaching for a half-remembered rule, getting it slightly wrong, and self-correcting — the prerequisite surfaces in motion.  
**When:** Weaving necessary context (history, prerequisites, prior research) into a forward-moving narrative without stalling it.  
*Sources: on-writing-king*


### Screenwriting (Snyder · McKee)  (8)

#### `what-is-it-logline` — The What-Is-It Logline (4 Components)  ·  Σ 36  ·  fits: blog, article, video-script, landing-page, ad, email, social-post, course, story, screenplay
**Structure:** A one- or two-sentence grabber carrying all four: (1) Irony — an ironic, emotionally involving hook; (2) a compelling mental picture that blooms in the mind, usually with a time frame; (3) audience & cost — the tone and who it's for is implied; (4) a killer title that says what it is, cleverly.  
**How to apply:** Write the one-line FIRST, then pitch it to real strangers and adjust until their eyes light up — if you can't say what it is in one line, you haven't thought it through. The #1 discipline is leading with the irony and the mental picture, not the plot; the failure mode is describing everything it's NOT instead of what it is.  
**Example:** 'A student has 3 days to master a 200-page chapter — and only a stack of flashcards an AI built in 30 seconds can save the grade.'  
**When:** Before writing anything long-form — to force clarity on what the piece IS and prove it's worth someone's attention.  
*Sources: save-the-cat-snyder*

#### `blake-snyder-beat-sheet` — Blake Snyder Beat Sheet (15 Beats)  ·  Σ 35  ·  fits: story, screenplay, film-script, novel, video-script, course, article-series, essay
**Structure:** 15 beats on a fixed page-map: Opening Image · Theme Stated · Set-Up (+ '6 things that need fixing') · Catalyst · Debate · Break into Two · B Story · Fun and Games ('promise of the premise') · Midpoint (false peak/false collapse) · Bad Guys Close In · All Is Lost (+ 'whiff of death') · Dark Night of the Soul · Break into Three · Finale · Final Image (opposite of Opening).  
**How to apply:** Fill every beat in ONE sentence before drafting — if you can't, you don't have the beat yet, you're guessing. The #1 discipline is making Opening and Final Image exact opposites (proof change happened) and the Midpoint and All-Is-Lost inverses of each other; the failure mode is a light Act Three or a hero who drifts in instead of choosing.  
**Example:** A confident crammer (Image) bombs a mock exam (Catalyst), abandons rereading for active recall (Break into Two), blanks the night before (All Is Lost), then aces it (Final Image).  
**When:** Plotting or auditing any long narrative so it has momentum, a turning midpoint, a real low point, and visible transformation.  
*Sources: save-the-cat-snyder*

#### `pope-in-the-pool` — The Pope in the Pool (Bury Exposition Under a Spectacle)  ·  Σ 35  ·  fits: tutorial, video-script, blog, article, product-description, faq, podcast-script, course, presentation
**Structure:** When you must deliver dull but necessary backstory or explanation, stage it behind something visually or comically arresting, so the audience absorbs the information while watching the distraction.  
**How to apply:** Pair the boring exposition with an engaging foreground (a striking image, a running gag, a relatable predicament) so the facts land without the reader noticing they're being taught. The #1 discipline is that the distraction must be genuinely interesting, not filler; the failure mode is 'talking the plot' — flatly reciting information no one would say aloud.  
**Example:** Teach how spaced repetition schedules cards while narrating a student who keeps 'just one more rep'-ing past her bus stop — the algorithm lands painlessly.  
**When:** Any moment heavy explanation threatens to stall the piece — setup, technical detail, terms-and-conditions, mechanism-of-action.  
*Sources: save-the-cat-snyder*

#### `is-it-primal` — Is It Primal? (Anchor Every Motive to a Survival Drive)  ·  Σ 35  ·  fits: ad, landing-page, email, blog, video-script, speech, essay, social-post, product-description, story
**Structure:** Test every goal against caveman-level drives: survival, hunger, mating, protection of loved ones, fear of death, revenge. Whatever the surface topic, the engine underneath must be one of these.  
**How to apply:** Ask 'would a caveman get it?'; if the stakes are intellectual, re-root them in a primal need until the reader feels them in the gut. The #1 discipline is not flattering your topic as 'too sophisticated' for this — at its core it must resonate at a caveman level; the failure mode is high-falutin' stakes no one viscerally cares about.  
**Example:** Reframe 'improve retention' as 'don't fail the exam that decides your future' — fear and protection, not metrics, drive the reader.  
**When:** When a piece feels abstract, cerebral, or fails to connect — and to make it travel across cultures.  
*Sources: save-the-cat-snyder*

#### `save-the-cat-likeability` — Save the Cat (Earn Allegiance Early)  ·  Σ 34.5  ·  fits: story, screenplay, blog, bio, landing-page, email, video-script, speech, essay, case-study-blog
**Structure:** In the opening, show the protagonist do something that gets the audience in sync with them and rooting for the win. Adjuncts: (a) when the lead is damaged or unlikable, make their antagonist worse; (b) it need not be literal — just frame the hero's plight so we care.  
**How to apply:** Give the protagonist an early action that reveals decency, courage, or relatable need so readers choose to be 'with' them, OR raise a worse antagonist to tilt sympathy. The #1 discipline is not assuming we'll like your hero 'just cuz' — take the reader's hand every time; the failure mode is a competent-but-charmless lead the audience never bonds with.  
**Example:** Open a study case-study with the learner generously tutoring a struggling friend at midnight — now readers root for her exam win.  
**When:** Whenever a reader must invest in a person, brand, or narrator — opening lines of stories, case studies, founder bios, sales pages.  
*Sources: save-the-cat-snyder*

#### `the-board` — The Board (Plan in Movable Cards)  ·  Σ 34  ·  fits: course, tutorial, article-series, video-script, report, proposal, book, screenplay, presentation
**Structure:** A 4-row grid (Act 1 / first half of Act 2 to Midpoint / Midpoint to Break-into-Three / Act 3), ~9-10 cards per row ≈ 40 scenes. Place the burning set-pieces first, nail the major turns (Midpoint → its inverse All-Is-Lost → Break-into-Three), then fill the rest. Tag every card with +/- (emotional shift) and >< (conflict).  
**How to apply:** Lay scenes or sections on movable cards so you can test order cheaply (easier to move a card than kill a paragraph you love), then strip to ~40 by folding redundant beats. The #1 discipline is that every card must carry one +/- and one >< or the scene has no point; the failure mode is a perfect Board that becomes procrastination.  
**Example:** Outline a 4-module course as 40 cards; spot that Module 3 ('practice') is empty — your 'black hole' — before writing a single lesson.  
**When:** Before drafting any structured piece — to SEE the whole shape, find black holes, and balance sections without committing words.  
*Sources: save-the-cat-snyder*

#### `genre-by-dna` — Genre by DNA (Find the Type Most Like Yours)  ·  Σ 33.5  ·  fits: blog, article, video-script, course, story, screenplay, essay, podcast-script, presentation
**Structure:** Classify by structural/emotional engine, not surface label: Monster in the House · Golden Fleece (road/quest) · Out of the Bottle (wish/magic) · Dude with a Problem · Rites of Passage · Buddy Love · Whydunit · The Fool Triumphant · Institutionalized (groups) · Superhero. Each type carries its own built-in rules.  
**How to apply:** Name which of the 10 types your piece IS, then study a dozen of the best examples of that type to steal what works and spot the clichés to break. The #1 discipline is picking ONE type and honoring its rules ('the same thing, only different'); the failure mode is copying surface features of two hits and hoping ('it's X-Men meets Cannonball Run').  
**Example:** Frame an exam-prep guide as 'Dude with a Problem' (ordinary student, sudden high-stakes deadline) so it inherits a ticking clock and rooting interest.  
**When:** At the start of any piece — to find the proven template most like what you're making and study its rules before you write.  
*Sources: save-the-cat-snyder*

#### `emotional-color-wheel` — Emotional Color Wheel (Never Play One Note)  ·  Σ 33.5  ·  fits: blog, article, video-script, newsletter, story, speech, podcast-script, essay, course
**Structure:** Deliberately cycle the full palette of emotions across a piece — laughter, fear, longing, frustration, near-miss anxiety, triumph — instead of staying all-funny or all-tense. Audit for missing 'colors' and re-tone existing sections to supply them.  
**How to apply:** List the emotions you're hitting, find the gaps, then take an existing beat and replay it for a missing color — keep the same action and conflict, change the feeling. The #1 discipline is variety: a roller-coaster wrings the reader out and leaves them satisfied; the failure mode is one-note (all drama, all jokes).  
**Example:** In an exam-prep article, follow a panic passage with a quiet pride moment and a dry-humor study tip — the reader rides the curve, not a flat line.  
**When:** When a long piece feels flat or monotone, even if each part is individually competent.  
*Sources: save-the-cat-snyder*


### Style & clarity (Williams · Pinker · Zinsser · Strunk · King)  (17)

#### `cut-pass-concision` — Cut Pass (Omit Needless Words)  ·  Σ 40  ·  fits: blog, article, email, memo, report, landing-page, product-description, newsletter, essay, social-post, ad, tutorial
**Structure:** 1) Finish the draft. 2) Go sentence by sentence asking 'does every word do new work?' 3) Delete: dead words (actually, basically, very, really), doubled pairs (each and every), inferable modifiers (future plans), 'the fact that', who-is/which-was relatives, and adverbs the verb already implies. 4) Replace phrases with one word (due to the fact that → because). 5) Set a hard quota — cut at least 10% (often 50% on a first draft) while keeping story and flavor.  
**How to apply:** Treat it as deletion against a quota, not optional polishing — re-read each sentence rather than skim, because you believe your draft is already tight when it is not. The #1 discipline is killing preciousness: the phrase you most want to protect because it's 'beautiful' is usually the first to cut.  
**Example:** 'In the final analysis, students should utilize active recall in order to facilitate retention.' → 'Use active recall to remember more.'  
**When:** The tightening pass on any draft that feels bloated, padded, or 'written'.  
*Sources: on-writing-well-zinsser, on-writing-king, style-clarity-grace-williams, elements-of-style-strunk-white*

#### `classic-style-window` — Classic Style (Window onto the World)  ·  Σ 39  ·  fits: blog, tutorial, article, essay, course, newsletter, landing-page, email, faq
**Structure:** 1) Fix the truth you can already see before writing — you are showing, not figuring out. 2) Cast the idea as concrete objects and people DOING things a reader could watch. 3) Orient the reader's gaze as one equal pointing something out to another in conversation. 4) Trust the reader to connect the dots — no spelling out every step. 5) Present, don't hedge or argue.  
**How to apply:** Rewrite each abstract sentence as 'a real actor does a visible thing', then read it as if pointing across a table to a friend ('As we have seen…', not 'This section demonstrates…'). The #1 discipline is killing metaconcepts and zombie nouns — if you can't 'see a perspective on the street', cut it and turn the -ance/-ment/-ation noun back into a verb.  
**Example:** Not 'The acquisition process involves spaced retrieval.' But 'You re-quiz yourself a day later, then a week later, and the fact sticks.'  
**When:** The default voice for explaining anything clearly — the strongest cure for academese and jargon.  
*Sources: sense-of-style-pinker*

#### `concrete-image-test` — Concrete-Image Test (See It, Feel It)  ·  Σ 39  ·  fits: tutorial, blog, explainer, course, video-script, presentation, article, faq, landing-page
**Structure:** 1) Read each sentence and ask: can the reader form a picture or feel a motion? 2) If it names an abstraction (a 'stimulus', an 'assessment'), replace it with the concrete thing it stands for (a tap on the arm, the word TRUE). 3) Prefer the specific over the generic ('the ivory chess set fell off the table' beats 'the set fell off'). 4) Keep idioms and imagery physically coherent so the reader's visual brain stays on.  
**How to apply:** Underline every abstract noun and ask 'could I point to one on the street?' — if not, swap in the seeable thing, because readers remember concrete language far better. The #1 failure mode is functional fixity: you name things by the role they play for you, not by how they'd look to the reader.  
**Example:** Not 'Learners exhibit retrieval failure under load.' But 'You blank on the formula the second the timer starts ticking.'  
**When:** Whenever explaining a concept, process, or finding that risks reading as gray abstraction.  
*Sources: sense-of-style-pinker, everybody-writes-handley*

#### `characters-as-subjects` — Characters→Subjects, Actions→Verbs  ·  Σ 38  ·  fits: blog, article, tutorial, email, report, essay, memo, proposal, landing-page, product-description, course
**Structure:** For each dense clause: 1) underline the first 7-8 words and flag two symptoms — an abstract noun as the subject, or 7+ words before the verb. 2) Name the real character (a person, then a concept) the sentence is about. 3) Find the action buried in a nominalization (an -tion/-ment/-ance noun made from a verb). 4) Make the character the subject and turn the buried action back into the main verb. Result: short concrete subject + specific action verb — every sentence a tiny story.  
**How to apply:** Run it mechanically — underline the openers, then ask 'who is doing what?' as in a fairy tale — because you know your own draft too well to feel its fog by ear. The #1 discipline is resisting the empty verb (is, has, makes, conducts) when a real action verb is hiding inside a noun ('made an improvement' → 'improved').  
**Example:** 'Our recommendation is the utilization of flashcards for vocabulary acquisition.' → 'We recommend you use flashcards to learn vocabulary.'  
**When:** Revising prose that reads dense, abstract, or 'academic' even when grammatically fine.  
*Sources: style-clarity-grace-williams, sense-of-style-pinker*

#### `translate-the-jargon` — Translate the Jargon (Calibrate to the Reader)  ·  Σ 38  ·  fits: tutorial, blog, article, course, video-script, faq, newsletter, presentation, social-post, landing-page, email, product-description
**Structure:** 1) List the jargon, abbreviations, and named concepts in your draft. 2) For each, ask: is this an entrenched chunk for THIS audience, or only for my clubhouse? 3) State the point once in precise field language, then immediately again in plain everyday words. 4) Spell out every coined abbreviation on first use. 5) When unsure, assume too little — bore a few experts rather than baffle the majority.  
**How to apply:** Blend formal and colloquial deliberately — state it professionally, then restate it bluntly — and make the everyday version FAITHFUL, not a dumbing-down that distorts. The #1 discipline is assuming readers are as smart as you but happen not to know what you know; clarity is not condescension, and the curse of knowledge hides the gap from you.  
**Example:** 'Ritsu auto-generates SRS decks from your PDF.' → 'Ritsu turns your PDF into flashcards that resurface right before you'd forget them (spaced repetition).'  
**When:** Explaining any specialized or abstract concept to a non-expert (the core EdTech job).  
*Sources: sense-of-style-pinker, they-say-i-say-graff*

#### `generative-analogy` — Generative Analogy & High-Concept Pitch  ·  Σ 38  ·  fits: tutorial, blog, presentation, course, product-description, video-script, article, essay
**Structure:** 1) Name the unfamiliar idea. 2) Find a schema the reader already owns (a thing, story, or product they know). 3) Map new-onto-known in a few words ('X = known-A meets known-B'). 4) Test that it's GENERATIVE — does the analogy keep yielding CORRECT inferences across cases, not just one? 5) Lead with it, then add the specifics it can't carry.  
**How to apply:** Borrow an existing schema instead of building one from scratch ('high concept': Die Hard on a bus). The #1 discipline is testing that the analogy generates RIGHT predictions across cases — a vivid-but-misleading metaphor that breaks on the second inference is worse than none.  
**Example:** Teach recursion as 'a set of Russian nesting dolls — each opens to a smaller identical doll until the tiniest, which opens to nothing (the base case).'  
**When:** Teaching a brand-new concept fast, or pitching a complex thing in one breath.  
*Sources: made-to-stick-heath*

#### `given-before-new-flow` — Given-Before-New Flow  ·  Σ 37  ·  fits: blog, article, tutorial, newsletter, report, essay, email, research, course, landing-page, paper
**Structure:** 1) Open each sentence with information the reader already has — a word from the previous sentence, or knowledge they bring. 2) End each sentence on the new, complex, or unfamiliar idea (the stress slot). 3) Let the new end of one sentence become the familiar start of the next, chaining the passage forward. 4) Use the passive deliberately when it is the only way to put old info first and new info last.  
**How to apply:** Manage word order at the seams: check that every sentence opens on something already met and closes on what's new, moving a fact's anchor first if it was 'hurled out of the blue'. The #1 discipline is dropping 'never use the passive' as absolute — the passive exists precisely to keep the familiar up front and the protagonist in the spotlight.  
**Example:** '…you earn a mastery badge. That badge unlocks the next module.' (badge ends sentence 1, opens sentence 2 — the reader glides.)  
**When:** When a passage reads choppy or 'disconnected' even though each sentence is individually clear.  
*Sources: style-clarity-grace-williams, sense-of-style-pinker*

#### `stress-position-emphasis` — Stress Position (End-Weight Emphasis)  ·  Σ 37  ·  fits: blog, article, tutorial, email, ad, landing-page, speech, presentation, essay, social-post, newsletter, thread
**Structure:** 1) Find the most important word or idea in the sentence (usually the new element). 2) Move it to the END — the position of prominence where the reader's voice naturally rises. 3) Strip trailing throat-clearing (qualifiers, attributions like 'studies suggest', stray prepositions) that would bury the payoff. 4) Build simplicity→complexity: short intro, short concrete subject, quick verb, heavy new material last. 5) Scale it up — end paragraphs and whole pieces on their strongest beat too.  
**How to apply:** Read aloud and hear where your voice lifts; if light words sit in that final slot, relocate the weighty word there. The #1 discipline is end-weight — 'this steel is used for razors because of its hardness' becomes 'because of its hardness, this steel is used for razors' so the payload word lands last.  
**Example:** Not 'Recall beats rereading, studies suggest.' Use 'Studies suggest one thing beats rereading: active recall.'  
**When:** Any sentence engineered to land — definitions, takeaways, claims, CTAs, the last line of a paragraph.  
*Sources: style-clarity-grace-williams, elements-of-style-strunk-white*

#### `parallelism-and-balance` — Parallelism & Climactic Balance  ·  Σ 36  ·  fits: speech, ad, landing-page, social-post, blog, presentation, press-release, essay, bio, tutorial, course, poetry
**Structure:** 1) Identify ideas of similar content and function (list items, steps, correlatives, a contrast). 2) Cast them in outwardly identical grammatical form. 3) Apply correlatives symmetrically (both…and, not…but, either…or). 4) For a line meant to be memorable, make coordinate parts echo in length and rhythm and load the final slot with the weightiest word. 5) Place the strongest of a parallel series last.  
**How to apply:** Make form match meaning: 'likeness of form lets the reader recognize the likeness of content', so resist the amateur urge to vary the form for freshness (varied form reads as timid or undecided). The #1 discipline is restraint — draft the plain version first; balance is a finishing move on the few load-bearing sentences, and over-applied it turns purple.  
**Example:** 'Upload it, master it, prove it.' — three parallel beats, strongest verb last.  
**When:** Lists, sequences, comparisons, and the few lines meant to be felt — headlines, taglines, openers, closers, speeches.  
*Sources: elements-of-style-strunk-white, style-clarity-grace-williams*

#### `topic-sentence-paragraph` — Topic-Sentence Paragraph  ·  Σ 36  ·  fits: blog, article, tutorial, essay, report, newsletter, course
**Structure:** 1) Open the paragraph with a topic sentence stating its single point. 2) Let the middle sentences develop it — restate, define terms, deny the converse, give examples, prove, or show consequences. 3) Close by re-emphasizing the topic sentence or stating an important consequence. 4) Never end on a digression or a trivial detail.  
**How to apply:** Write the claim first so the reader knows the paragraph's purpose as they begin, make every middle sentence serve it, then loop the ending back to the opening. The #1 failure mode is 'ending with a digression, or an unimportant detail' — guard the last sentence as hard as the first.  
**Example:** 'Spaced repetition beats cramming. Each review just before you'd forget strengthens recall. Cram and you re-read; space it and you remember — that is the whole difference.'  
**When:** Any expository or argumentative paragraph where the reader must grasp and retain the point.  
*Sources: elements-of-style-strunk-white*

#### `coherence-connectives` — Arcs of Coherence (Connective Discipline)  ·  Σ 36  ·  fits: essay, blog, article, report, tutorial, proposal, paper, review, course
**Structure:** 1) For each pair of adjacent sentences, name what the second does to the first: RESEMBLE (similarity, contrast, elaboration, example, exception), be CONTIGUOUS in time/place (sequence), or CAUSE/ENABLE/PREVENT. 2) Choose the connective that names that exact relation (and, but, because, so, for example, however). 3) For compare/contrast, hold the wording constant and vary ONLY the word carrying the difference (parallel syntax). 4) Never rename the same thing mid-comparison.  
**How to apply:** After drafting, label the link between each sentence pair with one connective word; if you can't, the logic is missing or the connective is wrong. The #1 failure mode is 'synonymomania' — renaming the same thing while comparing two items makes readers hunt for a second referent that doesn't exist.  
**Example:** 'Flashcards test recognition; active recall tests retrieval.' (parallel — only the contrasting verbs change).  
**When:** Any multi-sentence explanation, argument, or comparison where the reader must track the logic.  
*Sources: sense-of-style-pinker*

#### `topic-string-coherence` — Consistent Topic Strings  ·  Σ 35  ·  fits: blog, article, tutorial, essay, report, research, course, newsletter, proposal
**Structure:** 1) Before drafting a section, list the characters you'll write about (people AND key concepts). 2) As you draft, keep putting those same characters in the subject slot. 3) After drafting, underline the first few words of every sentence and check they form a small related set (one 'topic string'). 4) If the openers jump around randomly, rewrite so most sentences open on the same handful of topics.  
**How to apply:** Use the underlined-openers test: if a reader can't see them as one related cluster, neither flow nor focus will land. The #1 discipline is noticing drift — if you haven't named one of your listed characters for several sentences, you've wandered off the topic and the paragraph has lost its spine.  
**Example:** A 'how spaced repetition works' section keeps opening sentences on 'the algorithm… it… each review… the algorithm…' — one tight topic string the reader can hold.  
**When:** Diagnosing a paragraph that feels 'out of focus' or 'disorganized' despite individually clear sentences.  
*Sources: style-clarity-grace-williams*

#### `state-it-positive` — State It in the Positive  ·  Σ 35  ·  fits: ad, landing-page, email, blog, product-description, social-post, press-release, faq, tutorial, memo
**Structure:** 1) Scan for negations — not just no/not/never but hidden ones (few, seldom, fails to, avoid, ignore, deny). 2) Count them; more than one in a sentence is a warning sign. 3) Rewrite as the affirmative the negation implies ('not honest' → 'dishonest', 'did not remember' → 'forgot'). 4) Keep a negation only for true denial or sharp antithesis ('Not charity, but justice'), or when correcting a belief the reader already holds.  
**How to apply:** Ask 'what IS true?' instead of stating what isn't, because the reader 'wishes to be told what is', and every negation is mental homework — to read 'X is not Y' the mind first believes 'X is Y', then tags it false. The #1 failure mode is misnegation: stack two negatives and you often say the literal opposite of what you meant ('No head injury is too trivial to ignore' tells you to ignore them).  
**Example:** 'Don't forget you won't pass unless you review.' → 'Review a little each day and you'll pass.'  
**When:** Whenever copy feels tame, hedged, or non-committal — and in quiz items and instructions carrying logical conditions.  
*Sources: elements-of-style-strunk-white, sense-of-style-pinker*

#### `reverse-engineer-prose` — Reverse-Engineer Good Prose  ·  Σ 35  ·  fits: blog, thread, social-post, essay, article, video-script, newsletter
**Structure:** 1) Collect 3-4 passages that genuinely move you in your genre. 2) Read each slowly, phrase by phrase. 3) For every striking phrase, name WHY it works — fresh wording? concrete image? parallel syntax? planned surprise? a telling detail vs telling us? 4) Extract the reusable move. 5) Practice that move on your own material.  
**How to apply:** Annotate sentence-by-sentence like a code review — write the reason beside each phrase, not just 'nice'. The #1 discipline is naming the MECHANISM, because only a named move is reusable; admiring prose without dissecting it transfers nothing.  
**Example:** Study one viral study-tips thread; label each line ('hook = stark claim', 'proof = concrete number', 'turn = surprise') and reuse that skeleton for a Ritsu exam-prep thread.  
**When:** Building a 'writerly ear' and a personal toolbox before drafting a new content type.  
*Sources: sense-of-style-pinker*

#### `name-names-specificity` — Name Names (Specificity Ladder)  ·  Σ 35  ·  fits: blog, article, story, ad, social-post, essay, bio, video-script, review
**Structure:** 1) Spot the generic noun in a sentence (flower, dog, client, food truck). 2) Replace it with the most specific true instance (poppy; a fat pug named Carl; Mabel from Finance; a Vietnamese sandwich truck). 3) Check it's 'specific enough to be believable, universal enough to be credible'. 4) Keep the detail that paints a picture; cut detail that doesn't.  
**How to apply:** Trade the category word for a named, concrete instance — 'give things the dignity of their names'. The #1 discipline is that specificity must be TRUE and load-bearing (minivan is funnier than car because the detail carries character); don't over-specify into noise — pick the one detail that creates the image.  
**Example:** Not 'a student studying' but 'a pre-med sophomore cramming organic chemistry at 2am with 14 browser tabs open.'  
**When:** Any sentence that feels flat, abstract, or could describe a hundred companies — also when you want humor (specific is funnier).  
*Sources: everybody-writes-handley*

#### `signpost-sparingly` — Signpost Sparingly (Kill Metadiscourse)  ·  Σ 34  ·  fits: tutorial, blog, article, essay, course, report, newsletter, presentation
**Structure:** 1) Cut throat-clearing previews that read like a scrunched-up table of contents ('This section will discuss X'). 2) Replace them with a question ('What makes X happen?') or the vision metaphor ('As we have seen…', 'Now we arrive at…'). 3) Lay the material in an obvious sequence (general→specific, big→small) so each turn is self-evident. 4) Keep only light conversational signposts ('In other words', 'To make a long story short').  
**How to apply:** Delete every sentence that talks ABOUT the text instead of advancing it, then make the route so clear that signposts become unnecessary. The #1 discipline is the cost test: a signpost must save the reader more work than decoding it costs, or it's just professional narcissism.  
**Example:** Not 'In this guide, we will first cover, then discuss, then summarize spaced repetition.' But 'Why do you forget what you studied last week?'  
**When:** Longer explainers, guides, and essays prone to academic over-structuring.  
*Sources: sense-of-style-pinker*

#### `control-sprawl-modifiers` — Control Sprawl (Resumptive / Summative / Free Modifiers)  ·  Σ 32  ·  fits: essay, article, report, research, blog, speech, book, novel, screenplay, proposal, paper
**Structure:** When a sentence must run long, reach a complete subject-verb-object first, then extend AFTER it with one named move: RESUMPTIVE (pause with a comma, repeat a key noun, continue with 'that…'); SUMMATIVE (end a clause, add a noun summing it up, continue with 'that…'); or FREE (add an -ing/-ed/adjective phrase commenting on the subject). Avoid stacking subordinate clause onto subordinate clause.  
**How to apply:** Get to a grammatically complete statement, then graft the extension on with deliberate punctuation and one of the three moves. The #1 discipline is never letting a 'which… that… because…' chain dangle off the tail — free modifiers are the most versatile and can also lead the sentence, adding texture while keeping the spine clean.  
**Example:** 'Ritsu turns a PDF into a study plan — a plan that orders topics by difficulty and auto-builds a quiz for each.' (resumptive on 'plan')  
**When:** Writing an inevitably long, detail-rich sentence without it collapsing into a train of ungainly clauses.  
*Sources: style-clarity-grace-williams*


### Academic argument (They Say / I Say)  (5)

#### `they-say-i-say` — They Say / I Say  ·  Σ 38  ·  fits: essay, blog, article, newsletter, social-post, video-script, email, landing-page, speech, review
**Structure:** 1) THEY SAY — open by summarizing the existing view or conversation you're entering. 2) I SAY — state your own claim explicitly as a RESPONSE to it. 3) Keep returning to the 'they say' at strategic points so the response never loses its motivation.  
**How to apply:** Never lead with your own claim cold — first name the view you're correcting, adding to, or complicating, then present your thesis as the answer, stating the two together up front. The #1 failure mode is the 'isolation-booth' draft that asserts smart things with no 'they say', so the reader sees WHAT you say but never WHY.  
**Example:** 'Most students think re-reading their notes is studying. In fact, recall — being quizzed — is what makes it stick, which is why Ritsu drills you instead of showing you.'  
**When:** Any persuasive or explanatory piece that needs a reason-for-being, not just true statements floating in a vacuum.  
*Sources: they-say-i-say-graff*

#### `plant-a-naysayer` — Plant a Naysayer  ·  Σ 37  ·  fits: essay, blog, article, proposal, memo, landing-page, email, speech, report, review
**Structure:** 1) Surface the strongest objection a skeptic would raise ('some might object…'). 2) Give it a real, fair hearing — even a full paragraph. 3) Answer it convincingly, or honestly concede the limited point. 4) Optionally NAME the naysayer (a school of thought, a labelled group) for precision.  
**How to apply:** Voice the counterargument BEFORE the reader thinks of it — this preemptive strike disarms critics and signals you respect the reader as a critical thinker. The #1 discipline is giving the objection a genuine, non-strawman hearing (don't dispatch it in half a sentence); naming the naysayer adds precision over a faceless 'anybody'.  
**Example:** 'Some will object that AI-made quizzes can't match a teacher's. It's a fair worry — a wrong question teaches the wrong thing. That's exactly why every Ritsu item is graded against your source.'  
**When:** Whenever a claim is contestable and you want to pre-empt doubt and look credible rather than one-sided.  
*Sources: they-say-i-say-graff*

#### `so-what-who-cares` — So What? / Who Cares?  ·  Σ 37  ·  fits: essay, blog, article, landing-page, email, newsletter, social-post, proposal, presentation, video-script, ad
**Structure:** WHO CARES? — name a specific person or group with a stake in your claim (often the people whose old belief you're correcting). SO WHAT? — link the claim to a larger consequence the reader already cares about. State both explicitly, up front.  
**How to apply:** Answer both questions IN the text rather than assuming the reader supplies them — 'who cares?' identifies an invested party, 'so what?' ties your point to something already deemed important (grades, money, time). The #1 failure mode is a clear, correct claim with no stated stakes, which 'ultimately loses your audience's interest'.  
**Example:** 'So what if you forget 80% within a week? For an exam-taker, that's the difference between a B and an A — and it's why spacing your reviews, not cramming, is the whole game.'  
**When:** Any piece at risk of a 'sounds-true-but-why-should-I-care' shrug — the stakes-setting layer.  
*Sources: they-say-i-say-graff*

#### `quotation-sandwich` — Quotation Sandwich  ·  Σ 36  ·  fits: essay, article, blog, research, paper, report, newsletter, review, presentation, email
**Structure:** Top slice: a lead-in that says WHO is speaking and sets up the point. Filling: the quotation (or cited fact/stat). Bottom slice: a follow-up that explains in your own words what it means and how it bears on YOUR argument.  
**How to apply:** Frame every quotation both before AND after — introduce the source, then restate its meaning in your own words and connect it to your point. The #1 failure mode is the 'hit-and-run' quotation slapped in and abandoned; a bare quote does NOT speak for itself, so if you don't say what it means, the reader won't know why it's there.  
**Example:** 'Education researchers studied the testing effect. One found students who self-quizzed recalled 50% more a week later. In other words, the quiz isn't the assessment — it IS the studying.'  
**When:** Any time you drop in a quote, statistic, study, or external source and need it to actually land.  
*Sources: they-say-i-say-graff*

#### `yes-no-okay-but` — Yes / No / Okay-But (Three Ways to Respond)  ·  Σ 35  ·  fits: review, blog, essay, social-post, thread, newsletter, memo, article, email
**Structure:** Pick one stance and declare it plainly early: AGREE ('yes, and here's a fresh angle'), DISAGREE ('no, and here's why'), or BOTH ('I agree that X, but I cannot agree that Y'). Then unfold the complexity within that frame.  
**How to apply:** State agree/disagree/both with a direct, no-nonsense formula BEFORE the mass of detail, so readers can place you on their mental map. The disciplines: when agreeing, 'agree with a difference' (add new evidence, don't parrot); when disagreeing, give REASONS, not just a 'not'; the strongest option is agreeing and disagreeing at once inside an 'on the one hand / on the other' frame.  
**Example:** 'Yes — flashcards work. But raw flashcards aren't enough: without spacing and active recall they're just pretty re-reading, which is why Ritsu schedules them for you.'  
**When:** Any response, reaction, take, or review where the reader must quickly locate where you stand.  
*Sources: they-say-i-say-graff*


### Business & ops  (5)

#### `ideal-reader-test` — The Ideal-Reader Test (Close the Loop)  ·  Σ 36  ·  fits: blog, article, tutorial, course, newsletter, email, essay, landing-page, press-release, product-description, proposal, faq
**Structure:** 1) Pick ONE specific person you write for; during drafting, keep asking 'what will they think of this part?' 2) Finish the draft. 3) Hand it to 1-3 people resembling that reader (or anyone not you). 4) Ask what was confusing, not whether they liked it — and watch WHERE they set it down (that's the boring part). 5) Revise a point only when more than one reader flags it; when reactions split, tie goes to the writer.  
**How to apply:** Get a real signal — trying harder to imagine the reader does NOT cure the curse of knowledge; only actual readers reveal what's obvious to you but not them. The #1 discipline is NOT implementing every note: weight by agreement, because 'good prose is never written by committee' and pandering to every comment produces incoherent non-sequiturs.  
**Example:** Before shipping a Ritsu onboarding email, have two non-power-users read it and circle the first sentence that made them pause.  
**When:** Calibrating pace, clarity, and 'is this landing?' for any audience-facing piece before publishing.  
*Sources: on-writing-king, sense-of-style-pinker*

#### `do-your-homework` — Do-Your-Homework Pre-Write  ·  Σ 36  ·  fits: ad, landing-page, email, blog, article, product-description, proposal, press-release
**Structure:** Before writing a word: 1) Study the product until a surprising fact surfaces. 2) Study competitors' messaging and results. 3) Talk to real prospects — learn the language THEY use and what promise would move them. 4) Decide positioning: 'what it does, and who it's for.' 5) Only then write.  
**How to apply:** Spend disproportionate time reading and interviewing before drafting — Ogilvy spent three weeks on Rolls-Royce and found the 'electric clock' line that became the headline. The #1 discipline is that even informal talks with half-a-dozen real users beat writing from your own assumptions; skipping homework risks 'the slippery surface of irrelevant brilliance'.  
**Example:** Before writing Ritsu's exam-cram page, interview 6 students mid-finals; the phrase 'I just need it to quiz me on THIS chapter' becomes the headline.  
**When:** Front-loading any persuasive piece so the copy rests on a real, differentiating fact rather than invention.  
*Sources: ogilvy-on-advertising*

#### `brand-voice-four-words` — Brand Voice in Four Words  ·  Σ 36  ·  fits: blog, email, social-post, landing-page, newsletter, ad, faq, product-description
**Structure:** 1) Define your Youness: pick 4 adjectives, ideally placing yourself on the four axes (funny↔serious, formal↔casual, respectful↔irreverent, enthusiastic↔matter-of-fact). 2) Translate each word into a style with sentences and anecdotes. 3) Document it in a living doc with a 'Like This / Not Like This' chart. 4) Look for nonobvious places to apply it (CTAs, confirmation emails, the first bill, 404 pages).  
**How to apply:** Build the 4-word kit, then make each word concrete with examples and revisit it quarterly. The #1 discipline is avoiding table-stakes words (friendly, reliable) and buzzwords (cutting-edge); run the logo-cover test — mask the logo, read aloud, and check you still sound like you, not your competitors.  
**Example:** Ritsu's four words → Encouraging · Concrete · Calm · Honest. 'Encouraging' = 'Nice — you just mastered cell respiration. One topic down.' Not: 'Leverage our AI-powered learning paradigm.'  
**When:** Establishing or auditing a brand's written voice so any writer sounds like the brand, not like everyone else.  
*Sources: everybody-writes-handley*

#### `closed-door-open-door` — Closed Door / Open Door (Write for Self, Revise for Reader)  ·  Σ 35  ·  fits: story, essay, blog, article, book, novel, course, research, report, video-script
**Structure:** 1) Draft 1 with the door shut — write only for yourself, fast, no audience. 2) Let it rest weeks until it reads like 'an alien relic'. 3) Open the door: re-read, then show it to a few trusted readers. 4) Revise for coherence, theme, and the reader's experience.  
**How to apply:** Keep the two modes strictly separate — with the door closed, silence the audience and chase the story, because momentum dies if you edit while creating. The #1 discipline is the rest period: distance lets you 'kill someone else's darlings' (your own, now estranged) and spot plot holes big enough to drive a truck through, before you ever open the door.  
**Example:** Write the whole 'why spaced repetition works' explainer in one sitting for yourself; shelve it a week; reopen it cold and cut everything the reader won't need.  
**When:** Structuring any non-trivial writing project into a private creation phase and a public refinement phase.  
*Sources: on-writing-king*

#### `test-before-scale` — Test-Before-Scale  ·  Σ 34.5  ·  fits: ad, email, landing-page, social-post, newsletter
**Structure:** 1) Before committing budget to one version, run 2+ variants of the load-bearing element (headline, offer, subject line) against a small real audience. 2) Measure to the outcome that matters — cost per CUSTOMER or per action, not per click or applause. 3) Keep only the winner; the difference between variants is routinely 5-10×. 4) Scale the proven version unchanged.  
**How to apply:** Pick the single highest-leverage element (usually the headline), write several honest variants, ship them small, and read the keyed return — 'go to the court of last resort: the buyers of your product'. The #1 failure mode is judging by what YOU admire: 'the appeals we like best will rarely prove best, because we do not know enough people to average up their desires'.  
**Example:** A/B three email subject lines to 500 trial users — 'Your exam is in 3 days' vs 'Finish your study guide tonight' vs 'You uploaded a PDF — here's your quiz' — scale only the one with the most opens-to-activation.  
**When:** Any time you'd otherwise pick the 'best' copy by opinion around a table.  
*Sources: scientific-advertising-hopkins*


### Learning  (2)

#### `one-idea-per-sentence` — One-Idea-Per-Sentence (Linear Sequencing)  ·  Σ 38.5  ·  fits: tutorial, course, article, research-paper, faq, report, presentation, essay, blog
**Structure:** 1) Write the explanation. 2) Find any sentence carrying two dissimilar thoughts and split it at the period. 3) Ensure each sentence contains exactly one idea, delivered in the order the learner needs it. 4) Front-load mood-changers (but, yet, however, meanwhile) so the reader is primed for a turn before it happens. 5) Read aloud to confirm each step lands before the next begins.  
**How to apply:** Remember 'readers process one idea at a time, in linear sequence', so never make one sentence do too much work — break a long sentence into two or three. The #1 failure mode is the dense compound sentence that forces the learner to re-read; most writers don't reach the period soon enough.  
**Example:** Split 'Mitosis copies the DNA which then condenses into chromosomes that line up so the cell can divide' into four plain steps, one per sentence.  
**When:** Explaining technical, sequential, or unfamiliar material a learner must follow step by step.  
*Sources: on-writing-well-zinsser*

#### `wiify-self-interest-lead` — WIIFY Self-Interest Lead  ·  Σ 38.5  ·  fits: email, tutorial, course, landing-page, ad, social-post, video-script, newsletter
**Structure:** 1) Find the reader's real benefit, then the benefit OF that benefit ('quarter-inch holes', not drill bits). 2) Open with it — promise the want plainly. 3) Keep the 'self' in self-interest: 'YOU will…', not 'people will…'. 4) Spell out the dot-connection so a distracted reader can't miss it. 5) Then deliver the how.  
**How to apply:** Answer the student refrain 'how will I ever use this?' up front, in second person. The #1 failure mode is feature-dumping ('17 activity types!') and assuming the benefit is obvious — name the payoff in the reader's own life in the first line.  
**Example:** Open an algebra lesson: 'In 20 minutes you'll set up the equations that price a game's loot boxes — same math, your world.'  
**When:** Lessons, intros, or emails where the reader is silently asking 'why should I care / when will I ever use this?'  
*Sources: made-to-stick-heath*


---
_Generated from `knowledge/write-frameworks.yaml`. To add a framework: append to the yaml + regenerate._
