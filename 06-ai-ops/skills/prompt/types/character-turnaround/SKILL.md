---
name: prompt/types/character-turnaround
description: |
  Fills the two slots of the character-turnaround type — a six-column photorealistic
  model sheet (0° front · 45° left · 90° left profile · 90° right profile · 45° right ·
  180° back), each column pairing a full-body view with a rotation-matched portrait.
  The template is a PRECISION INSTRUMENT emitted verbatim; this skill only decides what
  goes into {{CHARACTER_DESCRIPTION}} and {{STYLING_NOTES}}, which is where every real
  decision lives — including the one place a deliberate change to the reference is
  allowed. Requires --ref. Implements step 7 of the avatar workflow in
  library/REALISM-PLAYBOOK.md §6. Invoked when --type=character-turnaround.
allowed-tools: [Read, Bash, Grep, AskUserQuestion]
disable-model-invocation: false
---

# prompt/types/character-turnaround — the identity anchor

> A turnaround sheet is not a nice picture. It is the **reference every later image is
> measured against**. Get it right once and the same person survives a hundred scenes;
> get it wrong and every downstream avatar drifts.

---

## 1. What this type is for

Step 7 of the avatar pipeline. The order matters:

1. rough character idea → 2. detailed prompt (`/prompt image build`) → 3. generate a batch →
4. review for realism → 5. kill the AI giveaways → 6. **pick a clean base image** →
7. **this type** → 8. new scenes via `--mode=ref` against the sheet.

**It needs a base image.** `--ref` is required — a file path, or `attached` when the founder dragged the image into the chat (the orchestrator injects that; see the umbrella skill). Running this without one is refused by
`params.cjs`, because there is nothing to keep consistent.

If the founder has no base image yet, say so and offer step 2 instead:
`/prompt image "<character idea>"` → generate → pick the most believable face → then
come back here.

## 2. The template is emitted verbatim

Read `template.md` and substitute **only** the two slots. Do not shorten, reorder, merge
clauses, or "improve" the wording. The repetitive rotation clauses look redundant to a
human and are doing real work: they are what stops the model mirroring a portrait or
flipping a profile. The consistency block is what stops the costume drifting between
columns.

The only edits permitted:
- fill `{{CHARACTER_DESCRIPTION}}`
- fill `{{STYLING_NOTES}}`
- append the model realism lever (`photorealism` for gpt-image-2) as the final word

## 3. Slot 1 — `{{CHARACTER_DESCRIPTION}}`

This slot does **two jobs**, and confusing them is the main failure mode.

### Job A — restate the identity anchors (always)

The reference image is the source of truth, but restating the load-bearing traits in
words measurably reduces drift across six columns. Restate **5–8 traits**, no more:

```
age band · build · skin tone · hair (length + colour + texture) · one distinguishing
feature (mole / scar / freckles / visible tattoo) · glasses yes-no · overall bearing
```

Example:
> *Woman in her late twenties, slim athletic build, warm olive skin, chin-length dark
> brown hair with a slight wave, light freckles across the nose, no glasses, calm
> self-possessed bearing.*

Keep it descriptive, never evaluative. `beautiful`, `stunning`, `perfect features` give
the model nothing and pull it toward the generic-attractive average.

### Job B — the ONE place a change is allowed

The template says: *"Preserve the character exactly apart from any changes made in the
character description area."* So this slot is the **only** authorised channel for a
deliberate change to the reference.

If the founder asked for a change, state it explicitly and in contrast:
> *…Change from the reference: hair is now shoulder-length instead of chin-length.
> Everything else identical to the uploaded image.*

If they asked for **no** change, say so — silence is weaker than an explicit lock:
> *…No changes from the uploaded reference.*

### Realism inside the slot

Anchor 1 (skin) still applies here — a plastic-skinned turnaround poisons every
downstream image built from it. Include 2–3 texture values:
```
natural skin pores visible · light skin imperfections · matte skin finish ·
visible peach fuzz · asymmetrical features
```
Anchors 2 and 3 are **waived by the registry** for this type, with the reason recorded:
a studio background and controlled DSLR lighting are the correct answer for a technical
reference sheet, and "candid framing, uncontrolled background" would destroy the
readability the sheet exists for.

## 4. Slot 2 — `{{STYLING_NOTES}}`

Outfit · materials · accessories · mood · era. The template names these four axes; cover
the ones that matter and skip the rest.

**What belongs here:**
- the garments, named as garments (`oversized black wool coat over a white cotton tee`)
- **materials**, because materials are what make six columns look like one costume
  (`matte cotton`, `washed denim`, `brushed leather`, `ribbed knit`)
- accessories that must survive every angle (`silver hoop earrings`, `a worn leather belt`)
- era or subculture if it is load-bearing (`late-90s streetwear`, `1940s tailoring`)

**What does NOT belong here** — the template already owns these, and repeating them
creates conflicting instructions:
- lighting (template: *"Photorealistic DSLR studio lighting"*)
- background (template: *"Neutral plain studio background"*)
- camera, lens, angle (template: *"Strict orthographic turnaround"*)
- pose (template: fixed per column)
- aspect ratio (the `--ar` flag)

**The back-view test.** Column 6 shows only the back. Before finalising, ask: *does this
outfit have a describable back?* If the design has a hood, a print, a bag strap, a long
plait, an open back, or a distinctive silhouette, name it — otherwise the model invents
one, and the invented back will not match your later scenes.

## 5. Ask before inventing

Ask (max 2 questions) when:
- the reference shows an outfit but the founder wants a **different** one, and has not
  said which,
- the character's age or build reads ambiguously in the reference and the sheet will lock
  it in for everything downstream,
- the outfit has an obviously distinctive back the founder has not described.

Do not ask about lighting, background, or camera — the template settles all three.

## 6. Defaults from the registry

| Setting | Value | Why |
|---|---|---|
| `--ar` | `16:9` | Six columns need horizontal room; the source lesson recommends 16:9 for character sheets specifically |
| `--model` | `gpt-image-2` | Recommended in the source lesson for sheets; strongest at instruction-following over a long spec |
| `--realism` | `balanced` | Studio lighting is *correct* here; anchor 1 still enforced |
| `--mode` | `text` or `json` | `smart` is refused — shortening this template is the one thing that breaks it |

## 7. After the sheet exists

Tell the founder the next step, because the sheet is a means, not an end:

> Upload this sheet as the reference for every later scene:
> `/prompt image --mode=ref --ref=sheet.png --preserve="face,hair,body proportions,outfit" --change="location" "<new scene>"`

And note the honest limit: a six-panel sheet in one generation is demanding. Generate 2–3
and pick the one where the profiles genuinely mirror each other — mismatched rotation
between the full body and the portrait in the same column is the most common defect, and
it is worth re-rolling rather than accepting.
