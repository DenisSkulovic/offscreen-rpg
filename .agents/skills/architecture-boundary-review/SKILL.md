---
name: architecture-boundary-review
description: Review a consequential Offscreen RPG architectural change, oversized module, package dependency or state-ownership seam before proposing a refactor. Produces a small evidence-backed design decision, not code.
---

# Architecture boundary review

**Trigger:** A feature crosses packages, a module grows unclear, two paths mutate the same state, new infrastructure is proposed, or refactoring risks Temporal/SQL/document/Storyteller boundaries. This is a **read-only design procedure** unless a separate implementation slice is authorized. For a simple defect use the codebase-investigation skill instead.

## Activate the relevant architectural design space

For a nontrivial change, review the needed section in [architecture decision space](../../knowledge/architecture-decision-space.md) **before recommending a pattern**. Look for alternative module boundaries, ownership and data/communication choices, and why each may be superior under different constraints. A large file or fashionable framework alone is not a design argument. For an API/network or trust boundary use [API/network contract](../../knowledge/api-and-network-contracts.md) or [security/trust](../../knowledge/security-and-trust.md) instead of reading every architecture manual. For operationally complex decisions add [observability/diagnostics](../../knowledge/observability-and-production-diagnostics.md) only if it changes the proposed design. Don't preload any manual for an isolated bug fix.

## Select the contract and follow one vertical route

1. State the player/developer problem and acceptance in two sentences. Read only the affected product page from `docs/README.md`, technical owner from `docs/technical/`, and actual source entry from `docs/engineering/code-navigation.md`. Architecture design describes _intended_ components; package manifests/exports and executed code establish _present_ wiring.
2. Trace one real input to authoritative operation, mutation, publication/public projection and the relevant duplicate/stale/failure path. Record source **paths and symbols**, not 2,000 lines of copied code. Search filenames/symbols first. One concrete trace beats multiple general architecture essays.
3. Check these actual boundaries before inventing new abstractions:

| Owner                     | Must not become                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------- |
| `apps/api`, `apps/worker` | A second game resolver, transaction policy or state writer                                           |
| `packages/application`    | An opaque catch-all; operations own admission, SQL/root fences and atomic use cases                  |
| `packages/game`           | A network/persistence adapter, LLM decision maker or world-specific plot engine                      |
| `packages/storyteller`    | The authority for dice, effects, committed time or published facts                                   |
| `packages/documents`      | A second live command ledger; immutable bodies/root manifests are committed under application fences |
| `packages/workflows`      | Business-state truth independent of application/database rechecks                                    |
| `apps/web`                | A local simulation of authoritative mechanics inferred from presentation                             |

## Questions that discriminate good designs

- **Authority:** For each state field, who can change it, when, and under which revision/transaction? Are there two writers or a speculative result masquerading as committed?
- **Execution:** What happens after duplicate HTTP requests, repeated workflow wakes, a process crash, timeout, stale plan, failed provider bill or partial document staging?
- **Information boundaries:** Which inputs must be exact? Which are derived views, optional memory candidates or untrusted model suggestions? Do not conflate storage, retrieval, final packet and publication.
- **Complexity:** Is the code hard to reason about because one module owns several independently changing responsibilities, or merely long due to cohesive schemas/tests? Count unrelated reasons-to-change and caller fanout, not lines alone.
- **Operational cost:** Does a new abstraction require another service, another model read, more cross-package builds or recurring broad context discovery? What can existing operations support?
- **Player outcome:** Would the proposed refactor improve an actually tested flow, or are we optimizing infrastructure while the 10–15-turn proof remains missing?

## Produce a decision, not another system

Compare **keep current boundary + focused repair**, **local extraction**, and **responsibility relocation** where each is plausible. Prefer the least costly option meeting acceptance. If no architecture change is justified, say so.

Deliver at most:

- **Verdict:** chosen option with two specific reasons and one serious alternative.
- **Evidence:** 3–8 path/symbol anchors and the exact broken or risky invariant.
- **Contract change:** product/technical owner and what remains unchanged.
- **Execution handoff:** one bounded Cursor-sized slice, exclusions, smallest safe regression/trace, and any meaningful unresolved decision.

Do not launch autonomous parallel refactors, modify unrelated packages, or equate green tests with a coherent architecture. Expensive reviewers are reserved for contested state/transaction boundaries. Never dispatch a paid Storyteller call for architecture inspection.
