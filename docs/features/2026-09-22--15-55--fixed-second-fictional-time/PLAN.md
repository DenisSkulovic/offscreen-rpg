# Implementation plan

Feature: [Fixed-second ticks and fictional action time](FEATURE.md).
Execution scope: phases T1–T3 are authorized by the owner's 2026-09-22 instruction to proceed toward the agreed POC. Complete one coherent phase at a time; no provider calls are part of implementation.
Implementation owner: Codex in this thread; owner review remains the final play-quality gate.

## Phases

### T1 — Model/admission boundary and fixed scheduler rate

- Outcome: newly generated finite actions and clock-wait processes carry positive whole fictional seconds. Story speed contains only fictional seconds per fixed one-real-second tick. Application admission and estimates no longer freeze a model-authored scheduler tick count.
- Owners: game time/immediate-action/activity schemas, Storyteller task schemas/instructions/fixtures, campaign settings, finite-action and clock-wait admission/reads.
- Replace disposable versioned shapes together. Keep exact rational earned fictional progress and fixed 1,000 ms scheduling arithmetic. Convert public views and context to fictional seconds plus derived real wait. Do not add aliases that accept the obsolete fields.
- Checks: focused game time/action tests, Storyteller schema tests, and one provider-free campaign finite-action plus clock-wait integration. These cover the authority boundary and speed conversion without pretending to prove the entire clock migration.
- Exit: no generated action schema or current runtime field in this slice asks the model for ticks; builds and focused tests pass.

### T2 — Remaining mechanical time coordinate

- Outcome: contribution/check cadence, world obligations, accepted-plan horizons, calendars and lifecycle events use the same fictional-second coordinate, with legacy tick names removed from current contracts and disposable persistence.
- Owners: game activities/world obligations/calendar, campaign persistence/migrations, controls, worker scheduling, accepted plans and public history.
- Preserve ordering, replay fences, exact partial progress and bounded catch-up. Reset incompatible local prototype data rather than decoding both meanings.
- Checks: A→B→A, equal-boundary world obligation, pause/speed/restart, accepted horizon and calendar projection.
- Exit: repository search finds no current executable field whose `tick` name still means fictional time; historical prose may describe old evidence.

### T3 — Seyda timed-work proof — provider-free path complete

- Outcome: the maintained start supplies explicit local warehouse terms through content/authorized mechanics: substantial fictional duration, bounded work, six-septim completion and no inferred employment semantics.
- Owners: start/world content, generic start-package mechanical opportunity contract, Story mode evidence and connected POC ledger.
- Exercise provider-free first, then run a separately reconciled Sol diagnostic under one profile and one contrasting profile.
- Exit: deterministic play pays once after substantial time; a 10–15-turn owner play attempt can test story quality rather than known timing/reward defects.

## Current checkpoint

- Current phase and exact next action: T2 and the provider-free T3 proof are complete. Current executable contracts, persistence, calendars, obligations, activity/finite-action boundaries, accepted-plan horizons, public history, Storyteller context and developer tooling use explicit fictional-second names; the fixed real-second scheduler is no longer conflated with the canonical coordinate. The maintained Seyda warehouse path advances exactly 1,800 fictional seconds and pays six septims once. Inspect the exact held one-shot Sol packet and current price/allowance next. A billed invalid candidate still has no extra repair round. Do not tune profiles or enable exploration in that baseline run.
- Base/reviewed Git revision and relevant uncommitted changes: base `d182d81`; the T2 fictional-second migration and maintained specifications are the current working change.
- Actual checks/results for this revision: Game built and passed all 34 time/calendar/activity/obligation tests. Storyteller passed all 39 tests, including the transmitted materialization instruction and 48-KiB request bound. The focused disposable-database Seyda proof passed 1/1 after all 12 integration workspaces, including the production web app, built successfully. It advanced the warehouse shift exactly 1,800 fictional seconds and paid once. No provider calls.
- Matched live evidence: both stories used Character-Driven Drama, Neris and the Seyda warehouse start. Sol story `a15c682c-9a30-4d92-b966-a2ed8d551299` produced five successful Storyteller turns, completed and paid the job at tick 1,800, then sustained a coherent relationship with a laborer through advice, an invitation and names. Its successful calls cost USD 0.125934. Luna story `88433270-ab02-4901-8855-4808ec5dc761` produced a usable opening on its second sample, but represented the thirty-minute shift as a 1,800-second finite action and then offered a second process which consumed another 2,100 seconds. Deterministic mechanics still paid exactly six septims once at tick 3,900. Its next response stopped normally but failed output validation, stranding the story after two usable Storyteller consequences. The Luna story spent USD 0.011540; its discarded first opening spent USD 0.003956 after reaching the output limit by padding a complete-looking scene with whitespace.
- Interpretation: Sol is materially stronger at multi-turn character continuity and at choosing a plausible mechanical shape. It did not preserve the authored plan: it changed identifiers, capacity, boundary policy and one-time scope, omitted the availability-closing effect and emitted no-op quantity effects. Luna's duplicate-duration plan made the same authority defect visible rather than creating it. Its later invalid candidate also exposed a schema/policy mismatch: the transmitted schema allowed a proficiency modifier that application validation rejected. Opening admission now substitutes an authorized plan reference, schema alignment is fixed and known unsent provider failure is recoverable. Durable identity/relationship materialization remains the next gameplay blocker. Do not tune prompts from these traces.
- Unresolved findings/blockers: OpenRouter can return HTTP-200 embedded `provider_unavailable` envelopes which still require operator reconciliation. The normal executor defaults to a one-shot tools-disabled recipe; bounded exploration exists but must be evaluated separately on a fixed missing-context case rather than mixed into the next gameplay baseline.
- Provider spend and accounting certainty: every Luna attempt settled with known provider IDs and zero reservation. The matched Luna work added USD 0.015496 including the discarded opening. Sol's two overload envelopes were previously reconciled as confirmed unsent. Stop the local server after recording the final cumulative provider total.

### Next live experiment — held until the current blockers are fixed

- Hypothesis: after routine activity boundaries stop polluting narrative history and a consequential new person/relationship is promoted into source-linked canonical documents, one five-turn Character-Driven Drama Sol diagnostic will preserve concise work completion, develop a relationship, leave the immediate situation and later recall that relationship from current canonical state rather than only recent prose.
- Fixed inputs: maintained Seyda Neen start, Neris, Character-Driven Drama revision 1, current Sol route/reasoning/output allowance, selected speed and warehouse plan, `single-turn.v1` resources and creative exploration off. No simultaneous profile, prompt, recipe or model comparison.
- Expected improvement: the compact ledger shows no routine contribution passages, an identity/relationship document change with provenance, and a later packet loading that current record for an accurate callback.
- Unacceptable regression: model-authored replacement of the authorized warehouse plan, duplicate wage/time effects, invented callback evidence, compulsory escalation contrary to the profile, invalid/held output without an honest recovery path, or any ambiguous/unreconciled charge.
- Cost/stop bound: inspect the exact held opening packet and current pricing first; release one call at a time, reconcile every attempt, and stop the diagnostic on the first structural/authority/accounting failure. The 2026-09-23 daily development ceiling is USD 1.00 and the original total-credit ceiling still applies; the diagnostic should spend only what its five useful turns require.

### Separate exploration experiment

After the one-shot baseline is classified, compare the same immutable missing-context task with one bounded `memory-exploration.v1` posture. Hold story state, profile, model, final-output allowance and publication disabled. The exploration run must identify useful evidence unavailable to the one-shot packet without exceeding its captured round/read/retained-byte/cost limits. Do not call ordinary extra deliberation a tool-use win, and do not enrich the world library merely to make the agent browse. Adopt an exploratory default only if the retained trajectory improves grounded play enough to justify retransmitted input, latency and charge.
