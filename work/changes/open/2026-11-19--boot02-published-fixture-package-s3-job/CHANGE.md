# BOOT02 | Controlled POC fixture publication and pinned S3 package import

**State:** Proposed; dependency-gated (2026-11-19)  
**Kind:** implementation  
**Selection:** Not currently selected; existing active Cursor batch remains untouched.  
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

## planned-impact.v1

| Plane | Intended diff | Verification |
| --- | --- | --- |
| Product | Unchanged: text-first D&D-like DM, meaningful authored world/rule pins; no mandatory economy or forced inventory | Existing creation promise, no new product mechanic |
| Technical | Campaign bootstrap + exact scene-1 state/canon root in selected technical owners; current/target/implemented distinguished | Versioned path diagram, negative reading |
| Code | Bounded source and tests at explicit owners above | Provider-free test and later real cluster evidence |
| Related | Change queue and impacted runbooks/status, not an invented completed deployment | Wiki and Change guards, link repair |

## Reconciliation ledger (complete at closure)

| Claim owner | Delta or no-op | Source SHA/diff | Normal/negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Creation/product | unchanged | Pending | Pending | Pending |
| Technical bootstrap | reconcile to code | Pending | Pending | Pending |
| Candidate/game-authority source | bounded migration | Pending | Pending | Pending |
| Canonical package + scene1 | pending | Pending | Pending | Pending |

Archive only after actual evidence and `pnpm wiki:change-guard --mode plan` / `--mode close` where applicable; no automatic next packet.
