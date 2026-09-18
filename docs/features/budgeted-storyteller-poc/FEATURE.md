# Budgeted, genuinely generated solo POC

Status: Implemented offline scope; focused checks passed. Live evaluation remains deferred.
Approval: On 2026-09-18 the owner explicitly authorized Codex to design and implement the storyteller work across these features, batching checks after the implementation. Live inference remains disabled; paid evaluation is separately gated.

## Intended outcome

The owner can select a storyteller, create a premise, review and start its generated opening, make several meaningful offered choices, leave during a wait and return to a coherent saved story. The system reports what it spent and stops safely when it cannot determine usage. This completes the narrow local solo milestone, not the entire multiplayer/notification/hosted product vision.

Depends on [profiles/runtime](../storyteller-profiles-and-runtime/FEATURE.md) and [continuity/agency](../storyteller-continuity-and-agency/FEATURE.md). Provider integration is not hidden inside a scripted fixture. The same captured tasks, validators and commit path must work with both sources.

## POC product policy

- Solo, offered choices only; setup premise/direction text remains available.
- No automatic choices or fresh generation while the player is absent. A previously accepted prepared interval may finish once; at its next choice the story waits for the player. No unsolicited catastrophic developments during idle time.
- For the local POC, a clearly labeled quick-play timing policy maps positive fictional interval duration to 20 real seconds. Tests inject short intervals. Immediate interactions remain immediate. This is an explicit demonstration setting, not a finished campaign pace system; longer earned-life tuning is subsequent work.
- Both profiles share timing, budget and authority rules. Creative tone is not a provider tier or a permission to bypass consequences.
- New profiled stories continue until the owner stops playing; no automatic character-life ending. Existing scripted conclusions remain supported.
- Readable current scene, choices, pending/blocked state, wait controls, chronology and a list of owned live stories are in scope. Reopen must not require knowing a UUID or finding a bookmark. Keep technical IDs and diagnostics in a separate inspection view.
- No map, visual asset generation, combat/economy simulation, multiplayer, notifications or deployment is required for this milestone.

## Provider and task execution

Implement one server-side adapter for the already intended OpenRouter route. Select its actual model/provider only at the live evaluation gate, after checking then-current official pricing, structured-output support and accounting behavior. No model research or paid probing is needed for offline implementation. Model policy contains one explicit allowlisted route, input/output bounds, timeout and price snapshot; no fallback model, SDK retry or automatic repair in this first live pass.

One opening or chosen-action operation admits at most one provider attempt. One result includes scene, choices, supported interval and continuity changes. No extra critic, summarizer, option-generator, tool loop or speculative branching call. A human may later authorize a separately budgeted retry of a known-settled failure; it is never triggered by HTTP/Temporal redelivery. New gameplay mechanics still require application code.

Use the source boundary established by the runtime feature. Execute network I/O outside database transactions. Before sending, persist the attempt and its budget reservation. Save the response/usage before publication, with sanitized diagnostics and no credentials in artifacts. Publish through the existing validators and story lock. If the process dies after dispatch but before durable settlement, treat the request as potentially billed; never rerun it because a Temporal Activity timed out.

## Budget invariants

The existing $10 deposit is a shared upper allowance intended for at least a month, not a verified available balance or authorization to use all of it. Do not replenish or reset it automatically.

Implement a persistent developer funding account, explicitly configured lifetime allowance, evaluation-run limit and per-operation reservation. Store USD in integer microunits, with exact conversion/rounding from provider charges. Missing or unsupported pricing/usage fails closed. Available allowance equals configured limit minus settled usage minus outstanding reservations; account for previously verified spending rather than starting at a guessed $10 balance.

Reserve atomically across concurrent stories under a shared funding-account lock. Each attempt is unique and settles exactly once. Its conservative upper bound includes uncached input, capped output and any applicable reasoning/fees for the chosen route. Unknown reporting retains the reservation and disables further paid admission globally until reconciled. Local ledger enforcement is conservative admission control, not a promise that an external provider can never overcharge it.

Explicit live opt-in, a run allowance and a global stop control are mandatory. Ordinary tests/startup/demo/reload cannot enable inference because a key exists. Check the stop control immediately before dispatch as well as at admission; it prevents unsent work, while already dispatched work may still be billed and must reconcile. Reading and publishing already validated, still-current prepared content do not require a fresh reservation.

For every attempt retain funding/run/operation identity, route and pricing version, input/output limits, reserved amount, dispatch status, provider identifier when available, reported charge and settlement/uncertainty. Distinguish “not sent,” “settled failed,” and “possibly sent, usage unknown.” An operator can reconcile an uncertain attempt with evidence; do not offer an ordinary player “clear uncertainty” button.

## Failure and recovery contract

| Event | Saved state / player behavior | Allowed retry |
| --- | --- | --- |
| Browser request times out during choice admission | Read/retry the same operation ID; display current saved status | Admission deduplication only; no new inference identity |
| Worker unavailable before dispatch | Intention stays pending, reading/reopen works | Durable delivery can resume; no provider attempt yet |
| Model returned malformed/refused content with known charge | Keep current scene and admitted intention; show generation failed | No automatic repair/fallback; explicit bounded retry only after settlement and separate run allowance |
| Provider timeout or process loss with unknown dispatch/charge | Explain usage uncertainty; preserve reservation and stop paid admission | Reconcile first; no resend |
| Valid result saved, publication interrupted | Reuse saved result and original base fence | Retry publication without a provider call |
| Story advanced before publication | Keep stale result/usage for diagnosis; no state or note changes | Do not regenerate automatically |
| Allowance exhausted or global stop active before dispatch | Clear blocker, no fabricated scene | Explicit resume after limits/stop condition are deliberately resolved |
| Context too large or unsupported narrative capability | Hold with current scene intact | Correct configuration/design; no endless repair loop |

Keep narrative publication outcome distinguishable from generation success. A succeeded generation that could not publish must not be an eternal “storyteller is thinking.” The existing `publicResolutionState` maps source success to running while it awaits publication; extend the persisted/public resolution contract to expose a terminal publication blocker and safe recovery.

The POC retry operation targets the already admitted resolution and uses a fresh caller retry ID, while keeping the chosen intention immutable. Serialize recovery under the story/generation lock; do not create a competing resolution for the same base passage. Persist attempt history separately from the existing generation's last-attempt fields. Permit a new paid attempt only after a conclusively settled prior attempt, explicit retry request, remaining run allowance and all original state fences. Manual evaluation approval limits include these retries. Duplicate recovery requests do not create attempts. The exact transport/schema is a phase-2 contract to finalize against implemented runtime state, not an invitation to reuse an arbitrary new choice ID.

## Acceptance and the live gate

First prove the following entirely with injected fake provider responses and a simulated ledger: concurrent reservations cannot overspend admitted allowance; duplicate dispatch/settlement is harmless; unknown usage stops further requests; restart never repeats a possibly billed attempt; saved successful output publishes once; profile/notes/intentions survive throughout. Simulated amounts are not reported as OpenRouter charges.

Only then propose a concrete live evaluation to the owner: verified available allowance, named route/current prices, maximum total input/output per call, one opening plus a bounded number of chosen actions, total run cap including failures, and stop conditions. The owner must explicitly authorize that run. The proposal must fit the remaining month allowance; this design sets no automatic dollar amount and does not presume the full deposit is still available.

Use two short independent playthroughs with the same pineapple premise and contrasting profiles, initially one opening plus up to four selected actions each (maximum ten calls total, fewer if the authorized cap demands it). Include a real wait/reopen in one. Apply the continuity/agency rubric to actual generated text. A separate offline long-history case proves retrieval beyond that short live window. Do not certify two-month or month-long narrative quality from ten calls.

To call the POC genuinely playable, both runs must show profile adherence, meaningful options, respect for selected intentions, continuity and a useful next decision after returning. Any dimension scored zero blocks a quality claim; report latency and actual settled spend separately. If it is dull, incoherent or too costly, record the precise failure and stop. Improve the smallest responsible layer; do not automatically respond by adding agents or buying a larger model.

## Decisions still needed

Local solo scope and quick-play/absence policy were authorized with implementation. At the later live gate: exact model/provider, verified allowance and explicitly authorized run cap. All can be exercised offline first; implementation must not stall waiting for a model name.

## Owning specifications

Owning contracts: [player experience](../../player-experience.md), [time](../../time-and-autonomy.md), [runtime](../../technical/storyteller-runtime.md), [context/cost](../../technical/context-and-cost.md), [execution](../../technical/execution.md), [lifecycle](../../technical/story-lifecycle.md) and [delivery](../../technical/delivery-and-validation.md). Apply [spending rules](../../../.agents/rules/spending.md) throughout.
