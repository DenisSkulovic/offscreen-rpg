# PX07 | Real presentation pipeline and scenario-specific Storybook laboratory

**State: Done (2026-11-13).** **Approval:** Owner asked to implement the calibration review. Cursor landed Storybook controls that edit the input document, plus separate harbor and cave scenes. The cave story no longer appends resolved choices by hand.

## Cursor first-screen brief

> **Goal:** Storybook is a trustworthy *interactive design laboratory*: changing actual V1 input fields drives parser → resolver → real component display; full legacy/campaign option treatments are matched using their genuine current identity. It can prove a variety of scenes without post-resolver decorations, with coherent example fiction and browser/a11y evidence.
>
> **Authority:** [laboratory truth](../../experience/presentation-calibration-program.md#laboratory-truth), [exact-choice matching](../../experience/system/presentation-language.md#required-scope-context), [PX04 original workbench intent](../2026-11-13--px-presentation-lab/CHANGE.md), [choice-surface semantics](../../experience/patterns/choice-surface-decision-rules.md).
>
> **Source start:** `apps/web/src/stories/presentation.stories.tsx`, `presentation/fixtures.ts`, `presentation/resolve.ts`, `ui/story-frame.tsx`, `ui/campaign-offer.tsx`, current Storybook decorators/MSW/test setup and source-adjacent Play map.
>
> **Exclude:** production theme-editing UI, LLM, generated art, new backend field, new gameplay options, refactoring Play transport/Query/commands, replacing Chamber, costly new testing infrastructure.

## The fundamental flaw to close

At the reviewed main baseline, `presentation.stories.tsx` resolves `cavePresentation` with campaign-scoped choices but renders **legacy** `StoryFrame` options, then appends two handcrafted `ResolvedChoice` objects targeting synthetic legacy options. This is not an acceptable primary proof of the presentation pipeline. After PX07, a main lab fixture must **never mutate a resolved presentation** to generate an outcome the source document did not authorize.

The Storybook preset select remains a useful gallery, but add *real* controls for V1 fields, each feeding raw fixture input through the normal parser and resolver. Do not simulate changes by hand-setting CSS variables on the showcase component.

## Intended code delta

1. Replace the Cave special case with properly matched fixtures for **two independently real render paths**: (a) a legacy authored interaction with current interactionId and exact option IDs, and (b) a campaign nested-path offer with current offerId/path and actual `CampaignOfferPanel` semantics. Use appropriate state/command mocks to verify browsing vs commit, stale offer, disabled and frozen-command identity. Do not invent fake actions for real Play.
2. Fix fixture `paragraphCount` to match actual content. Give each environment its own small, coherent **fictional scene**: Harbor wet landing and repair choices; Cave a relevant underground observation and actual matching options; Sterile clean-room/laboratory choices; Abstract a nonhuman/nonlocal scene with no invented humanoid state; quiet domestic scene for subdued presentation. Keep mixed-script/long paragraphs and zero-choice negative variants.
3. Expose Storybook **controls that modify input documents**: palette/gradient/lighting, stage, typography, texture/vignette, per-choice treatment, media variant/reference, motion (only supported fields from PX06). Regenerate a parsed/resolved value on every control change; preserve valid current scope. Add explicit bad inputs to demonstrate fallback diagnostics, not an unrelated hand-coded error card.
4. Include distinct provider-free states: missing/late art, malformed/unknown version, wrong/old choice target, long prose, same title new passage, duplicate refresh, paused/uncertain system state. The design lab should be a reusable research tool for future game atmosphere, not an attractive static page.
5. Verify *real outcomes*, not only screenshots: accessible button title/support, keyboard focus, actual browse/commit callback parity, true disabled behavior, no extra command on rerender, contrast, zoom, reduced motion, crop/fit, overflow and identity isolation.
6. Use existing Storybook a11y panel to identify concrete violations and resolve them; add browser snapshots/Playwright computed-surface checks where the established tooling allows. Avoid a parallel test framework.

## Acceptance / negative proof

**Normal:** change light → dark → abstract, adjust choice accent/surface, choose a compact vs wide fixture image, toggle reduced-motion scenario, and observe genuine renderer differences in the same components. The exact legacy and campaign path are respected. The main Cave fixture requires **zero hand-appended resolved choices**.

**Negative:** author invalid CSS/gradient/direct image URL, old offer path, wrong optionId, unsupported media/effect, and verify the resolver rejects/falls back while real buttons preserve semantics. A mocked check cannot claim live backend validity. Tests catch a control that is merely visible in Storybook but disconnected from parser/resolver. Short/long scene and no-image variants remain accessible.

**Proof:** `pnpm --filter @offscreen/web test:fast`; actual running Storybook inspect/edit controls; screenshots at 1440/768/375 and 200/400% zoom; keyboard/focus/axe audit with recorded violation details; browser rendered contrast/scroll metrics; command parity test output. Note separately what wasn't run.

## Exit criteria and engine gate

Show side-by-side coherent Harbor/Cave/Sterile/Abstract/quiet-room examples plus a capability manifest documenting accepted data and actual visual behavior. A human can read the relevant prose, see the action threshold, identify consequences, and understand if this is fiction vs recovery.

**This is still not engine integration.** After this passes visual and behavioral review, the designer may start a separate engine/public-projection initiative defining generated scene art direction, published identity/version, asset pipeline, latency/billing and compatibility, with current browser capabilities as hard inputs.

**Executor handoff:** implement only when owner explicitly selects Ready; return source/tests and actual browser evidence. Do not modify the current Change declaration just by reading this Proposed packet.
