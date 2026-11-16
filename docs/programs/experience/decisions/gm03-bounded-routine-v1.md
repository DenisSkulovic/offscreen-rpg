# GM03 | One real bounded routine, without an autoplay engine

**Status:** selected **pilot recommendation** for owner review, 2026-11-15; no code authorized. Parent [temporal alternatives](../foundations/temporal-philosophy.md) still governs the long-term choice. [GM03 Change](../../../../work/changes/open/2026-11-13--gm-standing-life/CHANGE.md) remains Proposed. This is an **offline deterministic product experiment**, not the full standing-life product.

## 1. Fixture decision and existing-rule constraint

**First family:** a world-authored **quiet lookout shift** with one deterministic extended `clock-wait.v1` process per iteration, at an explicitly known stationary watch post. It is a new **one-setting offline fixture** with a valid authored process; **not** generic travel/combat/social interaction. The character must have a server-authorized location, availability, and primary capacity. At the end of each completed watch interval, record a meaningful factual shift completion, not a newly discovered NPC, unearned money or automatic relationship gain.

**Important:** the existing Seyda Neen warehouse shift is **not** a valid repeat target. Actual `packages/storyteller/src/fixtures/mechanical/seyda-neen.ts` marks `work-warehouse-shift` with `occurrence:{kind:'limited',scopeKey:'seyda-neen-warehouse-shifts',limit:1}` and a one-time 6-septim payout plus `warehouse-shift-available=false`. Repeating that shift under a new routine would be a double-reward bug. Never silently relabel a limited activity to unbounded as part of GM03.

**Proving fixture terms:**

| Term | V1 accepted policy |
| --- | --- |
| Activity family | `quiet-watch.v1`, one authored process only, repeatable occurrence with **no collectible completion reward**, no provider narration per loop |
| Segment | 600 fictional seconds of watch, existing deterministic `clock-wait.v1` semantics; exact pace comes from current campaign policy, not a new tick |
| Max repeats | **3** completed eligible intervals, numbered 0..2; each child activity/ledger identity unique |
| Hard horizon | `acceptedAtGameSecond + 1800` fictional seconds, never extend after admitting; **minimum** of limit and hard horizon wins |
| First authorization | Owner explicitly selects an available "Keep watch up to three intervals" offer; stored bound and preview read back before acceptance |
| Before every next interval | Revalidate story/actor/location/capacity, active offer/standing permission, required tools/facts, rules version, current holds, pending world obligations and manual pause |
| Stop | 3 completions, horizon, new controlling published decision, event interruption, changed eligibility, unavailable capacity, conflict or manual stop |
| Model and cash | $0 for the loop; no Storyteller call to make up ordinary events |
| Public effect | Real completed interval(s), current elapsed game time, exact stopped reason. No fabricated "world kept living" beyond the admitted watch |

**Avoid the fake pilot:** A static count-up of three scheduled timers isn't sufficient unless each interval has its own persistent accepted activity, authoritative clock advancement, unique completion and source-backed public progress. The fixture should feel boring in the correct way: ordinary duty can pass quietly; novel events must be earned by actual authored world conditions, not an automatic free LLM surprise.

## 2. Selected lifecycle and ownership

~~~text
Player explicitly reviews finite watch routine
  -> story lock: verify exact current authored process and permissions
  -> store one standing intent with source offer/revision, actor, max=3, H, rule ID
  -> start child activity #0 by existing admitted process machinery
  -> normal scheduler executes eligible deterministic time/checks
  -> child completion, same story transaction:
       record event/receipt exactly once
       evaluate stop horizon, consent, pause, interruption and eligibility
       if safe + index <3: admit child #1 or #2 using same captured process
       else: terminal standing status and truthful stop reason
  -> no further time accrues without another explicit accepted player policy
~~~

**Suggested strict private record (illustrative, not a new general scheduler):**

~~~text
standingRoutineV1 {
  version: 1, id: UUID, storyId: UUID, actorOwnerId: ID,
  sourceOfferId: UUID, sourceRevision: PositiveInt,
  process: validated immediateActionPlan(process, quiet-watch.v1),
  acceptedAtGameSecond: NonnegativeInt,
  horizonGameSecond: PositiveInt,
  maxIterations: 3,
  completedIterations: 0|1|2|3,
  currentActivityId: UUID|null,
  state: 'active'|'held'|'complete'|'horizon-reached'|'cancelled',
  stopReason: bounded enum|null,
  ruleVersion: string,
  revision: NonnegativeInt,
}
~~~

Do not persist the player's raw request as an executable scheduler script. The `process` is a validated, authored immutable plan. Use UUID operation IDs and existing `gameActivity` + `gameActivityEvent` records for each child; do **not** modify completed child identities. A unique compound key `(standingRoutineId,iterationIndex)` or equivalent exact idempotency check prevents double child admission when two wakes race.

**Authority at each boundary:** Existing accepted chains `packages/application/src/campaign/accepted-plans.ts` already enforce finite horizon/entries and `activities.ts::settleAcceptedPlanBoundary` rechecks `campaignSituationAuthorization`, `immediateActionAvailable`, `processOccurrenceAvailable`. This is the *correct shape to reuse*, but the accepted plan currently has 2–6 **explicit** entries, distinct from a standing loop. Before writing a new standing row, conduct a side-by-side provider-free prototype using a 3-entry existing itinerary of identical legally repeatable watch steps. If that proves equal user value and correct boundaries, **cancel GM03 new engine code** and ship only an approved short-plan UX. Do not implement architecture for architecture's sake.

If a new standing row is genuinely needed, integrate only at the common activity completion and campaign permission boundary. No extra global worker, independent clock, new event bus, hidden timer, or LLM decision maker. A nominal "repeat" becomes illegal if the plan's occurrence is limited, the activity is already complete with one-time rewards, or the Storyteller published a controlling new choice.

## 3. Offline absence contract and clear copy

Player sees before accepting:

> Keep watch for up to three 10-minute fictional intervals (30 minutes total), while eligible. Stop if an event requires a decision or conditions change. No other action is authorized and this does not spend model credits.

**Do not confuse the 10-minute fictional interval with 10 real minutes.** Show calculated real-time estimate using the story's selected pace and acknowledge it may change if pause/pace policies allow. No daily recurrence, no jobs queue extending after 30 fictional minutes, no fictional time while uncommitted.

On return, read ledger and describe exactly: "Two watches completed. The routine stopped when a new decision required you." If the third never started, don't report it as completed or charge resources. If no events occurred, state that nothing else advanced. [GM05](../../../../work/changes/archive/2026-11/experience/2026-11-13--gm-return-event-projection/CHANGE.md) projects only meaningful committed events, not one UI event per clock tick. [GM06](gm06-viewer-open-baseline-v1.md) may later label the window since opening, but isn't a GM03 dependency.

## 4. Falsifiable test ladder

- **Baseline:** compare one accepted watch vs three explicit accepted-plan entries vs the new routine, same 3×600 seconds and same initial world, with eight real hours of user absence. Ask what the player expected to happen after one and after three completions. If a simple itinerary is already credible, refuse scope expansion.
- **Happy:** exactly 3 unique child activity IDs, three actual committed 600-second segments, total 1800 fictional seconds, original horizon honored, no model call, no extra after stop.
- **Event:** world obligation due during first watch cuts at the exact allowed boundary; second child never begins while controlling decision/hold exists. No fake successful later iteration.
- **Manual intervention:** pause before child #2, revoke future routine; preserve first completion and no additional fictional time; revocation does not retroactively undo work.
- **Eligibility:** location changes, required fact/tool gone, capacity occupied, settings/rules changed, prior limited occurrence, source offer stale; no new child.
- **Concurrency:** repeated scheduler/outbox events and two workers after #1 complete produce one #2 only, with no duplicate progress/receipt/time.
- **Failure:** worker restart, DB unavailable, provider disabled, story snapshot stale, budget unavailable: no unknown automatic paid call, no implicit character choice; show held reason.
- **World neutrality:** engine contract refers to an authored process identity, not a human occupation/calendar/paycheck. A future nonhuman adaptation remains possible without adding GM03 code.

## 5. Hard stop/gate

Do not ship GM03 as "standing life" until **(a)** provider-free comparison proves a meaningful difference from accepted itinerary, **(b)** correct start/revalidation/stop is implementable without a second scheduler, and **(c)** the owner approves this quiet-watch first fixture. That preflight could legitimately **cancel** the new code-bearing Change. If it survives, approve **only one bounded GM03 packet** with explicit disposable SQL tests. Never introduce a global routine tick or endless paid agent loop.
