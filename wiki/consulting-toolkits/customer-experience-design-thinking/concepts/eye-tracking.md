---
type: concept
slug: eye-tracking
title: Eye Tracking
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Eye Tracking

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A quantitative testing method that uses specialized hardware (Tobii eye-tracker, or webcam-based alternatives) to record where users look on a screen, for how long, and in what sequence — generating heatmaps and gaze plots that reveal visual hierarchy problems invisible to verbal user testing.

**Origin:** Pioneered in scientific research (Yarbus, 1967); applied to web usability research by Nielsen Norman Group (Pernice & Nielsen, 2010); commercialized by Tobii AB and UserZoom.

## Why it works
Users cannot accurately report what they look at — 'I read everything on the page' is a common verbalization, but eye tracking frequently reveals that users scan, not read, and miss large portions of the interface. Eye tracking makes the invisible visible: where attention goes, where it doesn't, and what visual design elements draw or repel the eye.

## When to use
Use in Phase 9 (Test) for digital prototypes or production screens where visual hierarchy is a suspected issue. Particularly valuable for landing pages, dashboards, and e-commerce pages where attention placement drives conversion.

## Visual
`none`

## Step-by-step tutorial
1. 1. Select the interface or prototype screens most likely to have visual hierarchy issues (landing pages, dashboards, form pages).
2. 2. Set up the eye tracker (hardware or webcam-based): calibrate for each participant (typically 9-point calibration, 2 minutes).
3. 3. Define 2–3 specific visual design hypotheses to test (e.g., 'Users will notice the CTA button in the top-right corner' or 'Users will read the pricing table before looking at the features list').
4. 4. Run 5–8 participants through the target screens. Record fixation data.
5. 5. Generate heatmaps for each screen: areas with no fixations reveal critical information that users are missing.
6. 6. Run gaze plot analysis: what is the sequence of attention? If users look at the price before they look at the value proposition, the visual hierarchy needs redesign.
7. 7. Validate heatmap findings against usability test task performance: do the attention gaps correlate with task failures?

## Real-life example — Google
Google's eye-tracking research on search results pages revealed the 'F-pattern' of reading: users make a horizontal sweep of the top results, then a shorter horizontal sweep of the second or third result, then a vertical scan down the left side. This F-pattern insight shaped the design of Google's search result page — with the most important information positioned along the top and left, and the right sidebar subsequently removed when it was shown by eye tracking to receive near-zero attention.

**So what:** Eye tracking reveals that users don't read pages — they scan them, in predictable patterns that visual design must accommodate.

## Template
Define visual hypotheses before running the study. Generate heatmaps per screen. Cross-reference with usability test completion data.

- [ ] Screens being tested: ___
- [ ] Visual hypothesis 1: ___ | Validated by heatmap: Y/N | Finding: ___
- [ ] Visual hypothesis 2: ___ | Validated: Y/N | Finding: ___
- [ ] Top attention areas (red zones): ___
- [ ] Attention gaps (grey zones with critical information): ___
- [ ] Gaze sequence finding: ___
- [ ] Design changes implied by findings: ___

## Pitfalls
- Eye tracking as a standalone method: eye tracking tells you where users look, not why. Counter: always pair eye tracking with at least think-aloud usability testing.
- Generating heatmaps without a hypothesis: heatmaps without a specific design hypothesis to test produce noise, not insight. Counter: define visual hypotheses before running the study.
