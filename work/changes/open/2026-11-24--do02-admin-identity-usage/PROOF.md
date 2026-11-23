# Proof matrix
No proof executed by ChatGPT. Parent receipt on `change/do02-admin-identity-usage` (base `c7f19e07`), worktree `/home/dskul/projects/offscreen-rpg-do02`. Not joined to `undertaking/storyteller-workshop`; DO01 is integration custodian.

| Check | Result |
|---|---|
| Emitted tests | `node --test` on the three `dist/test/*.js` files: 9/9 pass (extra key, uppercase digest, `'-1'`, numeric 0 rejected) |
| Reverse build/typecheck | turbo build+typecheck for dependents of the three leaves: 39 successful, `@offscreen/api-integration#typecheck` failed in `test/library-batch-read.test.ts` TS2379 `corruptHash` exactOptionalPropertyTypes. That file is not in the DO02 diff. Recorded baseline-unrelated; not masked. |
| Module graph command | Before commit, `pnpm repo:module-graph` ENOENT on indexed-but-deleted `packages/contracts/src/admin.ts` because `git ls-files` still lists the old path. Re-run after the Change commit. |
| Module graph unit tests | `pnpm repo:module-graph:test` 26/26 pass |
| Live DB / cluster | not run |


| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands
- `node --test packages/admin-interface/dist/test/admin.test.js packages/identity-interface/dist/test/terminal-auth.test.js packages/usage-policy/dist/test/usage-policy.test.js`
- Exact fixtures and negative cases in CHANGE.md release note. Preserve pre-existing authorization tests; no live DB reset or paid operation.

## Stage-specific acceptance
Three leaves, no common umbrella: admin-interface owns staff HTTP shapes; identity-interface owns terminal pairing/token wire; usage-policy owns entitlement/limits vocabulary. Preserve existing `current-authority.ts` in old package until DO05; change its `./usage-policy` to `@offscreen/usage-policy/usage-policy`. No server Admin/DB dependency in Web. `admin.ts` strict schemas, role/grant/audit/usage projection semantics remain identical. Preserve terminal pairing/token fields and limits; no auth policy change. Preserve fundingMode, restriction/limits and recovery literals; no authorization from parsing. Use the exact fixtures and Nest-only build-runner edit in CHANGE.md.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
