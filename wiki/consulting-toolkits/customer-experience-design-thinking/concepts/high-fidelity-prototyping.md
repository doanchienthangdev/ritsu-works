---
type: concept
slug: high-fidelity-prototyping
title: High-Fidelity (Hi-Fi) Prototyping
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: prototyping
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# High-Fidelity (Hi-Fi) Prototyping

*Category: prototyping · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
An interactive, pixel-level digital prototype that simulates the full visual design, interaction patterns, and user flows of the proposed solution — without requiring actual code — to generate authentic user reactions and enable rigorous usability testing.

**Origin:** Formalized as a standard UX deliverable with the emergence of prototyping tools (InVision, 2011; Figma, 2016); now the standard prototype format for digital product and service design.

## Why it works
Low-fidelity prototypes answer 'Does the concept make sense?' Hi-fi prototypes answer 'Does the interaction design actually work?' At the hi-fi stage, the interface should look and feel close enough to the real product that users interact with it as they would the real thing — revealing interaction-level usability issues, visual hierarchy failures, and emotional responses to the design that paper prototypes cannot generate.

## When to use
Use in Phase 8 (Prototype) after low-fi sketching and storyboarding have validated the concept. The hi-fi prototype is the input to usability testing, heuristic evaluation, and A/B testing.

## Visual
`none`

## Step-by-step tutorial
1. 1. Start from the storyboard and lo-fi sketches. Map the complete set of screens required to cover all critical user flows (typically 8–20 screens for an MVP).
2. 2. Build the visual design in Figma: apply brand colors, typography, and imagery consistently. Use a component library for standard elements (buttons, cards, form fields) to ensure consistency and speed.
3. 3. Connect all interactive elements: every button, link, and navigation element must be connected to the appropriate next screen using prototype connections.
4. 4. Test the prototype internally: have 2 team members who were not involved in building it attempt the key user tasks. Fix any broken links or confusing elements.
5. 5. Write the Testing Sheet for the hi-fi prototype: 4–6 tasks, success criteria, and observation prompts.
6. 6. Share the prototype link with 5–8 users for usability testing. The prototype should run on the same device type (mobile/desktop) that the target user would use.

## Real-life example — Revolut
Before building their cryptocurrency trading feature, Revolut's design team built a hi-fi prototype in Figma that covered the full user flow: discover → learn → buy → hold → sell → withdraw. In usability testing with 6 users, 5/6 failed to find the 'sell' function — it was buried 3 levels deep in the 'portfolio' section. The hi-fi prototype surfaced this critical navigation failure in one day; finding it in production would have required weeks of A/B testing and significant engineering rollback. The redesign moved 'sell' to a prominent CTA on the asset detail screen.

**So what:** Hi-fi prototyping moves usability issue discovery from weeks of production analysis to one day of user testing.

## Template
Map all critical user flows before starting. Cover at least 3 paths: happy path, error recovery, and edge case. Test internally before external sessions.

- [ ] Prototype scope: ___ critical user flows | ___ screens
- [ ] Tool used: Figma / InVision / other: ___
- [ ] Visual design components applied: brand colors Y/N | typography Y/N | imagery Y/N
- [ ] All interactive elements connected: Y/N | Broken links found in internal test: ___
- [ ] Testing Sheet written: Y/N | Tasks defined: ___
- [ ] Prototype link: ___
- [ ] Device type for testing: mobile / desktop / both

## Pitfalls
- Prototyping too many screens: a hi-fi prototype with 50+ screens takes weeks to build and is often incomplete when user testing begins. Counter: limit hi-fi prototypes to the minimum screens required to test the critical user flows — typically 8–20.
- Coded prototypes at the hi-fi stage: some teams skip Figma and build a coded prototype for the hi-fi stage. Counter: Figma prototypes are 10x faster to build and 10x easier to modify post-testing. Save code for the MVP.
