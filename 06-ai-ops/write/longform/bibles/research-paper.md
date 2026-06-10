<!-- BIBLE TEMPLATE · research-paper (Research paper) — the consistency contract. /write longform fills this BEFORE any chapter/part is drafted, then LOCKS it. Every part-agent reads this. -->
# {{Title}} — research-paper bible

> **Purpose:** Single source of truth that every section drafter reads before writing; locks the research question, contributions, argument chain, evidence assignments, notation, citation keys, and voice so parallel drafters never contradict each other or drift from the approved thesis.

> **Status:** DRAFT → **LOCKED** (no part drafting starts until locked; version-stamped).

## research_question_and_scope
_Canonical RQ formulation (1-3 sentences), sub-questions, and explicit scope boundary (what the paper does NOT address); every section must orient its narrative toward this question._

{{fill}}

## contributions
_Numbered list of claimed contributions (C1, C2, …); each contribution is tagged with the section that substantiates it, so no section overclaims or forgets to deliver its assigned contribution._

{{fill}}

## claims_evidence_ledger
_Row-per-claim table: claim text, supporting evidence (dataset/experiment/theorem), section where it appears, and evidence status (proven/assumed/cited-external); prevents circular reasoning and orphaned claims._

{{fill}}

## methodology_contract
_Fixed description of the method, datasets, baselines, hyperparameters, and evaluation protocol; Results and Discussion drafters must reference this verbatim rather than re-describing or silently varying it._

{{fill}}

## notation_and_symbols
_Canonical symbol table (variable names, math notation, acronyms, model names); all drafters import from this table to prevent symbol collision and inconsistent acronym expansion._

{{fill}}

## citation_registry
_BibTeX key list with one-line annotations (what claim each cite supports, which section uses it); prevents duplicate or missing citations and ensures every cite is actually invoked._

{{fill}}

## figures_and_tables_plan
_Inventory of every planned figure and table: number, caption skeleton, data source, and which section owns and references it; guarantees figures are not duplicated or referenced before introduction._

{{fill}}

## argument_arc
_Section-by-section narrative thread (gap → motivation → method → evidence → insight → implication); each section drafter uses this to know what narrative weight their section must carry and what the adjacent sections deliver._

{{fill}}

## voice_and_register
_Target venue (journal/conference), formality level, first-person vs. passive convention, hedging vocabulary list, and any venue-specific style constraints (page limits, section headers); locks tone across all parallel drafts._

{{fill}}

## terminology_glossary
_Definitions of domain-specific and paper-specific terms used consistently throughout; prevents a term being defined in Introduction and then redefined differently in Discussion._

{{fill}}

## What must stay consistent (the non-negotiables)
- The exact wording of the primary research question — must appear verbatim (or as a deliberate restatement) in Abstract, Introduction, and Conclusion, never rephrased in a way that shifts scope.
- Contribution labels (C1, C2, …) and their precise descriptions — claimed in Introduction, substantiated in body sections, and summarized in Conclusion with no additions or omissions.
- Dataset names, split sizes, and evaluation metrics — every occurrence in Methodology, Results, and Discussion must use identical names and numbers; no informal paraphrasing of dataset descriptions.
- Notation and symbol definitions — a symbol defined once must never be reassigned; acronyms must expand on first use per-section only if the bible marks them as expand-per-section, otherwise only on first use globally.
- Baseline and ablation identifiers — model names and variant labels introduced in Methodology must be used character-for-character in tables, figures, and prose throughout Results and Discussion.
- Tense and voice convention — established in the bible (e.g., present tense for general claims, past tense for experimental actions); must not flip within or across sections.
- Citation keys — a cited work must always use the same BibTeX key and the same short-form author-year handle in prose; no two different keys for the same work.

