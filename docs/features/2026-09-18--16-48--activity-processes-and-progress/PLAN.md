# Activity foundation design and implementation plan

Feature: [Activities, participation and world-defined progress](FEATURE.md).
Execution scope: A1 implemented under the owner's continuation; A2 remains the next bounded activity slice after situations S1. The broader participation proposal retains its review boundary. No live inference authorized.
Implementation owner: the coding model in this thread; do not dispatch an agent automatically.

## Inspected baseline

Reviewed and implemented from `09f1fe2`. Runtime evidence remains bounded as recorded in the checkpoint.

| Location | Current behavior and consequence |
| --- | --- |
| `packages/game/src/activities.ts` | Only contribution semantics. Capacity is a string; availability checks character facts. Schemas, contribution, scheduling and estimates share one module. No enforced participation/resource admission. |
| `packages/application/src/campaign/actions.ts` | One campaign character and advancing pointer. B retains encounter/paused A, but running A rejects selection. Resume matches a reusable action ID, not instance ID; legitimate duplicate work becomes ambiguous. |
| `packages/application/src/campaign/activities.ts` | Imports the contribution resolver directly. Campaign tick is reconstructed as original start plus activity cursor; after B advances time, resumed A can regress chronology. The pointer also prevents independent progression. |
| `tools/api-integration/test/storyteller.integration.ts` | A → B → A marks B complete and restores the earlier offer through database writes. It proves retention, not real B settlement, fresh public resumption or monotonic chronology. |
| `packages/contracts/src/campaign.ts` | Every activity needs an earned/required meter. Participants, blockers, deadlines and other rule views are absent. |
| `packages/db/src/schema/campaign.ts` | Activity rows already have stable instance IDs. Campaign character/pointer are single-character constraints. Transactions, command and roll receipts are useful foundations. |
| `packages/application/src/campaign/activities.ts` consequence handoff | Every non-running settlement, including quiet completion, calls `requestConsequenceNarration`. Zero provider calls with the offline adapter does not prove a routine path can avoid generation-task admission. |

Preserve exact rational clock arithmetic, private plans behind opaque offers, recorded evidence/dice/effects, atomic effects/outbox and separately recoverable narration. Delete disposable prototype formats instead of adding compatibility shims.

## Proposed technical contract

### Domain ownership

- Definition: immutable accepted rule/version and policy terms, independent of performer. Content names work; code supplies semantics.
- Instance: story-scoped ID, definition snapshot, bound targets/beneficiaries, control policy, revision, lifecycle and typed progress. Replacing a worker does not retarget the result.
- Participation: actor, instance, role, method, state and revision. Roles declare cardinality and replacement conditions. Assignment authority cannot override another player's control.
- Actor: an identified rules/capability sheet. Introduce only relevant authored actors for the cooperative proof, not records/schedules for every implied NPC.
- Capacity: declared actor/resource pool with explicit integer units. A claim binds holder and amount. No mandatory hands, primary body or universal attention resource.
- Costs/effects: typed operations with explicit source, recipient and trigger. Reservations promise availability; consumption spends it; equipment access is not property ownership.

Use existing packages. Extract cohesive game modules for lifecycle, eligibility, allocation and rule implementations as needed. No generic repositories, per-species classes, metadata bags or package per concept. Move the historically named playable-plan envelope out of `immediate-actions` when both branches need it; preserve opaque public offers.

### Rule protocol and legal composition

Use strict discriminated unions and exhaustive server dispatch. Each implemented rule owns validation, initial state, role/target requirements, next boundary, settlement, completion and estimate. A bounded settlement result contains progress, transitions, typed effects, roll receipts and next boundary. It does not access a database or treat prose as authority.

Application orchestration owns authorization, authoritative inputs, transaction ordering, persistence and outbox. Inject bounded dice draws via existing check policy. A replay of committed work returns recorded receipts; aborted transactions produce no visible outcome.

Cross-cutting policies are typed fields, not content-supplied callbacks. Validate combinations explicitly. Add an extension only for a concrete semantic need, with schema, admission, settlement, projection and a contrasting acceptance case. Do not create a general rule language or activity workflow DSL.

Capture terms, but read current actor/world inputs at each boundary. Modifiers name their grounding capability, fact or resource. Method changes settle old terms and record a new admitted revision; history remains unchanged. Continuous prerequisites react to admitted world changes before further work.

For independent contribution, each worker has their own cadence/attempt and capability inputs. Assistance modifies a declared attempt and consumes its own claims; it does not accidentally double-count work. Required simultaneous roles use a captured participant snapshot. Membership/narration changes cannot reroll that attempt. Record applied contribution separately from raw proposed contribution when clamping at the goal. Terminal rewards occur once. Quality, when needed, has typed state and is not inferred from percentage complete.

Joining never credits time before that participant became eligible and allocated. Cooperative attempts require overlapping eligible participation for their declared effort interval, not just all roles arriving at its final tick. Capture whether an interrupted partial attempt retains or loses fractional effort; repeatedly joining/leaving must not generate free checks. Progress already committed to the work is separate from that unfinished attempt.

### Lifecycle and control

Instance lifecycle is open, completed, failed, expired, invalidated or abandoned. Open work may be dormant, progressing or blocked as derived from its rule and participation. Participation is working, suspended, blocked or ended. Campaign holds carry a separate reason: manual pause, declared decision hold or system blocker. Avoid one giant cross-product enum.

Terminal states cannot resume. Resetting open progress is an admitted rule transition with cause, before/after state and costs retained. Retrying terminal work creates a new linked ID. Preserved/lost progress follows the captured rule.

Resume targets exact instance/participation IDs and revisions, then rechecks eligibility and claims. Replacement changes a role assignment; it does not move personal progress, character authority or reward ownership. A tutor may assist a learner under a supported role without owning the learning.

A switch declares which incompatible participations it releases. Settle due work, validate the complete release/acquisition proposal, then commit atomically. Rejected admission leaves old work intact. No silent stealing of other actors' capacities. Retrying infrastructure cannot clear manual pause.

Claims declare their lifetime: participant effort/tool use normally releases on leave, while an admitted worksite reservation may persist with the open work. Persistent reservations require an explicit release/expiry policy and authority; suspension cannot accidentally hoard every resource forever. Terminal transitions release all remaining claims. The first slice supports only the claim lifetimes it can demonstrate.

### Clock, deadlines and narration

The [connected solo contract](../../technical/solo-gameplay-contract.md#clock-correction-the-nearest-implementation-boundary) fixes the initial implementation defaults and transaction order. It owns how this clock composes with current-situation authority and follow-ups; use it instead of improvising those seams while coding.

Promote exact clock anchor/rate/fraction to the campaign's simulation domain. Separate projected world time from the committed-through cursor. Instances record their settlement and eligible working intervals/cadence. Never reconstruct current world time from a resumed instance's original start plus productive elapsed time.

Under the story lock, settle due boundaries globally before commands change membership, pace or facts. Initial scope is one solo scene/domain. A campaign scheduler selects the earliest relevant boundary across work, autonomous changes and deadlines. Wake payloads are hints fenced by generation and authoritative state.

Equal-tick order for the initial proof: due condition changes/hard expiry, productive attempt, due occurrence schedules in authored order until interruption, then completion if not interrupted/blocked. Goal reached during an interrupt is completion-pending; explicit eligible resume settles completion once with no new contribution/occurrence draw. Future multi-actor settlement adds stable instance/role ordering. Default future deadline semantics are exclusive: work at the expiry tick is too late. An inclusive option needs explicit support. Commands observe already-due effects; delivery order must not decide rewards.

Bound settlement batches and persist catch-up. A control is acknowledged only after required preceding work is settled. Instant pace advances one next boundary group and returns, including for endless processes. Deterministic quiet spans can batch only with equivalent results; distinct stochastic attempts stay distinct unless a rule defines a valid aggregate.

Suspended workers earn nothing, but work may still decay, expire or advance autonomously. Schedule due obligations, not only running participants. Initially implement world deadlines and active-effort durations here; real response allowances remain owned by autonomy. Manual campaign pause freezes the shared domain and preserves deadlines. Missing repairable conditions block; irrecoverable conditions invalidate only under explicit policy.

Mechanical progress/completion records authoritative receipts independently of presentation. The accepted [follow-up policy](../2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#configurable-boundary-follow-ups) can choose factual reporting, generated narration, chain continuation or a controlling scene/choice. Quiet configuration admits no generation task; other configurations may narrate completion or selected milestones. Autonomy owns chain and follow-up orchestration; activity rules emit typed boundary outcomes rather than directly calling a narrator or starting successors. Initial solo scene preparation/response holds at controlling interactions; report-only narration need not stop the chain. Independent scene coordination remains deferred.

### Persistence, targets and recovery

Prepared local opportunities follow the implemented [owning technical contract](../../technical/rules-and-activities.md#prepared-local-opportunities). This activity feature supplies work/rule/clock eligibility, not a second catalogue or situation permission layer. LO-02/03/04 and the nonhuman contrast LO-05 remain acceptance constraints.

Use campaign/story locks for initial serialization. Actor state, targets, claims, work, effects and outbox participate in the same transaction. Cross-story activities/transfers are excluded. Enforce story-scoped references, positive claim units, unique participation/role identities and revision fences. Check aggregate allocations under pool locks; uniqueness alone cannot protect divisible capacity.

Deduplicate commands by identity plus matching payload. Boundary receipts identify instance, revision/epoch, boundary and attempt/role. Unique terminal and milestone effect identities prevent duplicate rewards. Scheduler/narration retries never reapply committed effects.

Use a closed typed target union backed by declared records, initially relevant characters, work instances and bounded world-object facts. No arbitrary property paths or unverified string targets. Full inventories and world graphs are separate. Definitions declare repeatability and target conflicts so two repair instances cannot both reward fixing the same beacon.

Admitted authoritative mutations invalidate dependent eligibility/estimates before more work. For the bounded POC, inspect relevant active work under the story lock; defer indexes until useful. Reads do not mutate progress. Estimates carry a basis revision and remain projections.

Storyteller activity parameters cannot create new capabilities, resource pools or control rights. Those need supported declarations/changes. Task catalogues expose only implemented rules and preserve evidence budgets. Public blocker reasons redact undiscovered facts; private plans/DCs remain private.

## Benchmark trace

Use the permanent [execution atlas](../../technical/playthroughs/README.md) for concrete player text, dice and receipt timelines. [BC-04](../../technical/playthroughs/beacon.md#bc-04-b-actually-advances-before-a-resumes--partly-current-target-chronology) is the exact phase-1 A → B → A target; [NH-03](../../technical/playthroughs/nonhuman.md#nh-03-interruption-switch-and-return) is its nonhuman contrast. [BC-06](../../technical/playthroughs/beacon.md#bc-06-collisions-and-controls) exposes contribution-goal/event collision handling: reaching the numeric goal is not yet proof of committed completion effects. Preserve an explicit ordering and an honest pending-completion state when implementing the lifecycle. These are design traces, not newly passing tests.

| Probe | Boundary exercised | Scope |
| --- | --- | --- |
| Beacon with two workers and a replacement | Shared progress, actor-specific work, roles and targets/claims | Connected cooperative fixture |
| Studying a book | Personal progress cannot transfer with assignment | Binding/eligibility contrast; no levels system |
| Long-life guard shift | Attendance and payment depend on clock/terms, not generic work points | Content on clock rule; no employment engine |
| Pilot diverts and returns | World time advances while route progress stops | Traversal contrast; no galaxy map |
| Microbe transformation | Autonomous state change, environmental eligibility | Staged-rule proof, no humanoid worker |
| Abstract consciousness | Two declared channels, optional physical resources | Capacity proof |
| Rifle shot in combat | Immediate effect versus encounter coordination | Extension boundary; combat deferred |
| Rest then patrol; quiet run versus unusual encounter | Extended routine with no generation, bounded queued permission and optional scene escalation | Next connected proof after clock correction; illustrative durations/content |

Universal invariants: authority, identity, ordered time, grounded inputs, typed effects and durable receipts. D&D belongs to selected rules. Professions, capacities, tools, currencies and genre belong to admitted content. One scene and bounded actors/rule kinds are implementation limits, not universal character restrictions.

## Phases

### 1 — Stable identity and correct clock (nearest implementation phase)

Execution label **A1** in the [handoff route](../README.md). Implemented; the checkpoint distinguishes source behavior from persisted integration evidence.

- Outcome: real A → B → A settlement preserves earned progress and monotonic chronology; same-definition instances can be selected precisely.
- Dependencies: use the existing owner-selected product direction and solo integration contract; wait for the implementation instruction, not another broad redesign. Read application actions, activities, controls, reads, persistence; game clock/rules; campaign schema; worker scheduling; focused integration. Any newly discovered material product change still needs review before code.
- Edits: exact instance/revision in resume plans, validators and fixtures; campaign clock anchor/rate/fraction and committed cursor; instance cadence/working intervals; control/settlement ordering; affected baseline/contracts. Remove obsolete time reconstruction, not just clamp it with a maximum.
- Keep one advancing participant temporarily as an explicit phase limit. Preserve immediate actions, private plans, earned progress and receipts. On resumption, handle an already-satisfied completion predicate after interruption without requiring another productive roll.
- Optional evidence: real B settlement and freshly published resume offer replace direct database injection; settle resumed A and assert monotonic world/receipt ticks. Add same-definition instances, stale commands/wakes and fractional pause/pace retention. Scripted generation only.
- Exit: coherent identity/time foundation, updated limits and pushed checkpoint. This phase does not complete the broader feature.

Read/modify map for A1:

| Owner | Bounded change / invariant |
| --- | --- |
| `packages/game/src/time.ts`, `activities.ts` | Reuse exact rational arithmetic; campaign tick quantization and retained whole-tick effort follow the solo contract. Separate next work boundary from world receipt position; recognize pending completion without another roll. |
| `packages/db/src/schema/campaign.ts`, disposable baseline | Campaign owns clock anchor/rate/remainder/frontier and domain holds. Instance keeps identity, work effort/progress and boundary sequence; remove old per-instance time authority. One advancing pointer is an explicit phase limit. Reset prototypes, no compatibility shim. |
| Application `campaign/actions.ts` | Exact instance/revision resume; settle due work before switching. Failure leaves old participation unchanged apart from independently due history. Reanchor working interval at current world position, not original start. |
| Application `campaign/activities.ts` | World-tick receipts; bounded catch-up; event stops at its real boundary. Preserve contribution/occurrence order and completion-pending result. No `Math.max` patch for backward time. |
| Application `campaign/controls.ts`, `settings.ts` | Campaign pause and pace settle under old terms first, retain one rational remainder, preserve independent holds. Existing activity-pause endpoint/UI must be made explicit about domain scope; do not silently conflate suspension with campaign pause. |
| Application `campaign/reads.ts`, persistence, contracts | Project campaign time/work/known holds consistently without mutating on reads. Current `story.revision` remains a passage sequence, not a free world counter. |
| Worker bindings/outbox and relevant workflow | Wake the authoritative campaign/work operation; stale messages never reactivate an old pointer or recalculate time independently. |
| `tools/api-integration/test/storyteller.integration.ts` and focused game tests | Optional evidence must replace B-completed/offer-restored SQL shortcuts with real commands/settlement. Do not claim an untouched old passing test proves the new chronology. |

Concrete A1 oracle: BC-04 world ticks 10→15→20→25, retained A progress, fractional campaign pause/resume, duplicate wake, exact same-definition instance selection, and goal-reaching interruption resumed without an extra attempt. Choose a small safe source/diff review and, when useful, focused offline checks under verification policy; no broad rebuild or live call is required by this plan.

### 2 — Quiet routines and selective scenes

Execution label **A2**. This phase owns rule diversity and typed boundary emission, not all scene/queue work.
Status: implemented in September 2026. The rule/lifecycle portion is complete; quiet no-task follow-up and reusable authored choices deliberately remain the next S2/U2a slice.

- Dependencies: A1; execute after situation S1 in the handoff route so every exposed choice already has explicit authority.
- Add a strict clock-wait rule alongside contribution: positive finite tick target, rule-specific progress/view and one terminal boundary. No fake work points or compulsory dice for waiting. Extract cohesive validation/next-boundary/settlement/projection dispatch within existing packages, not a plugin framework.
- Extend the common boundary result enough for completion, interruption and pending completion; application code remains owner of persistence/outbox. Existing contribution semantics/receipts stay intact.
- Emit supported boundary identity/cause/effects; [autonomy U2a/U2b](../2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md) owns follow-up policy and tasks. The [prepared-local-opportunity contract](../../technical/rules-and-activities.md#prepared-local-opportunities) owns authorized quiet offer reuse.
- Acceptance: W completes after ten eligible ticks without rolls/work points; A still requires earned contribution; pause and duplicate completion preserve exact once-only effects. The same rule envelope accepts nonhuman content without mandatory calendar/quantities.
- Exit: contribution and genuine wait are two supported rules sharing one authoritative clock/lifecycle boundary. Quiet/no-task, reports and chains are delivered in the subsequent named slices, not silently claimed here. Broad repeating/traversal/cooperative variants remain later work.

### 2b — Durable activity history and correlated diagnostics (next observability slice)

- Outcome: the player and Chamber can reconstruct one exact activity lifecycle after reload, while operators receive useful structured warnings/errors without treating logs as game authority.
- Dependencies: A1/A2 lifecycle identities and current transaction boundaries. This can proceed independently of cooperation and must cover U2b/U2c activity transitions as those slices are added.
- Add an append-only activity-event table and strict event/detail contract. Write events inside the same story-lock transaction as starts, controls, switches, boundary transitions and terminal effects. Fence replay by stable cause identity plus event kind; do not log no-op scheduler polling.
- Project bounded newest-first player-safe activity history separately from current commitments. Include exact instance, world tick, revision, safe reason, and permitted links/summaries for rolls/effects. Completed instances remain discoverable; private plans, secret DCs and undiscovered blockers do not.
- Introduce one small structured runtime logger boundary for API/worker application incidents with stable event names, severity and correlation fields. Replace generic activity/outbox worker errors first. Preserve sanitized Temporal failures and never serialize arbitrary errors, requests, SQL or provider content.
- QA: start → pause → resume; A → B → A; block and completion-pending; quiet completion; duplicate command/outbox delivery; reload. Assert one ordered event sequence, terminal history retention, redaction and correlation. Inject one retryable worker failure and verify an actionable error record without changing gameplay history.
- Exit: activity history is durable and readable; expected domain outcomes, warnings and operational errors are distinguishable; the remaining trace explorer may enrich cross-system artifacts without inventing a second activity ledger.

### 3 — Work, actors, roles and claims

- Depends on phases 1–2. Separate participants from work, persist relevant actors/pools/claims, and replace advancing-pointer authority with a bounded active set and earliest-boundary scheduler. Implement independent contribution, assistance and atomic leave/reassign/switch.
- Owners: game eligibility/allocation/contribution; application admission/settlement; database actors/claims; private plans/views. Validate identity/access, capabilities, declared skills/tools and targets.
- Evidence: two workers one repair; assistance without double-counting; contested tool; replacement retains shared work; personal work rejects transfer; abstract actor runs two channels; terminal result once. Use explicit solo control of authored NPCs, not assumed multiplayer permissions.
- Exit: connected shared/personal work and enforced capacity, including pending narration ordering/holds. No multi-actor facade over one campaign character.

### 4 — Lifecycle, deadline and loss

- Depends on phase 3; phase 2 already needs minimum stop/block behavior. Extend explicit abandonment, temporary blocks, permanent invalidation, failure/retry linkage, captured expiry and one bounded progress-loss rule with cost/refund and known-loss disclosure.
- Owners: lifecycle, eligibility invalidation, scheduler, typed effects/persistence and control projection. Relevant target changes wake affected work.
- Evidence: suspended work expires; missing tools block; destroyed target invalidates; reset retains costs/history; duplicate abandon/failure cannot reward; expiry/completion ties are deterministic; pause preserves deadlines.
- Exit: legible failure/recovery, no leaked claims or replayable terminal rewards.

### 5 — Additional process rules

- Depends on phase 4. Reuse the rule dispatch/boundaries introduced in A2 and existing contribution recurrence; add new recurring semantics only where a selected rule needs them. Add minimal traversal over declared place/connection identities and bounded autonomous staged transformation. Do not rebuild rule dispatch or introduce a second scheduler.
- Owners: game rules, relevant target/effect vocabulary, estimates/projections and fixtures. No grid/pathfinder/general physiology. Immediate actions retain direct receipts.
- Evidence: world wait versus active attendance; diversion preserves position while time advances; microbe transforms without a worker or equipment. All share authority/recovery.
- Exit: new rules do not introduce a second scheduler or species branches.

### 6 — Configurable Storyteller and player acceptance

- Earlier phases each include fixture offers/views. Broaden supported proposal composition, evidence diagnostics and explicit method/condition revisions; no replacement of saved work by regenerated offers.
- Owners: Storyteller catalogue/context/validation, private admission, fixtures, compact play view and QA journeys.
- Evidence: browser repair/cooperation/diversion/return; personal and abstract contrasts; expired/invalidated work with useful choices; reload/restart and pending narration. Separate fixture correctness, runtime evidence, owner taste and future live quality.
- Exit: player understands what persists, who can act and what can be lost without reading debug IDs. Fold agreed contracts into permanent docs and remove completed folders only when remaining acceptance is delivered or explicitly rescaled.

## Alternatives and limits

A giant optional-field activity object admits nonsense combinations; use typed rule/policy composition. A class per profession/species requires engine edits for settings; use declared capabilities/targets/methods. Arbitrary generated scripts make validation/replay unpredictable; reject unsupported semantics. A full entity-component world simulator adds scope before proving a better scene; start with relevant actors/targets. The single advancing pointer remains a temporary solo-proof limit, with removal in phase 3. Immediate actions share authority without becoming activities; events and Storyteller turns are not process families. Use [concepts](../../concepts.md), which excludes chapters from the game model.

## Current checkpoint

- Current phase: A1, A2 and bounded S2/U2a are implemented. Phase 2b has its durable ledger, readable player history and shared structured API/worker logging boundary. Return to U2b receipt/hook storage; deterministic diagnostic failure controls remain a later QA-enablement step.
- Implemented boundary: lifecycle changes append replay-fenced events in the same transaction as start, suspension-by-switch, exact resume, manual pause/resume, blocking, interruption, completion-pending and completion. Campaign reads and the play surface expose the newest 100 safe events independently of current commitments. API/worker lifecycle failures use stable JSON events; retryable outbox failures carry safe notice, operation and topic correlation without serializing arbitrary errors.
- Verification: application, worker, API and web builds pass; all four focused worker tests pass, including retained outbox delivery and safe correlation after an uncertain send. Earlier focused PostgreSQL/Temporal ledger assertions passed for start/block/duplicate wake and three quiet start/completion cycles. No UI/manual QA was run.
- Known boundary: one advancing activity remains the explicit limit. Abandonment/failure/expiry/invalidation event kinds await their mechanics. Structured logs currently target stderr and deterministic diagnostic failure controls are not exposed in the Chamber.
- Consolidated commitment acceptance: the earlier A -> B -> same A proof still completes B and restores its offer through direct database writes. Phase 3 must prove real B settlement, exact instance/revision resumption, monotonic campaign chronology, exclusive capacity reacquisition and harmless stale wake-ups. Phase 4 must add explicit abandonment plus legible blocked/invalidated outcomes. Preserve progress, captured terms, rolls and exactly-once rewards across reload and worker restart; do not silently create a fresh zero-progress instance.
- Open decisions: product defaults in FEATURE.md. Multiplayer control/holds and combat rules remain separate, not prerequisites for solo cooperative proof.
- Spend: no provider calls, $0 for this pass; cumulative OpenRouter usage unverified. Resetting Codex usage does not authorize live game inference.
