---
name: player-experience-design
description: Design or review an Offscreen RPG player-facing screen, narrative interaction or return experience against actual states and the product vision, not generic React/UI advice. Use for meaningful UX changes, not a CSS typo.
---

# Player-experience design

**Trigger:** New/changed Play, Story creation, return/chronology, status, waiting, resolution or recovery UI; or a player says the experience feels like debugging a backend. This skill produces a **focused UI contract and acceptance scenario**; implementation belongs in a separate coding slice.

## Ground the screen in the actual game

Read only the relevant portions of `docs/player-experience.md`, `docs/gameplay.md`, `docs/technical/solo-gameplay-contract.md` and `docs/engineering/qa-journeys.md`. Source routes are in `apps/web/app/` and `apps/web/src/features/`; use `docs/engineering/code-navigation.md` to find the actual owners.

The intended UI is a place to **inhabit a character's situation**. A current scene and the available interaction lead; possessions, mechanics, event history and developer traces are secondary unless the player explicitly opens them. Quiet life must not become a mandatory escalation carousel. A debug state machine is not a player-first hierarchy.

**Never invent state authority:** UI reads public server projections, submits authorized commands, and shows genuine pending/settled/blocked states. An offered choice can be narrative, a finite mechanical action or an extended activity. Prose does not earn resources or travel time; a timer's wall-clock delay is not automatically fictional effort; a generated candidate is not a published passage. The `/demo` browser-only script is a presentation prototype, **not** proof of the real Story mode.

## Design against concrete state paths

Choose the smallest relevant subset from this experience matrix:

| State or journey                        | Player must understand                                                            | False impression to prevent                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| First visit / no stories                | What this game promises; how to create a premise                                  | An enormous rules dashboard before seeing the experience                 |
| Opening review / Start                  | Which beginning, choices and profile are being accepted                           | A preview that has already altered live canon                            |
| Current scene / menu                    | What's happening, what is known and what can be chosen                            | Identical options or hidden outcomes leaked as public fact               |
| Accepted timed work                     | The commitment, progress and when its result becomes real                         | Progress or rewards already earned at selection                          |
| Generation pending / failed / uncertain | Whether the choice was accepted, what is saved, what can be retried               | Refresh triggers a paid retry; failed narration undoes settled mechanics |
| Return after absence                    | A concise recap, meaningful changes, present situation and required next decision | Hundreds of equal-weight activity ticks or invented autonomous decisions |
| Pause / quiet interval                  | Whether the world is held, advancing or waiting for permission                    | An idle menu quietly spending game time or money                         |

For the chosen screen, specify visual/reading order, primary action, secondary disclosures, empty/loading/blocked states, keyboard/focus/a11y expectations and one narrow/mobile contrast. A map/image is optional and must not delay play or expose unseen world knowledge. Different profiles can be quiet, comic or eerie; don't impose one artistic mood at engine level.

## Output and review

Return a **screen contract** with: (1) user intent, (2) primary hierarchy, (3) state-to-copy/action table for only affected states, (4) specific source/components to adjust, (5) one representative offline fixture journey and one human visual/interaction question. An implementation agent receives these links and the current selected feature checkpoint, **not** a pasted copy of every product/technical document.

Review screenshots/actual browser behavior only when available and explicitly exercised. Do not claim visual acceptance from reading TSX. Keep Storyteller inference disabled unless separately authorized. If an aesthetic idea conflicts with a game/time/persistence contract, flag it to the architect instead of silently changing mechanics.
