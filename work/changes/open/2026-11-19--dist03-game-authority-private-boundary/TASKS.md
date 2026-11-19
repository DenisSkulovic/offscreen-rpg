# DIST03 | Composer verification of existing GA boundary

**Baseline:** 584b594. **State:** implemented one seam on a branch and merged into current source; packet still open for receipt/closure. **Model:** Composer Standard, VERIFY first. **Source:** `apps/game-authority/src/{application,server,bootstrap/main}.ts`, `apps/api/src/modules/stories/{controller,game-authority-client}.ts`, `apps/game-authority/test/story-seam.test.ts`.

**Verified source facts:** `server.ts:routeFor` permits internal health, GET story snapshot and PUT resolution; `game-authority-client.ts` only exposes `read/admitResolution`. `controller.ts:startFromCandidate` and `fork` are still **local**, which is BOOT03/DATA06's later extension, not a reason to declare this one-seam implementation missing. Token body limit is 64KiB; service is loopback by default and private, not deployed in Kubernetes.

## T01 | Run the exact one-seam proof | PLANNER-READY
Use current scripts to build/test `@offscreen/game-authority`, and if authorized run two-process private HTTP with an approved disposable DB. Positive: identity-checked snapshot, stable resolution operation, GET and retry. Negative: forged bearer/wrong actor/malformed version, duplicate operation with changed body, local fallback **not triggered** when distributed mode is configured and GA unavailable. Include actual process count and test results; mocks are a weaker tier.

## T02 | Freeze explicit scope and reconcile Done eligibility | PLANNER-READY, DOC
If T01 passes the **original narrow outcome**, mark seam as locally implemented with exact evidence; leave full one-writer migration/GA start/fork/Storyteller publish assigned to BOOT03/STORY03/DATA06. Do not silently widen DIST03 to “all game authority now separate”. Update canonical topology and STATUS only where actual verified. **Stop:** if prior branch has unmerged code, report target source SHA/changed files rather than overwrite it.

No Grok needed merely to check bearer-token routing or a two-process HTTP test.
