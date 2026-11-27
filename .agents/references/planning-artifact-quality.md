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

During exploration, provisional alternatives, raw measurements and unfinished specimens are legitimate. At any checkpoint label their status and keep the current route honest. For formal defense, one coherent target and feasible proof matrix must be readable without reconstructing the investigation. Use the flexible Design profiles below; no artificial minimum length or one-size-fits-all investigation.

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

## 4. Submission scale and measurement

**Hierarchy:** Undertaking = transformation; Design = coherent engineering problem; Change = one independently measurable lasting outcome; embedded T-ID = bounded executor assignment. A Design may produce many Changes. Standalone operational Tasks keep their existing taxonomy.

### Design profiles (flexible, no minimum quotas)

| Scale | Current planning documents | Current planning prose | Typical resulting Changes | Scope |
| --- | ---: | ---: | ---: | --- |
| Focused | 1–4 | up to 15 KiB | 1–2 | Narrow mechanism |
| Standard | 4–8 | 15–50 KiB | 2–5 | Coherent subsystem |
| Major | 8–15 | 50–100 KiB | 4–10+ | Tightly coupled mechanisms |

Role-size guidance (combine roles freely): overview 1–4 KiB; target 5–20; domain contract 3–15; alternatives 2–10; source/integration analysis 3–15; acceptance strategy 3–12; committee verdict 2–10 KiB. Research, specimens, actual experimental evidence and historical verdicts may be as extensive as necessary, outside the mandatory normative route. Formal defense needs sufficient substance, not a minimum page count.

Above 15 current planning documents or 100 KiB current prose, or when independent architectural domains, owners or acceptance goals emerge, reconsider scope before defense: consolidate redundancy, simplify mechanisms or split into separately defensible Designs with shared contracts. Explicitly justify an indivisible large Design. Do not split safety/consistency boundaries artificially.

### Change profiles (strict bounded execution)

| Scale | Actual executable tasks | Current planning documents | Current prose | Estimated active Cursor implementation |
| --- | ---: | ---: | ---: | --- |
| Small | 1–2 | 1–3 | up to 8 KiB | 2–5 min |
| Standard | 3–5 | 3–6 | 8–20 KiB | 5–10 min |
| Upper end | 6–7 | 6–8 | 20–35 KiB | 10–15 min |

**Hard limits:** exactly one independently measurable implementation/documentation outcome; **at most seven actual executor tasks**, including independently dispatched subcards, join tasks and nested assignments. T05.1–T05.9 count as nine, not one. A tiny direct edit counts as one assignment without TASKS.md. One parent commission = one Change; no multi-packet campaign, batching or auto-next to evade limits.

Normal target 5–10 minutes active Cursor work includes orientation, coordination, implementation, focused inexpensive tests, review and commit. Excludes dependency waits, substantial builds and heavy acceptance. Above 10 minutes reconsider; above 15 presumptively reject without a specific bounded-effort justification. These are estimates, not timers or measured results. Never skip essential security/financial/data-integrity checks or leave unsafe partial state to meet a clock. If an indivisible outcome cannot fit the hard task ceiling, return to Design for safe smaller realization or select a separately authorized non-Cursor execution route. Do not waive the ceiling for a larger Cursor packet.

Above eight current documents or 35 KiB current prose presumptively reject unless an indispensable contract/mapping, inability to safely consolidate or factor it, and bounded reading routes are demonstrated. No exception for multiple outcomes, task ceiling, contradictory instructions or unresolved design. No padding to profile lower bounds.

| Change file | Typical KiB | Reconsider above KiB |
| --- | ---: | ---: |
| CHANGE.md | 1–3 | 5 |
| TASKS.md | 2–6 | 10 |
| SOURCE-MAP.md | 2–6 | 10 |
| EXECUTION.md / INTERFACES.md | 2–8 | 12 |
| PROOF.md | 2–6 | 10 |
| READINESS.md / PLAN.md (each) | under 2 | 4 |

Additional task contracts count in the totals. Executable fixtures/scripts count separately in tracked inventory; they cannot hide normative instructions. Inspect active Markdown over 20 KiB; >=50 KiB is a severe smell. Size alone neither proves nor disproves quality.

### Task and reading budgets

Normal card 150–350 words; above 500 reconsider. Usually 1–3 source write owners plus focused tests, 2–5 exact initial anchors, one decided edit or precisely bounded factual verification, a few minutes. No open-ended investigation or architectural choice. Larger atomic edits require a reason; file count must not break consistency.

Parent front door + dispatch index target <=1,500 words. Child mandatory packet-authored route (card plus all required linked sections, including cross-folder references) target below 1,000 words. Count unique required text, not link labels; exclude real source/tests and generally applicable rules, but not planner instructions hidden in source comments. If above target, localize or justify indispensable content and bounded route. Not runtime token limits.

Cursor implements, constructs specified tests, runs cheap focused positive and diagnostic negative checks, reviews changed code and commits. ChatGPT + owner own substantial acceptance, including broad suites, multi-service/live/fault/recovery and long/costly proofs. Keep implementation complete distinct from acceptance complete; no extra Change solely for owner-operated no-diff proof. Required acceptance remains binding before Done/integration under existing acceptance-tier rules.

### Measurement receipt (existing checkpoint/review; no new file)

At exact candidate SHA recursively enumerate tracked files (e.g. `git ls-tree -rl <candidate> -- <folder>`). Report total tracked file count/bytes; current planning document count/bytes (UTF-8, KiB=1024 bytes); largest current files; separate research/evidence/history and specimen/script count/bytes; normative routes; independent outcome count. For Changes additionally report actual task count (all subcards), parent and largest child mandatory word counts, rough active implementation estimate with assumptions and heavy acceptance owner. A complete inventory is required, not a full listing in the receipt. Count active instructions wherever stored, even non-Markdown; no relabeling live contracts as evidence. Reviewer verifies measurements or records UNVERIFIED if critical inventory unavailable. No fabricated timing/token measurements.

Scope reconsideration means consolidate, simplify with necessary ratification, or split into independently safe outcomes with shared contracts and dependency DAG. Assign every mandatory acceptance/preservation obligation to an explicit owner. Twenty small files or renamed nested tasks do not solve excessive scope.

Other smells: giant paragraphs, repair/recovery/amendment headings as current instructions, repeated warnings, dead anchors, raw terminal/source dumps, generic AI boilerplate, tiny files with no distinct purpose, overlapping current contracts, recursive mandatory reading, proof without observable outcomes. Investigate smells; do not ban keywords.

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
| Twenty 8 KiB files and nineteen subcards renamed T01–T05. | Reject: count aggregate prose and actual assignments; repartition by safe outcomes. |
| Coherent 70 KiB subsystem Design yields five Changes. | Accept if its scope and proof cohere; independently review each bounded Change. |
| Three-page distributed payment Design omits transaction ownership. | Reject insufficient substance; compact does not mean underspecified. |

## 6. Independent review: submission quality is a hard gate

Before expensive technical review, reviewer verifies candidate SHA, recursively inventories the submitted folder, opens current front door, checks file purposes/status, scans all active instructions and oversized files, and follows actual normative and mandatory execution routes. Inspect the whole active artifact, not just the author's changed passages. Record section 4 measurement receipt, concrete smells and route findings; reconsider excessive scope rather than reformatting. For a Change record parent route and per-T-ID context disposition as part of existing G3/G4; no new audit tome.

**Hard reject** if a Change has multiple independent outcomes or more than seven actual tasks, or if the current submission has contradictory or hidden normative instructions; append-only patch layers requiring reconstruction; pervasive irrelevant/duplicate material that prevents coherent defense or bounded dispatch; missing front door/file roles; obsolete task/proof instructions presented as current; unresolved architecture choices disguised as tasks; unresolvable anchors or mandatory unbounded research reads; or evidence/history presented as selected authority. A "minor style" label cannot excuse any of these. Excessive Change size/effort presumptively rejects without explicit bounded justification; Design scale triggers require scope reconsideration. Missing access to critical material is UNVERIFIED/EVIDENCE-GATED, never PASS.

Design verdict: REVISE AND RE-DEFEND (or EVIDENCE-GATED if access/evidence is missing). Change verdict: PLANNER-BLOCKED (or UNVERIFIED). Record a concise concrete finding, affected paths/sections, example counterexample and required repair. Stop formal review at a decisive hard submission failure; technical observations are optional and non-accepting. Commit design verdict per committee protocol; packet reviewer records the exact-candidate receipt under the existing review standard. Do not award a positive technical verdict in lieu of this gate. In a subsequent pass inspect the **entire revised current folder** again, not just prior finding IDs; assess whether actual old text was fixed, not whether another paragraph says it was fixed. Preserve completed independent findings, not an ever-growing normative log.

## 7. Repair and enforcement boundary

Author fixes the current files, not a shadow packet or second architecture dossier. Inventory → identify current owners/authority → reconcile each substantive claim and negative proof → replace obsolete text → repair links/anchors → repeat cold reading and technical review. If a design is unnecessarily complicated, return to its owner/design and ratify a smaller mechanism; editorial cleanup alone must not waive accepted guarantees. Existing archives are historical and not retroactively reformatted. The engineering handbook itself follows current-state editing, one policy owner, short root/always-loaded routes and conditional specialist references. Do not create another policy file when the existing owner can be edited. Open work is subject to this standard before its next formal review or new commission; existing commissioned work stops only at an actual material contradiction/safety failure, not for cosmetic retrofits.

This is a required review/authoring contract, not an automatic parser or token meter. Existing link/quality guards are complementary. No claim that passing a word count proves quality; no new mandatory script, manifest, receipt file or approval step merely to enforce formatting. The committee owns rejection, the planner owns repair, and Cursor does not pay to interpret an incoherent packet.
