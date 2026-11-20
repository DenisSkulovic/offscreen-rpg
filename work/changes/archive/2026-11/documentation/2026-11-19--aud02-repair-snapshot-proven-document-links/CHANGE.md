# AUD02 | Repair the portable-index unresolved links and prevent stale destinations

**State:** Done
**Kind:** documentation
**Approval and owner:** Owner authorized this documentation Change on baseline `83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5`. Canonical product and technical meaning is unchanged. The executor retargeted three links that were still broken on that baseline.
**Parent:** [Snapshot 2f45deed audit](../../../../../designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md) finding A6 only.

## Cursor first-screen brief

> **Current-source map:** [distributed-turn design](../../../../../designs/open/distributed-turn-poc/README.md), inspected at `83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5`.
> **Primary governing heading:** [Commands, business events, and workflows](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows).
> **Known trap / contrary case:** A repaired link must not put RabbitMQ in front of Temporal, move the scene checkpoint, or treat a lean snapshot's omitted archive as a repository regression.
> **Scope/permission:** Markdown links named below. No executable edit. The queue stays with the orchestrator.

## Outcome and motivation

A reader who follows the thirteen portable-index defects from snapshot `2f45deed` now lands on a file and heading that exist, or finds that the destination was already corrected on this baseline. No placeholder page was created.

Before, on `2f45deed`, `python3` link inspection of `ROADMAP.md` and `work/designs/open/distributed-turn-poc/` reported these thirteen misses:

1. `ROADMAP.md` used `#the-d-d-foundation`. The heading `## The D&D foundation` slugs to `#the-dd-foundation`.
2. D1 line 5 used `../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows`.
3. D1 ratification used that same short root for execution, topology, data, Storyteller publication, and client HTTP (five links).
4. D3 linked `2026-11-19--boot01-ratify-campaign-bootstrap-contract`, a leaf that does not exist.
5. D4 linked `2026-11-19--story01-ratify-remote-storyteller-handoff`, a leaf that does not exist.
6. D5 used the short `../../../docs/` root for the execution heading.
7. The execution reconciliation used that short root for topology and for the execution heading (two links).

After, on this worktree: items 2, 3, 6, and 7 already use `../../../../docs/` and were left untouched. Item 1 now uses `#the-dd-foundation`. Item 4 now names `work/changes/open/2026-11-19--boot01-ratify-candidate-and-start-ownership/CHANGE.md`. Item 5 now names `work/changes/archive/2026-11/other/2026-11-19--story01-ratify-task-custody-and-publication-contract/CHANGE.md`. The D4 operative handoff was not rewritten.

## Authority and baseline

- **Product:** [The D&D foundation](../../../../../../docs/product/foundations/vision.md#the-dd-foundation) and [World-independent foundation](../../../../../../docs/product/gameplay/rules.md#world-independent-foundation) were read and not edited. The heading text stays `The D&D foundation`.
- **Technical:** [Commands, business events, and workflows](../../../../../../docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows) and [Proposed service ownership](../../../../../../docs/technical/platform/topology.md#proposed-service-ownership) were read and not edited. A story-command wake remains the PostgreSQL outbox delivered by a direct Temporal RPC. RabbitMQ stays an optional post-commit fact.
- **Evidence / source:** Baseline `83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5`. `apps/worker/src/outbox/dispatch.ts` still starts or signals with the Temporal client. No source behavior changed.
- **Proposals / unknowns:** BOOT01 stays Ready and unselected. A post-commit consumer is not selected. This packet does not ratify a new broker topic.

## Exact scope and exclusions

- **Edited:** `ROADMAP.md` anchor only; `work/designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md` BOOT01 link; `work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md` STORY01 link. On archive, the audit A6 link in `work/designs/open/distributed-turn-poc/AUDIT-2026-11-19--2f45deed.md` is retargeted to this packet's archive path.
- **Left as already corrected:** `work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md`, `work/designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md`, and `work/designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md`.
- **Executable source/tests/config:** unchanged because this is a documentation-only Change. No intended code diff. Scripts were not edited.
- **Queue:** `work/changes/README.md` is not edited. After this packet moves, that row still names the open path. The orchestrator owns that link.
- **Preserve:** who publishes, who owns the scene checkpoint, and the direct Temporal wake. Heading words were not rewritten to force a slug.
- **Exclude:** AUD03, snapshot scripts, STATUS, packages, apps, infra, the cluster lock, kind, and kubectl. No placeholder document.

## Acceptance and discriminating negative proof

- **Normal:** each of the thirteen snapshot misses resolves to an existing file, and the three that were still broken on this baseline now use the real anchor or the real packet.
- **Negative:** fixing a link does not change who publishes, who owns the checkpoint, or how a story command reaches Temporal. A lean snapshot that omits an archived file is not a repository regression. The full-checkout checker is not weakened.
- **Verification:** Before archive, `python3 scripts/check_docs.py` reported 0 problems on 414 files. `pnpm wiki:change-guard --mode plan --change work/changes/open/2026-11-19--aud02-repair-snapshot-proven-document-links` reported ok with no findings. `pnpm wiki:change-guard --mode close --change work/changes/open/2026-11-19--aud02-repair-snapshot-proven-document-links --base 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5` reported ok. It warned that `docs/README.md` cites `ROADMAP.md`. That citation is a file link with no heading fragment, so it was left. After archive, `python3 scripts/check_docs.py` reports one problem at `work/changes/README.md:201`, the open AUD02 path. That queue file was left. No provider call was performed.
- **Human decision gate:** none. The real STORY01 leaf already existed. The real BOOT01 leaf already existed.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because the D&D foundation heading text and the world-independent rules stay as written | docs/product/foundations/vision.md#the-dd-foundation | No product page is in the diff |
| Technical | unchanged: the direct outbox wake and the separate post-commit fact stay on the unedited heading | docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | Design notes that already use the long docs root were left in place |
| Code | unchanged because no executable modification is authorized. Negative: the edit must not move the scene checkpoint or place the story SSE stream on RabbitMQ | apps/worker/src/outbox/dispatch.ts | Inspected diff has no executable files |
| Related | changed: work/designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md and work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md now name the packets that exist, and ROADMAP.md uses the real vision anchor | work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md | Queue row stays with the orchestrator |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/product/foundations/vision.md#the-dd-foundation | product | unchanged: the heading remains The D&D foundation and only the ROADMAP anchor was pointed at that existing slug | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | The anchor repair does not add a mandatory inventory or economy | ROADMAP.md now uses #the-dd-foundation |
| docs/product/gameplay/rules.md#world-independent-foundation | product | unchanged: this anchor already resolved and the rules page was not edited | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | The link repair does not turn tracked items into a required economy | No rules edit |
| docs/technical/platform/execution-and-delivery.md#commands-business-events-and-workflows | technical | unchanged: the outbox still wakes Temporal by a direct RPC and this heading was not edited | no source behavior changed; apps/worker/src/outbox/dispatch.ts at 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | A retargeted packet link must not be read as a RabbitMQ hop in front of Temporal | D1, D5, and the reconciliation already link here and were not rewritten |
| docs/technical/platform/topology.md#proposed-service-ownership | technical | unchanged: the engine remains the scene-checkpoint boundary and this heading was not edited | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | This Change does not hand the checkpoint to the Storyteller or to a broker | No topology edit |
| work/designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md | evidence | changed: the BOOT01 link now names the existing candidate-and-start packet instead of a leaf that was never created | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | The retarget does not invent a second creation API or a bypass of the opening candidate | Same destination already used by GAPS.md |
| work/designs/open/distributed-turn-poc/D4-STORYTELLER-HANDOFF.md | evidence | changed: the status link now names the archived custody packet; the operative handoff section was not rewritten | no source behavior changed; packages/workflows/src/index.ts at 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | The status link does not move publication off the engine or put the wake on RabbitMQ | Archive leaf story01-ratify-task-custody-and-publication-contract |
| work/designs/open/distributed-turn-poc/D1-EXECUTION-CONTRACT.md | evidence | unchanged: the six short docs links were already corrected to the repository docs root on this baseline | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | This Change does not reopen a broker wake in the operative rule | Left in place |
| work/designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md | evidence | unchanged: the execution link already uses the repository docs root | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | Gate A is not turned back into a broker hop | Left in place |
| work/designs/open/distributed-turn-poc/EXECUTION-RECONCILIATION-2026-11-19.md | evidence | unchanged: the topology and execution links already use the repository docs root | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | The page is not edited into a mandatory broker chain | Left in place |
| apps/worker/src/outbox/dispatch.ts | code | unchanged: no executable modification is authorized; the inspected module still calls the Temporal client | no source behavior changed; apps/worker/src/outbox/dispatch.ts at 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | A documentation link must not move the scene checkpoint or place the story SSE stream on RabbitMQ | No source map change |
| work/changes/README.md | evidence | unchanged: the orchestrator owns the queue, so this packet does not retarget the AUD02 row | no source behavior changed; 83e910d3bf43fd7e6146c5d6a68e58427fe1b3f5 | reviewed | This Change does not start AUD03 or any other packet | Left for the orchestrator, including the open-path row after archive |
