# MA08 | adversarial source-readiness and final verification

**Review:** candidate MA08 after MA07 `4168db58`, inspected source snapshot `e122d080`, and MA07 imported-domain migration receipt. This is planning, NOT executable test evidence.

**G0 PASS** correct branch/current HEAD gate and explicit MA07 prerequisite; **G1 PASS** ownership anchors, original imports, manifests and 112 tests enumerated; **G2 PASS with explicit limits** target package ownership, migration, legacy test facade retention and negative behaviors decided, but new nested lab fixture export may need smallest safe adapter, STOP if it exposes internal authority mutation; **G3 PASS with limits** T01–T05 with 4–5 first reads and deterministic edit tables, T03 routes to exact importer classes; **G4 PASS** T01 legal first dispatch, explicit whole-Change closure; **G5 PASS** serial tasks; **G6 PASS** build/typecheck and forbidden-import, lease, owner, logging, eligibility negatives specified, no live test claimed; **G7 PASS** one meaningful owner migration with concise parent route. **Verdict READY WITH EXPLICIT LIMITS** provided MA07 is already integrated, no source change invalidates anchors, and no unsafe nested fixture export is needed. Do not call completion before test receipt.

| Area | Positive | Required negative |
| --- | --- | --- |
| Lab | chamber controllers/CLI compile, fixture canRespond unchanged | ordinary player route cannot acquire fixture allowance |
| Drafts | save/read revision, cross-route API typecheck | owner mismatch not_found, stale revision conflict |
| Outbox | worker dispatch, lease, ack | old lease token cannot acknowledge newer claim; SKIP LOCKED not removed |
| Logging | host bootstrap imports and structured event | log never interpolates arbitrary Error/SQL/secret |
| Package graph | all selected builds, module graph and import ratchet | test-only compatibility passes, runtime App import fails |
| Legacy | 112 test files retained in existing package | no wholesale deletion or counterfeit green |

**Actual evidence (2026-11-21, worktree `change/ma08-application-owner-extraction`):**

- `pnpm --filter @offscreen/lab-support build` PASS; `@offscreen/db`, `@offscreen/story-engine`, `@offscreen/runtime-logging`, `@offscreen/application` build PASS.
- `pnpm --filter @offscreen/api typecheck` PASS; `@offscreen/chamber` typecheck PASS; `@offscreen/api-integration` typecheck PASS.
- `node --test scripts/repo-tools/module-graph.test.mjs` PASS 18/18, including forbidden import, comment-only, and legacy test-only cases.
- Disposable DB: wrong outbox `leaseId` does not ack; draft read by non-owner returns `DraftError('not_found')`. PASS.
- Logger: `writeRuntimeLog` still spreads `input`, so an extra field is present in JSON. Preserved verbatim behavior, not a runtime field strip.
- `pnpm repo:module-graph` FAIL. Errors match base `ae312c863`: undeclared `@offscreen/game-authority/application` and `@offscreen/storyteller/tasks`. Not introduced by this Change.
- Application test file count remains 112. No provider spend. No sandbox reset.
