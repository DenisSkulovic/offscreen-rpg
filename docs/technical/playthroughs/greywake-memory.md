# Greywake long-story memory exploration

Status: mixed current/target regression trace. The two private exploration rounds are implemented and exercised without a provider. Final Storyteller composition, durable round storage and runtime publication remain target behavior.

This trace answers a narrow but product-critical question: after roughly 200 scenes, can a turn recover an old favor and its original exchange without dumping the entire history into model context or confusing an obsolete/private decoy for canon?

Greywake is a fixture, not a mandatory fantasy setting. The same contracts must support the abstract corpus, which deliberately has no tavern, wages, humanoid anatomy, map or conventional quest structure.

## GW-00 — fixed authority and budget — current

The evaluator materializes the versioned Greywake corpus into the real canonical document store. The task captures one exact campaign root. That root distinguishes current documents from superseded revisions and player-visible material from developer-private possibilities.

The chosen retrieval recipe is explicit. Minimal, balanced and rich postures may vary search breadth, source participation, lexical effort, read count and retained bytes. Intersecting a recipe with a stricter operation envelope can only reduce optional work; it cannot weaken story, branch, visibility or current-root isolation.

Acceptance:

- corpus and oracle identities are reproducible;
- the captured root cannot drift during exploration;
- a larger working set is measured, not presumed superior;
- no provider call is required for this trace.

## GW-01 — compact discovery batch — current

The scripted private result requests two independent operations in one round:

1. `search_memory` for the old Greywake favor;
2. `query_registry` for the relevant established identity.

The application searches the captured root/index and returns compact candidates through task-local `m#` handles; linked canonical sources use `s#` handles. Exact handle ordinals are task-local implementation details and are not acceptance fixtures. The trace records query reasons, coverage, candidates, retained bytes and read usage.

No narration, choices, effects or state changes are publishable from this round. A candidate is a lead, not truth. A lexical hit containing “without humanoid anatomy” remains a truthful negating snippet; neither the evaluator nor a later model may turn the matched word into evidence that humanoids exist.

Acceptance:

- the current favor is discoverable without carrying it in the initial prompt;
- superseded and developer-private decoys do not become eligible bodies;
- no-match remains a valid result and permits conservative uncertainty;
- unknown names do not create world entities.

## GW-02 — restart and exact evidence follow-up — current

The private exploration state is serialized and restored before the next batch. The scripted follow-up:

1. inspects the discovered favor handle to obtain the exact current document body;
2. reads the authorized source handle for the original promise passage.

Every body read rechecks that its stable identity still belongs to the captured manifest. The focused path consumes four reads across the two exploration rounds and stays inside the rich recipe's retained-byte ceiling. Provenance authorizes only the discovered source; it is not permission to load arbitrary history.

Acceptance:

- task-local handles survive serialization and restoration;
- the current favor and original promise are both available for composition;
- the result distinguishes current state from historical evidence;
- nothing has yet been published to the player.

The restored value is currently an application snapshot, not a durable generation artifact. A process crash can therefore still lose the round even though deterministic in-memory replay works.

## GW-03 — grounded final turn — target

A connected round controller supplies the retained evidence to the final Storyteller round. The final result may acknowledge the old favor and the current repaired-bridge state, but it may not revive a superseded rumor, manufacture a second favor or treat the historical passage as present state.

The controller must reserve capacity for this final answer, validate it under the ordinary task authority, and publish only if the captured story/root fence is still current. Exploration and any invalid-final repair share the same total round, token, money and deadline budget.

This step is not implemented. Passing GW-01/GW-02 proves bounded retrieval mechanics, not model comprehension, narrative quality or successful gameplay publication.

## Failure matrix and ownership

| Condition | Required outcome | Status |
| --- | --- | --- |
| No matching memory | Return explicit no-match/coverage; final prose, once connected, admits uncertainty | Search behavior current; final behavior target |
| Invalid or undiscovered handle | Reject the read without leaking body content | Current protocol/dispatcher boundary |
| Private or superseded decoy | Exclude it from eligible canonical evidence | Current retrieval boundary |
| Captured root becomes stale | Refuse mixed-era read/publication | Read fence current; publication fence target |
| Read or retained-byte ceiling exhausted | Stop optional exploration while preserving final reserve | Limits current; connected final reserve target |
| Duplicate request or crash after reads | Reuse the accepted artifact without extra mechanics or hidden work | Target X2 recovery |
| Valid retrieval, ignored evidence | Retrieval/assembly pass; generation-use fails | Current evaluator attribution |

The executable acceptance stages live in `reusable-start-package` version 14: `retrieval-oracle`, `lexical-discovery`, `retrieval-cost-postures` and `scripted-memory-exploration`. [QA journeys](../../engineering/qa-journeys.md#long-story-memory-checklist) explains how evidence is recorded. [Storyteller requests and cost](storyteller.md#discovery-before-composition-current-mechanics-and-missing-connection) owns the model-side budget and round distinction. The [exploration feature](../../features/2026-09-21--10-55--storyteller-memory-exploration/PLAN.md) owns implementation status.
