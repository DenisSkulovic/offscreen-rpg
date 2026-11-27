# Verification: smallest convincing evidence

**Policy revised for the November 2026 AI-development reset, the November 12 execution-economics direction, and the November 27 construction-first owner decision.** Neither _no checks by habit_ nor _full checks after every edit_ is efficient. Choose the **cheapest check capable of catching a plausible regression at a useful boundary**. The [React/Next playbook](../../research/legacy-engineering/frontend-execution-playbook.md#4-verification-ladder-stop-checking-every-keystroke) (soft-retired; skill entry [.agents/skills/frontend-engineering](../../.agents/skills/frontend-engineering/SKILL.md)) defines V0–V4 staged gates. This remains a pre-POC, not a production release.

This file owns staged verification and evidence scheduling. [Progressive resolution](target-driven-renewal.md) owns how a selected evolution is designed. [AGENTS.md](../../AGENTS.md) owns delivery, severity, Git and the implementation/acceptance split. Do not create a verification ledger, an execution-classification registry, a proof-deferral form, a new lifecycle status or another committee for this policy.

## Construction, integration and qualification

The unit of implementation does not have to be the unit of verification. Optimize total delivery cost and speed to an accepted working evolution, not the number of checks per task or Change.

A Design may use many construction Changes and one or several integration and qualification Changes. Ten inexpensive construction Changes and one substantial qualification Change is a valid shape. It is an example, not a quota. Do not impose a fixed number of stages or a mandatory final testing Change on every Design. A Change may combine these purposes when that is more economical. These purposes are descriptive. They are not new Change kinds, lifecycle states, mandatory fields or agent roles.

| Purpose | What it does |
| --- | --- |
| Construction | Create the decided source, interfaces, modules, packages, configuration, schemas or other artifacts. |
| Integration | Connect constructed components and establish coherent compilation, startup and cross-component behavior. |
| Qualification | Construct or complete maintained verification, run required tests and acceptance scenarios, diagnose failures and repair bounded implementation defects. |

Construction normally dominates the early execution of a substantial new evolution. Integration and qualification concentrate checks at meaningful boundaries. The complete selected evolution must still satisfy its accepted functional, safety, compatibility and verification obligations.

A standalone Change that targets main, or another recorded release target, does not inherit permission to leave that target broken. Give it proportionate executable checks for the defect or behavior it changes. Do not manufacture a multi-stage Design for a settled local fix.

## Intentional incomplete source on an isolated design branch

A construction Change may integrate into its Design implementation branch when the complete subsystem cannot compile, package exports or dependency wiring are unfinished, runtime startup is not yet possible, a later Change supplies the test harness, behavioral tests have not been written or executed, or a cross-package migration is intentionally incomplete.

The planner identifies the expected source postcondition, the downstream dependencies and the relevant limitations. Intermediate incompleteness must be intentional, bounded, recoverable and consistent with the accepted architecture. An intermediate integration branch is not a release candidate.

Do not merge an unfinished evolution into main, deploy it, activate incomplete externally accessible functionality, apply an unsafe migration, use it against protected data, or expose a live financial, provider-spend or authorization path. Preserve main and release branch protection. GitHub code checks may still run on an implementation-branch push and fail for a declared incomplete tree. Record that as the expected limitation. Do not disable those checks, and do not treat that expected failure as a new implementation defect or as a reason to start a debugging campaign.

## Checks belong to a proof boundary

Remove the unconditional requirement that every implementation task provide and execute a positive test, a discriminating negative test, an independently executable proof command, a package build, a typecheck or lint run, a local integration test, or a separate behavioral verification receipt.

A construction task may have no assigned executable checks. Its acceptance may be the expected source artifacts, the exact decided edits, ownership compliance and focused diff inspection. Task readiness depends on settled source, architecture, contract, ownership, implementation and downstream proof information. It does not depend on manufacturing a test for every card.

Specify an executable check when it has useful value at that boundary. Retain an early check when a consequential downstream decision depends on its result, failure would invalidate substantial parallel construction, the operation affects live, protected, durable or shared resources, a trust, permission, transaction or migration boundary becomes operationally exposed, or the accepted architecture requires proof before the intermediate join. The mere presence of security-sensitive or stateful source does not require a live integration test immediately after that code is authored, when the code is isolated and inactive and the essential proof remains scheduled before exposure and final acceptance.

Implementation agents still exercise ordinary engineering judgment and correct obvious local mistakes. They do not expand a construction assignment into a subsystem audit, a test campaign, an architecture review or a broad debugging expedition. In particular they do not automatically run full package or monorepo tests, run a build after every child task, investigate expected failures caused by unfinished downstream work, start services or clusters to verify inactive source, construct tests the planner assigned to later qualification, repeat a successful check without a relevant change, demand independently runnable software from every construction Change, or write an elaborate proof document for source-only work. Inspect an expected intermediate failure against the packet. Use the existing bounded debugging and escalation path for a material contradiction. The coordinator owns Git, the actual diff review, integration, archival and the truthful receipt.

## Change closure and Design proof

A construction Change may use a minimal source-join gate: correct branch and worktree ownership, the specified source edits, focused inspection of the actual diff, confirmation of the expected source postconditions, any explicitly assigned inexpensive check, and an accurate receipt of outstanding limitations and downstream proof ownership. It does not have to demonstrate the complete functionality it contributes to. When that assigned gate passes, archive the packet, commit the closure, integrate into the Design implementation branch and retire the clean worktree. Archive before reporting successful integration. Distinguish source completion, source integration and qualified behavior. Do not claim that a construction Change passed tests that were not assigned or not run. Use the existing receipt, acceptance and Design integration mechanisms. Do not add a lifecycle status for this distinction.

The planner owns the verification strategy for the whole evolution. When preparing the Change graph, decide which source postconditions unlock downstream construction, which intermediate seams need executable checks, which maintained tests should be constructed early, which checks belong in integration or qualification Changes, and which final claims need heavy, live, owner-operated or environment-specific proof. Reuse the existing Design acceptance matrix and implementation plan.

An essential proof may sit at the final qualification boundary when no earlier operation, dependent decision or exposure requires that evidence. Say explicitly which proof is essential before source integration and which proof is essential before final acceptance. Scheduled downstream mandatory verification is not optional assurance and does not need a separate risk exception on each construction Change. Genuine deferral past the accepted evolution's final boundary still needs explicit owner risk acceptance. Do not waive an accepted mandatory safety or correctness proof by relabeling it.

Integration and qualification Changes may complete package and application composition, repair ordinary integration defects, establish compilation and runtime startup, create maintained tests and fixtures, run consolidated normal and diagnostic negative scenarios, run affected regression suites, demonstrate selected failure and recovery behavior, and reconcile demonstrated behavior with canonical documentation and acceptance evidence. Give bounded repair authority for ordinary implementation defects discovered there. Do not open a new committee or Change packet for each ordinary defect inside that authority. A material architectural contradiction, a new product decision, an incompatible authority change or a substantial scope expansion returns to the planner. Name the entrypoints, source owners, integration contracts, test scenarios, acceptance predicates and stop conditions. Split a substantial qualification into bounded Changes. Do not manufacture one unbounded final task in order to defer all complexity.

## Safety that stays mandatory

Preserve authentication, authorization, privacy, durable-data integrity, transaction correctness, concurrency, idempotency, publication, migration, provider-spend and financial safeguards. These guarantees remain mandatory for the accepted evolution and for any existing supported behavior that remains exposed. Construction-first does not authorize a knowingly incorrect implementation, an unsafe live operation, an ignored architectural contradiction or an arbitrary quality reduction. Do not weaken a real safety requirement in order to save tokens.

A known financial-integrity defect or an unsafe live operation stops the affected work. Absence of an unnecessary intermediate test is not a finding. Missing indispensable final acceptance, unsafe intermediate exposure, an impossible proof route or an unowned verification obligation remains a material finding. Reviewers judge the assigned proof boundary. A task with no executable test can be Ready when its source outcome is settled, its construction gate is sufficient and its relevant behavioral obligations have an explicit downstream owner. Confirm that essential proof has not disappeared between Changes. [Readiness review](../references/packet-readiness-review.md) applies that judgment. Critical and High findings still block the affected scope.

## Check cadence when a check is assigned

- **V0 hot editing:** IDE TypeScript/Next diagnostics and occasional `git diff --check`; keep existing dev/Vitest watch processes warm when useful. No full lint/type/build/test on every save.
- **Construction close:** source postcondition and focused diff. Add an inexpensive check only when the packet assigns one.
- **Useful local boundary:** one relevant normal case and, where it discriminates, one negative case, plus targeted lint/typecheck of touched files when that check is useful and the tree is expected to support it. Batch several small edits into one check.
- **V3 integration seam:** when Next SSR/auth, mutation receipts, forms or SSE become operationally connected, run one representative filtered build or real provider-free contract test before dependent work relies on it. Do not defer a security or idempotency negative that protects an exposed boundary until after that exposure.
- **Qualification / V4:** broad unit, lint, type and build checks, and selected real browser or database checks, at the planned qualification boundary. Not an inner-loop default.
- Expensive commands with side effects (notably `pnpm test:focus`) require explicit authorization and inspection of the target database. A skipped or unassigned check is NOT RUN. Never record it as PASS. Source inspection is not a test result and is not certification.

## Choose by risk at the boundary that owns the proof

| Change | Default evidence at its proof boundary | Expand only if needed |
| --- | --- | --- |
| Documentation, rules, skills | Readability and ownership review; check affected links when they changed | `python scripts/check_docs.py` when links or routes moved. `pnpm wiki:health --self-test` when the wiki graph tool changes |
| Construction of source whose behavior is proved later | Expected artifacts, decided edits, ownership and focused diff; name the downstream proof owner | An early check only for a consequential prerequisite or an exposure listed above |
| Standalone fix on main, or a local pure function at its own proof boundary | Focused local test and/or targeted typecheck, including a discriminating negative when behavior can fail | Adjacent package test if its public contract changed |
| Frontend interaction at its proof boundary | Targeted typecheck plus manual visual and interaction check of the changed flow | Browser end-to-end when a user-visible regression has a reliable harness |
| API or application state transition at its proof boundary | Targeted tests including rejection, duplicate/retry and the persistence boundary | Focused integration suite after verifying the test database and build state |
| Storyteller prompt, context or retrieval | Exact packet or deterministic fixture comparison; preserve the baseline | One carefully authorized live run only when offline evidence cannot answer |
| Migration, outbox, clock, billing or permission, once the boundary is exposed or accepted | Deterministic invariant checks and the narrow integration path, including refusal and replay | A wider suite when shared state semantics genuinely changed |

**No meaningless ceremony:** do not run a whole monorepo build for a Markdown edit, and do not format unrelated files. Where a focused test is missing at a boundary that needs one, use a small static or invariant inspection and report the evidence gap. Do not manufacture a test framework for a one-off task, and do not manufacture a test for a construction task whose proof is already owned downstream. Do not rerun the same failing broad suite without a concrete fix.

## Commands and environment

- Formatting of edited files, when format is an assigned or useful local check: `pnpm exec prettier --check <paths>`; formatting fix only of owned files: `pnpm exec prettier --write <paths>`.
- Web-only typecheck without a production build: `pnpm --filter @offscreen/web typecheck` (Next `typegen`, incremental `tsc`). Cross-package typecheck when needed: `pnpm exec turbo run typecheck --filter=@offscreen/<package>` (builds workspace dependencies).
- Narrow pure package tests: `pnpm exec turbo run test --filter=@offscreen/game` (or `@offscreen/documents`); inspect the selected scripts. Current Turbo `test` depends on the **same-package `build`**.
- Repository-wide checks at a qualification or V4 boundary when warranted, not after each construction edit: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- `pnpm test:focus -- <suite> [test-name]` builds the integration workspace, **resets `offscreen_auth_test`**, and removes provider keys and opt-in from its test environment. Read the wrapper before first use.
- `pnpm db:reset:test`, baseline generation, Docker startup, browser installs and Story mode are **not** reflexive verification. Understand prerequisites and side effects first.

Node, pnpm, Docker/Temporal and Postgres are not interchangeable. Never claim a test is green based on an old `dist/` build. A currently failing unrelated check remains a known baseline problem; distinguish it from a failure caused by this change, and from an intermediate failure the packet already expected.

## Evidence receipt

Report **what ran**, pass, fail or blocked, what did not run, and any actionable defect. For a construction close, name the source postcondition and the Change or Design boundary that owns the remaining proof. Review the actual diff, including relevant failure and retry paths when those paths are in scope. Code style, typechecking, tests, gameplay quality and human acceptance are separate claims. Persist still-relevant findings, limitations and unrun residual assurance in the affected durable technical owner or code-adjacent README under [durable engineering knowledge](../../REPOSITORY-STRUCTURE.md#durable-engineering-knowledge), with evidence and the next proof owner. Update the record when proof lands. A scheduled joint proof remains owned by its acceptance boundary and does not become a separate construction gate.

A required test that did not run is NOT RUN. Name its assigned proof boundary. Do not represent it as PASS.

Automated tests and CI must be **provider-free**. Never take a paid route merely to satisfy verification. Consult `spending.md` before any provider-facing experiment, including a run labeled free. A missing charge is not evidence of free inference.

## How the scenarios resolve

| Case | Result under this policy |
| --- | --- |
| Ten construction Changes join an isolated Design branch with minimal checks. An eleventh Change completes integration and required qualification. | Permitted. The eleventh Change owns the scheduled proof. Each construction receipt states its limitations. |
| A source-only package Change cannot compile because a later Change supplies the dependency. | Permitted to close on the design branch after the source gate. Do not open a debugging campaign for that expected failure. Do not call the package tested. |
| A consequential interface assumption must be verified before five dependent Changes proceed. | The focused prerequisite check stays early. |
| A financial or authorization component is constructed while isolated and inactive. | Permitted. Essential positive and negative verification is assigned before exposure and final acceptance. |
| A known financial-integrity defect or an unsafe live operation is discovered. | Stop the affected work. Construction-first does not waive it. |
| A standalone bug fix targets main. | Proportionate executable checks on that Change. No manufactured multi-stage Design. |
| Final qualification finds an ordinary bounded integration defect. | The authorized qualification agent repairs it inside the stated repair authority. No new architecture defense for that ordinary defect. |
| A required test has not run. | The receipt says NOT RUN and names the assigned proof boundary. It is not PASS. |
