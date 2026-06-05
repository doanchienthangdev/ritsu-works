---
type: concept
slug: minimum-viable-product
title: Minimum Viable Product (MVP)
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: prototyping
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Minimum Viable Product (MVP)

*Category: prototyping · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
The smallest possible version of a product or solution that includes only the features required to test the core value hypothesis with real users — stripping away everything that is not essential to learning whether the solution works.

**Origin:** Coined by Frank Robinson (2001) and popularized by Eric Ries in 'The Lean Startup' (2011); adopted into Design Thinking as the bridge between the Prototype and Test phases, and as the entry point for agile development.

## Why it works
Full-featured products are expensive to build and slow to test. An MVP tests the riskiest assumption — the fundamental hypothesis that the core solution concept delivers value — before the team invests in secondary features. The MVP is not a poor-quality product; it is a precisely scoped learning vehicle. Every feature beyond the MVP's Must Haves delays learning and consumes resources that could be spent on iteration.

## When to use
Use at the end of the Prototype phase, as the formal scoping tool that determines what enters development vs. what waits for the next iteration. Use with the Testing Sheet to ensure the MVP is sized to answer the core hypothesis.

## Visual
`table`

## Step-by-step tutorial
1. 1. List every feature or capability in the full solution vision — start from the hi-fi prototype and the Idea Evaluation Canvas.
2. 2. For each feature, assign a MoSCoW priority: Must Have (M) = without this, the core value hypothesis cannot be tested; Should Have (S) = important but not required for the MVP; Could Have (C) = nice to have if time allows; Won't Have (W) = explicitly out of scope for this iteration.
3. 3. Challenge every 'M' classification: ask 'Would the MVP fail to test its core hypothesis if this feature were missing?' If the answer is no, downgrade to S.
4. 4. For each M feature, write a User Story in the format: 'As a [persona], I want to [action] so that [outcome].' Add 3–5 acceptance criteria per story.
5. 5. Validate the MVP scope with the technical team: estimate build time for M features only. If the MVP would take more than 6 weeks to build, re-challenge the M features and reduce scope further.
6. 6. Write the MVP Definition Document: the full list of M features with user stories, acceptance criteria, technical dependencies, and the core hypothesis being tested.
7. 7. Get Sponsor and Tech Lead to co-sign the MVP Definition Document before development begins.

## Real-life example — Dropbox
Before building a single line of code, Dropbox's founder Drew Houston created a 3-minute demo video showing the product working as if it were real. This was his MVP: a video, not a product. The video tested the core hypothesis — 'People want frictionless cloud file syncing enough to sign up for a waiting list.' The video drove 75,000 signups overnight, validating the hypothesis at essentially zero cost. Dropbox then built the product, knowing the demand was real. This is the canonical example of an MVP: the minimum experiment needed to test the riskiest assumption, not the minimum version of the full product.

**So what:** The MVP should be defined by what you need to learn, not by what you need to build.

## Template
Complete the MoSCoW table for all features in the full solution vision. Define the MVP as M features only. Validate build time with technical lead before finalizing.

- [ ] Solution name: ___ | Core hypothesis being tested: ___
- [ ] Feature 1: ___ | MoSCoW: ___ | Rationale: ___ | User story: ___ | Acceptance criteria: ___
- [ ] Feature 2: ___ | MoSCoW: ___ | Rationale: ___ | User story: ___ | Acceptance criteria: ___
- [ ] Feature 3: ___ | MoSCoW: ___ | [repeat]
- [ ] Feature 4: ___ | MoSCoW: ___ | [repeat]
- [ ] Feature 5: ___ | MoSCoW: ___ | [repeat]
- [ ] [Add rows for all features]
- [ ] MVP feature count (M only): ___
- [ ] Estimated MVP build time: ___
- [ ] Does build time exceed 6 weeks? Y → re-challenge M features | N → proceed
- [ ] Co-signed by: Sponsor: ___ | Tech Lead: ___ | Date: ___

## Pitfalls
- MVP as 'crappy version': teams interpret MVP as permission to build a low-quality product. Counter: the MVP must be production-quality for its M features — it is scoped small, not built poorly.
- Feature creep into MVP scope: every stakeholder wants their feature in the MVP. Counter: enforce the MoSCoW test — 'Would the MVP fail to test its core hypothesis without this?' — in writing, with signatures.
- Building an MVP without a defined hypothesis: an MVP without a testable hypothesis is just a small product. Counter: write the hypothesis first ('We believe [user] will [behavior] because [assumption]. We will test this by [metric] with [users] in [time]'), then design the MVP to test it.
