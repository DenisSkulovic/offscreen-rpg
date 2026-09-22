# Connected generative POC proof

The POC is not established by schemas, canonical storage, retrieval benchmarks or isolated provider responses. It is established when one ordinary campaign survives a short sequence of real generated Storyteller turns while deterministic application mechanics remain authoritative and the resulting story is worth continuing.

This document owns that proof. The broader playthrough atlas supplies design pressure; feature plans own implementation slices; QA journeys own repeatable execution evidence.

## First proof session

Use the maintained Seyda Neen start: the player arrives as a released prisoner in a pinned world/rules/start package. Scenario content may name Vvardenfell, local people, places and opportunities. Shared runtime code must not branch on Seyda Neen, employment, human biology, Earth time or a chosen plot.

The POC is ready only when the owner can play a **legitimately enjoyable 10–15 committed Storyteller-turn story**, counting the generated opening as turn one. A model round used for memory discovery is not another Storyteller turn; a quiet mechanical settlement without narration is not falsely counted as one. Mechanical correctness and valid prose are prerequisites, not substitutes for the owner's desire to continue.

Across the session, require:

1. a coherent opening grounded in the pinned start/world/rules files;
2. at least one conversational or observational choice with a generated continuation;
3. at least one server-admitted mechanical action whose roll/effects come from code and whose generated consequence narrates the saved receipt;
4. at least one meaningful elapsed-time path—an admitted activity, wait or travel process—not merely prose saying that time passed;
5. at least one canonical change, such as a current character/item/place/thread/world record or typed engine state, visible to a later turn;
6. a later callback to an earlier detail or changed fact, recovered from bounded current context or memory exploration rather than invented recollection;
7. choices that remain meaningfully distinct, include a plausible quiet/non-escalating path when fiction permits it, and never trap the player behind a compulsory paid narration loop.
8. at least one ordinary-life commitment with a substantial fictional duration—such as a warehouse shift—whose real wait is derived from the selected speed, whose progress remains visible for hundreds of one-second scheduler ticks when configured that way, and whose admitted completion produces a durable result such as earned coin.

The first session may use an authored start package and authored mechanical definitions. Arbitrary premise-to-mechanics generation, general travel graphs, full combat, polished UI, semantic search and a ten-thousand-turn history are not prerequisites. The proof is invalid if the harness patches generated output, writes state directly, selects fixture-only backdoors or adds scenario-name branches to shared policy.

## Execution ladder

### P0 — Connected scripted rehearsal

Drive the exact session shape with the offline source through ordinary authenticated application commands. Confirm that opening, Start, selections, mechanics, activity/time, consequence publication, canonical documents and later context can connect without direct database mutation. This proves machinery, not model quality.

### P1 — Held-packet rehearsal

Run the same starting state with provider execution held before every dispatch. Inspect each exact packet's purpose, source revision, context/document manifest, request/schema size, model/provider route and cumulative operation allowance. The harness must support an explicit operator-selected option; repeatedly choosing array index zero is not a gameplay strategy.

### P2 — Three-turn live smoke

After all spending gates are clear, run one opening and two selected continuations with a currently verified route. Reconcile every attempt before releasing the next. Stop on invalid output, uncertainty, unsupported mechanics, incoherent authority or missing evidence. This is transport/prompt compatibility evidence, not the POC.

### P3 — Five-turn diagnostic

From one reviewed opening, complete five Storyteller turns as an intermediate diagnostic. The run has one finite captured allowance and no fallback, automatic retry, judge or background inference. Human selection between generated choices is allowed and preferred. A failed run remains evidence and may be debugged offline; it is never silently repaired into a pass. Passing this stage does not establish the POC.

### P4 — Enjoyable 10–15-turn proof and fork pressure

Only after P3 is repeatable, continue through 10–15 turns and fork one useful checkpoint to try a materially different choice. The owner judges whether the story was legitimately enjoyable and worth continuing. This also tests continuity, branch isolation and reuse of a good story position without requiring a giant history.

## Compact evidence ledger

Record one row per Storyteller turn rather than requiring a reviewer to reread raw traces:

| Evidence | Required compact value |
| --- | --- |
| Position | story/branch, source revision, tick, current passage and interaction kind |
| Player act | selected public label/intent identity and whether it is narrative, mechanical or process control |
| Context | packet hash, total bytes, section byte counts, canonical roots, loaded/omitted handles and memory rounds/reads |
| Generation | requested/reported model, duration, outcome/diagnostic, generated tokens and provider identity |
| Authority | saved roll/receipt, admitted effects, elapsed ticks, publication status and hold/recovery state |
| Change | concise canonical document and typed-state diff; no duplicated raw prose |
| Economy | per-attempt and cumulative charge, reconciliation and remaining captured allowance |
| Review | one short note for coherence, specificity, agency, continuity and desire to continue |

Raw packets, responses and canonical objects remain separately inspectable by identity. The compact ledger links them and highlights deltas; it does not copy all content into another giant report.

## Current readiness and blockers

Implemented foundations include exact held packets, strict structured results, one opening plus one continuation in the live runner, deterministic mechanical receipts, activities/time, canonical start/world/rule/campaign documents, bounded context and memory exploration, persistent accounting and publication recovery.

The proof is **not ready or passed**. The 2026-09-22 headless comparison established:

- the headless client can create a story, select explicit options, wait through activities and capture a durable per-story evidence stream without UI input;
- GPT-5.6 Luna produced serviceable openings but repeatedly encoded ordinary actions as one-to-three-tick micro-actions and once repeated the opening instead of continuing it;
- GPT-5.6 Sol produced materially stronger character continuity and correctly proposed the warehouse work as a process, demonstrating that model capability matters;
- the admitted Sol process lasted only four scheduler ticks because the model was still asked to invent tick counts directly; the fixed-second/fictional-duration conversion remains unimplemented;
- the first activity completion exposed and then verified fixes for nullable post-activity offers and missing worker document-store wiring;
- Sol's drama profile sustained a coherent wage dispute but prolonged it across successive turns instead of paying the existing `septims` quantity, so stronger prose alone did not produce satisfying pacing or ordinary-life closure;
- no run has yet reached 10–15 enjoyable Storyteller turns, substantial configured elapsed time, durable wages and a later continuity callback together.

The next implementation tranche is provider-free:

1. replace model-authored tick counts with model-authored fictional durations and engine-owned conversion under the fixed one-real-second tick contract;
2. give the maintained warehouse commitment an admitted substantial duration and explicit completion wage so the engine, rather than later prose, owns payment;
3. calibrate profile-owned pacing controls and compare profiles one variable at a time, preserving the current live runs as baselines;
4. rerun the five-turn diagnostic before attempting the 10–15-turn proof.

The latest live attempts are settled with zero reservation and no uncertain delivery. Further live comparisons remain deliberate experiments and follow the repository spending controls.
