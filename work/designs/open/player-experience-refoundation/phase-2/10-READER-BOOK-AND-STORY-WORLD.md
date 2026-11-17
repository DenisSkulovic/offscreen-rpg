# Living Journal | A stable reader's book inside an adaptive fictional world

**Status:** OPEN DESIGN / owner clarification (2026-11-17); **no production implementation authorization**. This document **corrects the leading hypothesis** in [05-LIVING-JOURNAL-THESIS.md](05-LIVING-JOURNAL-THESIS.md) and constrains the proposed [book-engine boundary](09-BOOK-ENGINE-DEPENDENCY-BOUNDARY.md). It does not amend the selected V1 runtime, production code, or source schemas.

## 1. The owner's decisive distinction

> **The book stays a book; the fictional world changes around it.**

Offscreen RPG's reader is not necessarily the player-character, and a fictional microbe does not need to own a microscopic notebook. The book is a **stable, extradiegetic reader interface**, a common medium through which a person encounters the fictional campaign. The **surrounding stage** evokes the current verified setting, situation and mood.

Prior experimentation drifted toward transforming the leaf's material into a spacecraft terminal, a cell membrane, or a genre-specific artifact. That changes the interface identity and creates unnecessary UI/theming complexity. **Reject that as the default product philosophy.** We should not demand that every story's fictional material become the product's physical book material.

### Constant vs directed

| Aspect | Direction | Owner |
| --- | --- | --- |
| Book silhouette, covers, spine/fold, paper/leaf readability, familiar navigation and source references | **Stable recognizable design**; responsive adaptations allowed | Product design and renderer |
| Book layout: single leaf, facing spread, content continuation, current decision threshold | **Deterministic adaptive composition** based on content, viewport and source-authorized controls; optional bounded editorial hints | Reader/layout engine, not genre theme |
| What occupies the book | Exact saved prose, current authorized options, historical passages, optional approved illustrations/embedded documents | Game/source truth with validated presentation |
| World **behind** the book | Gradients, ambient light, environmental image, glow, vignette, motion and optional later source-appropriate generated art | Validated Storyteller scene direction |
| Lighting **falling across** the book | Subtle reflected color, warmth/coolness, edge cast, shadow and atmospheric tint | Validated direction normalized by reader contrast and legibility constraints |
| Narrative emphasis *inside* the book | Sparse semantic text roles, limited color and font-role differences, source-linked document/inscription treatment | Validated rich narrative score, reader typography bounds |
| System status, focus, permissions, accepted choices, reading order, access and accessibility | Never re-authored by the Storyteller | Product/client/source authority |

**Important:** the book can be *lit by* a dark blue cave without itself *turning into* a cave prop. A bright spaceship explosion can illuminate the surrounding field and its page edge without repainting the entire book as a spaceship computer. The content can depict worlds that would not physically contain books.

The stable book may have its own deliberate material identity, including beautiful paper, a cover and tactile depth. Scene lighting is a transient overlay constrained by readable contrast, not a wholesale substitution of surface material. Historical **in-fiction found journals** can use source-justified weathering inside the stable book as *embedded documents*. Earlier experiments in which every leaf inherits blood stains or arbitrary page damage from the scene are **not** the new baseline.

## 2. The spread is a flexible composition, not an obligation to fill two pages

The phrase “a book” invites the physical metaphor of **two facing leaves** when open, particularly on desktop. But the user does **not** require “two pages of story prose all the time”. Treat spread geometry and content roles separately.

### Candidate reading compositions

| Composition | When appropriate | Constraint |
| --- | --- | --- |
| **Prose + continued prose** | Long reading, History/Journal, multiple paragraphs | Source reading order flows naturally, not one passage per physical page |
| **Prose + illustrative folio** | An approved image/document relates to the passage | Illustration is optional, not required or implied to be a real clue |
| **Prose + action threshold** | The final part of a live publication exposes authorized options | Choices follow the relevant words and must never be separated into a permanent dashboard |
| **Single-leaf focus** | Mobile, narrow/zoomed viewport, accessibility preference, long decision, or intentional reading mode | Still unmistakably part of the same book; no cramming a two-page spread into 375px |
| **Intentional breathing space** | A short passage, final line or closure | Do not fill with invented information or giant generic placeholder art |

**Do not permanently reserve the right-hand page for art.** An empty slot may be aesthetically intentional in a rare composed moment, but an art-free story must still feel complete. If an illustration does not exist, the layout may continue prose, show a real in-fiction document, use meaningful quiet margin, or present a single focused leaf. Never invent decorative information to fill space.

**Do not hardcode** "left = prose" and "right = options". If ten paragraphs and six choices do not fit, derived leaf breaks determine where they flow; the actual choices occur after the relevant narrative, with an accessible way to reach the active decision.

The book's physical geometry can persist while the reading mode responds to content: a spread is a display arrangement, not a new gameplay space, literary chapter, source passage, or scene.

### Interaction model

- The **book should occupy the visual center**. Avoid permanent left navigation, right inspectors, technical status labels, developer control bars and a fake SaaS dashboard wrapped around it.
- Primary navigation is intentionally discreet: corner/page edges, a small book index/bookmark affordance, contextual return to Now, and limited out-of-fiction settings in a tucked-away menu. Accessible labels, keyboard paths and visible focus remain essential even when visually restrained.
- Page-turning is a reading operation only. It must not submit game actions, create time, regenerate a story, or change historic source truth.
- In Now, **a new committed passage** may justify a gentle turn/advance in the edition. Background polling or pending creative work does not.
- Desktop can use a facing spread when readable. Mobile defaults to a single leaf; no fixed-size flipbook that shrinks type to fit.
- A no-animation continuous-reader mode must preserve exactly the same source text and action semantics.

## 3. The reader and the character are not the same

**Reading-room metaphor:** “I'm reading my story; the scene surrounds the book.” The fictional environment in the background **suggests** being at the cave entrance or inside a space battle. This does not imply that the game's character literally holds the reader's book or can see the UI.

This preserves world-neutrality more successfully than making the physical book morph into setting-specific equipment. When the story contains a **real** diary found in a mine, its tattered and blood-marked pages are **in-fiction narrative content**, which may be typeset as an embedded source document or illustration *inside* the consistent reader's book. A campaign ending does not automatically weather or physically close every page; **authoritative lifecycle** decides that the volume is finished.

The Storyteller should normally direct the *world* in the surrounding stage and sparsely modulate text treatment, rather than act as a UI designer inventing book shapes. Strong, stable interface identity is not a creative limitation: it makes radical worlds easier to appreciate.

## 4. Scene-driven appearance examples: same book, radically different surroundings

| Source scenario | Environment behind book | Illumination of stable book | Narrative detail inside book |
| --- | --- | --- | --- |
| **Cave, pursued in darkness** | Cold, damp-looking darkness; distant rock shape, low blue wash, sparse moving shadow | Restrained bluish falloff across edges; readable warm-neutral prose plane retained | A real scratched warning or diary fragment may have special inscription/document treatment |
| **Space battle** | Starfield, depth, bounded flashes and optional authorized ship illustration | Brief cold/bright reflected light; never obscures words or focus | Communication excerpt or technical term might receive appropriate but limited typography |
| **Microscopic organism** | Organic/abstract light and motion suggesting scale | Gentle spectral glow on the familiar page | Sparse unusual prose rhythm; no compulsory microbe glyphs, map, portrait or membrane-book |
| **Ordinary bus ride** | Night street ambience, sparse lights or almost no effects | Quiet reflected warm/cool light | Mostly normal prose, no forced dramatic calligraphy |
| **No scene direction / media absent** | Attractive restrained neutral surroundings | Unmodified stable book | Exact readable prose and legitimate controls |

In the future, image generation may populate the **environmental field** and **approved book illustration slots**, linked to exact source and permissions. Missing or late art never blocks reading or moves the player to another passage.

## 5. Presentation authority boundaries, reinterpreted

Keep the selected V1 principle of bounded, validated expressive presentation. This clarification **narrows the role of material customization**, not the possible settings. The interface itself has a consistent physical/typographic identity, while visual direction primarily changes the stage and illumination.

- **Story style** can supply an optional recurring palette/motif in the surrounding stage, rather than a different hardcoded book per setting.
- **Scene style** changes background, lighting and optional art as verified situation changes; avoid a full random restyle each turn.
- **Passage score** can selectively treat exact original spans and in-world document blocks. No model-generated HTML, arbitrary CSS, external font loads, or command semantics.
- **Reader composition** decides page breaks and facing content based on source and viewport; the Storyteller may propose valid illustration/mark hints but doesn't own physical pagination.
- **Player preferences** override atmosphere where necessary: font scale, reduced motion, high contrast, no art and forced colors.

This keeps the previous “book engine as replaceable animation” rule. The book shell and reader are ours; a turn package must not be able to demand fixed pages, own source data or split choices incorrectly.

## 6. Product design comparison now needed

**Don't make another full UI panel design yet.** First review three geometry solutions with the **same recognizable book** and the **same content**:

1. Open facing spread with flowing prose on both sides.
2. Facing spread with prose and a real source-authorized illustration or inserted document on the other side.
3. Single-leaf or visually focused spread for one-page/current-action or mobile conditions.

Then place that exact book in **three different atmospheres** (cave, space, abstract microscopic). The book's external appearance and navigation must remain recognizably identical. Only surroundings, illumination, embedded source art and sparse typography change.

**Failure criteria:** a prominent left sidebar or inspector returns, the book becomes a spaceship HUD or microbe membrane, a page is half-empty only because artwork is missing, content is clipped to honor a page ratio, font zoom breaks pages, status is conflated with fiction, or the Storyteller is effectively generating bespoke layouts.

## 7. Decision register and compatibility

| ID | Revised working direction | Status |
| --- | --- | --- |
| RB-01 | Stable extradiegetic book for every fictional world | **Owner clarification, design candidate** |
| RB-02 | Scene changes the immersive stage and page illumination, not the book's identity | **Owner clarification, design candidate** |
| RB-03 | Two facing leaves on desktop are a possible physical composition, not two mandatory equal-content text panes | Proposed |
| RB-04 | Second leaf is **not** permanently reserved for illustrations | Proposed |
| RB-05 | Options stay with the source passage and current choice, not a dashboard | Proposed |
| RB-06 | Quiet book navigation, optional index, no permanent sidebars | Owner direction; detailed access interaction not selected |
| RB-07 | No requirement for arbitrary book-material morphing or per-genre book themes | Recommended rejection of prior hypothesis |
| RB-08 | Page-turn animation remains replaceable; source anchors are independent of physical pages | Existing open design direction retained |
| RB-09 | Rich story text is semantically annotated without raw HTML | Earlier open design direction retained |
| RB-10 | Only later after comparison: approve book geometry, renderer/typography/art language and component specs | **Not selected** |

**Authority note:** This is a correction of the open Phase 2 *research*, not approval to edit `docs/product/`, `docs/technical/`, packages, schema, Storyteller prompts, or create `work/changes/`. If the product owner selects the detailed book geometry later, reconcile all accepted specs explicitly rather than leaving contradictory design copies.
