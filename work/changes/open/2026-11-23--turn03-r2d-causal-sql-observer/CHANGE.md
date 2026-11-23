# TURN03-R2D | Narrow read-only causal SQL observation

**State: READY WITH EXPLICIT LIMITS, SOURCE-ONLY.** **Parent:** [TURN03](../2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md), stays OPEN. **Source baseline:** `undertaking/storyteller-workshop@3a3aa4d8` inspected 2026-11-23. No real DB credentials, role, cluster permission or SQL execution is provided by this packet.

## Actual source authority

- `tools/api-integration/test/story03-causal-multiprocess.integration.ts::assertContinuationSql` reads `outbox` by `operationId + storytellerDistributedTopic` (one row), `storytellerAttempt` by `generationId===operationId` (one row), `storytellerPublication` by same generation (state `published`) and `storyPassage` ordered by storyId (`[1,2]`).
- `packages/db/src/schema/outbox.ts::outbox` columns `id`, `topic`, `operation_id`, `available_at`, `lease_id`, `delivered_at`.
- `packages/db/src/schema/storyteller/funding.ts::storytellerAttempt` table `storyteller_attempt`, columns `id`, `generation_id`, `owner_id`, `story_id`, `state`, etc. **Owner/story scope exists**; use it to reject a foreign attempt.
- `packages/db/src/schema/storyteller/capture.ts::storytellerPublication` table `storyteller_publication`, `generation_id` and `state`.
- `infra/kubernetes/lab/app-release/turn03/report.mjs` accepts only genuine `kind-cross-pod` evidence for certain gates. This new module **never** emits that evidence tier. Temporal workflow IDs cannot be inferred merely from an outbox row.

## Implementation contract

**Exclusive new code:** `infra/kubernetes/lab/app-release/turn03/causal-sql.mjs` and `causal-sql.test.mjs`. Export `observeScriptedContinuationSql({reader,operationId,storyId,ownerId,topic})`, where `reader` is an **injected, externally established read-only query capability** `query(sql, params):Promise<{rows:unknown[]}>`. Never open `pg`, read `game-db` or Kubernetes Secrets, derive `DATABASE_URL`, spawn `kubectl exec`, or create a role. The operator must eventually supply a separate DB-level read-only account and appropriate tenant authorization. Document that SQL `SELECT` syntax by itself does not establish least privilege.

Use **exactly four small parameterized SELECTs** in stable order, no dynamic identifier interpolation:
1. `SELECT id, topic, operation_id FROM outbox WHERE operation_id = $1 AND topic = $2`
2. `SELECT id, generation_id, owner_id, story_id, state FROM storyteller_attempt WHERE generation_id = $1`
3. `SELECT generation_id, state FROM storyteller_publication WHERE generation_id = $1`
4. `SELECT sequence FROM story_passage WHERE story_id = $1 ORDER BY sequence ASC` (verified against `packages/db/src/schema/stories.ts::storyPassage` at inspected SHA).

Validate UUID format for operationId/storyId and nonempty ownerId/topic before any query. Fixed topic passed by caller must equal actual `storytellerDistributedTopic` from appropriate source, not a guessed literal; if inaccessible from source-only .mjs use an explicit expected topic injection and test wrong topic as fail-closed. Reject any row with mismatched owner/story/generation/operation; even one unexpected duplicate row is FAIL. Only `publication.state==='published'`, exactly one matching notice, exactly one matching attempt, and exact passage sequences `[1,2]` qualify as `observed:true` **at injected-query tier**, never as a real release gate. Incomplete/pending rows are `BLOCKED`, contradictory rows `FAIL`; SQL transport errors `BLOCKED` sanitized, without leaking query error, row payload or DB details. Return only ids/counts/status and `evidence:'injected-readonly-query'`.

**Avoid false claims:** This is not real GA publication proof, Temporal workflow evidence, reader permissions proof or SQL read from a live cluster. No automatic `PASS`, cross-Pod tier, or user records in output. A later separately designed operator credential is required. Keep raw SQL bounded and read-only, strictly parameterized; if actual table or sequence schema differs, stop instead of guessing/migrating the DB.

## Small tasks and negative proof

T01 confirm actual table/column names against current HR03 schema and implement the fixed four read-only queries using injected reader only; no per-test DB startup. Positive fake rows for a matching owner, story, generation, publication and two passages; check query texts+params and sanitized output.
T02 negative fake tests for absent/duplicate notice/attempt, foreign owner/story, incorrect topic/id, stale publication, missing scene2, sequence [1,3], query throws secret-bearing error, malformed IDs, injected SQL fragments. Verify no SQL generated until ids validated, no writes, no hidden retry.
T03 run focused Node tests for `causal-sql.test.mjs`, changed-file formatting and `git diff --check`; record outcome. Integrate accepted source to undertaking and archive R2D only; parent TURN03 stays OPEN and all real eight-gate scorecard statuses remain NOT-RUN.

**Hard stops:** actual Drizzle schema names/relations disagree; tenant-scoped read cannot be performed safely; Query executor contract would require a new privileged runtime or real credentials. Report exact source evidence and leave Change open, no paid-agent redesign.

**G0–G7:** current repo/source read, precise interfaces and behavior chosen, disjoint write-set from R2C, negative tests and stop criteria specified, source-only integration executable after local branch guard. Planner has not run tests or inspected actual lab DB roles. No live credentials or SQL permission granted.
