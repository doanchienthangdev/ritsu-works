---
name: system-inventory-scanner
description: Phase 3 of CLA workflow (Bài #20). Inventories existing Agent OS state — skills, SOPs, Tier 1, integrations, deployed capabilities. Identifies gaps vs needed for proposed capability. Deterministic (no LLM needed).
---

# System Inventory Scanner (CLA Phase 3)

## When to use

After Phase 2 domain-analysis.md ready. Capability state = `analyzing`.

## Inputs

- `problem_path`: Path to problem.md
- `domain_analysis_path`: Path to domain-analysis.md

## Process (DETERMINISTIC, no LLM)

### Step 1: Scan existing capabilities

Read & catalog:
- `05-ai-ops/skills/`: list all skill IDs + descriptions
- `*/sops/`: list all SOP IDs + scope
- `knowledge/*.yaml`: extract all Tier 1 entries (channels, personas, etc.)
- `mcp-tools.yaml`: existing MCP tools
- `08-integrations/webhooks/`: existing webhooks
- `08-integrations/api/`: existing API adapters
- `capability-registry.yaml`: deployed capabilities
- Recent `ops.kpi_snapshots`: current performance signals

### Step 2: Reusable inventory

Match scan output vs needs implied by problem.md:
- ✅ Have: <existing capability A could be reused>
- ✅ Have: <existing capability B could be extended>

### Step 3: Gap inventory

What's missing:
- ❌ Don't have skill X
- ❌ Don't have SOP Y
- ❌ Don't have integration Z

### Step 4: Recommendation surface

For each gap, suggest:
- Build new (estimate: complexity, time)
- Extend existing (specify which)
- Use external service (specify cost)

### Step 5: Output gap-analysis.md

```markdown
# Gap Analysis: <capability>

## Current Agent OS state (relevant subset)
- Skills: [list]
- SOPs: [list]
- Tier 1 entries: [list]
- Integrations: [list]
- Deployed capabilities: [list]

## Reusable
- ✅ <existing component>: how it helps
- ✅ <existing component>: how it helps

## Gaps (must build/integrate)
- ❌ <missing> — recommendation: BUILD/EXTEND/EXTERNAL
- ❌ <missing> — recommendation: BUILD/EXTEND/EXTERNAL

## External services likely needed
- <Service A>: ~$X/mo, purpose Y
- <Service B>: ~$X/mo, purpose Y
```

## Outputs

- `wiki/capabilities/<id>/gap-analysis.md`
- Audit + event fired

## State transition

`analyzing → architecting`

## Cost estimate

- Anthropic API: $0 (deterministic file scanning)
- Founder time: minimal (auto-generated)
- Compute: ~30 sec on local machine

---

**Next phase:** `options-generator`
