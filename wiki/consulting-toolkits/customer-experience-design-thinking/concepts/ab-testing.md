---
type: concept
slug: ab-testing
title: A/B Testing
source_collection: consulting-toolkits
toolkit: customer-experience-design-thinking
domain: experience
category: testing
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# A/B Testing

*Category: testing · Toolkit: Customer Experience Strategy & Design Thinking*

## What it is
A controlled experiment in which two (or more) variants of a design element are served to randomly split user populations simultaneously, and the variant producing better performance on a predefined success metric is selected as the winner — replacing design opinion with statistical evidence.

**Origin:** Mathematical foundations in Fisher's randomized controlled trial methodology (1920s); first applied to digital product design by Google (testing 41 shades of blue in 2009); now standard practice at Google, Amazon, Facebook/Meta, and most major digital product companies.

## Why it works
User preferences cannot be reliably predicted from usability testing alone — particularly for decisions that involve aesthetic preference, motivational framing, or conversion optimization. A/B testing removes this uncertainty by measuring actual behavior (clicks, purchases, completions) on the two variants simultaneously, controlling for all variables except the design change being tested. With sufficient statistical power, it produces near-certain knowledge of which variant performs better.

## When to use
Use in the Test phase for any design decision where the 'correct' answer depends on user behavior (clicks, completions, conversions) rather than usability or comprehension. Use only when you have sufficient traffic to reach statistical significance in a reasonable timeframe (typically ≥1,000 users per variant needed).

## Visual
`comparison`

## Step-by-step tutorial
1. 1. Define a single, clear hypothesis: 'Changing [element] from [current state] to [variant] will [increase/decrease] [metric] because [user insight].' If the hypothesis doesn't specify a 'because,' the test result won't be informative.
2. 2. Calculate the required sample size before starting: use a power calculator (e.g., Evan Miller's A/B test calculator) with α=0.05, power=0.8, and the minimum detectable effect (the smallest change in the metric you consider meaningful — typically 5–15%).
3. 3. Ensure randomization: each user must be randomly assigned to one variant, and the assignment must be stable across sessions (if a user sees Variant A on Monday, they must see it on Thursday too).
4. 4. Run both variants simultaneously for the same time period — never compare Monday to Wednesday (day-of-week effects are real).
5. 5. Define primary and secondary metrics before the test begins. Primary metric determines the winner; secondary metrics track for unintended side effects (e.g., Variant B increases clicks but decreases completion).
6. 6. Do not peek at results before reaching the required sample size — early peeking inflates the false positive rate dramatically.
7. 7. After reaching sample size, calculate statistical significance using a chi-squared test (for proportions) or t-test (for continuous metrics). Declare a winner only at p < 0.05.
8. 8. Document results, roll out the winner, and apply the insight to future design decisions.

## Real-life example — Booking.com
Booking.com is one of the most aggressive A/B testing cultures in the world, running thousands of tests simultaneously. In one documented test, the team tested two variants of a 'Limited availability' urgency message: Variant A showed 'Only 3 rooms left' (count-based scarcity); Variant B showed 'Booked 15 times in the last 24 hours' (social proof). With a sample of 200,000 users per variant, Variant B increased hotel booking conversion by 4.6% (p < 0.001). Extrapolated across Booking.com's volume, this single A/B test result was worth tens of millions of dollars in incremental revenue annually. The insight — social proof > countdown scarcity for this user segment — was generalized across the platform.

**So what:** A single well-designed A/B test at scale can be worth more than an entire product redesign project.

## Template
Complete the planning section before starting the test. Complete the results section only after reaching required sample size — not before.

- [ ] PLANNING:
- [ ] Hypothesis: 'Changing [___] from [___] to [___] will [increase/decrease] [___] because [___].'
- [ ] Variant A (Control) description: ___
- [ ] Variant B (Treatment) description: ___
- [ ] Primary metric: ___ | Secondary metrics: ___
- [ ] Minimum detectable effect: ___% | Required sample size per variant: ___
- [ ] Statistical significance threshold: 95% | Power: 80%
- [ ] Test start date: ___ | Estimated end date: ___
- [ ] RESULTS (complete only after required sample size reached):
- [ ] Variant A metric: ___% | Sample: ___
- [ ] Variant B metric: ___% | Sample: ___
- [ ] Relative improvement: ___% | p-value: ___
- [ ] Statistically significant? Y/N
- [ ] Winner: A / B / No significant difference
- [ ] Decision: Roll out winner / Run follow-up test / Return to design

## Pitfalls
- Testing too many things at once (multivariate without sufficient traffic): changing the button color AND the headline AND the image in one test makes it impossible to know which change drove the result. Counter: test one variable at a time, unless you have sufficient traffic for a properly powered multivariate design.
- Stopping early when results look good: checking significance at 50% of sample size and stopping when Variant B is 'winning' is a classic false positive. Counter: pre-commit to the required sample size and do not evaluate results until it is reached.
- A/B testing visual design decisions that require holistic perception: A/B testing works for interaction design (CTAs, forms, flows) but produces misleading results for brand perception and emotional impact. Counter: use qualitative methods (usability testing, surveys) for aesthetic decisions.
