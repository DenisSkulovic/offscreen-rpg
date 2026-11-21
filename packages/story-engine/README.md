# Story engine

**Current source:** `src/stories/`, `src/campaign/`, `src/storyteller/`, and `src/generations/`.
**Selected target:** one cohesive engine package. Separate Story Authority and Storyteller-runtime npm packages are not selected yet.
**Start here:** [story operation map](src/stories/README.md), then the symbol named by the question.
**Source-inspected:** 2026-11-21.

`@offscreen/application` re-exports these modules from the old paths. This package does not import `@offscreen/application`. `@offscreen/storyteller` remains the pure task, context, and provider library.

| Question | First file |
| --- | --- |
| Public story factory | [src/stories/index.ts](src/stories/index.ts) |
| Resolution admission | [src/stories/resolution.ts](src/stories/resolution.ts) |
| Campaign narration and capture | [src/campaign/narration.ts](src/campaign/narration.ts) |
| Context capture and materialization | [src/storyteller/context-capture.ts](src/storyteller/context-capture.ts), [src/storyteller/capture-materialization.ts](src/storyteller/capture-materialization.ts) |
| Scripted openings | [src/generations/scripted-openings.ts](src/generations/scripted-openings.ts) |

Moving a module here did not change owner checks, lock order, capture hashes, or provider budget. A green package build is not evidence that a foreign owner or a stale revision can write.
