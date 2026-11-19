# AUD03 | Make lean-snapshot documentation health distinguish exclusions from defects

**State:** Done  
**Kind:** implementation  
**Selection:** Not part of Cursor's active batch; select explicitly after confirming current head and file ownership.  
**Origin:** [Snapshot 2f45deed audit](../../../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) · [Architecture reconciliation](../../../designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md) · [Change queue](../../README.md)

## Observable intended outcome

Make lean-snapshot documentation health distinguish exclusions from defects. Fix a source-proven defect rather than create more speculative architecture work. Preserve ratified product and technical decisions and Cursor's active implementation scope.

## Current evidence / authority

The audit's baseline is the **committed lean ZIP at `2f45deed`**. The ZIP intentionally excludes archived Changes and historical evidence, so a missing archive file in that ZIP does not prove `main` is broken. Reinspect the latest HEAD and actual branch/merged status before edits. Source authority: [Commands, events and workflows](../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows), [topology and ownership](../../../../docs/technical/platform/topology.md#proposed-service-ownership), current documentation/Change lifecycle policy and portable snapshot metadata.

## Bounded diff

Inspect `scripts/repo-tools/chatgpt-snapshot.mjs` export filters, `WIKI-INDEX.json` creation, `scripts/repo-tools/docs-health.mjs`, `wiki-health.mjs` and strict terminology checks. Add the *smallest* source-backed mechanism so snapshot metadata and its audit/CI report distinguish: (a) unresolved links among included docs; (b) known exclusions due to archive/evidence omit rules; (c) unavailable checks because dependencies/runtime are intentionally absent. Prefer generating a full-checkout pre-export documentation health result in snapshot metadata, plus a portable link report, **not** weakening full-repo invariants or duplicating the entire wiki engine inside the ZIP. Examine the observed `skeleton-` taxonomy warning: if it is from a URL/path rather than text claim, scope the rule to human content or whitelist known paths with regression tests; otherwise leave a source-grounded diagnostic instead of suppressing it. Preserve portability/security and current snapshot default size.

**Explicit owners:** `scripts/repo-tools/chatgpt-snapshot.mjs`, `scripts/repo-tools/docs-health.mjs`, `scripts/repo-tools/wiki-health.mjs`, `scripts/repo-tools/chatgpt-snapshot.test.mjs`, and `docs/runbooks/chatgpt-design-snapshot.md`. Do not touch shared runtime, game, Storyteller, database, or Kubernetes code. Documentation owner: `docs/runbooks/chatgpt-design-snapshot.md#documentation-health-statuses`.

**Out of scope:** No Kubernetes deployments, checkpoint schema migrations, game/service extraction, Stripe, provider calls, image generation, indiscriminate archive removal, status inflation or new temporary docs with no durable contract.

## Acceptance and discriminating negative

A constructed lean archive missing archived work/evidence does not report those omissions as repository regressions; a genuinely broken link *among included files* still fails. Full-checkout docs checker remains strict and catches real missing links. Node-runtime/dependency-unavailable state is labelled NOT-RUN, not PASS/FAIL. A URL containing 'service-skeleton' never triggers a banned-terminology false positive if source-confirmed, while true disallowed claim still fails. Export diff and negative regression tests recorded.

**Negative:** A lean snapshot's expected excluded archive file is not reported as a source regression. A previously ratified service-authority decision cannot be reversed by a documentation convenience fix. No edit may hide a failed full-repo validation behind a lean-only success or accidentally revive a broker→Temporal mandatory chain. Running Cursor branches are not overwritten.

## Scheduling / collision policy

Independent scripting/tests worktree alongside AUD01/AUD02, after one brief read-only probe establishes existing snapshot metadata contract. No cluster lock, migration or Storyteller source conflict.

The Change must follow the repository's ordinary planning and closure workflow: source-inspect before work, record exact change-set SHA/diffs and outcome, reconcile affected **canonical** docs rather than only this packet, run source-relevant validation with honest NOT-RUN where unavailable, then archive once Done. No automatic permission to execute from audit existence.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Disposition |
| --- | --- |
| Product | unchanged because no gameplay, scene, or economy rule changes |
| Technical | unchanged because no platform contract heading is rewritten |
| Code | changed: scripts/repo-tools/chatgpt-snapshot.mjs, scripts/repo-tools/docs-health.mjs, scripts/repo-tools/wiki-health.mjs, and scripts/repo-tools/chatgpt-snapshot.test.mjs. Negative: a missing archived Change in a lean archive is not a source regression, and a broken included link still fails |
| Related | changed: docs/runbooks/chatgpt-design-snapshot.md#documentation-health-statuses records pass, fail, omission, and dependency-absent statuses |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| A7 banned wording on a service packet link | tooling | changed: a repository URL or filesystem target is no longer reported as a banned gameplay claim | scripts/repo-tools/docs-health.mjs @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | fixture-tested | ordinary prose that uses the banned wording still fails | N/A |
| A8 lean archive and evidence omissions | tooling | changed: a lean manifest reports those missing files as omissions rather than repository regressions | scripts/repo-tools/docs-health.mjs @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | fixture-tested | a broken link among included files still fails, and a full checkout without the lean manifest still fails a missing archive | N/A |
| Snapshot health metadata | tooling | changed: the export manifest separates full-checkout status, included-link defects, and profile omissions | scripts/repo-tools/chatgpt-snapshot.mjs @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | fixture-tested | an omitted archive count is not stored as an included-link failure | N/A |
| Wiki health when parser dependencies are absent | tooling | changed: the wiki checker returns a dependency-absent result instead of a pass or a documentation failure | scripts/repo-tools/wiki-health.mjs @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | fixture-tested | the dependency-absent exit is neither success nor a failed document check | N/A |
| Snapshot health tests | tooling | changed: the existing snapshot test covers omission, included-link failure, and a dependency-absent result | scripts/repo-tools/chatgpt-snapshot.test.mjs @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | fixture-tested | the full-checkout fixture still fails when an archived file is actually missing | N/A |
| docs/runbooks/chatgpt-design-snapshot.md#documentation-health-statuses | runbook | changed: the snapshot runbook now states pass, fail, omission, and dependency-absent meanings | docs/runbooks/chatgpt-design-snapshot.md @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | source-observed | a reader cannot treat a lean omission as a full-checkout pass | N/A |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged because the service ownership sentences were not edited | docs/technical/platform/topology.md @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | source-observed | the ownership claim stays as written | N/A |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged because no command or workflow sentence was edited | docs/technical/platform/execution-and-delivery.md @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | source-observed | this tool change does not revive a broker chain | N/A |
| Product gameplay and economy | product | no product/technical behavior impacted: no scene, rule, or economy text was edited | no source behavior changed for product rules @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | source-observed | a health-tool fix cannot ratify a new game service | N/A |
| work/changes/README.md | queue | unchanged because this Change may not edit the queue | work/changes/README.md @ 4447114b7c951696576a50efe74aae5ecbdec9f2 | source-observed | the queue file was left untouched | N/A |

## Outcome

Inspected baseline `4447114b7c951696576a50efe74aae5ecbdec9f2` on `change/aud03-snapshot-health`. Full-checkout `docs-health` still fails the twelve pre-existing broken design links and exempts two path-only wording hits. `wiki-health` with no installed parser dependencies exits 3 and prints a dependency-absent result. No provider call was performed. `knowledge-health.mjs` still emits the raw wording hit; `docs-health.mjs` is the allowed classifier and drops a path-only hit. `work/changes/README.md`, `work/changes/ledger/`, and `work/designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md` stay outside this edit. The queue and the audit still name the open packet after it moves.
