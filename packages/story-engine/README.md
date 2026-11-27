# Story engine

**Current source:** `src/stories/`, `src/campaign/`, `src/storyteller/` and `src/generations/`, plus `src/drafts/`.
**Selected target:** one cohesive engine package; separate Story Authority and Storyteller-runtime npm packages are not selected ([selected architecture](../../docs/technical/engine/selected-architecture.md)).
**Start here:** [story operation map](src/stories/README.md), then the symbol named by the question.
**Source-inspected:** 2026-11-27.

## Ownership

| Subtree | Owns |
| --- | --- |
| `src/stories/` | Story Authority: story factory (`createStories` composition in `index.ts`), start, reads, resolution (`createStoryResolution`), continuation (`commitStoryContinuation`), forks (`createStoryForks`), scene checkpoints |
| `src/campaign/` | Campaign clock, actions, activities, holds, accepted plans, world obligations, narration and reports |
| `src/storyteller/` | Writer runtime: context capture and materialization, admission, library/memory navigation, writer loop and custody |
| `src/generations/` | Generation orchestration: scripted and generated openings/continuations, kind and notice identities |

The former `@offscreen/application` package that re-exported these modules no longer exists, and nothing here imports it. Consumers (`apps/api`, `apps/game-authority`, `apps/worker`) import `@offscreen/story-engine/<subtree>` directly: for example Game Authority launch composition in `apps/game-authority/src/launch-put.ts` and the Worker activities in `apps/worker/src/activities/index.ts`. `@offscreen/storyteller` remains the pure task, context and provider library; `@offscreen/story-interface` holds the typed boundary and `@offscreen/story-persistence` the tables. Resolution and continuation are separate routes, not one shared transaction.

| Question | First file |
| --- | --- |
| Public story factory | [src/stories/index.ts](src/stories/index.ts) |
| Resolution admission | [src/stories/resolution.ts](src/stories/resolution.ts) |
| Campaign narration and capture | [src/campaign/narration.ts](src/campaign/narration.ts) |
| Context capture and materialization | [src/storyteller/context-capture.ts](src/storyteller/context-capture.ts), [src/storyteller/capture-materialization.ts](src/storyteller/capture-materialization.ts) |
| Scripted openings | [src/generations/scripted-openings.ts](src/generations/scripted-openings.ts) |
| Pinned world/rule shelf reads | [src/storyteller/pinned-reference-shelf-navigation.ts](src/storyteller/pinned-reference-shelf-navigation.ts) `createPinnedReferenceShelfNavigation` |
| Bounded story-library browse and find | [src/storyteller/library-navigation.ts](src/storyteller/library-navigation.ts) `createPinnedLibraryNavigation` |
| Bounded multi-file library read | [src/storyteller/library-batch-read.ts](src/storyteller/library-batch-read.ts) `readLibraryDocumentsBatch` |

**Known debt.** Some `stories/` and `campaign/` modules still import `../storyteller` (Authority-to-Writer reverse edges, retained MA09 debt). Moving a module here did not change owner checks, lock order, capture hashes or provider budget, and a green package build is not evidence that a foreign owner or a stale revision can write.
