# Activity processes and world-defined progress plan

Feature: [Activity processes and world-defined progress](FEATURE.md)
Status: Design checkpoint awaiting owner review. Do not implement yet.
Provider spend: none required or authorized.

## Design decision proposed for review

Replace tick-duration activities with a process protocol. The clock schedules resolution; a captured server-owned rule defines progress and completion. Do not rename `durationTicks` to `requiredPoints` and keep the same architecture.

The first implementation should prove three genuinely different semantics through one lifecycle:

1. contribution toward a content-defined requirement;
2. a clock-condition wait with no contribution quantity;
3. traversal with route/transition state rather than generic points.

The traversal proof is deliberately small. It validates the extension boundary without building a universal map or full travel product.

## Proposed phases

### Phase 1 — Correct permanent specifications

Rewrite the affected product and technical documents after owner approval. Define clock position, rule boundary, process state, capacity claim, completion predicate and conditional estimate independently. Remove claims that every positive activity has a tick duration or completes when ticks accumulate.

Exit: the pineapple/human, microbe and abstract benchmarks all fit without changing the universal contract.

### Phase 2 — Process rule contract

Design strict schemas for admitted process plans and bounded settlement results. Keep rule-owned state behind a discriminated, server-supported kind; avoid an untyped metadata bag. Define retry identity, rule revision capture, maximum settlement work and persisted invariants. Decide the smallest capacity-claim contract needed by the playable slice.

Exit: invalid rule kinds, forged progress, incompatible capacity use and completion without its predicate are rejectable before persistence.

### Phase 3 — Contribution vertical slice

Replace the current duration-driven fixture with one contribution process. Each boundary derives contribution from captured capabilities, conditions and recorded checks. Persist progress independently of ticks and preserve it through a valid interruption/resumption path. Use setting-neutral fixture language; any human work example is illustrative content.

Exit: equal fictional time can produce different committed contribution, and elapsed time alone cannot complete the process.

### Phase 4 — Clock-condition wait

Express waiting as its own rule semantics: reach a target clock condition while prerequisites remain valid. It has no fake contribution target. Reuse lifecycle, scheduling and interruption machinery from the process runtime.

Exit: the implementation demonstrates shared lifecycle without pretending shared progress representation.

### Phase 5 — Traversal boundary spike

Implement the smallest reviewed traversal rule that can represent position in a route or staged transition, changing movement conditions and interruption. Test it against walking plus one contrasting movement mode. Do not select a universal geometry in this phase.

Exit: stopping movement advances time without advancing route state; resumption starts from committed position; exceptional movement is representable without converting distance into generic work points.

### Phase 6 — Storyteller planning and presentation

Allow the bounded opportunity/adjudication task to propose only supported process plans. Validate before offering them. Present rule-specific progress and conditional estimates through a common process-view envelope. Narration consumes committed receipts and cannot override them.

Exit: a generated option can begin a supported process, survive absence, reach an interruption or completion, and yield contextual next options through the existing storyteller lifecycle.

## Review questions

- Is “process” the right player-neutral technical term, while the UI continues to use natural story language?
- Which three concrete fixtures should prove contribution, waiting and traversal without expanding the POC too far?
- What is the minimum capacity/allocation model required now: one exclusive character commitment, named capacities, or a narrower fixture-specific constraint behind the future boundary?
- Should contribution normally be deterministic between explicit check boundaries, or should the first slice demonstrate a roll affecting every contribution boundary?
- What minimal traversal representation is worth implementing before the broader space-and-movement decision is settled?

## Current checkpoint

The current code still uses `durationTicks` and therefore does not satisfy this feature. No code or schema changes were made in this design pass. The next action is owner review of FEATURE.md, especially the progress families, runtime/rule ownership and proposed first three semantics. After approval, update permanent specifications before changing contracts or migrations.
