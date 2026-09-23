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

- Current phase and exact next action: authorized opening references, immediate-check schema alignment, complete length-finish acceptance, HTTP-200 provider-unavailable unsent release, and fictional-second labels in model context and player chrome are implemented. Internal tick field names remain. Next keep routine activity-boundary evidence out of narrative history, then prove identity/relationship materialization. A billed invalid candidate still has no extra repair round. Do not tune prompts yet.
- Base/reviewed Git revision and relevant uncommitted changes: HEAD is `694de2c`. Authorized opening-plan references are committed at `c80c9a9`; invalid-output/provider-unavailable recovery is committed at `55b014c`; the later orientation/refactor checkpoint is `694de2c`. The current working changes clarify creative neutrality, profile-relative evaluation and the owner's bounded Sol spending policy; they do not change runtime behavior.
- Actual checks/results for this revision: Storyteller build passed. Focused tests passed for immediate-check schema limits, padded length acceptance, truncated length rejection, HTTP-200 provider-unavailable classification, authorized-reference substitution, and the Seyda scripted plan. Application typecheck passed. No provider calls.
- Matched live evidence: both stories used Character-Driven Drama, Neris and the Seyda warehouse start. Sol story `a15c682c-9a30-4d92-b966-a2ed8d551299` produced five successful Storyteller turns, completed and paid the job at tick 1,800, then sustained a coherent relationship with a laborer through advice, an invitation and names. Its successful calls cost USD 0.125934. Luna story `88433270-ab02-4901-8855-4808ec5dc761` produced a usable opening on its second sample, but represented the thirty-minute shift as a 1,800-second finite action and then offered a second process which consumed another 2,100 seconds. Deterministic mechanics still paid exactly six septims once at tick 3,900. Its next response stopped normally but failed output validation, stranding the story after two usable Storyteller consequences. The Luna story spent USD 0.011540; its discarded first opening spent USD 0.003956 after reaching the output limit by padding a complete-looking scene with whitespace.
- Interpretation: Sol is materially stronger at multi-turn character continuity and at choosing a plausible mechanical shape. It did not preserve the authored plan: it changed identifiers, capacity, boundary policy and one-time scope, omitted the availability-closing effect and emitted no-op quantity effects. Luna's duplicate-duration plan made the same authority defect visible rather than creating it. Its later invalid candidate also exposed a schema/policy mismatch: the transmitted schema allowed a proficiency modifier that application validation rejects. Opening admission now substitutes an authorized plan reference instead of accepting that reconstruction. Schema alignment and invalid-output recovery remain open. Do not tune prompts from these traces.
- Unresolved findings/blockers: internal persistence and mechanical coordinate names still use `tick`, `elapsedTicks`, target/due ticks and related function names. An inventory found roughly 700 references across calendars, persistence, reports, memory metadata and QA; changing them as incidental cleanup would be unsafe. OpenRouter can also return HTTP-200 embedded `provider_unavailable` envelopes which still require operator reconciliation.
- Provider spend and accounting certainty: every Luna attempt settled with known provider IDs and zero reservation. The matched Luna work added USD 0.015496 including the discarded opening. Sol's two overload envelopes were previously reconciled as confirmed unsent. Stop the local server after recording the final cumulative provider total.

### Next live experiment — held until the current blockers are fixed

- Hypothesis: after routine activity boundaries stop polluting narrative history and a consequential new person/relationship is promoted into source-linked canonical documents, one five-turn Character-Driven Drama Sol diagnostic will preserve concise work completion, develop a relationship, leave the immediate situation and later recall that relationship from current canonical state rather than only recent prose.
- Fixed inputs: maintained Seyda Neen start, Neris, Character-Driven Drama revision 1, current Sol route/reasoning/output allowance, selected speed and warehouse plan. No simultaneous profile, prompt or model comparison.
- Expected improvement: the compact ledger shows no routine contribution passages, an identity/relationship document change with provenance, and a later packet loading that current record for an accurate callback.
- Unacceptable regression: model-authored replacement of the authorized warehouse plan, duplicate wage/time effects, invented callback evidence, compulsory escalation contrary to the profile, invalid/held output without an honest recovery path, or any ambiguous/unreconciled charge.
- Cost/stop bound: inspect the exact held opening packet and current pricing first; release one call at a time, reconcile every attempt, and stop the diagnostic on the first structural/authority/accounting failure. The 2026-09-23 daily development ceiling is USD 1.00 and the original total-credit ceiling still applies; the diagnostic should spend only what its five useful turns require.
