# Planning artifact quality | design dossiers and Change packets

**Mandatory admission and review standard.** Applies to authors, maintainers and independent reviewers of active Designs and Changes, including repaired submissions. The aim is a coherent current engineering deliverable, not a well-documented history of the agent's thought process. Design freedom and rigorous technical proof remain mandatory. Existing design, Change, source-quality, authority and safety standards still apply.

## 1. Two artifacts, different readers

| | Design dossier | Change packet |
| --- | --- | --- |
| Purpose | Discover and defend the best bounded target | Deliver one decided, source-grounded, independently verifiable outcome |
| Reader | Designer, owner, independent architecture committee | Cursor parent and bounded implementation children; independent packet committee |
| Shape | Flexible; problem-specific research, alternatives, specimens, experiments and decision records | Standardized roles and direct execution routes; no unresolved architecture homework |
| Current front door | README.md or existing clearly named entrypoint: scope, posture, status, current target/unknowns, next decision, links by purpose | CHANGE.md: selected outcome, authority, baseline, scope/exclusions, execution/acceptance route, current state |
| History | Research and actual experimental/committee receipts may be substantial, explicitly non-normative | No research diary in executable contracts; historical receipts are separate, compact and optional reads |

During exploration, provisional alternatives, raw measurements and unfinished specimens are legitimate. At any checkpoint label their status and keep the current route honest. For formal defense, one coherent target and feasible proof matrix must be readable without reconstructing the investigation. No prescribed universal number of documents, file names beyond established required roles, artificial word quota or one-size-fits-all investigation.

## 2. Current state, not an edit log

**Edit the owning statement in place.** When a decision changes, find its current owner, replace affected sentences, tables, examples, commands and tests, reconcile dependents and remove obsolete contradictory instructions. For a new material candidate distinguish it from accepted authority; maintain one current candidate for review, not a dispatchable algorithm while its authority remains unresolved. Block the affected scope until ratification. Do not silently promote an amendment.

Git preserves old text. Use a full commit SHA/path link when provenance matters. Real research, rejected alternatives with enduring lessons, measured results, unique counterexamples, committee verdicts and immutable execution receipts must not be lost; retain them in clearly labeled historical/research/evidence locations or promote unique knowledge to its proper permanent owner. Historical verdicts are evidence, not a second normative contract. Preserve stable finding IDs and current dispositions in one concise ledger when needed. No append-only repair diary in TARGET, CHANGE, TASKS, EXECUTION, INTERFACES, SOURCE-MAP or PROOF.

Every maintained file has one purpose, one audience, clear ownership and an entry route. A summary may repeat a critical invariant briefly; never copy a complete contract into another active file. A reader must not follow a precedence chain of amendments, exceptions, suspensions and supersessions to determine today's behavior. Actual code, accepted spec, proposed change and test evidence are distinct. Use meaningful headings, tables for matrices, numbered steps for ordered algorithms, fenced code for copyable commands. Split by semantic responsibility and bounded reader context, not merely by character count; moving the same sludge into many files is not a fix.

## 3. Execution packet shape

Use established packet profiles. A tiny PATCH or exact documentation/VERIFY route may fit in CHANGE.md alone; never manufacture empty companions. For a material multi-task delegated Change the following roles are required. Use these established filenames for their roles; split large details into named sections or task-scoped companions, linked directly. Equivalent compact canonical references can supply technical details, not missing decisions.

| File | Required contents and exclusions |
| --- | --- |
| CHANGE.md | Short front door, selected outcome, baseline/authority, scope and exclusions, permissions, route to tasks and proof, impact/closure obligations. Not a thesis. |
| TASKS.md | Compact DAG/dispatch index, stable T-IDs and narrow task cards. Exact prerequisites, write owners, 2–5 initial anchors with file/symbol/heading, decided edits, positive and diagnostic negative command/cwd, stop condition, receipt. Parent selects one card, not a chapter. |
| SOURCE-MAP.md | Verified current SHA, affected code/caller/export/data/test/ownership graph, concrete source facts, migration disposition and named gaps. No pasted source dumps, investigation chronology or invented line anchors. |
| EXECUTION.md / INTERFACES.md or directly indexed contracts | One selected algorithm, exact interfaces, invariants, ordered edit steps and failure/permission behavior not already owned by canonical specification. No competing plans or old task recipes. Only needed if cards and precise canonical anchors do not suffice. |
| PROOF.md | Falsifiable acceptance matrix, exact commands/fixtures, positive and discriminating negative outcomes, deadlines where needed, prerequisites, executor split and stop/cleanup. Link substantial executable scripts; do not embed sprawling generated shell/Python programs. Evidence links and current result status, not full log output. |
| PLAN.md / READINESS.md, if needed | Single current checkpoint, blockers, affected task and owner, next action; compact actual verdict/receipt links. No repeated dispatch warning on every task, no chronological repair dump. |

A task card is an executable assignment, not a compressed essay. Keep task-specific source anchors and contract sections directly usable at the named revision. The reviewer follows the actual transitive **mandatory** read route, including prerequisites and referenced sections. A named anchor into a huge file is not bounded unless the section/range is precise and the content there is sufficient. No "read all design documents", "find every caller", "choose a reasonable retry strategy" or "resolve differences between revisions" for a cheap executor.

## 4. Size and retrieval smells (diagnostic bands, not arbitrary ceilings)

Measure actual tracked artifact sizes at the candidate SHA, for example `git ls-tree -rl <candidate> -- <folder>`; separate current prose from specimens/scripts and historical evidence. Inventory recursively, including subfolders. For active Markdown, inspect every file over ~20 KiB; >=50 KiB is a severe smell; >=100 KiB total active Markdown triggers whole-folder consolidation review. Size alone is neither automatic failure nor acceptance. A long, indispensable reference (e.g. a large schema mapping or evidence table) can pass with an exact owner, coherent structure, reason for size and bounded read routes. No exceptions for overlapping/conflicting instructions, unbounded required context or obsolete plans.

Default reading targets: first-screen parent brief plus dispatch index ~1,500 words or less; one card <900 words (usually much less); packet-authored mandatory child context including referenced contract excerpts ~2,000 words or less, excluding real source/tests and generally applicable rules. These are planning budgets, not runtime context limits. If exceeded, report actual route size and why each additional section is indispensable; shorten or split by meaningful outcome if possible. Do not omit safety/negative proofs to hit a number. A coherent complex assignment can exceed the target; a short contradictory one fails.

Other smells: a huge unbroken paragraph; every heading begins "Repair", "Recovery", "Amendment" or "Suspended"; repeated warnings and lists of options; dead anchors, unreachable files, arbitrary duplicate status tables; raw terminal dumps; pasted long source excerpts; nested cross-references forcing readers to assemble a contract; generic AI boilerplate that applies to any system; "proof" consisting of a long checklist without observable outcomes. A smell is a reason to inspect, not a keyword ban.

## 5. Concrete examples

| Reject | Accept |
| --- | --- |
| "R4 says 900s. R5 overrides R4 to 1500s. Repair17 suspends R5. See Repair29 appendix for new ceiling." | One current deadline table with unit, owner and arithmetic; explicitly gated candidate in readiness if not accepted. Prior revisions linked by SHA. |
| "T05: Read INTERFACES.md (150 KB), all amendments, then migrate inventory." | "T05: inventory.mjs::collectInventory; exact normalized row shape in contracts/inventory.md#output; read tests/inventory.test.mjs; add duplicate-history negative." |
| SOURCE-MAP grows by appending each grep and every repair's source citations. | Current caller → callee → invariant → edit/test rows, inspected SHA, named gaps. Raw command output in evidence or Git, not the required reading path. |
| An agent adds "the old plan is superseded" to the bottom of an unchanged contradictory algorithm. | Replace that algorithm, update its caller/test/task/proof references, retain old revision in history. |
| A reviewer praises completeness because the folder contains every discussion and 40 review repairs. | Reviewer rejects unreadable submission immediately, identifies conflicting sections and requires one coherent current contract. |
| A long design research comparison or exact state migration table is called unacceptable solely because it is long. | Keep indispensable evidence or mapping, separate from normative route; justify size and point directly to relevant sections. |
| Replace rigorous safety and failure proof with "use best practices" to satisfy a word target. | Keep exact authority, transaction/custody, failure semantics and discriminating negatives; remove only noise, redundancy or unnecessary mechanisms via ratification. |

## 6. Independent review: submission quality is a hard gate

Before expensive technical review, reviewer verifies candidate SHA, recursively inventories the submitted folder, opens current front door, checks file purposes/status, scans all active instructions and oversized files, and follows actual normative and mandatory execution routes. Inspect the whole active artifact, not just the author's changed passages. Record largest active files and aggregate current-prose size (approximate if exact unavailable, with method), distinction from historical/evidence material, examples of smells, and route findings. For a Change record parent route and per-T-ID context disposition as part of existing G3/G4; no new audit tome.

**Hard reject** if the current submission has contradictory or hidden normative instructions; append-only patch layers requiring reconstruction; pervasive irrelevant/duplicate material that prevents coherent defense or bounded dispatch; missing front door/file roles; obsolete task/proof instructions presented as current; unresolved architecture choices disguised as tasks; unresolvable anchors or mandatory unbounded research reads; or evidence/history presented as selected authority. A "minor style" label cannot excuse any of these. Missing access to critical material is UNVERIFIED/EVIDENCE-GATED, never PASS.

Design verdict: REVISE AND RE-DEFEND (or EVIDENCE-GATED if access/evidence is missing). Change verdict: PLANNER-BLOCKED (or UNVERIFIED). Record a concise concrete finding, affected paths/sections, example counterexample and required repair. Stop formal review at a decisive hard submission failure; technical observations are optional and non-accepting. Commit design verdict per committee protocol; packet reviewer records the exact-candidate receipt under the existing review standard. Do not award a positive technical verdict in lieu of this gate. In a subsequent pass inspect the **entire revised current folder** again, not just prior finding IDs; assess whether actual old text was fixed, not whether another paragraph says it was fixed. Preserve completed independent findings, not an ever-growing normative log.

## 7. Repair and enforcement boundary

Author fixes the current files, not a shadow packet or second architecture dossier. Inventory → identify current owners/authority → reconcile each substantive claim and negative proof → replace obsolete text → repair links/anchors → repeat cold reading and technical review. If a design is unnecessarily complicated, return to its owner/design and ratify a smaller mechanism; editorial cleanup alone must not waive accepted guarantees. Existing archives are historical and not retroactively reformatted. Open work is subject to this standard before its next formal review or new commission; existing commissioned work stops only at an actual material contradiction/safety failure, not for cosmetic retrofits.

This is a required review/authoring contract, not an automatic parser or token meter. Existing link/quality guards are complementary. No claim that passing a word count proves quality; no new mandatory script, manifest, receipt file or approval step merely to enforce formatting. The committee owns rejection, the planner owns repair, and Cursor does not pay to interpret an incoherent packet.
