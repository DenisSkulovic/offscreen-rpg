# Technical contracts: find the right owner

This is a **routing index**, not another technical specification. For *what the player should experience*, use [the product map](../README.md); for what actually runs, use [code navigation](../engineering/code-navigation.md), package READMEs and [progress](../progress.md). A design target is not proof of implementation.

## Foundation and persistence

| If the question is… | Read first | Distinction |
| --- | --- | --- |
| What is the intended application architecture? | [Technical architecture](architecture.md) | Target system, not actual package import graph |
| Who decides rules, effects and legitimate choices? | [Rules and activities](rules-and-activities.md) | Gameplay authority, not clocks or model creativity |
| How do accepted actions integrate across systems? | [Connected solo gameplay](solo-gameplay-contract.md) | Integration contract, not an independent game resolver |
| How do stories start, fork, pause or finish? | [Story lifecycle](story-lifecycle.md) | Lifecycle, not admitted action settlement |
| What are SQL records and consistency rules? | [Data and consistency](data.md) | SQL and historical migration descriptions; cross-check current status |
| Who owns durable descriptive records and revisions? | [Canonical files: truth ownership](canonical-files.md#one-owner-per-kind-of-truth) | Immutable document roots; don't mistake target file ownership for live mechanical authority |
| What can be cached or rebuilt? | [Persistence and caching](persistence-and-caching.md) | Derived projections are not command state |

## Time and durable work

| Question | Exact section |
| --- | --- |
| When is the world allowed to advance? | [Committed time: permission to advance](committed-time.md#permission-to-advance) |
| What are the units and exact rounding rules? | [Fictional-time contracts](ticks-and-tags.md#fixed-real-second-scheduling-and-fictional-time) |
| What do calendars, eras and seasons mean? | [World calendars](calendars-and-world-time.md#one-chronology-optional-ways-of-naming-it) |
| How do Temporal, outbox and duplicate wakes coordinate? | [Execution and delivery](execution.md#commands-and-durable-delivery) |
| How do quiet activities, chains and explicit re-entry interact? | [Solo gameplay: follow-ups](solo-gameplay-contract.md#boundary-follow-ups-and-task-contracts) |

## In-game Storyteller, memory and money

These are contracts for **the Storyteller running inside the product**. For **Claude Code, Cursor and ChatGPT development-agent cost**, use [the layer-zero harness](../../.agents/HARNESS.md).

| Question | Exact owner |
| --- | --- |
| What kinds of tasks and proposals can the Storyteller produce? | [Storyteller runtime](storyteller-runtime.md#profile-and-task-contracts) |
| Which canonical documents and evidence are allowed? | [Canonical files](canonical-files.md) |
| How is context selected and bounded into model requests? | [Context and cost](context-and-cost.md#build-context-for-a-specific-decision) |
| What controls account entitlement, windows, spending and holds? | [Usage policy](usage-policy.md#distinct-authorities) |
| How is an exact model packet held, released and audited? | [Provider dispatch review](provider-dispatch-review.md#exact-packet-boundary) |
| How are story/profile settings versioned? | [Story settings](story-settings.md) |

## Player systems and examples

| Question | Read |
| --- | --- |
| What crosses client/server boundaries, and who owns sessions? | [Client and identity](client-and-identity.md) |
| How can the world contact an absent player? | [Notifications](notifications.md) |
| What does local/hosted delivery need to prove? | [Delivery and validation](delivery-and-validation.md) |
| Which authored traces challenge the architecture? | [Technical playthrough atlas](playthroughs/README.md), not runtime test results |

**Read one row and then the needed heading.** Consult a source path only when the actual implementation is material. Where canonical-files and data migration status disagree, identify the specific claim and inspect actual source/evidence; do not choose the newest prose by default. New topics should be routed here by link, not copied into this index.
