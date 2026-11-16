# Decision E-D02 | Sparse identities and possession without a universal world simulation

**Status:** target semantics, **not** authorization to build an Actor service. Baseline source: `packages/db/src/schema/stories.ts` `story_item` (unique story ID + item key; holderKey is plain text), while `campaign.character` is a single mutable JSONB document, not a multi-actor registry.

## Five distinct identities

- **Viewer:** an authenticated account with read access.
- **Controller:** the actor-authorized user or approved automated policy allowed to submit intentions.
- **Actor:** a person, creature, process or mind with agency and optional capability state.
- **Holder/entity:** a story-scoped thing capable of owning/containing something, even when it cannot act (a house, box, institution, signal receiver).
- **Mention:** the narrator described a named noun. A prose mention is **not automatically a durable actor or item**.

The same string label can refer to different people. A person's name can change without changing identity. A player owns their character's decisions, not every holder in the fictional universe. Some worlds have no physical objects, and therefore no possession capability at all.

## Product contracts

1. An addressable scarce object has exactly one current holder or a modeled destroyed/unclaimed state.
2. The holder is **story-local**, versionable and permissioned; never infer authenticated viewer identity from a prose `holderKey`.
3. Transfers validate actual holder and prerequisite at their effective fictional time, not only when a draft was proposed.
4. An actor can have no body/HP/inventory, while still having meaningful checks and history.
5. A container can hold an object without being an actor. A wizard inside an apple is a **containment** relation, not just an item-holder string.
6. Actor knowledge differs from world truth. Players cannot inspect private items merely because the SQL registry contains them.
7. Storyteller speech about who holds something is not the ownership ledger. Only a committed effect changes the ledger.
8. Promoting a significant NPC/object to an identity is a validated, source-linked event; no census of every passing mention.

## Why ENG01 reuses story-local keys

A complete `story_actor`/`world_entity`/`control_grant` schema is premature when we're proving one mechanical possession effect. ENG01 uses the existing registry and **two predeclared valid holder references** inside controlled scenarios. It makes no claim that arbitrary strings are safe global actor identities.

If an action attempts to transfer to a holder not admitted by its current story/rule context, the action is unsupported; the UI/narrator cannot invent the destination and call it real. The first slice can hard-limit eligible destinations without claiming a universal role registry.

## Future identity and shared play

When a later Change introduces two independently controlled actors, explicitly decide and test:
- stable story-scoped actor IDs and viewer-controller grants;
- private knowledge/visibility rules for each viewer and actor;
- holder references to actors, containers or places;
- scene/clock/shared resource conflict scope;
- how actor rename, transformation and deletion affect items;
- compatibility for old `holderKey` strings and historical passages.

Do not sneak this into an item-transfer refactor or assume a universal ECS. The engine should materialize a thing **when future correctness cares about it**, not whenever a model introduces a new descriptive noun.

## Contrasting fixtures

- Human gives a compass to Mara, which remains a real item after a conversation.
- Abstract mind transfers a scarce signal token to another process, without cash, armor or coordinates.
- A microbial colony absorbs nutrients: that's a **bounded resource/time effect**, not automatically a unique possession transfer.
- A fictional narrator calls Mara “the captain,” but the ledger still knows her stable identity; title change does not spawn another holder.
- Two players claim one item; exactly one transaction/receipt may win.
- An old item source says the compass was at home, but a new committed transfer moves it to Mara; history isn't erased and current truth changes.

## Reversal criterion

If mature multiplayer/world models require independent entity simulations and multiple geographically separate clocks, a richer actor/entity system may be justified. Until then, simple typed, sparse identities and SQL-transactable possession semantics serve the product better.
