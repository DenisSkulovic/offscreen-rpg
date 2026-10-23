# Storyteller contracts and adapters

This package prepares bounded tasks, projects provider requests and validates results. It does not own story transactions, dice, publication or durable retry; those belong to the [application package](../application/README.md). A creative profile is data, not a running agent.

[Concepts](../../docs/concepts.md) distinguishes a Storyteller turn, model round, published passage and contextual scene. The field `result.scene` is an output envelope, not a scene lifecycle. Historical reports do not open decisions or advance time.

## Follow one request

| Stage | Owner | Boundary to inspect |
| --- | --- | --- |
| Load committed evidence | Application [context.ts](../application/src/storyteller/context.ts) | Story/root-scoped storage reads |
| Bound context | [context/index.ts](src/context/index.ts) | Required sources, complete bodies, recent window and overflow |
| Capture task and exact request | [tasks/index.ts](src/tasks/index.ts) | `prepareStorytellerTask`, `requestFor`, captured profile and task-specific schema |
| Bound work and route | [resources.ts](src/tasks/resources.ts), [policy.ts](src/tasks/policy.ts) | Recipe/envelope versus provider policy; application admission supplies authority |
| Produce output | [fixtures](src/fixtures/index.ts) or [OpenRouter adapter](src/providers/openrouter.ts) | Offline data versus explicit provider transport |
| Validate/compile | [tasks/index.ts](src/tasks/index.ts) | `validateStorytellerResult`; provider shape is not always stored shape |
| Publish | Application [publication.ts](../application/src/storyteller/publication.ts) | Independent state fence and atomic commit |

Internal `contextInputSchema` and provider `contextRequestSections` are different projections. Narrative evidence uses task-local handles; some resolution data deliberately retains internal receipt identity. Inspect the exact packet before claiming which IDs or evidence the model sees. The [worked request trace](../../docs/technical/playthroughs/storyteller.md) illustrates the boundary.

## Implemented tasks and limits

- **Opening:** produces a reviewable beginning. Mechanical openings return compact content/plan proposals; code derives fixed envelope fields and substitutes captured authorized plans by reference. Fresh plans must pass state/evidence admission.
- **Continuation:** resolves narrative selection into immediate narration or a prepared timed arrival; it does not execute arbitrary mechanical effects.
- **Consequence:** narrates a saved mechanical result and proposes fresh possibilities. It cannot change the receipt or reroll. A **pending consequence** captures an immutable projected outcome and remains private until matching application settlement.
- **Report:** narrates a frozen historical result without replacing the current passage, offer or continuity state.

Continuation/consequence may propose an active-scene restart, committed only with the validated passage under the publication fence. Mechanical plans may describe only supported effects; structural validity alone does not establish prose truth or enjoyment. See [runtime](../../docs/technical/storyteller-runtime.md).

## Schema and transport

Task preparation owns the current input/prompt version; a saved task keeps its captured version. Mechanical schemas constrain nonzero quantity deltas, satisfied prerequisites and allowed references from captured state. Compact opening compilation removes derivable fields. Semantic admission remains authoritative; stricter JSON decoding does not prove that an intention was fulfilled.

The OpenRouter packet builder and inspector use the same body as live serialization. [Request audit](src/providers/request-audit.ts) reports packet/schema bytes, hashes, sections and omitted evidence without I/O. Bytes are not verified tokenizer counts, cache hits or savings.

Captured policy chooses native JSON schema or evaluation-only JSON-object validation, plus buffered or bounded streaming response framing. Strict-provider projection handles nullable placeholders against the original schema; it does not repair arbitrary bad values. A partial stream is not settled. Inspect [providers/openrouter.ts](src/providers/openrouter.ts) and its called adapter modules only for transport questions. Dispatch/reconciliation belongs to [application recovery](../application/README.md#execution-failure-and-retry).

## Context and memory

Notes are source-backed reminders: their referenced non-current passages are mandatory context, while the current body is not duplicated in the evidence array. Retiring a note removes that automatic loading path, not the chronology itself. Canonical catalogues identify unloaded documents explicitly.

The application already selects exact world/rule sections and campaign documents, including narrative-choice dependencies and recall cues. Selection, whole-body byte limits and whole-request pruning must agree; the omission trace distinguishes unavailable material from supplied evidence. Mechanical dependency carriage and progressive identity materialization remain [S3 work](../../docs/features/README.md#coding-route). Semantic retrieval and automatic long-history synthesis are not demonstrated capabilities.

Ordinary tasks default to one shot. A captured memory recipe can use a bounded multi-round controller: decision rounds request `ask_memory` or `read_memory`, and a protected final round uses the original result schema. Read handles (`m#`/`x#`) differ from provenance citations (`s#`). The application owns retrieval and shared round/read/retained-byte/input/output/cost bounds. Existing retrieval experiments do not establish a reliable default for sustained gameplay.

Read [memory/retrieval](../../docs/engineering/long-story-memory-and-retrieval.md) for strategy, [canonical files](../../docs/technical/canonical-files.md) for authority, and [context/cost](../../docs/technical/context-and-cost.md) for packing and headroom.

## Content and creative ownership

[Profile definitions](src/profiles/definitions/) own creative defaults; [profiles/index.ts](src/profiles/index.ts) validates revisions. [Fixture content](src/fixtures/content/) contains authored offline responses. Scenario-specific fake behavior stays in that adapter; shared application policy does not branch on world names.

Shared task instructions own authority/evidence/output invariants. Tone, pace, initiative and choice style belong to the captured profile/campaign. Follow the [tuning procedure](../../docs/skills/storyteller-tuning/SKILL.md) before changing these layers; a failed schema, absent mechanic or lost document cannot be repaired by a style preference.

## Working safely and economically

[Policy](src/tasks/policy.ts) prices a conservative request reservation including applicable cache-write premiums. [Resources](src/tasks/resources.ts) defines the captured cumulative envelope; application budget/window accounting enforces it across attempts. Do not mistake this package's request-size check for the whole spending system.

Live transport requires explicit opt-in, resolved authority and [spending-rule](../../.agents/rules/spending.md) reconciliation. Deliberate local live runs have occurred; ordinary tests/CI remain provider-free. The [connected proof](../../docs/engineering/connected-poc-proof.md#latest-evidence--2026-09-24) owns their evidence and limits, not this guide.

Tests under `test/` use compiled output and injected fake providers. Read [verification policy](../../.agents/rules/verification.md) before selecting checks; package commands/exports are in [package.json](package.json).
