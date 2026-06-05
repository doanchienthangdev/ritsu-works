---
type: concept
slug: performance-testing
title: Performance Testing (UX Performance)
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Performance Testing (UX Performance)

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A technical evaluation of a digital prototype or production interface that measures page load time, interaction latency, and time-to-first-meaningful-paint — identifying performance bottlenecks that degrade the user experience before they reach production at scale.

**Origin:** Web performance testing formalized by Google's Core Web Vitals framework (2020); preceded by tools like Google PageSpeed Insights (2010) and WebPageTest (2008). Jakob Nielsen's research on acceptable response times (1993) established the foundational thresholds.

## Why it works
Performance is a user experience problem, not merely a technical one. Nielsen's research established three key thresholds: 0.1 seconds (instantaneous — user feels the system reacts immediately), 1.0 second (slight delay — user's flow is not interrupted), 10 seconds (maximum attention — user will go elsewhere). Google's research shows that a 1-second delay in mobile page load reduces conversion by 20%.

## When to use
Use in Phase 9 (Test) for all digital prototypes before launch. Also use as a quality gate in hi-fi prototyping (run Lighthouse on prototype links) and in the ongoing CX monitoring cycle post-launch.

## Visual
`kpi-tiles`

## Step-by-step tutorial
1. 1. Run Google Lighthouse on the target URL (Chrome DevTools → Lighthouse): generates scores for Performance, Accessibility, Best Practices, and SEO. Performance score below 50 indicates a critical CX problem.
2. 2. Measure Core Web Vitals: LCP (Largest Contentful Paint, target < 2.5s), FID (First Input Delay, target < 100ms), CLS (Cumulative Layout Shift, target < 0.1).
3. 3. Test on representative mobile devices and network conditions (use Chrome DevTools device emulation + network throttling: 'Fast 3G' for emerging markets, '4G' for developed markets).
4. 4. Flag any page load time > 3 seconds as a Critical issue. Flag any interaction latency > 1 second as a Major issue.
5. 5. Identify the top 3 performance bottlenecks from the Lighthouse report: typically large unoptimized images, render-blocking JavaScript, or excessive third-party scripts.
6. 6. Document findings and recommendations for the engineering team. Priority: Critical issues must be resolved before launch.

## Real-life example — Pinterest
Pinterest's engineering team measured performance impact on conversion in 2016 and found that reducing perceived page wait time by 40% (from 5.2s to 3.1s) increased sign-up conversions by 15% and SEO traffic by 15%. The fix required: image lazy-loading, JavaScript bundle splitting, and CDN optimization. Total engineering effort: 3 weeks. Annual revenue impact: estimated $150M. This is one of the most cited cases for the direct revenue value of UX performance optimization.

**So what:** Performance optimization is one of the highest-ROI CX investments available — and one of the most frequently deprioritized.

## Template
Run Lighthouse before and after performance optimizations. Document all Core Web Vitals. Flag Critical issues for engineering resolution before launch.

- [ ] URL tested: ___ | Date: ___ | Device: mobile / desktop | Network: 4G / 3G
- [ ] Lighthouse Performance score: ___/100
- [ ] LCP: ___s (target <2.5s) | Pass/Fail
- [ ] FID: ___ms (target <100ms) | Pass/Fail
- [ ] CLS: ___ (target <0.1) | Pass/Fail
- [ ] Page load time: ___s | Pass (≤3s) / Fail
- [ ] Top 3 performance bottlenecks: 1.___ 2.___ 3.___
- [ ] Critical issues (>3s load): ___
- [ ] Major issues (>1s interaction): ___
- [ ] Engineering recommendations: ___

## Pitfalls
- Testing only on developer machines with fast internet: developer machines are typically 2–5x faster than average user devices. Counter: always test on a mid-range mobile device with network throttling enabled.
- Treating performance as an engineering concern, not a UX concern: UX teams that don't include performance in their testing criteria discover performance issues only after launch. Counter: performance KPIs must be in the Testing Sheet for every digital prototype.
