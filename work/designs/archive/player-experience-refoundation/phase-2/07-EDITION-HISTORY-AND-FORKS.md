# Living Journal | History, finished volumes and alternate continuities

**State:** OPEN DESIGN / no implementable player-fork expansion. Source anchors: `docs/product/foundations/concepts.md`, `docs/product/experience/return-and-journal.md`, `docs/technical/engine/lifecycle-and-compatibility.md`, `work/designs/open/player-replay/`, `packages/application/src/stories/forks.ts` from lean snapshot `9e821c6e15bb`.

## 1. The Journal is the accumulated edition, not a fixed PDF

A story can have many published passages over months. The **book-like reading experience** is a visual projection over that ordered, source-linked history. A single passage can take several scroll lengths; several passages from one continuous scene may appear in a related visual spread. **No mandatory chapters** or dramatic-act boundaries are introduced.

Conceptual object hierarchy:

- **Story / volume:** one persistent life, with one story ID and optional lineage.
- **Current leaf:** Now, showing the latest verified published narrative and current action/hold.
- **Published leaf:** one or more exact historical source passages represented in a readable visual composition.
- **Editorial moment:** a derived index node, 1:N passage refs, never a canonical scene or chapter.
- **Embedded in-world document:** a letter, field journal, epitaph, ship log or other actual content *inside* a passage.
- **Branch / fork:** a new first-class story identity starting from an exact independently reconstructable committed checkpoint; not a revised historical passage.
- **Volume ending:** an authoritative lifecycle terminal/finished condition, not a model-generated theatrical last line by itself.

The metaphor of a page is about **reading continuity and history**, not physical paper or a book object that every fictional character must possess.

## 2. Now and Journal as one artifact seen in two tenses

**Now:** the writable edge of the edition. “Writable” does **not** mean the player can freely edit prose; it means the engine can append new *published* passages and admit genuine future intentions. The page may adapt its ambience when the saved scene changes, but is never styled as if a pending outcome had already happened.

**Journal:** the archival edge. It reads the exact saved historical text. Choices shown in context are inert/source-linked. It may show source-linked gists, index headings, bookmarks and material marks that were retained/validly projected, but derived summaries must be visually distinguished from original words.

**Return:** do not dump twenty new large pages between the player and the current choice. Offer a source-bounded short “since you were last here” prelude, then Now. The Journal remains the place to browse everything in depth.

**Time:** publication sequence is the primary reader order. If a later report addresses an earlier fictional time, keep source order and label any second chronology correctly. Never turn it into a chapter reorder.

## 3. What happens to the visual treatment after publication?

The owner's diary analogy raises a new product decision: **will the saved passage retain its authored page material and marks?** The leading design position is **yes, when the directive is part of the published edition**.

Recommended model (proposal):
1. Store original prose unchanged with immutable identity and sequence.
2. Persist any *validated, identity-matched* page/narrative score as separately versioned publication-associated appearance data or referencable source artifact.
3. A Journal renderer may reinterpret presentation under modern accessibility/renderer revisions but must not *invent a supposedly original historic stain*, illustration or emphasis.
4. Late enrichment is allowed only with transparent provenance/coverage and explicit “derived later” semantics. It cannot be passed off as the original look of the diary.
5. Missing old asset/retired renderer must fall back to original readable prose, not a permanent unreadable broken book.

**Why retain page direction?** In a long history, the changing condition of the *edition* is itself part of what makes rereading emotionally meaningful. If each opening randomizes the page appearance based on today's scene, the archive's visual memory is unreliable.

**Why not freeze screenshots?** Text must remain selectable, responsive, localizable and accessible. Preserved *semantic instructions and asset lineage* should be enough to produce a faithful readable projection without pinning 2026 browser pixels forever.

## 4. Closed volumes: the Moria reference without manufacturing endings

Imagine an in-fiction expedition whose last recorded publication is a frantic passage near a tomb. The preceding documents become increasingly worn only as the published situation or authorized page direction warrants it. A smudge or frantic headline is *display*, not evidence of damage by itself.

Two very different realities must be distinguished:

- **Definitively ended story:** authoritative state says the character/continuity ended. The edition's last passage is marked as a final surviving publication, history remains browseable, and no ongoing-choice controls appear. A closing cover/colophon is editorial and must never invent the story's cause of ending.
- **Open but silent/blocked story:** no new offer, generation failed, user is absent, or a world process is paused. The Journal is *not finished*. A dramatic passage is not proof of terminal state. Do not put “THE END” on a blocked continuation.

The product intentionally does not require a finite narrative conclusion. A decades-long mundane life can remain open.

### Closed volume visual affordances

A visibly finite publication sequence, a short factual end-status label, an optional editorial ending page and an unmistakable distinction between historical reading vs new action. Do not show a "continue story" button if the lifecycle forbids it. A future fork CTA, where eligible, would be a **new continuity**, not an undo button.

## 5. Forking: family tree, not time travel

The user proposes opening any past point and asking **“What if I had chosen differently?”** This is an excellent long-term Journal affordance, but the domain contract is precise:

> A fork creates a separate first-class story from an exact **committed and reconstructable** historical position. It has its own future, own billing/usage and its own source-of-origin lineage. Nothing in the original story is rewritten.

A canonical passage, a derived scene grouping and an available fork checkpoint are not equivalent. Forkability can be shown only if the engine proves *all requisite committed state* at that exact position is recoverable, including items, obligations, rules/settings, active timers, participants, hidden but authorized engine state and valid offer/action identities.

A historical choice can be branched on only when that *pre-choice* committed state plus the original offered alternative is reconstructable. Showing a historical dialogue option in inert Journal mode does **not** make it replayable. Fork selection must be explicitly confirmed and, if expensive, priced/authorized before initiating new Storyteller work.

### Current implementation limitation, source-checked

The current `createStoryForks` implementation in the supplied lean ZIP only admits the first snapshot-complete checkpoint: `source.revision === 1`, with no pending resolution, active obligations, non-initialized mutable campaign state, timed plan or unremappable continuity. It copies the validated first passage with new ID and lineage, and rejects unsupported revisions.

The accepted technical owner explicitly states **arbitrary historical forking is not supported** until revision-scoped complete state snapshots/replayable reconstruction exist. Therefore **do not put functional “Fork from this passage” affordances throughout the historical Journal today**. This doc is a design for a possible future experience.

### Future proposed branch UI

A single original Journal spine can have **branch marks** at verified fork origins. A branch mark is visually secondary while reading. Opening it gives a compact branch sheet:

- Origin: exact source story/passage/sequence and original context.
- New continuity: identity/title, current status and divergence date/position if provable.
- Destination: **open the fork's own Now or Journal**, not jump within the source as if all branches share one clock.
- Navigable ancestry: one parent chain and verified descendants, scoped to authorized stories, no merged canon by default.
- In a future eligible checkpoint: **Explore another possibility** goes to a separate preview/confirmation and new-story operation, never submits a past choice into the original story.

A reader could see two lineages after an old choice without implying either supersedes the other. Their shared ancestry is provenance, not a runtime sync or a claim that one alternate history is more “true”.

## 6. Fork eligibility states and their honest copy

| Actual engine condition | Journal affordance |
| --- | --- |
| Historic passage lacks a complete revision-scoped state snapshot | No fork action; optional unobtrusive explanation in future feature documentation |
| Historic passage has a valid state snapshot but no eligible pre-choice offer | May branch at a checkpoint into a new story if authorized; not “choose a different past answer” |
| Exact pre-choice committed checkpoint and alternative offer reconstructable | Can propose a new continuity with explicit separate identity, offer and cost disclosure |
| Original story ended | Journal still readable; fork may be possible from eligible earlier checkpoint as a new story |
| Original story deleted, permission revoked or hidden participant data | No unauthorized branch creation or leaked chronology |
| Fork already exists | Browse independent lineage; no canonical merging implied |

If the engine cannot verify pre-choice admissibility, it must not fake it through prompting. “Ask the Storyteller to imagine what if...” could be a different **noncanonical fiction exercise**, but it is not a committed fork.

## 7. Visual lineage without book spaghetti

Avoid giant automated flowcharts on the main reader. The baseline Journal remains chronological and literary. On-demand lineage exploration can be a **family-tree/branch-map view** rooted in verified edges. Each branch is itself a readable volume. A source passage can be referenced by branch origin without being retroactively edited into a branching choose-your-own-adventure screen.

Mobile lineage: a stacked ancestor → divergence → branch navigation, not a hairball graph with tiny unclickable branches. Keyboard and screen-reader lineage is navigable as a normal list/tree of relationships; never relies only on colors or animated lines.

## 8. Stress-test scenarios

- **Moria-like ended volume:** last source states a terminal event; marks/visual deterioration are source-appropriate, history can be read and searched; no pending choice.
- **False dramatic finale:** last passage says “we are doomed,” but engine does not mark ended. The book stays open; a bad ending effect cannot declare lifecycle truth.
- **Two forks from one early choice:** each has independent future; source and both branches remain identifiable; parent never receives fork's events.
- **Fork at #500 without snapshots:** unavailable for now despite visible original passage #500; no attempted LLM reconstruction.
- **World with no time units:** no invented timestamp or mandatory chapter header, yet lineage works by passage identity/sequence.
- **Long conversation:** eight passages from one encounter are not eight chapters; a fork origin is a committed position, not a theatrical line break.
- **Private shared history (future):** a fork actor can only copy data/permissions that the engine has expressly authorized and can reconstruct safely.

## 9. Decisions deferred to later product/technical design

1. Define authoritative **story terminal state** and whether a completed campaign can receive supplementary historical reports without altering the final narrative order.
2. Specify which appearance directives are retained at publication, how a renderer version reprojects older pages, and how derived enrichment is labeled.
3. Determine exact checkpoint/snapshot granularity and source lineage retention needed before any historical fork UI exists.
4. Decide whether a new fork inherits its parent artistic signature, offers a new direction, or inherits and allows later drift. It must never silently recolor the source history.
5. Define branch discovery and account-level sharing/privacy, especially for future collaborative campaigns.

**Verdict:** a living volume that can eventually branch is a compelling product model, but “all past scenes are forkable” is a *long-term desired state*, not an assertion of current engine capability. Preserve this distinction until technical proofs exist.
