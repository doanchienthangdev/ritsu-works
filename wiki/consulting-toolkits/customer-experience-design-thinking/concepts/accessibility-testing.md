---
type: concept
slug: accessibility-testing
title: Accessibility Testing
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Accessibility Testing

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A structured evaluation of a digital interface against established accessibility standards (WCAG 2.1 AA) to ensure users with disabilities (visual, motor, cognitive, auditory) can use the product effectively — combining automated scanning with manual expert review and testing with disabled users.

**Origin:** Grounded in the Web Content Accessibility Guidelines (WCAG) developed by the W3C (World Wide Web Consortium); first published 1999, current standard WCAG 2.1 published 2018.

## Why it works
Accessibility is both a legal requirement (ADA, EAA, EN 301 549) and a business opportunity: approximately 15% of the global population lives with a disability, and accessible design typically improves usability for all users (closed captions, for example, benefit people in noisy environments as much as deaf users).

## When to use
Use in Phase 9 (Test) for all digital prototypes and production builds. Also use as a quality gate in the hi-fi prototyping phase to catch accessibility issues before user testing begins.

## Visual
`table`

## Step-by-step tutorial
1. 1. Run an automated accessibility scan using axe DevTools, WAVE, or Chrome Lighthouse. Automated tools catch approximately 30–40% of accessibility issues.
2. 2. Test with a screen reader (NVDA for Windows, VoiceOver for Mac/iOS, TalkBack for Android): navigate through the key user flows using only keyboard and screen reader. Note every element that is not read correctly or is inaccessible.
3. 3. Test keyboard navigation: unplug the mouse and navigate the entire interface using only Tab, Shift+Tab, Enter, and arrow keys. Every interactive element must be reachable and usable.
4. 4. Test color contrast: use a color contrast analyzer to verify all text-background combinations meet WCAG 2.1 AA minimum (4.5:1 for normal text, 3:1 for large text).
5. 5. Test touch target sizes: all tappable elements on mobile must be at least 44x44 CSS pixels.
6. 6. Test with at least 2 users who have disabilities relevant to the product's primary use cases.
7. 7. Document all issues with WCAG criterion reference, severity, and recommended fix. Prioritize Level A (blocking) and Level AA (required by most regulations).

## Real-life example — BBC
The BBC's accessibility team is one of the most rigorous in the media industry. Their 2019 accessibility review of iPlayer revealed that 23% of users who reported accessibility issues were not disabled — they were using the service in challenging environments (bright sunlight, noisy transport, one hand occupied). This finding drove the BBC to frame accessibility improvements as universal design improvements, securing executive support that pure disability-compliance framing had failed to achieve.

**So what:** Accessible design is universal design — fixes for disabled users improve the experience for all users.

## Template
Run automated scan first; then manual testing in sequence. Document all findings with WCAG criterion reference.

- [ ] Interface tested: ___ | Standard: WCAG 2.1 AA | Date: ___
- [ ] Automated scan tool: ___ | Issues found: ___
- [ ] Screen reader test (VoiceOver/NVDA): Issues: ___
- [ ] Keyboard navigation test: Issues: ___
- [ ] Color contrast failures: ___
- [ ] Touch target failures: ___
- [ ] User testing with disabled users: N=___ | Issues found: ___
- [ ] Level A violations (blocking): ___
- [ ] Level AA violations (required): ___
- [ ] Priority fix list: ___

## Pitfalls
- Automated scanning only: teams that rely solely on automated scanners miss the 60–70% of accessibility issues that require manual testing or disabled-user testing. Counter: automated scanning is the floor, not the ceiling.
- Accessibility as an afterthought: retrofitting accessibility into a completed design is 5–10x more expensive than building it in from the start. Counter: include accessibility criteria in the hi-fi prototyping brief and test during prototyping, not post-launch.
