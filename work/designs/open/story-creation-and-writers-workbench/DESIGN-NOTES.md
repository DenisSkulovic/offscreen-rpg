# Design notes | prompt, bundled guidance, and workbench preparation

**Status:** exploratory design, not an implementation order. **Captured:** 2026-11-20, including the owner's follow-up brainstorming that arrived while the first audit was being written.

## The player-facing contract to investigate

### Prepared experience

A visible prepared card offers **Play** (primary) and **Customize** (secondary). **Play** uses a version-pinned authored bundle: a Story Prompt or premise, optional world/rule references, optional authored starter records, and optional creative guidance. It should take the player into a recoverable launch and then the first playable situation, without title/name/circumstances/profile/review forms. A prepared route is not a promise that a copyrighted development fixture is publishable.

**Customize** shows one editor containing editable prompt text and additive assistive pills. Changes to prompt text do **not** mutate the immutable authored package. A contradiction with fixed packaged facts/permissions must be handled explicitly, not quietly resolved by a model.

### Custom experience

There is one **Story Prompt** textarea. A single word like `bah` is a valid creative request; a large prompt is valid within bounded transport/storage limits and should fail visibly, not silently truncate. The prompt may describe a galaxy, collective, microbe, corporation, town, civilization, person, or nothing actor-like. No separate title, character, race, inventory or quest is required. Titles and other presentation metadata can be derived later if useful.

Chips may insert editable snippets about adventure, quietness, humor, pace or perspective. They are *text editing aids*, not secretly binding mechanical switches. Typed safety, funding, real-time scheduling, source invention ceilings, ownership and resource limits remain governed by separate policies and may be resolved deterministically without exposing a form.

**Default experience:** low friction and meaningful immediate decisions; avoid surprising first-use wall-clock waits. Specify the real-time policy separately from dramatic tempo and evaluate the cost/identity of `instant` versus bounded rate-based progression.

## The user's “sharpen the pencil” hypothesis

Think of the Storyteller as receiving a **mission** and opening its writer's desk:

- The initiating request may contain only `bah`, or many pages of user-supplied creative direction.
- A prepared experience may provide several *prewritten* canonical documents, including a human-readable `STORYTELLER_PROFILE.md` classified as **creative guidance**.
- The first invocation might be a bounded **workbench preparation** mission. It decides what small amount of initial orientation, identity, threads, constraints or private possibilities is useful. It need not invent a plot outline.
- A later **opening composition** invocation reads the prepared workspace and produces the first scene and appropriate available interactions.
- Subsequent calls use the pinned committed library selectively, not the full concatenated history.

This is **not yet a decision to invoke the model twice**. The mission may use one structured response that includes preparation proposals and a scene, or a staged preparation operation whose extra model call is admitted only when justified.

## A canonical profile is not a mechanical superuser

Proposed authored content path: `STORYTELLER_PROFILE.md` in a start bundle. Existing document kind `creative-guidance` can represent the content; the exact filename is a discoverable authoring convention, **not** currently recognized by the runtime.

For effective use, an explicit **profile compiler/resolver** should:
1. Choose the applicable versioned material from package, accepted player direction, defaults and any later settings revision under declared precedence.
2. Read a bounded required core **automatically** when a task is admitted, not charge a model tool round merely to find its basic voice.
3. Capture exact source document ID/revision/hash (and any compiled effective guidance) with the task. Replaying the task after edits must not change its instructions.
4. Keep distinct *creative behavior* from mechanical rules, clock pacing, tool grants, provider route, account budget, secrets, and canon-invention permission.
5. State which profile portions are always-injected vs task-specific vs on-demand examples, so a 20-page profile cannot monopolize the context window.
6. Treat descriptive creativity and advice as guidance, not executable commands or source-authenticated claims of world fact.

“Canonical file” means authoritative for its **declared responsibility**. A canonical creative-guidance file does not become a fact that an emperor is immortal. A private possibility is not a settled event. A player's prompt is authoritative user intent, not automatic license to contradict a pinned world.

Do not flatten every instruction into a single precedence-ambiguous blob. The UI can remain one field while the backend captures the distinct authorities and their origins.

## Candidate internal launch architectures

| Candidate | How it works | Advantage | Risk |
| --- | --- | --- | --- |
| **A. Single opening with preparation proposals** | One admitted task receives frozen prompt, pinned bundle and essential context; returns a scene plus bounded proposed initial documents. Game Authority validates and atomically publishes them with the first scene. | One model round may be cheap, few new lifecycle states. | The model composes without inspecting its own newly developed notes in a later round. A complex custom world may be shallow. |
| **B. Separate preparatory Storyteller operation** | A durable pre-opening mission proposes a small library; after validated staging, a second task sees that library and composes the scene. Final activation binds both under one legal first-scene consistency boundary. | Real distinct planning/authoring cycle and inspectable workbench; complex starts may benefit. | Extra cost, latency, retry and intermediate-root semantics, plus potential overplanning and premature fiction commitments. |
| **C. Conditional preparation within one bounded launch** | Deterministic criteria select A or B, and/or an admitted agent loop can request limited context/preparation before final composition. | Potentially adaptive quality/cost tradeoff. | Complex policy; hard-to-debug variability; risks using model judgment to spend more money without clear evidence. |

**Current preference for investigation:** keep a **single durable player-level launch operation** regardless of internal rounds. Compare A and B with fixtures/evidence before considering adaptive C. No mandatory setup call or separate user-visible setup step is selected.

### Critical unsolved question: where does the initial library live?

In today's flow, candidate generation precedes Start, and starter campaign documents are staged at Start. A pre-scene writer's workspace needs an explicit **pre-publication state**:

- It might be immutable **staged artifacts** associated with the launch, not yet an admitted campaign canon root.
- Or the application might create a **pre-play campaign-owned manifest** that contains user intent and authored start material, but with fiction time stopped and no scene committed.
- In either case, Game Authority must validate ownership, root/version fences, visibility and provenance before any document becomes available as effective story knowledge. A failed/abandoned launch cannot appear as a playable campaign.
- Avoid exposing a forkable committed-scene root before a scene/checkpoint pair exists; the semantics of a pre-play workspace should be different from a published scene.
- A successful opening must publish admitted scene/checkpoint/root coherently, without double-initializing package documents or allowing a replay to apply setup twice.

A useful candidate is to preserve the **unmodified authored source package + original player prompt** as immutable frozen inputs, stage proposed campaign-owned preparation against a separate operation-local draft root, and publish only the admitted final root. But this is an option requiring collision, locking, restart and ownership analysis, **not a ratified storage design**.

## What is worth preparing?

Prepare the *minimum useful stable material*, not an encyclopedia. A good operation may identify perspective, setting constraints, immediate situation and one or two pressures. It may leave vague history, unnamed people and optional future arcs deliberately unresolved.

Avoid confusing:
- **Fiction already true** vs **possible future directions**.
- **Player intent** vs **Storyteller interpretation**.
- **A scene/passage** vs **a checkpoint** vs **a private note**.
- **A background lore document** vs **mechanically executable state/obligation**.
- **Dramatic rhythm (“quick, surprising scenes”)** vs **clock rate (“three fictional hours pass in one minute”)**.

No universally required character sheet, map, plot board, inventory, calendar or economic model. The story about a galaxy is a first-class test of this principle.

## Limits on autonomous tool behavior

Automatic context floor: the frozen prompt, pinned effective creative guidance, relevant source-package orientation/permissions and admitted current state. Optional reads then proceed through bounded catalogue/search/exact-section operations. Navigation hints should be cheap and index-backed; no arbitrary shell, SQL, bucket browsing or unseen cross-campaign source.

Treat writes as **validated proposals**, potentially batched by the executor into one revision-fenced manifest transaction, not as an LLM directly editing a mounted filesystem. Bundle reads can be grouped deterministically when the exact requested handles are known. Each provider or tool round has explicit quotas and evidence. The Storyteller may choose to do **no preparation edits** if the starting package already provides what it needs.

## Exclusions and design cautions

- No “one agent per character”, mandatory global plot plan or forced narrative arc.
- No automatic adoption of model-generated chronology as established history without admission.
- No transmutation of prompt snippets into account spend authority, speed commands or world-rule grants.
- No automatic paid live trial based on these documents.
- No new mandatory wizard under the disguise of “advanced launch configuration”.
