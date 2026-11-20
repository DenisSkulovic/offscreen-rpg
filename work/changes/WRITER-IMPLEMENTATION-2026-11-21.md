# WRITER implementation program | from vision to a real agentic game

**State:** DOCUMENTATION COMPLETE / CODE UNSELECTED, 2026-11-21. **Owners:** user approves product policy; **ChatGPT performs permanent wiki reconciliation first**, then **Cursor implements code**. No execution selection is implied. This program is **not** the global current-work selector: [QUEUE](../QUEUE.md) remains authoritative and is deliberately unchanged. **Inspected code baseline:** GitHub `0d423b687c9a0a84d45dfe20823d7d313651ea25` (plus provided implementation ZIP `09d5820bcafe` for broad static inspection); check HEAD and any active worktrees before execution. **No code implemented by this program commit.**

## Target, not the legacy implementation

**Replace** the staged draft/role/profile/preview/Start wizard with **Play prepared experience** or **one Story Prompt**. A Storyteller operates as a genuine multi-round **writer agent**: root-scoped Library exploration, exact evidence reads, versioned craft skills, a draftable/rereadable Workdesk, and optional separately contextualized research assistants. It submits artistic/descriptive proposals; an independent Game Authority admits scenes and their complete state.

All published scenes are **historically complete and independently forkable by construction**, including ongoing *fictional* commitments. A fork references structurally shared immutable Library and state versions, not cloned Markdown or parent provider/workflow state. Perspective may be human, microscopic, galactic, observational or other. A prepared experience may contain its own full Library, not just a text seed. A one-word custom prompt is allowed under an explicit original-world invention policy. No mandatory provider call solely to prepare the desk.

These are **product requirements**. Implementation details below are selected planning hypotheses to test *while implementing*, not reasons to regress to the existing flat manifests, strict 5e actor, fixed three model rounds or one-shot inference. The dated [vision-first target](../designs/open/story-creation-and-writers-workbench/VISION-FIRST-TARGET.md) and [worked traces](../designs/open/story-creation-and-writers-workbench/VISION-FIRST-TRACES-AND-TESTS.md) describe acceptance. This short program and eight Changes are the **execution interface**; Cursor should **not preload the 200+ KB investigation dossier**.

## Dependency-ordered Changes

| Change | Outcome | Depends on | Principal owner | Can overlap |
| --- | --- | --- | --- | --- |
| [WR01](archive/2026-11/other/2026-11-21--wr01-accept-storyteller-and-fork-contract/CHANGE.md) | Rewrite **canonical product wiki** | owner approval | **ChatGPT docs wave 1** | documentation only |
| [WRD02](archive/2026-11/other/2026-11-21--wrd02-storyteller-library-technical-docs/CHANGE.md) | Rewrite Storyteller/Library technical owners | WR01 | **ChatGPT docs wave 2** | documentation only |
| [WRD03](archive/2026-11/other/2026-11-21--wrd03-engine-fork-technical-docs/CHANGE.md) | Reconcile engine, publication, active forks, clock and launch contracts | WR01, WRD02 | **ChatGPT docs wave 3** | documentation only |
| [WRD04](archive/2026-11/other/2026-11-21--wrd04-wiki-navigation-and-validation/CHANGE.md) | Wiki navigation, architecture explanations, dependent claims and cold-reader checks | WR01, WRD02, WRD03 | **ChatGPT docs wave 4** | documentation only |
| [WR02](open/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | Branch-neutral, structurally shared Library with exact historical reads/writes | **WRD04 + owner sign-off** | `packages/documents` + document application service | WR07 frontend-only research, not its code |
| [WR03](open/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | Real writer agent, Library tools, skills, staged Markdown/draft/re-read and durable capture | WR01, WR02 | `packages/storyteller` + application agent coordinator | WR05 after shared contract is frozen; avoid overlapping files |
| [WR04](open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | Independent bounded subagent contexts with budgeted joins | WR03 | agent delegation and spending | WR05/WR06 when controller files are disjoint |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | Game Authority commits exact post-scene Library, state, intentions and source pins | WR02, WR03 | engine/publication, `stories`, DB | WR04 with file isolation |
| [WR06](open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | Branches from any new published scene, including accepted active fictional work | WR05 | engine fork/clock/outbox | WR07 backend if separate state owners |
| [WR07](open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | Durable one-click Play launch, presets, original-world prompt and first scene | WR03, WR05 | application/API creation | WR06 after explicit ownership split |
| [WR08](open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | Simple creator UI + historical library/fork review, complete integration proof and retirement of obsolete UX | WR04, WR06, WR07 | web + integrated acceptance | final join, serialize shared release environment |

**Documentation first:** [ChatGPT's four-wave wiki handoff](WRITER-DOCS-CHATGPT-HANDOFF-2026-11-21.md) is the proper first-phase execution plan. Original WR01 is **not Cursor work**; WRD02–WRD04 are also ChatGPT-only. No code Change WR02–WR08 becomes Ready until permanent wiki owners have been reconciled and reviewed by the user.

**This is a dependency graph, not an instruction to select all Changes.** Follow the repository's [bounded batch rules](../../.agents/references/bounded-parent-orchestration.md): one selected Change or a small explicitly approved disjoint batch, then reconcile and stop. Shared `packages/application/src/stories`, agent controller, DB schema, GA, and a single kind cluster require serialized ownership. Existing DXK/TURN/DIST Changes continue as separate work and are not silently superseded. Do not alter [work/IMPLEMENTATION-ROADMAP.md](../IMPLEMENTATION-ROADMAP.md).

## Technical decisions supplied to implementers

**Library physical baseline:** implement a **branch-neutral immutable path-index / Merkle radix tree**, keyed by normalized UTF-8 logical filename, using deterministic path compression and bounded child tables. Document bodies remain immutable CAS objects. Source hashes/ID/revisions/authority/visibility are leaf metadata; root hash never incorporates story/branch identity. Branch/scene selectors hold lineage and access. This is a chosen execution direction, not a requirement to preserve v1 manifest history. A full Git executable/repo is unnecessary. Benchmark *during WR02 implementation*, including insert/remove/rename and 10k files; if the selected structure fails demonstrably, return to planner with measurements rather than shipping an O(N)-per-scene workaround.

**Agent:** one main writer holds an exact source/workdesk snapshot; a durable multi-round provider controller exposes scoped browse/find/read/compare, skill load, staged proposal/change/diff, and final scene submit. Optional research children have separate actual provider contexts, read-only/source-linked outputs, own spend identities under a single parent allowance; neither a mandatory two-call setup nor unlimited autonomous inference.

**Authority:** the scene publication is one transactional selection of Library root, full **post-publication semantic world state**, original passage/choices, effective creative/rules pins, and causal frontier. The writer stages proposals; it does not mutate canon or mechanics directly. Active *fictional* plans/offers/obligations are snapshot data that may be deterministically rehomed under fresh branch execution identity; provider attempts, worker leases, external effects and money are **not** cloned. No scene may be advertised published/forkable with missing necessary semantic state.

**Source roles:** `STORY_PROMPT.md` (verbatim user intent, not fictive canon), `STORYTELLER_PROFILE.md` (creative direction only), `START.md` (orientation), optionally versioned writing skills and private/typed files. Exact path, source namespace, document role, revision and content hash are resolved by the harness. Markdown is not a security grant.

**Legacy handling:** existing immutable v1 objects and historical checkpoints remain readable under adapters where actual retained data exist; there is no promise to turn unsupported v1 history into invented forkable state. New story writes use v2; migration is explicit and one-way per adopted branch/root, with reliable refusal and no data loss. POC-only code can be removed or replaced where it does not fit. A fresh repo/source review at each Change start catches concurrently modified Cursor work.

## Real acceptance, not toy proofs

A complete program acceptance session must demonstrate:
1. **Preset Play:** properly authored documents, no mandatory setup model call, admitted opening and later source-based continuation, no wizard or humanoid precondition.
2. **Custom prompt:** `BAH` and a conscious galaxy work as original narrative fiction with meaningful choices, no 5e scaffolding.
3. **200-scene return:** the writer independently searches, reads exact old evidence, consults a skill, stages/revises a note; a separate research subagent resolves a different thread with source receipts. No entire Library/context injection.
4. **Fork under active work:** fork from an older scene with an accepted unfinished journey/offer/obligation. Parent continues separately; child retains exact historical knowledge, choices and progress, gets only newly owned operations and no parent future.
5. **Faults:** crash after staged draft, provider uncertain, stage object missing, scene SQL failure, HTTP loss after commit, simultaneous branch edits, source-update drift, invalid permission and runaway delegated budget. No double spend, leaked secret or half-published scene.
6. **Scale:** at least 10k logical Library entries and 1k+ committed changes; inspect actual object/storage costs and prove ordinary update/fork does not clone all content or walk the whole revision chain.

Provider-free scripted tests prove correctness first. Actual paid creative-quality comparisons happen **only after separately authorized spending**, and must report improvements as well as cost/latency, without becoming a precondition for implementing ordinary tool calling.

## Responsibility, selection and exit

- ChatGPT: **write and reconcile permanent product/technical/architecture wiki pages** in WR01/WRD02/WRD03/WRD04; investigate, prepare source maps and review. **No further runtime implementation commits.**
- Cursor: **code WR02–WR08 only after WRD04 + owner sign-off**; own implementation/tests/migrations, report exact proofs, and make *small evidence-driven documentation follow-ups* to already-ratified owners when implementation changes their realization status. Do not redo ChatGPT's initial wiki rewrite.
- Human: accepts any material product/technical deviation and authorizes paid/provider, cluster and destructive operations. “Ready” is not spend permission.
- `WR01`, `WRD02`, `WRD03`, and `WRD04` are complete and archived. `work/QUEUE.md` remains `Current work: none`; no Cursor code Change is selected merely by this documentation completion. **WR02 is now the first eligible Cursor implementation candidate** and should branch from this integration line.

**Stop condition for planning:** four ChatGPT docs waves plus seven Cursor implementation outcomes are described. The canonical docs rewrite must be actually completed before Cursor code begins. Do not create further architecture files or change packets unless Cursor discovers a concrete missing decision that prevents a named packet's acceptance. Next useful action is select WR01 or request focused review of this program, not another broad research iteration.
