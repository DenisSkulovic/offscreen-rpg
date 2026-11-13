# UX11 | Browser/Storybook evidence for an actually good game interface

**State: Done (2026-11-13).** Provider-free UX evidence for shipped surfaces: Storybook catalogue, Vitest/axe, portal/demo browser captures, deliberate failure≠empty counterexample. Parent: [experience program](../../experience/implementation-program.md), M4. Evidence: [ux11-visual-evidence-2026-11-13](../../experience/evidence/ux11-visual-evidence-2026-11-13.md).

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

## Landed (2026-11-13)

- Storybook `Experience/UX evidence` catalogue (portal/demo/stage/home + failure counterexample).
- `src/features/ux-evidence/ux-evidence.test.tsx` — axe on portal + StoryFrame; preview opening choice; stories-503 ≠ empty counterexample.
- Browser captures: portal desktop + 375; demo 375 (plus prior PF02 desktop/branch shots).
- Evidence matrix under `docs/experience/evidence/ux11-visual-evidence-2026-11-13.md`.
- Proof: `test:fast` 163 passed. Human comprehension study **unobserved**. No provider spend; no DB reset.
