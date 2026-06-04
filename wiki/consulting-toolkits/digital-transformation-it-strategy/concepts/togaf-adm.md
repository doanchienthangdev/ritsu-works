---
type: concept
slug: togaf-adm
title: TOGAF Architecture Development Method (ADM)
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: architecture
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# TOGAF Architecture Development Method (ADM)

*Category: architecture · Toolkit: Digital Transformation & IT Strategy*

## What it is
The most widely-adopted enterprise architecture framework, providing a structured methodology for developing, maintaining, and governing enterprise architecture across four domains (Business, Data, Application, Technology) in an iterative cycle of phases from requirements through to architecture governance.

**Origin:** Developed by The Open Group, with the first version of TOGAF published in 1995, derived from the US Department of Defense's TAFIM framework. TOGAF 9.2 is the current version (2018). TOGAF is used by 80% of Global 50 companies as their enterprise architecture standard.

## Why it works
Digital transformation creates massive architectural complexity: dozens of new systems, integrations, data flows, and technology decisions must be made coherently to avoid creating a new generation of technical debt. TOGAF ADM provides a structured method for managing this complexity: start from business requirements (Phase B: Business Architecture), derive data requirements from business needs (Phase C: Information Systems), define the application landscape (Phase C: Application Architecture), then specify the technology infrastructure (Phase D: Technology Architecture). This demand-driven approach ensures that technology decisions are driven by business requirements, not technology preferences.

## When to use
Use in Phase IT-I Step 1 (Enterprise Architecture current state) and to define the target-state architecture blueprint. Also use at the start of any major system selection (ERP, CRM, data platform) to ensure the selection is made within the architecture principles context.

## Visual
`cycle`

## Step-by-step tutorial
1. 1. Preliminary: establish the architecture practice. Define the Architecture Principles (8–12 principles governing all architecture decisions; e.g., 'Cloud-first', 'API-first', 'Security by design'). Agree the architecture governance process (Architecture Review Board).
2. 2. Phase A — Architecture Vision: define the scope of the architecture work (which business units, which time horizon). Identify key stakeholders. Create a high-level Architecture Vision document (1 page: current state problem, future state intent, key architecture decisions required).
3. 3. Phase B — Business Architecture: document the current-state business processes, organisational capabilities, and information flows. Use a Business Capability Map to show the capabilities required to execute the business strategy.
4. 4. Phase C — Information Systems Architecture: define the Data Architecture (key data entities, data flows, data ownership) and the Application Architecture (application portfolio map showing all applications, their functions, integrations, and technical health status).
5. 5. Phase D — Technology Architecture: define the infrastructure, cloud architecture, network, security, and integration platform. Identify legacy infrastructure for retirement. Map the target state technology blueprint.
6. 6. Phase E — Opportunities and Solutions: identify the work packages (projects) required to move from current state to target state architecture. Group into a transition architecture (the intermediate state).
7. 7. Phase F — Migration Planning: sequence the work packages, respecting dependencies. Align with the Digital Transformation Roadmap. Produce the Architecture Roadmap.
8. 8. Phase G — Implementation Governance: establish architecture compliance reviews for each major project. The Architecture Review Board assesses all significant design decisions against the Architecture Principles. Issue Architecture Compliance Notices for deviations.
9. 9. Phase H — Architecture Change Management: monitor the deployed architecture against the target. Trigger a new ADM cycle when significant business or technology change requires architectural revision.

## Real-life example — Royal Dutch Shell
Shell's enterprise architecture programme (TOGAF-based) underpinned its digital transformation in the 2010s–2020s. Shell's EA team mapped the current-state architecture across 8 business divisions and identified 1,200+ business applications, of which approximately 350 were candidates for rationalisation. The Architecture Vision for the digital transformation set three principles that governed all subsequent architecture decisions: 'Cloud-native by default' (new systems deployed in cloud unless there is a specific reason not to), 'One data platform' (all business-critical data accessible through a single data layer), and 'API-first integration' (no point-to-point integrations). These principles, enforced through the Architecture Review Board, prevented the proliferation of new technical debt that had characterised previous transformation waves. By 2022, Shell had reduced its application portfolio to approximately 800 and was running 70%+ of workloads in cloud.

**So what:** TOGAF's greatest value is not the detailed architecture documentation — it is the Architecture Principles and the Architecture Review Board. Without these two mechanisms, every project makes independent architecture decisions, resulting in a new generation of integration complexity that undoes the transformation's value.

## Template
Complete the Architecture Baseline for each of the four TOGAF domains. Use the four-domain structure to identify current-state issues and define the target state.

- [ ] BUSINESS ARCHITECTURE: Core business processes (list top 10): [Fill in]
- [ ] Business capabilities map (list capabilities by strategic importance): [Fill in]
- [ ] Business architecture pain points with IT implications: [Fill in]
- [ ] DATA ARCHITECTURE: Key data entities (top 10): [Fill in]
- [ ] Data quality issues identified: [Fill in]
- [ ] Data ownership gaps: [Fill in]
- [ ] APPLICATION ARCHITECTURE: Total applications in portfolio: [n]
- [ ] Applications to retain: [n] | Applications to decommission: [n] | Technical debt rating (High/Medium/Low): [Fill in]
- [ ] Integration map key points: [Fill in]
- [ ] TECHNOLOGY ARCHITECTURE: On-premise footprint: [Fill in]
- [ ] Cloud adoption current state: [Fill in]
- [ ] Network architecture: [Fill in]
- [ ] Cybersecurity posture rating: [Fill in]
- [ ] IT ARCHITECTURE PRINCIPLES (8–12): [List each principle with rationale]
- [ ] ARCHITECTURE REVIEW BOARD: Members, meeting cadence, decision rights: [Fill in]

## Pitfalls
- Architecture for architecture's sake — TOGAF produces large volumes of documentation that can become ends in themselves; focus on the Architecture Principles and the Application Portfolio Map as the minimum viable artefacts that drive real decisions.
- Skipping business architecture — jumping straight to technology architecture without documenting business capabilities and data flows produces technically correct but business-irrelevant architecture.
- Architecture Governance without teeth — an Architecture Review Board that cannot say 'no' to non-compliant designs adds no value; the ARB must have real authority to block projects that violate Architecture Principles.
- Current-state focus — the purpose of documenting current state is to identify what to change; avoid the trap of spending 80% of effort on documenting the current state and 20% on defining the target.
