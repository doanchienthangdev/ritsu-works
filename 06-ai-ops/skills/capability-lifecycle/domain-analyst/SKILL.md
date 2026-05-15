---
name: domain-analyst
description: Phase 2 of CLA workflow (Bài #20). Conducts domain deep-dive với industry benchmarks, customer journey, competitive landscape, channel comparison. Uses Bài #15 Muse panel với domain experts. Invoke after problem-framer (Phase 1) completes.
---

# Domain Analyst (CLA Phase 2)

## When to use

After Phase 1 problem.md confirmed. Capability state = `analyzing`.

## Inputs

- `problem_path`: Path to confirmed problem.md
- `capability_id`: Capability slug

## Process

### Step 1: Identify domain
From problem.md, extract domain (growth, support, content, finance, etc.).

### Step 2: Invoke Muse panel (Bài #15)
Select 4-5 personas from `muse-personas.yaml`:
- Domain expert (e.g., growth-strategist for acquisition, pedagogy-expert for education)
- Industry-benchmark analyst
- Customer-advocate
- Cost-conscious cynic
- Time-honest

### Step 3: Generate domain analysis
Each persona contributes section:

**Industry benchmarks:** Typical CAC, conversion rates, ROI per channel
**Customer journey:** Awareness → consideration → purchase → activation → retention
**Competitive landscape:** Who solves this in industry? How?
**Channel comparison:** Pros/cons of each viable channel
**Founder bandwidth realism:** Time required vs available

### Step 4: Output domain-analysis.md

```markdown
# Domain Analysis: <capability>

## Industry context
<from industry-benchmark-analyst>

## Customer journey map
<from customer-advocate>

## Competitive landscape
<who solves this in industry, gaps>

## Channel comparison matrix
| Channel | CAC | Volume | Time-to-results | Sustainability |
|---|---|---|---|---|

## Founder time reality check
<from time-honest>

## Critical risks
<from cynic>

## Muse panel synthesis
<consensus + dissent>
```

## Outputs

- `wiki/capabilities/<id>/domain-analysis.md`
- Audit + event fired

## State transition

`analyzing` (continued, → Phase 3)

## LLM mode awareness

- **Subscription:** Founder + Claude Code conversation; manual Muse panel run
- **Hybrid:** Auto-fires Muse panel với selected personas
- **Fallback:** Manual via Claude Code session

## Cost estimate

- Anthropic API: ~$0.30 per invocation (5 persona calls × ~1500 tokens each)
- Founder time: 10-15 min review

---

**Next phase:** `system-inventory-scanner`
