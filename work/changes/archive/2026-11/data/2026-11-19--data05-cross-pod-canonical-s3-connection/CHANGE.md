# DATA05 | Prove one object is shared by two isolated Pods

**State:** Done (2026-11-19)
**Kind:** implementation
**Approval and owner:** The owner authorized this packet for one executor on branch `change/data05-shared-object`. The write set is `infra/kubernetes/lab/document-access/`, `docs/runbooks/kubernetes-document-access.md`, and this packet. Queue indexes and the selected document-store heading stay untouched unless the proof changes what that heading says about a second Pod.
**Parent:** [Distributed architecture lab queue](../../../../README.md)

## Cursor first-screen brief

> **Current-source map:** [Selected document store](../../../../../../docs/technical/platform/data-and-persistence.md#selected-document-store), [Kubernetes object storage](../../../../../../docs/runbooks/kubernetes-object-storage.md), `packages/documents/src/s3-store.ts`, inspected at `25d75a9a`.
>
> **Primary governing contract:** The existing S3 adapter keeps canonical JSON, SHA-256 keys, and no local fallback. SeaweedFS 4.54 stays the lab store. This Change does not design a new store.
>
> **Known trap:** Game Authority and Storyteller are not separate application entrypoints. A Pod-local file is not the canonical object. A failed S3 call must not be saved locally and called the object. Publication does not write a scene checkpoint here, and this proof is not a historical fork.
>
> **Scope/permission:** Two verification Jobs only. No edits under `packages/`, `apps/`, `infra/kubernetes/lab/object-storage/`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, or `docs/runbooks/README.md`. No paid provider call.

## Target alignment

- **Outcome:** One writer Job puts one object. A different reader Job returns the same bytes and the same SHA-256. After the writer Pod is replaced, the reader still returns those bytes. A missing key and a denied read fail closed.
- **Current-source baseline:** `25d75a9a` on branch `change/data05-shared-object`. K8S05 already proved SeaweedFS 4.54. `packages/documents/src/s3-store.ts` and `packages/documents/src/document-store-config.ts` already refuse a silent local fallback.
- **End-state relationship:** This is the isolated two-Pod object proof. Nest API and worker integration stays pending.
- **Alternative considered:** Start `apps/api` and `apps/worker` as the two Pods. Those processes are not separate Game Authority and Storyteller entrypoints, and this authorization does not edit them.
- **Readiness:** The locked smoke passed and the cluster was deleted. The observed commands, images, hash, and Pod uids are in [Kubernetes document access](../../../../../../docs/runbooks/kubernetes-document-access.md#observed-local-run).

## Outcome and motivation

Show that one object in the existing lab bucket can be written by one Pod and read by another Pod, with the same SHA-256, without a Pod-local directory becoming a second authority.

## Authority and baseline

- **Product:** [Vision](../../../../../../docs/product/foundations/vision.md) stays unchanged. No new player mechanic.
- **Technical:** [Selected document store](../../../../../../docs/technical/platform/data-and-persistence.md#selected-document-store) stays the adapter contract. This proof does not edit that heading unless a second-Pod sentence there becomes false. [Boundary map](../../../../../../docs/technical/platform/security-and-trust-boundaries.md#boundary-map) still says content-addressed bytes are the store contract. [Remote task custody](../../../../../../docs/technical/storyteller/generation-and-publication.md#remote-task-custody) still says the Storyteller does not commit the checkpoint.
- **Evidence:** `packages/documents/src/s3-store.ts` object keys and `packages/documents/src/document-store-config.ts` fail-closed S3 mode, at `25d75a9a`. No paid provider call.
- **Open decisions:** Nest and worker wiring to the lab Service stays pending. Production bucket policy stays out of this lab.

## Exact scope and exclusions

- **Implementation:** `infra/kubernetes/lab/document-access/namespace.yaml`, `infra/kubernetes/lab/document-access/writer-job.yaml`, `infra/kubernetes/lab/document-access/reader-job.yaml`, and `infra/kubernetes/lab/document-access/smoke.sh`. The smoke applies `infra/kubernetes/lab/object-storage/store.yaml` and does not edit it.
- **Documentation:** CREATE `docs/runbooks/kubernetes-document-access.md`. It records the two Jobs, the fail-closed checks, and the limit that deleting the kind cluster does not preserve local-path data and is not a backup.
- **Exclude:** `packages/**`, `apps/**`, object-storage manifests, kind `up.sh`, `down.sh`, `lib.sh`, `kind.yaml`, other open Change packets, `work/designs/**`, `STATUS.md`, `ROADMAP.md`, `work/changes/README.md`, `work/changes/ledger/**`, and `docs/runbooks/README.md`.
- **Dependencies:** K8S05 store and K8S01 kind lab. The shared cluster lock. No second store design.

## Acceptance and discriminating negative proof

- **Normal:** Writer Job puts one object at `objects/sha256/<ab>/<hash>.json` in bucket `lab-objects`. Reader Job, with a different Pod uid, gets the same bytes and the same SHA-256. The writer Job is deleted and created again with a new Pod uid. The reader still gets that SHA-256.
- **Negative:** The reader cannot put a different payload at the same key. A Pod-local file is not the canonical object. A missing key fails closed. A read with an uninstalled key fails closed. A put to a closed endpoint does not create `/tmp/pod-local-canonical` and call it the object. S3 mode in `packages/documents/src/document-store-config.ts` is not given a local fallback by this Change.
- **Validation:** `pnpm wiki:change-guard --mode plan` before the smoke, and `--mode close` after the ledger is filled. No paid provider call.
- **Human gate:** Paid providers, deploy, non-disposable data, and a product-rule change stay out of this packet.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because docs/product/foundations/vision.md gains no player-facing behavior | docs/product/README.md | Negative: a lab Job name is not a player promise |
| Technical | unchanged because docs/technical/platform/data-and-persistence.md#selected-document-store keeps the adapter contract, and this proof does not rewrite a second-Pod sentence there | docs/technical/platform/security-and-trust-boundaries.md#boundary-map | The lab Jobs are not the Nest API or the worker |
| Code | changed: infra/kubernetes/lab/document-access/namespace.yaml, infra/kubernetes/lab/document-access/writer-job.yaml, infra/kubernetes/lab/document-access/reader-job.yaml, and infra/kubernetes/lab/document-access/smoke.sh; negative: the reader must not write a different payload, and a Pod-local file must not be accepted as the object | packages/documents/src/s3-store.ts | Locked smoke on the existing SeaweedFS Service |
| Related | changed: CREATE docs/runbooks/kubernetes-document-access.md records the two Jobs and the cluster-deletion limit. The runbook index and work/changes/README.md stay with their owners. | docs/runbooks/kubernetes-object-storage.md | Diff-backed evidence after the smoke |

## Handoff and next action

- The smoke passed. This packet is archived under `work/changes/archive/2026-11/other/` after the close guard.
- `work/changes/README.md` still points at the open path. That index is owned by another agent, so this executor does not edit it.
- Nest API and worker integration remains pending. No successor Change is selected.

## Reconciliation ledger (fill before Done)

| Affected selected claim/heading | Authority | Target delta and reason | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update |
| --- | --- | --- | --- | --- | --- | --- |
| docs/runbooks/kubernetes-document-access.md#observed-local-run | Related | changed: the procedure records SeaweedFS 4.54, bucket lab-objects, key objects/sha256/49/4959e7f0c4411fc6b0511056195fd9631e518f51119ad34310441f39ef08470d.json, and SHA-256 4959e7f0c4411fc6b0511056195fd9631e518f51119ad34310441f39ef08470d read by a different Pod | docs/runbooks/kubernetes-document-access.md and infra/kubernetes/lab/document-access/smoke.sh against parent 25d75a9a | tested | The reader put of a different payload was denied. A missing key and a denied read failed closed. A dead endpoint did not create a local canonical file. The reader rejected its Pod-local file. | new runbook only |
| docs/technical/platform/data-and-persistence.md#selected-document-store | Technical | unchanged: the heading does not say a second Pod is unproved, and the adapter contract stays as written | packages/documents/src/s3-store.ts and packages/documents/src/document-store-config.ts at 25d75a9a | reviewed | S3 mode still has no local fallback in document-store-config.ts | no edit |
| docs/technical/platform/security-and-trust-boundaries.md#boundary-map | Technical | unchanged: content-addressed bytes stay the store contract, and a lab reader Job is not a story permission | docs/technical/platform/security-and-trust-boundaries.md at 25d75a9a | reviewed | Admit does not become a public or cross-story reveal | no edit |
| docs/technical/storyteller/generation-and-publication.md#remote-task-custody | Technical | unchanged: this proof does not publish and does not write a scene checkpoint | docs/technical/storyteller/generation-and-publication.md at 25d75a9a | reviewed | Two verification Jobs are not publication | no edit |
| docs/technical/engine/lifecycle-and-compatibility.md | Technical | unchanged: this proof does not write a fork and does not claim a historical fork | docs/technical/engine/lifecycle-and-compatibility.md at 25d75a9a | reviewed | A shared lab object is not a fork of a story | no edit |
| docs/product/foundations/vision.md | Product | unchanged: the lab Jobs add no player-facing mechanic | docs/product/foundations/vision.md at 25d75a9a | reviewed | A Job name is not a new player promise | no edit |
| work/changes/README.md | Related | unchanged: the queue index stays with the coordinating agent | work/changes/README.md at 25d75a9a | reviewed | This executor does not select a successor Change | inbound open-path link left in place |
