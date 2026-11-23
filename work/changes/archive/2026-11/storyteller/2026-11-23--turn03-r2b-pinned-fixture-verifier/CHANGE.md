# TURN03-R2B | Read-only pinned story fixture verifier

**State:** Done, source-only injected-store proof. **Parent:** [TURN03](../../../../open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) remains OPEN. Live S3, cluster acceptance and cross-Pod PASS were not run. **Inspected:** `undertaking/storyteller-workshop@4708408b`, 2026-11-23. **Scope:** a self-contained pinned-root read boundary, not S3 provisioning or live acceptance.

## Source ownership and selected contract
- `tools/api-integration/test/helpers/turn03-distributed-poc-fixture.ts::provisionTurn03DistributedPocFixture` returns `roots.rules:{ruleSetId,rootHash,revision,engine}`, `roots.start:{startPackageId,rootHash,revision}`, and `startPackageId`; importer writes arbitrary fresh IDs into a `DocumentStore`. That local harness is **not** a live S3 fixture.
- `packages/documents/src/{schema,s3-store}.ts` exports `contentHashSchema` (lowercase SHA-256), `startPackageReferenceSchema`, `rulePackageReferenceSchema`, and `S3DocumentStore.readStartPackageManifest/readRulePackageManifest`; the latter verifies exact raw bytes and parses canonical schemas. **Do not implement custom S3 hashing or access-key lookup.**
- `infra/kubernetes/lab/app-release/overlay/{edge,authority}.yaml` uses bucket `lab-objects` and a cluster-only S3 endpoint. This Change must not assume host access or obtain credentials.

**Write:** new `infra/kubernetes/lab/app-release/turn03/fixture-pins.mjs` and `fixture-pins.test.mjs` only. Use injected read-only `store` (methods `readStartPackageManifest`, `readRulePackageManifest`) with a strict JSON manifest object:
```json
{"schema":"offscreen.turn03-fixture-pins.v1","releaseSha":"<40 lowercase hex>","bucket":"lab-objects","start":{"startPackageId":"<uuid>","rootHash":"<sha256>","revision":1},"rules":{"ruleSetId":"<uuid>","rootHash":"<sha256>","revision":1,"engine":{"adapterId":"...","adapterVersion":1}}}
```
Validate `releaseSha` against an explicitly injected expected `releaseSha`; bucket must match an injected expected bucket (the default lab value may be provided by caller, not hidden fallback); reject wrong/missing IDs, schema, extra keys and mismatched release. No claim of live release equality until caller independently verifies actual running digest/source.

On verification: read start/rules manifests from store via their pinned root hashes; compare `startPackageId`, `revision`, `rules` reference and `ruleSetId`, `revision`, `engine` exactly. Require **no `worlds` and no executable-obligation entry** for the narrowly selected orientation-only TURN03 fixture; require a valid initial-canon orientation entry. Validate manifest through existing document schemas from `@offscreen/documents` only if import works in this Node script context; else inject schema parse boundary or use existing workspace-compatible compiled imports, and stop if current ownership requires changing package build graph. Return sanitized `{verified:true,bucket,releaseSha,startRootHash,rulesRootHash}` only; never include document content or credentials. Missing/corrupt stores are `BLOCKED` / `FAIL` typed result without leaking raw object body.

No S3 client creation, no `ensureBucket`, PUT, import, console printing credentials, test DB, or network calls. This is a pure read-only verification adapter that a future authorized live operator can use after provisioning.

## Small tasks/proof
T01 strict manifest schema and pinned reference validation. Positive with seeded valid manifest and document-store fake. Negative malformed SHA/UUID, wrong release/bucket, start/rule ID or engine mismatch, extra manifest keys.
T02 read-only object validation. Positive matching manifest identities/orientation-only constraint; negatives no worlds, no executable obligations, missing hash, tampered data, delayed/unavailable read, never invoke mutating methods (fake `store.put*`/ensureBucket throwing). Don't classify a local fake as `kind-cross-pod` evidence.
T03 `node --test infra/kubernetes/lab/app-release/turn03/fixture-pins.test.mjs`; `git diff --check`; focused relevant existing document store tests where accessible. Reconcile parent TURN03 status, integrate accepted source, archive **R2B** after true pure proof, leave parent TURN03 OPEN.

## Reconciliation ledger

| Claim / document | Delta or no-op | Source SHA and diff | Positive evidence | Negative evidence | Link/status |
| --- | --- | --- | --- | --- | --- |
| Product acceptance | unchanged because this adapter does not start or publish a story | `fixture-pins.mjs` on `change/turn03-r2b-pinned-fixture-verifier` | injected matching pin returns hashes only | worlds and executable obligations FAIL | TURN03 stays OPEN |
| Technical document store | unchanged because existing start/rule schemas stay the owners | `packages/documents/dist/schema.js` imported, not edited | strict pin plus schema parse | malformed pin, corrupt object, unavailable read | no S3 client |
| TURN03 execution map | changed: R2B source-only receipt, live gates still blocked | `NEXT-EXECUTION-2026-11-23.md` | 7/7 node tests | fake store evidence is `injected-readonly-store` | parent OPEN |
| Live cluster / cross-Pod proof | unchanged because not authorized | NOT RUN | NOT RUN | a verified fake is not `kind-cross-pod` | R3 not started |

**Stop:** if actual `readStartPackageManifest` output / schema differs from mapped source or the repo cannot import package `@offscreen/documents` from an .mjs operator without new tooling, report exact evidence and planner-block before changing package boundaries.

**G0–G7:** source and narrow contracts inspected; disjoint write set from R2A; pure positive/negative cases and no-live boundary decided; test evidence NOT RUN by planner, local worktree/branch guard required. Source-only READY WITH EXPLICIT LIMITS, no live S3 or TURN03 gate PASS.