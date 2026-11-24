# INF23 | Registry and session persistence

**Status: Done (2026-11-24). Kind: implementation. Profile: STATE.** Baseline 54f9261d699097835e6c97ad55612a02ae49e59c; integrated on undertaking/storyteller-workshop from change/inf23-dev-session-authority. Dependency INF22 Done. Source-only. Live cluster, Tilt, and Docker NOT-RUN.

## Reconciliation ledger

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Registry lock | changed: exclusive kernel flock on owners.lock.flock; leftover owners.lock refuses and is not deleted | `tools/dev-environments/src/domain/dev-worktree-registry.mjs` | registry v2 and allocator tests 39 pass | legacy file left intact; second process times out; callback errors are not lock contention | runbook local ownership paragraph |
| Session publication | changed: both session writers use one same-directory atomic JSON rename | `dev-session-json.mjs`, `dev-environment-session.mjs`, `dev-tilt.mjs` | session tests 16 pass; tilt tests 52 pass | injected write and rename failures keep the prior file and remove the temp | N/A |
| Product behavior | unchanged because this is developer infrastructure | no product page edited | source-inspected | N/A | N/A |

[Program](../../../../../undertakings/storyteller-workshop/INF-MEDIUM.md) · [Tasks](TASKS.md) · [Execution](EXECUTION.md) · [Source map](SOURCE-MAP.md) · [Proof](PROOF.md).

Target undertaking/storyteller-workshop, reviewed snapshot 54f9261d699097835e6c97ad55612a02ae49e59c, owner commissioned 2026-11-24. Source-only, no live cluster/Docker/Tilt/registry mutation or tenant deletion. Personal dev platform: optimize daily flow, not enterprise adversarial security. Preserve existing data/credential/foreign-slot protections. No new frameworks, profile features or auto-retry. One linked Change worktree, branch guard node scripts/repo-tools/change-branch-guard.mjs --change ID --target undertaking/storyteller-workshop; parent Composer coordinates one bounded task at a time, shared docs/catalog joined by human custodian. Mechanical successor reconciliation permitted; material source contradiction stop. Focused tests from repo root, changed-file quality and docs health, receipt actual counts; no live acceptance credit.

Dispatch T01 after dependency receipt. Archive only after focused proofs and reconciliation. No successor auto-start.
