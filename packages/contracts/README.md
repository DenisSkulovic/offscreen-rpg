# Contracts: validated interface shapes

`@offscreen/contracts` owns shared Zod schemas and types. A validated payload has a **shape**, not authorization, accepted gameplay state or a right to disclose private data. [Product concepts](../../docs/concepts.md), [data/consistency design](../../docs/technical/data.md) and [application operations](../application/README.md) explain the other layers.

## Select the contract, not the whole package

| Topic | Entry file | What it defines |
| --- | --- | --- |
| Story snapshots, history, Start/fork and commands | [stories.ts](src/stories.ts) | `storySnapshotSchema`, `respondToStorySchema` and public item projections |
| Campaign time, activities, settings and commands | [campaign.ts](src/campaign.ts) | `campaignViewSchema`, `campaignStartSchema`, versioned settings |
| Player responses | [interactions.ts](src/interactions.ts) | Submitted choice/interaction shapes |
| Drafts and opening previews | [drafts.ts](src/drafts.ts), [openings.ts](src/openings.ts) | Input, review and preparation surfaces |
| Storyteller profile identity | [storytellers.ts](src/storytellers.ts) | A profile reference, not a provider or agent instance |
| Local Chamber and QA | [chamber.ts](src/chamber.ts), [qa.ts](src/qa.ts) | Developer-only evidence contracts |
| Usage allowance and live evaluation | [usage-policy.ts](src/usage-policy.ts), [live-evaluation.ts](src/live-evaluation.ts) | Typed control/evaluation surfaces, not spending permission |
| Retrieval, creative direction and memory evaluation | [story-retrieval.ts](src/story-retrieval.ts), [creative-exploration.ts](src/creative-exploration.ts), [memory-evaluation.ts](src/memory-evaluation.ts) | Candidate/evidence shapes, not canonical story truth |

## Changing a boundary

Find both the **producer** (usually application) and **consumer** (API, web, worker or inspector). A new public field requires explicit projection and privacy review. Some contracts import `@offscreen/game` and `@offscreen/documents` as the manifest declares; this is not a dependency-free DTO layer.

The package scripts provide `build`, `typecheck` and `test`; relevant tests are under [test/](test/). Use [code navigation](../../docs/engineering/code-navigation.md) before searching every consumer.
