# Event-oriented gameplay transitions

Status: Implementing
Approval: The owner approved the architecture direction on 2026-09-20 after reviewing the settlement-coupling audit.

## Intended outcome

Gameplay mechanics remain easy to extend without turning settlement operations into central coordinators that know every downstream subsystem. A maintainer can add a new durable consequence of a transition through a typed intent and its owning adapter, while dice, effects, clock movement and receipts remain one auditable transaction.

This is an internal architecture change. It should not alter what a player sees or introduce an event broker, eventual consistency inside core mechanics, or a fully event-sourced campaign.

## Representative flow

A finite action timer wakes the application. The application locks the story and asks the finite-action policy for the transition. If the target is not due, it returns the remaining delay without mutation. If it is due, the transition describes the exact campaign state, durable lifecycle fact and required follow-up intents. The transaction persists the resolution and intents atomically. After commit, the existing outbox and Temporal workflow prepare narration. A retry observes the terminal execution and cannot roll or enqueue the consequence twice.

An activity settlement follows the same transition vocabulary later, but retains its own contribution/wait policy and completion modes. Quiet completion must not acquire a Storyteller dependency merely because finite actions narrate their consequences.

## Scope and boundaries

- Introduce explicit, discriminated transition and follow-up-intent types at the campaign application boundary.
- Extract finite-action transition planning from persistence orchestration first.
- Route durable asynchronous follow-ups through one exhaustive application adapter and the existing transactional outbox.
- Migrate activity completion only after the finite-action seam is readable.
- Preserve PostgreSQL authority, story locking, atomic mechanical settlement, revision fences, idempotency and existing Temporal topics.
- Keep synchronous local work as direct typed calls. Do not add a generic publish/subscribe bus, independent subscribers, stringly typed domain events, microservices or state reconstruction from event history.
- Do not collapse finite actions and activities into one weakly typed execution payload. They share lifecycle vocabulary and follow-up delivery, not resolution policy.

## Acceptance

- A finite action's due/waiting decision and resulting state can be reviewed without reading SQL or Temporal dispatch code.
- Its persisted lifecycle fact and asynchronous consequence request are explicit values of the transition rather than hidden calls inside mechanical resolution.
- Applying a transition and creating its durable outbox work remain in the same database transaction.
- Follow-up handling is exhaustive at compile time and adding a new intent has one obvious adapter owner.
- Retry and stale-wakeup behavior remains unchanged.
- Activity migration proves that quiet, report and scene completion remain distinct policies rather than hard-coded narration.
- Permanent architecture and application navigation documents explain when to use a direct call, a domain fact and a durable follow-up intent.

## Decisions still needed

None for the approved refactor. A separate broker is reconsidered only if independently operated consumers need their own durable delivery of the same fact.

## Owning specifications

- [Architecture](../../technical/architecture.md#gameplay-transitions-and-durable-follow-ups)
- [Application flows](../../../packages/application/README.md)
- [Gameplay concepts](../../concepts.md)

