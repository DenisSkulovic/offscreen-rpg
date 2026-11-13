# ENG09 playability probe | mid-flight holder change | 2026-11-13

**Status:** source + disposable SQL evidence only. **No recovery implementation.** Baseline `main` after ENG08.

## Method

Extended `packages/application/test/eng01-item-transfer.live.test.mjs` mid-flight case: admit `give-compass`, mutate `story_item.holderKey` to `thief`, advance due boundary, then assert public snapshot and campaign row fields beyond “no receipt.”

Command actually run: `pnpm --filter @offscreen/application exec node --test test/eng01-item-transfer.live.test.mjs` (pass).

## Observed after interruption

| Surface | Result |
| --- | --- |
| Item holder | remains `thief` (transfer correctly refused) |
| `actionExecution` | `null` |
| `actionReceipts` | empty |
| `actionExecutionEvents` | includes `interrupted` for the operation |
| `campaign.offer` | `null` (cleared at admission; never restored) |
| `holds` | `[]` (no decision / storyteller / world-obligation hold) |
| `activityAccess` | `none` |
| `activity` | `null` |
| Story `decision` / `waiting` / `resolution` | all `null` |
| `campaign_consequence` rows for story | **0** |
| `activeActionOperationId` | `null` |

## Conclusion

The suspected product dead-end is **confirmed** for this fixture: interruption is mechanically correct and leaves **no playable offer and no inspectable recovery control**. Existing world-obligation interruption paths that fire consequences are **not** engaged here because no controlling obligation exists.

## Legitimate design decision still required (ChatGPT / owner)

Pick **one** idempotent, source-grounded reentry contract before Cursor implements ENG09, for example:

1. Admit an `action-interrupted` consequence / Storyteller follow-up keyed to the interrupted execution identity, with spend/hold policy and failure retention; or
2. A typed recoverable blocker/hold with an existing recovery command that reopens a fresh authorized offer after rechecking item state.

Do **not** reauthorize the stale transfer offer or invent a free UI Continue. Until that choice lands in the ENG09 packet, implementation remains correctly NOT Ready.
