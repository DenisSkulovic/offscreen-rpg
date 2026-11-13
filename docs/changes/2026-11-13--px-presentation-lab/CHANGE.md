# PX04 | Scene presentation workbench and integrated regression evidence

**State: Done (2026-11-13).** **Approval:** Owner asked to implement the presentation design. Cursor landed the `Experience/Presentation` Storybook laboratory on the real resolver and `StoryFrame`. Parent: [presentation program](../../experience/presentation-implementation-program.md). This is a **code-bearing test/tooling Change**, not a documentation-only evaluation.

## Cursor first-screen brief

> **Outcome:** a provider-free interactive Storybook laboratory exercises the *real frontend presentation schema and renderer* against divergent environments, option treatments, malformed data, scene changes and accessibility preferences; automated regressions protect behaviors. The entire seam can be reviewed without a game-engine integration.
>
> **Authority:** [end-state proof](../../experience/system/presentation-runtime.md#explicit-deferrals-and-decision-gates), [input/validation](../../experience/system/presentation-language.md), [media/motion acceptance](../../experience/system/presentation-media-and-motion.md#verification-with-no-engine-integration), [program fixture matrix](../../experience/presentation-implementation-program.md#adversarial-fixture-matrix-incremental-complete-at-px04).
>
> **Source entry:** `apps/web/src/stories/story-frame.stories.tsx`, existing Storybook MSW/Query decorators, PX01–PX03 presentation fixtures/components and current Play owner map. Read [web toolchain](../../../apps/web/README.md) for the cheap command.
>
> **Exclude:** new game or Storyteller integration, image providers, developer Chamber redesign, public `/demo` rewrite, new production theme settings route, separate design-system framework.

## Why this Change is necessary

PX01–PX03 each require focused tests, but their combined behavior is what matters: cave and harbor must share exact component code, dynamically applied treatments must not change intent, and art/motion must not break reading on real screens. A few static screenshots cannot prove these combinations. Build a small **working fixture-driven renderer playground** inside Storybook, plus focused automated checks, instead of leaving a permanent public-debug route or asking Cursor to manually edit JSX to switch themes.

This Change modifies executable Storybook code, fixture validation and tests; a final human design review is a separate *evaluation*, not a fake Change.

## Intended code delta

1. Create a Storybook `Experience/Presentation` entry that uses the actual validated `ScenePresentationV1` parser/resolver + actual `StoryFrame`/`NarrativePassage`/`IntentionChoice` components, not hand-painted stand-in markup. Fixtures must be visibly labelled *mocked presentation*, not live LLM or server art direction.
2. Add controls for selected V1 fields (palette, structured backdrop, lighting, stage treatment, typography variant, choice treatment/effect, media reference/slots and motion). Controls update the same schema the runtime receives; invalid values must resolve safely. The fixture identity and authorized options are separate, not editable to bypass command authority.
3. Include named preset fixture families: unchanged baseline field journal, cold harbor, oppressive dark cave, bright sterile setting, intimate quiet room, nonhuman abstract world. Include long mixed-script content, no-offer state, legacy choice, campaign browse/commit/staged path and a real system hold.
4. Include negative stories: malformed gradient/type, unknown version/effect, old offer/path, missing/wrong asset, slow/failed media, two published passages sharing a title, same-passage refetch, stale image completion, forced/high contrast, reduced motion, narrow 320/375px and long text at 400% zoom.
5. Add an executable, deterministic cross-fixture regression harness (Vitest/RTL and existing Storybook testing where useful) that asserts: text/offer/command identity preserved across appearances; non-offer system controls maintain correct states; failures degrade locally; A→B and duplicate GET transitions don't leak or replay.
6. Use existing axe/Playwright/browser infrastructure for targeted focus and visual evidence without creating a second framework. Capture representative 1440px, 768px, 375px (plus zoom) variants, document actual inspections/results in the normal Change receipt. Keep fixture assets small/licensed.

## Acceptance and negative proof

**Normal:** a user can switch between three visibly different visual worlds in Storybook by selecting different valid presentation data without changing any source/component implementation. Two options can have distinct treatments, and a local fixture can add/remove illustration; all controls/paragraphs remain legible and still do the same thing.

**Negative:** attempting to use unapproved color format, CSS, malformed gradient, unknown asset, wrong offer path or unexpected schema version cannot crash the whole scene or alter any command. Screenshot aesthetics do not excuse accessibility failures; options remain keyboard reachable at 375px/high zoom and in forced-colors/reduced-motion. No live provider, backend or generated art is implied by mocked fixtures.

**Proof:** `pnpm --filter @offscreen/web test:fast` plus targeted Storybook check/build as warranted; browser/axe keyboard checks, screenshot set with explicit labeled fixtures and contrast assessment; ensure no production route/inference changes. Do not re-run a full CI infrastructure suite for every fixture edit; report checks actually run.

## Exit criteria and human review boundary

Report a concise matrix of implemented V1 capabilities vs deferred/unsupported effects, actual command parity proofs, accessibility/performance observations, screenshots and any design weaknesses (e.g. scenes still feeling like identical cards with new colors). A human critic should assess whether the shared UI truly becomes expressive rather than merely tinted.

**Do not** mark engine-ready in the sense of *live end-to-end generation*. This Change proves the frontend renderer and controlled inputs only. A later public-contract/engine initiative is required before an LLM can supply presentation at runtime.

**Executor handoff:** only after explicit owner authorization and PX03 review, implement the laboratory using actual sources; return evidence, unresolved design questions and a recommended frontend capability manifest for the separate engine-design stage. No automatically scheduled next work.
