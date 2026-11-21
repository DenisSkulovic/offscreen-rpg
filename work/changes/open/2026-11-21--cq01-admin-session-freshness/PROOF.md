# CQ01 | falsifiable proof

| Case | Expected |
| --- | --- |
| Created 60 seconds ago | accepted by freshness guard (other staff gates still apply) |
| Exactly 15 minutes old | accepted by freshness guard |
| 15 minutes + 1 ms old | audited denial and `step_up_required`, no token |
| Invalid Date / non-parsable API date string | denied, no session insert or token |
| Session created in future | denied, no session insert or token |
| Invalid `now` test clock | denied, not a free pass |
| Nonstaff / missing primary auth | unchanged denial, no staff cookie |

Run `pnpm --filter @offscreen/application build`, focused `node --test packages/application/test/admin-session.test.mjs` after build; `pnpm --filter @offscreen/api typecheck`; build API/integration package then `pnpm --filter @offscreen/api-integration test:admin-session` only with an authorized disposable test DB. Use changed-file Prettier / quality ESLint and report NOT RUN honestly. Security-focused independent ChatGPT review before merge.
