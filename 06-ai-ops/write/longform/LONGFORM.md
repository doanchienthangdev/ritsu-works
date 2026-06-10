# Long-form writing — bible + parallel-draft + continuity (the consistency system)

`/write` produces long-form works (book · novel · film-script · research-paper · article-series · course) through a **consistency pipeline**, NOT a single pass: lock a **bible** (the single source of truth) → outline parts → **draft parts in PARALLEL** (a Claude Code Workflow; each part-agent reads ONLY the bible + its part brief + adjacent-part summaries — never peer drafts) → **continuity pass** → assemble → one unified humanize pass.

Per-type bibles: [`bibles/<type>.md`](bibles/). Driven by `scripts/write/longform/plan.cjs` + the `write/longform` skill.

## book — Non-fiction book
**Structure:** Front matter (thesis + promise) → Part I–IV (2–4 chapters each, argument-building) → Conclusion (synthesis + call to action) → Back matter (notes, bibliography, index). Each chapter = one falsifiable claim, developed through evidence + story + application.
**Default length:** extremely-long  ·  **Mediums:** print, kindle, epub, pdf-ebook, audiobook-companion, serialized
**Bible:** thesis · audience · argument_arc · chapter_map · key_terms · evidence_ledger · voice · style_sheet

**Consistency mechanisms:**
- BIBLE-FIRST LOCK: The bible is written and frozen before any chapter agent starts. No chapter draft begins until the argument_arc and key_terms sections are finalized. Version-stamped; agents record which version they drafted against.
- PART-BOUNDARY SUMMARIES: Before each part's chapters are written, a 200-word 'part brief' distills what the reader knows coming in, what the part must accomplish, and what the reader should believe leaving it. Chapter agents within that part receive the brief alongside the bible.
- ADJACENT-CHAPTER CONTEXT INJECTION: Each chapter agent receives the final (or near-final) summary of the preceding chapter and the opening sentence of the following chapter — just enough to calibrate handoff tone and avoid repeating the prior chapter's conclusion as the chapter's own opening.
- EVIDENCE LEDGER RESERVATION: Before drafting, each chapter agent declares which studies, statistics, and named cases it intends to use. A lightweight coordination pass (non-parallel) checks for double-booking and blocks; unused reservations are released back to the ledger.
- TERM FREEZE: Any new term introduced in a chapter draft that is not in the bible's key_terms section is flagged as a proposed addition — it cannot appear in other chapters until the bible is updated and the version bumped. This prevents silent terminological drift.
- VOICE CALIBRATION SAMPLE: Every chapter agent runs the humanize scan against the same two reference paragraphs from the voice section, not against other chapters — preventing the voice from drifting chapter-by-chapter as a game of telephone.
- CHAPTER CLAIM REGISTRATION: Each chapter's one-sentence claim is recorded in the argument_arc before drafting. If a draft's actual claim drifts from the registered claim by more than paraphrase, the continuity pass flags it for reconciliation before assembly.
- PARALLEL GUARD — NO CROSS-READS: Chapter agents are explicitly prohibited from reading other agents' drafts (they only see the bible, their part brief, and their two adjacent-chapter summaries). This prevents style bleed and forced-consistency that introduces incoherence.

**Continuity checks (run over the assembled draft):**
- THESIS ECHO CHECK: Verify every chapter contains at least one sentence that explicitly or unmistakably advances the bible thesis — flag any chapter that could be lifted out and published standalone without referencing the book's central argument
- ARGUMENT ARC HANDOFF CHECK: For each chapter boundary, confirm the last paragraph of Chapter N raises the exact question or tension the bible's argument_arc bridge sentence specifies, and the first paragraph of Chapter N+1 answers or engages it directly
- TERM CONSISTENCY SCAN: Diff every coined or redefined term against the bible key_terms section — flag any usage that departs from the exact definition, any synonym used in place of a proprietary term, and any chapter that introduces a term before its bible-designated first-introduction chapter
- EVIDENCE DOUBLE-USE CHECK: Cross-reference every named study, statistic, and case study against the evidence_ledger — flag any item that appears in more than one chapter unless the bible explicitly marks it as a recurring anchor example
- VOICE DRIFT CHECK: Run the humanize scan on each chapter's opening and closing two paragraphs against the bible voice section's reference paragraphs — flag any chapter whose score deviates more than 10 points from the median, indicating register drift that will feel jarring at the seam
- CLAIM DRIFT CHECK: Compare each chapter's actual central claim (extracted by the continuity agent) against the claim registered in the bible argument_arc — flag any drift beyond close paraphrase for reconciliation before the book goes to final render

**Drafting approach:** The orchestrator writes and locks the bible first (no parallel drafting begins until the argument_arc and evidence_ledger are complete), then fans out chapter drafting via a Claude Code Workflow — each chapter agent receives the full bible plus its part brief and adjacent-chapter summaries, drafts its chapter independently, and writes a 150-word summary of its output for the continuity agent to consume. Once all chapters complete, a single assembly pass stitches them in order and runs one unified humanize pass over the whole manuscript (not per-chapter) to smooth voice variance introduced by parallel drafting. The bible is the only shared state; agents never read peer drafts.

## novel — Novel
**Structure:** Three-act spine subdivided into chapters (10–40), each chapter carrying a single dramatic unit; parts group chapters into acts for parallel drafting.
**Default length:** very-long  ·  **Mediums:** long-form-fiction, serialized-fiction, audiobook-script, ebook, print-manuscript, interactive-narrative
**Bible:** characters · world_and_rules · timeline · pov_and_voice · plot_and_arc · themes · style_sheet · glossary

**Consistency mechanisms:**
- LOCK-BEFORE-SPLIT: the full bible is finalized and committed to a shared artifact (e.g., a file in .archives/write-runs/<slug>/bible.md) before any chapter-drafting Workflow agent is dispatched; no agent may propose bible edits mid-draft without a full halt-and-review cycle.
- CHAPTER SUMMARIES LEDGER: each parallel agent appends a 150-word scene summary (characters present, location, time-of-day, plot beats, new information revealed, emotional state of POV character at exit) to a shared ledger file immediately after drafting; the continuity agent reads this ledger before the full manuscript is assembled.
- ADJACENT-CHAPTER CONTEXT INJECTION: every chapter-drafting agent receives the finalized text of the immediately preceding chapter (or its 300-word summary if the predecessor was drafted in the same parallel batch) and the 150-word summary of the immediately following chapter's intended beats, preventing cold-start tonal resets at chapter seams.
- CHARACTER STATE TRACKING: a lightweight JSON object per major character is maintained in the bible (current location, known-to-character facts, physical injuries, emotional state, open promises/debts) and updated by the orchestrator after each chapter batch completes, so no agent drafts a character as uninjured when a prior chapter broke their arm.
- WORLD-RULE CITATION DISCIPLINE: any chapter that invokes a world rule (magic, technology, law) must cite the bible key and subsection in a draft comment; the continuity agent flags uncited rule invocations as potential violations for human review.
- TONAL NORMALIZATION PASS: after all chapters are assembled, a dedicated humanize/voice pass (write/humanize skill) reads the bible pov_and_voice section and irons out sentence-rhythm drift, forbidden-word violations, and tense inconsistencies introduced by parallel drafting before the continuity structural check runs.
- GLOSSARY ENFORCEMENT: the continuity agent runs a regex/string search for all glossary terms and flags any spelling variant not in the style_sheet, preventing 'Aelindra' and 'Aelindra' co-existing in a single manuscript.

**Continuity checks (run over the assembled draft):**
- TIMELINE AUDIT: extract every scene's stated or implied time-of-day and day-number, plot against the master timeline, and flag any gap, overlap, or impossible travel time between locations.
- CHARACTER LOCATION PARADOX CHECK: for each chapter boundary, verify that a character's exit location in chapter N matches their entry location in chapter N+1 or that an off-page travel interval is accounted for.
- KNOWLEDGE-STATE CONSISTENCY: for each major revelation, verify that no earlier chapter has a character acting on information they could not yet possess, and that no later chapter has a character ignorant of something they witnessed.
- WORLD-RULE VIOLATION SCAN: for every invocation of a world rule (magic cost, legal constraint, physical impossibility), verify the action is permitted under the bible's world_and_rules section and that any stated cost is paid.
- VOICE AND TENSE DRIFT DETECTION: sample the opening and closing paragraph of every chapter, compare sentence-length distribution and tense against the bible's pov_and_voice target, and flag chapters that fall more than one standard deviation from the target rhythm.
- GLOSSARY AND STYLE-SHEET COMPLIANCE: run a full-text search for every glossary term and flag alternate spellings; check hyphenation, dialogue punctuation, and capitalization against the style_sheet for every chapter in the assembled draft.

**Drafting approach:** The orchestrator splits the beat sheet into chapter assignments and dispatches a Workflow fan-out where each agent receives: (1) the full bible as a prepended system context, (2) its specific chapter's dramatic function and required beats from the plot_and_arc section, (3) the finalized predecessor chapter text or summary, and (4) the intended-beats summary for its successor chapter. Chapters within the same act that share no character-state dependencies can be drafted in parallel; chapters that hand off a wound, a revealed secret, or a changed relationship are sequenced so the upstream chapter is finalized before the downstream agent is dispatched. After each batch completes, the orchestrator updates the character-state JSON in the bible and regenerates the adjacent-chapter summaries before releasing the next batch.

## film-script — Feature film script
**Structure:** Three-act structure (Act I ~25pp, Act II ~55pp split at midpoint, Act III ~25pp) broken into 8 sequences of ~12–15 pages each, with scene-by-scene scene cards as the atomic unit.
**Default length:** very-long  ·  **Mediums:** feature-film, limited-series-pilot, short-film, tv-pilot, graphic-novel-script, stage-play
**Bible:** logline_and_premise · character_dossiers · world_rules_and_locations · three_act_plot_map · timeline_and_continuity_log · theme_and_motif_register · tone_and_visual_grammar · dialogue_style_sheet · format_and_slug_conventions

**Consistency mechanisms:**
- LOCKED BIBLE AMENDMENT PROTOCOL: No drafter may change a character name, location slug, or plot commitment without a formal bible amendment that is broadcast to all other active sequence drafters before they complete their pass.
- SEQUENCE HANDOFF SUMMARIES: Each completed sequence draft ends with a 200-word 'handoff note' listing every prop introduced, every promise made to the audience, every character state change, and every unresolved dramatic question — the adjacent sequence drafter reads this before starting.
- SHARED SLUG-LINE REGISTRY: A single authoritative table of every INT./EXT. location slug is generated from the plot map and frozen; drafters copy-paste from it rather than freehand, preventing 'INT. WAREHOUSE - DAY' vs 'INT. THE WAREHOUSE - DAY' collision that breaks scene-import assembly.
- CHARACTER VOICE SPOT-CHECK: After each sequence draft, run a heuristic that extracts all dialogue lines per character and flags any line against the 'voice test' in the bible — lines that match the 'never say' examples are flagged for human review before continuity pass.
- ACT-BREAK SCENE RESERVED: The inciting incident (end of Seq 1), the Act I break, the midpoint, the Act II break, and the climax scenes are written by a single senior pass after all surrounding sequences are drafted, ensuring structural hinges are coherent and not subject to parallel-draft interpretation drift.
- PAGE-COUNT BUDGET ENFORCEMENT: Each sequence has a target page range (min/max) derived from the overall 90–120 page budget; drafts that exceed max by more than 10% are flagged before assembly so the finished script does not land at 145 pages.
- PLANT-AND-PAYOFF LEDGER CHECK: The continuity pass runs a mechanical check against the bible's planted-elements log — every Chekhov's gun must appear in both a plant scene and a payoff scene in the assembled draft, with no orphaned plants or unexplained payoffs.

**Continuity checks (run over the assembled draft):**
- SLUG REGISTRY DIFF: Compare every location slug in the assembled draft against the authoritative slug registry — flag any slug that does not appear in the registry as a potential duplicate or freehand invention.
- PROP AND COSTUME TIMELINE WALK: Walk the timeline log forward scene by scene and verify that every prop introduction, transfer, loss, or destruction in the log is represented in the correct scene of the assembled draft and not contradicted in subsequent scenes.
- CHARACTER ARC ENDPOINT CHECK: For each character with a defined arc endpoint in the bible, verify that the final scene featuring that character reflects the stated endpoint and that no later scene re-contradicts it.
- PLANT-AND-PAYOFF LEDGER RECONCILIATION: For every entry in the planted-elements log, confirm both the plant scene ID and payoff scene ID are present in the assembled draft; flag any plant with no payoff or any payoff with no traceable plant.
- PAGE AND ACT BUDGET AUDIT: Count pages per act and per sequence; flag any act that falls outside its target range (Act I under 20pp or over 30pp, Act II under 45pp or over 65pp, Act III under 20pp or over 30pp) and surface the offending sequences for trimming or expansion.
- THEME COHERENCE READ: Perform a targeted read of the inciting incident scene, the midpoint scene, and the climax scene to verify they each address the central dramatic question from the bible and that the climax's implied answer is consistent with the thematic direction established in the premise statement.

**Drafting approach:** The 8 sequences are fanned out in two waves: Act I (Seq 1–2) and Act III (Seq 7–8) are drafted first by a single pass to lock the entrance and exit of the story, then Act II sequences (Seq 3–6) are drafted in parallel, each receiving the bible plus the handoff note from its immediately preceding sequence. Each parallel drafter operates against a frozen snapshot of the bible and the prior sequence's handoff summary, writes only within their assigned page budget, and produces a handoff note on completion; the Workflow collects all eight drafts and routes them to a continuity pass that assembles, patches seams, and enforces the locked plant-and-payoff ledger before delivering a single assembled draft.

## research-paper — Research paper
**Structure:** Abstract → Introduction → Related Work → Methodology → Results → Discussion → Conclusion → References; each section is a discrete drafting unit fanned out in parallel against a shared bible, then stitched and continuity-checked.
**Default length:** very-long  ·  **Mediums:** academic-journal, conference-paper, preprint-arxiv, thesis-chapter, technical-report, workshop-paper
**Bible:** research_question_and_scope · contributions · claims_evidence_ledger · methodology_contract · notation_and_symbols · citation_registry · figures_and_tables_plan · argument_arc · voice_and_register · terminology_glossary

**Consistency mechanisms:**
- Bible-first gate: every section draft begins by the drafter re-reading the full bible and outputting a one-paragraph alignment statement confirming which contributions, claims, and figures it will cover before any prose is written.
- Claim tagging in prose: every non-trivial assertion in a draft is annotated inline with its ledger ID (e.g., [C2]) during drafting; the continuity pass strips tags after verifying coverage.
- Adjacent-section summaries as shared context: the Workflow passes each parallel drafter the finalized summary of the immediately preceding and following sections so narrative hand-offs are smooth without requiring full prior text.
- Notation enforcement pass: a deterministic script scans all section drafts for symbol strings and cross-checks against the notation table, flagging any symbol used but not registered or registered differently.
- Citation coverage check: after assembly a script enumerates every BibTeX key in the citation registry and verifies at least one in-text invocation exists; orphaned keys and unregistered in-text cites are both flagged.
- Figures/tables ownership lock: each figure/table number is assigned exclusively to one section in the plan; the continuity pass rejects any section that introduces or captions a figure not assigned to it.
- Contribution closure audit: a mapping pass verifies each numbered contribution Ci has at least one substantiating passage in the assigned section and is echoed in both the Abstract and Conclusion.
- Voice calibration sample: the bible includes three exemplar sentences at the target register; the humanizer stage of /write scores each section's formality and hedging density against the sample before finalizing.

**Continuity checks (run over the assembled draft):**
- Contribution closure: verify each Ci is introduced in Introduction, substantiated in exactly the assigned body section, and echoed in Conclusion — flag any Ci present in fewer than two of these three positions.
- Claim-evidence completeness: cross-reference every row in the claims-evidence ledger against assembled prose; flag claims with no supporting evidence passage and evidence passages with no corresponding claim tag.
- Notation consistency scan: diff every symbol occurrence against the notation table; flag undefined symbols and symbols whose local definition contradicts the table.
- Citation integrity: enumerate in-text cite keys, verify all exist in the registry and all registry keys appear at least once; flag duplicate works registered under different keys.
- Numerical coherence: extract all quantitative results (accuracy, F1, p-values, dataset sizes) mentioned in Abstract, Results, and Discussion; assert each number appears identically in all locations it is cited — flag any discrepancy of more than rounding.
- Narrative thread check: verify the argument-arc sequence is honoured — Introduction must end with a forward pointer matching the arc, each section's opening sentence must reflect the arc entry for that section, and Discussion must address every gap named in Related Work.

**Drafting approach:** The bible is authored first as a standalone artifact and locked before any section draft begins. The Workflow then fans out all body sections (Introduction, Related Work, Methodology, Results, Discussion) in parallel, passing each drafter the full bible plus the finalized one-paragraph summary of its two adjacent sections; Abstract and Conclusion are drafted last in series after all body sections are finalized, since they summarize the whole. After parallel drafts return, a single continuity pass assembles the full document, runs all automated checks, and generates a diff report for human review before the humanizer and voice-calibration stage.

## article-series — Article series
**Structure:** N standalone-but-connected installments sharing a central thesis and through-line argument, each publishable independently yet building toward a cumulative payoff across the run.
**Default length:** very-long  ·  **Mediums:** blog, newsletter, linkedin-article, substack, medium, editorial
**Bible:** series_thesis · audience_and_prereqs · through_line · installment_map · argument_arc · recurring_elements · voice_and_style_sheet · key_terms_and_definitions · evidence_and_data_ledger · callbacks_and_foreshadowing_log · escalation_plan · series_metadata

**Consistency mechanisms:**
- BIBLE-FIRST LOCK: The full bible is finalized and human-approved before any installment draft begins; no part may override a bible entry unilaterally — changes require a bible version bump that propagates to all in-flight drafts.
- ADJACENCY SUMMARIES: Each installment draft receives a 200-300 word summary of the immediately preceding and immediately following parts (extracted from their drafts or outlines) as explicit context, preventing local coherence from breaking global flow.
- SHARED LEDGER REFERENCE: Every parallel drafting agent has read-only access to the evidence-and-data ledger and key-terms glossary; any new term or statistic a draft wants to introduce must be registered in the bible before use.
- INSTALLMENT HANDOFF HOOKS: The last paragraph of each part must contain a planted forward-hook (a question, an unresolved tension, or an explicit teaser) that verbatim or semantically matches the opening lede of the next part — both locked in the bible installment map.
- CONTINUITY PASS BEFORE PUBLISH: After all parallel drafts complete, a dedicated continuity-pass agent reads the assembled series end-to-end against the bible and produces a diff of all inconsistencies before any installment is published.
- VOICE CALIBRATION ANCHOR: Part 1 is drafted and approved first (not in parallel); its finalized text becomes the de facto voice/tone exemplar that all other parallel drafts are calibrated against.
- ESCALATION GATE CHECK: After parallel drafting, verify that complexity, specificity, and stakes measurably increase from installment to installment per the escalation plan — flag any part that reads at the same level as its predecessor.

**Continuity checks (run over the assembled draft):**
- THESIS DRIFT CHECK: Extract the implicit or explicit central claim from each installment and compare against the bible thesis — flag any installment whose claim contradicts or materially weakens the series thesis.
- TERM CONSISTENCY CHECK: For every term in the key-terms glossary, verify each installment uses it with the bible-defined meaning and that it is not introduced before its designated first-use installment.
- EVIDENCE COLLISION CHECK: Cross-reference the data and source citations across all installments against the evidence ledger — flag any statistic cited in multiple parts with differing values, and any source attributed to contradictory claims.
- HANDOFF HOOK ALIGNMENT CHECK: Verify that the closing forward-hook of each installment semantically matches the opening lede of the next installment, per the installment map.
- ESCALATION LINEARITY CHECK: Score each installment on specificity, complexity, and stakes using a simple rubric; verify the scores increase monotonically (or explain planned non-monotonic moves) across the run.
- VOICE DELTA CHECK: Compare sentence-length distribution, POV, and tone markers in each installment against the Part 1 voice anchor — flag parts that have drifted more than a defined threshold from the anchor.

**Drafting approach:** Part 1 is drafted and locked first as the voice anchor; all remaining parts are then drafted in parallel by separate agents, each receiving the full bible plus 200-300 word summaries of adjacent installments and a strict instruction to register any new evidence or terms in the shared ledger before use. Each parallel agent produces a draft plus a short 'what I introduced / what I relied on from prior parts' manifest. After parallel drafts complete, a continuity-pass agent assembles all manifests and the full draft sequence, runs the continuity checks against the bible, and returns a prioritized list of inconsistencies for human resolution before any installment is published.

## course — Course / curriculum
**Structure:** Hierarchical: Course → Modules (3-8) → Lessons per module (3-6) → Activities (practice/apply) → Assessment (formative per lesson, summative per module, capstone at course end)
**Default length:** very-long  ·  **Mediums:** ritsu-course, lms-scorm, pdf-workbook, slide-deck, markdown-docs, video-script
**Bible:** learning_objectives · learner_profile_and_prereqs · module_lesson_map · scaffolding_and_prerequisite_chain · assessment_plan · terminology_and_concept_glossary · pedagogical_voice_and_tone · example_and_analogy_bank · activity_type_registry

**Consistency mechanisms:**
- LOCK BEFORE SPLIT: Before any module is drafted, the full module-lesson map and scaffolding chain in the bible are finalized and locked. No drafter may introduce a new lesson or reorder existing ones without a bible amendment that all drafters re-read.
- PREREQUISITE BOUNDARY SUMMARIES: Each module draft begins with a machine-readable 'entry state' block listing every concept the learner is assumed to know at module start, derived from the scaffolding chain. The continuity pass verifies this block against the actual prior-module content.
- TERMINOLOGY LOOKUP FIRST: Before drafting any explanation of a concept, the drafter queries the glossary section of the bible. If the term is absent, it must be added to the bible before proceeding — not invented inline. This catches synonym drift (e.g., 'instance' vs. 'object' vs. 'entity' used interchangeably).
- OBJECTIVE TRACEABILITY TAGS: Every lesson section that teaches a skill carries an inline tag referencing the module objective it serves (e.g., [OBJ-M2-3]). The continuity pass checks that every module objective has at least one tagged section and no section tags an objective that belongs to a different module.
- ASSESSMENT ITEM POOL LEDGER: Each formative check and module quiz item is logged in a shared assessment ledger (concept tested, Bloom level, item type, correct answer). The continuity pass checks for duplicate items across modules and confirms Bloom level matches the objective level claimed in the bible.
- EXAMPLE/ANALOGY OWNERSHIP TABLE: Each example or analogy is registered to exactly one module on first use. Subsequent modules may reference it briefly ('recall the pipeline analogy from Module 2') but never re-explain it. The continuity pass flags any full re-explanation of a registered example.
- DIFFICULTY RAMP AUDIT: The bible specifies the intended cognitive load trajectory (e.g., Bloom levels 1-2 in Module 1, levels 3-4 in Modules 2-4, levels 5-6 in Module 5+). After parallel drafting, the ramp audit checks that the actual Bloom verbs used in activities and assessments match the intended curve.

**Continuity checks (run over the assembled draft):**
- OBJECTIVE COVERAGE: every course-level and module-level objective in the bible has at least one tagged lesson section; no objective is addressed by two different modules; no section tags an objective from a different module
- TERMINOLOGY DRIFT: every domain term in the assembled course text matches its canonical name from the glossary; flag any synonym of a glossary term that appears unexplained
- SCAFFOLDING INTEGRITY: for every concept used in module N, verify it was introduced in a lesson with a lower module index (or is listed in the learner prereqs); flag any forward reference
- ASSESSMENT DEDUPLICATION AND BLOOM ALIGNMENT: no two formative or summative items across the course test the same concept at the same Bloom level with the same item type; every assessment item's Bloom level matches or is below the target level stated for that module in the bible
- DIFFICULTY RAMP CONFORMANCE: plot the Bloom level of each module's summative assessment against the ramp curve in the bible; flag any module whose assessment level is more than one Bloom tier above or below the target band
- CAPSTONE FEASIBILITY: verify the capstone project prompt requires only skills and terms introduced within the course; flag any required concept absent from the assembled lesson content

**Drafting approach:** The Workflow fans out one agent per module, each receiving the full locked bible plus a two-section context block: (1) a 'prior module summary' listing the exact concepts, terms, and skills delivered by all preceding modules, and (2) a 'future module preview' listing only the titles and micro-objectives of subsequent modules (not their content) so the drafter knows what not to teach yet. Each module agent drafts all lessons, activities, and formative assessments for its module, emitting a structured output that includes an 'exit state' block (mirroring the next module's entry state) and an assessment ledger delta. After all modules complete, a continuity agent assembles the full course, verifies objective traceability, runs the difficulty ramp audit, and produces the capstone brief using the full assembled concept map.

