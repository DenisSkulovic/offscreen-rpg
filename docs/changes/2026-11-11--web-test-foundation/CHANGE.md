# Change W01: Vitest + React Testing Library + MSW frontend verification

> **Cursor first look (current source ≠ selected target):** [Web test seam](../../../apps/web/README.md) → the **one** owning symbol. **Primary contract:** [F10](../../engineering/targets/react-next.md#f10-evidence-and-maintainability).  
> **Pre-investigated trap:** Current Turbo `test` builds the same package; run direct Vitest first, not Next production build.  
> **Context rule:** this packet is the complete implementation authority; read its remaining scope/negative test, **not** the entire audit, target, old minutes or adjacent Change folders.


**State: Specified / Proposed.** Architecture and library choices are **DECIDED by the owner-authorized [React/Next target](../../engineering/targets/react-next.md)**. This packet remains **unselected for code execution** until the owner instructs Cursor to perform it. **Source baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source inspection only; recheck current branch/worktree at execution).

**Dependencies:** None. **First implementation packet**.  
**Target:** [F1–F15 selected end state](../../engineering/targets/react-next.md) **F3 F4 F5 F8 F10**. **Audit evidence:** [Nov 12 gap register](../../engineering/audits/react-next-gap-2026-11-12.md) **G15 G32**.

## Code-bearing outcome and ownership

**Outcome:** Vitest + React Testing Library + MSW frontend verification.  
**Source starting points:** `apps/web/package.json`; `apps/web/tsconfig.json`; representative `src/features/play/view.tsx`, `src/features/stories/draft-editor.tsx`; `tools/api-integration/test/*` (preserve).

## Binding implementation design

**Install Vitest, @testing-library/react, @testing-library/user-event, @testing-library/jest-dom and MSW** with React 19/Node 24/Next 16 compatible pinned releases. Use jsdom, alias resolution and strict cleanup; tests run provider-free and without Nest, PostgreSQL or Temporal. Separate pure model tests from component/HTTP-boundary tests. Mock only the network edge, not the business invariant under test. Maintain existing real API+Playwright tests as a separate stronger proof tier. Add web `test` to existing Turborepo flow without another paid CI job.

## Bounded implementation sequence

1. Configure test runner/environment and direct local `pnpm --filter @offscreen/web test`/`test:watch`/`test:fast` scripts. Do not rely on the legacy Turbo `test.dependsOn:['build']` as the fast path; W20 establishes a separate cached `test:fast` task graph after this Change.
2. Write representative *currently correct* deterministic tests for existing view/typed schema behavior. Add controlled deferred-response, Strict Mode cleanup and 202 pending visual tests as groundwork; later Changes own fixing currently failing identities.
3. Document fake-vs-real evidence and integrate cheap tests into existing CI without DB reset.

## Falsifiable acceptance

- **Normal scenario:** Fast web-local test renders an existing scene, demonstrates real user interaction and tests pure version ordering without local services.
- **Adversarial negative scenario:** A deliberately misordered older same-story snapshot or incorrect pending/published label is detected; tests do not falsely certify Nest ownership, SSR privacy or exactly-once from MSW.
- **Verification/evidence:** Run focused test, web typecheck, root lint/format as relevant and record commands, environment and outcomes; no live provider or destructive test invocation.
- **Explicit exclusions:** No app behavior cleanup, global store, Storybook workbench (W18), full browser suite or visual design.

## Cursor rules and return receipt

Implement exactly this outcome after owner selection, using the [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md), [Change workflow](../../../.agents/skills/change-workflow/SKILL.md), target criteria and exact source owners. Do not redesign the stack, change gameplay or run paid provider calls; inspect verification scripts before any destructive database/test service. If the current source invalidates an expected contract, return the evidence to the owner rather than invent an alternative library. Report affected paths, actual diff, commands executed/results, at least one discriminating negative test, known limits and next dependency. A successful mock is not proof of Nest authority or production behavior.
