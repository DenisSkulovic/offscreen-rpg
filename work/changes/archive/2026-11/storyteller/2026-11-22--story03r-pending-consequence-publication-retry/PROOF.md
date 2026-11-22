# STORY03R proof

| Case | Expected |
| --- | --- |
| reason preservation | pending-consequence detail crosses saved-generation publish result |
| transient mapping | only pending-consequence-not-settled is retryable |
| terminal blocked | unrelated blocked reason remains non-retryable |
| execution isolation | executeFrozenStoryteller activity is not rerun by publication retry |
| eventual publish | settlement followed by retry publishes exactly one passage |
| ACK loss | repeated publication returns published/already_published without duplicate passage |
| provider safety | no provider transport call occurs |
| regression | worker publication 8/8 and GA publication 6/6. Causal fixture NOT RUN: api-integration tsc failed on unrelated TURN03/WR10 tests, and DATABASE_TEST_URL was unset |

Evidence, 2026-11-22, worktree `change/story03r-pending-consequence-publication-retry`:

- `node --test packages/story-engine/test/saved-generation-publish-reason.test.mjs` — 2/2 PASS
- `node --test apps/worker/dist/test/story03-control-publication.test.js` — 8/8 PASS
- `node --test apps/game-authority/dist/test/storyteller-generation-publish.test.js` — 6/6 PASS
- `node --test packages/workflows/test/storyteller-workflow-contract.test.mjs` — 4/4 PASS
- `pnpm --filter @offscreen/api-integration test:story03-t09:causal` — NOT RUN

No paid provider, production deployment, schema migration, or TURN03 gate claim is part of this Change.
