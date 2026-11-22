# FORK01 | Acceptance

No tests executed by planner; all below are executor obligations.

| Gate | Positive | Negative |
|---|---|---|
| Wrapped selected access | `projectHistoricalSituationAuthorization` produces live selected `activityAccess.kind` and expected prepared plans from the captured v2 checkpoint | malformed payload fails parsing, never silently coerced |
| Fork transaction | scene1 fork via existing public Story Engine fork entry commits child, `assertReconstructedV2Matches` returns, source revision2 unchanged | invalid checkpoint hash and malformed checkpoint fail with no child row |
| Historical semantics | child snapshot reflects parent scene1 and not later scene2; same fork id/replay stays idempotent | wrong actor, unrelated source or fork id conflicts do not gain authority |
| No collateral | existing `none` access path passes, no GA/API/schema changes | tests still fail if original raw assignment is restored |
| Live continuation | after merge, TURN03 replays same fork and obtains child, independently advances child, checks parent unchanged | none of this counted PASS until actual kind evidence exists |

**Not authorized:** real external model calls, destructive chaos, worker kill, S3 outage or cluster reset. Recovery matrix stays with TURN03 and its own permission gates.
