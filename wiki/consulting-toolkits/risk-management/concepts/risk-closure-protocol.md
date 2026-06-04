---
type: concept
slug: risk-closure-protocol
title: Risk Closure Protocol
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Risk Closure Protocol

*Category: governance · Toolkit: Risk Management*

## What it is
A structured decision process that governs when and how a risk is formally removed from the active risk register, ensuring that no risk is silently dropped without documented rationale, and that materialized risks transition correctly to the issue log.

**Origin:** Formal risk closure processes are specified in ISO 31000 under 'monitoring and review' and in the PMI Practice Standard for Risk Management under 'risk closure.' The concept of a formal closure decision — as opposed to silently removing risks — emerged from project risk management practice in the 1990s, where risk registers were frequently 'cleaned up' before program reviews, hiding material risks from oversight.

## Why it works
Risk registers that are allowed to grow without a formal closure process become unmanageable — after 18 months, a register can contain hundreds of risks of which only 20 are genuinely current. Without closure criteria and a formal process, risk owners manage the register by deleting old risks, which destroys the historical record and undermines the audit trail. The closure protocol creates a disciplined alternative: a risk is closed when a specific, documented condition is met, with CRO approval, and the closed risk record is archived rather than deleted. The protocol also defines the critical boundary between a risk that is no longer relevant (close and archive) and a risk that has materialized (transfer to the issue log, not close in the register).

## When to use
Phase 6 (Risk Closure and Issue Management), Step 1. Applied at every risk review cycle as a standing agenda item. Also triggered immediately when a risk event occurs (materialization criterion).

## Visual
`process-flow`

## Step-by-step tutorial
1. Define the three closure criteria with organizational-specific examples in the Risk Management Policy: (1) Materialization criteria (what constitutes 'the risk event has occurred'?); (2) Relevance criteria (what constitutes 'the underlying driver no longer exists'? — e.g., regulatory requirement withdrawn, product line discontinued, technology decommissioned); (3) Cost-effectiveness criteria (what is the threshold below which tracking a risk costs more than the risk is worth? — typically when residual score < 3 on the 5×5 and the risk has been stable for 4+ consecutive quarters).
2. At each risk review meeting, include a standing agenda item: 'Risks proposed for closure.' Risk owners present closure proposals; the CRO challenges and approves or rejects.
3. For materialized risks: update the risk status to 'Closed — Materialized' and simultaneously open a new issue record in the issue log. The issue record must reference the source Risk ID. Never close a materialized risk without opening a corresponding issue.
4. For non-materialized closures: update status to 'Closed — No Longer Relevant' or 'Closed — Below Threshold' and document the rationale in the risk record. The rationale must be sufficient for an auditor reviewing the record 2 years later to understand why the closure was appropriate.
5. Archive closed risks in a dedicated 'Closed Risks' section of the risk register (a separate tab in Excel or a closed status filter in a GRC tool). Never delete closed risk records — the historical record is required for audit, regulatory review, and recurrence detection.
6. Report closed risks to the Board quarterly: 'N risks closed this period. Breakdown by reason: X materialized (transferred to issue log); Y no longer relevant; Z below threshold.' This demonstrates that the register is actively managed, not a static list.
7. At the annual risk review, conduct a 'closed risk look-back': review all risks closed in the prior year. Did any of the 'no longer relevant' closures turn out to be premature? Did any 'below threshold' closures re-emerge as material risks? Use this analysis to calibrate the closure criteria.

## Real-life example — Barclays plc
Barclays' Group Risk function applies formal closure criteria to its risk register, reporting closed risks in its annual Pillar 3 disclosure. In 2020, Barclays formally closed the 'Brexit transition uncertainty' risk (closed in the 'No Longer Relevant' category after the UK-EU Trade and Cooperation Agreement was signed in December 2020, eliminating the 'no-deal Brexit' scenario that had driven the risk since 2016). The closure record documented: the specific risk event that was closed (no-deal trade disruption), the trigger event (TCA signing), and the residual risks that remained relevant (regulatory divergence between UK and EU — a new risk opened in the register). This example illustrates a key nuance: closure of one risk often requires the simultaneous opening of a related new risk, demonstrating that the risk register is a living document that evolves with the environment.

**So what:** Barclays' Brexit risk closure demonstrates that 'no longer relevant' closures require careful scoping: the specific risk scenario (no-deal trade disruption) was closed while the broader risk category (regulatory divergence) remained relevant and required a new register entry. Good closure practice always asks: 'Is there a residual or related risk that should be opened?'

## Template
Complete this form for each risk proposed for closure. Obtain CRO sign-off before updating the register. Archive the completed form in the risk management document library.

- [ ] Risk ID and description
- [ ] Date of closure proposal
- [ ] Proposing owner (risk owner recommending closure)
- [ ] Closure criterion (select one): (a) Risk materialized → issue log | (b) Risk no longer relevant | (c) Below appetite threshold + tracking not cost-effective
- [ ] Evidence supporting the closure criterion (specific facts, events, or metrics that justify the criteria being met)
- [ ] If criterion (a): Issue Log ID of the corresponding issue record
- [ ] If criterion (b) or (c): rationale for closure (sufficient for an auditor reviewing the record 2 years later)
- [ ] Residual risks: are there any related risks that should be opened as new register entries? (Y/N) If Y: Risk ID of new entries
- [ ] CRO recommendation (Approve / Reject) with rationale
- [ ] Date of CRO approval
- [ ] Risk register status updated to 'Closed' (Y/N) and date
- [ ] Reporting: included in next Board quarterly report (Y/N)

## Pitfalls
- Closing risks to 'clean up' the register before a Board review — a sudden reduction in risk count before a major governance review is a red flag, not an achievement. Counter: require all closure decisions to be documented and approved at the prior risk committee meeting, not retroactively after the review.
- Treating 'no longer relevant' as a default for risks the team is tired of managing — a risk is 'no longer relevant' when its underlying driver has been eliminated, not when the team has lost interest. Counter: require specific evidence of the eliminated driver for every 'no longer relevant' closure.
- Closing a materialized risk without opening an issue record — the risk event occurred but the issue is never formally tracked or investigated. Counter: make the simultaneous issue log update a mandatory step in the closure procedure for any 'materialized' closure.
