# AUD02 | Repair the portable-index unresolved links and prevent stale destinations

**State:** Proposed, source-grounded audit follow-up (2026-11-19)  
**Kind:** documentation  
**Selection:** Not part of Cursor's active batch; select explicitly after confirming current head and file ownership.  
**Origin:** [Snapshot 2f45deed audit](../../../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) · [Architecture reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md) · [Change queue](../../README.md)

## Observable intended outcome

Repair the portable-index unresolved links and prevent stale destinations. Fix a source-proven defect rather than create more speculative architecture work. Preserve ratified product and technical decisions and Cursor's active implementation scope.

## Current evidence / authority

The audit's baseline is the **committed lean ZIP at `2f45deed`**. The ZIP intentionally excludes archived Changes and historical evidence, so a missing archive file in that ZIP does not prove `main` is broken. Reinspect the latest HEAD and actual branch/merged status before edits. Source authority: [Commands, events and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [topology and ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), current documentation/Change lifecycle policy and portable snapshot metadata.

## Bounded diff

From the uploaded snapshot's `WIKI-INDEX.json.unresolvedLinks`, enumerate each of the **13** reported cases and map it to precise source file, intended target and actual path/heading. Correct wrong relative `../../../docs/` paths from `work/designs/open/distributed-turn-poc/` (repo root is `../../../../` there), outdated D3/BOOT01 and D4/STORY01 Change slugs, D5/EXECUTION target paths and ROADMAP's erroneous heading `#the-d-d-foundation`. Reinspect all current file content and actual target existence on **full current main** before editing; do not blindly use the old index because Cursor may have fixed some. Normalize crosslinks between the audit, packet queue and canonical headings. Do not create dead placeholder documents to make checker green. Use correct relative path linking to both archive and open Change locations, with real anchors.

**Explicit owners:** Affected links limited to observed faulty paths in `work/designs/open/distributed-turn-poc`, `ROADMAP.md`, and any truly verified affected source. Existing source/target conventions in `scripts/repo-tools/wiki-health.mjs` are read-only for this packet.

**Out of scope:** No Kubernetes deployments, checkpoint schema migrations, game/service extraction, Stripe, provider calls, image generation, indiscriminate archive removal, status inflation or new temporary docs with no durable contract.

## Acceptance and discriminating negative

Every original unresolved link now resolves to an existing file/heading (or is explicitly documented obsolete with safe removal); no new broken links introduced. Run `pnpm wiki:health`, `pnpm repo:docs-health` and `pnpm wiki:change-guard --mode close` on full Node 24 workspace, or report unavailable commands; do not treat omitted archive links in lean snapshot as failures. Compare unresolved count before/after from same full-checkout method and attach targeted path+anchor checks.

**Negative:** A lean snapshot's expected excluded archive file is not reported as a source regression. A previously ratified service-authority decision cannot be reversed by a documentation convenience fix. No edit may hide a failed full-repo validation behind a lean-only success or accidentally revive a broker→Temporal mandatory chain. Running Cursor branches are not overwritten.

## Scheduling / collision policy

Can run in parallel with AUD01 only if AUD01 owns the shared D1/D4/D5 and queue writes; AUD02 must defer edits to those shared files to the AUD01 integrator or work in a separate branch and merge via one coordinator. ROADMAP/link checks otherwise disjoint.

The Change must follow the repository's ordinary planning and closure workflow: source-inspect before work, record exact change-set SHA/diffs and outcome, reconcile affected **canonical** docs rather than only this packet, run source-relevant validation with honest NOT-RUN where unavailable, then archive once Done. No automatic permission to execute from audit existence.

## planned-impact.v1

| Plane | Expected impact | Closure evidence |
| --- | --- | --- |
| Product | No gameplay or commercial changes | No new rule, scene or economy system |
| Technical | Remove contradictory or broken documentation/tooling behavior; keep source-grounded status | Exact before/after claims and relevant negatives |
| Code | No executable diff | Tests and diff where applicable |
| Related | Queue/audit traceability, link validity, wiki and guard checks | Original audit issue mapped to an actual Change receipt |

## Reconciliation ledger (fill on closure)

| Audit issue / owner | Intended edit or reasoned no-op | Source SHA / changed path | Positive and negative result | Evidence / status |
| --- | --- | --- | --- | --- |
| A6 | Pending | Pending | Pending | Pending |
| Canonical technical / queue claims | Preserve or reconcile | Pending | Pending | Pending |
| Other impacted owners | Inspect | Pending | Pending | Pending |
