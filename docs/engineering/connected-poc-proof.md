# Connected generative POC proof

The POC is not established by schemas, canonical storage, retrieval benchmarks or isolated provider responses. It is established when one ordinary campaign survives a short sequence of real generated Storyteller turns while deterministic application mechanics remain authoritative and the resulting story fulfills its selected Storyteller and campaign commitments well enough that the owner wants to continue that configured experience.

This document owns that proof. The broader playthrough atlas supplies design pressure; feature plans own implementation slices; QA journeys own repeatable execution evidence.

## First proof session

Use the maintained Seyda Neen start: the player arrives as a released prisoner in a pinned world/rules/start package. Scenario content may name Vvardenfell, local people, places and opportunities. Shared runtime code must not branch on Seyda Neen, employment, human biology, Earth time or a chosen plot.

The POC is ready only when the owner can play a **legitimately enjoyable 10–15 committed Storyteller-turn story that matches its captured profile, direction, opening and established fiction**, counting the generated opening as turn one. Enjoyment here is not a hidden demand for excitement, speed or drama: a deliberately quiet, dull or chaotic configuration succeeds by realizing that intent coherently. A model round used for memory discovery is not another Storyteller turn; a quiet mechanical settlement without narration is not falsely counted as one. Mechanical correctness and valid prose are prerequisites, not substitutes for profile adherence or the owner's desire to continue the configured experience.

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

Only after P3 is repeatable, continue through 10–15 turns and fork one useful checkpoint to try a materially different choice. The owner judges separately whether the run honored its captured creative commitments and whether that configured experience was enjoyable and worth continuing. This also tests continuity, branch isolation and reuse of a good story position without requiring a giant history.

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

The proof is **not ready or passed**. Two historical Sol stories and their weaker Luna contrasts established that Sol materially improves prose, choice quality, continuity and process selection. The corrected historical Sol story `a15c682c-9a30-4d92-b966-a2ed8d551299` reached five successful Storyteller turns, advanced the warehouse work by 1,800 fictional seconds, paid six septims once and developed a coherent acquaintance with Darvyn. Fresh story `1b42fa1b-7732-4311-88d1-033b182139dc` now adds the missing authority evidence: its live opening selected the captured warehouse reference, and the engine preserved its exact duration, reward, closure and identity through completion. It currently has only two successful Storyteller turns. This is promising evidence, not a completed five-turn diagnostic or POC.

Those runs used an opening task that received the authored prose, character and facts but not the executable plans, and asked the model to recreate them. The successful Sol opening therefore changed the maintained warehouse plan's action identity, capacity, condition policy and occurrence scope, omitted the effect that closes `warehouse-shift-available`, and added three no-op quantity effects. Luna instead admitted a full 1,800-second finite action followed by a separately invented contribution process that consumed another 2,100 seconds. Both outputs passed the structural validator. The provider-free fixture already used the exact authored plan, so its payment proof did not cover that live authority boundary.

The persisted historical Sol state still says `warehouse-shift-available: true`; only its model-invented occurrence scope prevents the exact same plan from repeating. Opening admission now captures the fixture's authorized plans on the task. The provider sees a reference summary, and validation substitutes the immutable plan when the model selects its key. A fresh plan remains valid only for a commitment whose key and process action id are not already authorized. A reconstructed body for a supplied key is rejected. The fresh live opening selected both `work-warehouse-shift` and `ask-about-the-road`; warehouse completion reached game second 1,800, paid six septims once and closed availability. That authority boundary is now live-proved for this case.

Other concrete blockers found in the preserved evidence:

- The Luna story's final response passed provider JSON-schema decoding and stopped normally, then failed application policy because it added a proficiency modifier. Immediate-check schemas now transmit advantage and disadvantage as false and modifiers with a maximum of zero, matching the validator. Process checks can still carry their own modifiers.
- A parseable, schema-complete Luna opening was discarded because the model padded its output and reported `finish_reason: length`. A length result is now accepted only when the content is complete JSON that passes task validation. Truncated JSON still fails.
- Settled invalid output that was actually billed still consumes its one-shot envelope. The two observed Luna failures were the modifier mismatch and the padded length result, which the schema and length rules now prevent. A billed invalid candidate still needs an explicit repair round before another 10–15-turn run.
- OpenRouter twice returned an HTTP-200 `provider_unavailable` envelope for Sol. That envelope is now a zero-charge unsent release, so the funding account stays open and the existing intention retry can dispatch again. Any other malformed HTTP-200 body remains uncertain.
- Consequence packets are roughly 46 KB. About 22 KB is the general output schema; the model receives all prior unselected offer branches and a growing active-scene transcript, while normal turns receive no prompt-cache hit. The five successful Sol calls transmitted about 220 KB, consumed 38,276 prompt and 4,799 completion tokens, cost USD 0.125934 and averaged 22.9 seconds. Narrow capability-specific schemas and omit superseded branches before shrinking creative context.
- Model packets now name the campaign coordinate `elapsedFictionalSeconds`, and the default elapsed calendar labels that coordinate as fictional seconds. Internal persistence fields still use `tick`. Player chrome uses the same fictional-second wording. A campaign whose stored calendar unit is still named tick keeps that stored label until its settings are recreated; the provider projection rewrites the word tick in the label it sends.
- Contribution boundaries became seven repetitive story passages in the Luna history. Routine work evidence belongs in the activity ledger and a bounded completion/return summary unless a boundary creates an actual scene.
- Darvyn's name survives in a current continuity note but no durable identity or relationship document was created. The run has not proved progressive materialization, later retrieval or a callback after leaving and returning.
- The fresh consequence proposed a meaningless zero-delta quantity change beside a real departure effect. New proposal admission now rejects zero deltas, while the storage schema remains able to read already-persisted offers; the contract states that omission means no quantity change.
- After selecting the tally inquiry, Sol produced grounded prose and useful choices but repeated that zero-delta pattern in one sibling road plan. The exact settled response was rejected with `invalid_output`, leaving the 60-second action committed and the story held. Prompt `storyteller.v10` named the rule but its schema still admitted zero. That historical one-shot task remains unrepairable, but newly captured policy-authorized tasks now have one explicit correction round under the original operation ceiling. Live story `23ea2420-d8e5-41a5-8c83-9346184e52fe` proves the opening repair case: the same zero-delta defect was retained, corrected without changing valid prose/plans, settled across exactly two attempts and published once. Its following 60-second consequence succeeded in one round. A first `storyteller.v11` probe decoded the compact mechanical-opening envelope and did not repeat the zero-delta defect, but semantic admission rejected a road plan that required one septim while the captured character had zero. The next revision indexed permitted prerequisites to captured state; its first transport check exposed an untyped empty array-item schema and OpenAI rejected it before inference at zero charge. After retaining typed items on closed arrays, a fresh one-shot v11 Sol opening passed strict transport and semantic admission with five plans, including the exact authorized warehouse process. Generation `76d3839b-271e-4e14-802c-9073765cc820` settled at 17,796 microusd with matched accounting, 3,591 prompt and 882 completion tokens, and zero reasoning. The opening follows the Quiet Eerie Mystery profile well. Its five-second directions plan was traced to authored fixture content rather than model estimation and is now 60 seconds; the related first road segment is now 900 seconds. The model's thirty-minute close inspection came from a packet without world-scale calibration beyond the warehouse shift, so Vvardenfell now owns bounded human-scale guidance rather than the engine acquiring a universal default. The fixed evaluation path now imports and attaches the same pinned start package as Story mode. Provider-free held generation `9eeaf3fe-d19c-4b1b-a5a4-5cfb0f6d7350` confirms that its 36,666-byte request contains both the world calibration and selected generic time rule, with zero provider attempts or spend. Departure without a typed location effect motivated `storyteller.v12`: fresh plans now declare branch-specific typed fact transitions and admission requires exact matching effects. Generation `7415d287-7c03-475f-ab8f-887c37c25799` passed strict transport and admission with five plans, 6,626 prompt and 673 completion tokens, zero reasoning and matched 23,294-microusd accounting. Its fresh plans used empty transition lists; the only nonempty transition came from an exact authorized directions reference, so a fresh model-authored transition remains unproved. The sample also exposed intention-resolution and durable-discovery questions for the short connected path. Sustained 10–15-turn play and later recall remain acceptance gaps.
- Resetting the disposable local database exposed two stale raw-SQL field names in story listing and the session inspector. Both now use the fictional-second schema names; this was local tooling drift, not a provider or gameplay failure.

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

The next evidence tranche is the fresh connected diagnostic:

1. Authorized opening references are implemented and live-proved once. A selected key substituted the captured duration, effects, closure condition and occurrence identity through settlement.
2. Immediate-check schemas now match the no-situational-modifier policy. Complete JSON with `finish_reason: length` is accepted. HTTP-200 `provider_unavailable` releases as unsent. A billed invalid candidate still needs one explicit repair round.
3. Model and default player time say fictional seconds. Internal tick fields remain. Routine running activity boundaries now update activity state, roll history and the public projection without appending narrative passages; terminal completion, interruption and block passages remain meaningful history.
4. reduce task packet/schema breadth, then compare the current all-branch planning contract with an intent-first selected-branch plan using saved packets before choosing an architecture;
5. Prompt v8 defines the neutral promotion threshold, and the maintained provider-free return benchmark proves a source-linked identity and relationship can cross unrelated material and appear as current records in a later task. Add one explicit, budget-sharing repair for a settled invalid ordinary turn, then recover or restart the fresh diagnostic before testing identity materialization and later recall;
6. only then evaluate narrow profile tuning. Preserve the current Sol tendency to end scenes with explanatory relational summaries as a hypothesis; do not hard-code a generic prose preference from one story.

All latest live attempts are settled with zero reservation and no uncertain delivery. Further live comparisons remain deliberate experiments and follow the repository spending controls.
