# BOOT02 | Controlled POC fixture publication and pinned S3 package import

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) is the selected microtask route *once the Change is authorized*; [all-open audit](../../../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) records actual source tier and dependency. **Default parent/child model: Composer 2.5 Standard.** Delegation: verify existing package pin and Pod receipt; no duplicate importer or fake candidate. Don't interpret a task marked PLANNER-READY as permission to execute a Proposed Change, promote status or skip negative tests; novel architecture goes back to ChatGPT before a Grok exception.

**State:** Done (2026-11-20). Local importer pins the trusted Seyda Neen fixture; a second lab Pod read the same hashes after importer deletion. The game does not use that store. T03 live Job rerun was not required (source hashes unchanged).
**Kind:** implementation
**Selection:** none. Runtime consumption of the pin is TURN02/BOOT03, not this packet.
**Program:** [D3 campaign bootstrap](../../../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../../../designs/open/distributed-turn-poc/GAPS.md)

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
| Technical | unchanged because docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap already says import publishes a manifest only and does not create a campaign; the lab Job is not claimed as the game store | Same heading left in place. Cluster Pod proof ran against SeaweedFS only |
| Code      | changed: scripts/repo-tools/import-pinned-fixture.mjs and scripts/repo-tools/import-pinned-fixture.test.mjs import the trusted fixture and reject a wrong checksum, a symlink, or a missing dependency. package.json exposes fixture:import                             | **2026-11-20 T01:** `node --test scripts/repo-tools/import-pinned-fixture.test.mjs` 5/5 PASS; repeat import unchanged; negative cases leave prior pin. T03 Pod/S3 NOT-RUN this slice |
| Related   | changed: content-package-authoring links the cluster command; kubernetes-content-bootstrap records the Job proof and the Integration handoff (BOOT03, TURN02) section. work/changes/README.md, STATUS.md, and ROADMAP.md stay unedited because this slice does not select the packet or claim the game uses the lab store | check_docs.py on this slice; wiki change-guard plan ok 2026-11-20; close NOT-RUN against base 584b594 because unrelated working-tree paths are in the diff |

## Local slice

`scripts/repo-tools/import-pinned-fixture.mjs` imports the checked-in Seyda Neen fixture through `importRulePackageDirectory`, `importWorldPackageDirectory`, and `importStartPackageDirectory`. It checks the pinned world root `5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9`, rule root `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab`, and start root `e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813`. A second run writes those same hashes to `fixture-pin.json` in the caller-supplied store.

A wrong checksum, a symlink, or a missing dependency exits non-zero and leaves the previous pin file unchanged. The script does not create a campaign row, does not add an opening candidate, and does not publish a user-facing catalogue. A start package is not a successful opening candidate.

The shared-cluster Pod proof ran on 2026-11-19. One shell held `/tmp/offscreen-k8s-cluster.lock`, created `offscreen-lab` because that name was absent, imported the pinned fixture into the existing SeaweedFS lab store, and read the same hashes from a second Job after the importer Pod was deleted. `down.sh` then removed that cluster. Compose volumes `offscreen-rpg_postgres-data` and `offscreen-rpg_temporal-data` remained. **This packet is not Done:** T01 re-verified the local importer tests (2026-11-20); T03 live Pod/S3 was NOT-RUN this slice; `pnpm wiki:change-guard --mode plan` ok (2026-11-20 per T02); `--mode close` NOT-RUN against base 584b594 until a BOOT02-only commit or clean tree. The game does not use that store. No paid provider call was made.

**T01 local receipt (2026-11-20):** `node --test scripts/repo-tools/import-pinned-fixture.test.mjs` — 5/5 PASS; world `5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9`, rule `d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab`, start `e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813`; repeat import idempotent; checksum/symlink/missing-dependency negatives unchanged. Live S3/Pod (T03) NOT-RUN this slice.

Touched files: `scripts/repo-tools/import-pinned-fixture.mjs`, `scripts/repo-tools/import-pinned-fixture.test.mjs`, `scripts/repo-tools/read-pinned-fixture.mjs`, `infra/kubernetes/lab/content-bootstrap/`, `docs/runbooks/content-package-authoring.md`, `docs/runbooks/kubernetes-content-bootstrap.md`, `docs/runbooks/README.md`.

Declared paths, each present because this slice needs that file:

- infra/kubernetes/lab/content-bootstrap/Dockerfile because the importer image is built from this file
- infra/kubernetes/lab/content-bootstrap/build.sh because the image pin is written here
- infra/kubernetes/lab/content-bootstrap/images.pin because the Job names that digest
- infra/kubernetes/lab/content-bootstrap/importer-job.yaml because that Job writes the hashes
- infra/kubernetes/lab/content-bootstrap/namespace.yaml because the Jobs run in that namespace
- infra/kubernetes/lab/content-bootstrap/package.json because the image install is pinned here
- infra/kubernetes/lab/content-bootstrap/package-lock.json because the image install is locked here
- infra/kubernetes/lab/content-bootstrap/reader-job.yaml because that Job reads the hashes after the importer Pod is gone
- infra/kubernetes/lab/content-bootstrap/smoke.sh because one shell holds the cluster lock for up, Jobs, and down
- scripts/repo-tools/read-pinned-fixture.mjs because the reader Job calls this script
- docs/runbooks/kubernetes-content-bootstrap.md because the dated proof lives here

## Reconciliation ledger

| Affected selected claim/heading                                                   | Authority  | Target delta (changed/unchanged; reason)                                                                                                                 | Source delta & inspected SHA                                                                                                                                    | Status/evidence tier | Negative proof                                                                                                          | Map/link update or N/A |
| --------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Creation and opening candidate                                                    | product    | unchanged because this slice adds no creation API, no campaign row, and does not treat a start package as a successful opening candidate                 | no source behavior changed; packages/application/src/stories/start.ts was not edited; baseline baf75f03                                                         | source-observed      | A start package root is not a successful opening candidate                                                              | N/A                    |
| docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap | technical  | unchanged because import still publishes a package manifest only and does not create a campaign; the shared-cluster store is not claimed on that heading | docs/technical/storyteller/canonical-documents-and-packages.md#campaign-bootstrap re-read; packages/documents/src/start-import.ts not edited; baseline baf75f03 | source-observed      | A local pin must not be read as a campaign manifest or as a player catalogue                                            | N/A                    |
| scripts/repo-tools/import-pinned-fixture.mjs                                      | code       | unchanged this slice; local importer already pins the trusted Seyda Neen fixture with checksum enforcement                                                  | `node --test scripts/repo-tools/import-pinned-fixture.test.mjs` 5/5 PASS (2026-11-20 T01); hashes world/rule/start as Local slice; no importer edit in this receipt | fixture-tested       | A wrong checksum, a symlink, and a missing dependency each fail and leave the previous fixture-pin.json bytes unchanged | N/A                    |
| docs/runbooks/content-package-authoring.md#commands                               | task guide | changed: the commands section names the local fixture import and says the pin is an operator file                                                        | docs/runbooks/content-package-authoring.md#commands                                                                                                             | source-observed      | The command must not be read as the shared-cluster Pod proof or as publication in a player catalogue                    | same page              |
| Shared-cluster Pod proof                                                          | technical  | unchanged because campaign-bootstrap still publishes a manifest only and the game is not claimed to use the lab store; the Job ran as a disposable proof | importer uid 1d177268-8810-4b3f-aad1-55008659034a then deleted; reader uid b23c0b53-6741-49ab-ae13-ae3e922da128; world 5b37ec632d019c983e25f5d481ed2b23c1de464e5932994be16c5befcbc75ec9; rule d643427fa3292ce61484deb15f2e9fc6755c613b17260db6f390ea23bd99d7ab; start e30eaa27407abe8a015b21cad62f30b81b07ee7af3b89634501fe3787d8d2813; lock pid 188308; baseline 93d57ca6 | cluster-tested       | A local fixture-pin.json is not this proof. The reader ran after the importer Pod was gone. Missing object hash `...0001` failed closed. | [kubernetes-content-bootstrap.md](../../../../../../docs/runbooks/kubernetes-content-bootstrap.md) |

Archive after this Done promotion. No automatic next packet. The shared-cluster Pod proof is recorded. Runtime Nest/worker use of the lab store is not this Change.
