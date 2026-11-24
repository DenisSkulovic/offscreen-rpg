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
- `node --test packages/lab-interface/dist/test/chamber.test.js`
- `node --test packages/lab-support/dist/interfaces/chamber-lab.test.js`

## Stage-specific acceptance
Only Chamber and QA wire schemas go into browser-safe `lab-interface`; move startChamberSchema from residual chamber.ts with that module. Lab-specific implementation is not a Web dependency. Four evaluation modules move under lab-support/src/interfaces; relative imports rewritten, including creative-exploration-evaluation -> storyteller/context/creative-exploration. Only live-evaluation is externally consumed (tools/chamber); expose exact subpath, retain existing package wildcard for unrelated paths, no new umbrella. Existing chamber-lab tests move to src/interfaces and run emitted path; Chamber tests use same canonical startChamberSchema. Worker currently imports lab-support intentionally; do not change existing lab admission or Worker closure. API and Authority production closure must omit lab-support and lab-interface unless actual post-Documents existing authorized dependency proves otherwise; Web existing lab-interface usage remains as before, no production implementation dependency. At end DO06-owned modules and imports are gone; outstanding DO04 modules may remain until its join. DO07 owns workspace deletion.

## Stop conditions
Unexpected behavior or schema/digest change, private browser import, production graph cycle, unplanned Documents dependency or missing fixture: stop and report exact symbol/path to ChatGPT. No live provider, DB reset, or cluster operation.
