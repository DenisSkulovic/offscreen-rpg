# DB05 | Delivery package extraction

**State:** Done / source-only.
**Kind:** implementation. **Profile:** CONTRACT.
**Baseline:** d08e36d809bb53c48fef3351224994bae92b6e7c; **target:** main. DB04 joined (includes DB03); DB01 Transaction root export remains. T01–T03 accepted. Joined main at `0531f1724fb437aa6b8e23b6454f98ef08009f7a`. Live PostgreSQL remains separately gated and is not part of this Change's accepted proof.

[Selected architecture](../../../../../../docs/technical/platform/database-infrastructure.md) · [Parallel program and frozen interfaces](../../../../../undertakings/storyteller-workshop/DB-PARALLEL.md) · [TASKS](TASKS.md)

## Outcome and scope

- Move delivery store: Create @offscreen/outbox with schema, enqueue, relay subpaths; move exact implementations; Transaction imported from @offscreen/db root. Keep notice identity conflict, SKIP LOCKED order, clock_timestamp lease, 30s expiry, token-fenced acknowledge. Update registry outbox module. No new delivery topics or timing changes.
- Migrate delivery and transaction consumers: Move all type-only Transaction imports to DB root, runtime enqueue/Notice to @offscreen/outbox/enqueue, relay to /relay, table to /schema. For mixed import split exactly; update direct manifests. Remove DB outbox aliases and files. Use exact literal selector and workspace map in SOURCE-MAP.md. Existing SQL behavior remains byte-equivalent except imports.

## Execution and ownership

Separate linked Change worktree, run `node scripts/repo-tools/change-branch-guard.mjs --change DB05 --target main`. One bounded Composer child at a time; no next Change authorization. Named custodian serializes shared manifest/lockfile/registry keys and docs joins; do not edit peer work. No SQL DDL or historical migration byte changes for extraction; no changes to authorization, spend, locks, wire contracts or publication behavior unless explicitly selected in this packet. No provider calls, protected DB writes or live cluster mutation.

## Acceptance and stop

Run named focused normal/negative tests in TASKS, affected builds/typechecks and module graph; prove actual source imports and exact historical SQL/journal bytes for ownership changes. Do not claim unrun SQL/cluster evidence. Missing live fixture gates live proof only; actual semantic or safety contradiction stops. **Readiness:** source mapping and selected implementation refreshed at the stated baseline; predecessor postconditions required as above; live proof separately gated. Follow DB-PARALLEL review gates. Record exact accepted proof and baseline limitations.

## Planned specification and implementation delta | planned-impact.v1

| Plane | Selected authority and exact change/no-op | Related documents/maps to inspect | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because no player-facing authorization, spend or publication promise moves | none because product docs do not own delivery package paths | owner review / negative: no product page edits |
| Technical | changed: docs/technical/platform/database-infrastructure.md#realization-record records @offscreen/outbox ownership; selected ownership table already named the package | DB-PARALLEL.md; packages/db/README.md | source-tested extraction; live SQL NOT RUN |
| Code | changed: packages/outbox/src/schema.ts packages/outbox/src/enqueue.ts packages/outbox/src/relay.ts packages/outbox/package.json and consumer remaps (SOURCE-MAP); remove packages/db outbox exports; negative: residual @offscreen/db/outbox* imports must be zero outside docs/archive | SOURCE-MAP.md | builds/tests listed in ledger |
| Related | changed: work/changes catalogs, DB-PARALLEL, undertaking OVERVIEW/UNDERTAKING, db README routes | work/changes/README.md; work/changes/open/README.md; work/changes/ledger/2026-11.md | inbound open path retired to archive |

## Reconciliation ledger

| Affected selected claim/heading | Authority | Target delta (changed/unchanged; reason) | Source delta & inspected SHA | Status/evidence tier | Negative proof | Map/link update or N/A |
| --- | --- | --- | --- | --- | --- | --- |
| docs/technical/platform/database-infrastructure.md#realization-record | technical | changed: realization records DB05 outbox extraction; selected ownership table already listed @offscreen/outbox | packages/outbox/{schema,enqueue,relay}.ts; packages/db package.json exports (./outbox* removed); tools/db-migrations/src/registry/outbox.ts; branch `40db18144a62f4ae3afacae60f2fd73d7d4c09d4` | source-tested: outbox build/typecheck PASS; story-engine turbo 26/26; storyteller-notices 1/1; worker/lab/chamber builds PASS; db-migrations test 9/9 + check:schema PASS; MA05B 3/3 PASS; migrations diff empty | zero residual `@offscreen/db/outbox*` outside docs/archive; enqueue does not re-export Transaction; live SQL / writer-continuation-scene / story03-notice-topic-freeze NOT RUN | packages/db/README.md routes to @offscreen/outbox; DB-PARALLEL and change catalogs point at archive |
| Product player/authorization/spend contracts | product | unchanged because extraction is import/ownership only; claim/ack timing and topics preserved | no product Markdown edits; outbox SQL control flow byte-equivalent except imports | reviewed | no product promise rewritten to match the move | N/A |

Read [SOURCE-MAP.md](SOURCE-MAP.md) for frozen source mapping and implementation decisions. No new live resource permission.
