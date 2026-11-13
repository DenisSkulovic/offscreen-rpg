# Working agreement for substantial work

Root `AGENTS.md` owns minimal global boundaries. Read this agreement for a significant change, a cross-package task, or an ambiguous handoff. Do not automatically load it for a typo or a narrow, fully specified edit.

## Authority and design order

1. **Product specification** defines player/developer outcomes and their observable acceptance. Start with `docs/vision.md`, `docs/concepts.md`, then the _affected_ product owner via `docs/README.md`.
2. **Technical specification** defines ownership, transitions, failure/retry semantics, data contracts and cost limits. Update the affected authoritative topic rather than cloning its explanation in a plan.
3. **Code** implements the contracts; tests, traces and play are evidence of behavior. An implemented alternative is not automatically the accepted design.

For new/changed behavior: update product intent, then technical contract, then code. For a bug where intent and contract already say the right thing: keep them, repair the code, and add an appropriate regression check. For an internal structural change with no product effect: confirm the existing product contract, update the technical owner if responsibility changes, then implement. Correct discovered drift; distinguish **designed**, **implemented**, **fixture-exercised**, **live-observed**, and **human-accepted** statements. `docs/progress.md` owns present coverage.

**Portfolio-renewal gate:** for any significant React/Next, backend, UX or architecture redesign, use [target-first engineering](target-driven-renewal.md) before diagnosing code or cutting Changes. Agree the intended end state, then document evidence-based gaps, then Changes that move toward it. A random cleanup or technology insertion with no target trace is not an approved plan.

## Invariants not to optimize away

- Engine is world-independent and creatively neutral. The selected profile/world determines tone, pace and fiction. Game/application logic owns mechanics, fictional time, rights, persistence, model budget and publication.
- A _Storyteller turn_, _scene_, _passage_, _model round_ and _memory segment_ are different concepts. Use `docs/concepts.md`; no chapters.
- Narration, offers and model-generated changes are proposals until validated and published against the authoritative state. Do not convert fictional prose into mechanical effects without admission.
- Idempotency, clock advancement, transaction ordering, durable outbox/Temporal execution, document-root commits, budget reservations and ambiguous provider failure are correctness boundaries. Never weaken them for convenience.
- A saved fact is not proof that retrieval selected it; selection is not proof it survived request packing; generation is not publication. Trace the complete path when diagnosing continuity.
- Pre-POC uses disposable local data and one baseline migration by policy. Never generalize that permission to external/user-owned data.

## Operating behavior

- **Local disposable infra is agent work, not a blocker.** If Docker/Postgres/Temporal/build caches/browser deps are missing or down for an authorized local proof, start/repair them with repo scripts and continue. Do not return “blocked: kettle unplugged.” Still stop for paid providers, deploy, secrets, and non-disposable/remote data. See `.cursor/rules/local-infra-unblock.mdc`.
- Trace the **narrow actual route** before proposing changes. Prefer an existing owning operation over a new framework, service, abstraction or parallel truth store.
- A significant **code-bearing Change** uses the `change-workflow` skill and [Change index](../../docs/changes/README.md); a bounded authorized coding task uses `implementation-slice`. Design, evaluation and documentation-only work do not need implementation dossiers. One implementation owner per slice. The task contract, not the coding agent's enthusiasm, controls scope.
- Architectural discoveries should identify the owner, actual source, consequence, and the smallest useful next step. Do not write long exploratory transcripts into durable docs.
- Product intent and technical architecture can be creatively designed in ChatGPT; a codebase-connected investigator can validate feasibility; Cursor usually implements bounded slices. Tool allocation is an economic default, not a mandatory three-model ceremony.
- A coding agent may make local implementation decisions consistent with the contract, but must **stop/report** when fulfilling the task would require a material change to product intent, architecture, money, data authority or authorization. Do not rewrite acceptance to make the code pass.
- Use a focused read/review budget: find symbols and headings first; inspect the owner and immediate edges; expand only when the evidence requires it. Summarize useful discoveries in a current owner, not duplicated in five places.

## Session history and cross-chat continuity

For substantial conversations and work, follow [daily session minutes](session-minutes.md): record the owner's important remarks, rationale, rejected choices, agreed constraints, decisions and actual evidence in one local-date log. Do this throughout the session, **before** switching tool/chat, not solely at the end. Minute entries are historical context; accepted contracts still belong in their permanent owner and significant code work still requires a selected, authorized Change. If write access is unavailable, provide an unpersisted handoff entry rather than pretending it was saved.

## Checkpoints and Git

At a meaningful interruption, update the selected Change PLAN's **current checkpoint** (if any): revised phase, specific edited files, checks and limits, unresolved issue, exact next step and source revision. The plan is an execution workspace, not a diary. Completed code Changes are retired after durable facts are folded into permanent owners; Git is the archive. Historical initiative dossiers remain contextual only until safely reconciled; the [work-unit standard](../references/change-work-unit-standard.md) defines classification and readiness. Preserve explicitly retained dossiers.

Inspect Git status before broad editing and before a commit. Preserve unrelated changes. Prefer coherent commits, but do not silently force push, rewrite history, deploy, or push changes when handoff expectations are unclear. A local checkpoint and explicit report are safer than a surprise remote mutation.

## Verification and spend

Use [proportionate verification](verification.md); code and docs checks have no live-provider permission. Review of a diff is still needed even if checks pass. Paid calls, cloud deployment and credentials are governed by [spending](spending.md) and task-specific explicit authority. Recorded historical credit amounts are not a current balance. End each material slice with outcome, evidence and spending status.
