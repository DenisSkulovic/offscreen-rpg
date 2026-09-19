# Activity foundation design and implementation plan

Feature: [Activities, participation and world-defined progress](FEATURE.md).
Execution scope: architecture/design authorized on 2026-09-19; expanded product proposal ready for review, not bulk implementation authorization. Earlier contribution work remains implemented. No live inference authorized.
Implementation owner: Cursor by default; Codex design/review unless assigned implementation.

## Inspected baseline

Reviewed source at `1ef5a81`. No runtime repair is claimed by this design pass.

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

Promote exact clock anchor/rate/fraction to the campaign's simulation domain. Separate projected world time from the committed-through cursor. Instances record their settlement and eligible working intervals/cadence. Never reconstruct current world time from a resumed instance's original start plus productive elapsed time.

Under the story lock, settle due boundaries globally before commands change membership, pace or facts. Initial scope is one solo scene/domain. A campaign scheduler selects the earliest relevant boundary across work, autonomous changes and deadlines. Wake payloads are hints fenced by generation and authoritative state.

Proposed equal-tick order: previously due condition changes and hard expiry first; then productive attempts in stable instance/role order, applying each result before the next revalidation. Completion follows its attempt's effects/predicate. Default deadline semantics are exclusive: work at the expiry tick is too late. An inclusive option must be supported and captured. Commands at that tick observe already-due effects. Delivery order must not decide ownership/rewards.

Bound settlement batches and persist catch-up. A control is acknowledged only after required preceding work is settled. Instant pace advances one next boundary group and returns, including for endless processes. Deterministic quiet spans can batch only with equivalent results; distinct stochastic attempts stay distinct unless a rule defines a valid aggregate.

Suspended workers earn nothing, but work may still decay, expire or advance autonomously. Schedule due obligations, not only running participants. Initially implement world deadlines and active-effort durations here; real response allowances remain owned by autonomy. Manual campaign pause freezes the shared domain and preserves deadlines. Missing repairable conditions block; irrecoverable conditions invalidate only under explicit policy.

Mechanical progress/completion records authoritative receipts independently of presentation. The accepted [follow-up policy](../2026-09-19--00-26--bounded-autonomy-and-reentry/PLAN.md#configurable-boundary-follow-ups) can choose factual reporting, generated narration, chain continuation or a controlling scene/choice. Quiet configuration admits no generation task; other configurations may narrate completion or selected milestones. Autonomy owns chain and follow-up orchestration; activity rules emit typed boundary outcomes rather than directly calling a narrator or starting successors. Initial solo scene preparation/response holds at controlling interactions; report-only narration need not stop the chain. Independent scene coordination remains deferred.

### Persistence, targets and recovery

Prepared local opportunities follow the [owning technical contract](../../technical/rules-and-activities.md#prepared-local-opportunities-proposed). The existing scene offer remains consumable; a separate scoped source lets the application compose new eligible offers without generation. Keep definition, availability, instance and queue permission distinct. [LO-02/03/04](../../technical/playthroughs/local-opportunities.md) supplies the exact dormant-play, wake and contextual-censorship acceptance; the microbe/abstract contrast in LO-05 prevents making geography or human necessities mandatory.

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

- Outcome: real A → B → A settlement preserves earned progress and monotonic chronology; same-definition instances can be selected precisely.
- Dependencies: review proposed product direction, then update owning product/technical specifications before runtime edits. Read application actions, activities, controls, reads, persistence; game clock/rules; campaign schema; worker scheduling; focused integration.
- Edits: exact instance/revision in resume plans, validators and fixtures; campaign clock anchor/rate/fraction and committed cursor; instance cadence/working intervals; control/settlement ordering; affected baseline/contracts. Remove obsolete time reconstruction, not just clamp it with a maximum.
- Keep one advancing participant temporarily as an explicit phase limit. Preserve immediate actions, private plans, earned progress and receipts. On resumption, handle an already-satisfied completion predicate after interruption without requiring another productive roll.
- Optional evidence: real B settlement and freshly published resume offer replace direct database injection; settle resumed A and assert monotonic world/receipt ticks. Add same-definition instances, stale commands/wakes and fractional pause/pace retention. Scripted generation only.
- Exit: coherent identity/time foundation, updated limits and pushed checkpoint. This phase does not complete the broader feature.

### 2 — Quiet routines and selective scenes

- Depends on phase 1. Outcome: an extended activity completes and the next permitted entry starts without a generation task; the player can also independently select/repeat eligible prepared local work without generation. Another run escalates exactly once into a meaningful scene. Use the existing solo actor and scope, not broad cooperation as a prerequisite.
- Owners: game clock-condition and bounded recurring-rule semantics; application settlement/reporting; Storyteller event admission; autonomy's queue/permission contracts; compact play view. Extract rule dispatch when introducing the second rule. A timer-shaped contribution counter is not a valid rest/wait implementation.
- Split mechanical completion from configurable follow-up: report-only narration, quiet continuation and interactive preparation are distinct. Support a finite authored chain with selected completion/milestone hooks and explicit horizon/stop conditions; revalidate each transition. An event captures committed evidence and controls incompatible progression. Use one continuation owner and the existing generation/publication path with explicit report-versus-scene contracts and offline sources.
- Add one small authored, versioned local opportunity package through the same admission boundary intended for future generated packages. Recompose fresh offers deterministically after quiet outcomes; recheck scope, actor/resource requirements and controlling scene restrictions at start. Exercise continuous invalidation on one supported state change. Keep runtime definition generation and broad world creation in later scope; do not require a model call to expose prepared alternatives or make consumed offers replayable.
- Evidence: no-event completion/transition with zero task admissions and zero provider calls; occurrence without extra productivity rolls; restart/reload/pace changes preserve checks and queue cursor; one event prevents later work until resolved; unavailable generation is legible. Use deterministic fixtures to show both quiet and event branches, then one bounded wall-clock rehearsal.
- Additional acceptance: player finishes A, freely selects B and repeats a genuinely repeatable opportunity with zero task admissions. A changed scope/scene condition rejects a stale start before effects; restoring a supported condition restores eligibility without a call. Reselecting cannot reset finite findings/cooldowns or repeat prior rewards. This is not demonstrated by a hardwired chain alone.
- Contrast: the same completion under a narration-and-continue policy; selected arrival narration without a random event; an interactive arrival holds instead. Assert late reports do not change current choices, repeated hooks do not duplicate rewards/successors, and concurrent event/milestone triggers respect the controlling hold.
- Exit: player can leave, return to earned results and understand an interruption. Implement the quiet sequence and minimal queue/event contract as one coherent cross-feature slice; do not duplicate queue ownership in this feature. Broader delegated choices follow the autonomy phases.

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

- Depends on phase 4. Reuse the clock/recurring-rule protocol introduced in phase 2. Add minimal traversal over declared place/connection identities and bounded autonomous staged transformation. Do not rebuild rule dispatch or introduce a second scheduler.
- Owners: game rules, relevant target/effect vocabulary, estimates/projections and fixtures. No grid/pathfinder/general physiology. Immediate actions retain direct receipts.
- Evidence: world wait versus active attendance; diversion preserves position while time advances; microbe transforms without a worker or equipment. All share authority/recovery.
- Exit: new rules do not introduce a second scheduler or species branches.

### 6 — Configurable Storyteller and player acceptance

- Earlier phases each include fixture offers/views. Broaden supported proposal composition, evidence diagnostics and explicit method/condition revisions; no replacement of saved work by regenerated offers.
- Owners: Storyteller catalogue/context/validation, private admission, fixtures, compact play view and QA journeys.
- Evidence: browser repair/cooperation/diversion/return; personal and abstract contrasts; expired/invalidated work with useful choices; reload/restart and pending narration. Separate fixture correctness, runtime evidence, owner taste and future live quality.
- Exit: player understands what persists, who can act and what can be lost without reading debug IDs. Fold agreed contracts into permanent docs and remove completed folders only when remaining acceptance is delivered or explicitly rescaled.

## Alternatives and limits

A giant optional-field activity object admits nonsense combinations; use typed rule/policy composition. A class per profession/species requires engine edits for settings; use declared capabilities/targets/methods. Arbitrary generated scripts make validation/replay unpredictable; reject unsupported semantics. A full entity-component world simulator adds scope before proving a better scene; start with relevant actors/targets. The single advancing pointer remains a temporary solo-proof limit, with removal in phase 3. Immediate actions share authority without becoming activities; events/chapters are not process families.

## Current checkpoint

- Current phase: design now includes prepared local opportunities and model-free player reselection/repetition, not just quiet execution of accepted chains. Runtime unchanged. Next dependency remains exact-instance/shared-clock foundation using BC-04, followed by phase 2's scoped opportunity and joint follow-up/chain proof. The [small connected POC](../../technical/playthroughs/poc.md) includes both player-directed and queued paths; no full village generator is required.
- Reviewed revision: `53ad6c1`. Current `composeOpportunities` filters supplied plans but does not establish durable local activity availability. This feature owns work and scoped eligibility; autonomy consumes eligible opportunities into accepted chains and owns follow-ups/absence permission. Retained commitments, reusable local packages and chronology correction remain incomplete.
- Verification: source/design inspection only; no builds/tests/runtime session or provider calls. Exact dice/timing in the atlas are illustrative fixture inputs. Existing integration coverage remains narrower than the full target flow.
- Open decisions: product defaults in FEATURE.md. Multiplayer control/holds and combat rules remain separate, not prerequisites for solo cooperative proof.
- Spend: no provider calls, $0 for this pass; cumulative OpenRouter usage unverified. Resetting Codex usage does not authorize live game inference.
