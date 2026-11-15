# Product documentation | the game bible

**Owns:** durable player-facing intent, vocabulary, and acceptable behavior for Offscreen RPG. This is the **pinnacle** documentation layer: what the product *is*. Technical contracts, program design waves, code, and Change packets sit underneath it—they do not replace it.

**Does not own:** Nest/SQL/Temporal invariants ([technical](../technical/README.md)), source maps and proofs ([engineering](../engineering/README.md)), staff Admin product ([admin](../programs/admin/README.md)), UX destination program ([experience](../programs/experience/README.md)), or the execution queue ([changes](../changes/README.md)).

## Foundations

| Document | Question |
| --- | --- |
| [Vision](foundations/vision.md) | What persistent-life RPG are we building? |
| [Concepts](foundations/concepts.md) | What do the nouns mean (turn, scene, passage, round)? |
| [Gameplay](foundations/gameplay.md) | How does consequential play work at product level? |
| [Game rules](foundations/game-rules.md) | What mechanical promises exist for players? |

## Journeys

| Document | Question |
| --- | --- |
| [Player experience](journeys/player-experience.md) | How should create, play, and return feel? |
| [Story creation](journeys/story-creation.md) | How does a life begin? |
| [Playthroughs](journeys/playthroughs.md) | Which benchmark stories define acceptance texture? |
| [Time and autonomy](journeys/time-and-autonomy.md) | What happens while the player is away? |

## Storytelling

| Document | Question |
| --- | --- |
| [Storytelling](storytelling/storytelling.md) | What shapes narration without owning mechanics? |
| [Storyteller settings](storytelling/storyteller-settings.md) | What creative controls may players set? |
| [Continuity and consequences](storytelling/continuity-and-consequences.md) | How does memory and lasting consequence work? |

## Compat paths

Old paths under `docs/*.md` (for example `docs/vision.md`) are **stubs** that point here. Prefer linking the canonical `docs/product/…` path in new writing.
