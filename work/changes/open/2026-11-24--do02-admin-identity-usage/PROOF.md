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

## Stage-specific acceptance
Three leaves, no common umbrella: admin-interface owns staff HTTP shapes; identity-interface owns terminal pairing/token wire; usage-policy owns entitlement/limits vocabulary. Preserve existing `current-authority.ts` in old package until DO05; change its `./usage-policy` to `@offscreen/usage-policy/usage-policy`. No server Admin/DB dependency in Web. `admin.ts` strict schemas, role/grant/audit/usage projection semantics remain identical. Preserve terminal pairing/token fields and limits; no auth policy change. Preserve fundingMode, restriction/limits and recovery literals; no authorization from parsing. Add regression fixture for each leaf using actual existing API tests' valid payload, then inject unexpected property into a strict object and assert safeParse false; preserve existing authorization tests without modifying policy. Update focused-integration admin build list to derive dependency ordering from Turbo (`pnpm exec turbo run build` with explicit existing Nest-only targets; avoid web build by using dependency-closed filters for api and explicit test compile prerequisites; if api-integration declares Web as dependency preserve its existing manual no-Web compile path and add newly required leaves in topological order).

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
