---
type: concept
slug: process-capability-sigma
title: Process Capability Analysis (Cpk, DPMO, and Sigma Level)
source_collection: consulting-toolkits
toolkit: lean-six-sigma
domain: operations
category: statistical-measurement
generated_by: consulting-toolkit reconstruction
license_status: internal_reconstruction_original_synthesis
---

# Process Capability Analysis (Cpk, DPMO, and Sigma Level)

*Category: statistical-measurement · Toolkit: Lean Six Sigma*

## What it is
A statistical measurement framework that quantifies how reliably a process produces output within customer specification limits, expressed as a Cpk index, a Defects Per Million Opportunities (DPMO) count, and a sigma level — providing a universal language for comparing process quality across industries, scales, and time periods.

**Origin:** Process capability concepts were developed by W. Edwards Deming and Walter Shewhart at Bell Labs in the 1920s–30s (Shewhart control charts). The Cpk formula was formalized in statistical quality control literature in the 1960s. DPMO and the sigma level translation were operationalized by Motorola in the 1980s as the foundation of the Six Sigma measurement system.

## Why it works
A process specification (Upper Specification Limit and Lower Specification Limit) defines what is acceptable to the customer. A process produces output with a mean and standard deviation. The gap between the process mean and the nearest specification limit, expressed in standard deviations, is the process's sigma level. The wider this gap, the fewer outputs fall outside specifications (defects). Six sigma means the process could shift 1.5 sigma in either direction and still produce fewer than 3.4 defects per million opportunities — a target of virtual perfection that resets expectations for what 'good' looks like.

## When to use
Phase II (Measure) to establish the baseline. Phase IV (Improve) to verify the improvement after implementation. Phase V (Control) on an ongoing basis via control charts. The sigma level is the project's headline metric for leadership communication.

## Visual
`chart`

## Step-by-step tutorial
1. 1. Define the specification limits for each CTQ metric from the CTQ tree: Upper Specification Limit (USL) and Lower Specification Limit (LSL). These come from customer requirements, not from process capability.
2. 2. Collect process output data (minimum 30 data points; ideally 100+ for statistical stability). Verify the measurement system with Gauge R&R before using this data.
3. 3. Compute the process mean (X-bar) and standard deviation (σ) from the data using statistical software (Minitab, Excel, or Python scipy).
4. 4. Calculate Cpk: Cpk = min[(USL - X-bar) / (3σ), (X-bar - LSL) / (3σ)]. Cpk measures how close the process mean is to the nearest specification limit, in units of 3 standard deviations.
5. 5. Translate Cpk to sigma level: Sigma level = 3 × Cpk (approximately). Or use the DPMO table: measure the actual defect rate (outputs outside specification / total outputs × 1,000,000) and look up the corresponding sigma level.
6. 6. Plot a control chart (I-MR for individual measurements, X-bar/R for subgroups) to check whether the process is statistically stable (in control). A process with special-cause variation cannot be reliably improved until those special causes are removed.
7. 7. Document the baseline: Cpk = [value], DPMO = [value], Sigma Level = [value]. This baseline is the before-state against which post-improvement results will be compared.
8. 8. After the Improve phase, re-run steps 2–7 on the improved process. Compute the post-improvement Cpk, DPMO, and sigma level. The delta is the measured improvement.

## Real-life example — GE Aviation (Aircraft Engine Manufacturing)
In the 1990s, GE Aviation set a target of 6σ reliability for critical jet engine components. Before Six Sigma, blade tip clearance in turbine assemblies operated at approximately 3.5σ (about 13,000 DPMO) — meaning 13 out of every 1,000 engines required rework or replacement. After a DMAIC project targeting the CNC machining process and its measurement system, GE achieved 5.2σ (approximately 130 DPMO). The improvement was so significant that GE's aircraft engines achieved the lowest defect rate of any major aircraft engine manufacturer. Jack Welch credited the sigma-level framework with making these improvements visible to executives who would not otherwise engage with technical quality metrics.

**So what:** The sigma level creates a shared language between engineers and executives. A GE executive does not need to understand Cpk to understand that moving from 3.5σ to 5.2σ means 100 times fewer defective engines. The translation from technical metric to business-impact language is what drove Six Sigma's adoption at the executive level.

## Template
Complete one row per CTQ metric. Document baseline in Phase II (Measure) and post-improvement in Phase IV (Improve). The delta row is the financial justification for the project.

- [ ] CTQ Metric: [name and unit]
- [ ] Lower Specification Limit (LSL): [value and unit, from CTQ tree]
- [ ] Upper Specification Limit (USL): [value and unit, from CTQ tree]
- [ ] Data collection period: [start date — end date]
- [ ] Sample size (n): [number of data points]
- [ ] Process Mean (X-bar): [computed value]
- [ ] Process Standard Deviation (σ): [computed value]
- [ ] Cpk (baseline): [computed using Cpk formula]
- [ ] DPMO (baseline): [measured defects per million opportunities]
- [ ] Sigma Level (baseline): [from DPMO table or 3 × Cpk]
- [ ] Process Stable? (control chart): [Yes / No — if No, document special causes]
- [ ] Cpk (post-improvement): [repeat after Phase IV implementation]
- [ ] DPMO (post-improvement): [repeat after Phase IV implementation]
- [ ] Sigma Level (post-improvement): [repeat after Phase IV implementation]
- [ ] Improvement: [delta in sigma level and % reduction in DPMO]

## Pitfalls
- Confusing specification limits (customer requirements) with control limits (statistical boundaries of current performance) — these are fundamentally different. Specification limits are set by customers; control limits are computed from the data.
- Computing Cpk on an unstable process (one with special-cause variation) — if the control chart shows special causes, Cpk is meaningless. Remove special causes first.
- Ignoring the 1.5σ shift assumption in the DPMO table — Motorola's DPMO table includes a 1.5σ long-term shift. If you compute DPMO from short-term data without this correction, your sigma level will appear higher than the long-term reality.
- Using sigma level as the only metric — Cpk, DPMO, and sigma level are measuring tools, not the goal. The goal is the customer CTQ specification. Always report both sigma level and the corresponding DPMO to maintain the customer-reality link.
