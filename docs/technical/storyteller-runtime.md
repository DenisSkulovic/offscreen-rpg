# Storyteller runtime and model routing

A storyteller is a versioned content profile over shared application capabilities. It is not an agent instance or a provider/model selection. The runtime currently has two bounded generation tasks, opening and continuation, surrounded by deterministic context assembly, validation, accounting and publication. Additional agents, tools or summarization tasks can be introduced behind these boundaries when a concrete task needs them; no graph framework or autonomous loop is required for this slice.

## Profile and task contracts

`packages/ai/src/storytellers/` contains JSON definitions. The private catalogue validates identity/revision, public description, tone, pacing, choice guidance, continuity guidance, creative limits and per-task guidance. Public catalogue responses expose metadata only. Adding another supported storyteller means supplying data and registering it in the catalogue; generic runtime code does not branch on profile identity. The explicitly scripted rehearsal source has authored profile-specific scenes and is not an inference implementation.

A draft stores an optional profile reference. Admission resolves that reference and freezes the full profile in an immutable task artifact. Start copies the reviewed candidate's profile and execution policy to the story. Later catalogue edits cannot alter an admitted generation or existing story automatically. Planned explicit [settings revisions](story-settings.md) allow mid-story customization while retaining immutable task snapshots. Changing a draft's profile increments its revision and invalidates an older candidate. Legacy stories retain null profile fields and their original durable task names.

`storyteller-tasks.ts` prepares `inputVersion: 2`, `promptVersion: storyteller.v1` artifacts for the `storyteller.profiled.v1` durable kind/topic. The artifact contains source fences, full profile, execution policy, bounded context, its manifest and exact model request. Only task-relevant instructions and profile guidance are assembled. The model sees local evidence handles, not database identifiers. Premise, fictional dialogue and retrieved prose are data below application authority. Schema validation does not prove resistance to prompt injection or semantic correctness.

The version-1 result envelope contains a scene plus separate current/arrival note patches. Opening scenes use playable v1; continuation scenes use v2 and can publish a choice or one prepared interval. The profiled POC requires 2–5 choices with distinct normalized labels and IDs, forbids automatic life ending, and never accepts a free-text gameplay command. The selected published intention is recovered server-side from generation provenance, including the current/arrival source part. Labels and intentions are attempts, not guaranteed outcomes or permission to mutate resources.

## Context and continuity

Admission holds the story lock while reading the premise, current passage, selected intention, possessions, private notes and relevant committed evidence. The bounded policy retains every note's evidence and the current passage, then includes up to six optional recent passages while the complete serialized request fits 48 KiB. Missing evidence and mandatory overflow fail closed. The artifact records the recent window and omitted optional sequences; all earlier history is not replayed into each request. The server query is scoped to this story and its admitted revision. Prepared futures are never retrieved as committed evidence.

There are at most 20 derived notes, each at most 400 characters and four evidence sources. A result can create, update or retire up to eight notes in each publication part. Sources must resolve to supplied evidence or the permitted newly published part. Notes cannot authorize inventory, combat, movement or time changes. Their semantic truth still needs evaluation; referencing a passage proves provenance, not that a summary faithfully interprets it.

Current prose, notes and narrative revision commit together. Arrival notes commit only with the corresponding arrival passage and actual passage identity. Replay and stale-result fences use the existing story transition machinery. No automatic compression call, embedding store or universal world entity model is introduced.

## Execution and publication

The server separates admission, execution, publication, memory and recovery into focused modules. Temporal carries operation identifiers only. A task executes outside database transactions and settles its result before publication under the story lock. The persisted publication record distinguishes pending, published, stale and blocked from the generation's own outcome. Domain validation includes the application timing policy before a transition can be saved.

Scripted sources are explicitly pure and may be recomputed after an interrupted execution. Provider execution is different: each attempt reserves budget, records dispatch intent, makes at most one request, and atomically saves its known charge and generation outcome. A replay reuses a saved result; a dispatched request whose outcome is unknown is never resent. A publication failure does not discard a successful result or require another paid call.

An explicit recovery receipt retries the same admitted intention. Failed attempts with settled or confirmed-unsent usage may get a new attempt under the same run allowance. Blocked publication retries the saved result. Unknown usage offers read-only refresh and requires operator reconciliation. Retry notices have their own workflow identity while referencing the original generation. Old `opening.playable.scripted.v1` and `continuation.playable.scripted.v1` histories retain their decoders and meaning.

## Provider and budget boundary

The OpenRouter HTTP adapter is constructed explicitly with a credential and opt-in. It accepts one pinned model/provider route, requires structured parameters, disallows route fallback and redirects, bounds output/response bytes and time, and has no internal retries. Its transport is injectable for free tests. Missing usage, ambiguous HTTP outcomes and timeouts retain the reservation and stop further paid admission. Known refusals or malformed output still settle their reported charge.

Funding, run and attempt tables use integer USD microunits and decimal-string JSON boundaries. Conservative reservation covers the configured maximum input/output tokens. A byte-based input upper bound includes request/schema framing; exceeding it holds the operation. Accounting takes a global admission lock, then account, run and attempt locks; these transactions never acquire a story lock. Independent story publication does not acquire accounting locks. Account/run caps and attempt limits are shared across concurrent work. Unexpected over-reservation charges stop all funding accounts. Reconciliation does not automatically clear a stop.

Normal startup and the local launcher use the offline source. Merely storing a key cannot enable inference. Production composition requires `STORYTELLER_LIVE_ENABLED=true`, a validated `STORYTELLER_EXECUTION_JSON`, a matching approved worker policy and pre-provisioned funding/run records. No account or allowance is fabricated at startup. There is currently no operator provisioning/reconciliation UI or selected live route. Before a deliberately authorized evaluation, verify the real allowance and current route/pricing and prepare the operator procedure; do not infer a balance from the original deposit. See [context and spending](context-and-cost.md).

## Tools, rules and future tasks

No model tools are enabled for opening or continuation: their bounded evidence is supplied directly. Task instructions and constraints are versioned with the artifact, not accumulated in one ever-growing agent prompt. Introduce a capability only with a named task, story-scoped authorization, input/output bounds, call budget and failure contract. Prefer a deterministic query for known context over spending a tool round to request it. Never expose arbitrary SQL, filesystem access, browsing or credentials.

Future narrative planning, entity adjudication or summarization can be separate pure functions, one-shot calls or bounded agent tasks. They must share the same durable operation/accounting boundaries and cannot become competing authorities for story state. Temporal owns durable scheduling; PostgreSQL owns committed story facts. A graph library is warranted only when its bounded task logic earns that complexity. One agent per character or an LLM router per choice is not part of this POC.

## Supported behavior and evidence limits

The offline pineapple rehearsal supports asking Gary, quiet breakfast, travelling to work, observing outside and returning home. It includes two contrasting profile examples, a remembered promise and real 20-second quick-play waits. Other premises are saved but receive an explicitly unadapted rehearsal message. Waiting, reading history, reload and pause/resume require no inference. Legacy fixture timing remains unchanged.

Tests exercise structured boundaries, context retention, provenance, fake charges, replay, publication recovery and the browser flow. They cannot establish whether a real model follows the profile, offers satisfying agency or sustains an enjoyable story. No live route, narrative quality or real billed-cost behavior is certified. Generated mechanical effects, multiplayer, automatic defaults, general interruptions, streaming and unlimited memory remain separate work.

## Next mechanical POC boundary

The current scene envelope and fixed 2–5-choice validation describe the implemented narrative rehearsal, not the final DM architecture. The next [rules/activity contract](rules-and-activities.md) adds validated adjudication, server-owned rolls and effects before narration, situation-dependent menus and mandatory mechanical evidence. [Settings revisions](story-settings.md) add customization and clock policy without changing paid execution authority. These capabilities are planned and must use explicit new durable artifacts rather than reinterpret already admitted tasks.
