# CRAFT.md — universal writing-craft principles for `/write`

> **What this is.** The distilled, attributed *universal craft wisdom* of the writing masters —
> the deep "how to write well" that is **not** a formula (formulas live in
> [`knowledge/write-frameworks.yaml`](../../knowledge/write-frameworks.yaml) /
> [`FRAMEWORKS.md`](FRAMEWORKS.md); voices live in [`author-styles/`](author-styles/)). The
> `write/orchestrator` consults this at draft time and the `write/humanize` skill uses it to tell
> *good human prose* from *AI slop*. This is Lane 3 of the `/write learn` 4-lane router.
>
> **How it grows.** Each principle is distilled from a master's book by `/write learn` and
> **attributed to its source**. Near-identical principles across books are merged (best-stated kept,
> corroborating sources listed). Read it as a checklist before you ship a draft.
>
> **Status:** populated by `/write learn raw/write/books/` (2026-06-10). Sources distilled so far are
> listed under each principle. <!-- write-learn: principles below are appended by the learn pipeline -->

---

## How to use this at draft time

1. **Draft in voice first** (the author-style + the framework do the shaping).
2. **Then run this as a revision checklist** — every principle here is a *cut* or a *sharpening*,
   not a constraint that flattens voice. King's rule governs: *"kill your darlings."*
3. The humanizer gate (`scripts/write/humanize/scan.cjs`) is the deterministic floor; these
   principles are the human ceiling. Passing the gate is necessary, not sufficient — re-read aloud.

The principles are grouped by theme. Within each, the imperative comes first (what to do), then the
rule (how), then why it works, then the master(s) who taught it.

---

## 1. Clarity & concision

_The first virtue: be understood. A reader is "a man floundering in a swamp" (King) — every needless word is more swamp._

### Omit needless words  ·  Strunk & White · King · Pinker · Williams · Zinsser · Handley
On every revision pass, delete any word, phrase, or sentence the surrounding prose already implies — hedges (*somewhat, relatively, I would argue*), intensifiers (*very, really, highly*), shudder quotes, and empty metaconcepts (*level, model, approach, in a sense*). This is the single most-taught rule in all of writing, and for good reason: slack words tax the reader's attention and dilute the words that carry meaning, so cutting speeds pace and sharpens the point at once. Note that *unhedged* statements read as stronger — "an honest man" lands harder than "a very honest man." For teaching content, leanness is mercy: a learner who reads only ~20–28% of a page (Handley) deserves every surviving word to count.

> "Omit needless words. A sentence should contain no unnecessary words … for the same reason that a machine has no unnecessary parts." — Strunk & White, *The Elements of Style*

### Prefer the active voice  ·  Strunk & White · King · Zinsser · Handley · Williams
Make the subject *do* the action; reserve the passive for the rare case where the actor is genuinely unknown or irrelevant. Active verbs push the sentence forward, name who did what, and read as confident — passive constructions hide the agent, go limp, and (Zinsser) leave nobody quite sure "what is being perpetrated by whom and on whom." The fix is mechanical and immediate. In an explainer, the active voice is also a clarity safeguard: it forces you to specify the agent of every step, which is exactly what a learner needs to reproduce it.

> "The writer threw the rope, not The rope was thrown by the writer. Please oh please." — Stephen King, *On Writing*

### Prefer the short, plain, concrete word  ·  Zinsser · Strunk & White · Heath · Hopkins · Ogilvy · King · Pinker
Reach for the short Anglo-Saxon word over the pompous Latinate one (*help* not *assistance*, *now* not *at this point in time*), and replace every vague abstraction with something the reader can see, touch, or picture. Concrete language gives memory more hooks — "V8 engine" sticks, "high performance" evaporates — and short strong words resonate with emotion where long *-ion* words sedate. This is the antidote to the Curse of Knowledge: a named specific lets novice and expert coordinate on the same unambiguous turf. For an AI tutor explaining a concept, the concrete example *is* the explanation; the abstraction is just the label you hang on it afterward.

> "The Velcro theory of memory: the more hooks we put into our ideas, the better they'll stick." — Heath & Heath, *Made to Stick*

### Cut the modifier that does no work  ·  Zinsser · King · Strunk & White · Handley
Delete adverbs that merely repeat the verb (*blared loudly*, *grinned widely*) and adjectives that state a known fact (*tall skyscraper*); keep a modifier only when it does work the noun or verb cannot do alone. A strong verb is *weakened*, not strengthened, by an adverb that duplicates it — and adverbs breed like dandelions: one looks fine, fifty bury your prose. The discipline points back to verb and noun selection: if you reach for "-ly," first ask whether a sharper verb would carry the manner by itself.

> "The road to hell is paved with adverbs." — Stephen King, *On Writing*

### Be specific — platitudes evaporate  ·  Hopkins · Strunk & White · Ogilvy · Schwartz
Replace every *best / fastest / most* with an exact number or a named mechanism; if you cannot be specific, say less. A precise claim reads as tested fact — it is "either true or a lie," so it gets believed — while a superlative signals exaggeration and makes the reader discount everything else you wrote. Exact figures ("3⅓ times the light," "78 seconds") quietly tell the reader *you measured*, which is itself the credibility. This is why "Brag and Boast" (Ogilvy) convinces no one and a single concrete fact convinces almost anyone.

> "Platitudes and generalities roll off the human understanding like water from a duck. They leave no impression whatever." — Claude Hopkins, *Scientific Advertising*

### Be bold — prune the qualifiers  ·  Zinsser · Pinker · Williams
Strip *a bit, sort of, rather, quite, pretty, kind of, in a sense* and state the thing flatly. Every qualifier whittles away a fraction of the reader's trust; the deeper issue is authority — readers want a writer who believes what they are saying. Hedge by *choice*, not by reflex: when precision genuinely matters, *qualify* (spell out the real exception — "on average," "all else equal") instead of sprinkling vague escape-hatch words a careful reader already supplies for free.

> "Don't be kind of bold. Be bold." — William Zinsser, *On Writing Well*

### Keep it simple, never simplistic  ·  Handley · Pinker · Williams
Deconstruct complexity so the reader never works too hard — short sentences, short paragraphs, subheads, white space — but address the reader as a competent equal who simply hasn't yet learned what you know. "Simple" means being the reader's advocate, not dumbing down; clarity is not condescension. Done right it dissolves both failure modes at once: you neither baffle readers with insider shorthand nor insult them with belabored obviousness. (No one ever complained a thing was too easy to understand.) This is the core posture of good tutoring — explain the jargon and supply the missing step without patronizing.

> "The key is to assume that your readers are as intelligent and sophisticated as you are, but that they happen not to know something you know." — Steven Pinker, *The Sense of Style*

### Clarity is an ethical act  ·  Williams · Pinker
Make ideas no simpler than they deserve but no harder than they have to be — if you would not want to read it, do not ask your reader to. Over time the ethos a reader infers from your prose (accessible or aloof, trustworthy or evasive) hardens into your reputation, so considerate writing is both the decent thing and the smart thing. The corollary: you cannot trust your own ear, because you know your draft too well to feel its fog — diagnose it mechanically instead (underline the first seven words of each sentence; hunt for abstract subjects and late verbs).

> "Write to others as you would have others write to you." — Joseph M. Williams, *Style: Toward Clarity and Grace*

## 2. Structure & flow

_How sentences and sections cohere and pull the reader forward. Flow is not inside any one sentence — it lives at the seams between them._

### Make every sentence a little story: agent + action  ·  Williams · King · Strunk & White
Cast the main character as the grammatical subject and its key action as the verb; resist storing the action in an abstract noun (*conduct an investigation* → *investigate*) or leaning on empty verbs (*is, has, makes*). Readers process sentences as "who did what," so comprehension is effortless when subjects name agents and verbs name actions — and laborious when the action hides in a nominalization the reader must reassemble. When any sentence collapses under its own clauses, this is also the rescue: rebuild it as a plain subject-and-predicate and the meaning walks again.

> "Take any noun, put it with any verb, and you have a sentence. It never fails. Rocks explode. Jane transmits." — Stephen King, *On Writing*

### Manage flow at the joins — old before new  ·  Williams · Graff & Birkenstein
Open each sentence with information the reader already has (from the prior sentence or common knowledge) and close on what is new; then chain the new end of one sentence into the familiar start of the next. The felt experience of "flow" is precisely this fit between how one sentence ends and the next begins — old-before-new keeps the reader oriented, while leading with the new feels like it came from nowhere. Do the connecting work yourself with transitions, pointing words ("this," "such"), and repeated key terms; never make the reader reconstruct the link.

> "Sentences are cohesive when the last few words of one set up information that appears in the first few words of the next." — Joseph M. Williams, *Style*

### Carry the reader from simplicity to complexity; end on weight  ·  Williams · Pinker
Begin sentences short and concrete — brief intro, short subject, quick verb — and push the long, abstract, or technical material to the back half; then put the idea you most want *felt* in the final stress position and clear away trailing qualifiers that would smother it. A reader who reaches the verb in five words builds momentum that carries them through later difficulty; a reader hacking through a 22-word abstract subject has none. The end of a sentence carries natural emphasis, so ending on the payoff makes it land and ending on a weak word makes the whole sentence deflate.

> "Carry the reader not from complexity to simplicity, but from simplicity to complexity." — Joseph M. Williams, *Style*

### Lead each expository paragraph with its point  ·  King · Strunk & White
Make the paragraph the unit of composition — one topic each — and open it with the claim, then follow with sentences that explain or amplify. Topic-sentence-then-support forces you to organize your thinking and insures against wandering off-topic; paragraphs are "maps of intent." They also work *visually* before they are read: short paragraphs and white space signal an easy passage, dense blocks signal a hard one, and the break itself tells the eye a new step has begun. Indispensable in a tutorial, where the reader is scanning for the one paragraph that answers their question.

> "The ideal expository graf contains a topic sentence followed by others which explain or amplify the first." — Stephen King, *On Writing*

### Front-load the most important words  ·  Handley · Strunk & White
Lead with subject + verb and cut the throat-clearing that delays them (*According to…, It is important to note that…, The purpose of this email is…*). Front-loaded sentences make a friendly, direct first impression; junk at the start makes the reader work harder for no payoff and usually adds nothing. The same logic front-loads headlines and subject lines — vital wherever the end gets lopped off (SEO, mobile, inbox previews). Keep related words together as you do it: position is the chief signal of relationship, so subject stays near verb and modifier near what it modifies.

> "Thirty million adults struggle with reading, according to the National Assessment of Adult Literacy …" (vs. burying the stat behind "According to …") — Ann Handley, *Everybody Writes*

### Cut metadiscourse — say it, don't announce it  ·  Williams · Pinker
Delete throat-clearing about your own writing — "In this section I will argue that…," "It is important to note that…" — and just make the point; keep metadiscourse only where it genuinely guides the reader. Such language refers to your *writing* rather than your *subject*, and in introductions especially it pads the sentence while delaying the idea. Saying the thing is always stronger than announcing that you are about to.

> "Metadiscourse is language that refers not to the substance of your ideas, but to yourself, your reader, or your writing." — Joseph M. Williams, *Style*

### Vary the rhythm — write by ear  ·  Zinsser · Strunk & White · Schwartz
Read every draft aloud and break up monotony: vary sentence length, reverse word order, drop in an occasional short sentence for punch, and avoid a long string of same-shape *and/but*-strung clauses. Readers *hear* what they read far more than writers realize, so cadence is vital to every sentence — and a run of identical loose sentences turns "monotonous and tedious" regardless of content. Reading aloud is also how you actually *find* the clutter, clichés, and limp rhythm a silent re-read glides past.

> "I write entirely by ear and read everything aloud before letting it go out into the world." — William Zinsser, *On Writing Well*

### Lock the ending to the opening  ·  McKee · Snyder · Pinker
Engineer the piece so "because of the opening, the ending had to happen" reads as true — bind beginning and end with a single through-line, and reserve your most resonant note for the last line. A felt causal lock makes the climax land as earned and inevitable rather than arbitrary; in narrative, bookending on deliberately *opposite* states (Snyder) is the visible proof that real change occurred. The first line decides whether the reader continues; the last line is what they carry away.

> "We should sense a causal lock between Inciting Incident and Story Climax … the final effect … should seem inevitable." — Robert McKee, *Story*

## 3. Persuasion & psychology

_Why people believe, feel, and act. You cannot bore people into buying — you can only interest them._

### Serve the reader, not yourself — assume they are selfish  ·  Handley · Hopkins · Ogilvy · Schwartz
Write every piece to please exactly one person — your reader — and open from *their* self-interest (the result, saving, or relief they want), never from your need to be chosen. People "care nothing about your interests or profit; they seek service for themselves," so self-serving appeals repel and reader-benefit appeals pull. Sell what the product *does* for them; the specs exist only to justify the price. The test is brutal and clarifying: if the customer loves it the boss will too, but the reverse never holds — and behind every piece of bad content is an executive who asked for it.

> "Remember the people you address are selfish, as we all are. They care nothing about your interests or profit." — Claude Hopkins, *Scientific Advertising*

### The opening's only job is to earn the next line  ·  Zinsser · Ogilvy · Schwartz · Hopkins
Do not load the whole sale onto the first sentence or headline; its sole task is to stop the reader and compel the *second* line — cajole with freshness, paradox, an unusual fact, or a question, never a mushy statement of the obvious. Attention is a 30-second resource competing with everything else, so if the first sentence doesn't induce the second, the piece is dead. Then each sentence pulls the reader into the next: the more of your story that gets read, the more thoroughly you can make your case.

> "Your first paragraph should be a grabber … a mushy statement of the obvious … won't hold many readers." — David Ogilvy, *Ogilvy on Advertising*

### Channel existing desire; never try to create it  ·  Schwartz · Cialdini
Find a want already alive in your reader by the millions, then point it at your subject — do not try to manufacture a new want from scratch. Copy that focuses pre-existing mass desire commands force hundreds of times its budget; copy that tries to *create* desire is education and, at best, returns a dollar for a dollar. Practically, this means research comes before writing: dig until you know the reader's real problem and language, because the decisive angle almost never sits on the surface.

> "Copy cannot create desire for a product. It can only … focus those already-existing desires onto a particular product." — Eugene Schwartz, *Breakthrough Advertising*

### Trip the right mental shortcut — and back every ask with a reason  ·  Cialdini
People decide from a single representative cue, not all the evidence, so identify the one trigger feature that carries your case (price, social count, deadline, authority signal) and lead with it. And never make a bare request: attach a genuine, reader-centered "because + reason" to every claim and CTA — people simply like to have reasons for what they do, and supplying a real one both lifts compliance now and withstands later scrutiny. The reader is cognitively overloaded and runs on "click, run" automatic responses; the cue that fires the right shortcut beats a paragraph of complete-but-ignored reasoning.

> "People simply like to have reasons for what they do." — Robert Cialdini, *Influence*

### Prove it with the many; deliver proof exactly where it's demanded  ·  Cialdini · Schwartz · Heath
Don't *tell* the reader something is good — *show* that many similar others already chose it, with a concrete number and a similar reference group — and place each proof at the precise moment the reader is silently demanding it, not in a generic "Here's Proof" box. We judge correctness by what comparable others do, and similarity amplifies the effect, so a count of peers outpulls any direct claim. The very same statistic that glazes the eyes in a vacuum becomes dramatic when it lands as the answer to a need the copy just intensified — position increases power. Where you can, let the reader verify it themselves: a "try it and see" challenge (Heath) outsources credibility to the most trusted source — their own experience.

> "95 percent of the people are imitators and only 5 percent initiators; people are persuaded more by the actions of others than by any proof we can offer." — Cavett Robert, quoted in Cialdini, *Influence*

### Frame the stakes as a loss; set the contrast first  ·  Cialdini
Describe what the reader will *lose* by not acting rather than what they'll gain by acting — same fact, stronger pull — and when a number must land softly, show the expensive or large thing first so your actual ask looks small by comparison. Loss aversion means people are far more motivated to avoid losing something of value than to acquire the identical thing, especially under uncertainty; and perception is relative, so the same offer feels radically different depending on what immediately preceded it.

> "The way to love anything is to realize that it might be lost." — G. K. Chesterton, epigraph quoted in Cialdini, *Influence*

### Appeal to identity, not just incentive  ·  Heath · Cialdini
Beyond "what's in it for you," invoke who the reader wants to *be* — "what does someone like me do in this situation?" — and write from inside their tribe, using their own words and shared-identity category so you read as one of them. People decide by identity as much as self-interest (Texans stopped littering from pride, not fines), and they say yes to those they consider "one of us." Don't assume people are baser than they are; aspiration and meaning move readers that a bonus or a discount never will.

> "Don't mess with Texas." (Texans stopped littering not from fines but from pride.) — Heath & Heath, *Made to Stick*

### One fully-believed promise beats ten half-believed ones  ·  Schwartz · Ogilvy
When a piece feels weak, resist piling on more claims — instead strengthen the believability of the one justified promise you already have, and drop the unprovable superlatives entirely. Stacking promise on promise raises sales resistance, while channeling the reader's belief behind a single claim sells more than all the half-questioned promises competitors can write. Often you needn't even prove you're better than rivals: when products are at parity, it is enough to convince the reader your product is *positively good*, said more clearly and honestly than anyone else.

> "One fully-believed promise has ten times the sales power of ten partially-believed promises." — Eugene Schwartz, *Breakthrough Advertising*

### Use only genuine triggers — and concede a real flaw  ·  Cialdini
Surface real similarities, true scarcity, authentic social proof, and evidenced authority — never manufacture them — and admit a genuine limitation early, because the reader then trusts your strong claims *more*, not less. Fabricated commonalities, fake urgency, and faked proof work briefly and then collapse trust permanently when detected; an authority who acknowledges what they can't do reads as honest, which makes every other claim credible. For a learning product whose whole value rests on being *accurate*, this is non-negotiable: durable persuasion is built only on real signals honestly surfaced.

> "The desire to be liked … doesn't justify falsification, as in the presentation of fabricated similarities." — Robert Cialdini, *Influence*

## 4. Narrative & story

_The engine of attention: tension, character, change. A story is a flight simulator for the brain (Heath)._

### Dramatize; show, don't tell  ·  McKee · Snyder · Heath · Pinker · Handley
Prove your idea through events, action, and concrete image that the reader experiences — not through stated claims or narrated meaning. Audiences are rarely convinced by ideas they're forced to *listen* to; they believe what they see acted out, and a shown feeling is experienced where a named one is merely asserted. Earn the reader's conclusion by presenting the telling particular (the clumsy small hand; the husband eyeing a pretty young thing) and let them draw it. For an AI tutor, this is the move from "here is the rule" to "here is the rule *happening*" — the concrete scene a learner can walk through and recognize later in the wild.

> "Master storytellers never explain. They do the hard, painfully creative thing — they dramatize." — Robert McKee, *Story*

### Hold attention by withholding — open a gap before you fill it  ·  McKee · Heath
You keep interest not by giving information but by withholding it: reveal only what the reader needs to follow along, name exactly what they *don't* yet know, then deliver the answer. Curiosity is the pain of a knowledge gap, so pointing to the gap first turns a fact-dump into a pull ("here's what you know; now here's what you're missing"). Sequence the rest so the least important facts come early and the critical secret comes last — arouse the question "Why?" and even complex material slides smoothly into place. The single most useful structural device an explainer has.

> "You do not keep the audience's interest by giving it information, but by withholding information." — Robert McKee, *Story*

### Surprise by breaking a pattern — then make it postdictable  ·  Heath · Snyder
Violate the reader's expectation on a *core* point to seize attention, then immediately resolve it so the surprise feels insightful rather than gimmicky. Surprise works because it stops the brain's auto-pilot guessing machine — but a surprise that doesn't connect to your central message is a cheap trick that's forgotten; "postdictable" means obvious in hindsight, not before. Closely related is the discipline of asking for exactly *one* leap of faith (Snyder's "one piece of magic"): a second unrelated conceit breaks the reality you'd already earned.

> "Break a pattern! Break people's guessing machines (on a core issue)." — Heath & Heath, *Made to Stick*

### Write to the one, not the mass  ·  Heath · Ogilvy · Hopkins
Make the reader feel something for a single named person, and address your prose to one individual rather than a crowd. We are wired to feel for people, not abstractions — donors gave more to one named child than to statistics about millions, and merely priming people to *calculate* cut their giving. The same logic governs voice: people consume copy alone, so one-to-one address ("second person singular," in a personal-letter register) feels human and trustworthy where mass-address feels like being lectured. A case study about *one* learner beats a chart about thousands.

> "If I look at the mass, I will never act. If I look at the one, I will." — Mother Teresa, quoted in Heath & Heath, *Made to Stick*

### Translate every statistic to human scale  ·  Heath · Hopkins
Never expect a number to be remembered for its own sake; use it to dramatize a *relationship* the reader will feel and keep ("5,000 BBs dropped in a bucket"). Statistics are eye-glazing and forgettable in themselves — what lands is the visceral relationship they illustrate, and exact figures earn belief precisely because they imply you ran the tests. So measure the claim, then convert the figure into something the reader's body understands.

> "It's more important for people to remember the relationship than the number." — Heath & Heath, *Made to Stick*

### Make the protagonist proactive — and put a conflict in every scene  ·  Snyder · McKee
The lead must drive the action from a burning goal — seeking clues rather than receiving them, telling rather than asking — and every scene needs two agendas colliding (who wants what, what blocks them, who wins). Readers follow agency; a passive protagonist who is dragged through events gives the audience no one to pull for and no engine for momentum. Conflict is primal and reliably holds attention — a passage with no collision in it isn't a scene yet, it's exposition wearing a costume.

> "The hero must be proactive. It's The Law. If he's not, he's not a hero." — Blake Snyder, *Save the Cat!*

### Write text and subtext — nothing is what it seems  ·  McKee
Never write "on the nose," with characters saying exactly what they feel; put the real meaning *under* the surface and let what's said contrast with what's meant. Life keeps a public mask over private truth, and readers crave the storyteller's gift of seeing through the surface — on-the-nose writing "dies like a rat in the road" because nothing is left to discover. The reader's own act of reading between the lines is half the pleasure.

> "If the scene is about what the scene is about, you're in deep shit." — old Hollywood saying, quoted in McKee, *Story*

### Never resolve by coincidence; aim every turn at a meaningful change  ·  McKee
The protagonist's own choices must produce the climax — bring coincidence in *early* so the story can build meaning from it, never use luck to turn an ending — and target each climactic moment at a clear, irreversible swing in value (positive↔negative), not at spectacle or volume for their own sake. A coincidental ending erases all meaning and reads as a lie, because life teaches that we must choose and act to determine our outcomes; and it is the *swing in value at maximum charge*, not noise, that moves the heart and is carried home.

> "If I could send a telegram to the film producers of the world, it would be these three words: 'Meaning Produces Emotion.'" — Robert McKee, *Story*

## 5. Voice & humanity

_What makes prose sound like a person, not a template. Ultimately what a writer sells is not the subject but who they are (Zinsser)._

### Be yourself — voice is the product  ·  Zinsser · King · Hopkins
Don't try to bolt on "style" like a toupee; sell yourself, never write anything you wouldn't comfortably say in conversation, and let your real personality survive the editing. What a writer ultimately sells is not the subject but *who they are* — the reader keeps going because of the writer's aliveness and enthusiasm, and there is no style store. Hold that one voice consistently: a voice that's different every time never compounds into trust, because appearing like a stranger at each meeting builds no confidence. For an AI tutor, a steady, recognizable voice is what turns "a tool" into "my tutor."

> "Ultimately the product that any writer has to sell is not the subject being written about, but who he or she is." — William Zinsser, *On Writing Well*

### Voice is constant; tone flexes to context  ·  Handley
Keep your core personality-in-words the same everywhere, but shift your *tone* with the situation — celebratory in a win email, gentle in an apology, plain in an error message. Tone of voice is "not what you say, it's how you say it"; the identical offer in three tones reads as three different relationships. A consistent voice across every touchpoint — even the first bill, even the 404 page — is a compounding brand asset most companies neglect, and exactly the kind of detail a learning product can own.

> "Tone of voice isn't what you say. It's how you say it." — Ann Handley, *Everybody Writes*

### Tell the truth — honesty covers a multitude of stylistic sins  ·  King · Handley · Pinker
Write what people actually do and say, ground your claims in real sources, and disclose your biases — don't swap in the sanitized or expected version. "Honesty in storytelling makes up for a great many stylistic faults, but lying is the great unrepairable fault": truth gives prose its resonance and the reader their trust, while falseness silently breaks the contract between writer and reader. The discipline extends to fact-checking before you assert (Pinker: pair a fallible memory with overconfidence and "conventional wisdom" turns out to be friend-of-a-friend legend) — intellectual conscientiousness is the deepest form of good style, and the bedrock of any product that teaches.

> "Honesty in storytelling makes up for a great many stylistic faults … but lying is the great unrepairable fault." — Stephen King, *On Writing*

### Write like you teach — explain the *why*  ·  Handley
Don't just state what works — say *why* it works; don't just say you feel something — say why. Good writing is good teaching, and your favorite teachers were great because they cared and wanted you to learn; explaining the "why" produces understanding, not mere information transfer, and turns the writer into "someone's favorite teacher." This is the native register for an EdTech tutor: every claim earns its place by being *explained*, not merely asserted, and rigor and joy travel together.

> "A writer always tries … to be part of the solution, to understand a little about life and to pass this on." — Anne Lamott, quoted in Handley, *Everybody Writes*

### Use real words — kill jargon and buzzword bloat  ·  Handley · Ogilvy · Zinsser
Write the way you'd talk to a real person; cut *deep-dive / value-add / synergize / cutting-edge* brand-speak and any word a general reader might not know (test the obscure ones against an actual layperson). "No business truly sells to another business — we all sell to people," and buzzwords are lazy shorthand that mask incompetence and make you sound like a hundred interchangeable companies. Esoteric words also simply break comprehension: most readers won't ask what you meant, they'll just leave.

> "Write in a way that comes naturally … Prefer the standard to the offbeat." — Strunk & White, quoted in Handley, *Everybody Writes*

### Fight clichés — the race is to the original  ·  Zinsser · King · Pinker · Graff & Birkenstein
Hunt down the nearest-cliché reflex and the patched-together journalese, and reach instead for the precise, slightly unexpected word the reader doesn't see coming; when you must use a stock image, remember what it literally depicts and refresh it. Clichés are "the kiss of death" — a reader worked through stale idioms stops converting words into pictures and just mouths them, and the cliché-monger mixes metaphors because their own visual brain has gone dark. Freshness and precision are what give language its life. (When a *summary* is the cliché — flattening a source to the slogan you've confused it with — your whole response misses; Graff & Birkenstein.)

> "The race in writing is not to the swift but to the original." — William Zinsser, *On Writing Well*

### Write in a confident, un-apologetic voice  ·  Pinker · Zinsser
Don't quarantine your own words in scare quotes or whinge that the topic is "complex and controversial"; credit the reader to know that hard things are hard, and present your idea as something worth showing. Squeamishness about your own diction breaks the spell of prose-as-window — classic style is confident about its own voice — and if you can't use a phrase without apologetic quotation marks, you probably shouldn't use it at all. This pairs with trusting your material: let a striking fact or a joke speak for itself, and never add an exclamation point to announce that something is amazing.

> "If you're not comfortable using an expression without apologetic quotation marks, you probably shouldn't be using it at all." — Steven Pinker, *The Sense of Style*

### Use fresh figures of speech that actually clarify  ·  King · Pinker
Reach for a simile or metaphor only when it makes the reader see an old thing in a new, *clearer* way — avoid the worn comparison and, above all, the one that doesn't connect. A good simile "delights us the way meeting an old friend in a crowd of strangers does"; a clichéd one makes you look lazy, and a broken one (King quit reading at "patient as a man waiting for a turkey sandwich") makes the reader close the book. Figurative language is a precision instrument for understanding, not decoration — keep the reader's visual brain lit.

> "By comparing two seemingly unrelated objects … we are sometimes able to see an old thing in a new and vivid way." — Stephen King, *On Writing*

### Break the school rules — with purpose  ·  Handley · Pinker
Start a sentence with *And / But / So*, drop a one-sentence paragraph, split an infinitive, end on a preposition, use a fragment — but only when it improves clarity, rhythm, or voice and doesn't create ambiguity. Many schoolroom prohibitions merely describe natural speech, and "we're not writing to please our teachers anymore"; treat usage rules as shared conventions that lubricate comprehension, obey the ones that signal care, and flout the myths that make prose worse. A single sentence set apart can make a point crystal clear — the freedom is a tool, not an excuse.

> "This is the kind of impertinence up with which I shall not put." — Winston Churchill, quoted in Handley, *Everybody Writes* (mocking the no-ending-preposition rule)

## 6. Revision & discipline

_Writing is rewriting — it's where the game is won or lost (Zinsser). The first virtue is showing up; the second is cutting._

### Rewriting is the writing  ·  Zinsser · King · Handley · Pinker
Treat the first draft as raw material, not a product: get the mess out of your head with zero regard for grammar or flow ("show up and throw up"), because almost no sentence comes out right the first time. Then do the real work on later passes — reshape, tighten, and make the prose grammatical, graceful, and transparent. The writers you admire are usually terrible first-drafters and excellent *editors* of their own work; too many things must go right in a single sentence to land them all at once, so only after the idea is on the page do you free the attention to make it clear to a reader. Build this into any generated draft: produce, then revise against this very list.

> "Rewriting is the essence of writing well: it's where the game is won or lost." — William Zinsser, *On Writing Well*

### Clear thinking is clear writing  ·  Zinsser
Before you fix a muddy sentence, fix the muddy thought behind it — if a sentence is fuzzy, it's because you haven't decided what you're trying to say. Ask "What am I trying to say?" then "Have I said it?" Writing is talking to someone on paper, and the reader can only infer what you imply, so any gap in your own logic becomes a hole the reader falls through and a place where they quit. Most "writing problems" are thinking problems in disguise.

> "Clear thinking becomes clear writing; one can't exist without the other." — William Zinsser, *On Writing Well*

### Know what it's REALLY about — then cut to that  ·  Zinsser · King · Snyder
After draft one, step back and ask not just "What is this about?" but "What is it *really* about?" — name the single theme, then revise to sharpen it: add what reinforces it, cut what wanders, however hard the wandering material was to gather. Fondness for hard-won material is not reason enough to keep it; deciding what the piece is about gives the second draft a clearer focus and a more unified story. The cut material isn't wasted — the reader senses you know more than you put on the page.

> "Readers should always feel that you know more about your subject than you've put in writing." — William Zinsser, *On Writing Well*

### Murder your darlings  ·  King · Zinsser
Cut even the lines, scenes, and flourishes you love most when they don't serve the piece or slow it down — especially to speed the pace by leaving out the boring parts. Self-indulgent passages that enchant the writer bore the reader; the number-one cause of prose "getting boring" is a writer in love with their own description who has lost sight of the point. The instruction is deliberately violent because the impulse it fights is so strong.

> "Kill your darlings, kill your darlings, even when it breaks your egocentric little scribbler's heart." — Stephen King, *On Writing* (after Quiller-Couch)

### Beat the Curse of Knowledge  ·  Heath · Pinker · Ogilvy
Assume the reader hears only your "taps," not the tune in your head, and before publishing re-read as a true novice — translate every term you can no longer un-know and over-clarify anything a fraction of your audience could misread. Once you know something you literally cannot imagine not knowing it (tappers predicted 50% comprehension; listeners got 2.5%), so expertise silently makes prose opaque, and studies find that even careful messages get *misread* by 19–40% of an audience. Ambiguity is never received as nuance — it is received as the wrong meaning. This is the central hazard for anyone explaining what they know well to someone learning it for the first time.

> "Once we know something, we find it hard to imagine what it was like not to know it. Our knowledge has 'cursed' us." — Heath & Heath, *Made to Stick*

### When the piece goes dead, change the structure, not just the words  ·  Schwartz
When copy goes flat, don't merely reword — throw away the headline and the flow and rebuild the same material in a different order, even 180 degrees from where you started. Believability and impact depend on *arrangement* as much as wording, so re-sequencing identical content surfaces new ideas, sharpens your promises, and often reveals that the real headline was buried three paragraphs down. A new structure is, in effect, a new piece.

> "A new structure is a new ad. It brings out new ideas. Gives your promises new sharpness, new flavor, new believability." — Eugene Schwartz, *Breakthrough Advertising*

### Analyze the situation; don't pour it into a borrowed formula  ·  Schwartz · McKee
Treat every problem as unique and solve it by asking the right questions — never by pouring your idea into someone else's proven headline or relying on a beautiful template to carry weak content. A formula is just the frozen solution to a *past* problem; change one variable and it fails, and word-substituting a winning piece produces an "Echo" that reminds people of the original and forfeits your own situation's strength. Craft turns raw talent into work that consistently lands — but it is fuel *for* an engine, not a stencil: learn the moves deliberately, then let them go intuitive so you don't write like a phrase-carpenter.

> "No formula works twice. Each and every formula is simply the written solution to a particular problem that occurred in the past." — Eugene Schwartz, *Breakthrough Advertising*

### Read a lot and write a lot — the Prime Rule  ·  King
Feed input constantly and produce daily: reading builds the ear for what works and what fails, and sheer volume of writing builds the skill no advice can substitute for. Bad books teach what to avoid; great books raise the ceiling; both are the writer's only real curriculum. There is no shortcut around the hours — craft compounds only by doing the thing repeatedly and reading widely while you do.

> "If you want to be a writer, you must do two things above all others: read a lot and write a lot." — Stephen King, *On Writing*

---

*Every principle here is transformative craft analysis plus short, attributed, fair-use excerpts — never a reproduction of a copyrighted work. See [`author-styles/README.md`](author-styles/README.md) for the canonical copyright posture. Distilled from 14 master books by `/write learn` on 2026-06-10.*
