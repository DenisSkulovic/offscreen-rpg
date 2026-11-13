# PX03 | Trusted scene art, narrative slots and truthful presentation motion

**State: Proposed (2026-11-13).** **Implementation permission: none.** Depends on PX01 + PX02 reviewed; recheck actual source before Ready. Parent: [presentation program](../../experience/presentation-implementation-program.md). Next: [PX04 workbench](../2026-11-13--px-presentation-lab/CHANGE.md).

## Cursor first-screen brief

> **Outcome:** one current, verified passage can carry optional fixture-backed environmental background and up to two anchored illustrations, plus bounded atmospheric/entrance motion, while prose/actions remain fully usable without any art or motion.
>
> **Authority:** [media layering and placement](../../experience/system/presentation-media-and-motion.md#layering-and-interaction-order), [asset trust/lifecycle](../../experience/system/presentation-media-and-motion.md#asset-boundary-references-not-generated-urls), [motion identity](../../experience/system/presentation-media-and-motion.md#event-identity-and-lifecycle), [V1 media contract](../../experience/system/presentation-language.md#mediaplacement-v1).
>
> **Source entry:** [Play owner map](../../../apps/web/src/features/play/README.md); `ui/story-frame.tsx`/scoped CSS; PX02's `NarrativePassage` and `IntentionChoice`; `view.tsx` for current passage identity; existing Storybook and media facilities. Check `app/style.css` only for actual layer collisions.
>
> **Exclude:** image generator/provider calls, Nest DTOs, published art storage, sound/video, canvas/3D, free-form markup, global animation framework rewrite.

## Architectural choices

- **Assets:** V1 fixture asset references resolve via a narrow, trusted local registry/resolver. Do not pass presentation-supplied HTTP(S), data URL, CSS URL or inline SVG into the rendered DOM/CSS. The future backend asset/CDN policy is a separate Change.
- **Background:** at most one scene artwork, occupying an ambient story plane outside the prose max-width, with a contrast-protecting narrative surface. No pointer interception. It may be missing entirely.
- **Anchored art:** up to two inline illustrations at permitted `before-passage`, `after-paragraph(index)`, or `after-passage` anchors. Immutable text order and paragraph IDs remain unchanged. Wrong index or excess assets drop safely.
- **Access:** decorative images are ignored by assistive technology; supplemental ones require approved public asset description, not newly invented model-lore captions. Never rely on artwork for a unique clue.
- **Motion:** ambient registry (still/drift-soft/shimmer-soft) is *not* game time; verified-event entrance is separate. New passage ID can trigger a short arrival effect; duplicate GET/SSE, hydration, remount or same title must not replay it. Paused/held work cannot look like completed progress.

## Intended code delta

1. Implement `MediaPlacement` V1 parsing, approved local fixture `assetRef` mapping, placement budgeting and safe validation. Keep no-art as the normal path. No external host config changes until justified.
2. Add a `SceneMedia` presentation component and anchored figure rendering to PX02's passage component. Use robust aspect ratio/dimension handling where assets exist to avoid layout shifts; never delay text on load.
3. Add optional background image rendering behind the scene/reading plate and safe crop/focal-point treatment. Verify background CSS remains scoped to story and survives viewport/zoom without breaking focus or clicking. Integrate carefully with PX01's gradients and opacity.
4. Add a bounded effect registry and minimal CSS-based ambient/arrival motion. Respect reduced-motion/forced-colors; avoid flashing, expensive whole-screen blur loops or infinite full-UI animation. Use Motion for React only if a concrete tested composition cannot be achieved cleanly in CSS, with a separately explained dependency/bundle impact.
5. Tie event motion to **published passage ID** and real transition eligibility. Initial SSR/hydration should be readable without an entrance sequence; new published passage may animate, stale refresh may not. Do not use the passage title as identity.
6. Add deterministic media error/slow/stale fixtures, same-passage refresh and new-passage tests, and a wide/narrow Storybook proof. Remove unintended loading/failure effects from active controls.

## Acceptance and discriminating negative cases

**Normal:** cave fixture shows a safe backdrop and one correctly anchored figure; harbor and nonhuman fixtures show their own presentation with no component rewrites; all original prose/options remain present and actionable. A newly verified passage can receive a short optional entrance; no-art is visually intentional.

**Negative:** invalid/unapproved URL/ref and out-of-range anchor cause only the media placement to disappear; a slow image never blocks choice; stale asset completion after story/passage switch cannot paint old art into a new scene; reduced motion removes ambient and event movement while preserving textual information. Same-title different passage IDs are distinguished; duplicate SSE/refetch does not replay arrival. A pause/uncertain operation receives no implied completion flourish.

**Proof:** pure media reference/anchor budget tests; RTL/Storybook slow/failure fixture states and passage identity events; `pnpm --filter @offscreen/web test:fast`; desktop/375px/320px/high zoom keyboard reading check, reduced-motion/forced-colors screenshots, a real-browser image failure test. Do not claim asset-pipeline or actual paid-generation proof.

## Permission / risks / exclusions

No backend/schema migration, generated imagery, provider calls, external art-license spending or storage. Use permitted local image fixtures with recorded provenance; an internal SVG/CSS placeholder may be used for tests, but do not fake a missing production asset as meaningful in-world illustration. No new global animation dependency by habit. Do not change action dispatch, Query state, pause/resume or game clock behavior.

**Executor handoff:** present default/no-art vs illustrated/missing/stale states, explicit event identity evidence, accessibility screenshots, checked bundle/render impact and remaining unsupported treatments. Designer must critique the resulting balance between visual expressiveness and narrative readability before PX04.
