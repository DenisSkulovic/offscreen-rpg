# Bounded autonomy and re-entry plan

Feature: [Bounded autonomy and re-entry](FEATURE.md)
Execution scope: proposal only; no implementation, notification integration or provider call is authorized.
Implementation owner: Cursor by default; reviewer: Codex.

## Dependencies and sequencing

The [activity foundation](../2026-09-18--16-48--activity-processes-and-progress/PLAN.md) supplies authoritative progress and fixes clock ownership first. Its phase 2 and the minimal queue/event slice here are one connected delivery: quiet rest/work → permitted next routine → optional scene. Do this before broad cooperation. Existing narrative deadlines are reusable infrastructure, not automatic authority for mechanical absence. No external notification provider is needed.

## Proposed queue and event contract

### Queue admission and continuation

Persist a revisioned story/actor-scoped plan with ordered entry IDs, accepted definition snapshots, target bindings, horizon, permission/limit snapshot and cursor. Each entry identifies new work or an exact retained instance. Definition terms are immutable; runtime eligibility and remaining allowance are checked again at actual start. Never use an old public offer as permanent authority for queued execution.

The application transaction verifies control, settles due activity boundaries, checks the current queue revision and admits the next entry under current world/capacity conditions. Commit entry consumption, activity start, relevant claims, receipt and wake-up atomically. Deduplicate by plan/entry identity, not workflow delivery. Failed admission leaves the cursor and remaining entries inspectable, with a known blocker. An unsupported or stale binding does not prompt automatic regeneration or reinterpretation.

Completion may advance the queue in the same bounded settlement transaction without creating a Storyteller task. Multiple due entries catch up in bounded batches; stop at the first event, blocker, permission limit or horizon. Handle an activity still running at the horizon using its captured stop/interruptibility policy: do not promise a stoppable horizon for work that cannot honor it. Editing/canceling pending entries uses an expected revision; stopping current work is a separate admitted lifecycle operation with its own costs and disclosures.

Keep queue state, participation, campaign pause and scene response state independent. A suspension retains the queue cursor. Scene resolution revalidates resume/next-entry permission; no completed or missed entry is replayed on return. The queue is the product mechanism for already chosen intentions, not a substitute for a planning agent.

### Escalation without constant inference

Separate routine resolution, occurrence nomination and scene admission. A due rule can emit a candidate with stable identity, source receipt/world revision, cause, scope and urgency. Mechanical hazards already committed are different from optional plot opportunities. Selection uses supported policy, current relevance and cooldown/history; it requires no LLM classification call. Probability semantics are per defined exposure/boundary, not per worker poll, and campaign/event history survives restarting a routine. A seed/test provider controls the quiet and nominated branches for offline evidence.

Record an accepted escalation and its hold/queue effect under the story lock with an outbox intent. Admit generation in the existing separate task/budget path; preserve its uncertain-billing stop behavior. Keep at most one unresolved escalation in the initial solo scene. Coalesce redundant optional candidates; do not drop independently committed hazards. Eligibility and cooldown decisions are recorded so a retry cannot reroll whether a scene happens. Storyteller style can guide content but is not an executable occurrence probability.

An event task receives the escalation cause, settled interval, relevant capabilities/state, prior significant evidence and remaining queued intentions. It returns proposed scene facts and supported options within those constraints, including the possibility that an optional opportunity has no coherent development. Validate required new facts/entities and plans through explicit supported admission before publication. A villain in prose is not by itself a mechanically authorized target. This is a task-contract extension using existing execution/publication/accounting, not an extra always-running agent.

Publication fences the event ID, world state and queue/hold revision. It cannot replay routine effects or backdate new consequences before the captured boundary. Stale results never auto-resume progression; use explicit bounded recovery without automatic provider retry. If the candidate was optional and no facts/hazards committed, an admitted no-event result can release the hold; otherwise leave an explained recovery state. Preserve pause ownership throughout.

Initial solo default: hold the domain from accepted escalation until event resolution or an admitted fallback. Start the response deadline only after options successfully publish. Provider delay, exhausted allowance and closed browsers cannot consume a response window the player never had. Notifications report publication/current state and never control the deadline.

### Free quiet life and honest cost evidence

Ordinary advancement, completion, queue transitions, mechanical logs and a factual recap have no path to provider execution or generation admission. They may use templates derived from receipts. A rules-defined wait need not roll; uncertain work can use D&D checks without LLM calls. Quiet results do not require a fresh public offer to continue pre-authorized work.

Measure generation-task admissions and provider attempts separately for plan preparation, quiet execution, event preparation and later literary recaps. A fake provider charging zero does not establish the architectural no-call property. The existing activity runtime currently requests narration on every non-running settlement; split that branch so only an explicit scene handoff enters generation. Player-requested novel plans and eventual live scene creation may cost tokens; present that boundary truthfully.

## Phases

### Phase 1 — Agree the autonomy promise

- Outcome: player-facing policy and three concrete decisions—safe delegation, disallowed high risk and no-longer-valid fallback.
- Owners: time/autonomy, player experience and story creation.
- Work: choose the initial vocabulary, deadline semantics, pause interaction and always-hold categories.
- Checks: owner walkthrough from campaign creation through absence and return.
- Exit: the policy is understandable without reading implementation terms.

### Phase 2 — Bounded quiet plan and one escalation

- Outcome: a small accepted routine plan runs unattended through a quiet transition; a contrasting branch creates one recoverable scene opportunity.
- Owners: queue persistence/application admission, activity settlement, game occurrence policy, Storyteller task/publication and compact current/return projection.
- Work: implement the minimal contract above with the activity foundation's second phase. Start with hold-on-event, an explicit horizon and known scripted terms; no fallback selection or generated replanning is required for the first proof.
- Evidence: quiet branch has no generation tasks; real queue transition instead of injected completion/offer state; duplicate wakes/restart/pace changes preserve event exposure; event blocks the next entry; failed/unavailable generation produces an explained hold; known receipts support a factual recap.
- Exit: the owner can follow time-earned results and the routine-to-scene transition without a dashboard or a live-model bill.

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

- Current phase: design expanded around player-selected quiet routines and selective generated scenes. Next: review the concrete defaults, then implement the quiet plan/event slice after the activity clock correction. Do not require broad cooperation or notifications before this proof.
- Reviewed revision: `63e06b9`; documents only changed. Inspected activity completion still unconditionally requests consequence narration, so the no-generation quiet transition requires a code change.
- Verification: source/design inspection; no tests, builds or provider calls. Batman/Seyda Neen durations and day-long scheduling remain brainstorming, not fixed requirements.
- Open decisions: initial bounds/risk vocabulary and proposed solo hold policy. Fallback categories precede delegated scene decisions; a notification channel does not block offline acceptance.
- Provider spend and accounting certainty: $0; cumulative OpenRouter usage not verified.
