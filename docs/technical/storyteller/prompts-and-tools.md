# Storyteller prompts and tools

**Target contract:** prompts describe a writer mission; tools provide scoped capabilities. Neither prompt text, Library content nor a writing skill can mint permissions. The authoritative tool surface is provider-independent and rooted in the mission's captured Library/state view.

**Owns:** task recipes, what a model may read, when it must stop, and what a prompt is forbidden to grant.  
**Selected target** below. Task roles stay separate, and the compilation heading records the 2026-11-19 task pack. **Not implemented.** The landed runtime still uses versioned task artifacts and a narrower tool surface; see [step status](operation-and-controller.md#step-status) and [request context and cost](request-context-and-cost.md). Tool rights, versioned input capture, stopping, and refusal stay the sections below. This page adds no tool entitlement. This page does not implement the packer.  
**Product:** [behavior](../../product/storyteller/behavior-and-quality.md), [memory](../../product/storyteller/memory-and-continuity.md).

## Orthogonal authorities

A profile sets how the Storyteller tells and initiates. It does not set the payer budget or the model. A task recipe sets how much investigative and composition work is eligible. It does not decide whether a character can die. A model route sets technical capacity and price. It does not set the game rules. Account entitlement limits the whole operation and cannot define the fiction. These intersect at task admission. A richer tier never has less authority constraint: more funding buys attention, evidence and style, not free inventory, unauthorized actor decisions, or better dice.

## Task roles

One Storyteller identity serves the campaign. Each role below is a separate recipe: one purpose, canonical input, permitted tools, output schema, publication target, latency class, and failure semantics. The application selects the recipe from the accepted game transition, the evidence that transition requires, and the captured budget. A recipe's instructions stay out of every other request.

**Current runtime:** ordinary scene recipes are usually one well-packed composition call, optionally with bounded exploration/repair. **Target:** a Storyteller mission may use multiple provider rounds and tool interactions when useful, but never as mandatory theatre. Evidence investigation remains a bounded phase of the same durable operation. Continuity notes can be a section of the same consequence result. A distinct model call is admitted only when a special role must return a short typed, source-linked artifact for the composer. Both prompts and both transmissions share one captured operation budget. Role text does not change dice, payer permissions, world or branch authority, or source visibility.

This heading names the recipes. It does not implement the packer. Today's code does not assemble P0–P3 this way. Landed admission still uses opening, continuation, consequence, and report tasks. See [Current prototype runtime](operation-and-controller.md#current-prototype-runtime). The pack those roles receive is [Selected compilation and tool contract](#selected-compilation-and-tool-contract).

| Task | Mandatory truth | Must not publish |
| --- | --- | --- |
| Opening composer | Reviewed premise, package, rules, starting actor | A started clock |
| Immediate consequence narrator | Exact attempt, receipt, elapsed time, item and actor facts | A second mechanical outcome |
| Contextual continuation | Current scene, prior accepted intention, known history | Item ownership the player did not accept |
| Controlling interruption | Cause, retained earned progress, permitted conditions | A success receipt the interruption removed |
| Historical reporter | Frozen source event and chronology | A replacement for Now |
| Evidence investigator | Root, version, question, visibility, remaining budget | Story text; private packet only |
| Continuity curator | Source passage and existing record | Mechanical statistics for a mentioned name |
| Narrative director | Only if a future policy explicitly accepts initiative | Any automatic world effect |

**Current runtime:** no subagent is spawned. **Target:** bounded research assistants are optional, separately contextualized children with frozen source scope and carved-out parent allowance. No recursive delegation, no private story data crossing scope, no child budget recharge, and no direct canon/mechanical publication.

## Stopping

At admission, compute the effective budget as the **intersection** of platform cap, account grant, payer window, story-selected optional work, task minimum and maximum, route capabilities, and the operation's remaining resources. **Current pre-refoundation recipes** choose among deterministic-only, one-shot, one-shot plus limited repair, or bounded evidence-seeking (currently two or three rounds). **The target mission does not inherit that numeric ceiling:** it selects the smallest adequate route under the captured total resource/deadline policy. A model round whose only job is to decide whether a model round is needed is not the default. Use a cheap deterministic need check first: named known entities, unresolved source identity, provenance conflict, long absence, missing continuity, known-versus-hidden ambiguity.

The model may request another read inside a preauthorized recipe. It cannot upshift its own route, allowance, creativity policy or latency. Preserve a final-answer reserve before optional research. At the budget threshold, stop exploring and produce the final answer if required source is present; otherwise return a typed hold. Every repair and optional specialist consumes the same envelope.

Stop states are distinct: completed valid candidate, no further evidence needed, exact source not found, tool or coverage incomplete, context too large, round or deadline exhausted, provider refusal, bounded invalid output, uncertain charged attempt, stale revision, or required authority unavailable. None of them is an unbounded "still thinking."

## What the prompt must not grant

The model may decide emphasis, wording, silence, admissible grounded opportunities, and descriptive text inside the captured canon-invention policy. It may propose finite plans, effects, transfers, obligations and time. Code must admit those against actor, rules, source and permission. Those admissions stay inside [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) and [Canon invention policy](../../product/storyteller/profiles-and-settings.md#canon-invention-policy).

The model must not decide dice, a forced player response, the scheduler, the provider key, the payer, retry eligibility, an unknown factual outcome, secret future state as public fact, permission escalation, SQL mutation, or destruction of canon.

**Negative:** a zero-call interval is a successful recipe when accepted work needs no narration. A missing memory search returns partial or no-match. It does not fabricate a remembered sentence. The current hardcoded nonlethal limit is a present capability gap, not a constitutional ban that a more imaginative prompt may lift.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| What the prompt must not grant | constrained-by | [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) | If the product allows invented success, a reroll, an unearned reward, a private plan as fact, or an action for the player, this prompt would grant a decision code must currently reject |
| What the prompt must not grant | constrained-by | [Canon invention policy](../../product/storyteller/profiles-and-settings.md#canon-invention-policy) | Descriptive text is allowed only inside the captured domain ceiling; if a domain permission starts allowing executable mechanics, a fabricated citation, or a player choice, admission would accept prose that policy forbids |

## Selected compilation and tool contract

The controller compiles a small mandatory mission pack, then exposes a semantic tool facade. Exact wire names may change; these capability boundaries do not.

**Mandatory injected pack:** mission purpose; story/branch/scene; captured Library root and world-state frontier; effective creative profile/skills/rules pins; current intent and visible present; granted resource policy; compact orientation to the Library/tool surface.

**Library discovery and evidence**
- orient/browse logical paths, roles and source metadata under the captured root;
- find candidates using lexical/semantic/index aids;
- read an exact source revision or bounded section;
- compare exact source revisions/claims and inspect provenance.

**Craft and Workdesk**
- load a versioned writing skill or focused example;
- stage a new/changed private document or scene draft;
- reread the staged result and inspect diff;
- revise or discard staged material.

**Delegated research**
- start a bounded assistant context with a frozen allowed root, narrow question and explicit allowance;
- receive claims, uncertainty and source handles or an isolated draft proposal;
- parent adoption is explicit. Child output is never directly published canon.

**Submission**
- submit one scene proposal with prose, visible choices plus stored intent, cited source handles and proposed document changes. Submission does not itself mutate SQL, clocks, inventory, billing or canon.

The facade must not expose arbitrary shell, SQL, host filesystem or unrestricted network access. Search indexes are rebuildable aids; a result outside the captured root or visibility scope is invalid even if its vector similarity is excellent.

No fixed `maxReads=6`, `maxRounds=3`, 2–5 option count or mandatory child agent is part of the target contract. Numeric limits are route/resource policy and can evolve without redefining the Storyteller.

### Detailed pre-refoundation pack and transport baseline retained

The following 2026-11-19 contract remains the implementation/migration baseline for current code. Where it names fixed one-shot/two-or-three-round behavior or no subagents, those are current realization facts explicitly superseded by the target capability model above, not deleted history.

**Selected task pack, 2026-11-19.** This heading records how one Storyteller task is packed, and which tools that pack may use. This page does not implement the packer. Today's code does not assemble P0–P3 this way. `prepareStorytellerTask` still builds a `bounded-scene.v3` request from the caller-supplied snapshot, the task rules, and the profile. Ordinary admission still captures `single-turn.v1` or `repairable-turn.v1` with tools disabled. A funded `memory-exploration.v1` recipe can ask and read inside one operation. That recipe is the landed exploration controller. The runtime description is [Current prototype runtime](operation-and-controller.md#current-prototype-runtime).

That pack is what a future remote worker would receive: injected current state, a short orientation, and one intention-level memory query. The worker proposes. The engine publishes. A possible paid send is not retried from this pack, and custody adds no model round. Today's code does not assemble the remote worker. Who holds the task is [Remote task custody](generation-and-publication.md#remote-task-custody).

The compiler is deterministic about permissions, version selection, packing, and budgets. Creative interpretation stays with the model. A missing mandatory source is an explicit hold.

- **P0.** Stable universal authority plus the one narrow role recipe for this task. Version it. A prefix discount applies only where the provider bill reports one. Every other role's instructions and tools stay out of the request.
- **P1.** Mandatory exact present, injected before any paid research round: branch, story, and scene; current mechanical constraints; committed receipts; the active intent; relevant actor knowledge; the pinned rule fragments that apply; permitted capabilities; and the selected Storyteller profile.
- **P2.** Focused orientation: a compact scene, identity, and thread map with stable handles, current status, why the lead is relevant, source revision, and size. A few useful leads are the target. A search lead is not an accepted fact.
- **P3.** On-demand evidence. Unknown history is one intention-level `ask_memory(question, intent)`. The deterministic backend does the reads: exact ids, source links, structured predicates, and lexical retrieval. It then checks revision, authority, branch and knowledge visibility, provenance, coverage, and byte limits. `read_memory(handle)` opens an exact source when the wording matters. A second overlapping tool is not part of the default facade.
- **P4.** Optional stronger investigation, only for an unresolved high-value case, inside the same operation's final-output reserve and payer allowance.

The 2026-11-14 compile list numbered world truth, the task contract, creative identity, pinned rules, the frozen present, source-linked past, and investigation feedback as P0 through P6. This pack replaces that list. Known present is injected. Related material is orientation. Unknown history is fetched by the intention-level query. It is not preloaded as its own layer.

A bloated universal system prompt is not justified by cache overlap.

**Fork packing negative.** At scene 10 the king is alive and the hero holds a sword. At parent scene 20 the king is dead and the sword is gone. A fork from scene 10 is packed with the living king and the held sword, from that scene's mechanical checkpoint and canon root. An `ask_memory` lookup on that fork must not return the scene-20 death, including through a stale global index. A rumor that the king died is an attributed rumor, not a committed fact. The same negative is the source rule in [Task pack](context-selection-and-recall.md#task-pack--selected-target-2026-11-19). Search indexes are not authority.

Prompt defects to remove from common authority: a blanket “never end the character's life” is the present nonlethal gap, not eternal policy; a compulsory 2–5 options rule contradicts a quiet or single-attempt scene; “cannot execute tools” forbids game mutations, not an explicitly admitted read-only memory phase. The model still cannot reach SQL, the shell, the web, or another player's account.

**Initial approved read vocabulary**, when a recipe admits investigation:

- `ask_memory(question, intent)`: the intention-level facade. The deterministic backend performs the reads and returns leads, current-root source ids, a snippet, relevance, and coverage. The [selected retrieval routes](../../product/storyteller/memory-and-continuity.md#selected-retrieval-routes) still allow one or two ordinary-language questions. The landed `memory-exploration.v1` controller accepts at most two per round. That cap is current code. It is not a second tool, and it is not this packer.
- `read_memory(handle)`: one exact approved current-root record or published passage from a handle the same operation returned, bounded bytes, proven source identity.

Code mode is unselected. It is not the default. A future sandboxed, read-only query over task-scoped handles would have to beat this deterministic resolver on quality, tokens, and latency before it could be admitted. Model-generated shell, SQL, filesystem, or network writes are prohibited. Cognee, vector search, and embedding models stay unselected. An index remains a rebuildable aid: [Indexes are rebuildable aids](context-selection-and-recall.md#indexes-are-rebuildable-aids).

Optional later reads (a pinned rule section, a known identity, a contradiction between two attributed sources) stay proposed until a measured need. **Current pre-refoundation facade** exposes no subagent spawn and never exposes arbitrary SQL, file read, web search, shell, item transfer, dice or grants. The target adds only the bounded research-assistant capability defined above, under explicit parent allowance and no direct canon authority. A read is not a player action.

Each accepted game event builds a **new** captured task. **Current `memory-exploration.v1` realization** keeps investigation snapshots operation-local for two or three rounds; this numeric limit is not a permanent target ceiling. There is no permanent model transcript and no model session while the story is quiet. Compaction is off by default. A model summary is never canon. **Current runtime:** subagents are absent. **Target:** assistants remain optional and default-off unless the mission policy admits one.

A route manifest records provider, model, endpoint, schema strictness, context and output ceilings, timeout, price categories, and whether a capability is enforced. Current OpenRouter calls keep reasoning disabled, with no web or context-compression plugin and provider fallback denied. A route policy that mentions a reasoning budget does not enable reasoning. The model does not pick the route or the payer.

Three caches stay distinct: canonical source bytes (immutable, still permission-checked), a provider prefix discount (only when the bill reports it), and identical-response replay (only the same accepted work). A shared prefix is not a cache hit.

Model text is data. It cannot raise round, read, money or latency allowance, publish private knowledge, reroll mechanics, or submit a player command. Bounded repair stays inside the same admitted operation. A sent-but-uncertain attempt is not a free rerun. Public narrative does not expose evidence packets, private directions or raw prompts.

**Negative:** injected instructions inside a canonical document cannot mint tools or reveal private policy. Native function-calling and a JSON envelope are transports, not different permissions. Different narrative directions may change the scene and must not change the dice, clock or item outcome.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| Selected compilation and tool contract | constrained-by | [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) | If the product allows the model to roll, transfer items, or mint tools, the approved read vocabulary and the ban on model text changing dice, clock, or item outcome would admit a tool this section forbids |
