# HK03 | source/test split investigation and exact red baseline

**Inspected:** 584b594 and HK03's recorded test receipt. **No test rerun in this planning audit.**

The original `tools/api-integration/test/storyteller.integration.ts` had 32 child `await t.test` cases under one profiled parent and one shared `withAppIntegration` session. The split preserves the original parent and delegates children to 12 `storyteller-*.integration.ts` behavior files, with shared helpers in `storyteller-suite.ts`. Each family may be an independently runnable module but still registers against the same profiled fixture when imported by the parent. A passing isolated case does not imply the shared-session suite is green.

**Last full result (source receipt):** 33 node tests total, 30 passed, 3 failed. Of the 3 failures, one parent fails due to two child failures:
- `imported abstract start publishes one root and one obligation across retry`: ENOENT resolving the local `content/rules/srd-5.2.1-subset` from tools/api-integration CWD. Later source fix resolves package source from repository root and the case passed in **isolation**, not after full shared-session order.
- `mechanical opening and three consequences reshape plans from committed state`: `assert.ok(snapshot.campaign?.offer?.nodes.length)` failed because nodes length was 0. No proven source fix/green full run in packet.
- A separate TS duplicate `assert` import in `storyteller-browser-creation.integration.ts` caused an `@offscreen/api-integration` compile error; the import was later removed. The profiled suite still needs a post-fix typecheck/test rerun to separate TS errors from fixture failure.

**Actual commands:** `tools/api-integration/package.json` has `build: tsc` and `test:storyteller: node --test dist/test/storyteller.integration.js`. The runner uses a **disposable** `offscreen_auth_test` URL; validate `DATABASE_TEST_URL` and do not drop/replace any valuable DB or storage volumes. Temporal may be required by the profiled session and is not the same as a paid LLM. `STORYTELLER_LIVE_ENABLED=false` and no provider keys.

**Negative quality gate:** an integration refactor is only a cleanup if *same case count/order/semantics* survives; changing shared setup from one DB session to per-family sessions silently changes race and cumulative behavior. Any fix to the mechanical opening must explain **why an expected offer now has no nodes**: changed source rules, fixture setup/order, or legitimate behavior. It is not acceptable to replace that expectation with `true` or to fabricate an offer. Run named isolated failure first to localize then full profiled suite.

[Composer TASKS](TASKS.md) assigns VERIFY → one asserted fixture fix → single full receipt; no Grok/exploratory refactor needed.
