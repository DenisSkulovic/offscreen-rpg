# BOOT04 | Create and start a real campaign through the distributed web edge

**State:** Cancelled/superseded (2026-11-19). Not Done. Acceptance cases moved to TURN03. The creation fixture is not implemented.  
**Supersession:** HK09 archived this packet as Cancelled/superseded, not Done. The unique acceptance cases and negative tests now live in [TURN03](../../../../open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md#absorbed-pre-fork-and-scorecard-cases-2026-11-19). No provider was called.
  
**Kind:** implementation  
**Selection:** Not currently selected; existing active Cursor batch remains untouched.  
**Program:** [D3 campaign bootstrap](../../../../../designs/open/distributed-turn-poc/D3-CAMPAIGN-BOOTSTRAP.md) · [DISTURN](../../../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../../../designs/open/distributed-turn-poc/GAPS.md)

## Exact outcome and preconditions

Create and start a real campaign through the distributed web edge. **Preconditions:** BOOT02 + BOOT03, K8S11 Next/Nest integration, DATA03 scene1 checkpoint, complete selected cluster substrate.

The POC must retain current successful opening-candidate admission. A start package is not a successful candidate. It describes reusable pinned world/rule/start content and activation, but an actual generation candidate and associated current draft are validated separately. Existing current source `packages/application/src/stories/start.ts::createStoryStart` requires `candidateId` and `expectedDraftRevision`, and `packages/contracts/src/stories.ts::startStorySchema` preserves this. Reinspect current main and Cursor branches before changes.

## Scope and implementation boundaries

Build one provider-free integration fixture using the existing draft and opening candidate path, true same-origin Next/Nest + Game Authority start endpoint, pinned S3 packages and CloudNativePG, then render initial scene in the Living Book. Assert exact first-scene SQL checkpoint+canon manifest, initial user-owned GET, stable retry and readiness, browser hydration and no unauthorized command. Use existing scriptable opening route or fixture through admitted generation records, never direct unvalidated DB inserts. Record full causal trace and actual image/migration/config versions; verify production-style app Pods do not mount content directories. This is a first-scene integration only; no Rabbit or Storyteller continuation is required to pass BOOT04.

**Owner files and first-class docs:** Code: existing apps/web creation and apps/api story routes, e2e test owner, infra/kubernetes integration fixture, docs/runbooks and evidence. Product untouched. If current browser creation works, only add necessary transport/config and tests; don't redesign UX.

**Do not:** invent another creation API, remove existing freeform/scripted pathways, bypass generation status/owner checks with raw SQL, create a fictional Economy service, treat a world-package root as current campaign state, run LLM/image/Stripe providers, import writable source directories into every Pod, or claim a working historical fork based only on the initial source passage.

## Acceptance: normal and discriminating negatives

Cold cluster → login → draft/candidate → start → SSR scene1 → refresh; retry same request no new passage; invalid owner/candidate/hashes rejected; restart Pods retains story. Separate report for anything untested.

Minimum test evidence: exact commands and target environment, current source hashes and diff, typed request/response version, source selection and package pins, idempotent repeated start, permission/root mismatch refusal, source-to-technical-doc impact, and all not-run tests labeled honestly. Compare current local/Compose path and target distributed mode independently.

## Parallelization

Can implement e2e runner fixture in isolated worktree during BOOT03, but integrated live test awaits GA + package importer + K8S11. Shared gateway/cluster one coordinator.

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
