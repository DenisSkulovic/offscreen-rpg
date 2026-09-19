# Bounded autonomy and re-entry plan

Feature: [Bounded autonomy and re-entry](FEATURE.md)
Execution scope: implementation-readiness design now; start bounded offline slices only after the owner's requested model switch/continuation. Later fallback/notification scope is not implied. No provider call is authorized.
Implementation owner: the coding model in this thread after the owner switches it; no automatic dispatch/model switch.

## Dependencies and sequencing

The [activity foundation](../2026-09-18--16-48--activity-processes-and-progress/PLAN.md) supplies A1 clock/identity and A2 genuine wait boundaries. [Authored situations](../2026-09-19--13-49--storyteller-authored-situations/PLAN.md) supplies S1 authority and S2 quiet choice reuse. U2a and S2 are one inseparable quiet-choice slice; U2b adds reports/scenes; U2c adds the finite queue after standalone play works. Follow the [feature index route](../README.md), not parallel implementations of the same callback. Existing narrative deadlines are not authority for mechanical absence. No notification provider is needed.

## Proposed queue and event contract

A queue is not the only way to play without inference. The [prepared-local-opportunity contract](../../technical/rules-and-activities.md#prepared-local-opportunities-proposed) lets a present player choose/repeat activities within a continuing Storyteller-authored selection. This feature consumes those definitions/targets into explicit unattended permission; it must not own a competing source of options. Each new interactive situation explicitly grants activity access or none. A resolved scene does not automatically resume the queue: successor/resume needs an explicit authorized handoff as well as the player's accepted plan and mechanical eligibility. Three rapid scene-only turns must not be bypassed by old queued work.

Concrete acceptance anchors are now in the [execution atlas](../../technical/playthroughs/README.md): [BM-02/03](../../technical/playthroughs/batman.md#bm-02-rest-then-revalidate-patrol) for quiet offscreen work, [BM-04/05](../../technical/playthroughs/batman.md#bm-04-the-event-branch-at-the-sixth-hour) for candidate-versus-hazard admission and absence permission, and [RM-03/04/06](../../technical/playthroughs/red-mountain.md#rm-03-cancellation-in-the-middle-is-not-rewind) for cancellation, late reports and exactly one successor. Implement the smaller [connected POC](../../technical/playthroughs/poc.md), not literal Gotham or a full travel system, to prove these contracts first.

### Configurable boundary follow-ups

Activity completion commits mechanics; it does not prescribe the next player experience. Represent the trigger, presentation and continuation separately. A boundary policy selects a supported trigger (start, committed milestone, outcome including failure, or a due activity-relative/story tick), optional grounded conditions, and compatible follow-ups. In the first slice support completion and a selected entry milestone; other trigger kinds are extension points, not implied runtime capabilities.

| Decision | Proposed supported semantics |
| --- | --- |
| Reporting | Factual log only, prepared text, or requested generated narration of committed facts |
| Continuation | Remain idle, admit the next eligible chain entry, or hold at a declared interaction boundary |
| Interaction | No choice, publish already admitted options, or prepare a Storyteller scene with new supported options |
| Ordering | Informational report may accompany continuation; required narrative/choice preparation gates continuation |
| Unavailable generation | Defer/omit optional reporting with factual status retained, or visibly hold required preparation; never erase committed danger |

These decisions are compatible combinations, not arbitrary flags or executable callbacks. For example, generated completion narration plus automatic continuation is legal when the narration only reports settled facts. A choice that can change whether the character continues cannot be combined with unconditional advancement past that choice. A scheduled arrival vignette needs no random encounter. “Narration requested” does not itself imply an event, decision window, campaign pause or new world facts.

Capture the effective policy on the accepted activity/chain entry. A supported campaign default may be replaced explicitly by an entry-specific policy; avoid merging two continuation policies or silently inheriting extra generation requests. Storyteller proposals use the same admission path and cannot exceed player control, risk or spending authority. Changing future policy creates a revision and cannot retroactively fire hooks or replay receipts. Future queued entries follow their accepted policy unless explicitly revised.

Use a stable boundary receipt and policy-hook identity for each follow-up. Commit pending report/scene intents and at most one continuation decision with the mechanical result in the same transaction. The chain owns the next entry; a completion hook cannot independently start a second successor. If an interrupting event and an ordinary milestone coincide, resolve committed effects then apply the controlling hold; defer compatible reporting and suppress automatic continuation until release. Multiple report requests for the same configured hook deduplicate; distinct authored milestones may each narrate intentionally.

Report-only generation consumes an immutable settled snapshot and reports “At the gate, earlier…” if it publishes after later activity has begun. It cannot mutate facts, publish current choices or pretend the character is still there. Give it a report identity/provenance separate from the current playable offer, so world advancement does not create an endless stale-report regeneration loop. Delivery may batch/defer under limits. Anything establishing new relevant facts, changing mechanics or offering current choices uses the fenced scene publication path and, where required, holds progression. This task-contract distinction is proposed work, not behavior of the current consequence task.

### Chains as composed intentions

A journey can be an itinerary of ordinary activity entries: travel, rest, social downtime, travel, rest, travel. Keep its identity and ordered entries for progress/history without creating a second parent activity that also awards travel progress or rewards. The itinerary ends when its required entries and final conditions are satisfied; the initial ETA never completes it. A standalone activity need not belong to a chain.

Both the player and Storyteller may propose a chain within their authority. The initial implementation remains bounded and linear with explicit supported stop/skip/resume conditions; branching or nesting requires a later concrete need rather than a general workflow language. A scene may propose a replacement remainder through the existing plan revision/admission boundary. It cannot rewrite completed legs, silently teleport the character to a planned location, or discard unfinished work. Manual and unattended chains use the same contract.

Optional events may occur during any eligible leg, several legs, or none, governed by their supported policies. Planned narration at a milestone is independent of that occurrence chance. A tavern visit may stay a timed social routine or develop into a detailed conversation; its name does not fix the mode. Arrival and rest requirements are revalidated at each transition, including route access, cost, location and capacity. Canceling the itinerary does not imply undoing its current activity; stopping current work is explicit.

### Queue admission and continuation

Persist a revisioned story/actor-scoped plan with ordered entry IDs, accepted definition snapshots, target bindings, horizon, permission/limit snapshot and cursor. Each entry identifies new work or an exact retained instance. Definition terms are immutable; runtime eligibility and remaining allowance are checked again at actual start. Never use an old public offer as permanent authority for queued execution.

The application transaction verifies control, settles due activity boundaries, checks the current queue revision and admits the next entry under current world/capacity conditions. Commit entry consumption, activity start, relevant claims, receipt and wake-up atomically. Deduplicate by plan/entry identity, not workflow delivery. Failed admission leaves the cursor and remaining entries inspectable, with a known blocker. An unsupported or stale binding does not prompt automatic regeneration or reinterpretation.

Completion may advance the queue in the same bounded settlement transaction; the accepted boundary policy independently decides whether to request narration. Multiple due entries catch up in bounded batches; stop at a controlling event/interaction, blocker, permission limit or horizon. Handle an activity still running at the horizon using its captured stop/interruptibility policy: do not promise a stoppable horizon for work that cannot honor it. Editing/canceling pending entries uses an expected revision; stopping current work is a separate admitted lifecycle operation with its own costs and disclosures.

Keep queue state, participation, campaign pause and scene response state independent. A suspension retains the queue cursor. Scene resolution revalidates resume/next-entry permission; no completed or missed entry is replayed on return. The queue is the product mechanism for already chosen intentions, not a substitute for a planning agent.

### Escalation without constant inference

Separate routine resolution, occurrence nomination and scene admission. A due rule can emit a candidate with stable identity, source receipt/world revision, cause, scope and urgency. Mechanical hazards already committed are different from optional plot opportunities. Selection uses supported policy, current relevance and cooldown/history; it requires no LLM classification call. Probability semantics are per defined exposure/boundary, not per worker poll, and campaign/event history survives restarting a routine. A seed/test provider controls the quiet and nominated branches for offline evidence.

Record an accepted escalation and its hold/queue effect under the story lock with an outbox intent. Admit generation in the existing separate task/budget path; preserve its uncertain-billing stop behavior. Keep at most one unresolved escalation in the initial solo scene. Coalesce redundant optional candidates; do not drop independently committed hazards. Eligibility and cooldown decisions are recorded so a retry cannot reroll whether a scene happens. Storyteller style can guide content but is not an executable occurrence probability.

An event task receives the escalation cause, settled interval, relevant capabilities/state, prior significant evidence and remaining queued intentions. It returns proposed scene facts and supported options within those constraints, including the possibility that an optional opportunity has no coherent development. Validate required new facts/entities and plans through explicit supported admission before publication. A villain in prose is not by itself a mechanically authorized target. This is a task-contract extension using existing execution/publication/accounting, not an extra always-running agent.

Publication fences the event ID, world state and queue/hold revision. It cannot replay routine effects or backdate new consequences before the captured boundary. Stale results never auto-resume progression; use explicit bounded recovery without automatic provider retry. If the candidate was optional and no facts/hazards committed, an admitted no-event result can release the hold; otherwise leave an explained recovery state. Preserve pause ownership throughout.

Initial solo default: hold the domain from accepted escalation until event resolution or an admitted fallback. Start the response deadline only after options successfully publish. Provider delay, exhausted allowance and closed browsers cannot consume a response window the player never had. Notifications report publication/current state and never control the deadline.

### Free quiet life and honest cost evidence

Mechanical settlement, queue transitions, logs and factual recap must be executable without generation. In the selected quiet configuration, none admits a generation task. Other admitted configurations may request prepared/generated reporting, gate continuation on a scene, or combine narration and permitted next work. The mechanical resolver never calls a provider; explicit persisted follow-up intents enter the task layer. A rules-defined wait need not roll; uncertain work can use D&D checks without LLM calls.

Measure generation-task admissions and provider attempts separately for plan preparation, configured boundary reporting, quiet execution, scene preparation and literary recaps. A fake provider charging zero does not establish the no-call property. Replace unconditional consequence narration with admitted follow-up policy; do not replace it with a prohibition on completion narration. Generation remains subject to explicit allowance, including scheduled milestones. The quiet mode must remain available without claiming all configurations cost zero.

## Phases

### Phase 1 — Agree the autonomy promise

For the first offline proof, use the [solo contract defaults](../../technical/solo-gameplay-contract.md#what-is-decided-for-the-first-proof): hold on required interaction, no response deadline or autonomous choice, explicit accepted finite work and independent spend authority. This removes fallback vocabulary as a prerequisite for U2a/U2b/U2c; it does not complete the later delegated-decision product.

- Outcome: player-facing policy and three concrete decisions—safe delegation, disallowed high risk and no-longer-valid fallback.
- Owners: time/autonomy, player experience and story creation.
- Work: choose the initial vocabulary, deadline semantics, pause interaction and always-hold categories.
- Checks: owner walkthrough from campaign creation through absence and return.
- Exit: the policy is understandable without reading implementation terms.

### Phase 2 — Bounded quiet plan and one escalation

Split into these serial bounded slices; commit/push each coherent result. This feature owns follow-up/queue orchestration, not situation choice authorship or process arithmetic.

#### U2a — Quiet settlement and factual continuation

Status: in progress with S2. A captured activity now selects `quiet` or `scene` completion follow-up. Quiet completion appends its factual mechanical passage, creates no consequence/generation intent and reprojects the remaining authorized activity plans. General repeat and independent-selection evidence remains before exit.

- Dependencies: A1, S1 and A2. Execute with S2 so no-task completion produces the correct next authored offer rather than a dead end or engine-invented menu.
- Capture a validated effective boundary policy on accepted work; default/entry replacement is explicit, never an accidental merge. Add typed boundary/hook identity and a factual-only path that does not create `campaignConsequence`, generation or provider work merely to finish.
- Owning edits: application `campaign/activities.ts` and `narration.ts`, boundary policy schema/admission, persistence/contract projection and selected fixtures. Keep normal immediate consequences working through their existing task path until explicitly changed.
- Expose pending/completed work and factual outcomes through normal reads; leave valid current situation authorization intact. New independent player starts are not backdated to old completion. No queue is required for this slice.
- Acceptance: GS-05 B completion→fresh authorized A selection; LO-02 independent choice/repeat; no generation-task admission after preparation in the quiet branch, not merely a free scripted call. Compare no-task completion with the still-supported controlling consequence path.
- Exit: model-free standalone ordinary life works without losing current authored choices or receipts.

#### U2b — Historical reports and controlling scenes

- Dependencies: U2a/S2. Use A2's typed boundaries and S1's explicit scene authorization. The [solo contract](../../technical/solo-gameplay-contract.md#boundary-follow-ups-and-task-contracts) fixes snapshot, deduplication and publication responsibilities.
- Persist follow-up intents by source receipt+hook. Existing consequence uniqueness by narrative revision cannot represent multiple noncontrolling reports; preserve a single controlling intent separately. Reuse existing outbox/execution/accounting, not a second model worker or one agent per event.
- Add a strict report-only task with prose output and no plans/effects/note patches. Attach publication to its historical receipt; do not append it as the new current passage or invalidate the current gameplay/offer fence. Respect source visibility and idempotent publication.
- Required scene requests hold the campaign at the boundary, capture relevant progress/authorization/receipts and publish through S1's explicit next situation. The first proof uses the supported authored stranger hazard. General new-entity events are not claimed; optional candidate/no-development output can follow once supported by S3, under the same admission path.
- Optional report default for the fixture is omit on failure with factual result retained; required scene failure stays held/recoverable. Preserve manual pause. No automatic provider retry, response timeout or fallback action.
- Acceptance: GS-06 report arrives at 37 for completion 25 while W already ended; no credits/current menu change. Required scene failure stops work; duplicate hooks don't duplicate reports/rewards; simultaneous goal/event stays pending until eligible authored resume. Context overflow fails before inference.
- Exit: report-versus-scene semantics are distinct in task schema, storage, publication, controls and projection, not only a prompt instruction.

#### U2c — Finite accepted chains

- Dependencies: U2b and situations S3. Implement at most six linear entries with explicit horizon/stop policy, current authored handoff, actor/target bindings and entry identity; no nested branches or automatic replanning.
- Queue is sole successor owner. Boundary effect, entry consumption, start and wake commit atomically; revalidate current authority/resources every time. A changed interactive situation blocks the old queue until an explicit admitted handoff allows it again.
- Separate cancel-pending from stop-current and campaign pause. Preserve completed entries/results and exact retained instances. Quotas/cooldown/finite findings do not reset on requeue.
- Acceptance: repair→W quietly, optional report during W, required scene prevents W, late response cannot skip the scene, and failed next-entry eligibility leaves a readable blocked plan. RM-03/04/06 and BM-02/05 are contrasts; no travel/combat implementation is required to prove their shared boundary.
- Exit: unattended accepted continuation works after player-directed quiet play has already been demonstrated. No implicit permission to make scene decisions.

### Phase 3 — Captured fallback contract

- Outcome: a response opportunity stores feasible options and one permitted fallback under current authority.
- Owners: game proposal/admission and application persistence.
- Work: define fallback provenance, mechanical plan reference, deadline and invalidation fence; never generate fresh unbounded mechanics at deadline.
- Checks: pure validation for authority, stale prerequisites and disallowed risk.
- Exit: fallback execution needs no hidden new judgment.

### Phase 4 — Exactly-once deadline arbitration

- Outcome: player response, pause and fallback race to one coherent committed result.
- Owners: database transactions, worker/workflow scheduling and command receipts.
- Work: arbitrate on database time, recheck state, preserve pause remainder and make retries idempotent.
- Checks: integration races at before/equal/after deadline, duplicate delivery and restart.
- Exit: no branch can commit both player and fallback outcomes.

### Phase 5 — Re-entry and notification event

- Outcome: return UI explains autonomous action and current authority; optional delivery reports only the saved opportunity/current link.
- Owners: snapshot/recap contracts, play UI and notification event boundary.
- Work: project attribution, deadline/fallback result and current actionability; keep transport late/failure tolerant.
- Checks: old tab/link, delivery delay, missing delivery and return after resolution.
- Exit: the browser alone proves the gameplay; a channel can be added without changing authority.

### Phase 6 — Gold-flow acceptance

- Outcome: the earned-time scenario works with player response, fallback, no-authority hold and pause variants.
- Owners: Chamber reusable scenario and QA evidence.
- Work: run offline variants through production paths and record the player's understanding of what happened.
- Checks: persisted browser/worker runs; $0 model spend.
- Exit: offscreen continuation feels bounded and trustworthy rather than arbitrary.

## Current checkpoint

- Current phase: U2a/S2 is in progress. The quiet B→authorized A handoff is implemented; bounded repeatable independent selection is next, then U2b. First proof still holds at interactions without unattended decisions; later fallback phases remain distinct.
- Implemented boundary: completion follow-up is captured on the activity definition. Quiet completion commits factual passage/effects and a freshly fenced offer from remaining prepared authorization with no `campaignConsequence`; controlling completion retains the existing recoverable scene path. Switching work rebinds retained exact-instance resume authority atomically.
- Verification: affected builds, 22/22 game tests and 29/29 Storyteller tests pass. The disposable-database focused integration passes 11/11 through PostgreSQL, Temporal and browser creation; its A→B→A branch now settles B through normal controls/worker operation, asserts no narration intent and resumes A from the fresh offer. Repeatable ordinary-life work is not yet proven.
- Open decisions: delegated fallback categories, notification transport and broader risk vocabulary before their later phases. Selected first-proof bounds/hold/report policy are in the solo contract; they no longer block the nearest offline slice.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
