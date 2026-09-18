# Premise to playable campaign

Status: Draft for owner review. Preparation does not authorize implementation or live inference.
Approval: Pending.

## Intended outcome

Turn a player's premise into a reviewed mechanical starting point without requiring a developer-authored scenario ID. The player should be able to describe a fantasy traveller, ordinary worker, cartoon absurdity, spacecraft, microbe or abstract entity and receive a starting character/world seed that uses only supported rules while preserving the premise's scale and identity.

This feature closes the largest current flexibility gap: mechanical opening generation now proposes actions, but its character capabilities and starting facts still come from a catalogue fixture.

## Representative flow

The player writes: “I am a patient microorganism following a chemical gradient while a hostile change spreads through the colony.” They select a quiet, strange Storyteller and a deliberate pace. Preparation proposes a compact reviewed setup:

- the character's name/form and applicable SRD abilities;
- supported skills and proficiency choices;
- bounded current character and situation facts;
- only quantities whose later choices need exact counts;
- the initial scene and private immediate plans;
- clear notes where the premise cannot yet map to a supported mechanic.

The review explains the playable interpretation in player language. The player can correct a material misunderstanding or regenerate before Start. Start copies the accepted setup exactly; it does not reinterpret the premise or reopen a catalogue.

The same flow can interpret a humanoid adventurer without forcing every capability onto the microbe. Invalid skills, impossible effects or unsupported rules fail before review. If a premise requires mechanics outside the implemented ruleset, review says what is unsupported instead of pretending prose can enforce it.

## Scope and boundaries

Included:

- one solo character and one initial current scene;
- generated proposal of applicable abilities, supported skills, bounded facts/quantities and opening plans;
- deterministic validation against a versioned supported-rules catalogue;
- a player-facing review that distinguishes premise text from the proposed mechanical interpretation;
- one correction/regeneration path before Start;
- immutable accepted setup provenance and exact Start behavior;
- offline fixtures for humanoid, microbe and abstract premises through the same contracts.

Deferred:

- free-form custom rule authoring or executable model-defined mechanics;
- full class/species/background builders, advancement and complete SRD character creation;
- equipment economies, spell catalogues, multiplayer party creation and secret GM setup;
- live model quality evaluation;
- universal entity/world generation.

The rules catalogue may be extensible, but “generic” does not mean accepting arbitrary strings as skills, effects or process kinds.

## Acceptance

- A premise can enter mechanical review without selecting an authored mechanical-content ID.
- Review shows what character and situation the game believes it is starting, plus the public opening intentions.
- Start stores the exact accepted character, facts, quantities, scene and private plans under one provenance fence.
- Humanoid, microbe and abstract fixtures require no scenario-name branches in shared policy.
- Applicable abilities and skills differ honestly by form without changing the underlying SRD ruleset.
- Unsupported premise requirements produce an understandable limitation or review issue, not silently invented mechanics.
- Editing the draft invalidates the old reviewed setup; retrying Start cannot change it.
- Private DCs and outcome branches remain absent from browser DTOs.

## Decisions still needed

- Is review correction initially structured (rename, toggle capability, remove fact) or one bounded natural-language correction followed by a new proposal?
- Which minimum character decisions must belong to the player rather than the Storyteller?
- Should the first slice permit choosing ability scores, or only review Storyteller-proposed scores within bounded arrays?

## Owning specifications

[Vision](../../vision.md), [story creation](../../story-creation.md), [game rules](../../game-rules.md), [gameplay](../../gameplay.md), [data](../../technical/data.md), and [Storyteller runtime](../../technical/storyteller-runtime.md).
