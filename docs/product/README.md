# Product documentation | the game bible

**Owns:** durable player-facing intent, vocabulary, and acceptable behavior for Offscreen RPG. This is the **pinnacle** documentation layer: what the product *is*. Technical contracts, unfinished design work, code, and Change packets sit underneath it—they do not replace it.

**DOC01 migration (2026-11-16):** taxonomy is moving to subject owners below. Old `journeys/` and `storytelling/` paths remain as **compatibility stubs** until P5 cutover. Prefer the new owners when editing.

**Does not own:** Nest/SQL/Temporal invariants ([technical](../technical/README.md)), coding-agent harness (`.agents/`), unfinished designs (`work/designs/` after cutover), dated evidence (`evidence/`), or the execution queue ([changes](../../work/changes/README.md) → `work/changes/` after cutover).

## Foundations

| Document | Question |
| --- | --- |
| [Vision](foundations/vision.md) | What persistent-life RPG are we building? |
| [Concepts](foundations/concepts.md) | What do the nouns mean (turn, scene, passage, round)? |

## Gameplay

| Document | Question |
| --- | --- |
| [Rules](gameplay/rules.md) | What mechanical promises exist for players? |
| [Actions and commitments](gameplay/actions-and-commitments.md) | How does intention become accepted continuation? |
| [Time and autonomy](gameplay/time-and-autonomy.md) | When does fictional time advance, and what happens while away? |
| [Continuity](gameplay/continuity.md) | How does sparse-world memory and lasting consequence work? |
| [Worlds and characters](gameplay/worlds-and-characters.md) | What forms and settings must the core support? |
| [Acceptance scenarios](gameplay/acceptance-scenarios.md) | Which benchmark stories define acceptance texture? |

## Experience

| Document | Question |
| --- | --- |
| [Principles](experience/principles.md) | What must the player experience never compromise? |
| [Entry and onboarding](experience/entry-and-onboarding.md) | How does a visitor become a player with a life? |
| [Play and decisions](experience/play-and-decisions.md) | How do scene, choice and wait feel in-story? |
| [Return and journal](experience/return-and-journal.md) | How does return and long-life reading work? |
| [Navigation and stories](experience/navigation-and-stories.md) | How do Stories spaces connect? *(skeleton)* |
| [Settings and accessibility](experience/settings-and-accessibility.md) | What controls and a11y does the product owe? *(skeleton)* |
| [Presentation](experience/presentation.md) | What atmospheric presentation promises exist? *(skeleton)* |
| [Collaboration](experience/collaboration.md) | Shared-story UX *(proposed)* |
| [Replay](experience/replay.md) | Player replay *(proposed)* |

## Storyteller

| Document | Question |
| --- | --- |
| [Behavior and quality](storyteller/behavior-and-quality.md) | What narrative behavior and limits apply? |
| [Profiles and settings](storyteller/profiles-and-settings.md) | What creative controls may players set? |
| [Memory and continuity](storyteller/memory-and-continuity.md) | How should Storyteller memory behave? |

## Admin

See [admin/](admin/README.md) — charter, authority, support, commercial/trust *(conditional)*, liveops, AI investigation, command center, operator workflows. Unapproved production grants/refunds/privacy exports stay labeled conditional.

## Compatibility stubs (do not add new norms here)

| Legacy path | Canonical owner |
| --- | --- |
| `foundations/gameplay.md` | [actions-and-commitments](gameplay/actions-and-commitments.md) + [rules](gameplay/rules.md) |
| `foundations/game-rules.md` | [rules](gameplay/rules.md) |
| `journeys/time-and-autonomy.md` | [time-and-autonomy](gameplay/time-and-autonomy.md) |
| `journeys/playthroughs.md` | [acceptance-scenarios](gameplay/acceptance-scenarios.md) |
| `journeys/player-experience.md` | `experience/*` (pending) |
| `journeys/story-creation.md` | `experience/entry-and-onboarding.md` (pending) |
| `storytelling/continuity-and-consequences.md` | [continuity](gameplay/continuity.md) |
| `storytelling/storytelling.md` | `storyteller/behavior-and-quality.md` (pending) |
| `storytelling/storyteller-settings.md` | `storyteller/profiles-and-settings.md` (pending) |
