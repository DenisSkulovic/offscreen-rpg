# Offscreen RPG: The Storyteller Refoundation

**Semi-technical design whitepaper | November 21, 2026**

**Status:** Proposed for owner review. Not approved or handed to Cursor for execution.

## Executive summary

We are redesigning Offscreen RPG around three central ideas:

1. **A genuine AI Storyteller**, capable of researching, planning, delegating work, writing, revising and maintaining long-term knowledge.
2. **A versioned Writer's Library**, containing Markdown documents, fictional facts, private creative material, past scenes and source references. It behaves conceptually like a Git repository, supporting efficient history and branching without repeatedly copying everything.
3. **A living, forkable world**, where each published scene captures the precise state of the fiction, including ongoing events, so the player can revisit that moment or create an independent future.

The player-facing experience should remain extremely simple. The complexity belongs behind the curtain.

This is **not** intended to become a conventional chatbot wrapped in a game interface. Nor is it intended to become an elaborate Dungeons & Dragons simulator that only works for humanoid protagonists.

---

## 1. What the player experiences

### Starting a story

There will be two primary ways to begin.

**A. Prepared experiences**

The player sees a collection of authored experiences, potentially with extensive prewritten worlds and narrative material.

Each experience has a primary **Play** action and an optional **Customize** action.

Choosing Play begins the story. The player does not have to fill in their name, occupation, character class, personality, or preferred Storyteller profile.

Customize allows the player to adjust the creative invitation without modifying the original authored package.

**B. Custom stories**

The player receives one large text field: **Story Prompt**.

They can enter a detailed scenario, a philosophical experiment, an unusual world, or simply:

> BAH

The Storyteller is allowed to creatively interpret underspecified prompts and invent original fictional material within the admitted rules.

A story could concern a prisoner arriving in a town, a microscopic organism, an entire galactic consciousness, or an abstract observer watching civilizations develop.

There is no universal requirement for a human protagonist, inventory, health bar, conventional quest or predetermined plot.

### During play

The player experiences a living narrative presented through our evolving book-like interface.

Choices must matter. The world may have ongoing fictional activity, time progression and consequences beyond the immediate prose.

The player can review earlier scenes and eventually **fork the story from any published scene**, creating an alternate timeline.

Crucially, starting and continuing a story should feel natural, not like operating a configuration dashboard.

---

## 2. The Storyteller: an actual working writer

This is the creative heart of the redesign.

Imagine the Storyteller receiving a task:

*The player has returned to an old acquaintance after 200 scenes. Write what happens next.*

Instead of being handed all 200 scenes in an enormous prompt, the Storyteller receives a compact starting context:

- The current situation and player action.
- The exact version of the Library and world state.
- Its creative profile, relevant rules, available tools and spending limits.
- Enough orientation to discover the rest.

It then sits down at its metaphorical writing desk.

### Research and exploration

The Storyteller can inspect the Library's structure, search for relevant subjects, open specific documents and passages, compare historical versions, and trace references.

It may discover that a character made a promise 150 scenes earlier. It can inspect the original conversation rather than trusting an increasingly compressed summary.

If different sources contradict one another, it must distinguish established events from rumors, unreliable testimony and private speculation.

**The Library is not automatically injected into the model's context. It is explored as needed.**

### Writing and revision

The Storyteller has a provisional **Workdesk**.

Here it can prepare Markdown notes, draft creative directions, compare possible approaches, revise material, or discard an idea before publication.

These drafts persist across agent rounds and process interruptions. They are not automatically part of the fictional world's established truth.

Once satisfied, the Storyteller submits its proposed scene, choices and relevant document changes.

### Variable effort

Not every scene deserves an elaborate research mission.

A straightforward conversation might require very little exploration. An intricate political confrontation involving six factions and decades of history might justify substantial investigation.

The system provides the ability to work deeply without mandating unnecessary tool calls.

**The aim is capable artistic judgment, not maximum agent activity.**

---

## 3. Writing skills and research subagents

### Writing skills

The Storyteller can load versioned creative-writing skills when useful.

Examples include dialogue craft, continuity checking, nonhuman perspectives, pacing, worldbuilding, foreshadowing, unreliable narrators and narrative revision.

Skills are primarily compact Markdown instructions with techniques, procedures and possibly examples.

They are not merely decorative prompts. They should guide actual working practices, including how to inspect sources and evaluate a draft.

However, **a skill cannot grant itself system permissions**, access to unauthorized data, additional money or mechanical powers.

### Research subagents

The main Storyteller can assign separate research questions to independent assistant agents.

For example:

One assistant investigates what an old friend genuinely promised.

Another investigates the political situation of the faction that friend belongs to.

The assistants receive their own model contexts and scoped access to the relevant Library snapshot.

They return source-linked findings, contradictions, uncertainties and possibly proposed editorial material.

The main Storyteller integrates their work, verifies important claims and remains responsible for the final scene.

The initial implementation proposes that research assistants cannot directly modify canonical Library content. They may produce isolated proposals for the main Storyteller to adopt.

Subagents are optional and budgeted. They should not become obligatory miniature bureaucracies accompanying every fictional conversation.

---

## 4. The Writer's Library: Git-like knowledge management

This is the foundation for long-term continuity.

### What lives in the Library?

The Library contains versioned, navigable documents that may include:

- Original creative instructions and authored source material.
- Setting information, identities, relationships and ongoing narrative threads.
- Published scenes and historical evidence.
- Storyteller-private plans, hypotheses, possible developments and research.
- Creative guidance, writing skills and document provenance.

Not every story needs every category. We will not generate empty character files, faction documents or world maps just to populate a predefined folder structure.

### Recognizable files

Three conventional entrypoints are proposed:

**`STORY_PROMPT.md`** records the player's accepted original request, preserving the distinction between user intent and invented world facts.

**`STORYTELLER_PROFILE.md`** records versioned creative guidance, voice and writing direction.

**`START.md`** provides orientation to the relevant Library and its contents.

Additional Markdown documents can be freely organized within validated namespaces.

The Storyteller can discover them much as a coding agent discovers source files in a repository.

### Versioning

Every document version is immutable once recorded.

A Library version points to the precise versions of its constituent documents.

Changing one Markdown file creates a new version of that file and updates only the necessary portions of the Library's index.

Unchanged content is shared.

This is the crucial Git-like principle: **we version the structure and its references, not copy the entire folder every time something changes.**

The plan currently proposes a content-addressed, persistent tree structure. More specifically, the implementation packets nominate a compressed radix tree.

That specific algorithm is a technical choice, not an essential product requirement. Its suitability should be verified during implementation.

### Historical access

A Storyteller working at scene 200 can retrieve material from scene 15.

A Storyteller operating in a fork from scene 37 cannot accidentally see information established only in its parent at scene 80.

Search indexes and other retrieval mechanisms must respect those version boundaries.

Private creative knowledge must remain private to the appropriate agent or authorized context.

The notorious existing 256-manifest limit is **not part of this design**. It is a legacy storage restriction, not a meaningful boundary on the size of a fictional history or an agent's exploration.

---

## 5. The Workdesk versus the Library

These serve different purposes.

**The Library** is persistent knowledge that has been admitted into a particular story version.

**The Workdesk** is the Storyteller's provisional workspace while completing a task.

Suppose the Storyteller is considering whether a mysterious stranger might secretly be related to an established character.

It can record that possibility privately, investigate evidence, and revise its theory.

That provisional work is not automatically historical fact.

When the Storyteller submits a scene, the application decides which proposed documents and changes are admissible.

An admitted private possibility can become durable knowledge *as a possibility*, without becoming an established event.

This distinction is essential for supporting genuine creative planning without letting speculation silently rewrite the fictional world's truth.

---

## 6. Game Authority: separating writing from world execution

The Storyteller creates fiction. It does not have unlimited authority over the executable world.

A separate **Game Authority** validates and commits the results.

For instance, the Storyteller may describe a character attempting to steal an object.

If the world uses mechanical inventory rules, the attempt must be evaluated through the appropriate game-state rules. The Storyteller cannot grant the item simply by writing a sentence asserting success.

In more abstract narrative experiences, the engine can permit creative invention and non-mechanical actions without imposing an irrelevant physics or character system.

The division is therefore:

**Storyteller:** narrative composition, creative invention within admitted scope, documentation and proposed actions.

**Game Authority:** accepted state transitions, permissions, provenance, game-time control, source-version consistency and publication.

The authority layer should enforce actual rules rather than pretending to mathematically evaluate the artistic truth of every sentence.

---

## 7. Every scene becomes an exact historical snapshot

This is probably the most technically demanding part.

When scene 37 is published, it must be possible to reconstruct precisely what existed at that moment.

Its historical boundary references:

**The Library version:** established facts, private Storyteller material, past passages and available sources.

**The world-state version:** fictional time, relevant state, resources, accepted events and ongoing activities.

**The creative configuration:** the effective profile, writing guidance, source-world material and rules.

**The scene and choices:** what the player saw, plus the underlying accepted meanings of the available actions.

These are coordinated immutable references, **not one huge duplicated snapshot**.

The proposed rule is that this represents the complete world state *after* the scene was committed.

A later scene or background event cannot retroactively alter it.

### Why this is necessary

A historical scene is more than a paragraph of prose.

If the player was aboard a ship, carrying an object, waiting for an answer and halfway through a journey, all those facts belong to that moment.

A history viewer should show that state accurately.

A fork must be able to continue from it.

---

## 8. Forking stories without cloning the universe

Imagine this scenario.

At scene 37, the player is two hours into a ten-hour voyage.

By scene 80, the ship has arrived. Several discoveries have been made, and important relationships have changed.

The player decides to fork from scene 37.

The new branch inherits the exact historical Library and fictional state from scene 37.

Its voyage still has eight fictional hours remaining.

The later discoveries from scene 80 do not exist in the new branch.

Any pending choices and obligations retain their original fictional meanings.

The new branch creates its own future. Its changes are independent of the parent.

**Technically, the Library's immutable objects and tree nodes are shared by reference. They are not duplicated.**

What must be newly established are branch ownership, execution identities, scheduler responsibilities and other operational controls.

The fork must not copy the parent's running workers, provider attempts, settled bills or external side effects.

### A stronger requirement

The current proposed design aims for **every newly published scene to be forkable**, even if fictional activities are ongoing.

This is intentionally stronger than the current engine.

It requires the engine to represent ongoing fictional commitments in a portable, reproducible form.

A scene cannot claim to be fully forkable if its historical state is incomplete.

Older prototype scenes may remain subject to their existing limitations, but those limitations should not dictate the future architecture.

---

## 9. Time, autonomy, and unusual worlds

The fictional clock is separate from narrative pacing.

The Storyteller might describe a thousand years in a paragraph, linger over five seconds of dialogue, or follow a character through several ordinary hours.

This does not imply that the mechanical clock should advance by the same amount automatically.

Game Authority controls admitted time transitions.

A newly generated opening must not silently begin consequential autonomous activity merely because the player has not yet received the scene.

However, when the player has actually committed an ongoing activity, it may continue while the browser is closed, according to the world's time policy.

The engine should support fictional perspectives without forcing a universal humanoid state model.

An ancient galaxy may have the agency to observe, attend, remember or interpret without necessarily having the mechanical ability to rearrange stars.

---

## 10. Reliability, resources and cost

Agentic storytelling can become expensive if left unmanaged.

Each Storyteller mission operates within captured permissions and resource limits.

Subagents receive separate but bounded allowances within the parent's overall spending authority.

Tool use, model calls, staged documents and source references must survive crashes and recoveries where necessary.

An interrupted model request must not automatically trigger a second paid request when the first outcome is uncertain.

Publication must be idempotent: a lost HTTP response cannot create a second copy of a scene.

Storing an immutable draft is not the same as publishing it as canon.

The intention is **sophisticated creative behavior with predictable operational costs**.

Exact model choices, per-turn budgets, subagent thresholds and acceptable generation latency are not yet specified in the packets.

Those remain decisions to make before real-provider rollout.

---

## 11. What Cursor is scheduled to implement

The implementation is divided into eight dependent Changes.

| Change | Deliverable |
|---|---|
| **WR01** | Reconcile permanent product and technical documentation with the approved vision |
| **WR02** | Implement structurally shared Library storage, source identities, historical reads and branching foundations |
| **WR03** | Implement the multi-round Storyteller, Library tools, writing skills and durable Workdesk |
| **WR04** | Implement independently contextualized research subagents and controlled delegation |
| **WR05** | Implement coherent, atomic scene publication with complete world-state snapshots |
| **WR06** | Implement genuine forks from published scenes, including active fictional activities |
| **WR07** | Implement the direct Play backend for presets and arbitrary Story Prompts |
| **WR08** | Replace the creation wizard, connect historical browsing/forking and run integrated acceptance tests |

Cursor will handle implementation, migrations, testing and relevant permanent documentation.

ChatGPT's role becomes planning, resolving design questions, source investigation and reviewing difficult implementation decisions.

The program does not supersede unrelated Kubernetes or operational work.

Every Change remains **Proposed**. Nothing has been selected in the global execution queue.

---

## 12. What this roadmap does not yet deliver

The packets are aimed at a coherent first implementation of the new architecture, not every feature ever imagined for Offscreen RPG.

They do not constitute a complete visual redesign of the book interface, a full authoring IDE for external world creators, an advanced economy, comprehensive simulation physics, a complete multi-agent society, or a finished catalogue of narrative-writing skills.

Those may become separate product initiatives.

Likewise, the plan does not guarantee that the resulting Storyteller will write extraordinary fiction merely because its tools are sophisticated. Actual creative quality and cost need to be evaluated with real models and human judgment.

The architecture enables better creative work. It cannot substitute for it.

---

## 13. Decisions requiring owner approval

These are the points where the implementation packets currently make material choices.

**A. Universal forkability.** Should every newly published scene be resumable from its historical state, including unfinished fictional activities? The current roadmap says **yes**. This creates meaningful architectural obligations and may make publication stricter.

**B. Library storage.** The packet currently selects a compressed Merkle radix tree. I recommend approving the **structural-sharing and efficiency requirements** while allowing Cursor to choose the simplest correct persistent index from actual implementation measurements.

**C. Subagent authority.** The plan initially keeps research assistants read-only against canonical Library material, with their proposed creative work adopted by the main Storyteller. This is a conservative ownership model, not a claim that assistants should never be able to draft their own isolated files.

**D. Implementation order.** WR02 builds significant storage infrastructure before WR03 makes the actual writer agent usable. This is clean from a dependency perspective, but delays the first integrated creative experience. We may want intermediate integration checkpoints without turning them into disposable toy projects.

**E. Model and spending policy.** The architecture supports variable effort, skills and multiple research contexts, but does not yet select the actual model routes, user budgets, latency targets or adaptive delegation policy.

**F. Prepared-world customization.** The roadmap preserves authored source material and captures the player's customized prompt, but exact conflict-resolution precedence between authored world constraints and player creative wishes needs clearer product semantics.

## Recommendation

I recommend approving the **overall target architecture and eight outcomes**, subject to review of the six decisions above.

The strongest parts of the design are the actual writer-agent model, the Git-like Library, separation of creative and mechanical authority, and faithful historical branching.

The weakest commitments are the prematurely selected physical tree algorithm and the still-underspecified cost, delegation and customization policies.

**Approval should authorize Cursor to begin WR01 and progressively implement the program. It should not automatically authorize paid provider usage, destructive migrations or unattended execution of all eight Changes.**

The intended result is a sophisticated, autonomous creative system underneath a remarkably simple game experience.