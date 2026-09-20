# Story forks and alternate continuities

Status: Agreed; implementing the minimal checkpoint slice.
Approval: On 2026-09-20 the owner requested first-class parallel storylines forked from a prior turn, initially as a testing tool and later as a player mechanic, with branch-tree visualization retained as future inspiration.

## Intended outcome

A player or developer can preserve a good committed story position, continue experimenting in the original, and create an independent alternate continuity from the preserved position. Both results are ordinary stories: each can be opened, played, retained and forked again. The relationship is durable provenance, not a test-only database copy.

This is immediately useful for repeated model, prompt and gameplay experiments from the same starting position. It also supports future player-facing “what if?” play after an unwanted outcome or character death.

## Representative flow

The player reaches a stable first decision in Seyda Neen. Before selecting an option, they fork the current position into a new story. The original can pursue warehouse work while the fork leaves for Balmora. Each story has its own current interaction and subsequent commands; advancing either cannot change the other. Inspection identifies the source story and exact source passage.

A retry with the same fork operation is idempotent. A fork request fails without creating a partial story when the source is not owned, the expected revision is stale, or the position contains state the current implementation cannot reproduce honestly. Pending generation, unsettled action, running timer or active activity is never copied as though it were committed history.

## Scope and boundaries

The first slice forks only the source story's **current fully committed checkpoint**. It establishes lineage and an application operation suitable for Chamber and testing. It does not claim arbitrary historical rewind: current campaign tables contain mutable latest state, so old passages alone cannot reconstruct old inventory, clock, activities, obligations and private offers.

The minimum implementation starts with a deliberately narrow supported checkpoint and rejects unsupported mechanical or timed state explicitly. It copies committed story presentation and configuration needed to continue, gives the branch a new story identity, and never shares mutable gameplay rows. Source generations may remain provenance; no paid generation is repeated merely to fork.

Later phases add revision-scoped state snapshots and arbitrary historical forking, then player-facing branch naming and navigation. A tree or graph visualization of alternate realities is a future design direction, not part of the first slice. Forks are not chapters, save-slot overwrites, database backups or automatic canon selection.

## Acceptance

- One owned, stable supported story position can produce a second independently playable story.
- The branch durably records its source story, source passage and source sequence.
- The source remains unchanged; commands in either story cannot mutate the other.
- Repeating the same operation returns the same branch; conflicting reuse is rejected.
- Stale, pending, timed or unsupported state fails atomically and explains that no fork was created.
- A scripted Chamber or HTTP flow can preserve one checkpoint and exercise two divergent continuations without provider calls.
- Historical arbitrary-node forking is not advertised until revision snapshots cover the full authoritative state.

## Decisions still needed

Player-facing naming, whether branches inherit sharing or membership, retention limits, and tree or graph presentation belong to later product work. Shared-party authorization must be resolved before forks copy anything beyond the current solo owner.

## Owning specifications

- [Gameplay concepts](../../concepts.md)
- [Story lifecycle](../../technical/story-lifecycle.md)
- [Data ownership](../../technical/data.md)
- [QA journeys](../../engineering/qa-journeys.md)
