# PX01 | Pure presentation resolver and stage styling foundation

**State: Proposed (2026-11-13).** **Implementation permission: none.** This packet becomes Ready only when owner selects it and revalidates current code. Parent: [presentation program](../../experience/presentation-implementation-program.md). Next: [PX02 expressive choices](../2026-11-13--px-expressive-choices/CHANGE.md).

## Cursor first-screen brief

> **Outcome:** a validated, optional, safe V1 presentation input can restyle the story *atmosphere and stage* through resolved tokens (including a distinctly different structured gradient) without changing JSX or game actions. Real Play with no directive stays equivalent to existing baseline.
>
> **Authority:** [runtime layers](../../experience/system/presentation-runtime.md#stable-architecture-and-dynamic-planes), [V1 language and resolution](../../experience/system/presentation-language.md#presentation-resolution-algorithm), [contrast](../../experience/system/presentation-language.md#foreground-and-text-contrast), [Living Stage](../../experience/spaces/living-stage-blueprint.md).
>
> **Source entry:** [Play map](../../../apps/web/src/features/play/README.md). Inspect `ui/story-frame.tsx`, `ui/story-frame.css`, `view.tsx`, `apps/web/app/style.css`, and one existing StoryFrame story/test. Preserve the selected [React/Next data boundary](../../engineering/targets/react-next.md).
>
> **Exclude:** UI effects/illustrations/choice refactor (PX02/PX03), provider/contract changes, theme picker, global CSS migration, new data store or dependency shopping.

## Selected design / trade-off

A handful of CSS variable overrides on `StoryFrame` would demonstrate recoloring but still leave hardcoded child surfaces and a backdrop constrained by the prose column. Conversely a full component-library rewrite would delay any playable proof. Implement the minimal **complete architecture seam**, then expand actual consumers in later Changes.

**Acceptance outcome:** default/styled/invalid fixture inputs go through the same *pure* normalizer/resolver and a correctly scoped scene-atmosphere/root layer. No inputs means no notable regression in the current green-blue field-journal stage. Valid palette lighting/gradient inputs visibly change the environment, not only a button.

## Intended code delta

1. Create a frontend-owned V1 schema/parser and pure resolver (source-local presentation module), with fixtures for absent, harbor, cave, malformed and unknown-version inputs. Normalize bounded `#RRGGBB` colors, structured gradient stops, scene-level atmosphere, stage treatment and typography profile; define type stubs/normalized registry boundaries for later media/choice effects without implementing their consumers.
2. Produce semantic resolved presentation roles and safe defaults. Guarantee narrative reading surface text, muted copy and focus/control roles remain accessible. Solid/gradient/lighting can change; untrusted input cannot directly set ink, status colors, selectors or arbitrary CSS.
3. Introduce a scoped story presentation root/ambient plane (if needed outside the 56rem prose column) without restructuring play commands, Next routes or server-side Query. Map resolved values into bounded CSS custom properties/explicit stage variants.
4. Refactor only conflicting `story-frame.css` hardcoded values and interfering global selectors *that block the proof*. Protect demo, creation, Chamber, authenticated navigation and system status controls; do not make large decorative styles leak beyond the story.
5. Keep `StoryFrame` and real `PlayScene` working with **optional `undefined` presentation**. All alternate presentations are fixtures/Storybook-only. Do not add a backend field or a developer-only feature switch to production.
6. Add deterministic Vitest parser/resolver/contrast tests and minimal RTL/Storybook checks for baseline, drastic atmosphere difference, malformed optional property, unknown version and high contrast/reduced-motion handling (even when no motion implemented).

## Required source invariants

- `PlayScene` still owns authenticated Query reading and current scene identity; no parallel mutable client store or new remote fetch.
- Legacy and campaign buttons keep callbacks, command payloads, disabled logic, focus semantics and existing CSS fallback. Do not implement new option effects here.
- A → B story switch cannot inherit A's theme; source scope is story/passage, not global document root.
- SSR initial content stays readable before hydration and no client-only random palette is introduced.
- Presentation input cannot select app route, modify element order, invent facts, alter calendar/commitment progress or trigger provider use.

## Acceptance / negative proof

**Normal:** same StoryFrame fixture with no directive preserves existing appearance; cave vs harbor fixtures change stage/backdrop (including structured gradient) and visually distinct palette while maintaining readable prose and focus.

**Negative:** an invalid gradient, CSS string, unknown enum or wrong version cannot hide text or break the route; invalid optional field leaves other valid values; high-contrast/forced-colors overrides decorative choices; backgrounds never intercept clicks; demo/creation/Chamber untouched.

**Exact proof:** pure parser/resolver tests; targeted RTL for optional prop and unchanged option handling; `pnpm --filter @offscreen/web test:fast` after narrow iteration; Storybook wide 1440px and narrow 375px captures, including default and two styled states. Report rendered screenshots or explicitly say not inspected. Use existing browser tooling; no infrastructure reset, paid provider or deploy.

## Risk / boundary / permissions

Only web source, CSS, fixture and test deltas. Do not touch `@offscreen/contracts`, Nest, engine, database, package manager dependencies without a separate justified owner approval, or add a client global theme store. New editor UI for theme authoring is not in scope.

**Executor handoff:** Reinspect current branch/worktree; select PX01 as Ready only on explicit owner command; implement exactly this seam; return changed files, diff, tests and screenshots; stop for human visual critique before PX02.
