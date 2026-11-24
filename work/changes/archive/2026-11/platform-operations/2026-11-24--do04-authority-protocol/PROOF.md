# Proof matrix
No proof executed by ChatGPT. Run from repo root after install; report actual exit code and counts.

| Check | Positive | Negative |
|---|---|---|
| Source identity | moved validators and literals unchanged except imports/specified splits | no widened validators, altered digest or silent alias |
| Package graph | `pnpm repo:module-graph` and `pnpm repo:module-graph:test` | no cycle, undeclared dependency or forbidden edge |
| Build | `pnpm exec turbo run build typecheck` (full at closure, or explicitly scoped reverse consumers for intermediate tasks) | no stale dist-only resolution; fresh install |
| Tests | moved tests actually emitted and run | all pre-existing negative assertions preserved |
| Docs | `pnpm wiki:change-guard --mode plan` / `--mode close` with selected packet arguments per current CLI; `pnpm wiki:health` | no new broken links; baseline failures separately recorded |
| Quality | `pnpm repo:code-quality:changed` with actual reference and `pnpm repo:code-health --base <reference> --strict-new` | no unrelated edits or new severe bands |

## Relocated test commands
- `node --test packages/game-authority-protocol/dist/test/game-authority.test.js`
- `node --test packages/game-authority-protocol/dist/test/storyteller-task-custody.test.js`
- `node --test packages/game-authority-protocol/dist/test/writer-round-private-custody.test.js`
- `node --test packages/game-authority-protocol/dist/test/writer-scene-round-control.test.js`

## Stage-specific acceptance
Private Game Authority protocol workspace owns the Nest seam and Worker custody wire. Four files move together so all internal `./game-authority` references keep one schema identity. Depend on story-interface only for respondToStorySchema; no reverse imports. `node:crypto` and `node:buffer` stay in server-only package. Preserve route helpers, body-byte limits, headers, private response/status/error schemas, canonical microusd, hash and identity functions byte-for-byte. No browser/Temporal deterministic workflow runtime import; enforce private import restrictions in module-graph + eslint, permit API, Authority, Worker and actual integration test consumers only. Existing protocol tests move unchanged. No changes to custody persistence, dispatch authority, spend, retry or provider transport.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
