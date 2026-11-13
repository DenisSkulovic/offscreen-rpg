# Player-visible state and attention | the precise Now contract

**Status:** target presentation architecture; not a new backend enum or permission to change rules. **Existing authority:** [story snapshot DTO](../../../packages/contracts/src/stories.ts), [campaign DTO](../../../packages/contracts/src/campaign.ts), [Play command lifecycle](../../engineering/targets/react-next.md#3-command-error-and-recovery-contract). The user must see the **verified world**, even when transport and generation are imperfect.

## Why an all-purpose status enum is wrong

A story can simultaneously have:
- a previously published passage,
- a committed work record at 3/9,
- an interruption that holds work,
- a freshly published decision,
- a transport request whose acknowledgment was lost,
- a Storyteller report that was delayed.

Selecting **one** “status” discards facts. Treat experience as a **composition of independent axes**; the top-level visual hierarchy is derived from authority and immediate player need.

## Five axes of player truth

| Axis | Exemplary verified values | Authoritative input | Does it change game time? |
| --- | --- | --- | --- |
| **Current situation** | published scene/passages, offered decision, no offer | canonical story snapshot / publication | No; reading content does not |
| **Commitment execution** | none, active, paused, interrupted, blocked, settled, completed with continuation | campaign activity/action/plan events, server revision | Only through admitted work/finite action |
| **System/generation** | preparing required narration, report pending, provider unavailable, allowance blocked | generation/resolution public state | No extra fictional time for model latency |
| **Command transport** | idle, locally submitted, acknowledged, uncertain ACK, rechecking receipt, rejected, confirmed settled | immutable operation intent + server receipt | Only if server actually admitted/settled it |
| **Read freshness** | canonical current, GET refreshing, offline/stale projection, identity changed | Query identity/version + HTTP/SSE state | Never directly |

**Never render transport as fiction.** A browser submit spinner is not “The hero is busy thinking.” A backend projection can be true while an optional report cannot load.

## Attention priority: who/what deserves the stage?

Precedence is not a naive list of backend holds. Use these questions in order:

1. **Is this the correct authorized story/viewer and a verified projection?** If not, show safe loading/auth recovery; never show another user's narrative in suspense.
2. **Is a previously submitted player command unresolved in the browser?** Keep the last verified scene visible but **replace its active choice controls** with an honest frozen-intent status and safe check/retry-if-eligible. The player must not submit a new competing action. If a newer verified snapshot conclusively supersedes the offer, reconcile according to the protocol.
3. **Is there a controlling, published decision that requires attention?** That decision becomes the main interactive surface. Associated interrupted work is supporting context, not an ongoing primary progress display.
4. **Is a required generation/authority/cost problem preventing the next scene?** Show the last committed world state with an explanatory hold and only permitted recovery. Do not fabricate new dialogue.
5. **Is a bounded commitment actively advancing?** The commitment becomes the focal state. Display valid achieved progress and conditional estimate.
6. **Is the story manually paused?** Display the actual pause and what could resume; preserve meaningful present content. If there is also a decision, label the coexistence rather than erasing it.
7. **Is nothing underway and no decision available?** Show the quiet current situation, still-valid offered opportunities if any, and the fact that no time is advancing.
8. **Has the story truly ended?** Preserve last outcome, journal and future options such as reading/forking only when supported.

**Caveat:** these are *visual priority questions*, not a new engine transition graph. A controlling decision and manual pause may coexist. The exact resulting active controls must be derived from server-authorized `canRespond`/holds and supported commands; a UI designer cannot assume a paused decision is selectable.

## Content and action availability by state

| Verified state / local condition | Center stage | Action area | Supporting context | Do **not** do |
| --- | --- | --- | --- | --- |
| Current scene, eligible offer | Published prose; one clearly separated choice zone | Authored choices; optional action detail | Relevant known risk/time | Show debug plan/receipt IDs |
| Menu exploration | Same scene, focused branch of available options | Back / select next intended action | Breadcrumb only if useful | Spend fictional time on navigation |
| One action submitted, ACK pending | Last verified scene + chosen intent | Disabled competing offers; “Checking…” | Last known status | Play guaranteed success animation |
| Lost ACK / uncertain state | Last verified scene + frozen intent | “Check action status”; safe same-body retry only if protocol permits | Recovery reason | New generated operation or auto-reroll |
| Accepted finite action still settling | Known attempted action + actual processing | No new conflicting choice | Clock/receipt only if proven | Treat accepted as completed |
| Active contribution | Character doing work, earned units and next known boundary | Allowed pause/change controls | Relevant conditional next steps | Time fraction = earned fraction |
| Active literal wait | What is being waited for; elapsed in-world duration | Allowed stop/pause | Conditional expected end | Award productivity |
| Active travel, uncertain route progress | Known last position/milestone and remaining estimate if real | Allowed course controls | Known route facts | Animate map position from naive wall-time |
| Interrupted work + decision | New scene and current decision | Respond | Saved work progress shown as **stopped** | Keep background work animation |
| No plan/no offer | Calm current situation and true inactivity | Only if new authored options exist | Journal or settings | Pretend silent AI world ticks |
| Manually paused | Last known scene or work, explicit pause | Resume only if permitted | Preserved remaining time and cause | Clear pause after reconnect |
| Mandatory narration failed after settled check | Source-confirmed result + explanation | Retry narration if explicitly eligible | Last canonical prose | Reapply die/resources or hide result |
| Allowance exhausted | Last settled fiction and precise spending hold | Inspect allowance / approved recovery | Whether quiet work may legally continue | Silent pay-as-you-go model switch |
| Offline/read refresh failed | Visible **last verified** state with stale marker | Refresh GET if available; no authoritative command unless protocol explicitly allows | Current connection | Claim the world is still advancing |
| Ended | Actual final situation | History / supported fork | Known ending state | Offer new moves as if active |

## Priority of alerts

Three separate levels with **exactly one dominant notice** at a time:

- **Critical action-blocking:** unresolved accepted command, permission/auth change, required narration hold, mandatory decision with eligible action, or a true time-sensitive authorized deadline. Never dismiss as irrelevant toast.
- **Contextual but nonblocking:** an old report becomes available, one earned work milestone, activity forecast changes, a new current passage while user reads Journal.
- **Background:** polling, optional historical report, saved settings confirmation, low-level mechanical boundary. Usually no alert; available in Journal/details.

Do not create an inbox badge for every check or a global bell as a proxy for the game being alive. An attention badge represents *required intervention* or a truly relevant committed change, not arbitrary SSE traffic.

## A new passage while the player is reading older text

- New canonical data may arrive via SSE hint → verified GET. It **must not** replace older text under the user's gaze or jerk scroll to bottom.
- If a reader is at the latest stage already, a subtle new-passage transition may be appropriate; focus remains stable.
- If in Journal/history, show a discreet **“New development”** affordance linking to Now. Do not force navigation.
- On the next explicit return to Now, show the current passage and decision, not an intermediate candidate or paid regeneration state.
- Screen-reader status is concise (“A new development is available”) and does not announce ten paragraphs automatically.
- If passage is updated solely to add a late report, do not switch the main scene or imply a new decision.

## Critical distinction: failure placement

### Mechanically settled, narration fails

Show the last verified outcome from public receipts and an explanation that narrative presentation is unavailable. The player can review the record and retry *narration only* if allowed. **No** second dice roll, extra time, reward removal, or unsupported “Continue” control.

### Command not known to have been accepted

Display pending/unknown with immutable intent identity. The next action is receipt/status lookup (not another brand-new command). If a retry is permitted, its semantics require the exact same operation and payload. It may still have cost implications; copy must say so.

### Optional report fails

Do **not** hold active authorized gameplay merely because a decorative story report was unavailable, unless the original domain rule says it was controlling. Present a compact factual milestone instead.

### Data freshness unknown

Distinguish **the story may have moved on** from **the world is definitely stopped**. An offline browser can't assert no background progress. Mark displayed data as last verified and avoid unsourced active countdown guarantees.

## Tiny formal presentation contract (not runtime schema)

Each Now render can derive a presentation result of this conceptual shape:

```text
{
  storyIdentity: viewer/story,
  dataFreshness: verified | stale | loading | unavailable,
  focus: scene | decision | commitment | hold | quiet | ended,
  verifiedPublication: published passage or none,
  visibleCommitment: rule-backed progress/estimate or none,
  controllingIntervention: authorized offered decision or blocker or none,
  frozenLocalIntent: typed immutable command status or none,
  notices: critical?/contextual?/background[],
  primaryActions: server-authorized, stable identity choices/controls,
  secondaryAffordances: Journal/World/You/Settings as applicable
}
```

This is a **design view model**, not an instruction to add a second Query cache, duplicate `StorySnapshot`, or derive executable authority in React. Current server projection and existing command lifecycle remain sources of truth.

## Required fixtures

S01 decision with interrupted 3/9 progress; S02 contribution 3/9 and elapsed time 10 ticks, not 10/9; S03 literal wait; S04 no committed activity; S05 paused action; S06 uncertain ACK across reload; S07 settled check with failed narration; S08 allowance exhaustion; S09 offline with formerly active task; S10 new passage while Journal open; S11 out-of-order GET/old SSE; S12 viewer/story identity switch; S13 expired decision with *no eligible default*; S14 normal optional report arriving late; S15 shared read-only observer who may not act.

For each fixture, capture **one sentence of what a first-time player should believe** and test whether the rendered page communicates it. A TypeScript state machine passing unit tests is not proof the screen's truth is apparent.
