# UX08 | World and You, only when the story actually has them

**State:** Proposed. **Approval:** no code authorized; owner must explicitly select for Cursor. **Kind:** conditional player context UI and tests. **Parent:** [experience program](../../experience/implementation-program.md), M2. **Dependencies:** UX02 and UX07, verified public data projection.

## Cursor first-screen brief

> **Source map:** [Play ownership](../../../apps/web/src/features/play/README.md), ui/campaign-status.tsx, ui/campaign-records.tsx; read public packages/contracts/src/campaign.ts and stories.ts types only for displayed state.
> **Primary target:** [World](../../experience/spaces/journal-world-you.md#world-what-the-character-knows), [You](../../experience/spaces/journal-world-you.md#you-the-current-form-and-its-consequences), [context shelf](../../experience/spaces/journal-world-you.md#context-shelf-selection-rules).
> **Known trap:** character, location, bodily ability, inventory, currency and map are all optional concepts in this game; private canonical documents cannot be exposed as public world knowledge.
> **Scope:** Proposed only; present verified public facts, do not write a new world knowledge engine.

## Target and design argument

**World** answers “What do I know about that place/person/thing?” **You** answers “What is true about my current form, abilities, possessions and commitments?” Both are contextual spaces. A tiny context shelf on Now shows at most a few facts relevant to the current situation, never the entire character database.

A universal fantasy RPG HUD is the competing proposal. It is familiar, but a particularly bad product default: a bodiless consciousness should not have “Strength 0,” “Map unavailable” and “0/40 Inventory.” **Conditional space > fake emptiness**. If stable world/character records are missing, do not render tabs implying they exist.

## Observable result

1. Conditional, readable current capabilities/conditions and relevant belongings using real authorized fields.
2. Context-sensitive World index of established entities only insofar as public data support it; an initial subset may be known location/person references instead of full graph.
3. One-to-three relevant facts promoted to the Now shelf where data supports relevance. Expandable detail is a **time-free read**, not a gameplay “inspect” action.
4. Source-backed previous encounters/records link to Journal; historical offers are never actionable.
5. Mobile details open as a focus-managed sheet or dedicated view and restore focus to the original stage on exit.
6. Omit irrelevant sections completely; explain known unknown facts without inventing defaults.

## Authority and baseline

[World-neutral game vision](../../vision.md), [applicability of abilities](../../game-rules.md#world-independent-foundation), [progressive people and entities](../../story-creation.md#progressive-people-and-other-entities), [UX supporting spaces](../../experience/spaces/journal-world-you.md), [client/identity](../../technical/client-and-identity.md).

CampaignView contains nullable character and location, storyFacts, activity and world time; StorySnapshot contains items. A complete safe known-entity World index is **not verified**. Inspected main 8c91618 on 2026-11-13, no browser or provider proof. Reinspect exact public wire shapes.

Likely Play status/records composition, local detail components, one optional route if approved, Storybook and RTL. A new public canonical entity projection needs **separate domain contract and authorization**, not a discovery query from the browser.

**Exclude:** omniscient NPC database, automatic map/terrain, new inventory economy, forced D&D sheet, secret Storyteller plans, dynamic LLM descriptions on clicking, UI-derived action eligibility, extensive character builder.

## Acceptance and negative proof

**Normal:** fantasy sample has applicable Strength and one meaningful item; sentient weather or microbe sample has environmental abilities and no body/coins/map; quiet domestic story doesn't have compulsory combat; opening/closing details leaves the current situation intact; 320/375px and keyboard work.

**Negative:** absent physical ability is not shown as score zero; unknown place not represented as (0,0); unpublished future NPC or secret check never leaks; owning an item does not fabricate “use item” offer; story A details cannot appear in B; reading context never starts fiction-time or provider work.

**Evidence:** Storybook three-world fixtures, tests for absent concepts and story identity, keyboard/mobile/wide review.

## Handoff

Cursor identifies usable public field evidence before Ready. If full World is unsupported, implement only honest conditional You/context subset and request separate world-entity read model. No one should mistake a pretty empty fantasy character sheet for a fulfilled target.