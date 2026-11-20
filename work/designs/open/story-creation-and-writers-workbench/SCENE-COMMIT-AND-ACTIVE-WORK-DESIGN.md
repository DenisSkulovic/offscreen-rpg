# Scene Commit V2 | coherent post-publication state and resumable branches

**Status:** preferred **candidate technical contract**, 2026-11-20, not ratified and not a production schema migration. The existing selected long-term requirement is [Every committed scene can be forked](../../../../docs/technical/engine/lifecycle-and-compatibility.md#forked-continuities). Source evidence and gaps: [audit](SCENE-COMMIT-AND-ACTIVE-WORK-AUDIT.md). Prior persistent Library design: [DAG](PERSISTENT-LIBRARY-DAG-DESIGN.md).

## Key decision: snapshot a coherent *post-commit* state

Define **SceneBoundary(s)** as one logically atomic **post-publication world state** associated with a published, playable passage. The SQL authority transaction selects:
- **LibraryRoot**: branch-neutral persistent Merkle index root; includes exact published passage document and admitted creative/private documents, with visibility/type permissions.
- **StateRoot / StateCheckpointRef**: immutable, validated, full *semantic* state at that boundary. A game-state structure, **not** freeform prose. Engine-controlled facts, capabilities, characterless world state, counted resources, fictional clock, active obligations/activities/offers/holds/deadlines and internal causation are included as applicable.
- **ChoiceCapsuleRef**: immutable **admitted** interaction/intent data for the visible choices at that boundary, or null. It identifies what choice selection means and what policy/capability/state fence must be checked; it must not point exclusively to a live parent generation.
- **CreativeConfigRef**: versioned Story Prompt/effective Storyteller profile/core, writing-skill and relevant source-world/rule pins. Historical artistic voice is not the same thing as current account/billing permissions.
- **PassageRef and lineage**: exact rendered scene and intended position in story history, causal parent boundary, relevant publication operation and source-version evidence.

A single small **SceneCommit** object/SQL selector binds these immutable roots. Its content may be a typed envelope, but **nothing requires copying the Library, execution rows or entire model context**. Scene sequences and Library revisions remain independently versioned.

A scene's **meaning** is the state *after* that passage and its effects, grants, options and selected notes were admitted, before any subsequent causal event. Do not produce a checkpoint from pre-transaction state and then append post-transaction continuity notes behind its back. Instead:
1. Freeze current source roots/revisions and task delivery (provider settled or scripted).
2. Compute a deterministic **CompletePostState** by applying all proposed authorized changes in a pure/validated projection, including Storyteller notes, mechanics effects, offers, activity state, updated scene scope and source root.
3. Stage immutable Library changes and candidate state/choice objects outside SQL; don't call the provider or filesystem during the locked transaction.
4. Inside SQL, recheck current root/revision/active event frontier, owner, accepted cost/attempt and relevant pending contracts, and **verify this projection equals the state the transaction will commit**. Either select *all* matching pointers/rows, or reject/hold. No fallback to different current state.
5. Commit passage, LibraryRoot, StateRoot/selector, ChoiceCapsule, configuration pins, state events and idempotency/outbox decisions in the same authority transaction. Acknowledgement loss returns this exact commit without recomposition/rebilling.

A model response is **never the authoritative state object**. It supplies bounded narrative and proposed changes; deterministic application code validates and constructs authoritative state.

## Scene history vs mechanical event history

A story may have more **state transitions** than published passages. Example: scene 37 commits with an ongoing journey, then after ten fictional minutes an admitted activity crosses a boundary, but the next passage is not yet published.

We therefore need a monotonically ordered **world-state/event frontier** (e.g., `stateCommitId` or causal sequence) independent of passage `sceneSequence`. Every state-affecting transition must be reconstructable or explicitly declared nonhistorical while its capabilities are still limited.

- **At scene 37:** its SceneCommit pins the state frontier at its own publication moment, not the frontier a day later when viewed.
- **After scene 37:** an activity/obligation update produces a separate committed state event. It does not retroactively rewrite scene 37. Later scene 38 pins the newer state frontier plus its own newly admitted changes.
- **Fork from scene 37:** use exactly scene-37 StateRoot and LibraryRoot. No world event after that root is implicitly inherited.
- **Review:** can be read-only even if the selected frontier is not fully resumable; missing required pieces must be surfaced as `checkpoint-unavailable` or `fork-unsupported`, not replaced by current state.

We must choose a state-storage representation *after measuring actual size*: bounded full immutable snapshots may be sufficient for early campaigns; a persistent typed state tree or **periodic checkpoint plus strictly bounded causal deltas** may be justified for large worlds. No unbounded replay from scene 1 and no copying every DB row on every passage.

## Forkable active work: preserve **meaning**, not worker machinery

An active situation comprises different ownership classes. Partition them before designing any serialization:

| At scene boundary | Copy/rebind into fork? | Reason / rule |
| --- | --- | --- |
| Accepted setting facts, inventory, capabilities, location, established relationships | **Yes**, from exact historical state/root | Stable fictional reality |
| Published choices and hidden admitted intentions | **Yes**, via immutable ChoiceCapsule and new branch-local interaction/operation IDs | A visible choice must remain meaningful and executable |
| Accepted in-progress fictional journey/action | **Potentially yes**, as a semantic plan, settled progress and remaining work | Fork should continue from exact fictional frontier, not from a parent's worker |
| Scheduled world obligation | **Potentially yes**, if pure and branch-rehomeable; remap IDs and preserve due-game-time/intended consequence | Do not automatically fire it again; enforce branch-specific idempotency |
| Decision offer or deadline | **Potentially yes**, with stable options and preserved *remaining allowance* under a declared reanchor rule | Absolute parent wall-clock `dueAt` is not a portable forked deadline |
| Holds, interruption controls, authorized pauses | **Yes where modelled**, with exact reason/control revision and required remap | “Held” must not become “running” by default |
| Mechanical RNG/roll/outcome already settled | **Inherit the established outcome**, not reroll | Fork starts from committed outcome |
| Unsettled roll or pending external side effect | **Do not run/copy blindly**; only reinitialize if a pure, explicitly rehomeable intent is defined | Original operation custody and billing are parent-owned |
| Provider attempts, billing grants, leases, retries, outbox deliveries, Temporal execution history | **No** | Operational identity cannot leak across branches |
| Private notes that existed at the historical boundary | **Yes**, under Storyteller-private visibility/provenance | Later parent/sibling secrets must not leak |

**Do not promise immediate universal active-work forks.** First codify a `Forkability` decision per state component: `portable`, `rehomeable-with-contract`, `unsupported`. Unknown or partially settled work is a reason to hold/reject the fork, not to quietly erase it.

### Rehoming principle

Create a deterministic, pure **ForkPlan** from the immutable historical SceneCommit. It defines:
- new branch/story identity, parent scene/root proof;
- stable inherited document identities and content hashes (unchanged);
- mappings for story-scoped passage/interaction/offer/activity/obligation IDs when referenced;
- frozen fictional `gameSecond` and fractional clock remainder;
- supported branch-local semantic obligations/activity progress/deadline remaining amounts;
- an explicit list of **new branch-owned scheduling intents**, not a request to copy old worker jobs.

Then stage any new branch-specific state objects and commit the branch selectors + remapped SQL projections + an outbox intent **atomically and idempotently**. Only after commit may executors schedule new branch-owned work, under fresh branch policy and grant checks.

The parent carries on independently. Forking alone performs no provider inference, no rewards, no external effects and no game-time advancement. If forkable choices are waiting, the branch may offer them without invoking the Storyteller again.

### Wall time and fictional time

`gameSecond` is frozen from the selected historical boundary. At fork creation, a fresh **branch clock anchor** may be established for admitted ongoing actions; the parent's elapsed wall time is *not* inherited. For a finite journey, preserve settled progress plus remaining **fictional** duration and fractional remainder; any new real deadline is derived from the branch's captured pace and a declared reanchor policy.

Be careful: some decisions are expressed in **real wall-clock** response windows, not fictional durations. For those, decide whether the fork grants a fresh window equal to the remaining allowance *as of the checkpoint*, a full new window, or makes that category unsupported. Do not silently copy an expired absolute timestamp.

**First opening exception:** publication of an idle first scene alone must not schedule a running action. Existing `projectCampaignClock` already requires an admitted active action/activity for advancement; preserve that gate. After the player *has* committed an action, genuine offscreen progress must continue by policy even if their browser is closed. Do not require a “scene viewed” acknowledgement for all subsequent autonomous actions.

## Playable ChoiceCapsule contract

Current generated intentions can be recoverable only through the prior source generation row. After forking, clearing `sourceGenerationId` correctly prevents duplicating paid accounting but can break ordinary choice admission.

Propose a **branch-independent immutable ChoiceCapsule** created at original scene publication, containing:
- exact public option IDs/labels and admissible **private intentions** or action-plan descriptors, with schema/version and source evidence;
- supported mechanical action boundaries or narrative intention semantics and relevant world/rule capability pins;
- exact `contentHash`, original source/passage provenance and version;
- **no new provider usage identity** and no privileged execution grant.

On fork, create a branch-local interaction ID and an alias/mapping to the **same capsule**. On choice, the game authority checks the new branch's current scene/state/root and permitted option, then admits a *new* branch-owned action resolution operation. No reuse of parent generation as billing evidence. A capsule can be copied by reference when it has no branch-local dependencies; if it names parent-specific operations/resources, it needs a validated remap or the scene remains not forkable.

**This is an internal persistence contract**, not a new UI form. A hidden creative suggestion is not a mechanical capability.

## Migration rule

Do not rewrite v1 scene checkpoint hashes or reinterpret their contents as v2. Keep a v1 historical reader/fork path for the already supported quiescent subset. V2 scenes have explicit state/choice/composition pins. A v1 scene missing active work is not automatically promoted to a full forkable state by reading today's live rows. No ancestry-based model "reconstruction" may invent old events.

The shared Library DAG, v2 historical state and v2 choice capsule can be introduced **behind versioned interfaces** in separate bounded workstreams. But the runtime must not advertise **every scene forkable** until all three work together at admission.

## Design decisions still open

1. Exact state representation: full snapshots initially vs persistent typed state nodes vs bounded deltas with checkpoints; measure.
2. Which active-work families have pure remapping semantics and which must explicitly stay unsupported?
3. Which real-time deadlines should restart, resume with remaining allowance or stay nonforkable?
4. Should every passage have one SceneCommit even if it has no mechanical checkpoint? Prefer yes, with explicit `reviewable`/forkability reason while rollout is incomplete.
5. Whether profile/skills/live creative settings are adopted at specific scene/event boundaries and how account preferences differ from fictional world context.
6. How the SceneCommit pins source text and ChoiceCapsule without circular hashes or leaking private intentions into the player's Library export.

**Working decision:** separate **creative Library**, **typed world-state frontier**, **playable intent capsule**, and **branch/operation custody**, while binding their exact committed versions under one authoritative scene selector. Do not duplicate entire documents or operational tables per scene.
