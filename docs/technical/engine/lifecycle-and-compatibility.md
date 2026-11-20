# Story creation, control and completion

**Target lifecycle on the Storyteller evolution branch:** prepared **Play** or one Story Prompt creates a durable launch operation whose successful first publication is immediately playable. The legacy draft → generated preview → Start sequence is compatibility/migration behavior, not the target lifecycle.

**Find the section:** [five owners](#five-owners) · [forking and state copy](#forked-continuities) · [draft and preview](#drafts-and-generated-previews) · [reviewed Start](#start-exactly-the-reviewed-story) · [pause versus lifecycle](#distinguish-lifecycle-from-interruption) · [membership/settings](#membership-and-settings-changes) · [finish and delete](#finish-and-delete). Read the relevant section rather than loading this entire document.

## Five owners

These owners stay distinct. The sections below keep their existing detail.

- **Story lifecycle.** Draft, live, finished, and deleting stay separate from pause and blockers. See [Distinguish lifecycle from interruption](#distinguish-lifecycle-from-interruption).
- **Command identity.** A retry reuses the captured operation identity. A new intention is a new identity. See [Drafts and generated previews](#drafts-and-generated-previews).
- **History cursor.** A draft revision and a story revision fence writes. An older cursor does not overwrite a newer one.
- **Effects.** A settled reward stays settled. Narration does not grant it again. See [Stable meanings](../../product/gameplay/actions-and-commitments.md#stable-meanings).
- **Fork and compatibility.** A fork is a new story at one committed checkpoint. See [Forked continuities](#forked-continuities). Workflow replay keeps the earlier command history. See [Workflow replay compatibility](#workflow-replay-compatibility).

An uncertain retry reconciles the existing generation and receipt. It does not reroll a settled reward, and it does not publish an outdated generation under a new identity. The proved short-lock subset is [What C1 and C2 actually proved](concurrency-and-recovery.md#what-c1-and-c2-actually-proved). Full ENG03 stays proposed.

## Forked continuities

A fork begins from one exact **published scene boundary**. The child references that scene's immutable Library root, fictional-state frontier, clock, effective creative/rule pins, choices and admitted active fictional commitments. It creates a new branch/story identity and fresh operational ownership.

Already-settled fictional outcomes remain settled. Unresolved admitted plans/offers/obligations remain unresolved and are rehomed under the child's execution identity. Parent provider attempts, worker leases, billing reservations, external side-effect identity and any parent/sibling future are not copied.

Legacy scenes that lack sufficient historical semantic state remain viewable but are not retroactively fabricated into fully forkable checkpoints. New publication must satisfy the stronger invariant by construction.

## Drafts and generated previews

A private prompt/customization draft is optional convenience. It may be saved without spending or creating a playable story. It is not a required intermediate lifecycle.

Target launch does not require a human-reviewed generated preview. The operation captures the exact Story Prompt or prepared-experience root, effective customization and authorization, then publishes the first admitted scene. Legacy preview records remain readable only where retained data or migration requires them.

## Scripted chamber initialization

The chamber is a separate authored fixture, not a generated preview converted into live play. The immediate conversation uses `PUT /api/stories/:id/chamber` with `{ scenario: "chamber.v2" }`. It requires a verified owner and configured write origin. The server selects the content, and initialization returns a saved snapshot. The earlier `chamber.v1` fixture remains readable and retryable with its original source/content; it does not accept responses. New fixtures use new IDs, never reset existing history. The default browser fixture is `chamber.v3`: a timed courtyard visit. Its first choice saves a waiting passage; after 20 real seconds representing ten fictional minutes, the worker publishes arrival and a greeting choice. The immediate conversation remains selectable.

`GET /api/stories/:id` reopens an owned snapshot. `/chamber` assigns and retains an ID in its URL before starting. The snapshot's `canRespond` flag reflects the implemented resolver and current offer; it is a presentation hint, never client authority. Normal authentication remains required. Tests use existing disposable sessions rather than a public login bypass.

`PUT /api/stories/:id/responses/:operationId` accepts only an expected revision and a submission referencing the published interaction. For the supported authored fixture, a pure server policy selects the proposed next passage from the base revision and option ID. The common continuation transaction validates the current offer, saves the answer and consequence, and rejects stale or conflicting writes. Retrying the same request proposes the same content even after later progression and returns the current snapshot. The browser retains the operation ID on an uncertain response, offers retry/reload, and refreshes the snapshot on conflict. Earlier history is read-only.

`PUT /api/stories/:storyId/resolutions/:operationId` admits a selected generated option for a live story created from a playable candidate. The body is the same expected revision and interaction submission; the browser does not send intentions, proposals or prose. Admission recovers the hidden intention from the persisted generation named by the current passage's `sourceGenerationId` and `sourceGenerationPart`, freezes `preparePlayableContinuation(...)` into a `continuation.playable.scripted.v1` generation, stores `story_resolution`, and returns 202 with the current snapshot. `resolution` is `pending`, `running`, `failed` or `uncertain` while that generation remains attached to the current passage. After the next passage commits, ordinary snapshot state is authoritative and `resolution` is null. A timed result leaves the story waiting with no current interaction until the prepared arrival publishes. Identical operation retries are idempotent; a different option or reused operation identity with different input conflicts. Hidden intentions and provider-request internals stay off the public DTO. Generated options are `canRespond` while no resolution is active. Chamber fixture responses remain on `/responses/...`.

Immediate choices resolve synchronously with short database work and no external calls or pending generation. The timed departure also commits synchronously, including its durable wait/outbox notice; 200 confirms departure was saved, not arrival. Immediate choices return 200 after commit and do not create an idle Temporal workflow. A timed departure starts the bounded interval executor. This does not replace the durable inbox/202 contract for asynchronous gameplay work. When asynchronous decision resolution or generation is connected, admission, control fences and asynchronous status must be integrated before offering those operations. The fixture resolver cannot process arbitrary generated stories; no client or model can supply outcome prose through this endpoint.

The first playable branch approaches a gate, offers a reply and ends with a joke or departure. It tests persistent narrative consequences, not item transfers or a lifecycle-wide terminal flag. The timed visit adds automatic arrival and saved journey pause/resume; pace changes remain absent. The selectable `chamber.v4` gate reply publishes a 15-second response deadline and defaults to leaving; its response window cannot be paused. A null interaction is not a universal definition of a finished story. The page shows identifiers/revision and an on-demand chronology reader. The selectable `chamber.v5` letter fixture initializes one item and offers delivery or keeping it. Its immediate consequence commits the expected-holder transfer atomically with prose and exposes the resulting holder on reload. Selecting a generated opening option now admits asynchronous scripted continuation rather than the fixture responder.

`PUT /api/stories/:id/controls/:operationId` accepts `{ intervalId, expectedControlRevision, action: "pause" | "resume" }` for a controllable current journey. It requires the owner session and configured origin, returns 200 after the control transaction commits, and rejects stale or inapplicable controls with 409. An identical operation retry returns current state even after later controls; changing its request conflicts. The browser retains the operation ID for uncertain retries and refreshes on conflict. The snapshot's monotonic `viewVersion` orders both polls and command responses, including control changes without new prose. Paused journeys continue to be polled so another device's resume is visible. These controls do not pause an open decision or an in-flight generation.

## Start exactly the reviewed story

Target **Play** starts exactly the captured launch inputs and publishes exactly one admitted opening. There is no separate reviewed-preview object whose later Start may silently regenerate.

Idempotent retry uses the same durable launch identity. Provider uncertainty, HTTP loss or process restart recovers that operation; it must not create a second story or second paid attempt. The first scene's fictional clock is established by admitted fiction, not by elapsed provider or queue time.

## Distinguish lifecycle from interruption

Use a small lifecycle such as draft, live, finished and deleting. Track operation progress separately. For a live story, manual pause and a system blocker are independent: a player can pause a story already blocked by budget, and replenishing its allowance must not clear that pause.

The current live phase identifies a quiet interval, a decision awaiting input or an outcome being resolved. The snapshot exposes this together with manual pause, any blocker, pending commands and permitted actions. Derive presentation labels from those fields instead of storing contradictory booleans such as running and finished together.

| Condition | Visible behavior and recovery |
| --- | --- |
| Manual pause | No progression; authorized resume preserves remaining time and any independent blocker. |
| Insufficient generation allowance | Show the binding window/funding limit and eligible time when known; preserve saved results or hold required progression. Explicit Resume rechecks every limit; no implicit on-demand charge. |
| Invalid output or exhausted provider retries | Keep the committed situation. Offer bounded retry where authorized; do not reapply the last effect. |
| Unresolved external billing outcome | Show generation held; retain its reservation until reconciled. Ordinary retry cannot bypass it. |
| Missing participant policy or no permitted autonomous response | Hold the affected resolution and identify what input/authority is needed. |
| Delayed processing/service unavailable | A received command remains pending; do not mislabel it as completed or as a player's manual pause. |

Entering a progression blocker preserves remaining time through the same timing rules as a hold. The prepared [usage policy](../platform/spending-and-entitlements.md#hold-and-recovery-semantics) selects explicit Resume after usage recovery by default; separately opted-in automatic recovery still rechecks all authority and cannot clear manual pause or uncertainty. No held-time catch-up work is awarded. A usage-window reset changes eligibility, not lifetime funding or the accepted intention. Reading a story, choosing to pause and checking operation status must not themselves need inference budget. These window/recovery controls remain unimplemented.

If a decision was sealed before generation failed, retry the same frozen resolution. If a product action permits changing that intention instead, explicitly abandon the resolution, fence its attempts and issue a new decision/version; do not mutate a sealed input behind a retry button.

If a deadline expired with no permitted default, recovery cannot simply unpause an already expired button. An authorized request for fresh input reissues the decision version and a new response window, preserving previously accepted intentions only where the situation still makes them valid. Old notification actions remain expired. Make this explicit in the recovery UI rather than leaving a permanently blocked decision.

## Membership and settings changes

The distant small-party aspiration can include an invited friend. It is not the solo first-playable milestone. The exact live acceptance for invite and join is Proposed/Blocked. This page does not implement that invitation. Adding or transferring character control during live play stays deferred. When a story has more than one participant, each participant must still be able to leave or lose access. Revocation takes effect immediately for reads, commands and pending deliveries, even when Temporal is down. It increments the access/control version so in-flight results cannot ignore changed authority.

Leaving does not silently kill, delete or transfer the character. Apply an explicitly agreed continuation policy or hold the group until one exists. Owner departure/account deletion likewise needs a defined retain/transfer/delete policy before that user-facing action ships. The application must not trap someone in access merely because the narrative consequence is unresolved.

Shared settings change through versioned commands. Capture which settings apply to each published decision and generation. A change in contact preferences is personal and takes effect for future unsent deliveries; changing group tone, pace, autonomy or funding affects the group and needs the selected authority. Neither a membership tier change nor a preference change rewrites committed history or silently changes the payer for an in-flight request. Who may commit a shared action, and what happens on stale, late, or withdrawn consent, stays Proposed in [the consent and resolution matrix](../../../work/designs/open/shared-play/CONSENT-AND-RESOLUTION-MATRIX.md#matrix).

## Finish and delete

Finishing is an application transition: atomically commit the conclusion, mark the story finished, close/invalidate outstanding decisions, fence prepared results and create any final report intent. The workflow then completes at a safe boundary. If it crashes after the database commit, retry returns that same conclusion. No further storyline generation is scheduled.

Finished stories remain readable; presentation-only work such as a recap or final illustration may complete within its separate budget and must not reopen the story. Character death does not automatically mean the whole shared story is finished; that is a narrative/product decision. Carrying survivors into another story is outside the initial implementation.

Deleting first removes access and fences writes in PostgreSQL, then reliably requests workflow shutdown and cleanup. Generation/media Activities recheck the deletion fence before attaching artifacts; orphaned objects are cleaned up. Keep a minimal deletion marker/operation identity long enough to prevent delayed work from recreating removed data. Do not delete the only record needed to reconcile an outstanding external charge.

The presentation of finished stories, player departure rule, owner-deletion policy and automatic recovery preference remain product decisions in [open questions](../../../work/designs/open/product-open-questions.md). The technical contracts above ensure those choices can be implemented without guessing or losing state.

## Workflow replay compatibility

A sleeping, travelling or working character can outlive a code upgrade. Temporal replays the earlier command history, so a worker that changes that command sequence is non-deterministic even when TypeScript builds. A workflow name ending in `V1` is not a deployment pin.

**Selected first proof:** keep new workflow code backward compatible and replay real recorded histories from a disposable local Temporal service, including a still-sleeping workflow and a completed one. `patched()` is allowed only with an explicit unique patch id and a replay proof, not on every edit. Worker Deployment version pinning is a later hosted target, after the local Temporal server and SDK are shown to support it. Continue-As-New waits on a measured history length. Restart a separate worker during one accepted sleep and complete it under the same SQL operation identity: pure replay does not prove the SQL or outbox result.

**Negatives:** do not store account secrets, provider bodies, private narrative or production histories in the replay corpus. A green suite that cannot fail a deliberate incompatible fixture is not the proof. Do not build production build-id routing before that replay proof.
