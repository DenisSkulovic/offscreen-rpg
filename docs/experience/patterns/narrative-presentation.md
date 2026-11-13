# Narrative presentation | prose is the game's stage, not its database

**Status:** player-experience target with **optional future structured-content contract**. Current published content [`passageContentSchema`](../../../packages/contracts/src/stories.ts) is title plus paragraphs; there is no compulsory persistent scene entity or chapter. Design must **work with plain prose today** and not rely on future rich text being implemented.

## The hard problem

Offscreen RPG has to carry a long conversation, an atmospheric entrance, a five-second action, a ten-hour commitment, an uncertain dice result and a quiet day without making everything look like the same chat bubble. The UI needs to communicate **what is fiction**, **what is the player's live offer**, **what is settled mechanical truth**, and **what can be read later**.

### Four content strata

| Content | Authority | On-screen placement | Does it accept input? |
| --- | --- | --- | --- |
| **Current published narration** | Server-published passage, potentially limited to character viewpoint | Primary readable scene | No, on its own |
| **Player's current offered intentions** | Authorized offer tied to current revision/path | Distinct decision zone following relevant prose | Yes, exactly as admitted |
| **Committed fact/roll/activity** | Server-authoritative public projection/receipt | Contextual result annotation or inspectable details | No replay or reroll |
| **Historical passages/derived recap** | Immutable source history; optional derived summaries with provenance | Journal and occasional return digest | Read-only |

A string that mentions a key doesn't automatically create an interactive item. A sentence "The road is clear" doesn't certify travel eligibility or a new action. An LLM-generated link cannot grant hidden entity access.

## Reading composition: the narrative plane

**Proposed reading baseline** (to be tested, not an approved CSS spec):
- A readable text measure around 60–75 characters where font/viewport allow; natural wrap on narrow screens.
- Long-form narrative body with adequate line-height, paragraph spacing and genuine quotation marks as source content.
- Distinct situation title and published passage title, but avoid repeating “Current scene” or an identical H1 above every paragraph.
- Strong text contrast. Secondary metadata is clearly lower hierarchy but still legible.
- Avoid a decorative card/border around **every** paragraph. One narrative plane feels more literary.
- Long passages scroll naturally. Never enforce “no scrolling” by clipping prose or abbreviating a necessary choice.
- Don't run typewriter animations over long text. Text is readable immediately and selectable.
- If an image is missing, the typography and rhythm remain complete. Art is content/atmosphere, not the layout's load-bearing pillar.

See [Roadwarden developer's changes](https://assemble-entertainment.itch.io/roadwarden/devlog/113863/the-new-chapter-about-steam-demo-and-others-roadwarden-devlog): the developer added a clear separation between prose and choices because color alone was insufficient for some players, and allowed scrolling when no-scroll constraints harmed the story.

## The narrative/action boundary

A clear **rule, spacing and heading** separate prose from live decisions. Do not distinguish them only with a different color; not everyone perceives hue and some themes reduce contrast.

```text
THE WATCH'S CLAIM

He says the harbor watch sent him. His wet coat
hides most of the badge. His claim isn't proof.

[Optional: Repair suspended · 3/9 preserved]

──────────── What will you do? ──────────────
[Study the badge from the doorway]
[Keep your distance]
```

An action may have important duration or known risk copy **inline in its choice**, but not a generic table of fields. An “inspect item” link inside a detail pane is **not** the same as an authorized in-world attempt; distinguish plain information inspection from spending time to investigate.

## Multiple Storyteller turns, one continuing scene

The game does not have chapters and does not require a new scene every model request. A tense exchange can publish multiple passages. When the next arrives:

- Keep the most recent relevant passage and current live choice easily accessible.
- If earlier dialogue is needed to understand this action, offer a compact **Earlier in this exchange** disclosure linked to actual history. It must not invent a scene ID absent from backend data.
- Do not append all previous turns as infinite user/assistant bubbles. Source history remains a Journal concern.
- Do not forcibly scroll if player is reading earlier text. Show a discoverable “New development” affordance and preserve reading focus.
- The player's submitted *intention* can be presented as a small recap for continuity, but shouldn't impersonate character dialogue if the Storyteller decides actual wording.

**Current-source feasibility:** the snapshot includes the current passage and offers; history is separately paginated. If a reliable “same scene” relationship is missing, begin with current passage + link to Journal rather than infer grouping from titles or arbitrary timestamps.

## Conversations are not all human speech

A distributed mind might sense another pattern. A microbe might respond to a chemical gradient. A nonverbal creature can communicate without dialogue quotation marks. The interface supports first-person/second-person narrative *content* without imposing a chat composer, speech bubble or avatar as mandatory.

If future content introduces a structured speaker/block representation, it should be **optional** and grounded in actual published text, never a reason to turn every narrator paragraph into a message from “AI DM”.

## Known consequences and dice in prose

The Storyteller may narrate “The badge is recognizable,” but UI mechanics must read the **saved receipt** before showing a check result or effect. An expandable result annotation can show:
- Purpose/attempt;
- Public dice outcome and applicable modifiers;
- Committed effect/condition change;
- Link to Journal/records.

Hidden DC or unannounced encounter data stay private. A new animation must never reroll or fabricate the die. A pure descriptive line has no authority to add money, inventory, HP or new characters.

## Optional future structured rich text

There is **no requirement to implement** this to achieve a strong first scene. If plain paragraphs materially limit quality, evaluate a versioned presentation schema for *safe bounded semantics*, e.g. `paragraph`, `blockquote`, `emphasis`, `section-break`, `speaker-label` where supported, with separate source-linked entity references. Preserve original prose and provenance.

**Security boundary:** no arbitrary HTML, executable MDX, event handlers, model-generated embedded URLs, inline CSS or frontend-side regex that turns every name into an authorized link. Versioned validation and sanitization are mandatory. Rich text is **presentation of published evidence**, not an authority-bearing mechanic.

**Trade-off:** every extra block type increases provider output complexity, accessibility testing, storage migration and fallback behavior. Test whether real narratives need this before adding a rich document engine.

## Illustrations, diagrams and maps

Original/reusable scene imagery is welcome when authored, licensed, accessible and semantically appropriate. Do not require an image call for every passage; don't let an illustration loading delay an active decision. A map is relevant only when the world has known spatial semantics; a nonhuman abstract story must not have a compulsory landscape.

If an image communicates an actual clue, its accessible textual description cannot reveal more than the character knows. A decorative background's alt should not repeat the whole passage.

## Storyteller style doesn't control system copy

A tragic narrator can use a distinctive voice in the passage. The UI must still say “Paused by you,” “Unknown whether action was accepted,” and “3/9 earned” plainly. This separation prevents a poetic Storyteller from disguising a server failure or cost.

## Critical acceptance states

- 10 paragraphs totaling several thousand characters; choices still discoverable.
- One-sentence passage and one supported action; no gigantic dead whitespace designed for missing art.
- Three rapid dialogue turns; previous context retrievable but not dumped as chat.
- New passage while player is reading the previous one; focus/scroll preserved.
- Same passage with screen reader, high contrast, reduced motion and no illustration.
- Committed failed check; title/prose and saved receipt consistent.
- A scene in an abstract consciousness with no human speaker names/map.
- Network stale; last *verified* passage labelled so, not reinterpreted as newest canon.

**A passing renderer is not proof of good fiction.** The [Storyteller UX quality bar](../foundations/storyteller-experience-quality.md) independently judges scene specificity, agency and consequence fidelity.
