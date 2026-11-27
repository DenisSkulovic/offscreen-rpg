# Undertakings | themed integration envelopes

**Owner decision 2026-11-24: `main` is the integration trunk.** Storyteller Workshop remains an active outcome/acceptance dossier, not a separate integration branch. New Changes branch from current `main` and join `main` after their own proof, using dedicated Change branches and linked worktrees. The former `undertaking/storyteller-workshop` reference is a historical transition checkpoint; no new joins there. Reconcile in-flight branches against main without resetting or discarding user work. Do not force-push or delete the old branch until local migration is verified. This explicitly overrides older Storyteller Workshop target instructions, not safety, release, live acceptance or Change gates. The dossier closes on accepted outcome, not branch promotion.

**Folder lifecycle:** [Repository structure](../../REPOSITORY-STRUCTURE.md#4-work-is-temporary-coordination-not-product-truth) and [How we work](../../WORKFLOW.md) cover temporary integration dossiers, distinct Change branches, landing and retirement.

**Lifecycle/branch map:** [How we work](../../WORKFLOW.md) covers Undertaking creation, documentation-first work, dedicated Change subbranches, integration and retirement. This page owns the Undertaking-specific rules.

An **Undertaking** is a temporary, named engineering transformation that groups multiple existing work units under one coherent focus and recorded integration target. The dossier does not imply a dedicated branch. It is larger than a Change and narrower than the product roadmap.

Undertakings exist to prevent a familiar failure mode: a week of related Designs, Changes, audits and documentation edits accumulates as disconnected packets and branches even though everyone is mentally working on one thing. The undertaking gives that thing a durable name, scope and landing boundary without inventing another execution queue.

## Active undertaking

| Undertaking | Branch | State | Purpose |
| --- | --- | --- | --- |
| [Storyteller Workshop · **human progress overview**](storyteller-workshop/OVERVIEW.md) · [technical dossier](storyteller-workshop/UNDERTAKING.md) | `main` | **Active** | Re-found the Storyteller as a disciplined writing system with persistent source/library identity, a writer workdesk, bounded research support, coherent publication, fork-aware fictional state and one-prompt creation flow |

## Proposed subsequent Undertaking (not active)

| Undertaking | Intended integration branch | Gate |
| --- | --- | --- |
| [Modular Monolith](modular-monolith/UNDERTAKING.md) | `main` | Earlier MA01–MA06 target is historical. New commissions verify actual target and use dedicated Change worktree. |

Only one active Undertaking is preferred unless there is a strong reason to run truly independent integration programs concurrently.

## Required supervisor overview (first-class)

Every new Undertaking **MUST** create two front doors together:

1. **`OVERVIEW.md`** using [the shared human-first template](OVERVIEW-TEMPLATE.md). This is the first page for the supervisor and for a new planner session. It visually and **numerically** answers: *What are we building? Roughly how far through are we (and how much remains)? What is actually achieved? What is currently in flight? What is still missing? How will we know we're done?* Include **mandatory rough complete/remaining percentages** for the combined Undertaking and each important major track, 5%-rounded visual bars, uncertainty and honest reasoning. Use outcome-sized milestones, not packet counts or unexplained architecture jargon.
2. **`UNDERTAKING.md`** for scope, evidence, dependencies, branch/integration and exit contract. Link to the overview conspicuously near the top. Neither page replaces `STATUS.md`, permanent product/technical docs, proof or the single current-work selector.

**Required upkeep:** Create both at kickoff. Refresh the human overview **and its numeric estimates** after a material Change join, meaningful outcome/roadmap change, next-wave commission and before final landing. Percentages estimate remaining engineering effort/risk against accepted outcomes, not completed packet counts; they may decline if new blockers appear. The integration custodian serializes edits and uses actual HEAD/receipts; ChatGPT checks it at *every* Undertaking cold start and **proactively summarizes and links it to the supervisor at meaningful checkpoints**. If unchanged, record/check accuracy rather than rewriting cosmetically. No timed automatic monitoring is implied. At close, provide a final accessible before/after summary, then retire the temporary page with the dossier after history and canonical docs are reconciled. A stale/missing human overview is an Undertaking process gap, not a reason to bury the user in the technical ledger.

## Rules

- **Coordination, not authority.** An Undertaking cannot select work, approve a Design, close a Change, authorize model spend or prove implementation. [QUEUE](../QUEUE.md), child packets, canonical docs and evidence retain those responsibilities.
- **Memorable names.** Name the actual transformation. Prefer `Storyteller Workshop` over `Storyteller Evolution`, `Phase 2`, `Consolidated` or chat-specific jokes that will become archaeological riddles.
- **Integration target.** `main` is the current trunk. An Undertaking may use a different integration branch only when explicitly authorized; its dossier alone does not create one. Each commissioned implementation Change uses a dedicated short-lived branch and linked worktree from the actual recorded target; retire after accepted integration.
- **Finite scope.** The dossier lists included work, explicit exclusions, entry state and exit conditions. New work can join only when it genuinely serves the same transformation.
- **Child lifecycles stay real.** A Done child can coexist with an Active undertaking; a Proposed child does not become Ready merely because it is listed here.
- **Land coherently.** Before merge, reconcile permanent docs, queue/status claims, tests/evidence and stale links as one integration candidate.
- **Retire aggressively.** After landing or abandonment, record a concise disposition in Git-visible history and remove the active dossier and undertaking branch. Git is the long-term archive.

## Lifecycle

**Active → Landing → Closed**

- **Active:** scope and constituent work are still evolving.
- **Landing:** no new scope by default; validate the integrated outcome on the recorded target. Merge a separately authorized integration branch only if one exists.
- **Closed:** accepted or explicitly abandoned. Reconcile and retire the dossier; retire a separate branch only if present and safely reconciled.

Historical themed pushes such as the documentation **wikipedization** and the Kubernetes-first repository/developer-experience refoundation predate this convention. They are useful examples, not retroactive folders that need to be manufactured.
