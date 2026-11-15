# Presentation media and motion | atmospheric, optional, truthful

**Status: selected frontend design target, 2026-11-13; no provider or game code authorized.** Read [presentation runtime](presentation-runtime.md) for the layers, [V1 language](presentation-language.md) for bounded input, [motion grammar](motion.md) for existing UX/event principles, and [accessibility](accessibility-and-voice.md) for non-negotiable user controls.

## Art direction as optional accompaniment

The game is text-led but not required to remain text-only. Art can establish a world, intensify an emotional transition, or give a situated visual detail. A backdrop, inline drawing or abstract texture should feel selected for *this* story and moment. It must never become a required information channel, replace canonical prose, invent a location, expose a hidden clue or force all worlds into a conventional fantasy illustration style.

**One vivid scene with no art and one with art should be equally playable.** A story's visual identity can be persistent across scenes, while scene-specific media and lighting change independently. Different art genres are allowed because the renderer takes assets and placement, not a single mandated photographic/painterly aesthetic.

### Layering and interaction order

~~~text
Story viewport (may fill viewport even though prose is narrow)
  [0] platform base/background fallback
  [1] optional scene backdrop (image/gradient/texture; decorative, pointer-events none)
  [2] contrast scrim/lighting/vignette (decorative)
  [3] readable narrative stage + title/paragraphs
  [4] anchored optional inline figures within prose flow
  [5] fictional decision threshold and authorized action controls
  [6] protected system recovery/focus/dialog/navigation affordances
~~~

The exact CSS z-index numbers are implementation detail; **relative invariants are not**. Decorative layers cannot swallow clicks, become scroll targets, obscure sticky focus, cover error/recovery panels or extend outside the intended story presentation subtree. The normal scroll container must still work at 320–375px, high zoom and keyboard navigation.

The existing `StoryFrame` CSS `max-width` describes a *content measure*, not a full-viewport atmosphere. Decouple background ownership from prose width. Do not create a permanent full-screen wallpaper if the story has no appropriate assets.

### Media placement and semantic anchoring

Supported V1 slots (see [language](presentation-language.md#mediaplacement-v1)):
- **Backdrop:** at most one environmental artwork behind an opaque-enough reading surface. Cover/crop with a bounded focal point; never pin vital clues in the cropped edge.
- **Before passage:** at most one contextual establishing figure preceding narration, if it genuinely adds value.
- **After paragraph N:** insert in normal document order after a known *immutable current paragraph index*. The engine is not allowed to reorder text, generate new paragraph content or specify a free-form DOM insertion path.
- **After passage:** at most one closing/supporting figure before the decision threshold.

The V1 budget permits **up to two inline images total** per published scene and **at most one per anchor**; one backdrop separately. Invalid anchor index or excess placements are ignored safely, not shifted to a misleading paragraph. If future narrative structure becomes genuinely richer than paragraphs + figures, design a separate versioned block model; do not smuggle it into a CSS slot parameter.

The same public passage content must render in the exact same reading order with all images disabled. Inline illustrations use semantic figure/caption only when there is approved content for them. Decorative images are ignored by assistive technology. The user can always reach the decision area through ordinary reading/scroll.

### Asset boundary: references, not generated URLs

V1 accepts a **bounded opaque asset reference** resolved through a *trusted catalog supplied by its host*, not unvalidated HTTP(S), data URLs, remote image-host URLs, CSS `url()` strings or inline SVG. In Storybook that catalog contains local, license-safe or internally authored fixtures; production will eventually receive authorized public asset descriptors through its own integration. The generic presentation parser/resolver must not depend on any fixture catalog. Do not invoke an image-generation provider for implementation/tests.

### Generic renderer versus example content

**A named cave or harbor illustration is valid *fixture data*, not a generic rendering capability.** Current source has `presentation/assets.ts` exporting `FIXTURE_ASSETS` with specific `fixture:cave-wall` / `fixture:harbor-light` IDs, while the generic parser requires the `fixture:` prefix and the generic resolver imports `lookupFixtureAsset`. This is tolerated as a frontend-only prototype seam, but it must be removed **before** introducing any live engine/public presentation contract.

**Selected dependency direction:**

~~~text
Storybook / test scenario                  Later authenticated Play read-model
   (fiction + assets + refs)                   (approved asset descriptors)
             |                                           |
             v                                           v
      trusted fixture catalog                 trusted public asset catalog
             +-------------------+-----------------------+
                                 |
                                 v
                    generic asset resolver API
                    + validated presentation
                                 |
                                 v
                     SceneMedia / StoryFrame
~~~

The generic parser only validates bounded, opaque asset-reference syntax; it does **not** whitelist `fixture:` or know the sample categories. The pure presentation resolver receives a trusted catalog or resolver callback as an explicit dependency, rather than importing a module of named examples. The catalog provides approved rendition source, dimensions, accessibility description when applicable and appropriate scope/identity. A missing/unapproved reference returns no media. Trust does **not** come from the model naming an asset; it comes from the authenticated host's provided catalog.

Keep example SVGs, prose, characters, art prompts and world presets in **Storybook/test fixture ownership**, not in runtime `presentation/` code. Conventional `cave.svg` filenames in those fixtures are fine. Prefer Storybook-only static asset serving rather than shipping non-production examples from Next `public/` if feasible without adding needless machinery; document any remaining trade-off. No production imports may reference a particular fixture name or shipping path.

This is not a reason to build a general asset-service framework today. A tiny typed injected catalog or callback is sufficient for the current frontend. The backend generation/storage/permissions design remains separate.

Future backend integration owns provider choice, generation, licensing, safety, storage, authorization, lifecycle, CDN/image renditions, costs, cache-control and public URL mapping. A validated public representation can offer `assetRef` plus stable approved asset metadata (dimensions, renditions, focal point, safe alternate description/caption when supplemental). The client maps this to a trusted image loader with an allowlist and existing Next/browser image policy. **Frontend never calls the image model.**

A model's suggested art prompt or caption is not automatically canonical story truth. Accessible text for an informative illustration must be compatible with player-visible established information and approved as part of the public asset/narrative projection. For purely atmospheric art, use empty alt. If art and passage disagree, the passage wins.

### Asset lifecycle and failure matrix

| Situation | Required behavior |
| --- | --- |
| No asset reference | No placeholder box; stable text-led composition |
| Slow media | Prose and authorized options render immediately; reserve proportion only where an actual inline figure is declared to avoid disruptive shifts |
| Missing/blocked/broken asset | Remove failed decorative layer or render restrained non-information fallback, no blocking error over fiction |
| Image completes after passage changes | Discard stale result / do not paint it into new scene |
| User switches story A → B | Remove A's art, palette and pending loaders from B; scope by story/passage identity |
| Narrow viewport / zoom | Maintain legible text, reasonable crop/focal point, no horizontal scroll or forced huge image |
| High contrast / reduced motion | Keep media optional, drop overlays/transitions that obstruct readability |
| Same image referenced in next passage | Asset cache may reuse bytes without replaying a fake 'new scene' event |
| Media unavailable offline | Last verified narrative and controls remain functional |

Avoid global image loading spinners, image-only clues, flickering background replacement and use of arbitrary media URLs from untrusted data. Scene introduction must not wait for an illustration.

## Motion has two different authorities

**Ambient presentation motion**: a faint environmental drift, glimmer or texture movement. Controlled by the scene's *visual* directive and user/browser preference, using approved registry effects. It signifies atmosphere, **not fictional time advancement**, not mechanical progress and not provider activity. Default = still; motion can be totally absent and the scene remains expressive.

**Event/interaction motion**: an entrance or state transition applied to *already-known* canonical events (new published passage identity, action admitted, actual interruption, verified saved roll). The directive may choose a style (e.g. `fade` or `rise-subtle`), but cannot cause the event, award an outcome, mark an action successful, choose dice, or submit a retry.

A hover/glow on an intention is treatment feedback, never a new game action. A `pulse-soft` effect must be restrained, low intensity, and cannot imply a real deadline where none exists. Motion/effects are only for fictional choice affordances and atmospheric planes, never technical retry or authentication controls.

### Event identity and lifecycle

- Passages are distinguished by **verified published passage ID**, not title, paragraph count or React mount.
- New scene transitions are triggered only on an eligible authoritative scene change, never a duplicated SSE hint/GET, hydration or observer remount. For initial SSR/hydration the readable final state should be present immediately; avoid replaying a theatrical entrance by default.
- Preserve reading position, form drafts, focus and last verified passage when a refresh or status update happens; do not auto-scroll a reader to the top upon background update.
- If an activity pauses/interrupts, visual cues that imply *work in progress* stop; ambient effects may also be suppressed by product preference. A pending clock reaching zero does not authorize a victory animation.
- Do not run animations that dispatch commands or alter story truth when they finish. No model calls and no automatic game-state change from animation hooks.
- User/browsers with `prefers-reduced-motion: reduce` receive static/near-static alternatives. In `forced-colors`, prioritize legibility over artwork/effects. Any later in-app 'reduced effects' preference only further reduces motion; it cannot weaken OS preference.

**CSS-first:** short transitions and bounded gradient/opacity/transform effects. Motion for React is conditional on an actual coordinated scene choreography needing it and documented performance evidence; no heavy runtime simply because 'dynamic UI' sounds cinematic. No required Rive, shader, canvas, 3D, autoplay video or sound in this program.

## Resource budgets and performance gates

V1 conservative budget: one background asset and two anchored inline figures per scene; backdrop at most four gradient stops; one ambient effect layer; a few directly treated options. Avoid stacking multiple full-viewport blurred filters and continuously animating expensive properties. Prefer composited opacity/transform where useful, but do not sacrifice accessibility or energy budget for a benchmark.

Before widening scope, verify real mobile rendering: stable dimensions, LCP/content visibility, scroll responsiveness, no costly repeated asset decode on refetch, no long main-thread tasks from effect handling, and no excessive background updates. No fixed numeric FPS claim is justified without device measurements.

## Verification with *no engine integration*

Every PX Change that touches media/motion adds deterministic Storybook/RTL coverage of its own edge cases. The final workbench must include at least:
1. baseline no-art/no-motion scene with complete prose and decision;
2. dark illustrated cave, safe narration layer and two differently treated options;
3. bright/quiet domestic or harbor scene with a different visual profile;
4. abstract nonhuman story with no mandatory humanoid visuals;
5. art absent/slow/broken, illegal ref, invalid paragraph anchor;
6. new passage vs same-passage refetch, duplicate event, stale asset completion;
7. paused/uncertain control state with no false progress/success flourish;
8. reduced-motion, forced/high contrast, 375px and high-zoom inspection.

Storybook examples must visibly say **mocked presentation**. They are proof of frontend rendering only, never evidence that a Storyteller generated art, the backend persisted it or an image provider is available.
