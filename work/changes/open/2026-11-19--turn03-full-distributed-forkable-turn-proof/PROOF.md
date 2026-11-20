# TURN03 | one golden full-stack run, falsifiable proof and machine ledger

**Profile:** `PROOF`/RELEASE join · **Source baseline:** `584b594` · **State:** authored test specification, **NOT RUN**. Existing [D5 acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) remains normative. [POC current-head audit](../../../designs/open/distributed-turn-poc/POC-READINESS-AUDIT-2026-11-19.md) is the priority-ordered gap list. This is **one fixture and one integrated runner**, not a fourth test framework.

**Golden fork eligibility, selected 2026-11-20:** [source-grounded fixture decision](../../../designs/open/distributed-turn-poc/DECISION-2026-11-20--GOLDEN-FORK-SCOPE.md). For this POC only, do **not** require `microbe.v3` or a live executable obligation to fork. But the existing TURN03 Harbor-watch fixture **currently embeds an `executable-obligation`** in its start-package manifest even though request `worldObligations: []`. That creates a real `world_obligation` row and prevents checkpoint v1 staging. Repair the **fixture**, not the production admission check: golden is orientation-only, non-mechanical, zero obligations; assert one real verified scene-1 selector+object before starting its two-scene/fork scorecard. Preserve separate BOOT03 mechanical obligation coverage. The fixture is now orientation-only. Local preflight passed: zero obligations and one verified scene-1 selector, including on the Nest to Game Authority causal path. The cold-kind historical fork, stage 9, remains **NOT-RUN**. Active-mechanics historical fork remains a later checkpoint-v2 design.

## Selected candidate must be valid

Reuse the real `tools/api-integration/test/storyteller-imported-start.integration.ts:checkImportedStart` route with real S3 and authenticated requests:

- `storyteller.profiled.v1` opening generation with frozen `execution.mode=scripted`, `source.startPackage` pinned to imported S3 source, matching world/rule manifests, own draft and expected revision.
- Run this generation through existing supported **offline Storyteller opening** admission/settlement path, not an arbitrary manually inserted success row.
- Pass the resulting `candidateId` to Nest `PUT /api/stories/:id/start`, which must reach **private GA** (BOOT03). `packages/application/src/stories/start.ts` explicitly rejects a raw `opening.playable.scripted.v1` generation **with a startPackage**. Retain that failure as a negative. A start package manifest is not a generation.
- Opening scene 1 must be an accepted passage plus SQL story state and an immutable checkpoint selector to a real S3 object; check full checkpoint/root hash, not only rendered prose.

**Fixture authorship:** one pinned start package and one fixed action admissible in the selected rules engine, with one deterministic Storyteller fake result: descriptive change plus a separate supported mechanical consequence if that path exists at execution HEAD. The fake should not invent mechanical facts outside the canonical game consequence. Record exact source roots; do not hardcode a different SRD default rule root from `apps/api/src/main.ts`.

## End-to-end causal trace, one row per stage

| Stage | Initiator→owner | Required observable fact | Evidence identity |
| --- | --- | --- | --- |
| 0. Release | single operator → kind | real image digests+replicas; migrations exactly once; importer S3 proof; active runtime root hash | SHA, image digests, migration version, store endpoint |
| 1. Auth and candidate | browser/Nest → draft/opening owner | A signed-in real actor owns draft and succeeded Storyteller-kind scripted candidate | actor ID, story ID, candidate ID, source root, generation ID |
| 2. Start | Nest → GA | same candidate + expected revision commits exactly one initial passage and checkpoint | start operation/candidate, passage1, branch, checkpoint1, root1 |
| 3. Render | Next SSR → Nest authenticated GET | actual scene 1 text in SSR HTML; no private information cross-user | HTTP status/body hash/actor |
| 4. Command | browser → Nest→GA | supported action admitted with stable operation ID; 202 means accepted, **not** already published | command ID, revision, pending receipt |
| 5. Dispatch | SQL outbox → Temporal direct | one durable notice and one versioned distributed workflow start (duplicate wake reuses ID) | notice ID, workflow ID, Temporal history |
| 6. Execution | Temporal control → distinct executor queue | frozen root/task obtained via GA; one already-existing attempt; fake validated result saved | worker Pod identity, attempt ID, task root, result hash, execution mode fake |
| 7. Publication | control Activity → private GA | GA verifies root, adopts saved result in generation success contract, publishes exactly once | generation, passage2, checkpoint2, root2, publication receipt |
| 8. Client refresh | SQL notify → Nest SSE hint → Next Query GET | new version is fetched from authority; no command resend; refresh shows same scene2 | event version/GET response, client query record |
| 9. Historical branch | browser→Nest→GA | view scene1 as-of checkpoint1, fork **from scene1 not current head**, continue branch independently | fork story ID, branch root, parent root2 absent |
| 10. Recovery | kill selected worker/Pod → resume | state survives restart; no second passage, attempt or external model send | restarted Pod UID, activity history, canonical hash consistency |

**No Rabbit hop in stages 4–7.** D5 ratifies direct SQL outbox→Temporal. A separately selected `scene.published.v1` derived projection over Rabbit is a useful **optional parallel test**, never a POC prerequisite; its absence/lag must not block stage 7.

## Scorecard must classify evidence truthfully

Implement JSON under a dated `docs/observability/evaluations/` or other existing evidence owner and a short Markdown handoff. Suggested strict fields:

```json
{
  "schema": "offscreen.distributed-poc-proof.v1",
  "sourceSha": null,
  "imageDigests": {},
  "providerMode": "scripted",
  "fixture": {"worldRoot": null, "rulesRoot": null, "startRoot": null},
  "trace": {"storyId": null, "candidateId": null, "generationId": null, "workflowId": null, "attemptId": null, "passage1": null, "passage2": null, "scene1Checkpoint": null, "scene2Checkpoint": null, "scene1Root": null, "scene2Root": null, "forkRoot": null},
  "gates": [
    {"id": "cluster-real-app", "status": "NOT-RUN", "evidence": null},
    {"id": "candidate-start", "status": "NOT-RUN", "evidence": null},
    {"id": "auth-ssr", "status": "NOT-RUN", "evidence": null},
    {"id": "command-temporal-executor", "status": "NOT-RUN", "evidence": null},
    {"id": "ga-scene-publication", "status": "NOT-RUN", "evidence": null},
    {"id": "sse-get", "status": "NOT-RUN", "evidence": null},
    {"id": "historical-fork-independent-continuation", "status": "NOT-RUN", "evidence": null},
    {"id": "recovery-negative-matrix", "status": "NOT-RUN", "evidence": null}
  ],
  "overall": "NOT-RUN"
}
```

A gate can be `PASS`, `FAIL`, `BLOCKED` or `NOT-RUN`; `overall=PASS` only with **all mandatory** gates PASS. If one stage merely ran against an in-process LocalDocumentStore, store its `tier=pure|local|compose` separately, **not** `kind-cross-pod`. Never fill missing hashes with fake literal examples. The fixture is **scripted**, not proof of live model reasoning or narrative quality.

## Negative matrix, ordered by diagnostic value

| ID | Precise fault / conflicting observation | Required behavior | Primary existing harness / owning Change |
| --- | --- | --- | --- |
| N1 | wrong owner B reads/starts/forks; expired session or forged Cookie | signed-in actor A only, 401/403/404, no data leak | `tools/api-integration/test/{auth,story-start,storyteller-browser-creation}.integration.ts`, K8S11/BOOT03 |
| N2 | same candidate/start request twice; wrong candidate kind or mismatched package root | one passage/checkpoint; wrong pin never starts; raw playable scripted+startPackage rejected | `storyteller-imported-start.integration.ts`, BOOT03 |
| N3 | double submit same command, retry after HTTP timeout | stable operation ID/idempotence, no second mechanical effect or scene | `story-resolution.integration.ts`, DIST03 |
| N4 | broker down (only if optional consumer installed) | story turn still starts/publishes/GETs; projection may lag | DIST04 independent |
| N5 | stop Temporal before outbox dispatch and resume | notice remains durably pending; bounded retry; no Rabbit substitute | `apps/worker/test/relay.test.ts`, STORY03 |
| N6 | stop executor after claim before result save | fake may safely replay deterministic hash under explicit rules; **never silently dispatch a paid provider** | `packages/application/test/story02-task-claim.test.mjs`, STORY02 |
| N7 | stop executor after saved result, before GA publish | resume reads exact saved hash, publishes once without new generation | `storyteller-worker-replay.integration.ts`, STORY03 |
| N8 | kill control after GA commits but before Temporal Activity acknowledgement | replay idempotently finds already-published; no double passage, root or usage | `storyteller-activity-settlement.integration.ts`, STORY03 |
| N9 | task source at root R stale after other accepted command advanced root to R2 | preserve saved result/held stale; reject publication, no fabricated current root | `storyteller-publication-context.integration.ts`, DATA04/STORY03 |
| N10 | S3 missing/corrupt exact scene1 checkpoint | historical GET/fork fail closed, no fallback to current/latest, no invented scene | `packages/application/test/scene-checkpoint.test.mjs`, DATA04 |
| N11 | S3 staging succeeds then SQL throws, or S3 outage mid-commit | no reachable SQL selector to uncommitted content; no half scene | `scene-checkpoint-publication.test.mjs`, DATA04 |
| N12 | fork from scene1 after scene2, then continue fork | no parent-future lore/condition/item, own checkpoint and root, original scene2 unchanged | `packages/application/src/stories/forks.ts` + DATA06, TURN03 fixture |
| N13 | lost SSE/disconnected listener, GET refresh, old version arrives after new | no client command retry, monotonic version read, GET authoritative, auth maintained | `story-updates.integration.ts`, K8S11 |
| N14 | public HTTP request to GA internal endpoint, executor attempt to use broad publication route | no public route; role/auth denies; executor has no general DB writer credential | `apps/game-authority/test/story-seam.test.ts` + Kubernetes network policy, DIST03/STORY02 |

**Highest diagnostic**: N7, N8 and N9 distinguish an actually separated Storyteller from a choreographed diagram. N2 protects a critical source guard. N10/N12 distinguish historical-root behavior from latest-state cloning.

## Focused lower-tier tests prior to one expensive cold kind run

`scripts/repo-tools/focused-integration.mjs` already maps supported suites; **do not claim it can run arbitrary named .ts files**. It accepts e.g. `pnpm test:focus story-start`, `pnpm test:focus story-resolution`, `pnpm test:focus story-updates`, and `pnpm test:focus storyteller` with optional name pattern. It rebuilds integration workspaces and **recreates only `offscreen_auth_test`**; require explicit approved disposable test DB and never point it at live data. For source-specific modules not exposed as focus-suite names, use existing package/test runner and compiled test path after verifying script and environment.

Recommended economically ordered path:
1. Unit tests for BOOT03 valid/invalid opening kind, STORY02 claim/save/result conflicts, STORY03 publish bridge, checkpoint/fork.
2. `pnpm test:focus story-start`; `pnpm test:focus story-resolution`; `pnpm test:focus story-updates`; `pnpm test:focus storyteller` on approved **test-only** DB; don't run broad suite each edit.
3. Real local Temporal+PG integration with two separate worker processes; stop-after-save and retry-before-ack.
4. **One** cold kind run with real containers and S3/PG/Temporal; user/browser verification and negative scenarios. Store evidence once.
5. Only if owner individually approves later: TURN04 actual model-authored continuation through the same pipeline with its own provider quota. Never reuse fake-PASS as live-PASS.

## Cursor route and coordination

A `VERIFY` executor gets one slice of this matrix and two or three exact test/code anchors; the parent owns cluster lock, fixture ID ledger, final source/manifest hashes and **one** scorecard. Separate agents do not all rebuild the cluster and reset the database. A failing negative case must name the code owner (BOOT03/GA, STORY03 workflow, DATA04 fork, K8S11 SSE) and produce one bounded patch, not a multi-day side redesign. The Change remains Proposed until explicitly selected. This packet records **planning work only**, not acceptance evidence.
