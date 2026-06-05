---
type: concept
slug: heatmaps
title: Behavioral Heatmaps (Click & Scroll Heatmaps)
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Behavioral Heatmaps (Click & Scroll Heatmaps)

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
Analytics-based visualizations that aggregate user click data, scroll depth, and cursor movement from real users on live pages — generating overlays that show where users engage (click heatmap), how far they scroll (scroll heatmap), and where their cursor moves without clicking (hover heatmap).

**Origin:** Pioneered by tools like Crazy Egg (2006) and Hotjar (2014); a standard analytics tool in the conversion rate optimization (CRO) discipline.

## Why it works
Individual usability sessions provide depth; heatmaps provide breadth — aggregating the behavior of thousands of real users to reveal statistical patterns. A button that 5 usability test participants clicked successfully may be missed by 80% of real users in production, a finding that only heatmap data at scale reveals.

## When to use
Use in Phase 9 (Test) on live pages or production prototypes that have sufficient traffic to generate statistically meaningful heatmap data. Complement usability testing data (depth) with heatmap data (breadth).

## Visual
`none`

## Step-by-step tutorial
1. 1. Install a behavioral analytics tool (Hotjar, Crazy Egg, FullStory, or Microsoft Clarity) on the live page or production prototype.
2. 2. Define the tracking period: minimum 500 unique visitors per page for a statistically meaningful heatmap; 2,000+ for reliable scroll data.
3. 3. Generate click heatmaps: identify the top-clicked elements (are users clicking the intended CTA?), and the 'rage click' zones (elements users click repeatedly — a sign of broken interaction).
4. 4. Generate scroll heatmaps: identify the 50% scroll depth (where half of users stop scrolling) and the 80% depth. Any critical content below the 50% depth is effectively invisible to half your users.
5. 5. Generate hover heatmaps: cursor movement clusters around content that users are reading; absence of cursor movement on key content sections indicates they are being skipped.
6. 6. Correlate heatmap findings with usability test observations: do the click patterns match what usability test participants said they were trying to do?

## Real-life example — Basecamp
Basecamp's CRO team used scroll heatmaps on their pricing page and discovered that only 22% of visitors scrolled past the fold to see the pricing table — despite the pricing being the #1 reason visitors came to the page. The fix was simple: move the pricing table above the fold. Post-redesign: 78% of visitors saw the pricing table, and trial signups increased 18%.

**So what:** Scroll heatmaps reveal the invisible fold — the point where half your users stop engaging, regardless of what the design intended.

## Template
Deploy tracking before the testing period begins. Wait for minimum sample size before analyzing.

- [ ] Page being analyzed: ___ | Tool: ___ | Tracking period: ___
- [ ] Sample size: ___ unique visitors
- [ ] Click heatmap findings: Most-clicked element: ___ | Rage-click zones: ___
- [ ] Scroll heatmap: 50% scroll depth: ___ | 80% depth: ___ | Content below 50% depth that is critical: ___
- [ ] Hover heatmap: Sections with cursor engagement: ___ | Sections with no cursor movement (skipped): ___
- [ ] Correlation with usability test findings: ___
- [ ] Design changes implied: ___

## Pitfalls
- Insufficient sample size: heatmaps with fewer than 500 visitors show statistical noise, not patterns. Counter: wait for the minimum sample size before generating conclusions.
- Heatmaps on pages with multiple versions (A/B test running): mixing variants in one heatmap produces meaningless averages. Counter: generate separate heatmaps for each A/B test variant.
