# Living Journal | One story medium, author-directed appearance

**Status:** NEW OPEN DESIGN CANDIDATE (2026-11-17), owner hypothesis, not product ratification. **Implementation permission:** none.
**Owner clarification (later on 2026-11-17):** [10 · Reader's book and adaptive story world](10-READER-BOOK-AND-STORY-WORLD.md) supersedes the parts of **this open thesis** that proposed morphing the book substrate into an in-world terminal, membrane, damaged field diary, etc. The book now remains a recognizable extradiegetic reader object; environment and reflected lighting change primarily **around/across it**, while selective source-backed text and illustration treatment can change inside it. Preserve this page as the earlier design exploration, not as parallel authoritative rules.

**Supersedes no accepted document.** The existing selected presentation language in `docs/technical/client/presentation-runtime.md` remains authoritative until explicit reconciliation. The new page and rich-content ideas below intentionally go beyond V1's selected scope.

## 1. The product thesis

**One readable narrative artifact; an unbounded range of fictional worlds.** The player's enduring experience resembles opening a living volume that is still being written. Its *form* is stable enough to learn and navigate, while its *material character* is generated from the world and present circumstances.

This is not “a parchment theme for medieval fiction.” An illuminated spaceship log, a field notebook, a scratched cave record, a translucent membrane or an abstract nonhuman record can all be expressions of the same **narrative leaf**. Genre is never a value in our presentation API. No `caveTheme`, `sciFiTheme`, `medievalPreset`, `microbeLayout` or source-path-to-theme switch.

### The critical precision

A **page** is a conceptual and interaction-level invariant, not necessarily physical paper. A legible bounded reading plane, stable source identity, narrative body, optional inlaid illustration, visual margins and current-choice threshold are the recurring grammar.

- Stable: who owns this story, Now/Journal distinction, canonical passage identity/order, safety/action semantics, readable hierarchy, navigation, focus, responsive behavior, actual text, source links.
- Dynamic: backdrop, light direction, page coloration/material impression, edge/wear, typography **within approved role families**, decorative marks, illustration placement, local emphasis and optional entry motion.
- Conditional: a diary/handwriting illusion, torn edges, blood-like marks, technical grids, subtle orbit or luminescence. None exists by default; only well-grounded direction makes one appropriate.
- Protected: system status, focus and error colors, contrast limits, read order, current verified choices, command controllers, private/public visibility, budget/asset permissions.

**The volume is a reading metaphor, not evidence that the character literally wrote a diary.** A third-person or disembodied narrative remains third-person. The journal does not convert the Storyteller into the player character or fabricate an in-world book artifact. If a character really discovers a physical diary, that object is rendered as an *embedded in-fiction document*, clearly distinguished from the platform's enclosing living volume.

## 2. A single compositional anatomy

~~~text
┌──────────────────── stable platform navigation ───────────────────────────┐
│ Story identity      Now  ·  Journal              safe settings / back   │
├──────────────────────── ambient world field ─────────────────────────────┤
│    lighting, gradient, glow, vignette, optional environmental imagery    │
│                                                                          │
│           ╭────────────── narrative leaf ───────────────╮               │
│           │ source / reading-position marker            │               │
│           │ optional embedded motif or illustration     │               │
│           │                                               │               │
│           │  The saved title                              │               │
│           │  Exact source prose, rich semantic layout    │               │
│           │  optional marks / fragments / marginal notes │               │
│           │                                               │               │
│           │ ─ verified choice/accepted hold threshold ─  │               │
│           │ decisions or truthful quiet/ongoing status    │               │
│           ╰───────────────────────────────────────────────╯               │
│                                                                          │
│     provenance, contextual links and navigation when useful             │
└──────────────────────────────────────────────────────────────────────────┘
~~~

The leaf is **not** required to look like a browser rectangle with a giant drop shadow, and its text need not be trapped inside a narrow centered 56rem card in every viewport. The invariant is conceptual reading continuity, not an immutable pixel box. On mobile, the leaf may become the uninterrupted reading surface; background atmosphere can recede rather than squeeze the prose.

## 3. Layer model: compositional authority

| Layer (front to back in meaning, not DOM stacking) | What it means | Owned by | Adaptive range |
| --- | --- | --- | --- |
| **Platform frame** | Back/Now/Journal/source/status/accessibility | Product/client foundation | Static rules; responsive only |
| **Ambient field** | What inhabits the space behind the reading artifact | Validated scene direction | Palette gradients, darkness, soft lighting, atmospheric motion, optional anchored art |
| **Leaf substrate** | The material illusion of this *specific* reading plane | Story identity + scene + page directions | Opacity, tint, roughness, grain, edge softness/wear, shadow, light interaction, bounded marks |
| **Editorial skeleton** | Title, paragraphs, intervals, inset document, annotations, original-quote boundaries, choice threshold | Approved semantic layout | Few well-defined semantic placements, no arbitrary DOM |
| **Content expression** | Selective emphases, whispers, observed inscription, unusual rhythm, authorial stress | Verified content and bounded rich score | Strong/quiet/aside/display roles, never arbitrary HTML |
| **Figure/media layer** | Optional illustrative evidence or atmosphere embedded in leaf or field | Trusted asset catalog + verified source | Bounded slots and focal point; unavailable art simply vanishes |
| **Action/control layer** | Choices, intent, commitments, pause, recovery, reader navigation | Authoritative current offer and platform controls | Decorative accents only; no eligibility or command change |
| **User protection** | Contrast, reduced motion, data saver, zoom, screen reader, override to text-first | User/platform | Always takes precedence |

**Cascading creative scope:** platform-safe defaults → optional stable story artistic signature → current validated situation → exact passage/choice marks → user safety/preferences. A new passage **does not inherently trigger a wholesale color/motif randomizer**. Story continuity needs inheritance and restrained change.

## 4. Material grammar, not theme presets

Rather than enumerating “ancient parchment”, “spaceship screen” or “bio membrane”, offer a small number of **perceptual primitives** that can be composed and tested:

| Primitive family | Representative controls (proposed only) | Expressive job |
| --- | --- | --- |
| Color/light | backdrop stop colors, leaf tint, warm/cool luminosity, light angle/intensity | The environment's temperature and psychological pressure |
| Surface | optical transparency, fibrous/granular/geometric noise intensity, sheen, ink absorption hint | What kind of medium the page evokes |
| Geometry | allowed edge irregularity, inset/radius class, subtle physical depth | A worn leaf, clean panel, unstable boundary without breaking layout |
| Wear/marks | small anchored stains/smudges/scratches, opacity, frequency/coverage budget | Evidence of weather, use, damage, or contamination when narratively grounded |
| Typography | accessible approved font-role families, weight/scale bands, tracking bands | Different voice and document quality, without loading model-specified fonts |
| Motion | background drift, gradual light shift, page arrival/settle | Atmosphere or publication; not fake time/execution |
| Media | backdrop and in-leaf illustrations with stable source/asset IDs | Enrich source, not replace text |

**No direct arbitrary gradients, CSS strings, external font URLs, SVG/HTML, user-supplied scripts or generated class names.** V1 already establishes strict hex/gradient/asset-target validation and remains the transport precedent. These new primitives are future **registry capabilities**, not an instruction to implement uncontrolled style mixing.

A cave could be damp/rough/dark; a ruined space vessel could be equally damp/rough/dark; an iridescent microbe could be transparent/luminous/soft. The primitives describe *appearance*, not genre, and their combinations need accessible normalization.

### Avoid the hidden-preset trap

An enum of 80 named page materials is just a theme catalog disguised as a schema. An enum of 3–6 *renderer primitives* is acceptable when each has an actual visual responsibility and tests. This is a constrained expressive grammar, not unlimited shader generation.

## 5. Three identical narratives, three sample directions (illustrative)

**A — Mara's cave and damaged journal** (hypothetical publication with approved directives):
- Ambient: desaturated dark backdrop, sparse cold edge light, near-still grain.
- Leaf: lower reflectance, rougher edge, a little uneven warm ink; selective worn corner.
- Text: quiet human prose; a quoted old inscription can become a distinct *document block*. A final line may receive restrained display emphasis only if warranted.
- Never: synthetic gore, red failure signals, invented scratched clues, or new action outcome.

**B — A spacecraft's personal log**:
- Ambient: blue-black radiance, sparse light aperture and quiet orbital drift.
- Leaf: translucent cool writing plane with precise ruled edges; readable solid fallback.
- Text: same semantic prose/decision roles; embedded system transmission has technical *document* treatment if the story actually contains a transmission.
- Never: obligatory HUD full of invented telemetry or 3D navigation.

**C — Distributed signal consciousness**:
- Ambient: abstract chromatic field, subtle waveform-like light (not claimed world telemetry).
- Leaf: bounded but nonliteral surface, a luminous margin and clean high-contrast reading area.
- Text: same headings and paragraphs, optional unusual spatial spacing as expressive punctuation; no body/map/face.
- Never: character portrait, fake coordinates, forced “logbook owner” or complicated text animation.

The **HTML and semantic reading order should be the same** under all three; changing bounded data documents changes appearance. The layout may choose among a *very small* collection of deliberately approved semantic arrangements in later design, but no world-based branches.

## 6. Page as artwork, not mandatory pagination

A *visual leaf* is not necessarily one database passage, one model response, one scene, one chapter or one viewport. The accepted ontology rules remain intact. Readable history may arrange multiple source passages across a spread, and a long passage may occupy a scrollable leaf. On mobile it is continuous reading rather than a desktop two-page spread squeezed into 375px.

The current Now leaf is the latest **published** passage with current verified action/hold state. The Journal's archived leaves preserve source text and publication order. A historical choice is never actionable. Page-turn motion can express a temporal transition only when the user actually navigates reading or a new passage has been published.

## 7. Time, wear and visual continuity

The Moria diary analogy suggests a visual history that **accumulates character**: a weathered leaf carries consequences, not random “damage level”. But the visuals must not claim a sword cut, blood stain, darkness or an ending absent source. Wear marks are **presentation claims** that need appropriate grounded direction and a publication identity. Do not regenerate a new tear/stain on every render.

An explicitly ended campaign becomes a stable **closed volume**: final passage, preserved history and lineage remain readable; no live choice. A running campaign is an **open volume** where only committed publications add leaves. “Ended” must come from the game's authoritative lifecycle, not a dramatic-sounding last sentence.

## 8. What prior Phase 2 concepts become

- **Living Codex:** preserve deliberate typography, editorial reading comfort and tactile marginalia; reject genre-fixed parchment/old-book chrome.
- **Responsive Stage:** preserve environmental lighting, large ambient composition and transition choreography; place atmosphere *behind* a legible leaf.
- **Field Edition:** preserve clear identity, structural precision and navigation; reject permanent loud graphics that overwhelm quiet scenes.

This is a **new fourth integrative direction, not a declared visual winner**. It is substantially more coherent with the owner's universal-world requirement than any of the three as originally rendered, but must be prototyped against the same Phase 1 specimens before selection.

## 9. Decisions to confirm and proof required

1. Approve or reject the **narrative leaf as the product's invariant composition**, while allowing nonliteral materials.
2. Decide whether the leaf is always visibly bounded on desktop or can become visually open in some scenes; compare both with same story and no-image fallback.
3. Decide whether persistent story material history is part of the promised authored publication or merely transient scene atmosphere. If archive fidelity is promised, directives must be retained per passage.
4. Distinguish *in-fiction discovered documents* from the metaphorical enclosing Journal, including quote/annotation provenance.
5. Verify the restrained, world-neutral default is still attractive without scene direction or images.

**Exit gate:** demonstrate one rendering structure with three radically different validated direction documents, no source prose changes, meaningful choice semantics unchanged, stable focus/contrast, and good long-form reading. This gate is visual/behavioral evidence, not a backend implementation packet.
