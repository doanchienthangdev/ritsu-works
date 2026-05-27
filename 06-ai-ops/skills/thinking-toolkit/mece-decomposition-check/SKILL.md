---
name: thinking-toolkit/mece-decomposition-check
description: |
  Use as a 2-test quality gate on any list, decomposition, or grouping
  output. Overlap test (do any items chồng lấp / overlap in meaning?) +
  Exhaustive test (are there missing cases?). MECE = Mutually Exclusive,
  Collectively Exhaustive. Apply to: pyramid supporting points, /cla
  options-generator candidates, brainstorm output, KPI groupings,
  customer segment lists, root-cause branches.

  Trigger conditions: any list with 3+ items destined for founder
  consumption; pyramid-principle supporting points (mandatory); /cla
  options-generator output (mandatory); brainstorm synthesis; persona
  category breakdowns.

  Skip when: ordered sequence where order has meaning (steps, chronology);
  intentionally incomplete exploration; single-item lists; tag-style
  multi-membership groupings.

  Cost: zero LLM (rules-based check). ~2-5 min per list. Catches ~40% of
  unstructured business lists that have overlap or gaps.
allowed-tools: []
disable-model-invocation: false
---

# MECE Decomposition Check

> Lists fail in two ways: items overlap, or cases are missing. Test both before sending.

MECE — **M**utually **E**xclusive, **C**ollectively **E**xhaustive — is McKinsey's mandatory check on any decomposition. The premise: if you split a problem into pieces, the pieces should (a) not overlap (mutual exclusion) and (b) cover the whole problem (collective exhaustion). Failing either creates double-counting or blind spots.

Most business lists fail this check. "Our customer segments are: students, professionals, and people who want to learn." → Professionals can be students. Students who want to learn — overlap with "people who want to learn". This list is not MECE.

## When to use

**Mandatory:**
- Pyramid-principle supporting points (3+ items)
- /cla options-generator outputs (when N options proposed)
- Customer segmentation lists
- KPI category groupings
- Root-cause analysis branches
- Anywhere a list claims to "cover" a topic

**Recommended:**
- Persona output with multi-item supporting points
- Cost-bucket breakdowns
- Risk inventories
- Failure-mode taxonomies

## When NOT to use

**Skip for:**
- Ordered sequences where order = meaning (build steps, timeline, narrative chronology)
- Intentionally incomplete exploration ("here are 3 ideas; not exhaustive")
- Single-item lists (no overlap possible)
- Tag-style multi-membership groupings (an entity can have multiple tags by design)
- Lists where membership is fuzzy by definition (e.g., "users who might benefit")

**Anti-pattern:** Applying MECE to inherently overlapping categories. Some real-world dimensions overlap (a customer can be both "high-value" and "high-risk"); MECE force-fitting breaks the model. Use 2x2-synthesis-matrix instead — it allows overlap by design.

## How to apply

### Step 1 — State the parent

Write the parent question/topic the list is supposed to cover. Without this, MECE is undefined.

Example: "What are the reasons our free-to-paid conversion dropped?"

### Step 2 — Overlap test (Mutually Exclusive)

For every pair of items in the list, ask: **could a single instance belong to both?** If yes, the list has overlap.

Example list of conversion-drop causes:
1. New users don't see value
2. Pricing too high
3. Free tier too generous
4. Activation flow has friction

Pair checks:
- (1, 2): can a user both "not see value" AND "find pricing too high"? Yes — they see value lower than the price. Overlap.
- (1, 3): "not see value" AND "free tier too generous"? Yes — they get enough free without seeing more value. Overlap.
- (3, 2): "free tier too generous" AND "pricing too high"? Yes — same root, different framing. Overlap.

→ This list fails M. Restructure into orthogonal dimensions.

**Fix:** Split by user-journey stage:
1. Pre-signup (didn't sign up)
2. Activated but didn't see value (signed up, hit aha-moment, no upgrade signal)
3. Saw value but rejected price (signed up, saw value, declined offer)
4. Upgraded then churned (paid, didn't renew)

Now each user belongs to exactly one stage. Pairs are non-overlapping.

### Step 3 — Exhaustive test (Collectively Exhaustive)

Ask: **what cases am I missing?** What's the bucket "other" would catch?

For the fixed conversion-drop list:
- Did I include people who never finished signup (account creation fail)? → No. **Missing case.**
- Did I include people who weren't in our ICP at all (junk signups)? → No. **Missing case.**

**Fix:** Add the missing cases OR add an explicit "Other (X% of users)" bucket. The list now covers the full population:

1. Failed signup (technical/abandon)
2. Out of ICP (junk)
3. Pre-aha (didn't activate)
4. Post-aha pre-offer (activated, no upgrade signal)
5. Offer rejected (declined paid)
6. Upgraded then churned

### Step 4 — Declare the MECE-check result

In the output, after the list, add a line:

```
**MECE check:** Pass. Parent question: <question>. M ✓ (pairs orthogonal across user-journey stages). C ✓ (all states from pre-signup to post-churn enumerated).
```

OR if the list is NOT meant to be MECE:

```
**MECE check:** N/A — exploratory list, not claimed exhaustive.
```

Explicit declaration prevents reader from assuming MECE when it's not.

## Worked examples

### Example 1 — GOOD (passes both tests)

**Parent:** "What are the four primary failure modes of /evolve runs?"

**List:**
1. Score-fn drift (judge model interpreted criteria differently across iterations)
2. Apply-fn failure (proposer diff didn't merge cleanly to file)
3. Re-score regression (post-install score lower than pre-install — patch worse)
4. Hooks blocked (drift check failed after install)

**MECE check:**
- M: Each failure is a distinct stage of /evolve pipeline (score → apply → re-score → drift). One run can hit one failure mode at a time. M ✓.
- C: Cover the full pipeline — pre-score, install/apply, post-score, post-install drift. Anything else? "User cancellation" — separate state, not a failure. "Out of budget" — separate halt, not a stage failure. C ✓.

**Result:** MECE pass. Safe to use as pyramid supporting points.

### Example 2 — ANTI-PATTERN (fails both)

**Parent:** "What kinds of customers should we target?"

**List:**
1. Students
2. Working professionals
3. People who want to learn from books
4. AI enthusiasts
5. International users

**MECE check:**
- M: (Students, professionals): an MBA student is both. (Students, want-to-learn-from-books): students often learn from books. (Professionals, AI-enthusiasts): AI engineers are both. (International, all others): international students/professionals/etc. — overlaps with every other category. M ✗ (heavy overlap).
- C: Covers college students. Misses: high schoolers, retirees, hobbyists, K-12 educators. C ✗ (gaps).

**Result:** MECE fail. Restructure by orthogonal dimensions (e.g., by "primary use-case" — exam prep / skill development / curiosity / professional certification — and have geography as separate dimension).

### Example 3 — EDGE CASE (intentionally non-MECE, declared)

**Parent:** "What thinking-toolkit skills should I consider for my output?"

**List:**
1. pyramid-principle-output (always)
2. so-what-test (always — pairs with pyramid)
3. tosca-problem-framing (if framing a problem)
4. mece-decomposition-check (if list with 3+ items)
5. 2x2-synthesis-matrix (if many options)
6. driver-tree-decomposition (if metric-driven)

**MECE check:** N/A — tag-style applicability list. A single output can use multiple skills simultaneously by design. MECE doesn't apply.

**Result:** Correctly declared non-MECE. The list is useful as a composition guide, not a partition.

## Composition notes

### With `pyramid-principle-output`
Mandatory pair. Apply MECE check to the supporting points BEFORE finalizing the pyramid structure. Pyramid that fails MECE is structurally weak.

### With `so-what-test`
Different filters. MECE checks STRUCTURE (do pieces fit together?). So-what checks SUBSTANCE (does each piece matter?). Apply both; an item that passes MECE but fails so-what is well-categorized trivia.

### With `2x2-synthesis-matrix`
For lists that AREN'T naturally MECE (overlapping properties), use 2x2 instead. MECE for partitions; 2x2 for multi-dimensional classifications.

### With `tosca-problem-framing`
Apply MECE to the Actors list in TOSCA. Are actors overlapping (e.g., "founder" and "@ceo" — same entity)? Are any missing (users? external dependencies?)?

### With `driver-tree-decomposition`
At each level of the driver tree, siblings must be MECE. "MRR drivers = users × ARPPU" — M ✓ (orthogonal multiplicands), C ✓ (definitional). But "MRR drivers = users, churn, pricing" — M ✗ (churn affects users; pricing affects ARPPU which affects MRR). Apply MECE at every tree level.

## References

- Minto, Barbara. *The Pyramid Principle* (1987) — first published codification.
- McKinsey internal training (1960s-present). MECE is taught alongside Pyramid in the first week of consultant onboarding.
- Ethan Rasiel, *The McKinsey Way* (1999) — popular-press treatment.

## Anti-claims

- MECE is NOT a check for content quality. A MECE list can still be misleading or wrong.
- MECE is NOT always achievable. Some domains have inherent overlap (e.g., customer attributes); force-fitting MECE breaks the model. Use 2x2 instead.
- MECE is NOT a substitute for thinking. It catches structural failures; it doesn't generate the right partition.
- MECE applies to PARTITIONS, not all groupings. Tags, fuzzy categories, and multi-membership lists are not MECE candidates.
