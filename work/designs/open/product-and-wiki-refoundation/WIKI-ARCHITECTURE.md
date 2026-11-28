# Wiki architecture | reconstruct meaning, not wrappers

**Proposed E1 architecture for defense.** Owns the reconstruction strategy. [TARGET](TARGET.md) owns product decisions; [E1 reconstruction](E1-RECONSTRUCTION.md) owns the first selected boundary. Existing repository documentation rules and geography remain binding. This is not a second permanent wiki or a new work-management system.

## The finished knowledge base

The wiki should let someone understand the game in minutes, understand a subsystem by following its concepts, and implement a bounded feature by locating the controlling contract and source. It should also be pleasant to read for its own sake. A newcomer should be able to answer what the product is without knowing what POC, E1, DE or a Change packet means. A returning engineer should not have to read the whole book to find retry semantics. There must be no privileged alternate documentation for models that contradicts the human-facing wiki.

Keep repository Markdown and existing graph/retrieval tools. No external wiki service, new docs framework, generated prose, database or mandatory frontmatter. The architecture changes the knowledge itself, not its hosting.

| Kind of knowledge | Permanent owner | Reader experience |
| --- | --- | --- |
| Product identity and player/staff rights | `docs/product/foundations`, relevant product domain | Explain what play feels like, why decisions matter, what is forbidden. |
| Gameplay and world capabilities | `docs/product/gameplay` | Explain applicable mechanics, choices, consequences, time and continuity; use examples rather than dictate storage. |
| Writer craft and experience | `docs/product/storyteller`, `docs/product/experience` | Explain Storyteller behavior, creative controls, entry, play, return, presentation. |
| Staff product | `docs/product/admin` | Explain legitimate operator purposes, trust and limits, not unrestricted support powers. |
| Executable technical guarantees | `docs/technical` domain owners | Explain boundaries, interfaces, identity, concurrency, failures, recovery and cost; identify supported realization separately. |
| Source routes and local invariants | nearest package/app README and code | Locate real symbols, interfaces and tests; not a duplicate system specification. |
| Observed capability and evidence | STATUS, technical evidence route, receipts | Explain what was actually built and tested, with precise revision/scope; do not confer product authority. |
| Procedures and architecture views | `docs/runbooks`, `docs/architecture` | Help operators execute a task and readers understand topology; route back to guarantees. |
| Proposed and historical decisions | existing Design/backlog/research/decision zones | Retain still useful alternatives, evidence and rationale; not every discarded brainstorming sentence. |

Use existing routes and links to meaningful headings. Product and technical directories remain distinct; within them, page splits, consolidation and renames are permitted in the relevant later evolution when meaning and dependents can be reconciled. E1 retains its seven owner paths to reduce unrelated churn, not because the current page partition is sacred. A topic index is a route, not a third version of a contract. The current product page inventory is covered by the progressive boundaries below.

## Reader-first writing

Each page begins with its subject and the important conclusion, not its history of revision. Write the clean target explanation first from approved claims. Then bring in necessary detail, exceptions and evidence routes. Replace weak prose wholesale; do not copy sentences merely because they are familiar. Use narrative examples for player experience, tables for comparisons/rights and diagrams for genuine relationships or state transitions. Use concise linking prose to related owners. Keep binding exceptions beside the rule they qualify. Use explicit labels when a target, deferred idea or observed limitation could otherwise be mistaken for delivered behavior; a single local statement and precise link often suffice. Do not mechanically remove a caveat if it changes meaning or hides a limitation.

A substantial, coherent technical contract may be long. Do not optimize for a word count, density of links, number of files, proportion changed or token usage. Readability includes precision, stable terminology and finding the relevant section quickly. A reader must be able to distinguish a product promise, an executable contract, a future aspiration, an illustrative story, and verified implementation. The same claim need not be repeated in five pages to be discoverable.

### Specimen: how the front door should feel

> Offscreen RPG lets you inhabit a continuing fictional life. Begin with a prepared world or describe your own. A Storyteller develops the world and its characters with you; the game preserves the consequences and history of your choices. You can play a purely narrative story, use familiar D&D mechanics, or choose an experience where a journey takes actual time. The world and the rules you choose determine what is possible.
>
> Read the product vision for the experience, gameplay rules for what the game enforces, and Storyteller behavior for how the writer works. The capability record shows what is implemented today.

This is an editorial specimen, not a mandatory final paragraph or a claim of currently delivered combinations. The page must still give routes to the full product, including staff and trust, without making its opening a list of old milestones. Prefer direct links to the owners over duplicated disclaimers.

## Semantic migration and deletion

A rewrite has two inputs: the selected new target and the actual meaningful claims of the affected owners. Neither old code nor old prose alone defines the future product. Before execution, the planner decides material changes and maps unique claims (not sentences) to their retained or new homes. The executor may freely author wording, reorder paragraphs, use examples and remove redundant language inside the decided semantics. It must not select new game rules, remove an unresolved guarantee, infer support from a test file, or settle a conflicting contract by editing whichever text is easier.

| Disposition | Rule |
| --- | --- |
| Re-express | Preserve approved meaning, including modal strength, scope, exception and negative. |
| Replace | New ratified meaning supersedes an explicitly named old claim; reconcile every affected dependent. |
| Move/merge | Preserve unique substance at its one canonical destination; replace obsolete links. |
| Defer | Keep a useful unresolved design question or experiment in an existing legitimate proposal/research owner, never present it as a rule. |
| Retire | Delete abandoned speculation, repeated exposition or stale narrative of implementation when no unique evidence, safety or decision value is lost. Git retains historical text. |
| Protect | Leave active safety, permissions, cost, source identity, evidence and unselected technical contracts unchanged unless expressly evolved. |

Prefer deletion over elaborate status banners for abandoned ideas. Preserve licensing/provenance, unique experiment results, current obligations, durable Medium/Low findings and evidence needed to justify selected contracts. For each material relocation, record actual destination, not just “in Git.” A historical proof may still be valid for its named revision even if its source path no longer exists; do not silently relabel it as current. Where an evidence owner cannot be identified, leave that unique evidence in place pending a bounded decision. Do not write fictional replacement evidence.

For headings that move or disappear, inspect known incoming paths and anchors, typed dependency edges and source-adjacent references. Resolve to the actual new controlling heading; if a retired idea was never normative, reconcile the reader route accordingly rather than redirect it to an unrelated paragraph. Keep explicit aliases only where useful for current consumers. Do not rewrite archived receipts to pretend history changed. Reconcile full checkout graph and current branch drift before joining; the lean snapshot does not establish completeness.

## Progressive coverage and execution ownership

E1 reconstructs the front door, two foundations and the authority-bearing rules, continuity, time and Storyteller pages. E2 revisits the meaning and organization of all gameplay pages (`actions-and-commitments`, `worlds-and-characters`, `acceptance-scenarios`, `long-life-benchmark-playthroughs` plus rules/continuity/time) under the selected charter. E3 revisits all experience pages and remaining Storyteller pages (`memory-and-continuity`, `profiles-and-settings`) plus behavior where needed. Existing Living Book POC material is treated as historical evidence or reusable design input, not the future interface by default. E4 reconstructs technical owners (`engine`, `storyteller`, `client`, `platform`, `observability`, `admin`, `lab`) in accepted domain slices; retain proven engineering foundation contracts and account for concurrent development. E5 reviews staff/admin product, runbooks, Atlas, status, decisions and whole-wiki navigation, together with unresolved cross-domain duplicates. Admin/trust policy changes require their own explicit decisions. This coverage is directional; later scope may be split or reordered when dependencies warrant.

Do not make all these evolutions one enormous commission. Deliver coherent readable slices, promote accepted meaning, integrate and learn. Shared terms and rights freeze before parallel rewrites. One custodian owns product index and shared incoming-edge edits per batch; distinct page groups may rewrite concurrently with a frozen contract. A cross-group semantic contradiction returns to the planner, not an agent vote. Do not allow two writers to concurrently replace the same canonical file or update a shared generated index independently. Join changes using existing worktree/branch lifecycle; regenerate derived navigation after the joined content when required. Concurrent Claude engineering Changes own their existing technical write sets. E1 excludes those files from semantic edits. An unavoidable link reconciliation collision waits for the actual owner's join, then rechecks the affected edge.

Use the Cursor allowance for substantive reading, original composition, full-page rewrites, consolidation and focused editorial checks. The parent may use suitable available models and bounded child tasks; no artificial burn, no arbitrary cap that prevents a good rewrite, no redundant swarms. ChatGPT owns material product decisions, source-grounded mapping and independent acceptance coordination. Owner can judge representative prose. The repository workflow and permission/spend safeguards remain in force.

## Acceptance: test the reader and the contract

A successful page is one that a fresh reader can use without consulting historical deliberations. On the joined E1 candidate, a fresh reviewer must actually read the rewritten primary pages and answer the discriminating questions in the reconstruction map, cite their exact new owners, and inspect the semantic diff against the selected dispositions. Include normal and adverse cases. Compare preserved unique obligations, not textual similarity. Read the new front door and vision as continuous prose; reject a rewrite whose important ideas remain obscured by repeated implementation caveats or conflicting definitions. A high-quality rewrite can retain an excellent paragraph; the test is whether the page works, not whether it looks heavily modified.

Use the existing full-checkout `python scripts/check_docs.py`, `pnpm wiki:health`, `pnpm wiki:content-health` and applicable documentation Change guard. Establish baseline, reconcile known exceptions, and classify actual regressions. Missing dependencies or incomplete snapshot mean NOT RUN, not PASS. For a substantial retrieval redesign, follow the existing navigation standard's fresh-context retrieval drills: choose fixed equivalent questions about player intent, mechanical authority, continuity/history, time and current source/evidence; compare wrong detours and correct owner/section before and after. The E1 reconstruction map supplies the questions, not an invented cost benchmark. Record actual checks and limitations. No new runtime guarantee or production certification follows from wiki acceptance.

No new tooling or committee ritual per page. Review the selected E1 architecture as one design; apply standard packet readiness and documentation-only acceptance to its execution. Later meaningful changes in authority or product behavior are selected and reviewed in their own scope.
