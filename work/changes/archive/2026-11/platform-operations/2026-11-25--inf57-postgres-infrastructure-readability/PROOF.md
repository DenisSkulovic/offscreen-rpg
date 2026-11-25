# INF57 | source acceptance

Run from repo root with existing Node 24/pnpm and Helm installed:
```sh
node --test infra/platform/postgres/tests/*.test.mjs
node --test tools/dev-environments/test/dev-cnpg-bootstrap.test.mjs tools/dev-environments/test/dev-slot-project.test.mjs
node --test infra/environments/infra-cli.test.mjs infra/environments/infra-cli-operation.test.mjs
node --test infra/platform/common/tests/render.test.mjs infra/platform/common/tests/manifest-output.test.mjs
```
Run focused changed-source quality/format checks per code-quality rule. No cluster access, no live verify. If other current affected tests discovered from import map, run them; preserve negative proofs.

Proof matrix: same public imports work; no postgres internal cycle (static import graph over local relative imports/reexports, report graph); no internal module imports compatibility facades; Helm rendered docs semantic equal including new/unknown chart fields, strings/numbers and storage; all existing topology and bootstrap refusal, partial mutation, CAS/recovery, release wait and dev authenticated SQL readiness tests retained; CLI help/JSON unchanged except corrected human readiness text; no extra writes or altered live command sequence; no chart/pin/tenant/verification contracts changed. Record before/after file lengths and ownership, not arbitrary line target. Pure reexports should not hide another 2k-line owner. No numerical cap, review coherent seams. Live proof NOT-RUN. User's observed two-instance baseline is external evidence, do not scale or restart it.