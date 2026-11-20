# Vision-first target | Offscreen RPG as a living, forkable Writer's Library

**Status:** owner-direction-grounded target design proposal, 2026-11-21. The *experience requirements* restate the owner's conversation; technical mechanisms are **candidates**, not accepted implementation orders. **No code migration, provider spending, or Cursor Change authorized.**

**Read this before legacy-source audits and migration files.** The repository's current v1 prototype, existing JSON shapes, checkpoint exclusions, fixed model-round/read/document limits and four-step wizard are **not design constraints**. They are input to a later gap/migration analysis. This document describes the desired product independent of their existence, then identifies what would disprove the design. It intentionally consolidates prior exploratory ideas instead of adding another namespace of unrelated proposed systems.

## One-sentence product contract

A player supplies an arbitrary Story Prompt, or selects a prepared experience, and enters a **living story written by a capable, persistent-knowledge, tool-using Storyteller**. The Storyteller works with a discoverable, versioned Library, may investigate and delegate contextual questions, and proposes coherent scenes and knowledge changes. The world evolves under an independent authority, and **every published scene is a faithful, reviewable and independently playable fork point**, without copying the entire Library.

## Non-negotiable capabilities (the target, not the v1 implementation)

1. **Simple player entrance:** prepared experience **Play** or **Customize**; custom experience is **one freeform Story Prompt**; no mandatory title, role, character, selected profile, review wizard, rule-package selection or humanoid assumption.
2. **Open-ended fictional perspective:** an ordinary human, galactic consciousness, town, colony, microbe or abstract observer may be the viewpoint. Agency is meaningful *within the declared fiction*; no universal body, HP, money, item or grand quest.
3. **A real writer agent:** each mission may involve Library discovery, multiple reads, comparison of sources, skill consultation, note drafting/revision, and specialized assistant contexts. It can decide what work is appropriate; no fixed ritual or one-shot-only architecture.
4. **Portable creative knowledge:** authored and model-maintained `.md` documents with conventional entrypoints (especially `STORY_PROMPT.md`, `STORYTELLER_PROFILE.md`, orientation), versioned and inspectable. Auxiliary machine metadata may be typed; world knowledge must not be trapped in opaque application rows.
5. **Persistent context without an immortal model session:** every invocation reconstructs what it needs from pinned sources, indexes and prior admitted outputs, not an ever-growing chat transcript or automatic full Library injection.
6. **Git-like historical integrity:** immutable document versions and structurally shared Library roots; each published scene references exactly the Library and private creative state *known then*. Branches diverge from the chosen historical root, not the parent's latest state, and do not duplicate every source file.
7. **Every committed scene forkable by construction:** the corresponding world-state frontier, accepted effects, active fictional plans, choices, clock, and source/profile/rule pins are resumable under a new branch identity. If something cannot be represented faithfully, **the engine must not silently publish an allegedly fully forkable scene**.
8. **Clean model-world authority boundary:** the writer authors permitted fictional facts/proposals and prose; a deterministic authority validates provenance, world capabilities, mechanically meaningful changes and version fences before admission. An LLM-written Markdown sentence cannot grant extra money, clock privileges or external side effects.
9. **Predictable costs and recovery:** exploration and delegation operate within admitted resources. Paid attempts, uncertain delivery and scene publication have durable identity. A crash/retry cannot invent a different result, double-bill, or publish partial canon.
10. **Evidence-led engineering:** the actual success metric is engaging, coherent, flexible fiction across many turns and branches at tolerable latency/cost. Tool counts, file counts, architectural complexity and benchmark asymptotics are not substitutes for story quality.

## Product model and terminology

| Concept | User/writer meaning | What it deliberately isn't |
| --- | --- | --- |
| **Library** | Persistent, navigable, versioned collection of fiction facts, private intentions, published passages, source packages, authorial guidance, and source links. | Not one giant prompt, and not a permission-free POSIX filesystem |
| **Workdesk** | A task's reconstructable research and draft workspace, including its current evidence and provisional patches. | Not world canon merely because it was saved; not an immortal model context |
| **Storyteller** | Principal creative agent, accountable for scene composition, selecting research, integrating evidence and proposing changes. | Not Game Authority, clock service, an all-knowing preloaded context, or a mandatory one-pass API |
| **Writing skill** | Versioned craft procedure/example that aids genre, continuity, pacing, viewpoint or revision; selected when useful. | Not an executable permission grant, universal giant prompt, or substitute for model ability |
| **Research assistant** | Scoped independent subagent with its *own context*, commissioned for a separable investigation or editorial subproblem. | Not a permanent per-NPC mind or a source of authority beyond cited evidence |
| **Scene boundary** | Committed moment with the exact story-relevant Library, world state and choices at that point. | Not just the latest paragraph, current live SQL row, or all future events |
| **Fork** | New independent history from a scene boundary with shared immutable ancestry and newly owned execution identities. | Not cloning all Library files, copying a parent's worker, or replaying every LLM call |

“Canonical” names a **versioned authoritative record for a declared role**, not “every sentence is an objective world fact”. `STORY_PROMPT.md` is canonical *as user intent*. `STORYTELLER_PROFILE.md` is canonical *as creative guidance*. A private plot possibility is canonical as *a recorded private possibility*, not as a proven fact. A published passage may establish a fact or merely record unreliable speech; the Storyteller must maintain that epistemic distinction.

## End-to-end target architecture, without specifying service count

```text
Player Play (preset or verbatim Story Prompt)
        |
        v
Capture exact intent + source package/library pins + current privileges
        |
        v
One authorized Storyteller mission
  - auto-inject small, pinned core orientation / profile / task constraints
  - navigate/search/open specific Library files on demand
  - load focused writer skills and inspect evidence
  - optionally delegate independent bounded research/editorial work
  - stage/reread/revise private Workdesk notes and drafts
  - submit an opening/continuation with proposed document changes and intentions
        |
        v
Game Authority
  - establish source eligibility, fiction/capability rules and operation fences
  - validate and commit *one coherent outcome* (passage, Library, state, choices)
        |
        v
Publish scene + exact historical scene boundary
        |
        +--> future Storyteller mission starts by discovering that rooted Library
        +--> review/fork this boundary without full-file copying or provider replay
```

**No requirement that this be two model calls or ten.** A complete prepared preset may need no setup-thinking, a simple continuation may need one creative inference and two direct reads, while a subtle 200-scene mystery may justify several rounds and two subagents. The system must *support* deep work; it must not charge for theatrical work that adds no value.

The word “operation” denotes a durable admission/custody boundary, not necessarily a new microservice, row-per-note or a new GUI screen.

## The writer's actual capabilities, not just a persona prompt

A Storyteller mission can receive a compact starting guide: active situation, allowed perspective/agency, exact committed Library root, effective profile core, skills/tools catalogue and resource budget. The **Library's inventory may be discovered**; the whole manifest is not a model instruction payload.

The following semantic operations should be available via a clean, provider-independent facade. Names and number of public tool calls are not fixed yet:

- **Orient**: show relevant Library structure and root/revision, including supported scope/visibility and where to look next.
- **Find**: path/prefix search, indexed semantic/lexical lookup and source-backed cross-links. Indexes are optional disposable projections and must never supersede source documents.
- **Inspect**: exact-version read, page/section read, compare versions, inspect differences, and verify attribution/contradictions. A query result is a lead, not a fact until source is examined.
- **Learn technique**: load a suitable versioned writing skill and optional compact example, independently from runtime grants.
- **Investigate in parallel**: commission narrow assistant contexts with exact allowed roots and resources; receive claims, uncertainties and *source handles*, then corroborate. Subagents may use isolated draft worktrees and return proposed edits; they cannot publish unreviewed canon.
- **Draft/revise**: add, revise, discard or compare provisional Markdown in an operation-local Workdesk, without publishing to the story. An assistant's draft can be cherry-picked or rejected by the main writer.
- **Propose**: submit a scene, meaningful options/intentions, claims with appropriate status, document additions/changes and any conditional fictional actions. Authority validates before committing.

Read access follows root and visibility; changed documents are prospective until adopted. **No agent should need to invoke a tool to discover the small essential guidance deliberately injected into its mission.**

### Skills are real but not magical

Skills can contain practical narrative craft: establishing agency, writing nonhuman perspectives, editing dialogue, checking promises and foreshadowing, managing knowledge uncertainty, revising prose, or fitting narrative rhythm to the requested style. A weaker model may benefit from clear recipes and examples.

A skill may mention and teach how to use tools or pair with a trusted granted toolset. The textual skill itself **cannot** install arbitrary tools, open unrelated branches or expand spend/clock/security permissions. Versioned skill content and effective creative guidance must be pinned so historical work can be explained, even though model generation need not be bitwise reproducible.

### Assistants are separable contexts, not pageantry

A parent writer can delegate evidence-heavy, bounded tasks in parallel: reconcile a character's old promise versus later actions; investigate conflicting faction rumors; critique a draft for continuity; develop alternative tonal approaches in isolated scratch. No child is permitted to mutate shared canon directly.

Each child gets a frozen source root, narrow question, visibility scope, separate invocation/cost identity and bounded return. Results are evidential proposals. The parent checks what it uses. We should *support* two independent lines of work in the target, even if the first POC experiments with one child. Do not constrain the end state to an arbitrary legacy `maxReads=6` or `maxRounds=3`.

## Git-like snapshots without Git-the-process

There are **three logically different histories**, even if physical storage eventually combines them:

1. **Content/Library history**: immutable Markdown/document objects, persistent maps/trees that reuse unchanged nodes. Paths are author-friendly; stable document IDs, hashes and source provenance disambiguate renames/divergent revisions.
2. **Fictional world history**: typed capabilities/state, established facts, fictional clock, active plans, offers, obligations, consequences and event frontier, including semantic state that can be rehomed into a fork. The representation may also be persistent; no full table clone per scene.
3. **Scene/branch history**: a durable record points to the exact Library root, exact fictional-state root/frontier, relevant source packages, effective profile/skills, published scene/choices and causal parent. The root selectors are committed consistently under Game Authority.

**A scene snapshot is a coherent set of immutable references, not a new copy of every file or world row.** No physical tree format (B+ tree, HAMT, radix or Git) is selected by this statement. We require efficient exact lookup, directory browsing, small updates, hash-pruned comparisons, root-scoped citations, retention and branch isolation. Benchmarks, including mixed inserts/deletes and real object-store costs, choose the implementation.

### Forkability as a publication invariant

A scene can have active fictional life: a caravan is travelling, a deadline is approaching, the city is under siege. Such **semantic commitments** must be represented in its state snapshot independently of workers, leases and provider attempts. At fork:
- new branch points to the scene's frozen Library and world-state ancestry;
- inherited fictional identities/facts/progress remain stable; branch-local operations/jobs get new ownership;
- the engine deterministically reanchors remaining work and timers under the fork's own granted policy;
- settled fictional outcomes are inherited, not rerolled; unresolved outcomes stay unresolved, not secretly settled from parent future;
- no parent paid attempt, email/external side effect or live scheduler identity is duplicated;
- no parent/sibling future knowledge is available through indexes or private guidance.

**End-state contract:** every **published scene** must carry enough admitted semantic state to allow this. A provisional/partially processed operation is not yet a published scene. The v1 system's unsupported-active-state cases are a migration gap, not an acceptable permanent product limitation. Historical *viewing* does not depend on re-running the writer.

If future fiction connects to irreversible real external effects, define its snapshot semantics explicitly before admitting it. Never promise to reverse real external-world actions by forking narrative state.

### What is, and is not, “the snapshot of everything”

Included: admitted fiction truth and uncertainty, Storyteller-private creative records, exact published scene/choices and their executable intention, world clock/capabilities/resources, active fictional commitments, creative profile/skill/source package versions and causal lineage.

Not included as **forked world state**: live LLM context, hidden chain-of-thought, unsettled billing, paid provider attempt identity, worker leases, current account authorization, unrelated users' Libraries or live parent-side execution. Audit and resource receipts may be retained under a separate operational record, but are not cloned as a new branch's permissions.

A source reference must identify immutable content and authorized historical reachability, not only `documentId + integer revision`, and must avoid a document containing the root hash that recursively contains that document.

## The authority model is not a universal physics validator

In original-world fiction, the Storyteller must be **allowed to invent** and establish new narrative facts within source/creator policy; otherwise an arbitrary `BAH` cannot produce a story. Game Authority cannot mathematically prove all fictional statements are “true”. It can validate permissions, document role/provenance, schema, current source conflicts, state transition rules and version fences, and require a repair/hold on unsupported mechanical effects.

Distinct perspectives may have only observational or conversational agency and no inventory/HP. The engine must support such **narrative-only** interaction without forcing a default fantasy rules package. If a world enables mechanics, their execution is typed/authoritative; prose does not secretly implement them.

## What legacy code may influence, and when

**Phase 1, target independently:** capture experience and semantic invariants in this document, specify worked journeys, define what a scene/Library fork means and what tasks a real writer can perform.

**Phase 2, gap analysis:** list any current component that already satisfies one target capability under evidence (content CAS, exact rooted reads, durable provider attempts, publication fence). Mark other components as **replace, adapt or discard** based on their target fit. Do not smuggle old 256-history traversals, four JSON profiles, 5e character schema, 1–6 read recipe, mandatory rule package or four-step wizard into acceptance criteria.

**Phase 3, targeted implementation slices:** start with a functioning Library-reading, skill-using, Workdesk-drafting writer, then test independent research context and historical fork correctness. Production transport/data shape should be chosen for target correctness, even if this means replacing old code. POC must demonstrate a real agentic workflow and at least one scene snapshot; it need not implement the whole future infrastructure to do so.

No backward compatibility with a broken prototype is worth poisoning the end state. Compatibility only matters where real retained user data, published artifacts or externally depended-on contracts make it necessary.

## Anti-slop checks applied to this target

- If deleting a component leaves the same genuine writer abilities, historical semantics and quality, it was probably unnecessary.
- If a model is forced to produce “five setup docs” before every scene, the Workdesk has become ceremonial.
- If “subagents” share one giant context or merely rephrase the parent prompt, they don't isolate research.
- If tools exist but a complex scene still relies on injected full history, retrieval is not working.
- If “Git-like” means new copies of all Markdown or all engine state every passage, persistence is not structurally shared.
- If every scene references a root but active fictional commitments cannot resume in a fork, it isn't fully forkable.
- If “quality” means only schema-valid prose, we haven't evaluated the product.
- If the new design is driven by a v1 integer limit instead of source-grounded writer behavior, we're solving the wrong problem.

**Next:** evaluate [target journeys](VISION-FIRST-TRACES-AND-TESTS.md). Then reconcile genuine design decisions in product/technical owners. This dossier is a staging area for discussion, not a source of approved executable Change instructions.
