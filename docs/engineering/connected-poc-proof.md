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

The proof is **not ready or passed**. Two real Sol stories and their weaker Luna contrasts established that Sol materially improves prose, choice quality, continuity and process selection. The corrected Sol story `a15c682c-9a30-4d92-b966-a2ed8d551299` reached five successful Storyteller turns, advanced the warehouse work by 1,800 fictional seconds, paid six septims once and developed a coherent acquaintance with Darvyn. This is promising quality evidence, not an authority pass.

Those runs used an opening task that received the authored prose, character and facts but not the executable plans, and asked the model to recreate them. The successful Sol opening therefore changed the maintained warehouse plan's action identity, capacity, condition policy and occurrence scope, omitted the effect that closes `warehouse-shift-available`, and added three no-op quantity effects. Luna instead admitted a full 1,800-second finite action followed by a separately invented contribution process that consumed another 2,100 seconds. Both outputs passed the structural validator. The provider-free fixture already used the exact authored plan, so its payment proof did not cover that live authority boundary.

The persisted corrected Sol state still says `warehouse-shift-available: true`; only its model-invented occurrence scope prevents the exact same plan from repeating. Opening admission now captures the fixture's authorized plans on the task. The provider sees a reference summary, and validation substitutes the immutable plan when the model selects its key. A fresh plan remains valid only for a commitment whose key and process action id are not already authorized. A reconstructed body for a supplied key is rejected. This provider-free contract is implemented; the historical Sol and Luna stories were not migrated, and no new live run has proved a model will select the reference.

Other concrete blockers found in the preserved evidence:

- The Luna story's final response passed provider JSON-schema decoding and stopped normally, then failed application policy because it added a proficiency modifier that the transmitted schema allowed but the application validator forbids. Align the task schema with admissible mechanics; this is a harness defect, not evidence of poor prose.
- A parseable, schema-complete Luna opening was discarded solely because the model padded the remainder of its output allowance with whitespace and reported `finish_reason: length`. The adapter should decide explicitly whether a fully validated JSON value is safe to accept under this finish reason instead of treating every length result as necessarily truncated.
- Settled invalid output leaves the Luna story permanently held with no retry. Recovery must retry preparation/publication of the already committed intention without replaying time, rolls or effects.
- OpenRouter twice returned an HTTP-200 error envelope for Sol. Manual reconciliation proved both attempts unbilled and reopened the same intentions, but ordinary play still lacks that operator recovery path.
- Consequence packets are roughly 46 KB. About 22 KB is the general output schema; the model receives all prior unselected offer branches and a growing active-scene transcript, while normal turns receive no prompt-cache hit. The five successful Sol calls transmitted about 220 KB, consumed 38,276 prompt and 4,799 completion tokens, cost USD 0.125934 and averaged 22.9 seconds. Narrow capability-specific schemas and omit superseded branches before shrinking creative context.
- The model-facing committed-time rule and public world-time label still say `ticks`, although action contracts now request fictional seconds. Remove that contradictory vocabulary from current packets and present elapsed fictional time in the world's available units.
- Contribution boundaries became seven repetitive story passages in the Luna history. Routine work evidence belongs in the activity ledger and a bounded completion/return summary unless a boundary creates an actual scene.
- Darvyn's name survives in a current continuity note but no durable identity or relationship document was created. The run has not proved progressive materialization, later retrieval or a callback after leaving and returning.

The corrected Sol run is real provider evidence. Its passages reference settled OpenRouter generations; the warehouse completion passage is a deliberately deterministic engine result. No story output was patched or replaced. Two failed provider deliveries were manually reconciled only in the accounting state after independent provider checks.

### Corrected Sol compact ledger

| Turn | Position and player act | Provider evidence | Authority/change | Review |
| --- | --- | --- | --- | --- |
| 1 | Tick 0 opening; five choices | packet `1ea67b74`, 35,057 bytes, 26.3 s, $0.026331 | Live model recreated rather than referenced the warehouse plan | Strong grounded opening and agency; mechanical authority failed silently |
| 2 | Select full warehouse shift; consequence at tick 1,800 | packet `ff7d50d0`, one confirmed-unsent overload then 17.6 s cached retry, $0.009029 | Six septims committed once; availability fact remained true | Strong concise closure; duplicated the factual completion passage |
| 3 | Ask the laborer what a newcomer should know; tick 1,860 | packet `6aad5df6`, 46,825 bytes, 19.4 s, $0.029656 | Practical-advice note created | Specific, useful response; five distinct next intentions |
| 4 | Offer to buy him a drink; tick 1,890 | packet `ad8b1419`, 46,965 bytes, 22.6 s, $0.029174 | No typed resource spend and no relationship record yet | Good boundary and reciprocity; final paragraph explains what dialogue already showed |
| 5 | Ask his name; tick 1,920 | packet `09f91daf`, 46,605 bytes, 28.6 s, $0.031744 | Current note records Darvyn; no durable identity document | Strong continuity and six meaningful exits/continuations |

Turn six selected “Ask Darvyn to choose a modest place” and advanced to tick 1,955, but its exact packet `ab33ded0` received a confirmed-unbilled provider-unavailable envelope. It is a committed player action with retryable narration, not a successful Storyteller turn.

### Profile evidence

The profiles did not fail uniformly. Luna's Quiet Eerie Mystery opening used the second stamp and record discrepancy to create restrained unease without forcing danger, while its Driven Adventure opening softened the available pressure until neither opportunity felt urgent. Three Absurd Action Comedy openings contained occasional jokes or comic comparisons but none delivered the profile's requested concrete disruption. Sol's Character-Driven Drama run consistently respected character boundaries, practical motives and grounded exits, although it often added an explanatory final paragraph after the dialogue had already carried the point.

This pattern does not justify changing the shared Storyteller prompt. The comedy and adventure profiles already state their distinctive requirements, and the same Luna route followed the mystery profile more successfully. Treat route capability and instruction adherence as variables, preserve Sol's repeated explanatory endings as a narrow style hypothesis, and retest one profile-owned change at a time only after the authority and recovery defects are fixed.

The next implementation tranche is provider-free:

1. Authorized opening references are implemented. A selected key substitutes the captured duration, effects, closure condition and occurrence identity. Live model selection of that reference is still unproved.
2. align output schemas with application policy, add non-replaying invalid-output recovery, and classify the known provider error envelope without manual database repair;
3. remove current tick-language contradictions and keep routine activity boundary evidence out of narrative passage history;
4. reduce task packet/schema breadth, then compare the current all-branch planning contract with an intent-first selected-branch plan using saved packets before choosing an architecture;
5. prove progressive identity/relationship materialization and a later callback before another 10–15-turn live attempt;
6. only then evaluate narrow profile tuning. Preserve the current Sol tendency to end scenes with explanatory relational summaries as a hypothesis; do not hard-code a generic prose preference from one story.

All latest live attempts are settled with zero reservation and no uncertain delivery. Further live comparisons remain deliberate experiments and follow the repository spending controls.
