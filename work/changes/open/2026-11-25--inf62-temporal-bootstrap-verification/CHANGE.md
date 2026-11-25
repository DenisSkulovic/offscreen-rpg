# INF62 | Honest bootstrap SQL gates

**Status: Ready / owner-commissioned source implementation.**

Baseline 4cba2d3974db34ac47b3834b81ded9f5b6f60b56, main. Owner requested source implementation 2026-11-25. Integration target main; dedicated Change branch and linked worktree via pnpm repo:change-branch --change INF62 --target main. One Composer Standard child at a time. Source-only: no live Kubernetes/Docker/SQL mutations, no provider calls, no tenant deletion or data migration. Preserve existing identities, permissions, state, unrelated work. Parent verifies current source anchors, executes focused tests, changed-file Prettier and canonical code-quality checks, reviews diff, reconciles docs/ledger, archives and integrates per WORKFLOW. No successor auto-start. Any semantic contradiction returns to ChatGPT with exact evidence. INF61 parent coordinates joins and shared docs; after its join INF62 parent takes custody, then INF63 if remaining; coordinate existing repo join custodian. No concurrent shared-document writes.

## Outcome and ownership
Honest bootstrap SQL gates. Dependencies: None. Exclusive source writes: release-install.mjs, dev-bootstrap.mjs, new legacy-sql-probe.mjs, corresponding executor tests only. [Tasks](TASKS.md) · [Programme](../../../undertakings/storyteller-workshop/TEMPORAL-INFRASTRUCTURE.md).

## planned-impact.v1
| Plane | Disposition |
|---|---|
| Product | No gameplay changes |
| Technical | Legacy deployment hardening; no hosted readiness claim |
| Source | Exclusive scope above |
| Proof | Focused positive and negative source fixtures; live NOT RUN |
| Related | Custodian reconciles permanent docs and ledgers |

## Acceptance
Every task proof passes, source compatibility and identities preserved, no unrelated changes. Report actual SHA, tests and remaining limits. Archive and integrate on main under repository workflow. Live NOT RUN.
