# WR06 | decided execution design (planner-owned)
**Requires WR05's complete as-of v2 scene state and WR02's branch-neutral Library root.** Do not lift `unsupported_active_work` until all copied semantics are implemented.

## Pure remap algorithm
Input: validated immutable historical scene-commit v2 at selected sequence, authorized owner, requested child story UUID and stable fork request id. Read **only** checkpoint state and pinned Library/skills/rule roots at that scene. Construct deterministic mapping keyed by (original kind, original ID, fork ID) to child-scoped ID (UUIDv5 or content-derived deterministic UUID; use existing ID utility if one exists). Map every reference: actors/items if branch-scoped, offers and choices, world obligations, accepted activity plan/progress, deadlines/holds, event causation references. Preserve completed effects and remaining *fictional* duration; never replay effects, reroll random events, regenerate scenes or subtract parent's later wall time. Migrate source/provenance IDs as **read-only references** where appropriate, not as live foreign keys.

Output: child semantic state with same as-of truths and new branch/local command IDs, one inherited scene passage/interaction, independently playable available options. Keep parent state, workflow, provider attempt, money, Temporal run, outbox lease and staff rights **out**. If an obligation requires a dispatcher, mint child due-work/outbox identity only once under fork operation.

## SQL and root publication
Under owner check resolve `storySceneCheckpoint` selected hash, verify object and source root; stage child immutable state/checkpoint. In one transaction: idempotency by (parent/scene/fork request), insert child story+provenance, set **exact inherited v2 Library root pointer** with child-local revision, project child campaign + active rows and choice identities, insert child scene selector, schedule its own due work. On retry return the one child. Do not create `offscreen.manifest.v1` from ancestor.entries for new v2 forks. Inherited choice must validate through the normal player action command using the **child** interaction ID.

## Edit order
1. Add pure remap functions and exhaustive reference-map fixtures (no SQL).
2. Add historic scene-commit v2 selection/checks and owner/privacy negative tests.
3. Add transactional fork projection and child root pointer using WR05 selector.
4. Wire child due scheduling and inherited choice replay-safe action path.
5. Parent-to-scene-80 / child-from-37 active-travel and fork-twice integrations.

**Hard stops:** WR05 checkpoint lacks an activity/offer/obligation needed for pure remap; live parent mutable row is required; one active class is silently dropped. Return exact missing field/consuming query to planner. Don't downgrade acceptance to quiescent-only.