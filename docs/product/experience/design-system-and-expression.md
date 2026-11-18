# Player visual system and expressive worlds

**State:** SELECTED **architectural product requirements** for the next design-system implementation program, 2026-11-17. No final art direction, typography, book cover, illustration style or button design is accepted. These requirements elaborate [Living Book POC](living-book-poc.md) and [Presentation](presentation.md), not a new gameplay mechanism. The studies and unselected aesthetics remain in [Phase 3](../../../work/designs/open/player-experience-refoundation/phase-3/README.md).

## The product experience we are building

Offscreen RPG is a **reader's stable book surrounded by the fictional world**. A cave, bus, spacecraft and microscopic consciousness have the same recognizable reading object and reliable controls. The scene can change the visual field **around** the book and cast measured lighting across it, but it must not replace it with four genre-specific UI designs. The story remains source text, not a chat UI disguised as a book.

**Foundation must be designed once:** surface roles, readable typography, spacing, focus, disabled/pending/uncertain controls, panels, menus, notifications, motion and no-art fallbacks share a deliberate identity across Welcome, Stories, Create, Now and Journal. An isolated clever component that contradicts the rest of the platform is a design failure.

**Expression is bounded and subordinate to truth:** a validated Storyteller *suggestion* may influence scene palette/backdrop, lighting, ambience, appropriate illustration slots, sparse typography accents and a choice's expressive treatment. It cannot change commands, order, availability, story facts, permissions, focus, system status or original text.

## Visual hierarchy and ownership

1. **Reader/Platform:** consistent book object, familiar controls, legible text, navigation, system statuses and stable interaction semantics; user needs to recognize it across worlds.
2. **Story identity:** optional persistent art signature, tied to a particular published life rather than a genre label. It must not fluctuate randomly every turn.
3. **Scene field:** optional environment light/background/image/motion tied to *this exact* published situation. A quiet scene may have no effects.
4. **Passage/choice accents:** optional, sparse semantic emphasis attached to exact source spans/offers when a future supported format exists.
5. **User safety preference:** font enlargement, contrast, reduced motion, no-art/slow connection, keyboard and screen readers override any creative suggestion.

Platform behavior and system status do not inherit arbitrary Storyteller accent colors. The page may catch blue light but its text must remain readable. An image failure cannot prevent reading or leave an empty obligatory picture pane. How the client keeps those roles apart is [Ownership and CSS architecture](../../technical/client/semantic-design-foundation.md#ownership-and-css-architecture).

## Product component vocabulary to design and then implement incrementally

| Need | User-facing job | Explicit constraint |
| --- | --- | --- |
| **Book surface** | Read a continuing life in one stable visual place | Fluid height; no forced spread, clipping or physical page number authority |
| **Narrative flow** | Read exact published title and prose, later safe optional semantic marks | No generated HTML; source order and screen reader order agree |
| **Decision group / intention** | Understand all current choices and choose safely | Every current option reachable; explore vs commit and blocked/status semantics remain distinct |
| **Contents / return navigation** | Reach Now, Journal and Stories without permanent toolbars | On-demand, discoverable, keyboard reachable and clear focus return |
| **Saved-passage reader** | Read inert original history | Source-accurate, no historical choice reactivation |
| **System feedback** | Distinguish waiting, accepted, blocked, uncertain, error and recovery | Never communicated only by color/glow/animation |
| **Scene field and approved media** | Feel a place while reading | Decorative by default; no unsafe URLs, blocked content or invented events |
| **Ordinary app controls** | Sign in, configure/start a story, manage the library | Same design vocabulary, but do not turn every form into literal book paper |

A component exists because it has a **semantic job** and at least one real consumer, not to fill an impressive Storybook catalog. Preserve currently correct behavior, especially validated command ownership.

## Actual design quality bar

A design-system implementation is not done when CSS variables merely exist. It must be demonstrated through **the same source content** in at least Greywater/ordinary, dark cave, spacecraft, nonhuman abstract, quiet no-art and malformed-direction fixtures, with the same book identity, choices and responsive behavior. It must also produce consistent Welcome/Stories/Create controls.

For each component: document usage, states (idle/hover/focus/selected/disabled/pending/error as applicable), spacing/typography, surface/ink, reduced-motion/forced-colors fallback, mobile/zoom behavior, ownership and a Storybook specimen. No automatic "AI style": a dramatic scene should not force huge headers, glowing borders or a HUD. A small number of intentional expressive details are better than every element competing for attention.

**Selected POC visual baseline is provisional**, and may look plain; **final artistic acceptance is separately required**. Don't implement speculative animated covers, 3D curling, theme presets, unbounded component galleries, arbitrary image generation, whole-page layout changes driven by model prose or extensive replatforming.

## Experience acceptance

- Current Now passage, exact options, wait/recovery, and historical Journal remain readable at 320/375/768/1440 CSS px and enlarged text; all keyboard controls visible with correct semantic labels.
- The same intention control means the same action in Play regardless of palette; state cannot be confused with background mood.
- A no-direction/no-art story is still coherent and attractive enough to read, not visually broken.
- Storyteller style effects, when the source is published and validated, are applied only to the authorized source identity. Missing/stale/invalid appearance uses neutral platform defaults.
- Product identity is consistently observable on Welcome, Stories and Play without reusing literal story book mechanics where they do not fit.
- No style-only user action triggers game mutation, provider charge, false wait or synthetic plot event.

**Non-claims:** these requirements do not certify existing BOOK01/02 visuals, nor select a component or animation package. Next implementation targets are in [semantic design foundation](../../technical/client/semantic-design-foundation.md) and the Phase 3 Change queue.