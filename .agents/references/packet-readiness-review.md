# Independent Change packet readiness review | adversarial audit manual

## Dependency readiness is not a planner blocker

Follow the [shared readiness rule](../../AGENTS.md#dependency-readiness-is-not-a-planner-blocker) and the [severity policy](../../AGENTS.md#finding-severity-and-blocking). Frozen contracts may be Ready (dependency-gated) before the predecessor lands; verify receipts and source postconditions before dispatch. Separate design readiness, commission, dependency order and live permission. Changed material assumptions require a planner refresh, not rediscovery by Cursor. A future precisely specified harness is not itself a blocker. A blocked Change does not hold an unrelated ready Change.

**Owner:** an independent reviewer, in a context that did not author the packet. A fresh chat is one valid context. **Goal:** judge whether the current specific Change can be executed correctly and economically by a short-reading coordinator and bounded implementation tasks. When Cursor is selected, those tasks are Composer children. Without native subagents, the same task is a bounded direct execution path. This review is not execution approval, a replacement for source inspection, or a generic docs-health score. Use it with [packet design](packet-design-manual.md), [Composer tasks](composer-first-execution.md) and [planner investigation](planner-investigation-standard.md).

Review a commissioned batch together when that is feasible. Reuse common source and contract investigation across packets that share a frozen interface. Keep an individual readiness conclusion for each Change, plus the cross-Change dependency analysis.

## Verdicts, not vibes

- **READY:** no unresolved Critical or High finding on the verified target. The parent has a legal first dispatch now, or after named verified predecessor postconditions, and each offered parallel wave is safe. Deferred Medium and Low findings are allowed. Record `READY (dependency-gated)` when execution waits on a specified predecessor. READY is not commission.
- **READY WITH EXPLICIT LIMITS:** an actual bounded execution or acceptance limitation remains, with an executable fallback. Reserve this for that limitation. Do not use it merely because ordinary Medium or Low findings exist. No uncertain permission, contract, transaction or indispensable proof.
- **PLANNER-BLOCKED:** at least one Critical or High decision, source, caller, test or resource-mapping defect remains with the planner. Do not commission the affected scope.
- **UNVERIFIED:** the target branch, HEAD, or indispensable code or fixtures could not be inspected. Do not convert absence of evidence into READY. This is distinct from a confirmed defect.
- **NOT AUTHORIZED:** scope, branch, permissions or ratification forbid execution regardless of packet quality. A technically ready but uncommissioned packet remains unselected. Never infer permission from readiness.

Never promote a packet because a previous chat called it ready. A review attempts to falsify readiness and cites the exact file, symbol or missing entry. If the same session authored the packet, perform a separate cold review and read the task cards before the deep notes. Authorship is not a reason to be charitable.

## Audit sequence

G0–G7 are the engineering dimensions of one review. They are not eight independent procedures, and a nonmaterial imperfection is not a gate failure. Classify every substantive finding. Only Critical and High findings block the affected scope.

Stop early only when missing access, fundamentally incoherent instructions, or another decisive prerequisite makes the rest of the review impossible or unreliable. Do not stop merely because one correctable deficiency already justifies a negative verdict. Record gates that could not be reviewed as NOT REVIEWED. Do not mark them PASS.

**Submission quality.** One preferred measurable outcome. Seven actual tasks is a strong default, not an automatic failure. Apply [submission quality](planning-artifact-quality.md#6-independent-review-submission-quality) after verifying the review target. Note file roles, active versus historical material, the front door, mandatory routes and concrete smells. Counts and sizes are signals. A contradictory current contract, a hidden material decision, an unresolvable anchor or an unbounded execution context is blocking only when its consequence is Critical or High. Repeat the affected check on a revised candidate; do not repeat an unaffected inventory by ritual.

**G0. Repository and authority.** Verify the actual repository, integration branch, HEAD, active changes, worktrees and current rules. Confirm the Change goal, product and technical authority, commission status, and permissions. Proposed designs cannot silently become accepted architecture.

**G1. Source truth.** Open claimed high-impact symbols, relevant callers and exports, and representative tests against the verified HEAD. Check that the diagram or manifest covers actual cross-module edges, mutation boundaries, schema, permission, transaction and failure paths, and required dependencies. A path existing is insufficient. Name uninspected indispensable source and use UNVERIFIED rather than guessing. Reuse the same inspection across a batch that shares the frozen surface.

**G2. Decisions closed.** Verify input, output, public exports, state, authorization, failure, retry and idempotency semantics, migration and compatibility, and the selected algorithm. For domain extraction, require source to destination, public exports, manifests, known consumer imports and test relocation. For policy gates, require the composition-root to policy-source, default-deny and test matrix. For stateful Changes, require transaction, fence, rollback and replay semantics. An unresolved material decision is PLANNER-BLOCKED for the affected scope.

**G3. Child context.** Read each actual T-ID with only its stated anchors and required contract sections. Scale the depth to task risk. Do not hide an indispensable linked section, and do not silently read the entire planner corpus. Attempt to enumerate the precise edits and tests without designing. If the card forces broad caller discovery, an interface choice, fixture invention or ownership reconciliation, that is a High finding for the affected task. A child may fix a localized compilation error. It must not repair the architecture. On the initial review, validate every actual task. Do not substitute a sample for indispensable task-level correctness. On a correction pass, repeat the affected tasks and their dependencies.

**G4. Parent dispatch.** With CHANGE.md, TASKS.md, repository rules, the branch guard and the existing work, ask whether the parent can select an eligible T-ID or wave and launch without another architecture survey. The parent should receive a compact actionable route. Distinguish an inability to dispatch safely from an imperfect packet.

**G5. Dependencies and concurrency.** For a Design, confirm the Change graph was mapped before the task cards and that its edges are real predecessors or named collisions, not a copied total order. Construct the task prerequisite graph and compare proposed parallel pairs for files and symbols, generated artifacts and lockfiles, fixtures, ports, databases and providers, interface or branch drift, and docs, ledger, commit and staging. The Change coordinator owns the join. Flag falsely parallel tasks and a constituent target of main. Serial execution is acceptable when a real collision requires it. A blocked predecessor does not block an independent Change. Pending design-level acceptance does not fail a Change whose source join is explicitly permitted.

**G6. Discriminating proof.** For each task and the whole Change, identify the command and working directory, the normal observation, a discriminating negative or fault, the changed-file quality checks, the assigned executor, and the honest limits. The implementation agent owns cheap checks. The acceptance lead and the owner own heavy acceptance. A future specified harness is not a planning blocker. Missing indispensable safety or correctness proof blocks the affected scope. A Medium or Low suggestion for extra assurance does not. Unrun tests stay unrun.

**G7. Execution cost and closure.** Evaluate task size, repeated reads, duplicated parent and child work, unnecessary serial waits, and whether a smaller patch would be safer. Confirm Done and archival criteria, the Git target, source and document reconciliation, and no automatic next Change. A cost or readability concern blocks only when it prevents reliable execution. Never fabricate token or provider savings.

## Blocking findings and deferred findings

**Blocks the affected scope:** a Critical or High consequence, including missing or contradictory authority, unknown indispensable source, architecture left to Cursor, a missing security, data-integrity or idempotency safeguard, an impossible or unowned dependent edit, an incomplete migration or composition map, no executable acceptance for an indispensable behavior, unsafely overlapping writers, or an unapproved privileged, provider or destructive operation.

**Defer:** stylistic wording, a redundant example, an optional additional test, a correct but suboptimal mechanism, extra diagrams, or documentation that is not required to implement safely. Record these as Medium or Low. Do not turn them into an indefinite implementation block, and do not repair them in the current correction cycle merely to improve the verdict.

## Required audit output

Record a concise receipt: review target (`Change ID`, repository, candidate SHA, integration baseline), source paths and symbols inspected, evidence limits, submission-quality signals that affected the verdict, G0–G7 as PASS, FAIL, UNVERIFIED or NOT REVIEWED with the diagnostic reason, the task and wave table, the first parent dispatch, blocking findings with severity, scope, evidence, consequence and required correction, and deferred findings with disposition. An evidence citation does not itself prove that a test ran. Use the [worksheet](packet-review-checklist.md) as the output shape.

### Review loop and honesty

1. Audit the existing packet before editing it. Record the real initial verdict and the complete known finding set.
2. If correction is authorized, fix every known Critical and High finding in the current owning sections. Do not create a shadow packet or an appended repair history. Preserve unique evidence separately. Leave Medium and Low findings deferred.
3. Re-review by impact. Verify the former blockers and their resolution, changed contracts and algorithms, affected tasks, callers, dependencies, ownership and proof, and regression risk from the corrections. Reuse unaffected gate evidence and unaffected task simulations. A previous failure does not become a pass because the author says it was fixed. A localized task-card correction does not repeat the whole design defense or every unaffected simulation.
4. Update readiness and indexes only for scopes with no unresolved Critical or High finding. Give a narrow launch instruction for each eligible commissioned Change. If indispensable verification is unavailable, report UNVERIFIED for that scope.
5. A later Cursor trace may expose a missing planner decision. Treat that as a planner escape for the affected scope. Do not invent a new process file for it.

**Quality of a review:** it predicts execution. A rapid first dispatch, few planner escalations, clear Composer receipts, little parent design, correct negative proofs and a clean integration are the useful signs. Observe them after execution. No rubric guarantees an agent's behavior.
