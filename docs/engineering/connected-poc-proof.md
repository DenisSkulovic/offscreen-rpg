# Connected generative POC proof

The POC is not established by schemas, canonical storage, retrieval benchmarks or isolated provider responses. It is established when one ordinary campaign survives a short sequence of real generated Storyteller turns while deterministic application mechanics remain authoritative and the resulting story is worth continuing.

This document owns that proof. The broader playthrough atlas supplies design pressure; feature plans own implementation slices; QA journeys own repeatable execution evidence.

## First proof session

Use the maintained Seyda Neen start: the player arrives as a released prisoner in a pinned world/rules/start package. Scenario content may name Vvardenfell, local people, places and opportunities. Shared runtime code must not branch on Seyda Neen, employment, human biology, Earth time or a chosen plot.

The minimum successful session contains **five committed Storyteller turns total**, counting the generated opening as turn one and requiring at least four later turns after meaningful player selections. Ten total turns is the stretch target once the five-turn path is repeatable. A model round used for memory discovery is not another Storyteller turn; a quiet mechanical settlement without narration is not falsely counted as one.

Across the session, require:

1. a coherent opening grounded in the pinned start/world/rules files;
2. at least one conversational or observational choice with a generated continuation;
3. at least one server-admitted mechanical action whose roll/effects come from code and whose generated consequence narrates the saved receipt;
4. at least one meaningful elapsed-time path—an admitted activity, wait or travel process—not merely prose saying that time passed;
5. at least one canonical change, such as a current character/item/place/thread/world record or typed engine state, visible to a later turn;
6. a later callback to an earlier detail or changed fact, recovered from bounded current context or memory exploration rather than invented recollection;
7. choices that remain meaningfully distinct, include a plausible quiet/non-escalating path when fiction permits it, and never trap the player behind a compulsory paid narration loop.

The first session may use an authored start package and authored mechanical definitions. Arbitrary premise-to-mechanics generation, general travel graphs, full combat, polished UI, semantic search and a ten-thousand-turn history are not prerequisites. The proof is invalid if the harness patches generated output, writes state directly, selects fixture-only backdoors or adds scenario-name branches to shared policy.

## Execution ladder

### P0 — Connected scripted rehearsal

Drive the exact session shape with the offline source through ordinary authenticated application commands. Confirm that opening, Start, selections, mechanics, activity/time, consequence publication, canonical documents and later context can connect without direct database mutation. This proves machinery, not model quality.

### P1 — Held-packet rehearsal

Run the same starting state with provider execution held before every dispatch. Inspect each exact packet's purpose, source revision, context/document manifest, request/schema size, model/provider route and cumulative operation allowance. The harness must support an explicit operator-selected option; repeatedly choosing array index zero is not a gameplay strategy.

### P2 — Three-turn live smoke

After all spending gates are clear, run one opening and two selected continuations with a currently verified route. Reconcile every attempt before releasing the next. Stop on invalid output, uncertainty, unsupported mechanics, incoherent authority or missing evidence. This is transport/prompt compatibility evidence, not the POC.

### P3 — Five-turn proof

From one reviewed opening, complete the minimum session above. The run has one finite captured allowance and no fallback, automatic retry, judge or background inference. Human selection between generated choices is allowed and preferred. A failed run remains evidence and may be debugged offline; it is never silently repaired into a pass.

### P4 — Ten-turn and fork pressure

Only after P3 is repeatable, continue toward ten turns and fork one useful checkpoint to try a materially different choice. This tests continuity, branch isolation and reuse of a good story position without requiring a giant history.

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

The proof is **not ready or passed**:

- the live runner stops after opening plus one automatically selected first option, even though its recipe schema permits three primary calls;
- the maintained `seyda-neen-arrival.v1` seed now supplies an ordinary
  character, conversation check, bounded warehouse work and gated travel
  through existing generic contracts, and evaluation packet capture selects it;
  this is implementation foundation rather than connected-session evidence;
- it has no durable session/turn ledger or operator choice checkpoint;
- no connected live run has exercised mechanical action, activity/time, canonical change and later recall together;
- cheap-model adherence and narrative quality remain unknown beyond isolated failed/single-turn evidence;
- one prior memory-provider attempt is accounting-uncertain, so repository spending policy currently stops all further provider inference.

The next implementation tranche is provider-free:

1. generalize the Chamber evaluator into a finite session supervisor that captures a held packet per generated turn, pauses for explicit option selection, traverses narrative and mechanical interaction types, enforces one cumulative run allowance and emits the compact ledger;
2. exercise the five-turn shape end to end with scripted generation, including canonical change and later context inspection.

Do not issue another live request until the uncertain attempt is explicitly reconciled.
