---
type: concept
slug: 4t-risk-response
title: 4T Risk Response Framework (Tolerate, Treat, Transfer, Terminate)
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# 4T Risk Response Framework (Tolerate, Treat, Transfer, Terminate)

*Category: governance · Toolkit: Risk Management*

## What it is
A decision framework that classifies available risk responses into four mutually exclusive options — Tolerate, Treat, Transfer, Terminate — ensuring every High and Medium risk has an explicit, board-defensible response strategy before mitigation actions are designed.

**Origin:** The 4T framework (also called Avoid-Reduce-Transfer-Accept in some traditions) originates from insurance risk management practice (Lloyd's of London, 1980s) and was codified for enterprise risk management by ISO 31000 (under the term 'risk treatment') and the UK HM Treasury Orange Book. Widely used by McKinsey, Deloitte, and PwC in enterprise risk management engagements.

## Why it works
Without an explicit response option decision, organizations default to treating all risks — even those that are best transferred (via insurance) or terminated (by exiting the activity). The 4T framework forces a conscious choice at the risk level, separate from the action design. This prevents two failure modes: (a) treating risks that are more efficiently transferred or terminated (wasting mitigation resources); (b) tolerating risks that exceed the appetite without a documented decision (creating governance gaps). The framework is applied at the risk level, not the action level — one risk has one response option; the response option then drives the type of action designed.

## When to use
Phase 5 (Risk Mitigation), Step 1. Apply to all High and Medium priority risks before designing mitigation actions. Also use in the annual risk appetite review to challenge whether existing Tolerate decisions remain appropriate.

## Visual
`comparison`

## Step-by-step tutorial
1. After the risk assessment and prioritization phase is complete, convene a risk response selection session with each risk owner. For every High and Medium priority risk, work through the 4T decision in order: Terminate → Transfer → Treat → Tolerate (this order ensures the most decisive options are considered first, preventing default to 'Treat all').
2. Apply Terminate: Is this risk inherent to an activity the organization could exit without unacceptable strategic cost? If yes, and the risk exceeds appetite, terminate as the primary option. If no, proceed.
3. Apply Transfer: Is this risk insurable or contractually transferable at a cost lower than the expected loss? For cyber risks: is cyber insurance available and affordable? For contractual risks: does the contract already allocate this risk to a counterparty? If yes, Transfer. If no, proceed.
4. Apply Treat: Can specific actions reduce the likelihood or consequence below the appetite threshold at a cost lower than the expected loss reduction? If yes, Treat. Design SMART actions. If no (i.e., treatment is not feasible or cost-effective), proceed.
5. Apply Tolerate: If the risk cannot be efficiently terminated, transferred, or treated, document the rationale for acceptance and obtain CRO/Board sign-off. 'Tolerate' requires explicit governance approval — it is not a default.
6. Record the selected response option in the risk register alongside the rationale. The rationale is the governance artefact — it demonstrates that the choice was deliberate, not accidental.
7. Review response options at each annual risk review cycle. Insurance markets change; new treatment options emerge; the cost–benefit of each option should be re-evaluated.

## Real-life example — Maersk (A.P. Moller-Maersk)
Following the NotPetya cyberattack in 2017 (which cost Maersk ~$300M in operational disruption), Maersk applied the 4T framework explicitly to its post-incident cyber risk portfolio. 'Terminate': Maersk exited several legacy software platforms that were inherently vulnerable (cannot be patched) — a Terminate decision. 'Transfer': Maersk purchased cyber insurance coverage of $50M per incident as a transfer mechanism for financial losses from future incidents. 'Treat': Maersk implemented a network segmentation program and mandatory MFA across all global operations to reduce the likelihood of lateral movement in a future attack. 'Tolerate': A residual risk of 'sporadic nation-state targeted attacks causing <3 days operational disruption' was formally tolerated as within appetite after the treatment program was complete.

**So what:** NotPetya forced Maersk to apply all four T responses simultaneously to different aspects of the same risk category — a real-world demonstration that cyber risk is not a single risk but a portfolio of sub-risks requiring different response strategies.

## Template
Complete one row per High or Medium priority risk. Use the 4T decision logic in order: Terminate first, then Transfer, then Treat, then Tolerate. Obtain CRO sign-off on all 'Tolerate' decisions.

- [ ] Risk ID and brief description
- [ ] Residual Risk Score and Priority Tier
- [ ] Terminate: Is it feasible to exit the risk-creating activity? (Y/N) If Y: exit plan and timeline
- [ ] Transfer: Is the risk insurable or contractually transferable? (Y/N) If Y: mechanism, cost, and residual risk post-transfer
- [ ] Treat: Can specific actions reduce residual to within appetite? (Y/N) If Y: list 2–5 SMART actions with owners and dates; projected residual post-treatment
- [ ] Tolerate: If treating is not cost-effective, record: rationale for acceptance, monitoring frequency, trigger for re-assessment, and CRO/Board approval date
- [ ] Selected Response Option (final choice: Tolerate / Treat / Transfer / Terminate)
- [ ] Rationale for the selected option (1–2 sentences: why this option over the others?)

## Pitfalls
- Defaulting to 'Treat' without considering Transfer or Terminate — most risk teams never evaluate whether a risk could be more efficiently transferred via insurance or eliminated by exiting an activity. Counter: enforce the Terminate → Transfer → Treat → Tolerate sequence explicitly in the response selection protocol.
- Treating 'Tolerate' as a passive default rather than an active governance decision — 'we haven't got around to treating this risk' is not a Tolerate decision. Counter: require CRO or Board sign-off for every Tolerate decision, with a documented rationale.
- Transfer as a risk elimination — transferring a risk via insurance does not eliminate the risk; it transfers the financial consequence. The operational disruption, reputational damage, and regulatory exposure often remain. Counter: always calculate the residual risk after the transfer mechanism is applied — it is rarely zero.
