# Component architecture | make the game bespoke without rebuilding every primitive

**Design status:** selected *recommendation for eventual UI work*, not a package-install directive. Compatible baseline: [React/Next target](../../engineering/targets/react-next.md) (React 19, Next 16, TanStack Query, RHF/Zod, Storybook, tests). This document owns design usage, not remote-state architecture.

**Selected dynamic presentation companion (2026-11-13):** [presentation runtime](presentation-runtime.md) owns the frontend visual-expression seam, [V1 language](presentation-language.md) defines bounded data-driven styling, and [media/motion](presentation-media-and-motion.md) defines art/effect placement. This component strategy continues to own semantic/reusable component boundaries and accessible primitives; it does **not** authorize arbitrary model-generated markup or a visual library migration. [PX01–PX04](../presentation-implementation-program.md) landed as fixture-fed frontend code. Live Play still omits a presentation document.

## Recommended stack posture

**Use native semantic HTML where possible + Radix unstyled accessible behavior primitives for complex controls + original Offscreen RPG compositions + selective Motion for React.**

**shadcn/ui** may be a *source-owned component starter* for a standard dialog or form control after reviewing markup and a11y. It is **not** the product's visual design language. Avoid copying a default shadcn admin template into the experience. **React Aria** is a viable alternative when one complex behavior genuinely calls for it; do not install two parallel primitive stacks by habit.

The app currently has plain CSS, React, Next and forms but no comprehensive visual component layer. A Tailwind migration is not justified solely to use a familiar component catalogue. First establish semantic CSS custom properties, a few accessible wrappers and reusable game components. Cursor may recommend a CSS architecture after source/usage proof, but the UX target is library-agnostic.

## Four levels of implementation

1. **Tokens:** spacing, type, readable measure, surfaces, borders, focus, elevations and semantic state colors. Stable across worlds. Optional atmospheric themes should not change meaning.
2. **Accessible primitives:** button/link, dialog/alert dialog, drawer, popover, tabs, accordion, field controls, tooltip and focus management. Use native semantics/Radix as appropriate. These know nothing about game rules.
3. **Game semantic components:** passage, situation header, intention option, commitment progress, truthful hold banner, roll receipt, return digest, context fact. These know *player-visible meaning* but not Nest transport.
4. **Compositions:** Now, Journal, World, You, Create, Stories and Demo. They receive validated read models and typed commands through feature boundaries, not direct provider calls.

**Avoid “universal GameCard with 27 booleans.”** A passage, a choice and a block reason are different concepts and should not be abstracted merely because each has a border. Do not duplicate remote state in visual components; the existing Query architecture owns server projections.

## Essential semantic component inventory

| Component role | Inputs / states | Never do |
| --- | --- | --- |
| `StoryFrame` | story identity, nav, auth scope, current status | Own canonical story truth |
| `SituationHeader` | public title/location/calendar/status, unknown/missing states | Invent a location/date |
| `NarrativePassage` | immutable published title, paragraphs, provenance, read-state | Regenerate text on mount |
| `IntentionList` / `IntentionChoice` | current offer revision, description, time/risk, eligibility, selected path | Submit stale offer / promise success |
| `IntentionPreviewSheet` | known consequences, confirmed command, safe cancel | Mutate during mere preview |
| `CommitmentSummary` | actual process, progress type, due estimate, stop controls | Generalize all jobs as linear progress |
| `InterruptionContext` | held work, established event, preserved progress | Keep incompatible work visually running |
| `ReturnDigest` | source-linked committed changes, current action | Introduce canon through summary |
| `RollReceipt` | committed public check evidence, optional detail | Animate a new die face or leak secret DC |
| `StoryHoldNotice` | differentiated pause, decision, allowance, failure, uncertain state | Render every error as “Retry” |
| `ContextShelf` | a few relevant known facts, links | Render an omniscient NPC census |
| `HistoryEntry` | source passage/event, search anchor, types | Expose an old actionable choice |
| `StoryFoundationChoice` | prepared/custom starting promise | Display internal “seed package” IDs |
| `OpeningReview` | candidate, saved draft revision, stale flag, Start authority | Start or regenerate during review |
| `CustomIntentComposer` (**future**) | draft, interpretation, validation, immutable accept | Execute raw text directly |

A design-system Change should implement *only the primitives actually needed by its first consuming flow*, not a thirty-component graveyard.

## Reading and layout primitives

- Narrative text uses a reliable comfortable measure and a longer line-height than UI controls; headings and short labels can be more expressive.
- Use CSS layout for stable composition. Responsive behavior is purposeful reordering/collapse, not making desktop cards narrower.
- State decoration must mean something. A warm highlight on an actionable choice is not interchangeable with an error color.
- A conditional world theme may change typography accents, background texture or illustration; do not let it change screen-reader semantics or put actions behind ornamental overlays.
- Font availability and non-Latin glyph coverage must be validated before adopting distinctive display fonts. Never require a paid font to render the core experience.
- Design for high-contrast and reduced-motion alongside default visuals, not as a final cleanup.

## Data/permission seam

Public browser components receive **validated, viewer-authorized, versioned read models**. The implementation may derive a pure presentation state from the existing `StorySnapshot` and `CampaignView`, but if data are missing it must request an explicit public projection contract. Visual components never derive fictional progress from a client-only setInterval, call the Storyteller, decide eligibility or implement secret authority.

Mutations reuse the selected immutable-intent + receipt and revision-safe Query paths from [React target](../../engineering/targets/react-next.md). A visually richer choice button must be no less safe than the existing one.

## Component workbench

Use existing Storybook workbench for **design fixtures, not only backend error states**:
- Long/short narrative, absent illustration, one versus many options.
- Submitted/accepted/settling/uncertain command.
- Contribution-vs-wait-vs-unmodeled travel progress.
- Manual pause, decision hold, budget exhaustion, resolved mechanics with failed narration.
- Return digest with actual changes, zero changes, stale last-seen baseline.
- Nonhuman world and arbitrary long terms.
- Wide/narrow, 200%/400% zoom, keyboard/reduced motion/dark/high contrast.

Add fixture labels **mocked, simulated or real integration** so reviewers cannot mistake Storybook for production proof.

## Dependency decision

**First:** tokens, primitive focus, shared shell and one authentic Now composition.  
**Next:** action and time semantics, return, creation, secondary spaces.  
**Later:** richer motion, elaborate illustration, custom input and map.  

A custom game UI should be original where *experience value* is high, boringly reliable where browser mechanics are hard, and measurably maintainable everywhere.
