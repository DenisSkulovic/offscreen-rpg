# BOOT02 | Controlled POC fixture publication and pinned S3 package import

**State:** Implementing — local fixture import landed; shared-cluster Pod proof pending (2026-11-19)
**Kind:** implementation
**Selection:** Not currently selected; existing active Cursor batch remains untouched. This slice does not edit the change queue. The packet is not Done.
**Program:** [D3 campaign bootstrap](../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

## Exact outcome and preconditions

Controlled POC fixture publication and pinned S3 package import. **Preconditions:** BOOT01 selected content/pins; DATA05/K8S05 shared object store for final proof; can test existing DocumentStore locally before cluster.

The POC must retain current successful opening-candidate admission. A start package is not a successful candidate. It describes reusable pinned world/rule/start content and activation, but an actual generation candidate and associated current draft are validated separately. Existing current source `packages/application/src/stories/start.ts::createStoryStart` requires `candidateId` and `expectedDraftRevision`, and `packages/contracts/src/stories.ts::startStorySchema` preserves this. Reinspect current main and Cursor branches before changes.

## Scope and implementation boundaries

Using existing importStartPackageDirectory/importWorldPackageDirectory/importRulePackageDirectory and docs/runbooks/content-package-authoring.md, add controlled noninteractive admin bootstrap task/Job to import one explicitly selected fixture's world/rules/start source directory from a trusted pinned image/build and publish immutable hashes to the same S3-compatible store used by Game Authority. Define inputs/digest lock, startup credentials, environment and output pin catalogue. Do not change start import schemas or mount the repo read-write in app Pods. Repeated run must yield identical root hashes; fail on wrong checksum, unsupported licensed source, missing dependencies, symlink or unknown executable adapter. Do not publish an untested package in a user-facing catalogue. Include local adapter tests and shared-cluster separate-process read proof.

**Owner files and first-class docs:** Code: infra/kubernetes/lab content-bootstrap Job or existing image/release owner; small scripts under existing content import scripts rather than new framework; packages/documents only if verified missing capability. Docs: content-package-authoring runbook, canonical document technical bootstrap heading, infrastructure runbook.

**Do not:** invent another creation API, remove existing freeform/scripted pathways, bypass generation status/owner checks with raw SQL, create a fictional Economy service, treat a world-package root as current campaign state, run LLM/image/Stripe providers, import writable source directories into every Pod, or claim a working historical fork based only on the initial source passage.

## Acceptance: normal and discriminating negatives

Pin chosen fixture version and root, import/reimport same source, verify object hashes across Pods and restart. Failure leaves no activated campaign, no leaked creds and no changed prior root. Explicit no payment/provider spend.

Minimum test evidence: exact commands and target environment, current source hashes and diff, typed request/response version, source selection and package pins, idempotent repeated start, permission/root mismatch refusal, source-to-technical-doc impact, and all not-run tests labeled honestly. Compare current local/Compose path and target distributed mode independently.

## Parallelization

Can implement scripts/image independently from BOOT03 GA HTTP route after BOOT01; serialize S3 Job runtime with DATA05/K8S05 shared cluster owner.

Independent authoring or tests may use separate Git worktrees under the repo's parallel Change policy, but shared `apps/api`/GA private endpoints, scene-1 publication and canonical technical headings must be integrated by one owner. Shared Kubernetes cluster commands run under the existing lock. This packet alone is not approval for execution.

## Planned specification and implementation delta | planned-impact.v1

| Plane     | Intended diff                                                                                                                                                                                                                                                           | Verification                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Product   | unchanged because a start package stays a content pin and is not an opening candidate; this slice adds no creation API and no campaign row                                                                                                                              | Existing creation promise in packages/application/src/stories/start.ts stays untouched |
| Technical | unchanged because docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap already says import publishes a manifest only and does not create a campaign; the shared-cluster Job is not claimed                                                 | Same heading left in place. Cluster Pod proof remains unrun                            |
| Code      | changed: scripts/repo-tools/import-pinned-fixture.mjs and scripts/repo-tools/import-pinned-fixture.test.mjs import the trusted fixture and reject a wrong checksum, a symlink, or a missing dependency. package.json exposes fixture:import                             | Negative: those three failures leave fixture-pin.json unchanged                        |
| Related   | changed: docs/runbooks/content-package-authoring.md#commands records the local command and states the pin is an operator file. work/changes/README.md, STATUS.md, and ROADMAP.md stay unedited because this slice does not select the packet or claim the cluster proof | Wiki change guard and check_docs.py                                                    |

## Local slice

`scripts/repo-tools/import-pinned-fixture.mjs` imports the checked-in Seyda Neen fixture through `importRulePackageDirectory`, `importWorldPackageDirectory`, and `importStartPackageDirectory`. It checks the pinned world root `5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9`, rule root `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab`, and start root `e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813`. A second run writes those same hashes to `fixture-pin.json` in the caller-supplied store.

A wrong checksum, a symlink, or a missing dependency exits non-zero and leaves the previous pin file unchanged. The script does not create a campaign row, does not add an opening candidate, and does not publish a user-facing catalogue. A start package is not a successful opening candidate.

The shared-cluster Pod proof is pending. This packet is not Done. Cluster `offscreen-lab` was not started. `infra/kubernetes/lab` was not edited. No paid provider call was made.

Touched files: `scripts/repo-tools/import-pinned-fixture.mjs`, `scripts/repo-tools/import-pinned-fixture.test.mjs`, `docs/runbooks/content-package-authoring.md`, `package.json`.

## Reconciliation ledger

| Affected selected claim/heading                                                   | Authority  | Target delta (changed/unchanged; reason)                                                                                                                 | Source delta & inspected SHA                                                                                                                                    | Status/evidence tier | Negative proof                                                                                                          | Map/link update or N/A |
| --------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Creation and opening candidate                                                    | product    | unchanged because this slice adds no creation API, no campaign row, and does not treat a start package as a successful opening candidate                 | no source behavior changed; packages/application/src/stories/start.ts was not edited; baseline baf75f03                                                         | source-observed      | A start package root is not a successful opening candidate                                                              | N/A                    |
| docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap | technical  | unchanged because import still publishes a package manifest only and does not create a campaign; the shared-cluster store is not claimed on that heading | docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap re-read; packages/documents/src/start-import.ts not edited; baseline baf75f03 | source-observed      | A local pin must not be read as a campaign manifest or as a player catalogue                                            | N/A                    |
| scripts/repo-tools/import-pinned-fixture.mjs                                      | code       | changed: local noninteractive import of the trusted Seyda Neen fixture with a pinned checksum check                                                      | scripts/repo-tools/import-pinned-fixture.mjs and scripts/repo-tools/import-pinned-fixture.test.mjs                                                              | fixture-tested       | A wrong checksum, a symlink, and a missing dependency each fail and leave the previous fixture-pin.json bytes unchanged | N/A                    |
| docs/runbooks/content-package-authoring.md#commands                               | task guide | changed: the commands section names the local fixture import and says the pin is an operator file                                                        | docs/runbooks/content-package-authoring.md#commands                                                                                                             | source-observed      | The command must not be read as the shared-cluster Pod proof or as publication in a player catalogue                    | same page              |
| Shared-cluster Pod proof                                                          | technical  | unchanged because the Job was not run and cluster offscreen-lab was not started                                                                          | not run; infra/kubernetes/lab was not edited                                                                                                                    | not run              | A local store pin is not evidence that a second Pod can read the same object                                            | N/A                    |

Archive only after the shared-cluster Pod proof and `pnpm wiki:change-guard --mode plan` / `--mode close`. No automatic next packet. The packet stays open while that Pod proof is pending.
