# MA06A | evidence, negative matrix, and G0–G7 audit

## Grounding and status

- Source basis: mounted 2bcebcdd repository snapshot with actual all-subtree import census; GitHub re-read 2026-11-21 current Storyteller capture + materialization, campaign narration/reports, Storyteller and Application manifests, module architecture Design. MA05F already landed; MA05G is commissioned but not inspected as integrated.
- Snapshot corpus: four source directories 125 .ts files, 39,092 TS lines, **engine→remaining-app only two `../cache/read-cache` imports**, and remaining-app Developer Tools→engine 16 relative import edges; application tests have 287 direct `../dist/{stories,campaign,storyteller,generations}/*` imports, 81 unique paths in 80 test files. These values are baseline observations, not final post-G acceptance.
- Current capture inspected: `storyteller/context-capture.ts` 3,079 lines, exports six SQL capture writers at lines 1463,1597,1760,2015,2323,2666; `capture-materialization.ts` 1,598 lines, materializer at ~1504 and failure release at ~887. `campaign/narration.ts` directly invokes five capture functions and the pending materializer; `campaign/reports.ts` invokes `captureHistoricalReport`.
- External host callsites: `apps/game-authority/src/application.ts` uses `@offscreen/application/stories`, `stories/resolution`, `stories/persistence`, `storyteller`, and `storyteller/saved-generation-publish`. `apps/worker/src/runtime/index.ts` uses `stories`, `storyteller`, `generations`; `apps/worker/src/activities/storyteller-application-bridge.ts` resolves the old Storyteller package specifier dynamically. These remain stable for MA06A.
- **What has NOT been done:** executing builds, SQL integration suites, or running a post-MA05G source inventory. Do not claim green proof or immediate commission.

## Proof matrix (actual expected behavior, not test name alone)

| Invariant | Positive | Negative / discriminating failure |
| --- | --- | --- |
| Package DAG | `story-engine` builds standalone, Application imports it, old host entrypoints still resolve | any source import or manifest edge from engine back into application, transitive workspace cycle or unresolved NodeNext wildcard export fails |
| Deep compatibility | all 81 historic dist deep paths and fresh post-G paths still resolve, same function/schema object references as new owner | wrapper duplication, missing barrel or nonforwarded default/side effect fails import/identity test |
| Read cache | normal no-cache and adapter behavior identical; source contract type remains same | error/miss callback or disabled cache divergence, new engine→application import |
| Story authority | owner-scoped story start and resolution create the same durable rows | foreign owner denial, stale revision conflict, duplicate operation no second generation/outbox |
| Document/SQL | read CAS outside story lock, then fenced commit as before | delayed document read must not hold story `FOR UPDATE`; concurrent mutation rejects without partial rows |
| Campaign holds/capture | same capture SHA, source passage/root pin, generation and publication records inside original tx | mismatched source digest, changed report source, stale campaign state or replay cannot create incorrect/duplicate capture |
| Materialization | one durable claim, off-lock CAS preparation, same-generation promotion with frozen notice | lease conflict, corrupt/missing CAS, retry cap and non-selected notice topic remain fail-closed |
| Spend/provider | no new provider requests caused by module load/creation; effective usage policy remains enforced | exhausted/unavailable budget denies publication/provider invocation; uncertain attempt cannot be charged/retried twice |
| Scripted route | scripted openings and continuations still resolve through application façade | route accidentally depends on Storyteller runtime default, duplicate script generation or mismatched same-ID payload |

**Test route (after post-G CLI validation):** `pnpm --filter @offscreen/story-engine build`, `pnpm --filter @offscreen/application build`, builds for `@offscreen/game-authority` and `@offscreen/worker` using actual package names, `pnpm repo:module-graph`, targeted application unit tests, `eng03-resolution-lock-measurement.live.test.mjs`, `story03-notice-topic-freeze.test.mjs`, and existing `@offscreen/api-integration` Storyteller/replay/campaign capture suites. **Inspect package scripts and disposable DB target before writing exact command for SQL tests.** Distinguish source graph/compile from transaction behavior. Never initiate destructive DB setup if target uncertain.

## Independent planner gate

- **G0 HOLD (hard):** MA05G has not yet landed. Recorded source baseline is stale for resolution internals. Final HEAD refresh and overlap check mandatory before commission.
- **G1 PARTIAL PASS:** all large domain directories, cross-directory imports, capture and materialization ownership, manifest and host callsites inspected. Need current source export symbol and side-effect audit after G.
- **G2 PASS for chosen package topology:** one cohesive engine with four internal modules, old Application façade, pure Storyteller library retained; rejected two premature runtime/authority packages and unnecessary MA05H per-function moves.
- **G3 PASS at algorithm level:** exact subtree mapping, two cache edges, compatibility strategy, package specifiers, test runtime paths, and five bounded tasks. T02 needs final post-G forwarding-file default/side-effect inventory.
- **G4 HOLD:** no child may start before G completes and current undertaking HEAD is pinned.
- **G5 PASS:** T01→T02→T03→T04→T05; one parent/worktree/merge, no shared concurrently edited manifests.
- **G6 PARTIAL:** specified negative checks and no fabricated execution; exact SQL selector and authorized disposable DB setup need confirmation.
- **G7 PASS for intended scope, NOT for release:** one large migration rather than 125 trivial Changes; compatibility retirement deferred to later MA06C, no changed gameplay mechanics.

**Verdict: PROPOSED, PLANNER BLOCKED ON POST-G HEAD PROOF.** Do not ask Cursor to resolve this block via a research swarm. ChatGPT can refresh the named facts and finalize tests when G finishes, then authorize one coherent MA06A commission. No pressure to extract runtime into a separate workspace before evolved Storyteller mechanics define its stable public boundary.