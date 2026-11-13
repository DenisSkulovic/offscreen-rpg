# PX05 | Multi-surface contrast and responsive atmosphere bounds

**State: Proposed (2026-11-13). No code permission.** Dependency: PX01–PX04 implemented; reread HEAD before execution. Parent: [calibration program](../../experience/presentation-calibration-program.md). Evidence: [post-PX review](../../experience/evidence/presentation-post-px-review-2026-11-13.md). Next: PX06.

## Cursor first-screen brief

> **Goal:** every valid presentation (light, dark, gradient, accented) yields readable **chrome + narrative + default/treated choices + system status**, while the atmosphere fills its intended viewport and decorative effects cannot produce horizontal scrolling.
>
> **Read:** [design correction](../../experience/presentation-calibration-program.md#surface-local-semantic-tokens-not-global-text-contrast), [contrast evidence](../../experience/evidence/presentation-post-px-review-2026-11-13.md#p0-css-contrast-is-calculated-for-the-wrong-surface), [Living Stage](../../experience/spaces/living-stage-blueprint.md), [accessibility](../../experience/system/accessibility-and-voice.md), [Play owner map](../../../apps/web/src/features/play/README.md).
>
> **Start at:** `presentation/resolve.ts`, `presentation/contrast.ts`, `ui/story-frame.tsx`, `ui/story-frame.css`, `ui/intention-choice.tsx`; then existing fixtures/targeted tests. No engine, data or command rewrite.
>
> **Do not:** invent special CSS per fixture named Harbor/Sterile, migrate UI frameworks, call providers, or hide overflow by clipping story content.

## One bounded implementation outcome

Replace the single-stage-dependent root text palette with a **small role-based resolved appearance for each actual surface**. The renderer owns safe readable colors for exposed story chrome, narrative stage, default choice, treated choice, support text, hover/focus/disabled and protected system status. Artistic palette inputs continue to specify atmosphere/accent/surface tint, not arbitrary DOM style/foreground/system-control rules. Respect WCAG 2.2 AA where applicable, including actual compositing/scrim effects.

Concurrently, correct the **story viewport container semantics** so the thematic atmosphere fills the available screen minimum, grows with content, and transformed atmospheric planes cannot widen scrollable space. These two changes belong in one Change because they together guarantee the *actual screen* receives a coherent visual context and accessible controls.

## Intended code/test delta

1. Introduce an explicit resolved semantic palette grouped by **ambient/chrome**, **narrative**, **options**, **system/focus**. Preserve current default when no presentation. Choose foreground/metadata colors against the actual component background/scrim, not the stage tint for everything. If image backdrop varies, derive a reliable chrome surface/scrim or protected text treatment, not image-average contrast.
2. Apply corresponding CSS custom properties only within scoped `.story-viewport` and semantic descendant components. Header/Now/Details/Notices/links + default/treated option title **and support text** must all remain safe. Variant-specific hover, disabled and focus still distinguish behavior without relying only on color. `IntentionChoice` should use safe treatment-specific support colors instead of blindly inheriting `--sf-ink-muted`.
3. Keep existing proven data and commands intact. No changes in offer IDs, path selection, frozen mutation/Query, auth or readability semantics. No new global theme state.
4. Set correct viewport-minimum and content-growth behavior for story canvas; background/gradient fill available visible space in Storybook and in real responsive page. Isolate/clip *decorative* overpaint only, including drift scale, while allowing legitimate page scrolling, focus rings and responsive content. Remove horizontal-scroll causes rather than masking content overflow.
5. Add fixed tests for surface/foreground pair calculations (not just `readableInk(stage)`), default option with no explicit treatment, support text, true light/dark gradient, and semantic status/focus overrides.
6. Add real browser inspection using existing Storybook/Playwright/axe: computed styles/contrast and canvas/scrollWidth. Capture 1440, 375, 320 and high-zoom variants (scroll width measured on actual preview). Verify `prefers-reduced-motion` and `forced-colors`.

## Acceptance and negative proof

**Normal:** Harbor nav and fixture text visibly readable above pale background; Sterile default option titles/support readable on safe button surfaces; Cave remains readable and has no horizontal scrollbar while ambient drift is enabled; themes fill the story canvas to viewport bottom and expand naturally with long prose. Default dark field journal remains visibly comparable.

**Negative:** arbitrary valid light/dark accent+gradient combinations cannot produce dark-on-dark default option or light-on-light chrome; a broken image or missing presentation cannot collapse the reading plate; reduced-motion/high-contrast preserves navigation focus; narrow viewport and 400%-zoom have no sideways scroll from decorative planes. No disabled option becomes active and no system warning becomes decorative fiction.

**Evidence:** targeted pure + RTL suites; `pnpm --filter @offscreen/web test:fast`; screenshots and actual contrast/scroll measurements in browser (not just unit assertions). Check Storybook a11y violations and report the actual ones resolved or outstanding. Don't assert axe 0 without running it.

## Exit and next

Return diff, test output, a before/after for Harbor/Sterile/Cave, actual measured contrast where relevant, horizontal-scroll proof, and unresolved cases. Human design reviewer accepts/adjusts before PX06. **No backend/public contract work.**
