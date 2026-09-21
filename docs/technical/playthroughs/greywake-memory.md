# Greywake long-story memory exploration

Status: mixed current/target regression trace. Private exploration rounds, durable snapshot storage, reserved final-candidate acceptance and replay are implemented without a provider. Evidence-aware Storyteller composition, normal generation/provider wiring and runtime publication remain target behavior.

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

The normalized context request and its SHA-256 identity are stored before its reads begin. Recovery executes that request before asking for another Storyteller decision. The resulting snapshot is accepted atomically, so a crash may repeat the same read-only lookup but cannot double-count it. A completed final candidate is stored in the same generation-owned private artifact and replayed without another scripted decision.

## GW-03 — packed evidence and bounded final candidate — current mechanics, target composition

The restored Greywake snapshot now deterministically adapts admitted evidence into the common packer without another read or model call. Search and registry hits remain optional leads. The explicitly inspected current favor is a required card; the explicitly read historical passage is required exact evidence. Both cite the captured canonical document/revision/hash, and malformed persisted rounds fail closed instead of silently dropping context. The tested 12 KiB pack contains the current “still owes” state and original “promised” wording while excluding the destroyed-fork and developer decoys.

A scripted round controller now reserves the final round, rejects a late `needs_context` request, validates the final candidate under the captured task and stores it separately from publication. Re-entry returns that candidate without rerunning scripted inference or reads.

Every fresh controller decision now receives a captured provider-facing request containing the factored evidence packet as a named `memoryExploration` user section. It reports exact captured bytes plus the repository's conservative 1 KiB reservation overhead. Packet bytes share the task's existing `maxSerializedRequestBytes` envelope and the recipe's retained-read ceiling; they are not extra capacity. Exploration-capable rounds accept either one bounded context request or a final private wrapper; the reserved final round accepts only that wrapper. The wrapper contains the ordinary task result once plus item/source IDs the model claims it used. Unknown or incomplete packet references fail; valid references and required-but-uncited items persist beside the final candidate and replay unchanged, while only the ordinary task result can proceed toward publication. If required evidence cannot fit, the controller durably records `context-limit` instead of truncating canon or calling the round source. A crash-replayed accepted read request bypasses recomposition and executes first.

A pure OpenRouter preview serializes that exact captured request through the same body builder used by live one-shot transport. Its compact inspection exposes body/message/section/schema byte counts and SHA-256 identities, reports transport as false and charge as zero, and can reveal the exact packet only through the existing bounded section-selection style. It cannot access credentials or dispatch. Multi-round live dispatch remains disconnected.

The remaining connected behavior is dispatching this reviewed request through durable multi-round accounting and evaluating whether cited evidence was actually used correctly. Self-citation is not semantic proof. The result may acknowledge the old favor and the current repaired-bridge state, but it may not revive a superseded rumor, manufacture a second favor or treat the historical passage as present state.

The controller must reserve capacity for this final answer, validate it under the ordinary task authority, and publish only if the captured story/root fence is still current. Exploration and any invalid-final repair share the same total round, token, money and deadline budget.

Snapshot-to-pack adaptation and final-candidate control/replay are implemented; evidence-aware model composition and generation/publication transfer are not. Passing GW-01/GW-02 and packet/controller checks proves bounded retrieval mechanics, not model comprehension, narrative quality or successful gameplay publication.

## Failure matrix and ownership

| Condition | Required outcome | Status |
| --- | --- | --- |
| No matching memory | Return explicit no-match/coverage; final prose, once connected, admits uncertainty | Search behavior current; final behavior target |
| Invalid or undiscovered handle | Reject the read without leaking body content | Current protocol/dispatcher boundary |
| Private or superseded decoy | Exclude it from eligible canonical evidence | Current retrieval boundary |
| Captured root becomes stale | Refuse mixed-era read/publication | Read fence current; publication fence target |
| Read or retained-byte ceiling exhausted | Stop optional exploration while preserving final reserve | Limits current; connected final reserve target |
| Required final packet exceeds the shared serialized request envelope | Persist `context-limit`; do not truncate required evidence or invoke another decision | Current controller boundary |
| Crash after request acceptance | Replay the hashed request without another Storyteller decision; accept its counters once | Current controller recovery |
| Crash after reads but before snapshot commit | The same read-only lookup may repeat; accepted counters and handles advance once | Current controller recovery |
| Stale root, invalid handle or read/round exhaustion | Persist a classified terminal failure; re-entry returns it without another decision | Current controller recovery |
| Valid retrieval, ignored evidence | Required-but-uncited IDs are preserved; retrieval/assembly pass and generation-use fails | Current structural reporting and evaluator attribution |

The executable acceptance stages live in `reusable-start-package` version 17: `retrieval-oracle`, `lexical-discovery`, `retrieval-cost-postures` and `scripted-memory-exploration`. [QA journeys](../../engineering/qa-journeys.md#long-story-memory-checklist) explains how evidence is recorded. [Storyteller requests and cost](storyteller.md#discovery-before-composition-current-mechanics-and-missing-connection) owns the model-side budget and round distinction. The [exploration feature](../../features/2026-09-21--10-55--storyteller-memory-exploration/PLAN.md) owns implementation status.
