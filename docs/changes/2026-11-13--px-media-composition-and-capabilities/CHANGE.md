# PX06 | Rendered capability honesty and bounded media composition

**State: Proposed (2026-11-13). No code permission.** Depends on accepted PX05. Parent: [calibration program](../../experience/presentation-calibration-program.md); evidence: [post-PX review](../../experience/evidence/presentation-post-px-review-2026-11-13.md). Next: PX07.

## Cursor first-screen brief

> **Goal:** an accepted V1 presentation field has an intentional, bounded visual effect (or an explicit rejection/deprecation) and optional media uses a **deliberate scale/crop/composition**, not an unbounded full-width figure by accident.
>
> **Authority:** [capability honesty](../../experience/presentation-calibration-program.md#capability-honesty); [media design](../../experience/system/presentation-media-and-motion.md); [V1 language](../../experience/system/presentation-language.md), [living stage](../../experience/spaces/living-stage-blueprint.md).
>
> **Source start:** `presentation/types.ts`, `parse.ts`, `resolve.ts`, `assets.ts`, `ui/scene-media.tsx`, `ui/narrative-passage.tsx`, `ui/story-frame.css`. Inspect the fixture SVG sizes and existing tests, not the entire repo.
>
> **Out of scope:** LLM/image provider, persistent asset storage, new narrative block DSL, arbitrary CSS layout control, animation framework/3D/canvas, generic UX redesign.

## Coherent implementation outcome

**The V1 vocabulary must be honest to a future consumer.** A documented, accepted, nonneutral field must result in a safe visible treatment in actual renderer code; otherwise it should be removed from accepted capabilities and emit a diagnostic. Do not silently advertise "texture", "vignette" or "emphasis" while ignoring them.

At the same time, image placement needs a bounded **visual treatment** to express a small atmospheric insert versus a wide scene illustration. Placement answers *where*; composition answers *how much space it occupies and how it fits*. Those are two parts of the same goal: a valid presentation document produces a deliberately controlled composition rather than arbitrary raw asset dimensions.

## Target decisions for existing fields

| V1 field | Selected behavior (or honest exclusion) |
| --- | --- |
| `typography` | Apply one of approved *display/presentation profiles* to relevant title/labels; narrative body retains accessible multilingual coverage, measure and legibility. Different values should be visually distinguishable without fonts downloaded at runtime. |
| `texture` and `textureIntensity` | Optional subtle approved static/lightweight background effect only; implement variants within bounded intensity or explicitly remove unsupported textures. No whole-screen expensive looping texture. |
| `vignette` | Apply bounded atmospheric edge shading only behind/protecting readable content; don't darken or hide narrative/options. |
| `lighting` | Make neutral, dim, diffuse and radiant actually produce controlled distinct treatments where appropriate; do not falsely portray progress or success. |
| `emphasis` | Affect only bounded visual strength (edge/glow/prominence) of an **already authorized** choice. Must not change click target, eligibility, command or label. |
| `crop` / `focalPoint` | `contain` and `cover` behave as named within a bounded media frame, including mobile. Focal point has observable role when cropping. |
| `stage='open'` | Must correspond to meaningfully open reading composition or be renamed to a truthful option. A hidden border around a still-opaque rectangle alone is not enough if `open` promises visual openness. |

Keep default/neutral field behavior quiet; effects must not be exaggerated merely to look different in a screenshot. New expressive effects require tests for content visibility, performance and user motion preferences. Don't install new libs without concrete need.

## Mandatory source boundary: fixture content must not be a runtime dependency

**Observed baseline:** `apps/web/src/features/play/presentation/assets.ts` contains `FIXTURE_ASSETS` keyed to `fixture:cave-wall`, `fixture:harbor-light` and `fixture:abstract-field`; `parse.ts` requires a `fixture:` assetRef; `resolve.ts` imports `lookupFixtureAsset`. This is a prototype leak of authored *example content* into generic presentation code. PX06 owns this correction, not an extra new initiative.

**Implement:** replace runtime import of named fixtures with a **small injected trusted asset catalog or pure resolver callback** (approved rendition URL/path, dimensions, optional public description, identity scope as relevant). Generic parser accepts a bounded opaque `assetRef` token without interpreting place/category names; arbitrary raw URLs/CSS remain forbidden, and unresolved/unapproved refs fail locally. The Storybook/test scenario owns its example catalog and named `cave.svg`/`harbor.svg` files. Prefer test-only static serving rather than production `public/` copies if simple with existing Storybook config; don't introduce a new asset system to accomplish this.

**Negative proof:** generic `presentation/parse.ts` and `resolve.ts` contain no dependency on `fixture:`, `FIXTURE_ASSETS`, named cave/harbor resources or Storybook assets. Inject two arbitrary unrelated catalog IDs to prove the same renderer works. An unknown/unauthorized ID cannot be displayed or break text/actions. Retain no-image behavior; existing fixture stories still work. This is **not** backend/model/image-provider integration.

## Media size/layout contract

- Keep trusted `assetRef`, at most one decorative backdrop and two optional inline figures, and verified paragraph anchors. No backend generator or direct URLs.
- Define a **small approved media-size vocabulary** for inline placements, such as `inset` (compact supporting detail) and `wide` (scene-setting figure), with bounded max-block-size, width, intrinsic ratio behavior and responsive normal-flow fallback. Exact design tokens follow rendered inspection; don't introduce arbitrary pixel coordinates from data.
- Decorative media must not push the actual decision unnecessarily far from its scene, especially short 1–3 paragraph cases. Preserve long-form scroll when truly warranted.
- A full-bleed environmental backdrop is separate from a full-width narrative figure. Do not reuse the same simplistic geometric image both ways to imply a cinematic cave.
- Missing/late image leaves readable prose and actions with no permanent empty poster area. Supplemental alt/description must remain approved/visible; decorative assets have no new fictional facts.
- Keep figures in stable reading order. Correct actual image `object-fit`/crop, clipping and overflow. Avoid unduly large images or big blank boxes on narrow screens.

If a new optional media sizing field is genuinely necessary, make a **frontend-only additive V1 grammar decision** and update the canonical [language](../../experience/system/presentation-language.md) and [media](../../experience/system/presentation-media-and-motion.md) specs in this Change. No shared `@offscreen/contracts` field yet. V1 is not a deployed backend wire commitment.

## Tests and discriminating cases

**Normal:** cave fixture shows bounded illustration between paragraphs without overwhelming its decision; abstract fixture can show small geometric motif or larger deliberate illustration, independent of background. Same UI and input vocabulary produce visually varied yet coherent scenes.

**Negative:** a malformed/unapproved media size/crop value cannot generate arbitrary CSS/overflow; missing image does not leave a huge blank frame; long prose with two media anchors preserves paragraph order, figure alt and keyboard action access; 320px zoom doesn't overflow. Unknown effect/typography/texture is rejected/diagnosed; every nonneutral accepted capability has a renderer test, so silent no-ops are caught.

**Proof:** build an explicit **capability table** from parser → resolved output → actual DOM/CSS effect → negative fallback, backed by targeted Vitest/RTL and rendered Storybook/browser examples. Run `pnpm --filter @offscreen/web test:fast`, check reduced motion/forced colors and actual image footprint at 1440px/375px. Confirm no ongoing animation redraw causes nuisance/jank.

## Exit

Return code diff, manifest of implemented/deprecated V1 fields, media before/after screenshots, responsive/contrast measurements, and proofs for unsafe/broken assets and no-op prevention. Only after human review of actual compositions should PX07 be selected. No new engine/LLM integration.
