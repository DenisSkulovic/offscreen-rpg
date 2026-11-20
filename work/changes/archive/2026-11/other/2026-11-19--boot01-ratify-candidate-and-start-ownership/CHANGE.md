# BOOT01 | Ratify opening candidate, package and Game Authority start ownership

**State:** Cancelled/superseded (2026-11-19). Not Done. Acceptance cases moved to BOOT03. Start admission is not implemented.  
**Supersession:** HK09 archived this packet as Cancelled/superseded, not Done. The unique acceptance cases and negative tests now live in [BOOT03](../../../../archive/2026-11/other/2026-11-19--boot03-game-authority-start-admission/CHANGE.md#absorbed-boot01-cases-2026-11-19). No provider was called.
  
**Kind:** documentation  
**Selection:** Not currently selected; existing active Cursor batch remains untouched.  
**Program:** [D3 campaign bootstrap](../../../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../../../designs/open/distributed-turn-poc/GAPS.md)

## Exact outcome and preconditions

Ratify opening candidate, package and Game Authority start ownership. **Preconditions:** DIST01 writer decision; ARCH02 integration; source current candidate pathways.

The POC must retain current successful opening-candidate admission. A start package is not a successful candidate. It describes reusable pinned world/rule/start content and activation, but an actual generation candidate and associated current draft are validated separately. Existing current source `packages/application/src/stories/start.ts::createStoryStart` requires `candidateId` and `expectedDraftRevision`, and `packages/contracts/src/stories.ts::startStorySchema` preserves this. Reinspect current main and Cursor branches before changes.

## Scope and implementation boundaries

Read the selected creation docs, packages/application/src/stories/{start,initialization,index}.ts, packages/contracts/src/{stories,campaign}.ts, apps/api/src/modules/stories/controller.ts, packages/documents/src/{start-instantiation,start-import}.ts. Write exact ownership/call chart: draft, generation candidate, root package authorization, domain command and first-scene SQL writer. Preserve both creation routes, choose existing scripted opening candidate for POC and exact stage-first/transaction-later workflow. Specify current start idempotency digest/equivalence, package activation, rules/world pin checks, source versions, initialization checkpoint hook and rejection codes. Reconcile with DIST03 private GA, DATA01/03 scene1 checkpoint and D3, not a new bypass endpoint.

**Owner files and first-class docs:** Product unchanged: two creation routes remain; initial text-first scene is chosen from an actual existing successful candidate. Technical: docs/technical/platform/topology.md, data-and-persistence.md, storyteller/canonical-documents-and-packages.md#campaign-bootstrap, docs/runbooks/content-package-authoring.md; source docs no executable modifications.

**Do not:** invent another creation API, remove existing freeform/scripted pathways, bypass generation status/owner checks with raw SQL, create a fictional Economy service, treat a world-package root as current campaign state, run LLM/image/Stripe providers, import writable source directories into every Pod, or claim a working historical fork based only on the initial source passage.

## Acceptance: normal and discriminating negatives

A successful scripted candidate + pinned source is admissible once. A package by itself is *not* a candidate; an arbitrary success row, changed candidate/draft, missing object or incompatible rules cannot start a story. Show actual current code guard and exactly which writer moves.

Minimum test evidence: exact commands and target environment, current source hashes and diff, typed request/response version, source selection and package pins, idempotent repeated start, permission/root mismatch refusal, source-to-technical-doc impact, and all not-run tests labeled honestly. Compare current local/Compose path and target distributed mode independently.

## Parallelization

Read-only candidate/package audit parallel to K8S and DATA01 work, but serialize shared topology/data headings with DIST01 and DATA01.

Independent authoring or tests may use separate Git worktrees under the repo's parallel Change policy, but shared `apps/api`/GA private endpoints, scene-1 publication and canonical technical headings must be integrated by one owner. Shared Kubernetes cluster commands run under the existing lock. This packet alone is not approval for execution.

## planned-impact.v1

| Plane | Intended diff | Verification |
| --- | --- | --- |
| Product | Unchanged: text-first D&D-like DM, meaningful authored world/rule pins; no mandatory economy or forced inventory | Existing creation promise, no new product mechanic |
| Technical | Campaign bootstrap + exact scene-1 state/canon root in selected technical owners; current/target/implemented distinguished | Versioned path diagram, negative reading |
| Code | No executable diff | Canonical docs reconciliation |
| Related | Change queue and impacted runbooks/status, not an invented completed deployment | Wiki and Change guards, link repair |

## Reconciliation ledger (complete at closure)

| Claim owner | Delta or no-op | Source SHA/diff | Normal/negative proof | Link/status |
| --- | --- | --- | --- | --- |
| Creation/product | unchanged | Pending | Pending | Pending |
| Technical bootstrap | ratify | Pending | Pending | Pending |
| Candidate/game-authority source | unchanged | Pending | Pending | Pending |
| Canonical package + scene1 | pending | Pending | Pending | Pending |

Archive only after actual evidence and `pnpm wiki:change-guard --mode plan` / `--mode close` where applicable; no automatic next packet.
