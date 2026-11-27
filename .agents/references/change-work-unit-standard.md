# Change work units: independent planning standard

**Owns:** work-unit admission, lifecycle, impact reconciliation and cross-Change scheduling. [AGENTS.md](../../AGENTS.md) owns shared authority and acceptance; [submission standard](planning-artifact-quality.md) owns scale and artifact roles. [Work taxonomy](../../work/WORK-TAXONOMY.md) and [QUEUE](../../work/QUEUE.md) govern selection.

## Vocabulary and strict inclusion rule

| Unit | Purpose | Home |
| --- | --- | --- |
| Initiative / Undertaking | Coherent transformation spanning work units | Canonical topic or scoped Undertaking |
| Design / investigation | Resolve consequential unknowns and defend target | Design dossier; promote accepted meaning |
| Change | One independently measurable documentation or implementation diff | Change packet |
| Execution slice / T-ID | Bounded subordinate assignment | TASKS or current checkpoint |
| Evaluation / acceptance | Observe already-existing behavior | Evidence or operational Task |
| Direct minor edit | Trivial spelling/link/mechanical correction | Existing owner, no manufactured packet |

Kinds: **implementation** changes executable code, tests, scripts, schemas, migrations or build/runtime configuration; **documentation** changes maintained specs, policy, claim ownership or structure without executable edits. A significant editorial outcome merits a Change; brainstorming, pure evaluation or an unratified requirement does not. Do not invent code to justify docs work. If docs work reveals a needed executable change, return to planner for separately authorized scope.

A planned Change needs an exact intended future delta and falsifiable outcome, not a preexisting diff. "Improve memory" is a program; "distinguish published revisions in the report" is a bounded candidate; "check recall accuracy" is evaluation unless it changes maintained tests/specs.

## Source-rich packet profiles without mandatory preload

[Profiles](change-packet-profiles.md) select investigation/proof emphasis; [submission roles](planning-artifact-quality.md#3-execution-packet-shape) define actual files. Material multi-task delegation needs TASKS, SOURCE-MAP and PROOF, with precise execution contracts where necessary. Tiny single-route work may use CHANGE.md alone. PLAN is a current checkpoint, not a second packet.

## The ideal planning unit

One outcome and reason; accepted authority; verified baseline; exact affected owners and exclusions; normal and discriminating negative acceptance at required tier; risks/permissions; executor, status and next action. For material design inherit its [acceptance matrix](../rules/target-driven-renewal.md#design-verification-with-the-system). Use [verification and closure](../../WORKFLOW.md#9-verification-review-and-the-next-loop) for explicit extended-assurance deferral. No silent waiver.

[Scale](planning-artifact-quality.md#4-submission-scale-and-measurement): normally 5–10 minutes active Cursor work, 1–5 tasks, seven actual assignments maximum. Split independent outcomes, divergent authority/permissions or new design problems; preserve atomic safety/consistency boundaries. Reconsider architecture when a bounded realization is not feasible. Each Change should be independently reviewable and revertible where technically safe.

### Optional planning depth

Only create companions that serve a distinct reader or purpose. Use [packet design](packet-design-manual.md) and [independent readiness](packet-readiness-review.md) for delegated execution. Inspect code craftsmanship at closure, not just green tests; [code quality](../rules/code-quality.md) owns changed-file requirements.

Create all current-sprint packets under `work/changes/open/YYYY-MM-DD--slug/`, including proposed, planner-blocked and dependency-gated work. Deferred work outside the owner-intended execution horizon belongs in backlog; placement is independent of readiness and commission. No cap on number of current-sprint Changes (per-Change size/task limits still apply). QUEUE has one global selection, catalog is not a selector. Retire Done/Cancelled after reconciliation to `archive/YYYY-MM/<program>/` (admin, chamber, eng, experience, observability, storyteller, web, other), repair links and preserve provenance. [Repository structure](../../REPOSITORY-STRUCTURE.md) owns backlog and retirement details.

## Batch execution and parallel Change orchestration (2026-11-19)

Planner looks for independent outcomes before presenting serial schedule. Each separately commissioned Change uses its own Cursor parent, branch and linked worktree. One parent never dispatches a whole other Change to a child. Freeze common contracts and dependencies; one integration custodian serializes shared docs/queue/STATUS, migrations and squash joins. [Parent procedure](bounded-parent-orchestration.md#mandatory-change-branch-policy) owns Git, child dispatch, checkpoints and closure.

Record compact schedule in existing Change catalog or Undertaking index: Change IDs, prerequisite IDs, owned paths/headings, execution class (`parallel-write`, `parallel-research`, `serial-shared-resource`, `depends-on`), shared resources, verification gates and custodian. Each Change names safe peers and collisions. Explicitly authorized bundle may record Active batch IDs and coordinator in catalog, not another selector or permission for Proposed work.

Disjoint ownership includes generated/build outputs, lockfiles, migrations, package exports, test fixtures, ports, Kind contexts/namespaces, cluster operators, DB schemas, PVCs and Helm releases. Separate paths alone do not establish isolation. Read-only research and independent isolated checks may proceed while unrelated install waits. Serialize overlaps; never split atomic work for parallelism.

At join recheck HEAD, dependency receipts, version compatibility, collision-free diff, four-plane reconciliation and relevant link/guard/cross-service checks at assigned tier. ChatGPT/owner own substantial acceptance. Shared-checkout children do not stage/commit; parent owns receipts and integration. Stop on unresolved contract or ownership collision; no auto-next.

## Documentation-only Change admission and proof

A docs-only packet is a **Change** when it has one bounded canonical-text outcome (for example, making selected vs illustrative first-playable acceptance unambiguous), exact affected headings, a before/after claim map, identified dependents, and a falsifying counterexample. It is **not** a Change for exploratory brainstorming, a pure benchmark run, a trivial typo or an unratified product-policy choice. When a proposed new requirement is found, preserve it as Proposed and ask for owner ratification rather than inserting it into selected canon.

The same `planned-impact.v1` table uses **Product, Technical, Code, Related** rows; `Code | unchanged because no executable modifications are in scope; negative: ...` is legitimate and *required* for documentation Changes. A docs-only Change may have Product changed and Technical unchanged, vice versa, or both changed; each unaffected plane names its concrete reason. Reconciliation rows use **document revision and inspected source SHA or “no source behavior changed”**. Run link/heading health, semantic before/after counterexamples, and independent review of normative meaning. Code-oriented integration tests are optional and must not be invented to make the packet look complete.

**Guard compatibility:** use `pnpm wiki:change-guard --mode plan` and `--mode close` with a docs-only fixture when changing guard behavior, including a changed canonical doc and a reasoned unchanged Code row. If the guard rejects it, address that narrow tooling defect separately; do not downgrade the new docs Change standard or mask a failing gate. 

## Structural document operations

A documentation Change that creates, splits, merges, moves, retires, or deliberately leaves a page untouched says so in the planned-impact table and in [Document shape](../skills/change-workflow/assets/CHANGE.md#document-shape). Implementation Changes omit that section. The tokens are uppercase: `CREATE`, `SPLIT`, `MERGE`, `MOVE`, `RETIRE`, and `NO-OP`.

A Markdown path that does not exist yet is valid in plan mode only when the same planned-impact cell says `CREATE` before that path, or when a `SPLIT` or `MOVE` cell gives `old.md#heading -> new.md#heading`. A misspelled path with neither declaration fails. `MERGE` names an existing survivor. The arrow is the declaration; a sentence that only says the page will move does not name a destination.

At close, an optional [migration receipt](../skills/change-workflow/assets/CHANGE.md#document-shape) records `old.md#heading` to a successor `path#heading`, `retired`, or `unchanged`. The unique-claim cell must still be present on a successor. A `not ratified:` sentence must not reappear on a selected product or technical page. Created paths must exist, and inbound links to a declared path must resolve. A `NO-OP` path must stay out of the diff. The guard reuses the wiki graph's broken-anchor results. It does not crawl the repository a second time, and it does not decide that a product sentence is true.

## Lifecycle and permissions

| State | Meaning |
| --- | --- |
| Proposed | Candidate; missing agreement, source audit or ratification; no implementation |
| Ready | Exact scope/authority, reviewed planned-impact.v1, source and proof gates; may be dependency-gated. Execution still requires commission. |
| Implementing | Authorized bounded delta underway |
| Verifying | Edit exists; required proof/review remains (including IMPLEMENTED — ACCEPTANCE PENDING checkpoint) |
| Blocked | Named decision, prerequisite, environment or permission prevents continuation |
| Done | Accepted outcome landed, required evidence and impact reconciliation complete |
| Cancelled / superseded | Retired with reason and preserved meaning/evidence |

Parked is a scheduling label, not authority. Resume against actual source and current scope; historical approval is not ongoing spend/deploy/mutation permission. Implementation edits only within commissioned implementation kind; docs-only work cannot silently expand to executable edits.

## Execution and evidence contracts

Planner resolves design/source and exact verification before dispatch. Executor reads selected Change, precise anchors and checks. Parent commits and hands off heavy proof when required; no merge/archive while mandatory acceptance remains. Follow [parent procedure](bounded-parent-orchestration.md).

At closure compare actual diff with planned Product/Technical/Code/Related dispositions and known dependents. Complete **Reconciliation ledger** for affected authority headings and known dependent claims, updated with owner+delta or unchanged with concrete reason. Blanket "docs unaffected" is insufficient. Documentation-only Code row explicitly records no executable behavior changed; semantic negative and link/heading proof replace invented code tests. Run [documentation reconciliation](../skills/documentation-reconciliation/SKILL.md) for updated/drift hits. Accepted permanent docs must not lag landed behavior. Preserve unique decisions/evidence and repair links before retirement.

## Current repository routing, November 2026

[Repository structure](../../REPOSITORY-STRUCTURE.md) owns geography; [Change catalog](../../work/changes/README.md) owns current entries. QUEUE selects one open CHANGE/TASK or none; archived work and legacy docs/history/initiatives FEATURE/PLAN never imply current commission. No selected work means no default executor assignment. `pnpm repo:brief` and `--checkpoint` report selection/checkpoint; `pnpm repo:docs-health` checks active Change PLAN checkpoints, not legacy features. [ROADMAP](../../ROADMAP.md) is priority context, not permission.

## Independent industry references

[Spec Kit](https://github.github.com/spec-kit/) · [Persisting specifications](https://github.github.com/spec-kit/how-to/persisting-specs.html) · [Harness engineering](https://openai.com/index/harness-engineering/) · [AI-native SDLC](https://claude.com/resources/articles/the-ai-native-sdlc-playbook). Reference practices, not repository authority or measured savings.
