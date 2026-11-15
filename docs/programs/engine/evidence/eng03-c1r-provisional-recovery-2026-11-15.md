# ENG03-C1-R evidence | provisional read policy + same-G rearm

**Date:** 2026-11-15. **Change:** [ENG03-C1-R](../../../changes/archive/2026-11/eng/2026-11-15--eng03-c1-provisional-recovery/CHANGE.md). **Provider spend:** none.

## What landed

- Public snapshot joins `generation.kind` + `storyteller_context_capture.state`.
- Provisional `storyteller.context-capture.v1` always projects `canRetry: false`.
- Held exhausted provisional projects safe blocker `{ kind: 'generation', recovery: 'operator' }` with `reason: null`.
- Additive migration `0006_eng03_c1r_provisional_recovery`: `rearm_epoch` + `storyteller_context_capture_rearm` audit table.
- Application-private `rearmContextCapture` resets attempts once (epoch 1), enqueues original `campaign.consequence.v1` wake, preserves G/capture SHA; no Admin UI.

## Proofs run

| Command | Result |
| --- | --- |
| `node --test packages/application/test/eng03-c1r-provisional-recovery.test.mjs` | 3/3 pass |
| `node --test packages/application/test/eng03-c1r-provisional-recovery.live.test.mjs` | 3/3 pass (disposable sandbox) |
| `node --test packages/application/test/eng03-context-capture.test.mjs` | 6/6 pass |
| `node --test packages/application/test/eng03-narrow-capture.live.test.mjs` | 7/7 pass |

## Negatives covered

- Non-exhausted capture denies rearm (`rearm_ineligible_state`).
- Live lease denies rearm (`lease_live`).
- Duplicate `rearmId` is idempotent; second distinct epoch after promote conflicts.
- No DocumentStore / provider calls in this Change.

## Remaining

- ENG03-C2 interrupted-action capture still Proposed.
- Admin-granted operator endpoint / Control UI not in scope.
