# The Storyteller as a working writer | agentic first slice

**Status:** focused, source-grounded **candidate** dated 2026-11-20, recorded after owner correction to the adversarial self-review. **Not implemented, not a selected Change, and not an authorization to dispatch paid models.** Code basis: supplied `09d5820bcafedbed7cf969fe228ee84f44ff2405` snapshot, matching the last implementation snapshot inspected for this dossier. See [critical self-review](CRITICAL-SELF-REVIEW.md), [writer skills experiment](WRITER-SKILLS-EXPERIMENT.md), [versioned Library work](PERSISTENT-LIBRARY-DAG-DESIGN.md), and [workdesk launch proposal](PREPLAY-WORKDESK-PROTOCOL.md).

## Owner correction to our anti-slop review

**Do not confuse unnecessary infrastructure with necessary agentic capability.** The owner explicitly rejects making the first real POC a glorified one-shot next-paragraph generator with an increasingly large injected context. Its distinguishing experience should include a Storyteller that can *orient in a Library, choose its research, inspect evidence, use craft skills, prepare notes, write and revise, and sometimes delegate genuinely independent investigations*.

The metaphor is useful **when operations match the vocabulary**:
- **Library:** long-lived, exact-version fiction/source/private knowledge; browseable by filename and topic, rooted in a branch.
- **Workdesk:** per-mission research packet, opened sources and staged drafts, durable for task recovery, not another live world-authority system.
- **Writing skills:** versioned task-specific techniques, optionally describing permitted tools, but not granting those tools.
- **Research assistant:** optional read-only *separate model context* for an independently bounded question. Not an NPC, autonomous writer of canon, permanent agent or mandatory expense.

A user never has to learn these words to click **Play**. There is no setup wizard, compulsory planning round, arbitrary lore quota, required character sheet or giant hidden prompt.

## What the current source already has

| Existing path | Verified capability | Missing for a true working writer |
| --- | --- | --- |
| [memory-exploration-controller.ts](../../../../packages/application/src/storyteller/memory-exploration-controller.ts) | Durable multi-round private exploration tied to saved generation/task, replayed requests/results, attempt/settlement control, bounded final candidate | Not a general Library agent loop; no draft staging or child operations; currently one narrow memory query/read vocabulary |
| [memory-exploration.ts](../../../../packages/application/src/storyteller/memory-exploration.ts) | Root/revision-fenced explorer, stable task-local handles, exact hash checks and bounded lexical search/read; snapshot reconstruction | No general directory browsing, typed skill discovery or staged revisions |
| [memory-exploration task schema](../../../../packages/storyteller/src/tasks/memory-exploration.ts) | `needs_context`, `ready_to_answer`, `ask_memory`, `read_memory`, evidence-use and optional private creative directions | No `browse`, `stage_edit`, `delegate`, `read_skill`; decision protocol can only request evidence |
| [resources.ts](../../../../packages/storyteller/src/tasks/resources.ts) | `memory-exploration.v1` admits **2–3 model rounds**, **1–6 reads** and up to **48 KiB** retained bytes; one final round reserved; cumulative envelope | A new recipe/version will be needed for general writer tool use or child calls; don't sneak them into an already-frozen v1 task |
| [canonical-knowledge.ts](../../../../packages/application/src/storyteller/canonical-knowledge.ts) | One-shot selection: catalogue up to 64, automatically loaded up to 8 complete docs/12 KiB total, required package context and exact source pins | Roles such as `STORYTELLER_PROFILE.md` have no guaranteed resolved injection yet; all creative knowledge still cannot be simply preloaded |
| [long-story-memory-evaluation.test.mjs](../../../../packages/application/test/long-story-memory-evaluation.test.mjs) | Provider-free 200-scene conventional/abstract corpora, a returning Mira favor, searching and reading exact old source, resumed explorer | These are **retrieval tests**, not actual narrative-quality evidence or autonomous writer/assistant trials |
| [operation and controller](../../../../docs/technical/storyteller/operation-and-controller.md) / [task pack](../../../../docs/technical/storyteller/context-selection-and-recall.md) | Already selected conceptual two-loop controller and mandatory-current / related-orientation / on-demand-evidence split | Normal executor remains one shot by default; target pack and general agentic workdesk not implemented |

**Do not discard the working controller, root pins, source handles or custody layer.** Extend under a versioned *new mission recipe* only where required. The existing read-only explorer already checks the pinned **current manifest**, and does **not** call the 256-manifest historical walk.

### The actual 256 limit (nothing to do with model context)

[documents.ts](../../../../packages/application/src/stories/documents.ts) implements `readManifestHistory(campaignId,rootHash,current)`: walk `previousRootHash`, throw if 256 manifests have been accumulated and another predecessor exists (or a cycle). It is called by **`readDocument()`** and manual **`admit()`**; even a current-document `readDocument` request walks that history first. This is a **backend read/edit service ceiling**, not a model tool/read/context ceiling. Passage generation itself is not proven to fail at scene 257. The explorer's `currentEntry` checks the pinned root manifest and exact document hash without that history walk.

**Near-term technical requirement:** exact current-root reads should not scan ancestor manifests; historical revision lookup and source-reference validation need bounded indexed/provenance lookup or another demonstrated safe method. Keep cycle/dangling/history validation, but do not use a fixed finite history-depth guard as the normal-query algorithm. Do not rip out the memory explorer while repairing this other service. And do not simply delete `256` and allow unlimited linear blob reads.

## Proposed one-turn behavior: actual exploration, not an enormous prompt

```text
Game Authority captures mission + scene/state frontier + Library root
                 + task/profile/skill pins + payer limits
             |
             v
Storyteller sits down at the Workdesk:
  small mandatory present and creative guidance automatically injected
  compact Library orientation/index with handles; not Library bodies
             |
             v
It selects its own work (may do zero, one, or several permitted steps):
  search related canonical sources; browse paths; open exact sections;
  consult a narrow writing skill; inspect established facts vs rumors
             |
             +---- optional independent research assistant(s) ----+
             |    child frozen to same roots and authorizations    |
             |    returns evidence handles + bounded findings      |
             +-----------------------------------------------------+
             |
             v
Storyteller may prepare/revise a few Workdesk documents
  (operation-local drafts, source-linked, can reread before final)
             |
             v
Compose/revise scene and supported intentions; return structured proposal
             |
             v
Application validates source, capabilities, proposals, cost and state
Game Authority alone publishes Library root + passage + valid world state
Dispose provider contexts; retain admitted versioned sources and receipts
```

**This is a design for an agentic operation**. It is **not** a claim that the current 2–3-round recipe can complete every step, nor a prescription that every step must run each scene. The writer may perform a great deal of work for a consequential return or almost none for a simple continuation. The Library is independent of the model context lifetime; later invocations rediscover it from exact committed roots.

### Minimal capability surface to evaluate

These are **functions/affordances**, not necessarily seven top-level native model tools or seven services. An application facade may combine several operations to minimize round trips.

| Capability | Input/output idea | Owner/fence | Existing reuse |
| --- | --- | --- | --- |
| Orient/browse Library | Prefix or compact indexed path listing, capped/pageable, report kind/visibility/status/hash/size | Authorized captured root only; no arbitrary filesystem/shell | Existing manifest + catalogues |
| Investigate memory | `ask_memory(question, evidence/possibilities)` returning grounded leads, omissions and exact handles | Same branch/state/visibility scope | Existing lexical explorer and retrieval recipe |
| Read exact sources | Batch exact admitted handles, section/page limits, coherent one-root read set | Hash+revision verification; capture bytes/omissions | Existing `read_memory`, section resolver; add batching only if measured useful |
| Consult writing skill | Read one pinned short procedure (opening craft, continuity audit, observational perspective), with optional examples | Trusted skill catalogue + immutable skill version; not a tool grant | Existing task rules; candidate separate skill texts |
| Stage document proposal | Create/revise/retract bounded descriptive/private `.md` against stage root; return new stage hash and validator warnings | Workdesk ownership; **not** published game canon or direct SQL/object mutation | Existing typed `documentChanges` validation, CAS staging, expected-root fences |
| Inspect staged draft | Read one's own accepted staged note or compare two stage versions; decide to revise/discard | Same operation/branch/stage, no other user's notes | New explicit operation-local view |
| Submit scene | Scene and supported options with exact evidence/notes and selected stage revision | Existing typed result validator + Game Authority publication | Existing opening/continuation path |

**First implementation discretion:** the facade can keep `ask_memory` and `read_memory` as the model-facing names and add exactly the absent capabilities. Don't create an SQL row per Markdown paragraph or a separate long-lived conversation per character. A stage write may store immutable objects, but cannot become playable truth until the authority commit. If the model wants no changes, an empty stage diff is valid.

### Crucial distinction: Skills vs tools vs independent agents

- **Skill:** compact versioned **how-to-write** knowledge loaded for this mission. For example, “investigate an unresolved promise”: distinguish settled fact, attributed speech, private possibility and current mechanical truth; check the original passage before reusing it. A less capable model may benefit; only an A/B establishes that. The skill text may *mention* `read_memory` but cannot authorize the tool, change budgets or install code.
- **Tool:** executable, schema/permission/budget-fenced capability from the application. Reads, stage proposals and source checks belong here. It is not the AI's shell.
- **Research assistant/subagent:** fresh paid model context operating on an **independent, narrow question**. It may use *only read tools*, and returns a concise answer with exact source handles and contradictions/unknowns. The parent remains the writer and sole proposer. A child is not a new memory source, never creates canonical or private files, never possesses cross-root access and never gets to spend outside the parent operation allowance.

Do **not** overcorrect by banning child agents from the POC. At least **one explicit multi-thread case** should exercise a separately scoped read-only assistant and measure whether it improves the parent's final scene. But do not spawn two model calls merely to answer questions a deterministic index can resolve cheaper or to make the architecture look agentic.

### When delegation should be considered

Useful example after 200 scenes: the player returns to Mira about an old brass key and a faction rumor. The **main writer** needs to compose an immediate conversation. It could assign one assistant “reconstruct Mira's promise from original passage and follow-up notes” and another independent question “what has the faction actually done since then, distinguishing rumor from admitted canon.” These are separable, source-heavy, and risk contaminating the main creative context. A **cheap deterministic search followed by the parent reading two documents** is the required baseline.

**A child is justified only if** it can answer a real separate research question with source evidence that the parent would otherwise need to spend a significant part of its own context resolving. It isn't justified because a scene mentions two people. No per-NPC permanent minds, recursive delegation, child writing of world truth or unsupervised paid loops.

### Suggested child contract (illustrative, NOT schema)

- Frozen `parentOperationId`, `taskRootHash`, `stateFrontier`, `sourcePackagePins`, `scope`, `question`, `allowedHandles`, `skillVersion?`, `maxReads`, `maxTokens`, `maxMicrousd`, `deadline`.
- Read-only scope and same root; the parent can further restrict visibility. Child never sees full payer secrets, parent's private uncommitted drafts by default, another branch's future or unrestricted browsing.
- Return `findings[]` with **exact evidence object hashes/handles**, conflicting reports, uncovered gaps, and a short bounded synthesis. An assistant's synthesis is **not** evidence. The parent must be able to follow the cited handles.
- The controller persists child dispatch/delivery/uncertainty under the parent's resource envelope. Each independent paid attempt gets an identity and settlement; no free retry after an unknown delivery.
- Start with **at most one child in the experimental recipe**, no recursion. A future comparator may test two independent children concurrently. The ability to launch multiple is a design goal, **not** an unlimited default.
- Parallel children must read the same source-root snapshot, not race against each other's edits. A stale-root hold cannot be “resolved” by letting one child look at latest.

## The first **genuinely agentic** POC

A one-shot opening with extra injected lore **does not satisfy this POC**. A green JSON schema validator **does not satisfy it** either.

**Proof A: tool-using solo writer (provider-free fixture, then optional paid model).**
1. Capture a branch/root from the existing **200-scene** memory corpus. Leave an old promise in the Library that is **not** included in mandatory injected context.
2. Let the scripted writer request discovery, inspect the original source (not merely a summary), consult a versioned *continuity-writing skill*, and stage one source-linked private/descriptive note; inspect the note and revise or discard it.
3. Submit one supported scene proposal. Prove the saved operation survives a process restart between tool rounds. Publication is exactly once, and a stale root rejects it without changing canon.
4. Assert read coverage, true source hash, preserved attribution/visibility, bounded context bytes and no full-200-scene injection.

**Proof B: independent research context (provider-free orchestration, later a separately funded small model trial).**
1. Give the writer the Mira/rumor scenario above with two independent unknowns.
2. Compare (i) deterministic retrieval + parent composition, (ii) parent tool exploration, and (iii) one read-only research child + parent composition. **At least (iii) must actually invoke a separate scoped context** in the future funded trial, not fake it by asking the parent to roleplay two voices.
3. Child returns source handles/contradictions; parent can inspect evidence before publication. Reject child data without exact rooted source proof. Charge both parent and child to one operation envelope.
4. Check no parent-future or sibling knowledge leaks into a historical fork.

**Proof C: setup/opening workdesk.** From a pinned preset, automatically load the essential `STORY_PROMPT.md` and profile/skill core if present; optionally discover other authored docs; stage zero or a few initial documents and generate scene 1. From `BAH` or the conscious galaxy, do not require a character/HP/form. Whether preparation gets a separate paid round is selected by evidence, not by the presence of the word “workdesk”.

### Success measures, including creative quality

Mechanical/offline: root and per-document provenance, evidence correctness, fork isolation, staged edit/re-read, tool and model round counts, retained bytes, crash resume, no duplicate publication or charge, source-contradiction behavior, no required humanoid data.

Later human+paid A/B: does the resulting **scene and subsequent scene** meaningfully improve in coherence, creative specificity, agency and surprise, at what incremental latency/cost? A weak model *with* a writing skill or research assistant can still perform worse. Record total cost per accepted playable turn and how many source reads were useful versus decorative.

**Rejectable outcomes:** agent calls a tool merely to read its automatically injected profile; produces ten duplicate lore pages; blindly trusts its child summary; interprets a private plot possibility as established fact; delegates routine lookup unnecessarily; spends more without visibly better writing; or needs all 200 passages serialized to remember one promise.

## What to do next, in order

1. **Do not regress to a one-shot-only agentic POC.** Ratify the product-level expectation that a meaningful Storyteller invocation can investigate and manage its Workdesk. Keep a zero/one-shot fast path for *simple* turns, never as the universal architecture.
2. **First focused source/contract work:** write a narrow, versioned successor to `memory-exploration.v1` that supports Library orientation and staged proposal/re-read under existing durable operation/cost/publication fences. No universal tool framework required; use source handles.
3. **Then add one read-only delegated-research case** in the same shared operation envelope, with separate provider attempt identity and explicit no-recursion/permission fences. Test whether it earns its additional tokens.
4. **Keep independent integrity repair moving:** eliminate the historical `readManifestHistory()` 256-depth dependency from normal exact reads/admission through measured, branch-safe source lookup. This is backend hygiene, not a context-packing design.
5. **Reconcile the accepted owners only after exact contracts/proofs**: [task roles and tools](../../../../docs/technical/storyteller/prompts-and-tools.md), [context selection](../../../../docs/technical/storyteller/context-selection-and-recall.md), [operation controller](../../../../docs/technical/storyteller/operation-and-controller.md), [canonical files](../../../../docs/technical/storyteller/canonical-documents-and-packages.md), plus one-prompt product UX.

**Bottom line:** we want a **tool-using, Library-oriented, occasionally multi-agent author** whose *creative deliberation is sophisticated* and whose *authority and budgets are simple and deterministic*. A minimal implementation must demonstrate that interaction, not delete it.
