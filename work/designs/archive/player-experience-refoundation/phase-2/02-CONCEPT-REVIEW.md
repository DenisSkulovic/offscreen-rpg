# Phase 2 | Comparative art-direction review

**State:** OPEN, author critique, no owner selection. **Evidence:** HTML prototype, 33 local screenshots, browser overflow test. Scores below are judgement informed by screenshots, **not** measured player preference or proven accessibility.

## Comparison design rules

Every direction renders exactly the same authored original fixture paragraphs for A-184, B, C-007 and D-042, and the same A-185 historical text. Navigation and choice intent semantics are consistent. Visual direction may change art, type, layout, action emphasis and texture, but it must not change game facts. The header design lab is not game chrome.

## A. The Living Codex

**Core material:** warm uncoated page, folio margins, sepia/ink coastal study, traditional book serif, editorial choices as numbered annotations. **Spatial idea:** printed manuscript spread in Now, book catalogue in Journal, reading page in Reader.

**Works:** original prose feels precious; the reader’s attention is naturally on text; compact excerpts are recognizable as edition entries; mobile one-column flow is readable. **Against:** the color/matter suggest a particular period and physical book, effectively picking a world for the player. Its imagery also looks like historical material even for nonhuman interstellar consciousness. The drop cap and booklet conventions make rapid decisions feel slow. Not an adequate universal world-neutral system in current form.

**Refinement if reconsidered:** remove parchment and period-specific ornaments; retain prose measure, folio/source provenance, flexible margins and quiet decisions. Test two-minute rapid dialogue and generated passages with no scene image.

## B. The Responsive Stage

**Core material:** near-black layered world plane, directional warm light, text shadow/readability mask, atmospheric split composition, actions as spatial threshold near the bottom edge. **Spatial idea:** the viewport is a living present-tense stage; Journal deliberately switches to a darker archive board.

**Works:** the current scene has the most immediately legible emotional context; the options genuinely feel connected to the moment; changing artwork from coastal storm to ring interference demonstrates that scene mood can transform without changing controls. Responsive stacking retains the text/choice link.

**Against:** the illustration is doing too much emotional work; the interface would feel empty if most passages ship without media. Its very dark Journal is less readable over long sessions than the proposed Codex reader. A 10-paragraph scene would need to be deliberately scrollable rather than fitted into the first viewport. Background text shadows and warm focus require formal accessibility testing. The same dark stage for a modern bus, a gas giant and a comedy risks atmospheric sameness.

**Refinement if reconsidered:** maintain a fixed typography/interaction lane that is excellent without an image; let composition states be authored by bounded scene intents (e.g. horizon/full-bleed/sparse). Build separate literary Journal treatments without pretending each history entry needs a cinematic image.

## C. The Field Edition

**Core material:** high-contrast paper, vermilion accent, simple grid, large assertive grotesk for labels/titles, generous serif prose, compact action rows, index as editorial material. **Spatial idea:** a reusable cross-world platform publication instead of a fiction-specific skin.

**Works:** the platform would be recognizable across worlds and viewport sizes; the use of an asymmetrical image zone separates identity from scene material; the Journal is quickly scannable with mixed scale; the prose still gets a dedicated reading face; abstract world supports the same base architecture.

**Against:** headings are too loud for quiet, intimate, melancholic scenes; the orange/red choice may inappropriately read as danger/warning, violating semantic color clarity. The left margin is mostly graphic furniture in the present prototype. This version risks becoming a design agency portfolio website instead of a world inhabited for years. The Journal entries should get more variation in density, provenance and hierarchy.

**Refinement if reconsidered:** moderate headline caps/weight in Now, reserve forceful display scale for Stories/entry/editorial headers, convert hue to a palette of semantic/platform/scene roles, deepen subtle motion and context. Test long passages, other scripts and saved reading positions.

## Comparative matrix (expert hypothesis, not UX data)

Scale: 1 low, 3 mixed, 5 high. Qualitative and **provisional**; no composite winner is valid without actual task trials.

| Criterion | A Codex | B Stage | C Field | Why the rubric matters |
| --- | ---: | ---: | ---: | --- |
| Original prose readability | 5 | 3 | 4 | Narrative is the product core |
| Immediate atmosphere / presence in Now | 3 | 5 | 3 | The world must feel lived in, not merely catalogued |
| Journal scan / source legibility | 4 | 3 | 4 | Re-finding matters at 2,000 passages |
| Across fiction genres / abstract world | 2 | 3 | 5 | Not every story is medieval, visual or human |
| Can still work with no illustration | 4 | 2 | 4 | Generation latency/assets are unreliable |
| Quiet scene emotional restraint | 5 | 3 | 2 | Mundane stories are legitimate |
| Consistent platform identity | 3 | 3 | 5 | A product identity should survive scene direction |
| Mobile narrative composition | 4 | 3 | 4 | Real prose and meaningful choices on 375px |
| Distinctiveness from generic app UI | 4 | 4 | 4 | No universal card soup |
| Potential maintenance/asset burden | 3 | 1 | 4 | Continuous art direction carries cost |

**Preliminary ranking by use case:** Now atmosphere: B > A ≈ C; Journal reading: A > C > B; generalizable identity: C > B > A. These are not independent weighted results; avoid pretending the sum determines the winner.

## Working creative hypothesis for the next iteration

The promising intersection is **a portable editorial platform with a bounded living stage and an unusually beautiful Journal**, but it is NOT “paste C's top nav over B's image with A's paper background.” That would be visual Frankensteining.

Instead, the next exercise should establish a common structural DNA: typographic system, source identity, decision grammar, restrained semantic accents, density rules and motion semantics. Then show how the very same system breathes differently when the scene is a storm, a vibration in a ring, or an ordinary bus route. If that unification fails, select one direction outright.

## Strong disconfirming tests

1. Remove the lighthouse SVG from all three concepts. Is B still a premium reading experience?
2. Replace the short original story with 10 paragraphs of 140–250 words each. Do action controls get buried, overlap or demand jumping?
3. Show 6 authored choices with 100-character titles, a declined option and an inspect-only option. The three-column Stage threshold might fail.
4. Replace the Latin title and English buttons with Lithuanian, Russian and Hebrew examples. How do line breaks, scripts and direction work?
5. Show no active time progress, no current choice and no saved illustration. C must not shout an empty state.
6. Give an expert a 2,000-passage source index and ask for the earliest exchange about a gift. A and B cannot survive on scrolling.
7. Disable illustration, transitions and all JavaScript effects; the static page must still communicate current state and primary navigation.

## Decision discipline

- **A, B, C: Exploration, not Accepted.**
- Nothing here chooses a background, typography stack, image generator, animations package, component library, route layout or implementation packet.
- The owner should critique actual rendered compositions and reject directions as needed before a design-system specification begins.
