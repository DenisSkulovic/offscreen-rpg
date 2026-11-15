# ENG03-C2 | Capture a verified interrupted action off the story lock

**State: Done (2026-11-15).** **Kind:** one purpose-specific code/test Change. **Authority:** [strict interrupted-action capture V1](../../engine-architecture/decisions/eng03-interrupted-action-capture-v1.md) and [ENG03 ordered migration](../../engine-architecture/decisions/eng03-capture-migration-sequence.md). **Dependency:** ENG03-narrow and C1 Done; [C1-R](../2026-11-15--eng03-c1-provisional-recovery/CHANGE.md) recovery interaction reviewed. **Evidence:** [eng03-c2](../../engine-architecture/evidence/eng03-c2-interrupted-capture-2026-11-15.md). Provider spend: zero.

## Cursor first screen

> **Goal:** remove interrupt-specific DocumentStore/context loading from the `story FOR UPDATE` path for a **required-item-holder-changed** finite action. Preserve the already committed `interrupted` event as the only truth; same G from capture to publication; no successful action receipt.
>
> **Read:** [source/DTO fields](../../engine-architecture/decisions/eng03-interrupted-action-capture-v1.md#2-strict-private-dto-and-source-table), [three stages](../../engine-architecture/decisions/eng03-interrupted-action-capture-v1.md#3-stage-1--stage-2--stage-3-ownership). Inspect actual `campaign/narration.ts::admitActionInterruptedNarration`, `campaign/action-executions.ts::settleActionExecution`, `storyteller/context-capture.ts`, `capture-materialization.ts`, `publication.ts` and `db/schema/campaign.ts::campaignConsequence`.

## One bounded delta

1. **Preflight measurement:** prove current interrupt-specific lock-held CAS with an injected delay and same-story contender; cancel the refactor if no real lock-held external read remains.
2. **DTO/pointer:** strict `purpose=consequence/sourceKind=action-interrupted` variant; adjust private purpose+sourceKind parsing (both pointer and stored capture) without breaking existing C1/pending rows. No public task-union change.
3. **Short Stage 1:** story → consequence row lock; exact interrupted execution event, no speculative G, no gameActionReceipt, saved item mismatch; freeze SQL and evidence hashes, insert provisional G/capture/storyResolution, link intent and transfer hold; durable existing-topic wake atomically.
4. **Off-lock Stage 2:** materialize exact immutable source by captured hash; ordinary consequence task has one deterministic *interrupted* factual receipt and no successful roll/effects; promote same G; no under-lock DocumentStore.
5. **Publication and recovery:** C2-specific live companion fence, no stale-scene publish, no duplicate G, bounded capture failures, explicit operator repair where necessary. Reuse present worker/Temporal and account/provider gates.
6. **Proof:** focused parser/source tests and disposable SQL/CAS-delay/race suite. Show old C1/pending regression unchanged.

## Acceptance and disproof

**Normal:** a transfer loses a required item holder before settling, changes clock once, commits interruption event and `campaignConsequence`, then promotes one off-lock capture G; continuation truthfully states the transfer did **not** happen and presents no invented success/effect.

**Negative:** same G across duplicate wakes/lease takeovers; wrong event ID/revision; unexpected success receipt; non-null `preparationGenerationId`; changed current root; forged item key; another interruption cause; missing immutable passage; stale actor; source hash mismatch; live funding denial. No fabricated prose, double transfer, second provider send or illegal player choice.

**Evidence/commands:** source diff + exact focused unit/disposable SQL commands, 0/250/2000ms lock/wait trace under a real independent writer, old-generation/C1/narrow replay; no claims of generalized performance from one fixture.

## Hard exclusions / Ready gate

Do not touch world-obligation interruption (`fireWorldObligations`), activities, reports, opening, continuation, rules/dice/time, application-wide saga/queue, extra provider policies, destructive migration or cloud deployment. Abort when actual source contradicts fixed event/purpose semantics.

**Done** after lock measurement (Stage-1 ~28ms vs 500ms CAS inject; contender ~9ms) and focused unit/live proofs. Hard exclusions above still apply to later ENG03 packets.
