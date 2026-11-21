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

## Observed 2026-11-21 in `/home/dskul/projects/offscreen-rpg-cq01`

- `pnpm --filter @offscreen/application build` then `node --test packages/application/test/admin-session.test.mjs`: 9 pass, 0 fail. Includes 60s, exact 15 minutes, 15 minutes + 1 ms, NaN `createdAt`, future `createdAt`, and NaN `now`. Denials audit `stale_login` and throw `step_up_required` with zero staff selects and zero session inserts.
- `pnpm --filter @offscreen/api typecheck`: FAIL. After building `@offscreen/cache`, the only errors are pre-existing `TS2742` in `apps/api/src/modules/stories/controller.ts` (`documents` and `document`). No error in `apps/api/src/modules/admin/controller.ts`.
- `pnpm --filter @offscreen/api-integration test:admin-session`: NOT RUN. `withApiOnlyAuth` can only log in through Better Auth `helpers.login`, which always yields a valid `createdAt`. `DATABASE_TEST_URL` was unset. The integration file was not changed.
- Changed-file Prettier was applied to the three source/test files, then unrelated reflow outside the freshness edit was reverted. `eslint --config eslint.quality.config.mjs` on `session.ts` and `controller.ts` still reports five pre-existing `curly` errors (`if (!row) throw` and `if (error instanceof HttpException) throw error`). The new freshness branches use braces.
- `pnpm wiki:change-guard --mode close --change work/changes/open/2026-11-21--cq01-admin-session-freshness --base cff42c517f860c4677ed996508e7214e00817cf9`: ok, with citation-candidate warnings only. Those citations were not edited.
- Provider spend: zero. Security review: not yet performed.
