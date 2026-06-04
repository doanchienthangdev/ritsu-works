---
type: concept
slug: itil4-framework
title: ITIL 4 IT Service Management Framework
source_collection: consulting-toolkits
toolkit: digital-transformation-it-strategy
domain: technology
category: operations
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# ITIL 4 IT Service Management Framework

*Category: operations · Toolkit: Digital Transformation & IT Strategy*

## What it is
The IT Infrastructure Library (ITIL) 4 is the world's most widely adopted IT service management framework, defining how IT services are created, delivered, and improved through the Service Value Chain, 34 management practices, and the guiding principles of value co-creation.

**Origin:** ITIL was originally developed by the UK government's CCTA (Central Computer and Telecommunications Agency) in the 1980s to standardise IT service management. ITIL v3 (2007) introduced the service lifecycle. ITIL 4 (published by AXELOS in 2019) restructured around the Service Value System and value chain, incorporating Agile and DevOps principles.

## Why it works
IT delivers value through services, not technologies. A cybersecurity platform is not inherently valuable — the service of protecting the business from breaches is. ITIL 4 structures IT service delivery around the Service Value Chain (Plan → Improve → Engage → Design & Transition → Obtain/Build → Deliver & Support) and 34 management practices (formerly 'processes') that organisations implement based on their context and maturity. The Guiding Principles (e.g., 'Focus on value', 'Start where you are', 'Progress iteratively') help practitioners apply ITIL without dogma.

## When to use
Use in Phase IT-II Step 4 (Define IT Service Strategy) to design the IT service management framework. Also use in Phase IT-III Step 5 (IT Governance) to define the Change Advisory Board and IT governance processes for service changes.

## Visual
`value-chain`

## Step-by-step tutorial
1. 1. Define the Service Catalogue: list all IT services delivered to the business. For each, define: service name, description, SLA (availability, response time, recovery time), service owner, cost. Publish the service catalogue for business users.
2. 2. Implement Incident Management: define the incident lifecycle (Log → Categorise → Prioritise → Diagnose → Resolve → Close). Define priority levels (P1–P4) with response and resolution targets. Set up the service desk (single point of contact for all IT incidents).
3. 3. Implement Problem Management: distinguish Incidents (service disruptions) from Problems (root causes of recurring incidents). Implement a Known Error Database. Assign Problem Managers to investigate high-frequency incidents and eliminate root causes.
4. 4. Implement Change Enablement: define the Change Advisory Board (CAB) for reviewing significant IT changes before implementation. Categorise changes as Standard (pre-approved, low-risk), Normal (requires CAB approval), or Emergency (expedited path for critical fixes).
5. 5. Implement Service Level Management: negotiate SLAs with business stakeholders for each service. Monitor SLA performance monthly. Report SLA compliance to the IT Steering Committee.
6. 6. Implement Continual Service Improvement (CSI): establish a CSI register capturing all improvement opportunities. Prioritise using an impact/effort matrix. Track improvement progress monthly.
7. 7. Establish the service transition process: for all new or significantly changed services, complete a Service Transition checklist (documentation, training, service desk briefing, monitoring setup, go-live criteria) before releasing to production.
8. 8. Measure with the four ITIL Key Metrics: (1) Incident Volume and Resolution Rate; (2) SLA Compliance (%); (3) First Contact Resolution Rate (service desk); (4) Change Success Rate (% of changes implemented without incident).

## Real-life example — Microsoft (internal IT — Microsoft IT / One Commercial Partner)
Microsoft's internal IT organisation (now Microsoft Digital) uses ITIL-aligned service management as the backbone of its IT operations for 200,000+ employees globally. Microsoft's implementation includes: a unified Service Desk (16,000+ tickets/day globally), an automated Incident Management system integrated with Microsoft Teams for real-time incident communication, and a fully digitised Change Advisory Board process (all CAB approvals completed through a ServiceNow workflow). Microsoft's reported SLA compliance for Tier 1 services (Teams, Office 365, Azure DevOps) exceeds 99.95% availability. The ITIL framework also underpins Microsoft's commercial IT service offerings — the practices that Microsoft refined internally became the basis of its Managed Services portfolio.

**So what:** ITIL is not bureaucracy — it is the operating procedure for reliable IT service delivery. Microsoft's use of ITIL at scale demonstrates that the framework is compatible with DevOps velocity (Microsoft releases software multiple times per day) when implemented thoughtfully, not dogmatically.

## Template
Complete the IT Service Catalogue and the key ITIL practice definitions. Start with Incident Management and Service Level Management — these are the minimum viable ITIL implementation.

- [ ] SERVICE CATALOGUE
- [ ] Service Name | Description | SLA (Availability %) | SLA (Response Time) | SLA (Recovery Time) | Service Owner | Monthly Cost (£/$)
- [ ] [List all IT services — typically 20–50]
- [ ] INCIDENT MANAGEMENT
- [ ] Priority 1 (Critical) criteria: [Fill in] | Target response: [X mins] | Target resolution: [X hrs]
- [ ] Priority 2 (High) criteria: [Fill in] | Target response: [X mins] | Target resolution: [X hrs]
- [ ] Priority 3 (Medium) criteria: [Fill in] | Target response: [X hrs] | Target resolution: [X days]
- [ ] Priority 4 (Low) criteria: [Fill in] | Target response: [X hrs] | Target resolution: [X days]
- [ ] Service Desk contact channels: [Fill in]
- [ ] CHANGE ENABLEMENT
- [ ] Standard change types (pre-approved): [List]
- [ ] Normal change process: CAB review by [Date] | Implementation window: [Fill in]
- [ ] Emergency change process: [Fill in]
- [ ] SERVICE LEVEL MANAGEMENT
- [ ] SLA review frequency: [Monthly / Quarterly]
- [ ] SLA compliance target (% of services meeting SLA): [X]%
- [ ] SLA compliance reporting audience: [IT Steering Committee / CIO / ExCo]
- [ ] CONTINUAL IMPROVEMENT
- [ ] CSI register location: [Fill in]
- [ ] CSI review frequency: [Monthly]
- [ ] Top 3 current improvement initiatives: [List]

## Pitfalls
- ITIL as bureaucracy — implementing ITIL processes as tick-box exercises (CAB meetings where every change is approved regardless of risk) creates bureaucracy without safety; the CAB must have real authority to decline or defer changes.
- Over-implementing ITIL at once — ITIL 4 has 34 practices; implementing all simultaneously is impossible and counterproductive. Start with Incident Management, Service Level Management, and Change Enablement as the minimum viable set.
- Ignoring the DevOps integration — ITIL 4 explicitly incorporates Agile and DevOps principles. Traditional ITIL (waterfall-era CAB processes) slows DevOps delivery; use ITIL 4's 'shift left' and automated Change Enablement approaches.
- Service catalogue without SLAs — a service catalogue is a marketing document; it only becomes a management tool when each service has measurable SLAs with consequences for breach.
