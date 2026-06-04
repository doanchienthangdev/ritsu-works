---
type: concept
slug: issue-escalation-protocol
title: Issue Escalation Protocol
source_collection: consulting-toolkits
toolkit: risk-management
domain: governance
category: governance
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Issue Escalation Protocol

*Category: governance · Toolkit: Risk Management*

## What it is
A governance document that defines the escalation chain, decision authority, response timelines, and communication requirements for issues of different severity levels — ensuring that material incidents reach the right level of organizational authority within defined time limits.

**Origin:** Escalation protocols as a formal governance mechanism originate in military command structures and were adapted for corporate use through operational risk management practice (Basel II operational risk definition, 2004) and incident management standards (ITIL v3, ISO 22301 Business Continuity). The financial services sector mandated escalation protocols through regulatory guidance (PRA, FCA, SEC) following the 2008 financial crisis, where inadequate escalation of subprime exposure was identified as a systemic governance failure.

## Why it works
The most common single point of failure in risk-to-issue management is the interval between when an issue is identified at the operational level and when it reaches the authority level capable of commissioning an effective response. Without a protocol, issues escalate inconsistently — some small issues escalate immediately while some material issues are managed locally for weeks before reaching the CRO. The escalation protocol eliminates discretion from the escalation decision: if the issue meets the Level 2 criteria (financial impact > €X, operational disruption > Y hours, regulatory notification required), it escalates to the CRO within 24 hours — not because someone decided to, but because the protocol requires it.

## When to use
Phase 6 (Risk Closure and Issue Management), Step 2. Activated whenever a risk materializes into an issue. Must be designed and tested in Phase 1 (governance structure design), not built for the first time during an incident.

## Visual
`table`

## Step-by-step tutorial
1. Define the escalation criteria thresholds for each level based on the Risk Appetite Statement quantitative thresholds. Level boundaries should correspond to the RAS appetite bands: Level 1 = within appetite; Level 2 = approaching appetite boundary; Level 3 = exceeding appetite.
2. Define the escalation chain clearly: for each level, who must be notified (by role and name), by what channel (phone for Level 3, email for Level 2, issue log for Level 1), and within what timeframe.
3. Write the regulatory notification trigger explicitly: which regulatory bodies must be notified for which types of issues? For GDPR issues: supervisory authority notification within 72 hours if there is a risk to individuals' rights and freedoms. For financial services: FCA/PRA notification for operational incidents meeting material threshold. For healthcare: regulatory notification for patient safety events.
4. Test the protocol before it is needed: conduct an annual escalation drill using a realistic scenario. Start the drill at the Level 3 criteria and time how long it takes to reach the CEO. If the drill fails (e.g., no one knows the Level 3 notification number for the CEO), fix it before a real incident occurs.
5. Publish the escalation protocol in the Risk Management Policy and in a laminated one-page reference card for all risk owners, business unit leaders, and executive assistants. The protocol must be accessible without the risk register or policy document — people in an incident do not open SharePoint.
6. Review the protocol annually: thresholds may need adjustment based on organizational growth (a €1M threshold that was material at €100M revenue may be immaterial at €1B revenue), and the escalation chain may change with organizational restructuring.
7. After every Level 2 or 3 escalation, conduct a post-incident review of the escalation process: how long did it take to escalate from identification to the appropriate authority? What delayed it? What can be improved?

## Real-life example — AstraZeneca plc
AstraZeneca's pharmacovigilance (drug safety) escalation protocol defines Level 3 as: any adverse event signal that could indicate a previously unrecognized safety risk in an approved medicine. At Level 3, the escalation chain requires notification to the Chief Medical Officer within 1 hour, the CEO within 4 hours, the Board Safety Committee Chair within the same day, and the relevant regulatory authority (EMA, FDA, MHRA) within 24 hours. This protocol was tested during the COVID-19 vaccine roll-out when AstraZeneca identified a potential signal between the ChAdOx1-S vaccine and thrombocytopenia. The Level 3 protocol was activated within 2 hours of the signal identification; the EMA was notified within 24 hours; the resulting scientific investigation was completed within 10 days. The speed and transparency of the escalation process was cited by regulators as evidence of responsible pharmacovigilance.

**So what:** AstraZeneca's pharmacovigilance escalation demonstrates that a pre-designed protocol with defined criteria, timelines, and chains removes the dangerous ambiguity of 'who decides whether this is serious enough to escalate?' that allowed other pharmaceutical companies' safety signals to be managed locally for too long.

## Template
Define the three escalation levels with organization-specific thresholds. The thresholds must be derived from the Risk Appetite Statement. Publish as a laminated one-page card for all risk owners.

- [ ] Level 1 (Managed): Financial impact threshold (€ upper limit), operational disruption threshold (hours upper limit), regulatory notification criteria (list conditions)
- [ ] Level 1: Authority (who manages?), logging timeline, notification recipients
- [ ] Level 2 (Escalated): Financial impact threshold (€ range), operational disruption threshold (hours range), escalation authority (role + name), notification timeline
- [ ] Level 2: Notification recipients, channel, response actions required
- [ ] Level 3 (Critical): Financial impact threshold (€ floor), operational disruption threshold (hours floor), authority (CEO/Board), notification timeline
- [ ] Level 3: Notification recipients (including regulatory bodies), channel, response protocol (reference to crisis management plan)
- [ ] Regulatory notification requirements by incident type (GDPR, financial services, healthcare, etc.)
- [ ] Escalation drill schedule (annual — date and scenario type)
- [ ] Protocol owner and last review date

## Pitfalls
- Defining escalation criteria that are too broad — if everything meets Level 3 criteria, the CEO will be notified for minor incidents and will stop taking escalations seriously. Counter: calibrate thresholds against historical incident data — what % of past incidents would have been Level 3 under the proposed criteria? Target 0–2 Level 3 escalations per year.
- Escalation protocol that exists only in a policy document — in a real incident, people do not read policy documents. Counter: publish the protocol as a laminated one-page reference card (or mobile app push notification template) that all risk owners and executive assistants can access immediately without a computer.
- Regulatory notification timelines not defined per regulation — 'we will notify the regulator when appropriate' is not a protocol. Counter: for every relevant regulation, define the specific notification threshold, the timeline (e.g., GDPR: 72 hours), the recipient (specific regulatory body and contact), and the notification content template.
