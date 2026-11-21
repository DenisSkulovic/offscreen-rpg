# Change: P3-C long-form gameplay acceptance

**State:** Done
**Kind:** implementation
**Approval and owner:** Owner-commissioned Cursor parent P3-C on `undertaking/storyteller-workshop`.
**Parent initiative:** [Storyteller Workshop](../../../undertakings/storyteller-workshop/UNDERTAKING.md)

## Outcome

A provider-free acceptance runner and scenario harness that checks landed opening publication, reentry, world-neutral quiescence, scene-1 historical fork, and fail-closed launch/fork edges. Living Writer continuation, earned routine time, source revision, and a parent that has moved past the forked scene stay on an explicit pending ledger.

## Authority and baseline

- **Product:** unchanged because this Change adds proof only. Vision journeys remain owned by product docs.
- **Technical:** unchanged because no engine contract is edited.
- **Evidence / source:** undertaking HEAD `0544d7ae` (WR07B opening, WR06 fork).
- **Proposals / unknowns:** Cursor A continuation is not ratified here.

## Exact scope and exclusions

- **Executable:** `tools/api-integration/test/longform-acceptance.integration.mjs`, `tools/api-integration/test/longform-acceptance/*`, `scripts/repo-tools/longform-acceptance.mjs`.
- **Exclude:** Story Engine, Writer, Game Authority, schema, provider custody, Web, `stories.integration.ts`, shared `PROGRAM.md` / `UNDERTAKING.md` / `QUEUE.md`.

## Affected-claim reconciliation

| Claim | Target | Source | Evidence | Negative | Map |
| --- | --- | --- | --- | --- | --- |
| Opening reentry | unchanged product promise, now checked | `launch-put.ts` via Game Authority seam | `pnpm test:longform` pass 3 / skip 5 / fail 0 | denied launch writes no passage | N/A |
| Scene-1 fork | unchanged WR06 contract | `stories/forks.ts` | same runner | stale revision and missing checkpoint hash add no story | N/A |
| Living Writer scenes 2–3, routine time, fact revision, parent-advanced fork | unchanged, not claimed | pending ledger in `harbor-oracle.mjs` | skipped, not passed | ledger test fails if a pending reason omits `Pending` | N/A |

Provider spend: zero. `OPENROUTER_API_KEY` is removed before the run.

## Acceptance

- **Normal:** `node scripts/repo-tools/longform-acceptance.mjs` on a disposable database. Zero provider spend.
- **Negative:** unauthorized launch and stale checkpoint hash create no extra story. Pending titles are skipped, not passed.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player promise is rewritten | vision journeys stay in product docs | proof-only |
| Technical | unchanged because runtime contracts are not edited | engine authority unchanged | no production diff |
| Code | changed: acceptance test and runner; negative: denied launch and missing checkpoint hash | new files only | focused runner |
| Related | unchanged because shared undertaking indexes stay with the integration custodian during parallel work | QUEUE and UNDERTAKING not edited in this packet | serialized later |
