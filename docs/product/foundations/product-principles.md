---
id: DOC-PRODUCT-PRINCIPLES
layer: product
status: draft
domains: [foundations]
tags: [dnd-rules, configurability, autonomy, continuity, affordability]
updated: 2026-09-17
relations:
  - type: derives_from
    target: DOC-PRODUCT-VISION
  - type: depends_on
    target: DOC-GLOSSARY
  - type: depends_on
    target: DOC-PLAYER-NEEDS
---

# Product principles

Owner: Denis. Scope: decision guidance across product topics, not a replacement for detailed rules.
Sources: [confirmed decisions](../../decisions.md), [vision](../PRODUCT_VISION.md), [player needs](audience-and-player-needs.md), [terminology](glossary-and-domain-map.md).

The directions below are grounded in user decisions. Their presentation as principles and the review prompts are a draft synthesis. Detailed examples are illustrative, not newly approved mechanics.

## PRINC-001 — Reuse D&D as the mechanical foundation

Basis: D021; supports NEED-003.

Choose an edition and source scope, then use its mechanics broadly. Do not silently replace D&D with a bespoke rules system. Any adaptation required for continuous time, autonomy or configuration must identify the source behavior, the conflict and the proposed change.

Review prompt: are we implementing an adopted mechanic, resolving a documented gap, or inventing a substitute without discussion?

## PRINC-002 — Let the selected rules determine what is earned

Basis: D013 as qualified by D022; supports NEED-002 and NEED-006.

The defining style makes real time and attention valuable. Other configurations may accelerate or remove real waiting. In every configuration, narration follows the actual rules and activity requirements.

Review prompt: does this outcome satisfy the active campaign contract, or is narration granting it merely because it was requested?

A faster journey need not be a risk-free journey. Exact resolution of intermediate events belongs in the time and activity documents.

## PRINC-003 — Preserve the distinction between pause and absence

Basis: D014, D019; supports NEED-004 and NEED-007.

Pause freezes the world. An absent player may deliberately leave it running. Automatic pause, timed intervention and autonomous fallback depend on configuration; no universal absence protection is implied.

Review prompt: does this behavior use the world's actual time state, or incorrectly infer it from player availability?

## PRINC-004 — Give autonomous characters their own fallible judgment

Basis: D018, D020; supports NEED-004 and NEED-005.

Character intelligence, personality and flaws can produce unwise actions. Autonomy is not a promise to maximize the player's gains or preserve their possessions. The relationship between explicit instructions and character choice still requires definition.

Review prompt: is the surprise a fictional decision consistent with the character and rules, or an implementation failure being excused as randomness?

## PRINC-005 — Support a life, not only an adventure sequence

Basis: D016; supports NEED-001, NEED-002 and NEED-005.

Livelihoods, relationships, travel and ordinary ambitions matter. The player initiates developments, and wider events may also affect them. Becoming a combat hero is not mandatory.

Review prompt: can this feature contribute to the craftsperson's life as well as the adventurer's, where relevant? Do not force every feature to serve every lifestyle.

## PRINC-006 — Make configurability explicit and coherent

Basis: D019, D022; supports NEED-006.

Permit different preferences for pace, severity and control. Campaign policies may lock some choices. Every consequential setting needs defined behavior and interactions; “configurable” must not hide an unanswered design question.

Review prompt: what changes, when may it change, what happens to ongoing activity, and which campaign locks apply?

Default presets and lock sets are not selected by this principle.

## PRINC-007 — Preserve a campaign's identity and consequences

Basis: D002, D003, D015; supports NEED-002 and NEED-003.

A campaign persists beyond a session or narrator model. Established facts, possessions, relationships and prior consequences must continue to matter. Actor beliefs may be wrong; authoritative game state must not silently drift to accommodate prose.

Review prompt: would a returning player recognize the same campaign, even if its narration style changes?

## PRINC-008 — Keep worlds flexible and authority clear

Basis: D010, D021; supports NEED-001 and NEED-003.

A world can begin undefined, custom or extensively established. Different settings are content choices within the harness. Creating facts and discovering facts are distinct, and freedom to create a world does not automatically authorize rewriting outcomes during play.

Review prompt: who is establishing this fact, under which authority, and what existing material does it affect?

The exact player-authoring policy remains open.

## PRINC-009 — Spend AI effort where it contributes to play

Basis: D003, D006, D011, D015, D028; supports NEED-008.

D064 reopens the earlier preference for substantial activity-specific logic. The proposed lighter harness preserves state, time, limits and adopted checks while the storyteller judges generic story continuation. Avoid calls per tick, but do not promise novel adjudication without inference. Provider choice cannot bypass established facts, permissions or adopted roll semantics. Evaluate coherence and cost rather than requiring dedicated work/travel/trade implementations.

Procedural generation supplies varied content within defined mechanical contracts. An invented entity's prose does not by itself establish executable abilities, costs or effects. Intentional chance in the game is distinct from a model inconsistently interpreting the rules. Fallible character behavior remains intentional; its consequences still follow the active mechanics.

Defining prerequisites, costs, progress, interruptions and outcomes is product work. Choosing their software representation is later technical work. Adopted D&D mechanics retain priority under PRINC-001; additions for livelihoods, continuous time and autonomy must identify gaps or adaptations explicitly.

Review prompt: what player value requires this model call, what can the game already resolve, and what happens if generation is unavailable or its budget is exhausted?

[AI contribution and budget](../ai-experience/cost-budgets-and-degraded-play.md) now owns the draft node roles, expenditure contract and no-model fallback. Model quality can influence action choice even when rules stay fixed; AI-F01 makes that tradeoff explicit.

No provider, architecture, numerical call limit or monetary ceiling is chosen here. Selective use is a direction, not a claim that one fixed call frequency will suit both unattended work and active conversation.

## Applying these principles

Use principles to expose tradeoffs, not to settle all conflicts by slogan. Rules adoption, autonomy, configuration and world freedom can collide; record the specific conflict and discuss a resolution.

For example, instant passage does not violate PRINC-002 when allowed by the campaign. A death during authorized running autonomy does not violate PRINC-003. A surprising but valid character decision can satisfy PRINC-004 while frustrating the player.

When drafting a topic, cite only the principles that actually constrain it. Precise behavioral requirements belong in their owning topic. Do not copy this document into every specification.

## Not yet settled

D&D edition/source scope; bounded adaptations; defaults/locks; direct-order and authorship details; numerical budgets and responsiveness targets. Product v0.01's release boundary is consolidated in DOC-RELEASE-SCOPE; TASKS owns decisions needed for the next build.

Future playtests should assess whether these principles produce the intended experience, not merely whether the documents repeat them consistently.

The chronology metaphor is a product lens, not literal evidence that no mechanics exist. Choices, time, uncertainty, state and limits are still rules of the experience. D064 calls for reducing that contract to what actually makes play coherent, with proposed alternatives discussed rather than mechanically adopting every example.
