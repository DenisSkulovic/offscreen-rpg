# MA06 | move stable Story Authority and Storyteller Runtime into independently owned workspaces

**Status:** **Proposed, NOT CURSOR-READY.** Requires MA05 accepted, current Writer Workshop source landed, MA01 graph owner rules, package contract ratification and migration fixture suite. **Target:** `undertaking/modular-monolith`. This is the actual major monorepo restructuring; execution will be broken into **independently mergeable small Changes** after exact source/consumer inspection, not one giant Cursor task.

**Target:** `@offscreen/story-authority` owns `application/src/stories` and `application/src/campaign` as **one cohesive transactional module**; `@offscreen/storyteller-runtime` owns durable `application/src/storyteller` Writer/capture/budget/publication logic and generation custody while pure `@offscreen/storyteller` continues to own provider-facing requests/schemas/transport. `@offscreen/application` becomes a temporary composition/compatibility façade, with explicit eventual removal rather than a new dumping ground.

**Dependency direction:** Hosts (API/GA/worker) → story-authority / storyteller-runtime / Admin; storyteller-runtime → story-authority and provider-facing storyteller; story-authority → contracts/game/db/documents and its own lower-level outbox ports, but **never** → storyteller-runtime, provider adapters, developer tools. No new network service, DB migration or change to story publication/transaction ownership.

**Risk:** The current modules contain 180 application files, including 63 Storyteller, 32 campaign, 21 story, 7 generation and outbox helpers. Public application exports and runtime compositions are widely consumed. A naïve full move would break NodeNext exports/Turbo dependencies, create cycles or silently change exact SQL and provider custody. **Do not commission MA06 as a single broad implementation ticket**; ChatGPT will produce a small MA06-A/B/C ordered set of packet-level migrations after MA05 and current graph proof. Existing MA06 is a reserved end-state specification, not an executable task queue.

[Source map](SOURCE-MAP.md) · [Migration sequence](EXECUTION.md) · [Proof](PROOF.md).
