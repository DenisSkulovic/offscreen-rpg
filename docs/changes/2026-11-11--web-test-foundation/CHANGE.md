# Change W01 | Fast, truthful web-local unit and component verification

**State:** Proposed, not Ready. **Owner:** repository owner for target/scope approval. **Future executor:** Cursor after selection. **Permission now:** Markdown planning only; no source edits, CLI/DB reset, browser service run, provider call, deploy or migration authorized by this packet.  
**Code baseline:** `470a5df069470bf758eb1a560c515846ce781637` (GitHub source-inspected, no runtime tests). Executor must revalidate the current branch and preserve unrelated work.  
**Dependency:** None; first recommended execution packet.

## Why this is a Change

**Target:** [React/Next end-state](../../engineering/targets/react-next.md), criteria **F3 F4 F5 F8 F10**. **Gap:** [2026-11-12 source audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G15 (and evidence prerequisites for G11–G26)**.  
**Desired single code/test/config outcome:** A deterministic, provider-free, *web-local* test command proves pure and rendered React invariants in seconds without launching Nest, Temporal or a disposable database. It complements rather than imitates the real Playwright integration system.

**Observed source owners:** `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/src/lib/story-transport.ts`, representative Play/draft components, `tools/api-integration/test/stories-browser.integration.ts` as a preserved external proof.

## Proposed design contract (not an invitation to redesign)

Prefer **Vitest + React Testing Library + user-event + jsdom** (or an equivalently small React-19/Node-24-compatible runner if installation proves incompatible). Configure the existing `@/` alias and browser setup without compiling unrelated packages or mocking React itself. Test selection algorithms as pure functions; use controlled deferred promises for component event/race cases, accessible roles for visible assertions, and mounted/unmounted/Strict Mode coverage. New tests must describe *current valid behavior*; do not write a knowingly failing final test for a later Change simply to make W01 impressive.

## Expected bounded implementation

1. Add one locally runnable `pnpm --filter @offscreen/web test` script, runner configuration and only the minimal devDependencies.
2. Add representative green baseline tests for current rendering and request/snapshot behavior, including a same-resource version regression if already correct. Capture new target failures for W03/W04 as explicit follow-up notes, not assertions loosened to pass.
3. Wire the local test into existing root turbo `test` path with no new paid CI runner or database fixture.

## Falsifiable acceptance and proof

- **Normal case:** A fresh checkout can run the focused web tests offline/provider-free; a representative view correctly renders an authoritative pending state and a known monotonic same-story version rule.
- **Discriminating negative case:** An intentionally wrong snapshot ordering/mutation-state transition is detected by a focused test; no mocked fetch suite is misreported as real object authorization or exactly-once backend proof.
- **Check and evidence:** `pnpm --filter @offscreen/web test`; targeted `pnpm --filter @offscreen/web typecheck`/lint/format as available; real browser integration only when separately authorized after inspecting destructive test DB setup.
- **Completion receipt:** Tests list the claim each proves and limitations; record exact installed versions and runtime results, or mark unrun. No ownership rearchitecture in this packet.

## Boundaries, alternatives and stop conditions

- **Keep / do not touch:** No application behavior refactor, global state library, browser screenshot-only “test”, Storyteller call, CI provider spend, DB reset or gameplay change.
- **Principal risk:** Avoid jsdom test pollution, global fetch mocks leaking between tests, and a runner that requires all app services. Preserve existing CI and full-stack Playwright.
- **Alternative tested conceptually:** keep the existing owner with focused tests/repair instead of extracting modules; any larger framework/library must show that it meets these exact invariants with lower total maintenance and session complexity.
- **Stop/refer back:** if actual API semantics, resource lifetime, policy or source changed so this contract no longer holds, report the contradiction and revise the owning target/packet with the human. Cursor may choose local code techniques, **not** change product policy, authorization or paid-call behavior on its own.

## Executor handoff once approved

Read the [target](../../engineering/targets/react-next.md) criteria **F3 F4 F5 F8 F10**, audit **G15 (and evidence prerequisites for G11–G26)**, [frontend skill](../../../.agents/skills/frontend-engineering/SKILL.md) and the source owners above. Implement **only this outcome** in reviewable diff(s); preserve existing behavior. Run the cheapest truthful check including the negative case; return changed paths, exact commands/results, unknowns and next proposed Change. Do not infer implementation authority from this packet's presence.
