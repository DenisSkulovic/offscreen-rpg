# Planning artifact quality | design dossiers and Change packets

**Mandatory admission and review standard.** Applies to authors, maintainers and independent reviewers of active Designs and Changes, including repaired submissions. The aim is a coherent current engineering deliverable that can be executed with minimal avoidable rework, not a perfect document. [Finding severity](../../AGENTS.md#finding-severity-and-blocking) decides what blocks. Design freedom and rigorous technical proof remain mandatory. Existing design, Change, source-quality, authority and safety standards still apply.

## 1. Two artifacts, different readers

| | Design dossier | Change packet |
| --- | --- | --- |
| Purpose | Discover and defend the best bounded target | Deliver one decided, source-grounded, independently verifiable outcome |
| Reader | Designer, owner, independent architecture committee | Implementation coordinator and bounded workers; independent packet committee |
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

### Change profiles (bounded execution)

These bands are planning signals. Exceeding one prompts a look at scope and readability. It does not by itself block readiness, commission or review.

| Scale | Actual executable tasks | Current planning documents | Current prose | Estimated active implementation |
| --- | ---: | ---: | ---: | --- |
| Small | 1–2 | 1–3 | up to 8 KiB | 2–5 min |
| Standard | 3–5 | 3–6 | 8–20 KiB | 5–10 min |
| Upper end | 6–7 | 6–8 | 20–35 KiB | 10–15 min |

**Default boundaries.** Prefer exactly one independently measurable outcome. **Seven actual executor tasks is a strong default**, including independently dispatched subcards, join tasks and nested assignments. T05.1–T05.9 count as nine, not one. A tiny direct edit counts as one assignment without TASKS.md. One parent commission is one Change. Do not hide a larger campaign inside subcards or auto-next.

A narrowly justified exception may exceed seven tasks when splitting the outcome would add coordination, break an atomic correctness boundary, or increase implementation and integration risk. The exception still needs bounded child context, clear ownership, manageable dispatch and meaningful acceptance. Do not use it to restore a monolithic packet. Do not manufacture several Changes merely to satisfy the count when one coherent bounded Change is safer and more economical.

Normal target 5–10 minutes of active implementation includes orientation, coordination, implementation, focused inexpensive tests, review and commit. It excludes dependency waits, substantial builds and heavy acceptance. These are estimates, not timers or measured results. Above the band, consider scope. Never skip essential security, financial or data-integrity checks, and never leave an unsafe partial state, in order to meet a clock. If the outcome cannot be executed as a bounded Change, simplify it or choose a separately authorized route. Do not delegate the unresolved architecture to the implementation agent.

Above eight current documents or 35 KiB of current prose, consider consolidation, an indispensable contract that cannot be factored, and whether the reading routes stay bounded. A large artifact is a High finding when it prevents reliable review, hides an important decision, forces unbounded execution context or creates contradictory authority. A slightly oversized but coherent and actionable artifact is Medium or Low. No exception permits multiple unrelated outcomes, contradictory instructions or unresolved design. Do not pad a packet toward a lower band.

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

The implementation agent implements, constructs specified tests, runs cheap focused positive and diagnostic negative checks, reviews changed code and commits when it has write access. The acceptance lead and owner own substantial acceptance, including broad suites, multi-service, live, fault, recovery and long or costly proofs. Keep implementation complete distinct from acceptance complete; no extra Change solely for owner-operated no-diff proof. Required acceptance remains binding before Done/integration under existing acceptance-tier rules.

### Measurement receipt (existing checkpoint/review; no new file)

At an exact candidate SHA, record the measurements that materially affect the verdict. A recursive listing such as `git ls-tree -rl <candidate> -- <folder>` can supply tracked file count and bytes, current planning document count and bytes, the largest current files, separate research, evidence and script bulk, the normative routes, and the independent outcome count. For a Change, also record the actual task count, the parent and largest child mandatory routes, a rough active-implementation estimate with its assumptions, and the heavy-acceptance owner. A full listing in the receipt is unnecessary. Count active instructions wherever they are stored. Do not relabel a live contract as evidence. If critical content cannot be inspected, record UNVERIFIED. Do not fabricate timing or token measurements. Do not create another inventory file, script or approval step to police formatting.

Scope reconsideration means consolidate, simplify with the necessary ratification, or split into independently safe outcomes with shared contracts and a dependency graph. Assign every mandatory acceptance and preservation obligation to an explicit owner. Many small files or renamed nested tasks do not cure excessive scope. A count that exceeds a band is a signal. Classify the consequence. Do not block solely because a recommended number was passed.

Other smells: giant paragraphs, repair/recovery/amendment headings as current instructions, repeated warnings, dead anchors, raw terminal/source dumps, generic AI boilerplate, tiny files with no distinct purpose, overlapping current contracts, recursive mandatory reading, proof without observable outcomes. Investigate smells; do not ban keywords.

## 5. Concrete examples

| Reject | Accept |
| --- | --- |
| "R4 says 900s. R5 overrides R4 to 1500s. Repair17 suspends R5. See Repair29 appendix for new ceiling." | One current deadline table with unit, owner and arithmetic; explicitly gated candidate in readiness if not accepted. Prior revisions linked by SHA. |
| "T05: Read INTERFACES.md (150 KB), all amendments, then migrate inventory." | "T05: inventory.mjs::collectInventory; exact normalized row shape in contracts/inventory.md#output; read tests/inventory.test.mjs; add duplicate-history negative." |
| SOURCE-MAP grows by appending each grep and every repair's source citations. | Current caller → callee → invariant → edit/test rows, inspected SHA, named gaps. Raw command output in evidence or Git, not the required reading path. |
| An agent adds "the old plan is superseded" to the bottom of an unchanged contradictory algorithm. | Replace that algorithm, update its caller/test/task/proof references, retain old revision in history. |
| A reviewer praises completeness because the folder contains every discussion and 40 review repairs. | If the current contract is contradictory or forces unbounded execution, classify that consequence and require one coherent current contract. Do not stop a still-reviewable submission after the first formatting defect. |
| A long design research comparison or exact state migration table is called unacceptable solely because it is long. | Keep indispensable evidence or mapping, separate from normative route; justify size and point directly to relevant sections. |
| Replace rigorous safety and failure proof with "use best practices" to satisfy a word target. | Keep exact authority, transaction/custody, failure semantics and discriminating negatives; remove only noise, redundancy or unnecessary mechanisms via ratification. |
| Twenty 8 KiB files and nineteen subcards renamed T01–T05. | Count aggregate prose and actual assignments. Block only when the result prevents reliable review or bounded dispatch. |
| Coherent 70 KiB subsystem Design yields five Changes. | Accept if its scope and proof cohere; independently review each bounded Change. |
| Three-page distributed payment Design omits transaction ownership. | Reject insufficient substance; compact does not mean underspecified. |

## 6. Independent review: submission quality

Before the expensive technical review, verify the candidate SHA, open the current front door, check file purposes, and follow the actual normative and mandatory execution routes. Inspect the active artifact, not only the passages the author changed. Record the measurements and smells that affect the verdict. Reconsider scope whose size prevents reliable review or bounded dispatch, rather than reformatting it. For a Change, record the parent route and the per-task context disposition as part of the existing child and parent checks. Do not write a second audit tome.

Classify submission defects with the [severity policy](../../AGENTS.md#finding-severity-and-blocking). The following are blocking when their stated consequence is present, and not merely because a number or a guideline was missed:

- Contradictory or hidden normative instructions, or an append-only patch layer that the executor must reconstruct.
- Pervasive duplicate material that prevents a coherent defense or a bounded dispatch.
- A missing front door or file role that hides the selected contract.
- Obsolete task or proof instructions presented as current.
- An unresolved architecture choice disguised as a task.
- An unresolvable anchor or a mandatory unbounded research read.
- Evidence or history presented as selected authority.
- Several independent outcomes whose combination prevents one bounded execution and acceptance.
- A task count or document size whose effect is unreliable review, hidden decisions, unbounded child context or contradictory authority.

A slightly oversized, coherent and actionable artifact is Medium or Low. A label of "minor style" does not excuse a Critical or High consequence. Missing access to indispensable material is UNVERIFIED or EVIDENCE-GATED, never PASS.

Stop the formal review early only when missing access, fundamentally incoherent instructions, or another decisive prerequisite makes further meaningful review impossible or unreliable. Do not stop merely because one correctable deficiency already justifies a negative verdict. Report the complete discoverable set.

Design verdicts remain REVISE AND RE-DEFEND, EVIDENCE-GATED, or DEFENDED. A Change verdict remains PLANNER-BLOCKED, UNVERIFIED, or READY, including READY (dependency-gated). Record each blocking finding with its path, evidence, consequence and required repair. Record deferred findings without starting a repair cycle for them. Do not award a positive technical verdict that ignores an open Critical or High finding. The committee or packet reviewer records the receipt under the existing review standard.

On a later pass, inspect the corrected text and its dependents. Reuse unaffected review evidence. Verify that the old text was actually fixed, not that a new paragraph claims it was fixed. A localized correction does not require rereading every unaffected section. Preserve completed findings. Do not grow a normative repair log.

## 7. Repair and enforcement boundary

The author fixes the current files, not a shadow packet or a second architecture dossier. Address the known Critical and High findings together: identify the current owner, reconcile each affected claim and negative proof, replace obsolete text, and repair links. Leave Medium and Low findings deferred. If a design is unnecessarily complicated in a way that prevents safe execution, return to its owner and ratify a smaller mechanism. Editorial cleanup does not waive an accepted guarantee. Existing archives are historical and are not retroactively reformatted. The engineering handbook follows current-state editing, one policy owner, short root routes and conditional specialist references. Do not create another policy file when the existing owner can be edited.

This is a review and authoring contract, not an automatic parser or token meter. Existing link and quality guards remain complementary. Passing a word count does not prove quality. Do not add a mandatory script, manifest, receipt file or approval step merely to enforce formatting. The reviewer owns the verdict, the planner owns the blocking repair, and the implementation agent does not pay to interpret an incoherent packet. Open work is subject to this standard at its next formal review or new commission. Already commissioned work stops only for an actual Critical or High contradiction or safety failure, not for a cosmetic retrofit.
