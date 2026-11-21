# MA04 | NOT DISPATCHABLE until ChatGPT completes composition matrix\n\n**ALL T-IDs BELOW ARE PLANNER-BLOCKED.** The design direction is selected but the exact API/GA/Chamber composition injection map and authorization decisions are not yet enumerated. Cursor must not discover or decide them.
Owner-commissioned Change only, dedicated `change/ma04-chamber-domain-decoupling` linked worktree on live Undertaking. Parent finishes and integrates after actual tests. Do not touch WR in-flight code.

## T01 | PLANNER-BLOCKED | Story projection policy injection
Read `application/src/stories/index.ts` and `developer-tools/chamber-fixtures.ts`. Write bounded `StoryApplicationOptions` predicate and `read` fallback. Test ordinary story and no-fixture behavior. Negative missing predicate denies only fixture-specific grant, not normal response.

## T02 | PLANNER-BLOCKED | Explicit harness composition
Read `developer-tools/chamber.ts`, `apps/api/src/app.ts`, `apps/game-authority/src/application.ts` and actual source graph callers. Thread predicate only through existing Chamber/dev/test config; default production deny. Positive Chamber scenario still works; negative public origin alone grants nothing. Stop if the route wiring suggests an unapproved expansion of authority.

## T03 | PLANNER-BLOCKED | Cross-entrypoint proof and integration
Run focused source graph, application/API/GA typecheck, disposable story/Chamber integration normal/negative fixtures and changed-file lint/format. Reconcile selected source graph and docs if behavior metadata changes. Parent integrates into Undertaking; independent audit may follow.
