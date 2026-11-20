# WR06 | fork any newly published scene, including active fictional commitments

**State:** Proposed. **Kind:** implementation. **Dependencies:** WR05. **Outcome:** from a scene's exact immutable boundary, create an independently playable branch with the *same prior fictional truth and unresolved meaningful activity*, without copying the parent Library, cloning its provider/worker jobs or leaking later knowledge.

**Planning baseline:** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (2026-11-21), broad code source from `09d5820bcafe`; recheck current HEAD/worktrees before editing. **Implementation owner: Cursor.** This packet is Proposed/unselected and conveys no authorization for paid provider, destructive DB, live cluster or external effects. [Program](../../WRITER-IMPLEMENTATION-2026-11-21.md) · [Current queue](../../../QUEUE.md).

## Cursor source route

**DEPTH=PATCH-L, Game Authority fork/state owner.** Start `packages/application/src/stories/{forks,reads,scene-checkpoint,timing,resolution}.ts`, `packages/db/src/schema/{stories,campaign,outbox}.ts`, `packages/game/src/{time,state}.ts` plus actual activity/offer/world-obligation helpers. Existing `packages/application/test/historical-fork.test.mjs`, `packages/application/test/scene-checkpoint.test.mjs`. Review [WR05](../2026-11-21--wr05-coherent-scene-publication/CHANGE.md) commit contract. **Never reconstruct scene 37 from parent's current SQL row.**

## Fork contract, already chosen for implementation

1. Resolve eligible owned scene by historical **scene-commit selector**: exact Library root, semantic world-state frontier, source/profile/skill/rule pins, passage and admitted choice meaning.
2. Create a new branch identity + provenance link; initially **point at the same immutable Library root**, no N-document copies or new source object per inherited file. Do not modify the parent branch, even while it advances.
3. Rehome **semantic** pending work via pure deterministic map: item/actor/offer/activity/obligation references, settled progress, remaining fictional duration, holds and source causation. New branch-local execution IDs and dispatcher outbox identities are minted where needed. Branch clock reanchors at fork creation; the parent's idle wall-clock interval and settled provider attempts are not replayed.
4. Active due-game-second obligation / accepted travel / offered decision remains meaningful at the historical fork. Completion already settled by that point is inherited, not rerolled. An unresolved external provider result remains a held operational case rather than a copied worker workflow.
5. Branch's visible choices retain exact admitted intention from the original scene while using **new branch interaction/operation identities**. A player can actually click and resolve an inherited option without owning or reusing the parent's paid generation.
6. Branch owner/spend/permissions are **newly authorized**. Historical creative voice and source roots are inherited, but parent account finance, active lease, provider attempt and staff role are never cloned.
7. Background retrieval/indexes are rooted in the child Library and visibility. New parent/sibling secrets, later plot possibility or renamed file must not appear unless child develops them independently.

## Proof and excluded behavior

**Normal:** snapshot a ship at scene 37, 2/10 fictional hours into passage, with pending offer/obligation and an unresolved choice; parent moves to scene 80; fork 37; child preserves eight hours remaining, choice and original profile, then executes a valid branch-owned choice without altering parent. Repeat under same fork request ID: one child, one due event, one branch lineage.

**Negative:** child accidentally inherits parent scene-80 fact, active worker/Temporal ID, provider attempt, stale current clock, invalid copied generated option or private sibling note. Deny/hold. Test a second fork with simultaneous parent update and collision of document ID/revision; content-hash/root-qualified reads disambiguate. Assert no whole Library copy, no re-running 37 generations and no duplicated external side effect.

Test `pnpm --filter @offscreen/application test`, relevant `@offscreen/game` tests and **one private GA/DB fork + playable-choice integration**, including active offers and activities. Reconcile `docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities`, time/chronology and `docs/product/gameplay/time-and-autonomy.md` only after real evidence.

**Exclusions:** public UX (WR08), legacy-v1 retroactive fake reconstruction, independently generating child-scene prose at fork time. **Collision:** serialize with WR05, TURN03/DIST03 and shared clock/outbox migration owners. **Stop:** if a class of semantic active work cannot be faithfully rehomed, do not ship a newly published “fully forkable” scene using that class or paper over the omission; design its portable state and expand focused implementation.
