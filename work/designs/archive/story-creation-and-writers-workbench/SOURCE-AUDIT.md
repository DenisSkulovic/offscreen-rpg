# Source audit | story creation and initial writer's library

**Observed at:** `09d5820bcafedbed7cf969fe228ee84f44ff2405` (2026-11-20 upload and matching GitHub main at inspection). Code and documentation were inspected, not executed. This is not a complete runtime, browser, or real-model certification.

## Trace of current creation and opening

| Finding | Source evidence | Implication |
| --- | --- | --- |
| The four-step wizard is a specified product behavior, not only a UI accident. | `docs/product/experience/entry-and-onboarding.md#creation-information-architecture`; `apps/web/src/features/stories/draft-editor.tsx` declares Foundation, Your role, Storyteller, Review. | Replacing the wizard requires later accepted product-document reconciliation, UI changes and contract changes. |
| Draft storage is fielded and references a selected profile revision. | `packages/application/src/drafts/index.ts`; `packages/contracts/src/drafts.ts`; `apps/web/src/features/stories/draft-editor.tsx`. | One-prompt design cannot safely be only a CSS/UI change. Preserve revision and stale-tab safety while redesigning stored intent. |
| Opening admission currently rejects an empty premise and absent profile; it resolves one of the compiled profile JSON definitions. | `packages/application/src/storyteller/openings.ts`, `request()`; `packages/storyteller/src/profiles/index.ts`. | Auto/default creative direction and one-field custom input require explicit task-admission design. |
| The opening task captures a typed profile, task version, execution policy, resource recipe and captured context. | `packages/storyteller/src/tasks/task-contracts.ts`, `storytellerTaskSchema`; `packages/application/src/storyteller/openings.ts`. | A Markdown profile file cannot simply replace `task.profile` without a resolver/compiler and pinned snapshot. |
| A prepared start already imports multiple declared Markdown/JSON documents with type, authority, visibility and activation. `creative-guidance` is an existing document kind. | `packages/documents/src/schema.ts` (`documentKindSchema`, `startPackageDocumentKindSchema`); `packages/documents/src/start-import.ts`. | The proposed bundled `STORYTELLER_PROFILE.md` fits the *document substrate* in principle. Its use as the effective task profile is **not** implemented. |
| The opening input can contain a start-package knowledge catalogue/bounded selected bodies. | `packages/application/src/storyteller/openings.ts` calls `loadStartPackageKnowledge`; `packages/application/src/storyteller/canonical-knowledge.ts`. | The system already makes some package material visible at opening time. This is not equivalent to a writable campaign-specific writer's workbench. |
| Opening generation occurs before story Start. Its normal starter manifest (passage, premise, orientation, settings, etc.) is staged at Start. The authored start package is instantiated onto that bootstrap at Start. | `packages/application/src/storyteller/openings.ts`; `packages/application/src/stories/start.ts`; `packages/application/src/stories/passage-documents.ts` (`stageStoryBootstrapDocuments`). | An agent preparing a **campaign-owned** library *before* the first scene requires a deliberate pre-start workspace/publication contract, not merely a new document path. |
| The generated bootstrap already uses `START.md`, `premise.md`, `sources/passages/`, optional identity and state documents; it does not generate empty universal fantasy folders. | `packages/application/src/stories/passage-documents.ts`; `docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap`. | Keep useful orientation and selective materialization; do not require universal maps, characters, anatomy or plot timelines. |
| `creative-guidance` is in the eligible knowledge-kind catalogue, but automatic injection of a specially named profile as a high-priority policy-bearing document is not a demonstrated feature. | `packages/application/src/storyteller/canonical-search.ts`; `packages/application/src/storyteller/canonical-knowledge.ts`; `packages/storyteller/src/profiles/index.ts`. | A future design must define deterministic priority, size limit, scope, collisions, and captured profile identity. |
| Current bounded multi-round memory exploration has deliberate tool/read/spend fences. Ordinary Storyteller gameplay still defaults to one-shot tasks with tools disabled. | `packages/application/src/storyteller/memory-exploration-controller.ts`; `docs/technical/storyteller/operation-and-controller.md`; `docs/technical/storyteller/context-selection-and-recall.md`. | A general autonomous preparation agent is not already there merely because context-reading prototypes exist. |
| Clock pace is independently typed (`rate` or `instant`). The current opening preview selects `steady` by default and applies pace at Start. | `packages/game/src/time.ts`; `apps/web/src/features/stories/opening-preview.tsx`; `docs/technical/storyteller/versioned-settings.md`. | A narrative chip saying “fast-paced” is not sufficient to alter the mechanical clock safely. |
| The canonical document specification already describes reusable starts carrying starter documents and a versioned Storyteller bundle. | `docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap` and `#the-storyteller-as-a-versioned-bundle`. | The user's bundled workbench idea agrees with a documented direction, but no completed integration or quality proof follows from the prose. |

## Important current separation

The existing start package has an immutable package root, while the **campaign-owned root** is staged during Start. `loadStartPackageKnowledge()` exposes bounded *read context* from the package, not an arbitrary pre-scene campaign write transaction. Opening tasks therefore should not be described as currently browsing and editing their own established campaign library.

The current result/validation/publication split is useful. The design should preserve the verified mechanical, branch and financial fences rather than rebuild them inside an autonomous model loop. The emerging scene checkpoint and fork contracts also require an explicit choice of **when the first campaign-root version becomes visible and forkable**.

## Observations not established

- No measured comparison shows that a separate setup round improves opening quality over one well-grounded round.
- No end-to-end connected evidence shows durable pre-first-scene agent edits across retry, crash, or cold cluster.
- No measured guarantee establishes the right initial number of documents, the ideal default profile, or a generally successful arbitrary prompt.
- No evidence makes a famous-world prepared preset safe to publish publicly.
- The presence of storage and a lexical catalogue does not prove sustained narrative recall across hundreds of scenes.

**Next investigation:** compare the present `draft → opening candidate → Start/bootstrap` path with a candidate `story intent → prepared private workspace → opening → atomic playable activation` path, explicitly tracing source/root visibility and paid-operation failure.
