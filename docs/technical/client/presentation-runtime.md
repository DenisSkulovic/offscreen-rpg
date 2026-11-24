# Presentation runtime | a living, declarative visual environment

**Status:** selected frontend design target (2026-11-13). **PX portfolio seams landed**; not yet visually/behaviorally accepted for engine integration. (C3: removed stale “no implementation authorized” present-tense banner.)  
**Product presentation promises:** [product experience presentation](../../product/experience/presentation.md). **Later selected POC shell:** [Living Book client target](living-book-poc.md) keeps the book recognizable and directs V1 appearance primarily to the *surrounding stage/lighting*. This is a composition priority, not a new appearance schema or a claim that live Storyteller direction is implemented.  
The selected V1 language is [below](#selected-presentation-language-v1). Media budgets live in that section. Dated PX review notes stay under evidence inspections, not as a second contract.

## Product promise

Offscreen RPG is a world-neutral, scene-first, text-led game. A quiet apartment, abyssal cave, microscopic organism or distributed consciousness must not inherit fantasy parchment or a generic SaaS dashboard. The *same* accessible player interface can acquire radically different visual atmospheres, while reading, meaningful intentions, honest time and continuity remain recognizable.

**Design target:** a controlled, composable presentation runtime: future authorized public data can change palette, lighting, texture, imagery, typography accents and individual choice treatments without rewriting React compositions. The frontend never needs to know whether directives came from a storyteller model, deterministic rules, human authors or a hand-built fixture. With no directive, the game is fully playable and uses its existing baseline appearance.

**Reject both extremes:** a small collection of named themes is too rigid; arbitrary model-authored CSS/DOM/React is unsafe, untestable and fragments the interaction grammar. We own an extensible *visual vocabulary*, not an unrestricted UI generator.

## Principles and non-negotiable boundaries

1. **Meaning is stable; expression can vary.** Published passage, eligible offers, statuses, actions, focus order and recovery remain the same with every presentation. Decoration may not create authority, imply a guaranteed outcome or rewrite prose.
2. **Fictional atmosphere is not system status.** Red on a threatening intention is expressive, not the error state; hover, focus, disabled, blocked, pending and receipt semantics remain independently legible. Never make color the only carrier of meaning. The token split is [Tokens](semantic-design-foundation.md#tokens-primitive-scales-and-semantic-roles-not-a-hardcoded-genre-palette). Saved V1 appearance is [the language below](#selected-presentation-language-v1). Model-authored direction stays conditional in [Three links](scene-direction-production.md#three-independently-verifiable-links).
3. **Presentation is a projection, never state truth.** Nest and validated read models own fiction/action authority. TanStack Query owns browser remote data. This feature adds no second server-state cache, clocks, operation controller or provider calls.
4. **World-neutral by construction.** No mandatory inventory, face, map, human geography, fixed art genre, pictures, animation, music, or always-on HUD. Silence and blank space are valid compositions.
5. **Reading is sacred.** Narrative stage remains a safe reading surface even over a bright, dark, complex or missing background. Text DOM, contrast, sensible measure, zoom and screen-reader semantics are not configurable by fiction.
6. **Extensibility through registries and bounded values.** New visual treatments are frontend capabilities with tests. Data selects capabilities and supplies normalized values, never CSS selectors, arbitrary properties, raw URL expressions or executable markup.
7. **No speculative component cemetery.** Build only semantic elements needed by actual consumers; reuse behavioral primitives, not indiscriminate card abstractions.

Exploration comps for stage, tokens, motion and accessibility are parked studies, not a second contract. The React/Next target is [topology](../platform/topology.md).

## Stable architecture and dynamic planes

For the original PX V1 work, the Living Situation Stage was the **composition authority**. The later selected [Living Book POC](living-book-poc.md) is authorized to replace its visual reading shell without changing V1's validated appearance language or game authority. Presentation modifies that shell's bounded appearance; it does not decide new page navigation, reorder verified passage content, invent offers, move settings into the fiction or turn a scene into chat bubbles.

Five conceptual layers, each with a distinct owner:

| Layer | Owns | Typical source | Must not own |
| --- | --- | --- | --- |
| **Platform foundation** | Baseline readable tokens, semantic markup, responsive design, control interaction/focus, system statuses | Frontend design system | Fictional style or game truth |
| **Story visual identity** | Optional persistent family resemblance, stylistic profile, motif/palette defaults | Future authorized story public data; fixture for now | Current action or scene outcome |
| **Scene atmosphere** | Transient background/lighting, stage treatment, illustrations and ambience | Future published-scene presentation; fixture for now | Current authorized choices or narrative text |
| **Element treatments** | Optional accents/surfaces/effects for explicitly matched passage/choice targets | Future scoped public data; fixture for now | Choice identity, eligibility, command body |
| **Safety and user preferences** | Contrast, reduced motion, forced colors, focus, no-image fallback, resource budgets | Frontend/runtime and browser preference | New fictional meaning |

The effective ordering is **foundation → optional story identity → optional scene override → optional exact-target treatment**, followed by *non-overridable* safety/interaction rules. Do not represent the last layer as optional input supplied by the storyteller. A story's chosen accent may vary; critical system focus and error states may not be erased.

This is a cascade of **semantic presentation roles**, not a cascade of arbitrary CSS text. Resolver output is a fully normalized view-model scoped to one current story/passage, and then mapped to CSS custom properties and explicit component variants.

### Preferred rendering topology

~~~text
Authorized StorySnapshot / PlayScene (unchanged truth owner)
     | 
     +-- current published passage + authorized offer identity
     |
     +-- optional normalized ScenePresentation input
                 |
         runtime schema + target identity checks
                 |
     resolve (platform + story + scene + exact-target)
                 |
       safe resolved token/treatment model
           |             |               |
    SceneAtmosphere   NarrativePassage  IntentionChoice
           |             |               |
           +--------- Living StoryFrame ----+
                           |
                   existing action callbacks
~~~

- **Current-source correction (2026-11-17):** the optional **public appearance read bridge exists**. `packages/story-interface/src/stories.ts` carries `current.appearance`; `packages/story-engine/src/stories/reads.ts` validates source identity on the saved public projection; `apps/web/src/features/play/model/live-presentation.ts` resolves a matching document and `PlayScene` passes it into `StoryFrame`. Missing/stale/corrupt appearance falls back to the normal readable book. **A complete Storyteller-authored/published art-direction producer, guaranteed historical appearance retention, and rich-text score are NOT established by that read bridge.** Earlier PX work originally had only fixture-based tests; do not confuse that historical baseline with today's source.
- A later bridge may pass only viewer-authorized, versioned presentation tied to a matching story/passage/offer identity. A transport/validation failure preserves last verified fiction and safe visible UI.
- Presentation resolution is pure and deterministic. It does not trigger effects, mutate the story, consume game time, or re-fetch assets on every render. SSR must render readable HTML before hydration.
- A scene switch may change atmosphere, but a Query refetch of the same committed scene must not reset effects, reanimate arrival or flash the default theme. A→B navigation must never show A's styling as B.

## Component architecture

**Use native semantic elements and scoped CSS.** Adopt an unstyled accessible primitive such as Radix for a genuinely complex dialog/menu/focus trap if a consumer warrants it; do not install a comprehensive styled catalogue, migrate to Tailwind or replace Query/RHF to enable this system. Reuse source-owned primitives where they prevent repeated a11y/interaction bugs.

| Component responsibility | Target role | Ownership guard |
| --- | --- | --- |
| `StoryFrame` | Compose story chrome, situation, narrative, current action area and secondary affordances | Not the presentation parser; not the command controller |
| `SceneAtmosphere` | Backdrop/lighting plane spanning an intentional story viewport, independent of the narrow prose measure | Never intercept pointer events or cover dialogs/focus |
| `NarrativePassage` | Immutable published headings/paragraphs plus optional anchored art slots | Cannot regenerate, change order or silently hide prose |
| `IntentionChoice` | Accessible button/description/eligibility/visual treatment for a verified option | Cannot infer offers or synthesize command payloads |
| `SceneMedia` | Trusted optional asset rendition, crop/focal point, fallback and loading behavior | Never be the sole source of a clue |
| `PresentationResolver` | Parse, normalize, layer, compute safe colors and select registry effects | No React/DOM, I/O or per-render randomness |
| Other feature-owned UI | Campaign activity, history, settings, recovery, created stories and developer tools | Keep feature semantics; consume shared tokens only where justified |

The current source contains two *real* option renderers: legacy `StoryFrame` intentions and nested campaign options in `ui/campaign-offer.tsx`. An expressive-options implementation must cover both, but **must not** unify incompatible command controllers or assume `node.id` is unique outside its offer/path. Shared view components may receive adapted option read models and callbacks; the command creation and freeze remain in their existing owners.

**CSS direction:** structured semantic custom properties scoped beneath the story presentation root, explicit variants/data attributes for treatments, and small feature styles. Untangle story-local styles from broad `apps/web/app/style.css` element rules only as needed without regressing public demo, creation, auth surfaces or Chamber. The atmosphere covers the intended viewport behind a readable stage; never mistake the existing 56rem `StoryFrame` column for the whole ambient canvas. Use a bounded z-index/layering scheme and non-interactive decorative planes.

**Design-system policy:** maintain a small inventory of actual foundational UI and semantic game pieces. No universal `GameCard` with dozens of flags. Typography roles, layout dimensions, focus semantics and system status are platform-level. Fictional accents and decorative gradients are stage/element-level. The renderer must be capable of more than recoloring the existing bordered card.

## Presentation lifecycle

- **Initial load / absent data:** present neutral baseline immediately; no asset or model dependency and no placeholder rectangle.
- **Same passage refreshed:** retain the resolved presentation, scroll and reading focus; do not replay entrance motion or remount the passage solely due to new object identity.
- **New verified passage:** accept matching new appearance and optionally transition via the event-aware motion channel; do not claim advancement before canonical publication.
- **Action admitted/ongoing/paused/uncertain:** preserve last verified narrative and atmosphere; truthful system status/controls take visual priority. Presentation neither settles time nor initiates a retry.
- **Offer replaced or stale:** drop old offer-target accents; action renderer consumes only current authorized options.
- **Story switched / viewer changed:** isolate by identity, cancel or ignore stale asset completion, do not leak prior story presentation.
- **User preference changes:** recompute safe presentation without mutating Query data or issuing game commands.

## Accessibility, security and performance rules

- Text contrast at least WCAG AA (4.5:1 normal, 3:1 large where applicable); non-text critical outlines/focus at least 3:1. Background imagery/gradient measurements alone are not proof. A reliable reading plate/scrim and computed foreground roles remain authoritative. Forced-colors and reduced-motion override decorative instructions.
- The parser accepts bounded structured colors, gradients, references and enum treatments. Whitelist formats and clamp numeric fields. Construct CSS from validated normalized values. Reject raw CSS, `url(...)`, external font declarations, SVG/HTML injection and arbitrary selectors. Unknown versions fall back as a whole; malformed optional fields fall back *locally* without hiding story content. Surface safe developer diagnostics, not story/player content logs.
- Effects should be opt-in and lightweight: CSS by default; a dedicated animation library only after demonstrating the need. No infinite flashing, typewriter blocking, layout jank, fake progress or model-call-driven visual mutations.
- Asset loading is best-effort, identity-bound and budgeted. Decorative backgrounds do not block interactivity; media failures never unmount action controls. Binding media limits are in [the V1 language](#selected-presentation-language-v1).
- No global theme effect may restyle a protected session/permission/recovery control into illegibility. The initial scope is the **player's Now/story stage**, not unrelated authenticated navigation, creation wizard, developer Chamber or public demo. Sharing abstractions with them is a later, separately justified choice.

## Source-grounded baseline (inspection 2026-11-13; revalidate before PX01)

The demonstrated tier for this language is [capability coverage](../../../STATUS.md#capability-coverage). The file list below is the 2026-11-13 inspection, not a second contract.

- `apps/web/src/features/play/ui/story-frame.tsx`: stage, prose, legacy intentions, additional stage content; passage entrance keyed to title.
- `apps/web/src/features/play/ui/story-frame.css`: partial `--sf-*` vars alongside literal backgrounds, borders and control colors; mixes composition, typography, action and motion.
- `apps/web/src/features/play/view.tsx`: TanStack snapshot, live updates and current verified passage; passes `CampaignPlay` as stage extras.
- `apps/web/src/features/play/ui/campaign-offer.tsx`: nested offer/path browsing, action dispatch, planning controls; actual campaign options.
- `apps/web/src/features/play/ui/campaign-activity.tsx`: action execution/commitment/paused semantics to preserve.
- `apps/web/app/style.css`: broad element globals and independent demo/creation/Chamber concerns.
- `apps/web/src/stories/story-frame.stories.tsx`: existing deterministic fixtures, suitable first workbench.
- `apps/web/src/features/play/README.md`: source-adjacent lifecycle map. The non-negotiable framework, SSR, Query, and mutation/a11y contract is [client architecture](architecture.md).

This source is *evidence of current implementation*, not visual-design authority. Reinspect when Cursor starts; do not assume a historical commit is still HEAD.

## Explicit deferrals and decision gates

- **Not now:** LLM prompts, image-generation providers or payment, backend data/schema changes, asset-storage/CDN architecture, persisted theme user preference, novel layout engine, arbitrary rich-text DSL, soundscape, 3D/canvas renderer, model-generated code, or new world/game rules.
- **Later engine integration:** decide who authors/validates/persists presentation, when it is published, how a versioned public projection references the exact passage/offer, and asset ownership/rights. The frontend capability registry/schema will be the input to that design, not an invitation to hallucinate unsupported instructions.
- **Later product evaluation:** support additional authored composition templates only when actual gameplay needs them. Preserve the meaning of navigation and choices even in cinematic modes.
- **Human acceptance:** visually distinct worlds are necessary but not sufficient. Judge readability, intentional composition, scene/action hierarchy, player comprehension and return-to-story continuity in rendered screenshots/keyboard use, not in Markdown alone.

**Proof of the architectural destination:** three clearly different environment fixtures and distinct legitimate options should be renderable by *the same component implementations* with *different validated input documents*, plus a zero-presentation fallback. No CSS/TSX edits to switch between those fixtures.

## Selected presentation language (V1)

**Selected design contract, 2026-11-13.** This is the normative vocabulary. It is not permission to alter `StorySnapshot`, Nest or any LLM schema. The initial renderer may be fixture-fed. Runtime validation is mandatory even when TypeScript appears to guarantee shapes.

**Two representations, never confused:**

- **Input document** (potentially untrusted): concise optional creative directions. Absent and invalid fields are normal.
- **Resolved presentation** (trusted pure output): complete, safe semantic tokens, asset placements and verified option treatments. Only this form becomes CSS properties and component variants.

Every renderer works from safe defaults. The input cannot set focus or disabled styles, control labels, DOM structure, z-index, user permissions, command payloads, layout order, system status colors, or arbitrary HTML/CSS.

`ScenePresentationV1` is `schemaVersion: 1` plus optional `storyStyle`, `scene` and `choices`. Story style may set a partial palette, typography `editorial | restrained | technical`, and texture `none | grain-soft | organic-soft | geometric-soft`. Scene direction may set palette, lighting `neutral | dim | diffuse | radiant`, vignette and texture intensity in `0..1`, stage `open | quiet-surface | translucent-surface`, media placements, and motion `still | drift-soft | shimmer-soft` with passage arrival `none | fade | rise-subtle`. A choice treatment names an exact target, optional surface `quiet | outline | filled | luminous`, accent, emphasis in `0..1`, and effect `none | glow-soft | pulse-soft`. Emphasis never changes eligibility.

Color input is opaque `#RRGGBB` only. No alpha, CSS functional strings, named colors, variables or shorthand. A gradient is a structured object with 2–4 increasing stops, not a CSS string. Do not interpolate an unparsed value into CSS. Do not turn the envelope into one giant JSX prop.

Authoritative scope comes from the verified fixture or from `StorySnapshot` / campaign read models. It is never inferred from presentation JSON. Scope carries story id, verified passage id, and the valid legacy option ids or campaign paths. Choice matching is exact on kind plus interaction or offer identity plus the full path. It is not a label, position, partial path, single `node.id` or array index. Duplicate treatments for one target are invalid for that target. A treatment for an old, hidden, ineligible or absent option is ignored. A presentational target cannot add an option.

Media uses an opaque `assetRef`, never a direct HTTP(S) URL from input. The pure resolver does not embed a map of cave, harbor or castle assets. An unknown, stale or unauthorized reference drops that placement only. Alt text comes from approved asset metadata or public narration, not from art-direction prose. Decorative media is aria-hidden. V1 budgets: at most one backdrop and two inline illustrations; at most one illustration per anchor. Extra media is ignored. Expanding the budget is a measured change.

Resolution is pure and independent of React:

1. Unknown `schemaVersion` yields the full safe default. A malformed optional scene field drops in isolation when possible.
2. Start from the player dark-field-journal baseline. The platform owns ink, focus, status, disabled and interactive affordances.
3. Apply optional story identity, then valid scene overrides.
4. Compute contrast on the composited reading surface. Imagery is not a contrast proof. User reduced-motion and forced-colors override decoration. Normal text aims for 4.5:1; large text and essential non-text controls aim for 3:1.
5. Bind choice treatments only to currently authorized targets.
6. Emit an immutable resolved model. No random colors, timestamps, asset fetches or command mutation.

Invalid vignette, one choice target, one media asset or one gradient falls back locally. Structural or version failure may reject the whole presentation. It must not hide the passage. Unknown effects resolve to `none`. Effects apply only to matched fictional choices, never to recovery, permission or technical controls. `danger` and `red` are not eligibility.

**Negative:** a luminous deceit choice and a red aggressive choice still submit their original commands, or no command when blocked. Blank or unknown-version input leaves the canonical story and original options. Two passages with the same title stay distinct by published passage id. A stale offer id cannot decorate a newly authorized choice, and an accent cannot submit a command. A microbe or bodiless scene may be an abstract field with no inventory and no photograph. Invalid input never changes a command id, path, body, retry or eligibility.
