# Presentation runtime | frontend-only implementation program (PX01–PX04)

**Status: frontend packets PX01–PX04 landed 2026-11-13.** Owner asked to merge this design and implement it. Live Play still passes no presentation document; Storybook and tests feed fixtures. Engine, contracts, and image providers remain out of scope.

**One-sentence destination:** a single verified scene + offer can be rendered in radically different, accessible, expressive visual environments using different *validated data*, with no source edits, without the browser knowing what generated the art direction.

## Authority and retrieval budget

**Product/design owner:** [presentation runtime](system/presentation-runtime.md); **exact data grammar:** [presentation language](system/presentation-language.md); **media and motion:** [media/motion](system/presentation-media-and-motion.md). Preserve [Living Stage](spaces/living-stage-blueprint.md), [choice semantics](patterns/choice-surface-decision-rules.md), [motion](system/motion.md), [accessibility](system/accessibility-and-voice.md) and [React/Next target](../engineering/targets/react-next.md). This program does not redefine any existing game rules.

**Cursor start each time:** select ONE PX packet; read its first-screen brief, relevant headings from the permanent specs, the [Play source owner map](../../apps/web/src/features/play/README.md) and 2–5 source files named in that packet. Do not preload the full experience folder, old research branches, all UX packets or every component in the monorepo. Reinspect HEAD and current worktree before edits. Read [work-unit standard](../../.agents/references/change-work-unit-standard.md) only if lifecycle is unclear.

## Outcomes and dependency graph

| Packet | Independently reviewable *code* outcome | Dependencies | First real proof |
| --- | --- | --- | --- |
| [PX01: normalized presentation core](../changes/2026-11-13--px-presentation-core/CHANGE.md) | Closed V1 runtime input → safe pure resolved tokens; story viewport and scoped CSS foundation; no data still looks right | Existing finished UX stage and web test/Storybook baseline | Default vs two drastically different fixture palettes; bad input is safe |
| [PX02: compositional choices](../changes/2026-11-13--px-expressive-choices/CHANGE.md) | Reusable semantic passage and option treatments across legacy + campaign actions, exact scoped match | PX01 | Two distinct choices, same command payload; stale offer styling ignored |
| [PX03: art and truthful motion](../changes/2026-11-13--px-atmospheric-media/CHANGE.md) | Trusted background/inline media slots and bounded effects; stable passage/event lifecycle | PX01 + PX02 | Image-less/failed/late art, new passage vs refetch, reduced motion |
| [PX04: visual laboratory and regression proof](../changes/2026-11-13--px-presentation-lab/CHANGE.md) | Integrated Storybook presentation playground, fixture matrix, browser/a11y/perf proof of the whole seam | PX01–PX03 | Same components across divergent worlds, 375px/zoom/reduced-motion + functional equivalence |

Dependencies: **PX01 → PX02 → PX03 → PX04**. Fixture tests and narrow visual checks are *part of every change*, not postponed until PX04. PX04 expands the already installed Storybook workbench rather than repeating UX11's general screen-evidence scope. No new Chamber modernization.

**One Change active at a time by default.** Stop for a human rendered critique after PX01 (readability/theme scope), PX02 (actual option affordances), and PX03 (composition/art/animation). Do not absorb later packets in an earlier one merely because the executor sees a convenient refactor.

## Explicit scope

**In:** `apps/web` presentation-only TypeScript/React/CSS, provider-free fixture assets, Storybook fixtures/controls, tests and source-adjacent documentation. Existing `StoryFrame` and both existing offer render paths are consumers. Semantic compact components may move when they improve actual reuse, but existing Query/commands stay in place.

**Out, without exception:** Nest/application/game engine, `@offscreen/contracts` DTO additions, LLM prompting/outputs, image-generation calls, service/storage/CDN plumbing, billing/provider spend, speculative scene layouts, autonomous game-time behavior, SSR/Query/auth rewrites, data migrations, full Tailwind/shadcn/MUI adoption, audio/3D/Canvas engine, live asset authoring.

**Production readiness invariant:** no presentation document originates from live Play yet. User-facing baseline appearance and behavior are preserved while we prove the interpreter with fixtures. The optional prop/adapter may exist on the frontend side but is `undefined` in real Play until separately authorized public projection work. Do not disguise mocked presentation as generated live output.

## Intended end-state ownership map (names illustrative, boundaries normative)

~~~text
apps/web/src/features/play/
  presentation/
    schema / parser              # V1 input validation
    resolution / palette         # pure cascade, contrast, fallbacks
    treatments / registry        # supported visual capabilities
    media-resolution             # approved assets and anchors
    fixtures                     # named mocked documents
    ui/
      scene-atmosphere
      scene-media
      narrative-passage
      intention-choice
  ui/
    story-frame                  # slim composition
    campaign-offer               # current nested offer controller
    campaign-activity            # current authoritative status view
  view.tsx                       # Query/current story and command wiring
apps/web/src/stories/
  presentation stories/controls  # fixture-fed workbench
~~~

Do not pre-create every file or move all existing UI into a new shared package. Design boundaries are stable, exact filenames can follow existing conventions. Presentation parser/resolver and fixtures should be pure and importable without Next/browser APIs. Component props should express **verified semantics + resolved decoration** separately.

## Operational invariants and acceptance gates

1. **Default preservation:** story with no presentation renders substantially as it does now, with current labels/controls/SSR, and no added art/motion required.
2. **Safe creativity:** palette, structured backdrop, lighting, stage treatments, typography accent and exact-choice appearance vary by input, within approved grammar. No raw CSS/HTML/URL provider instructions.
3. **Correct identity:** scene, viewer, passage, interaction/offer+path and media scope are guarded. Same-title new passage, stale offer, late asset and A→B story switch behave correctly.
4. **Truth:** decoration never changes emitted commands, eligible options, pending/hold text, retry semantics or world time. No visual success before canonical outcome.
5. **Accessibility:** semantic HTML, focus, readable text contrast, color-independent labels, no motion forced at reduced preference, predictable keyboard/scroll, sensible zoom, no-image mode.
6. **Economics:** no new inference, no image spend, no backend request, minimal bundle/render overhead, local fast testing rather than full heavy CI on every edit.
7. **Evidence:** unit parser/contrast/identity proof, RTL choice/command regression, Storybook fixture visual comparison and real-browser screenshots by gate; report what was actually verified.

### Adversarial fixture matrix (incremental, complete at PX04)

| Fixture | Distinguishing challenge |
| --- | --- |
| Default field journal | No presentation, no assets, ordinary authored action |
| Cold harbor at dawn | Quiet pale backdrop and warm detail with actual contrast proof |
| Dark underground cave | Structured dark gradient, illustration, multiple expressive choices |
| Bright sterile environment | Very light backdrop without losing navigation/focus/status contrast |
| Sentient storm / microscopic life | Abstract nonhuman visual language, no mandatory body/map |
| Intimate ordinary room | Small restrained composition, no obligatory dramatic glow |
| Long mixed-script prose | Cyrillic/Latin and 10+ paragraphs, safe insert anchors |
| Missing / slow / wrong-host asset | Full story action preserved, no layout jump/unsafe URL |
| Malformed V1 / unknown version | Local fallback / global safe fallback, no broken scene |
| Same-title new passage / duplicate SSE | Motion only on *new committed identity* |
| Old offer / wrong action path / double click | Styled view cannot redirect or repeat command |
| Paused / uncertain / failed operation | No fake running visual, reliable recovery |
| 320px / 375px / zoom / forced colors / reduced motion | Usable contrast, scroll, focus and controls |

## Order and human review

**Before PX01:** Cursor checks that previous UX01–UX12 and W-series work actually landed on its working branch; the UX11 remaining evidence work should not be simultaneously edited by another agent. Existing source is only baseline evidence, not the implementation blueprint. Confirm `apps/web/src/features/play/ui/story-frame.tsx`, `story-frame.css`, `view.tsx`, `campaign-offer.tsx`, Storybook and global CSS ownership.

**PX01 review:** deliberately compare default and two very different presentations using *unchanged JSX*. Does the background span an intentional viewport? Is this more than a recolored card? Is the text readable? If not, revise within PX01 before layering features.

**PX02 review:** show actual campaign options and legacy choices with independently styled accents; verify changing decoration doesn't change callback/disabled/navigation. If a composition refactor grows beyond the intended target, split an internal execution slice, not a second architecture.

**PX03 review:** show no-art, art-present, art-failed, same-scene refresh, scene transition and reduced-motion examples. A screenshot cannot establish a real asset-provider lifecycle; rely on deterministic tests for that claim.

**PX04 review:** use interactive Storybook controls driven by actual validated inputs, not a fake static screenshot. Compare cave, harbor and nonhuman world using the same components and no JSX edits. Record wide/narrow screenshots, keyboard/axe and browser source evidence. The human designer may request visual refinement, but any new product behavior must be separately designed.

## Execution / authorization protocol

Owner authorized the whole frontend program on 2026-11-13 and PX01–PX04 landed together in `apps/web`. Current change is none. A later public-contract/engine change is still required before live Play receives a presentation document. Do not run destructive tests, call paid providers or deploy for this seam.

Cursor returns: changed files and diff, exact checks/results, before/after screenshot evidence, default behavior regression, genuine gaps or contract conflicts, and recommendation for next packet. The designer reviews evidence before selecting another Change.

**Do not authorize a backend presentation projection merely because PX04 is complete.** That is an independent later engine/public-contract design initiative whose inputs can now be validated against a real renderer.
