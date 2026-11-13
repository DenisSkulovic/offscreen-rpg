# UX11 | Browser/Storybook evidence for an actually good game interface

**State:** Proposed. **Approval:** no code authorized. **Kind:** test code, Storybook fixtures, browser verification tooling/config. **Parent:** [experience program](../../experience/implementation-program.md), M4. **Dependencies:** at least one of UX01–UX10 implemented and ready for human review, then incremental evidence per shipped surface.

## Cursor first-screen brief

> **Source map:** [web owner](../../../apps/web/README.md), existing src/stories/, app demo, Play test files and [test source map](../../../tools/api-integration/test/README.md).
> **Primary target:** [experience validation plan](../../experience/evidence/validation-plan.md#ux-acceptance-checklist-for-each-change), [accessibility](../../experience/system/accessibility-and-voice.md#accessibility-sign-off-tasks).
> **Known trap:** mocked Storybook and a green DOM test are not proof of persistent gameplay or of beautiful, comprehensible UX; **Chamber CH01–CH16 are recorded Done, but individual scenario lanes may remain planned or blocked**. Existing full integration lanes may reset a disposable test database.
> **Scope:** Proposed only. Code-bearing fixtures/tests are allowed *only when authorized*. No paid providers, unapproved DB reset, deployment or GitHub Actions sprawl.

## Outcome and motivation

A credible portfolio shows how we know the UI works. Existing React toolchain tests data races; this Change adds player-meaning evidence where appropriate, not a ceremonial “UX tested” line.

Create a focused workbench of **representative experience states** and browser scripts:
- Narrative: 1 paragraph, very long passage, multiple turns, one or many contextual options, no image, nonhuman world.
- Time: contribution 3/5 with failed check, literal wait, travel without fraction, interruption preserving earned progress, paused/no-active, forecast zero but not settled.
- Authority: option path (no time), submitted, accepted, running, settled, lost ACK, stale offer, generation failed after mechanical settlement, funding hold.
- Return: source-linked facts, zero real changes, currently actionable decision, historical stale choice.
- Creation: dirty draft/409, stale opening, pending generation, uncertain payment, frozen Start after reload.
- Visual variation: 320/375/768/1440, 200%/400% zoom, keyboard-only, high contrast, reduced motion, missing media.

## What “evidence” means

| Kind | Useful claim | Not a valid claim |
| --- | --- | --- |
| Storybook/MSW | Component behaves/rendered for mock data | A real model/provider/DB executed |
| RTL/Vitest | Local focus/semantics/race behavior | Pixel-level taste or connected authority |
| Playwright browser | Actual routing, responsive composition, accessible common patterns | All cognitive usability or untested provider outcomes |
| Real authorized integration | Exactly-once, server-confirmed state under specified conditions | Long-term model quality or production scale |
| Human observation | Player comprehension, reading comfort, real-world confusion | Mathematical proof of idempotence or authorization |

Automated axe checks complement, not replace, manual screen reader and keyboard. Store representative screenshots/critique only when appropriate and reproducible, avoiding private story content. Prefer existing CI/test stack and local runs; do not install costly screenshot SaaS or change unrelated Actions.

## Authority and source baseline

[UX acceptance](../../experience/evidence/validation-plan.md), [Chamber scenario capability map](../../experience/evidence/chamber-ux-validation-bridge.md), [public projection capability map](../../experience/evidence/public-projection-capability-map.md), [critical user journeys](../../experience/flows/key-journeys.md), [selected frontend testing](../../engineering/targets/react-next.md#6-security-diagnostics-performance-and-proof), [time/story correctness](../../time-and-autonomy.md).

Current web manifest includes Vitest, RTL, MSW, Storybook, Playwright-related integration tooling; Storybook has deterministic state fixtures. Main baseline 8c91618 inspected 2026-11-13, but **no test run or visual screenshot inspected in this design pass**. Reconfirm actual source before choosing packet.

Likely apps/web/src/stories/*, existing Play/Stories tests, optional tools/api-integration/test scripts with explicit nondestructive mode and developer-run browser capture. No test of uncontrolled paid provider. Integration calls that reset disposable auth DB require **separate authorization**.

## Acceptance and negative proof

**Normal:** deterministic fixture catalogue covers all distinct current modes, one live-like story/return browser flow can be executed locally without provider charge, reports include actual commands run and exact evidence, accessibility labels and focus order are checked, viewport captures are reviewed against design target.

**Negative:** no claims that “visuals pass” merely because test suite is green; no secret/private data in fixtures/screenshots; browser test cannot call real Storyteller by default; mocked timer cannot assert committed clock; flaky animation snapshots don't mask missing semantics; test coverage must include *one* deliberately false/counterexample state and reject it.

**Evidence exit:** compact matrix of scenarios, actual test outputs, known unproved cases, human visual critique with concrete defects, and next bounded adjustments. If a user study hasn't been done, say “unobserved,” not “intuitive.”

## Handoff

Before Ready, pick the **specific implemented UX surfaces** to test, not a 1,000-fixture speculative catalogue. Cursor adds proof proportional to each. If a component fails human comprehension, return a design problem to the architect; don't tune brittle DOM assertions to manufacture victory.