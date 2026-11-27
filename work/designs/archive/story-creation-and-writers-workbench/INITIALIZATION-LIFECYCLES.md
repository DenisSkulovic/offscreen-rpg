# Opening lifecycle options | preparation is a mission, not a wizard

**Status:** exploratory architecture, 2026-11-20; source-inspected at `09d5820bcafe`; **not an implementation specification**. This document continues [FILE-FIRST-LIBRARY-REVIEW](FILE-FIRST-LIBRARY-REVIEW.md) and [DESIGN-NOTES](DESIGN-NOTES.md).

## Main architectural hypothesis

One **player-level Launch** should have a durable identity and a reproducible final outcome. Internally, the harness may perform deterministic preparation, an optional agentic Workdesk-preparation mission, and an opening-composition mission. The number of model rounds is *not* part of the player-visible contract.

**The chosen structure must support both:**
- Pressing **Play** on a fully authored preset, perhaps with `START.md`, `STORY_PROMPT.md`, `STORYTELLER_PROFILE.md`, world and rule roots and prewritten canonical source documents.
- Typing `bah` (or a long prompt about a galaxy), with **no preset, character, name, mandatory world model or mandatory plot**.

Never require human review of profile/character/scene configuration as the normal route. Failure/recovery may require an explicit retry/consent action but not a four-page form.

## Current implementation (observed, not the proposed target)

The existing UX collects draft fields and profile selection. The opening task is requested separately; the player reviews the generated opening, and **Start** initializes the campaign and stages its initial document manifest. `packages/application/src/storyteller/openings.ts`, `packages/application/src/stories/start.ts`, and `packages/application/src/stories/passage-documents.ts` are the important source seams. `packages/documents/src/start-instantiation.ts` is the already-existing reusable bundle import/clone boundary.

A package library can be **read as bounded source context** during opening. A campaign-owned canonical bootstrap does not yet exist as a writable, durable, pre-first-scene Workdesk. Do not conflate source-package import with creating campaign canon.

## Candidate A: one model composition with proposed setup files

```text
Play/custom prompt
    |
    v
Capture Launch ID + source/prompt/profile pins + typed policies + budget
    |
    v
Deterministic read-only Library assembly (source bundle, original prompt,
START orientation, effective profile, optional exact necessary documents)
    |
    v
One Storyteller opening task
    |  - composes opening and options
    |  - optionally returns a few proposed descriptive/private documents
    v
Validate all proposals, supported mechanics, first passage and sources
    |
    v
Atomic Game Authority activation: admitted root + passage + valid
first-scene checkpoint/selector + playable state + operation receipt
```

**Strengths:** one potentially paid round, no mandatory planning latency, strong fit for authored presets, minimal lifecycle complexity. **Weakness:** the model cannot revisit newly prepared draft files in another inference before writing the opening; custom complicated prompts might produce underdeveloped settings. Also potentially overly large output if it authors too many documents alongside a scene.

## Candidate B: explicit Workdesk-preparation mission

```text
Play/custom prompt
    |
    v
Capture one Launch operation and immutable initiating inputs
    |
    v
Deterministic seed Workdesk from pinned original prompt and preset bundle
    |
    v
Storyteller mission: prepare the writer's workbench
    |  - orient/read selected source documents
    |  - propose minimal new private and descriptive files
    |  - decline additional preparation if source bundle is sufficient
    v
Validate and stage PRE-PLAY document draft (not yet public scene canon)
    |
    v
Storyteller mission: compose first playable situation
    |  - receives pinned stage/root plus automatically injected core guidance
    |  - can inspect a few relevant prepared files
    v
Validate and atomically activate first scene + checkpoint + admitted root
```

**Strengths:** explicit second creative pass may improve consistency for difficult custom worlds, supports writer's desk analogy, creates reusable small initial material. **Weakness:** extra model cost, orchestration and potential self-inflicted delay; stage semantics, abandonment, retries and source visibility require new contracts. A preset that already includes everything should not be forced to repopulate a workbench.

Do not assume "two missions" means two isolated model APIs. It might be two task rounds within one durable operation, but tool/status accounting must still recognize paid attempts and return partial states exactly.

## Candidate C: conditional bounded preparation

The harness may choose A for an already sufficient package and B for a custom high-complexity request. This is **not** selected. A model deciding "I need more tokens" is not a spending authorization. Criteria must be deterministic or policy-authorized, measured, and recoverable; conditionality itself increases test combinations and operational complexity.

## Stage, root, and visibility questions

The pre-first-scene Workdesk must **not** be confused with a committed, forkable scene:

- The immutable authored **source package** can be read but not mutated.
- The exact accepted **player prompt** should be persisted with immutable provenance before the paid operation.
- **Pre-play staged drafts** may need private visibility, expiration and a durable operation/manifest identity. They are not automatically admitted fiction. A workdesk draft can contain uncommitted ideas.
- A **prepared start library** may have admitted initial canon material without any player passage yet, but such a root needs an explicit lifecycle/status and must not impersonate a scene checkpoint.
- A **playable committed first scene** binds the accepted passage, checkpoint and canon root under Game Authority publication. The same launch retry must never create two first scenes, double-schedule obligations, or bill another provider call after a captured delivery.

Two plausible storage designs require discrimination:
1. **Operation-local staging**: freeze source pins, store candidate document revisions and manifest under the Launch, invisible to normal gameplay until first-scene commit. This is my *initial preferred research hypothesis* because it avoids premature public canon.
2. **Campaign-owned pre-play root**: create an admitted but inactive campaign document manifest before the opening, then advance it during publication. This may make separate prep cleaner but introduces more fork/read/race semantics.

Neither is approved. Compare them specifically against existing `story_scene_checkpoint` and root publication contracts, including the known absence of a checkpoint at some mechanical starts. The post-Start root must not be published in a different order from the accepted mechanical state.

## Required trace: authored preset

1. Player presses Play on a fully authored prepared experience.
2. Capture package root/revision, exact world/rule pins, original preset prompt, effective creative guidance, typed time/spending rules, initiating operation ID and player ownership.
3. Validate that the package already has the required orientation and material; do **not** spend a setup round solely to rediscover the profile or reorganize correctly authored documents.
4. Freeze small automatic inputs: selected `START.md` orientation, prompt, bounded profile core, and exact required mechanical/current facts.
5. Create the opening; optionally use narrow retrieval if a genuine evidence question arises.
6. Game Authority validates the opening, permitted document proposals, supported offers and first-checkpoint/root consistency. Activate once.
7. Player receives the opening immediately after generation completes, with ordinary progress/failure UI during actual work.

**Open:** how does the authored profile document override/extend the application default? How are author and player edits kept distinct? What if creative guidance conflicts with source-world invention ceilings?

## Required trace: arbitrary custom input

1. Player supplies `bah` or a galaxy prompt and presses Play.
2. Preserve the exact text as one pinned creative-intent source. A blank prompt may still be a separate product decision; one non-empty word is valid.
3. Resolve minimal defaults for model route/creative stance/clock without mandatory user forms; distinguish narrative rhythm from mechanical clock.
4. Without an authored package, create the minimal orientation and potentially a private direction. **No automatic human character, HP, backpack, map, tavern or quest.**
5. Candidate A simply opens the situation while proposing useful files; candidate B first organizes a small Workdesk, then composes from it.
6. Publish the first playable situation with a valid generic or adapted mechanical envelope. If the current engine cannot support the proposed fictional perspective, it must fail honestly or offer an explicitly non-mechanical mode, not silently hallucinate a playable character.
7. A subsequent task reconstructs required knowledge from the committed Library and current exact state, not by replaying the full model history.

**Open:** who is authorized to invent and commit source-independent world facts from `bah`? Does a default profile imply protagonist perspective? Which minimal supported interaction schema admits a galaxy's meaningful choice?

## Recovery matrix (must become tests before implementation)

| Interruption or race | Required observable behavior |
| --- | --- |
| Launch accepted; no model dispatched | Resume same launch or cancel without charging; stable input pins |
| Preparation draft staged; process crashes | Restore exact stage/root and next admitted mission, no duplicate writes |
| Provider delivered but response to executor lost | Settle from captured delivery; no automatic second paid call |
| Model made invalid document proposals | No canon admission; repair only within separately admitted resource allowance |
| Model completed opening; DB commit fails | Retriable publication under same source hashes and operation ID, without re-generation |
| Concurrent player edits the prompt after Play | Original launch uses captured prompt; new request is a separate version/operation |
| Preset or profile source updated while running | Captured source/profile hashes stay unchanged |
| First scene committed; HTTP response lost | Same Play retry returns same first scene and checkpoint; zero duplicate schedule |
| Preparation abandoned | Staged material is not normal campaign canon; retention/GC rule still needed |
| Historical fork requested from pre-play draft | Reject until supported committed scene boundary exists; no invented checkpoint |

## Quality/cost experiment, not authorization

Use at least three sources: a rich prepared package, `bah`, and the abstract galaxy. Hold creative objectives and source protections constant. Compare A versus B at identical model route, counted rounds/tokens and total maximum budget; report both *actual* expenditure and real quality. If B consumes twice the cost but gives little better opening coherence or continuation usefulness, reject B as the default. A compelling next-turn memory benefit would be strong evidence for B in difficult starts.

Quality rubrics should score not only opening prose but whether the established library is **useful on turn 2 and turn 20** without reading all passages. Check whether the model creates justified notes and distinguishes private possibilities from facts. Do not reward document count or longer text.

## Working recommendation and unresolved decision

The **single user-level Launch** with deterministic preparation is already attractive. For first implementation, begin by comparing A and B in provider-free fixtures and then an explicitly authorized small paid experiment. We should strongly prefer **A by default for well-authored presets**. There is currently insufficient evidence to insist on B for arbitrary prompts.

Next: select the pre-play staging model and exact task/profile/source snapshots, then reconcile product and technical contracts. No Cursor implementation Change is authorized by this draft.
