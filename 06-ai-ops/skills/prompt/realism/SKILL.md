---
name: prompt/realism
description: |
  The anti-AI contract for /prompt. Enforces the three giveaways that make an AI image
  readable as AI — plastic skin, studio lighting where it could not physically exist, and
  perfect camera/background framing — in that priority order, and adds the per-model
  realism lever (trailing `photorealism` for gpt-image-2, `--style raw` for Midjourney).
  Also owns the banned-phrase guard. Runs on every /prompt run except --realism=off.
  Source of truth: 06-ai-ops/skills/prompt/library/REALISM-PLAYBOOK.md, distilled from the
  AVB lessons; the three anchors are PINNED in knowledge/prompt-directions.yaml and a
  direction cannot drop one without failing the L2 validator.
allowed-tools: [Read, Bash, Grep]
disable-model-invocation: false
---

# prompt/realism — the contract that stops an image reading as AI

> Most prompts fix giveaway #1 and stop. That is why they still look AI.
> #2 and #3 are what actually give it away.

Read `library/REALISM-PLAYBOOK.md` for the reasoning and the source quotes. This skill is
the **runtime contract** — what must be true before a prompt is printed.

---

## 1. Level

| `--realism` | Contract |
|---|---|
| `max` *(default)* | All three anchors present. Refuse to print without them. |
| `balanced` | Anchors present but not stacked — 1 value each, not 3. For commercial/campaign work where controlled lighting is *correct*. |
| `off` | No anchors. Correct for anime · 3D · illustration · graphic. Applying skin texture to a vector illustration is noise. |

Choose `off` automatically when `24-art-medium` is filled with a non-photographic medium,
and say so.

## 2. The three anchors

### Anchor 1 — skin (rank 1)

Present if the prompt contains **≥2** of:
```
natural skin pores visible · light skin imperfections · matte skin finish ·
micro skin wrinkles · freckles and minor blemishes · subtle under-eye texture ·
visible peach fuzz · realistic skin texture · asymmetrical expression ·
a slightly uneven eyebrow · flushed cheeks · sweat on the skin
```
**Only applies when a human face is in frame.** For a product-only image, anchor 1 is
satisfied by surface realism instead (`micro-scratches`, `fingerprints on glass`,
`visible wear and patina`).

### Anchor 2 — situational lighting (rank 2)

Satisfied when the lighting named is **physically possible** in the environment and hour
already chosen. Run this test explicitly:

> *At this place, at this hour, could that light source exist?*

| Environment | Refuse | Use instead |
|---|---|---|
| Outdoors, daytime | ring light · softbox · beauty dish · three-point | harsh midday sun · overcast soft sky · open shade · dappled light |
| Bedroom, daytime | studio key light | natural window light through sheer curtain |
| Bar / club, night | high-key bright | warm tungsten + neon spill + mixed color temperature |
| Indoor selfie, evening | golden hour glow | smartphone light · TV screen spill · overhead practical |
| Actual studio shoot | — | studio softbox is *correct* here; anchor 2 is satisfied by definition |

When the scene is not a studio, add the literal phrase **`no studio lighting`**. It is the
single most effective token in this whole contract.

Prefer **two sources of different temperature** whenever the room would realistically have
them — `mixed color temperature` costs three words and buys more realism than any adjective.

### Anchor 3 — camera & background (rank 3)

The one almost everyone misses. Real everyday photography is shot on a phone, without
control of the background.

Present if the prompt contains ≥1 of:
```
shot on an iPhone 15 · candid scene with natural framing · handheld, slight tilt ·
slightly off-centre framing · real uncontrolled background · everyday clutter in
the background · snapshot aesthetic · disposable camera · front-facing selfie camera
```

**Skip anchor 3** — and say why — when the brief is explicitly a professional shoot:
e-commerce, product campaign, corporate headshot, editorial. There, a controlled frame is
the correct answer and forcing "candid" would be wrong. That is what `--realism=balanced`
is for.

## 3. Model lever

| Model | Lever | Placement |
|---|---|---|
| `gpt-image-2` | `photorealism` | the **final word** of the prompt |
| `midjourney` | `--style raw` | trailing flag |
| `nano-banana-pro` · `flux` · `generic` | — | none; the anchors do the work |

Read it from the registry, not from memory:
```bash
node -e "const y=require('js-yaml'),f=require('fs');const d=y.load(f.readFileSync('knowledge/prompt-directions.yaml','utf8'));console.log(JSON.stringify(d.directions.find(x=>x.id==='image').models,null,2))"
```

Suppress the lever entirely when `--realism=off`.

## 4. Banned-phrase guard

Before printing, scan the prompt against `banned_phrases` in the registry:

```bash
node -e "const y=require('js-yaml'),f=require('fs');console.log(y.load(f.readFileSync('knowledge/prompt-directions.yaml','utf8')).banned_phrases.join('\n'))"
```

- In **build**: never emit one. If you catch yourself reaching for `perfect lighting`,
  that is the signal to describe the source instead.
- In **enhance**: flag every hit, remove it, and report the removal.

## 5. Gate

Before the prompt is printed, assert:

- [ ] `--realism=max` ⇒ all three anchors satisfied (or anchor 3 explicitly waived with a stated reason)
- [ ] Lighting passes the plausibility test against environment + hour
- [ ] Zero banned phrases
- [ ] Model lever applied (or suppressed because `off`)

A failed assertion is **repaired, not reported as a limitation** — then named in the
rationale line so the founder sees what changed.
