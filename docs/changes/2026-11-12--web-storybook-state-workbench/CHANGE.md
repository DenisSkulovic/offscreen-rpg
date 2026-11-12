# Change W18: Storybook deterministic engineering-state catalogue for React screens

> **Cursor first look (current source ≠ selected target):** [Play state-fixture map](../../../apps/web/src/features/play/README.md) → the **one** owning symbol. **Primary contract:** [F10](../../engineering/targets/react-next.md#f10-evidence-and-maintainability).  
> **Pre-investigated trap:** Storybook is provider-free behavioral state evidence, not a visual redesign or replacement for real Nest/DB tests.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W13. All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**. **Audited source:** post-W13 `main` (`ed13c9f`). Storybook 10.6.7 + `@storybook/nextjs-vite` + MSW addon + a11y; static build is provider-free.

**Depends on:** W01 W15 W06 W08 W11; W07 accessibility semantics useful before final story review.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F7 F9 F10 F15**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G29 G24**.

## Code outcome and owners

**Measurable code/test/config change:** Storybook deterministic engineering-state catalogue for React screens.  
**Start at:** new `apps/web/.storybook/*`, web package scripts/dependencies, Play scene and form semantic presentational components, MSW fixtures from W01, existing CI.

## Binding technical design

Install **Storybook with a stable Next.js-compatible builder** and MSW integration; pin versions confirmed compatible with Next 16/React 19/Node 24. The purpose is isolated *functional state evidence*, **not** redesigning layouts or selling a visual component library. Include representative stories for Play normal/choice pending/resolution uncertain/blocked/failed, draft pristine/dirty/409, settings revision conflict, route read error, empty/infinite list and Chamber developer-denied. Use deterministic fake network/fixtures, documented QueryClient isolation per story and RHF form instances; never call real API, Temporal or paid Storyteller. Add a11y addon or automated axe check for representative states if stable. Make it easy for an interviewer to inspect failure semantics with no backend running.

## Bounded implementation steps

1. Setup builder/addons/MSW mock environment and `pnpm --filter @offscreen/web storybook` / static build with no service dependencies.
2. Add fixtures/stories at new semantic component boundaries, including accessible interactions and fault transitions.
3. Verify build, detached start, deterministic state reset, no real external traffic, and minimal CI story build if cost acceptable.

## Acceptance and verification

- **Normal outcome:** Storybook launches standalone and allows inspection of normal, pending, uncertain, conflict and recovered states from consistent typed fixture data.
- **Discriminating negative case:** No story performs provider or live Nest request, leaks private session/content, shares Query cache between stories or falsely treats screenshot as correctness proof.
- **Safe proof and evidence:** Storybook static build, smoke browser walkthrough and representative a11y assertions; explicit human review note.
- **Must preserve / exclude:** No visual UI redesign, new design system, Tailwind/shadcn bulk adoption, product features.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
