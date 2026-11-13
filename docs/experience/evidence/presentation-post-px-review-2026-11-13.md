# Presentation runtime after PX01–PX04 | visual and source-grounded design review

**Status: design review / gap assessment, 2026-11-13. No application code changed by this report.** Reviewed current GitHub `main` source and six owner-provided Storybook screenshots (Laboratory, Harbor, Cave, Sterile, Abstract, Malformed). The screenshots are external review evidence, not checked-in assets or executable tests. No browser, Vitest or Playwright run was performed by the reviewer. Cursor reported 131 fast tests passing; treat that as executor-reported, not independently reproduced. Parent: [presentation runtime](../system/presentation-runtime.md); next implementation route: [PX05–PX07 calibration plan](../presentation-calibration-program.md).

## High-level verdict

**Architectural seam: KEEP. Visual/runtime readiness: NOT ACCEPTED for engine integration.** A closed parsed V1 document, pure resolver, trusted fixture asset references, optional presentation in `StoryFrame`, scoped fictional-choice treatments and an existing Storybook catalogue are useful foundations. No evidence here justifies replacing the stack or discarding PX01–PX04.

The current renderer can vary colors and decorative surfaces, but lacks **cross-surface palette coherence, predictable viewport bounds, meaningful media scale and trustworthy end-to-end fixture proof**. Some schema capabilities are normalized but visually no-op. The next work is a bounded frontend quality/correctness pass, **not** a backend StorySnapshot/LLM/image-provider project and **not** a generic visual redesign of all product screens.

## Screenshot-specific observations

| State | Observation | Classification / source explanation |
| --- | --- | --- |
| Baseline laboratory | Dark field-journal stage is readable, calm, recognizable; centered bordered reading plate remains conventional | Acceptable regression default, not finished world art direction |
| Harbor | Pale blue-grey atmospheric field has potential; header/Now/navigation and fixture text are very low-contrast; gradient ends above bottom of preview leaving unrelated dark canvas | **Failure**. Header ink derived against dark narrative `surfaceTint`, then rendered over light backdrop; scene wrapper is content-height, not viewport-filling |
| Cave | Dark purple world identity and luminous choice illustrate expressive potential; giant flat purple circles/wave image competes with narration, consumes huge vertical area; horizontal overflow visible | **Failure**. Same geometric 800×480 fixture serves backdrop and full-width inline figure; unbounded art treatment and probable overflow from animated transformed absolute plane. Browser inspection needed to confirm exact scroll culprit |
| Sterile | Clear pale background, pleasant readable narrative plate; dark option rows contain nearly invisible dark title/support text | **Critical failure**. Default button background remains dark while `--sf-ink` and `--sf-ink-muted` are derived from light narrative plate |
| Abstract | A nonhuman geometric visual motif is a useful direction; illustration overwhelms or disconnects from generic wet-harbor prose | Compositional proof incomplete; need a fictional scenario that belongs to the style |
| Malformed | Recovered readable dark presentation despite invalid directive | Positive fallback evidence; not enough by itself to prove all unsafe inputs, target matching or high contrast |

The screenshots visibly show Storybook's accessibility counters on at least Cave and Sterile; investigate their actual reported violations before closure. Do not claim the count proves a particular failure without opening the addon results.

## Confirmed implementation gaps

### P0. CSS contrast is calculated for the wrong surface

`presentation/resolve.ts` obtains `ink`, `muted`, `quiet`, `focus`, `status` using **one `surface`** derived from `surfaceTint`. `ui/story-frame.tsx` injects those variables at `.story-frame` root, so header/navigation on a pale gradient inherit ink selected for a dark reading plate. `ui/intention-choice.tsx` uses no per-option contrast roles when no treatment is supplied, while `story-frame.css` keeps the default button dark (`#1f2936`). The same root ink is therefore wrongly used on dark buttons in a light theme.

Illustrative direct color-pair checks from source: sterile `#14202b` on `#1f2936` ≈ **1.12:1**; sterile `#5c6b66` support text on `#1f2936` ≈ **2.62:1**; harbor `#e7ece8` on `#d5e4ea` ≈ **1.09:1**. These are illustrative specified color pairs rather than a pixel-level audit of every composited frame. The existing default contrast helper alone cannot certify accessibility of the rendered page.

**Target:** derive a **multi-surface semantic palette** with separate safe ink/surface/secondary/focus roles for (a) ambient exposed chrome, (b) narrative stage, (c) default and treated options including support/hover/disabled, (d) protected system status/controls. Ensure all actual rendered combinations meet WCAG AA where applicable; do not let a dark/bright model accent dictate system feedback colors. Prefer scrims/plates over forcibly altering creative scene backdrop.

### P0. Scoped atmosphere fails to own the visible canvas

`story-frame.css` sets `.story-viewport { min-height: 100%; }`; in Storybook it appears sized by content rather than available height. Harbor/Sterile end their gradient while the rest of the preview remains original dark. Cave shows horizontal scrollbar. The animated ambient layer uses `transform: scale(1.03)` on a positioned full-size element without explicit overflow clipping on the containing viewport; this is a *plausible* source, not proven without browser computed layout.

**Target:** full available story canvas to viewport minimum while expanding for long prose, never fixed height that clips; background spans the entire canvas or deliberately ends at a designed section boundary; decorative scaling cannot create scroll width; narrow 320/375 and 400%-zoom remain usable. Do not mask a real overflowing narrative component by blindly clipping the entire page.

### P1. Fixture visuals and media dimensions aren't a coherent composition system

`fixtures.ts` assigns the same `fixture:cave-wall` image to both backdrop and an inline after-paragraph placement; `assets.ts` records it as 800×480. `ui/scene-media.tsx` renders a normal `figure` with full-width img, and CSS has no maximum visual footprint per slot. `crop` is recorded as a data attribute but no matching inline `object-fit` behavior is implemented beyond fixed `cover` styling. The illustration becomes a large plotless interruption.

**Target:** explicit bounded media composition variants, e.g. backdrop / wide illustration / compact inset / marginal accent (responsive normal-flow fallback). Insets have proportion/height bounds and placement is not allowed to overwhelm the passage/action threshold. A decorative placeholder used to test safe media plumbing must not be offered as evidence of convincing narrative art. Use source-owned/license-safe local fixtures with story-relevant imagery; no provider integration.

### P1. Authored fixture assets leak into general-purpose runtime ownership

The current `apps/web/src/features/play/presentation/assets.ts` exports `FIXTURE_ASSETS` with specific scenario entries (`fixture:cave-wall`, `fixture:harbor-light`, `fixture:abstract-field`). `parse.ts` hard-requires the `fixture:` prefix, and generic `resolve.ts` calls `lookupFixtureAsset`. Meanwhile Storybook gets those static files through its current `../public` static directory.

**Assessment:** named SVGs are normal and desirable **as tests/examples**, but the dependency from production presentation parser/resolver to specific fixture content is the wrong direction. The current system has no true generic asset boundary yet. This would inhibit a future authenticated asset manifest and risks accidental shipping of example assets with the app. It is a **prototype architectural leak**, not evidence that arbitrary caves/harbors are being hardcoded into the game rules.

**Target:** keep named scenarios under Storybook/test ownership; pass a small trusted asset catalog into a generic resolution API; use bounded opaque IDs without a special `fixture:` prefix; preserve URL/content trust and fallbacks. This is assigned to [PX06](../../changes/2026-11-13--px-media-composition-and-capabilities/CHANGE.md), before any engine/public contract. Do not introduce complex asset infrastructure or image generation as part of the correction.

### P1. Accepted grammar fields are silently inert

Verified present in parser/resolver but missing or incompletely wired in rendering:
- `typography` resolves but is not exposed/applied to corresponding DOM styles;
- `texture` is expressed as `data-texture` but no matching real texture styles are defined;
- `textureIntensity` and `vignette` are resolved but not reflected in visual output;
- `lighting` has a specific `dim` stage style, but `diffuse`/`radiant` do not have comparable rendered treatments;
- `emphasis` is resolved for choices but does not control any choice style;
- media `crop='contain'` does not visibly select `object-fit: contain` in current inline CSS.

**Target:** every advertised, accepted V1 field has an observable supported bounded effect, or is deliberately removed/deprecated from the documented frontend contract with explicit capability reporting. Do not leave a field silently accepted yet inert. Do not add extra fantasy settings merely to fill schema rows.

### P1. Storybook bypasses the exact resolver path for its most expressive screenshot

`apps/web/src/stories/presentation.stories.tsx` chooses `caveScope` (campaign offer targets) while rendering **legacy** `StoryFrame` intentions. Then it manually appends two `ResolvedChoice` entries targeting a synthetic legacy interaction after `resolvePresentation` has run. The cave styling screenshot therefore does not prove the purported document-to-real-option-target behavior.

The story exposes only a `preset` select, not field controls for the actual V1 grammar. The same harbor passage/options are repeated across cave, sterile and abstract states, making atmosphere/fiction coherence impossible to evaluate. The `harborScope` and `caveScope` fixtures have `paragraphCount: 2` while the Storybook sample renders three paragraphs.

**Target:** no post-resolver hand-authored decorations in any main proof story. Test separate **authentic current legacy** and **authentic current campaign nested-path** fixtures. Parsed source document, current verified scope/offer, resolver, component and callback/command observer are the actual path. Storybook controls edit the untrusted input document and re-resolve, rather than directly assigning trusted `ResolvedPresentation`. Scenario content matches world and choices. Include bad/old-target and command-parity negative cases.

## Implementation achievements to preserve

- V1 parser rejects unsupported version and raw CSS-like input without crashing the whole story.
- Resolver matches choices by exact current interaction or campaign offer/path rather than superficial label alone.
- Optional media use trusted fixture reference registry, and absence preserves prose/options.
- `IntentionChoice` separates button semantics/behavior from decoration.
- `NarrativePassage` distinguishes passage ID for arrival, rather than just title.
- StoryFrame real Play omission of presentation is correct for now; do not hook up a provider to improve a Storybook screenshot.
- Core Query/SSR/frozen mutation/receipts/recovery design remains isolated from these CSS/fixture problems.

Preserve the default field-journal layout and existing working game commands unless a test-proven narrowly scoped compositional correction is needed.

## What passing tests do and do not prove

Cursor reported `pnpm --filter @offscreen/web test:fast` with 131 passing tests. This is useful evidence of existing pure/RTL invariants, but does **not** imply real composited contrast, no overflow, appropriate art scale, or source-to-UI proof when Storybook mutates normalized results.

The next verification must include **browser-rendered computed style/contrast** for actual nav, stage, button titles, support, hover/focus/disabled/system states over both light and dark backgrounds, plus viewport fill/scroll width. Use the existing Storybook addon accessibility output as a debugging input, not a substitute for keyboard/zoom and human composition critique.

## Next decisions and sequence

1. **[PX05 visual-surface correctness](../../changes/2026-11-13--px-surface-contrast-and-viewport/CHANGE.md)**: P0 defects first; guarantee legibility and viewport/overflow. Must be accepted before any further engine/public contract.
2. **[PX06 media and vocabulary fidelity](../../changes/2026-11-13--px-media-composition-and-capabilities/CHANGE.md)**: make image treatment intentional, eliminate silent no-op fields, keep expressive controls bounded. Depends PX05.
3. **[PX07 honest interactive laboratory](../../changes/2026-11-13--px-workbench-fidelity/CHANGE.md)**: authentic legacy/campaign fixture data, editable V1 controls, Storybook/browser/a11y proof without bypass. Depends PX05/PX06.

Each is a proposed bounded code-bearing Change. This review itself is **not** a Change: it is evaluation/design evidence. The [calibration program](../presentation-calibration-program.md) is the implementation route. Do not authorize an engine presentation contract until frontend renderer + actual fixture proof are accepted in a separate owner review.

## Explicit non-goals

No rewrite to MUI/shadcn/Tailwind; no new client global theme store; no change to published action authority, time or results; no backend/engine/StorySnapshot edits; no image generator, dynamic image downloads, billing or models; no hardcoded magic special-case theme for Harbor/Sterile just to silence the screenshots. Fix the semantic design-system mechanism so **future arbitrary valid combinations** also work.
