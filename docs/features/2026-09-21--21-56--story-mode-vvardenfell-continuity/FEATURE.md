# Story mode Vvardenfell continuity slice

Status: Agreed and implementing
Approval: On 2026-09-21 the owner requested a real player-facing Story run,
prepared Vvardenfell/Seyda Neen files and durable character continuity, while
clarifying that Chamber remains a general experiment space rather than the
scripted-game mode.

## Intended outcome

A local player can enter the ordinary Story product, create a maintained
Vvardenfell campaign, review its opening aboard the prison ship/arrival at
Seyda Neen, start it, leave and return through the normal story list. The
campaign begins with inspectable pinned world/start/rule files rather than
depending on model memory. Expected participants such as Socucius Ergalla have
stable canonical identity and continuity records before they must survive a
return or mechanical interaction.

Chamber remains the experimental room: it may run scripted or live stories,
load prepared mid-story situations and expose developer controls. Story mode
is the player-facing product surface and does not expose those controls. Model
execution policy is independent of that distinction.

## Representative flow

The player launches local Story mode without configuring GitHub OAuth, creates
a story from the Vvardenfell arrival start, chooses a Storyteller and reviews
an opening grounded in its files. Starting creates a campaign manifest with
the prisoner, immediate places, expected people, rules/settings/time and
initial narrative threads. The player speaks to or insults Socucius, leaves,
plays unrelated turns and later returns. The Storyteller receives Socucius's
current identity/relationship/state bundle and selected source evidence rather
than scanning every passage or trusting pretrained lore.

If the player attacks an incidental person, the person is registered/promoted
before a supported mechanical resolution commits. If required controlling
state cannot fit the context or lacks a supported mechanic, the turn holds
with an explicit limitation; low-cost play may lose optional texture but may
not silently resurrect, relocate or reconcile an entity incorrectly.

## Scope and boundaries

Included:

- a dedicated loopback local Story launcher using the normal player pages,
  ordinary story APIs and canonical store, without Chamber tools or OAuth;
- one bounded checked-in Vvardenfell world/start package with immediate Seyda
  Neen lore, expected characters/locations, private direction and the existing
  generic mechanical seed;
- progressive entity materialization from mention to registered continuity
  entity to mechanically active state;
- deterministic current-participant/context loading plus source-linked
  relationship/event history;
- provider-free rehearsal first, then held/live execution only after the
  existing accounting uncertainty is reconciled.

Deferred: exhaustive Morrowind reconstruction, automatic extraction of every
noun, full NPC stat generation, universal combat, semantic/graph retrieval,
multiplayer and production deployment/auth onboarding. Setting files are
reference material for this POC and must not imply an authorized commercial
reproduction.

The abstract/nonhuman benchmark may omit people, settlements, relationships,
inventory, geography and calendars. Shared code consumes document roles and
typed state, never Vvardenfell or human-specific identifiers.

## Acceptance

- `pnpm story:local` (or its final documented equivalent) opens `/stories`
  with a local player identity and no Chamber inspector/scenario controls.
- The creation flow can select the maintained Vvardenfell start and Starting
  produces an inspectable campaign root containing its exact pinned files.
- Socucius and the immediate arrival locations are stable records, not only
  names in generated prose.
- A meaningful interaction revises compact continuity state with passage
  provenance; a later return loads the current record without requiring all
  intervening passages.
- Optional memory richness changes with policy, while required executable and
  current entity state remains present or the turn fails closed.
- The connected five-turn proof is exercised through ordinary story commands;
  a scripted run proves wiring only, and a live run remains separate evidence.

## Decisions still needed

No decision blocks the first slice. Exact character-state fields should be
introduced only when an exercised mechanic requires them. The first live model
and allowance remain governed by the existing spending/evaluation policy.

## Owning specifications

- [Story creation](../../story-creation.md)
- [Canonical files](../../technical/canonical-files.md)
- [Connected generative POC proof](../../engineering/connected-poc-proof.md)
- [Long-story memory](../../engineering/long-story-memory-and-retrieval.md)
- [QA journeys](../../engineering/qa-journeys.md)

