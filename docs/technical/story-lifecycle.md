# Story creation, control and completion

This document connects account entry, collaborative setup, the first live scene and the end of a story. [Execution](execution.md) defines how accepted commands run; it must not leave creation and recovery to unrelated ad hoc endpoints.

## Drafts and generated previews

The implemented private draft uses `PUT /api/drafts/:id` with three text fields and `expectedRevision`. The browser assigns a UUID retained in the new-draft URL before the first save; revision zero creates it. Ownership comes from the verified session. Updates lock the owned row and compare its revision. An identical retry at the same or immediately following revision returns the existing result; older or conflicting writes return 409. This protects draft text without introducing a gameplay command journal. `GET /api/drafts/:id` reopens an owned draft; `GET /api/drafts` pages through up to 20 drafts in creation order using an owned draft ID as cursor. Inaccessible drafts return 404.

Ordinary editing is a database write, not a model call. Incomplete content is saveable; generation readiness is a separate validation boundary. Shared setup will introduce participant character inputs and creator-controlled preferences when invitation and authority policies are implemented. It must preserve revision checks rather than silently overwrite another participant's work.

The planned integrated generate flow freezes the draft revision, roster/character revisions, settings and funding policy into an immutable input artifact. It must create a generation operation and outbox start notice in one transaction when dispatch is connected. Use a distinct workflow ID for each deliberate preview-generation operation; retries reuse that ID. Limit outstanding preview generation per draft and account. An intentional regenerate request is new work, not a retry disguised as a fresh idempotency key. Exercise this with scripted generation and simulated allowance before paid services are enabled.

Generation produces a candidate preview with its source revision. It does not yet insert the opening into the live chronology, transfer possessions or start a response window. The preview operation can be pending, successful, failed or no longer current while the draft remains editable. Returning after closing the tab retrieves the same operation and candidate rather than generating again.

The implemented opening application module persists a request and its exact input before processing, and saves its validated prose result. An idempotency ID identifies the request: reuse with another draft/revision conflicts, while a genuine retry still returns its original request after editing the draft. Admission locks the draft and updates its latest-operation link in the same transaction. A second unresolved operation for that draft is rejected as busy.

The browser's scripted preview uses `PUT /api/drafts/:draftId/openings/:id` with `expectedRevision`, and `GET /api/drafts/:draftId/openings/latest` to reopen it. Both require the draft owner's session; writes also require the configured origin. Public DTOs expose source revision, currentness, state and opening text, never internal prompts or attempt IDs. Unsaved edits must be saved before navigating from the editor; concurrent edits can still make the preview stale. No Start action is offered.

`opening.scripted.v1` is a separate, fixed fixture kind. Admission inserts an outbox notice with the captured request and latest-preview link in one transaction. The API returns 202; it does not complete the sample itself. A Temporal workflow calls an idempotent Activity that atomically saves the known output for a pending request. A repeated Activity returns the saved success. There is no external side effect, running claim or model call in this fixture; preserve its versioned output during recovery. Its retry policy must not be copied to paid calls, which require the generic claim/uncertainty rules below. The UI labels the sample as not adapted to the premise, checks pending status for a bounded period and can reopen it after leaving the page.

The common lifecycle is `pending` -> `running` -> `succeeded`, `failed` or `uncertain`. A claim atomically records a caller-supplied attempt UUID; only one concurrent claim succeeds. Replaying a claim, even with the same attempt UUID, does not authorize another call. Replaying an identical saved outcome is safe; a conflicting result or a different attempt cannot overwrite it. Output validation occurs before a success is saved. Failure stores a bounded machine code, not raw provider exceptions or private content.

An unstarted pending request can be claimed after restart. A running request whose process vanished remains unresolved: there is no expiring lease that silently authorizes another paid call. A supervisor can mark its known attempt uncertain, and later establish success or failure for that same attempt. No automatic reconciliation is implemented. A late timeout report cannot replace a saved success. This conservative behavior trades availability for avoiding blind repeats; it is not a claim of exactly-once provider billing. Future orchestration must handle the crash between recording a claim and sending a request as potentially uncertain too.

The output is insufficient for Start: the first live decision/interval and relevant group, pace and autonomy policies must be defined and reviewed before initialization is implemented. See [storyteller runtime](storyteller-runtime.md) for the opening contract. Spending limits and account-wide concurrency admission must precede public or paid generation. A worker must check whether the input is still relevant before spending; storing stale results does not make them current.

Changes to participating characters, premise or shared play settings make an incompatible candidate unstartable. Keep the old candidate available for comparison only if useful during editing; do not present it as the current opening. A late provider result cannot replace a newer candidate. A stale or cancelled result can still have incurred usage, which stays attached to its operation.

Readiness refers to the exact draft/preview and roster being accepted. A friend changing their character invalidates relevant readiness. The final UI for readiness is a product choice, but a boolean left true across arbitrary edits is not sufficient.

## Start exactly the reviewed story

A start command includes the candidate ID and expected draft/roster/settings revisions. Under the story lock, verify authority, participant readiness according to the chosen group policy, current funding eligibility and that no live execution has been initialized. Save a unique start receipt and freeze the selected candidate. Block further draft edits while start is pending and expose its status/recovery action; do not allow a second start or simultaneous editing to race initialization.

The outbox relay starts the live workflow once. Its initialization Activity rechecks lifecycle and the frozen start receipt, commits the opening and initial decision/interval, and returns the actual publication time and next timing. Only that transaction activates progression. If Temporal is unavailable, display starting/pending and retain the preview; do not show a countdown for a story that has not begun.

A duplicate start, including a retry after Activity acknowledgement loss, returns the existing opening. An expired notification, a late creation result or a relay retry cannot initialize another live story with the same identity. Finished stories are not restarted by the generic start path.

## Distinguish lifecycle from interruption

Use a small lifecycle such as draft, live, finished and deleting. Track operation progress separately. For a live story, manual pause and a system blocker are independent: a player can pause a story already blocked by budget, and replenishing its allowance must not clear that pause.

The current live phase identifies a quiet interval, a decision awaiting input or an outcome being resolved. The snapshot exposes this together with manual pause, any blocker, pending commands and permitted actions. Derive presentation labels from those fields instead of storing contradictory booleans such as running and finished together.

| Condition | Visible behavior and recovery |
| --- | --- |
| Manual pause | No progression; authorized resume preserves remaining time and any independent blocker. |
| Insufficient generation allowance | Show the limit/reason; permit a valid saved continuation or hold. A recovery command rechecks funding before more generation. |
| Invalid output or exhausted provider retries | Keep the committed situation. Offer bounded retry where authorized; do not reapply the last effect. |
| Unresolved external billing outcome | Show generation held; retain its reservation until reconciled. Ordinary retry cannot bypass it. |
| Missing participant policy or no permitted autonomous response | Hold the affected resolution and identify what input/authority is needed. |
| Delayed processing/service unavailable | A received command remains pending; do not mislabel it as completed or as a player's manual pause. |

Entering a progression blocker preserves remaining time through the same timing rules as a hold. Recommended first behavior is explicit resume/retry after a material blocker clears, so a story does not unexpectedly restart hours after the player left; whether to offer automatic recovery remains a product choice. Reading a story, choosing to pause and checking operation status must not themselves need inference budget.

If a decision was sealed before generation failed, retry the same frozen resolution. If a product action permits changing that intention instead, explicitly abandon the resolution, fence its attempts and issue a new decision/version; do not mutate a sealed input behind a retry button.

If a deadline expired with no permitted default, recovery cannot simply unpause an already expired button. An authorized request for fresh input reissues the decision version and a new response window, preserving previously accepted intentions only where the situation still makes them valid. Old notification actions remain expired. Make this explicit in the recovery UI rather than leaving a permanently blocked decision.

## Membership and settings changes

Recommendation for the first playable scope: invite/join during the draft; defer adding or transferring character control during live play. Participants must still be able to leave or lose access. Revocation takes effect immediately for reads, commands and pending deliveries, even when Temporal is down. It increments the access/control version so in-flight results cannot ignore changed authority.

Leaving does not silently kill, delete or transfer the character. Apply an explicitly agreed continuation policy or hold the group until one exists. Owner departure/account deletion likewise needs a defined retain/transfer/delete policy before that user-facing action ships. The application must not trap someone in access merely because the narrative consequence is unresolved.

Shared settings change through versioned commands. Capture which settings apply to each published decision and generation. A change in contact preferences is personal and takes effect for future unsent deliveries; changing group tone, pace, autonomy or funding affects the group and needs the selected authority. Neither a membership tier change nor a preference change rewrites committed history or silently changes the payer for an in-flight request.

## Finish and delete

Finishing is an application transition: atomically commit the conclusion, mark the story finished, close/invalidate outstanding decisions, fence prepared results and create any final report intent. The workflow then completes at a safe boundary. If it crashes after the database commit, retry returns that same conclusion. No further storyline generation is scheduled.

Finished stories remain readable; presentation-only work such as a recap or final illustration may complete within its separate budget and must not reopen the story. Character death does not automatically mean the whole shared story is finished; that is a narrative/product decision. Carrying survivors into another story is outside the initial implementation.

Deleting first removes access and fences writes in PostgreSQL, then reliably requests workflow shutdown and cleanup. Generation/media Activities recheck the deletion fence before attaching artifacts; orphaned objects are cleaned up. Keep a minimal deletion marker/operation identity long enough to prevent delayed work from recreating removed data. Do not delete the only record needed to reconcile an outstanding external charge.

The presentation of finished stories, player departure rule, owner-deletion policy and automatic recovery preference remain product decisions in [open questions](../questions.md). The technical contracts above ensure those choices can be implemented without guessing or losing state.
