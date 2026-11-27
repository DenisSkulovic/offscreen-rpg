# D-0001 | Modular engine, not an LLM-led chat

**Date:** 2026-11-16 record of the November 2026 working selection.
**Acceptance:** selected working target, dated. It is neither a permanent correctness invariant nor a code authorization, and open items in the architecture page remain unratified. It has not been superseded.
**Norm:** [selected engine architecture](../technical/engine/selected-architecture.md).

## Choice

Keep a modular monolith: PostgreSQL story authority, pure rule capabilities, boundary-driven time, immutable narrative objects, and a bounded Storyteller that proposes rather than commits.

Two parts of this decision differ in kind. The **prohibition** on handing mechanical truth (rolls, clock, inventory, cross-actor authority) to an LLM is a standing safety rule of the engine. The **modular-monolith shape** is the dated working choice, held until the revisit rule below is met.

## Rejected for now

An LLM-led chat as the source of mechanical truth. The rationale is [Alternatives that lose for now](../technical/engine/selected-architecture.md#alternatives-that-lose-for-now). A universal world simulation. Event-sourced microservices before domain seams are stable. A turn-based CRPG engine as the whole product.

## Revisit

Only if a specific shared-world simulation, or measured independent hot domains with stable event semantics, makes the rejected shape necessary. Never revisit LLM-led chat as the sole mechanical authority.

## Continuity on 2026-11-19

The choice, the rejections and the revisit rule above stay in force as the working engine target. As of 2026-11-19 they matched the then-current modular-monolith implementation; that is a **historical observation**, and present implementation reality is owned by the [architecture page](../technical/engine/selected-architecture.md) and [STATUS](../../STATUS.md), not by this record.

The only scope that moved on 2026-11-19 is the earlier deferral of a learning environment. The owner selected an educational platform laboratory in addition to this decision; its contract is [Distributed learning target](../technical/platform/topology.md#distributed-learning-target). The laboratory may practice Kubernetes, a message broker and separately deployable processes on disposable local resources before a measured production need exists.

That selection does not supersede PostgreSQL story authority, pure rule capabilities, boundary-driven time, immutable narrative objects or the bounded Storyteller. It does not accept event-sourced campaign state or an LLM-led chat as mechanical truth. Splitting a process does not move a rule. Nothing named in the laboratory is deployed by this record.
