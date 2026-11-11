# Working agreement for substantial work

Root `AGENTS.md` owns minimal global boundaries. Read this agreement for a significant change, a cross-package task, or an ambiguous handoff. Do not automatically load it for a typo or a narrow, fully specified edit.

## Authority and design order

1. **Product specification** defines player/developer outcomes and their observable acceptance. Start with `docs/vision.md`, `docs/concepts.md`, then the *affected* product owner via `docs/README.md`.
2. **Technical specification** defines ownership, transitions, failure/retry semantics, data contracts and cost limits. Update the affected authoritative topic rather than cloning its explanation in a plan.
3. **Code** implements the contracts; tests, traces and play are evidence of behavior. An implemented alternative is not automatically the accepted design.

For new/changed behavior: update product intent, then technical contract, then code. For a bug where intent and contract already say the right thing: keep them, repair the code, and add an appropriate regression check. For an internal structural change with no product effect: confirm the existing product contract, update the technical owner if responsibility changes, then implement. Correct discovered drift; distinguish **designed**, **implemented**, **fixture-exercised**, **live-observed**, and **human-accepted** statements. `docs/progress.md` owns present coverage.

## Invariants not to optimize away

- Engine is world-independent and creatively neutral. The selected profile/world determines tone, pace and fiction. Game/application logic owns mechanics, fictional time, rights, persistence, model budget and publication.
- A *Storyteller turn*, *scene*, *passage*, *model round* and *memory segment* are different concepts. Use `docs/concepts.md`; no chapters.
- Narration, offers and model-generated changes are proposals until validated and published against the authoritative state. Do not convert fictional prose into mechanical effects without admission.
- Idempotency, clock advancement, transaction ordering, durable outbox/Temporal execution, document-root commits, budget reservations and ambiguous provider failure are correctness boundaries. Never weaken them for convenience.
- A saved fact is not proof that retrieval selected it; selection is not proof it survived request packing; generation is not publication. Trace the complete path when diagnosing continuity.
- Pre-POC uses disposable local data and one baseline migration by policy. Never generalize that permission to external/user-owned data.

## Operating behavior

- Trace the **narrow actual route** before proposing changes. Prefer an existing owning operation over a new framework, service, abstraction or parallel truth store.
- A significant **code-bearing Change** uses the existing `feature-workflow` skill (legacy filename, new Change semantics); a bounded authorized coding task uses `implementation-slice`. Design, evaluation and documentation-only work do not need implementation dossiers. One implementation owner per slice. The task contract, not the coding agent's enthusiasm, controls scope.
- Architectural discoveries should identify the owner, actual source, consequence, and the smallest useful next step. Do not write long exploratory transcripts into durable docs.
- Product intent and technical architecture can be creatively designed in ChatGPT; a codebase-connected investigator can validate feasibility; Cursor usually implements bounded slices. Tool allocation is an economic default, not a mandatory three-model ceremony.
- A coding agent may make local implementation decisions consistent with the contract, but must **stop/report** when fulfilling the task would require a material change to product intent, architecture, money, data authority or authorization. Do not rewrite acceptance to make the code pass.
- Use a focused read/review budget: find symbols and headings first; inspect the owner and immediate edges; expand only when the evidence requires it. Summarize useful discoveries in a current owner, not duplicated in five places.

## Checkpoints and Git

At a meaningful interruption, update the selected Change PLAN's **current checkpoint** (if any): revised phase, specific edited files, checks and limits, unresolved issue, exact next step and source revision. The plan is an execution workspace, not a diary. Completed code Changes are retired after durable facts are folded into permanent owners; Git is the archive. Historical initiative dossiers remain contextual only until safely reconciled; the [work-unit standard](../references/change-work-unit-standard.md) defines classification and readiness. Preserve explicitly retained dossiers.

Inspect Git status before broad editing and before a commit. Preserve unrelated changes. Prefer coherent commits, but do not silently force push, rewrite history, deploy, or push changes when handoff expectations are unclear. A local checkpoint and explicit report are safer than a surprise remote mutation.

## Verification and spend

Use [proportionate verification](verification.md); code and docs checks have no live-provider permission. Review of a diff is still needed even if checks pass. Paid calls, cloud deployment and credentials are governed by [spending](spending.md) and task-specific explicit authority. Recorded historical credit amounts are not a current balance. End each material slice with outcome, evidence and spending status.
