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

### T4 — Content-owned duration calibration

- Outcome: fixture and canonical guidance express the intended world's time scale without introducing human timing defaults into the engine.
- Owners: the maintained Seyda authorized plans, the generic committed-time rule page and the Vvardenfell world orientation.
- Evidence: the first valid state-indexed v11 opening exposed a five-second authorized directions exchange, an eight-second authorized road leg and a model-estimated thirty-minute close inspection. The exact packet contained the thirty-minute shift but no world-library duration calibration.
- Change: the Seyda directions exchange is 60 fictional seconds and its first meaningful road segment is 900 seconds. The generic rule distinguishes fictional seconds from scheduler heartbeats and requires independent estimation; the Vvardenfell library supplies local human-scale ranges. Abstract and nonhuman worlds remain free to supply different scales.
- Exit: focused Storyteller tests preserve the revised authorized durations, and no universal prompt or engine branch assumes human time. Status: implemented.

## Current checkpoint

- Current phase and exact next action: checkpoint T4, then determine how start-package world guidance should be included in the next held live packet before another duration sample. Do not compensate with engine-wide human timing defaults.
- Base/reviewed Git revision and relevant uncommitted changes: the state-indexed v11 live proof is pushed at `21b5e2c`; T4 content and fixture corrections are the current working change.
- Actual checks/results for this revision: the prior Storyteller suite passed 40/40. Generation `76d3839b-271e-4e14-802c-9073765cc820` supplied the diagnostic: the authorized five-second conversation came from fixture content, while the fresh thirty-minute inspection was estimated from a packet whose only explicit human duration was the warehouse shift. Focused verification for T4 is pending.
- Matched live evidence: both stories used Character-Driven Drama, Neris and the Seyda warehouse start. Sol story `a15c682c-9a30-4d92-b966-a2ed8d551299` produced five successful Storyteller turns, completed and paid the job at game second 1,800, then sustained a coherent relationship with a laborer through advice, an invitation and names. Its successful calls cost USD 0.125934. Luna story `88433270-ab02-4901-8855-4808ec5dc761` produced a usable opening on its second sample, but represented the thirty-minute shift as a 1,800-second finite action and then offered a second process which consumed another 2,100 seconds. Deterministic mechanics still paid exactly six septims once at game second 3,900. Its next response stopped normally but failed output validation, stranding the story after two usable Storyteller consequences. The Luna story spent USD 0.011540; its discarded first opening spent USD 0.003956 after reaching the output limit by padding a complete-looking scene with whitespace.
- Interpretation: Historical Sol was materially stronger than Luna but did not preserve the authored warehouse plan. The fresh Sol run selected the authorized reference and the engine preserved it exactly, resolving that blocker for one live case. Its consequence still proposed a no-op quantity effect; new proposal admission now rejects zero deltas without making older stored offers unreadable. The later valid v11 opening shows that duration quality must be attributed separately to authored fixture terms, supplied world calibration and model estimation. Durable identity/relationship materialization and later recall remain gameplay blockers. Do not tune creative temperature from these traces.
- Unresolved findings/blockers: OpenRouter can return HTTP-200 embedded `provider_unavailable` envelopes which still require operator reconciliation. The normal executor defaults to a one-shot tools-disabled recipe; bounded exploration exists but must be evaluated separately on a fixed missing-context case rather than mixed into the next gameplay baseline.
- Provider spend and accounting certainty: every fresh attempt is reconciled with a known provider generation and zero reservation. This tranche added USD 0.089071, including the uncommitted pre-reset opening and USD 0.031731 for the invalid tally response. Cumulative 2026-09-23 paid development spend is USD 0.2682458; provider usage is USD 0.570011996 with USD 9.429988004 remaining. The diagnostic stopped on that validation failure; do not release another live call until repair is implemented provider-free.

### Next live experiment — held until the current blockers are fixed

- Hypothesis: after routine activity boundaries stop polluting narrative history and a consequential new person/relationship is promoted into source-linked canonical documents, one five-turn Character-Driven Drama Sol diagnostic will preserve concise work completion, develop a relationship, leave the immediate situation and later recall that relationship from current canonical state rather than only recent prose.
- Fixed inputs: maintained Seyda Neen start, Neris, Character-Driven Drama revision 1, current Sol route/reasoning/output allowance, selected speed and warehouse plan, `single-turn.v1` resources and creative exploration off. No simultaneous profile, prompt, recipe or model comparison.
- Expected improvement: the compact ledger shows no routine contribution passages, an identity/relationship document change with provenance, and a later packet loading that current record for an accurate callback.
- Unacceptable regression: model-authored replacement of the authorized warehouse plan, duplicate wage/time effects, invented callback evidence, compulsory escalation contrary to the profile, invalid/held output without an honest recovery path, or any ambiguous/unreconciled charge.
- Cost/stop bound: inspect the exact held opening packet and current pricing first; release one call at a time, reconcile every attempt, and stop the diagnostic on the first structural/authority/accounting failure. The 2026-09-23 daily development ceiling is USD 1.00 and the original total-credit ceiling still applies; the diagnostic should spend only what its five useful turns require.

### Separate exploration experiment

After the one-shot baseline is classified, compare the same immutable missing-context task with one bounded `memory-exploration.v1` posture. Hold story state, profile, model, final-output allowance and publication disabled. The exploration run must identify useful evidence unavailable to the one-shot packet without exceeding its captured round/read/retained-byte/cost limits. Do not call ordinary extra deliberation a tool-use win, and do not enrich the world library merely to make the agent browse. Adopt an exploratory default only if the retained trajectory improves grounded play enough to justify retransmitted input, latency and charge.
