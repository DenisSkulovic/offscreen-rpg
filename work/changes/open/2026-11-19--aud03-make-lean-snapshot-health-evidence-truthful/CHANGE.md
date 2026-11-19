# AUD03 | Make lean-snapshot documentation health distinguish exclusions from defects

**State:** Proposed, source-grounded audit follow-up (2026-11-19)  
**Kind:** implementation  
**Selection:** Not part of Cursor's active batch; select explicitly after confirming current head and file ownership.  
**Origin:** [Snapshot 2f45deed audit](../../../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) · [Architecture reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md) · [Change queue](../../README.md)

## Observable intended outcome

Make lean-snapshot documentation health distinguish exclusions from defects. Fix a source-proven defect rather than create more speculative architecture work. Preserve ratified product and technical decisions and Cursor's active implementation scope.

## Current evidence / authority

The audit's baseline is the **committed lean ZIP at `2f45deed`**. The ZIP intentionally excludes archived Changes and historical evidence, so a missing archive file in that ZIP does not prove `main` is broken. Reinspect the latest HEAD and actual branch/merged status before edits. Source authority: [Commands, events and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [topology and ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), current documentation/Change lifecycle policy and portable snapshot metadata.

## Bounded diff

Inspect `scripts/repo-tools/chatgpt-snapshot.mjs` export filters, `WIKI-INDEX.json` creation, `scripts/repo-tools/docs-health.mjs`, `wiki-health.mjs` and strict terminology checks. Add the *smallest* source-backed mechanism so snapshot metadata and its audit/CI report distinguish: (a) unresolved links among included docs; (b) known exclusions due to archive/evidence omit rules; (c) unavailable checks because dependencies/runtime are intentionally absent. Prefer generating a full-checkout pre-export documentation health result in snapshot metadata, plus a portable link report, **not** weakening full-repo invariants or duplicating the entire wiki engine inside the ZIP. Examine the observed `skeleton-` taxonomy warning: if it is from a URL/path rather than text claim, scope the rule to human content or whitelist known paths with regression tests; otherwise leave a source-grounded diagnostic instead of suppressing it. Preserve portability/security and current snapshot default size.

**Explicit owners:** `scripts/repo-tools/{chatgpt-snapshot,docs-health,wiki-health}.mjs` and existing snapshot/doc-health tests; do not touch shared runtime/game code. Documentation owner: current repo maintenance and wiki health runbooks, with exact status semantics.

**Out of scope:** No Kubernetes deployments, checkpoint schema migrations, game/service extraction, Stripe, provider calls, image generation, indiscriminate archive removal, status inflation or new temporary docs with no durable contract.

## Acceptance and discriminating negative

A constructed lean archive missing archived work/evidence does not report those omissions as repository regressions; a genuinely broken link *among included files* still fails. Full-checkout docs checker remains strict and catches real missing links. Node-runtime/dependency-unavailable state is labelled NOT-RUN, not PASS/FAIL. A URL containing 'service-skeleton' never triggers a banned-terminology false positive if source-confirmed, while true disallowed claim still fails. Export diff and negative regression tests recorded.

**Negative:** A lean snapshot's expected excluded archive file is not reported as a source regression. A previously ratified service-authority decision cannot be reversed by a documentation convenience fix. No edit may hide a failed full-repo validation behind a lean-only success or accidentally revive a broker→Temporal mandatory chain. Running Cursor branches are not overwritten.

## Scheduling / collision policy

Independent scripting/tests worktree alongside AUD01/AUD02, after one brief read-only probe establishes existing snapshot metadata contract. No cluster lock, migration or Storyteller source conflict.

The Change must follow the repository's ordinary planning and closure workflow: source-inspect before work, record exact change-set SHA/diffs and outcome, reconcile affected **canonical** docs rather than only this packet, run source-relevant validation with honest NOT-RUN where unavailable, then archive once Done. No automatic permission to execute from audit existence.

## planned-impact.v1

| Plane | Expected impact | Closure evidence |
| --- | --- | --- |
| Product | No gameplay or commercial changes | No new rule, scene or economy system |
| Technical | Remove contradictory or broken documentation/tooling behavior; keep source-grounded status | Exact before/after claims and relevant negatives |
| Code | Scoped doc health/export tools and tests only | Tests and diff where applicable |
| Related | Queue/audit traceability, link validity, wiki and guard checks | Original audit issue mapped to an actual Change receipt |

## Reconciliation ledger (fill on closure)

| Audit issue / owner | Intended edit or reasoned no-op | Source SHA / changed path | Positive and negative result | Evidence / status |
| --- | --- | --- | --- | --- |
| A7/A8 | Pending | Pending | Pending | Pending |
| Canonical technical / queue claims | Preserve or reconcile | Pending | Pending | Pending |
| Other impacted owners | Inspect | Pending | Pending | Pending |
