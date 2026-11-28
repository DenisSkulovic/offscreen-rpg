# OBS-E2-07 | source proof boundary

Run from the dedicated Change worktree root after prerequisites. Do not invoke native lifecycle mutators, paid calls, Docker pulls or cluster tests as a routine construction check. Existing offline fixtures remain evidence at their actual tier. Tests added by this packet run in the stated source command; no synthetic PASS or guessed fixture values.

`node --test infra/platform/observability/tests/e2-dashboards.test.mjs`; 08 actual Helm provider/mount/home render, 13 native dashboard query and operator walkthrough.

**At join:** review collision-free diff, exact assigned postcondition, focused results, regression limits and ownership. **Joint owner:** 08 artifact rendering; 13 joint operator visibility.. Source success does not certify native deployment.

## Construction receipt (2026-11-28)

Source `8574800e59f5c8417ac1a6706c6f35c2cdaa5725` on `change/obs-e2-07-grafana-dashboards` (T01 `cd6aaccb8`, T02 `782aa8235`, T03 `ff2e943ee`, lint fix `8574800e5`), branched from Design `980e4179ba8d8acf996829577bcb400e5845a0a3`.

- Changed: `values/profiles/dev/grafana.yaml` (new), `dashboards/{overview,kubernetes,nodes,postgres,temporal,storage,messaging-cache,observability}.json` (new, 698,681 bytes together), `tests/e2-dashboards.test.mjs` (new), `coverage/inventory.json` (only `offscreen-overview/104`, synchronized to the revised M03 row in NATIVE-INPUTS; the other 11 kubelet-resource panels verified identical).
- Panels: the 139 frozen metric panel mappings copy query, unit and interpretation exactly; one fixed table `offscreen-overview/108` copies all 20 instant targets and the 3 transformations programmatically (SHA-256 `bc81746d…1c14` equals OVERVIEW-CONTRACT.json). Provider `offscreen`, folder Offscreen, `allowUiUpdates: false`, home `/var/lib/grafana/dashboards/offscreen/overview.json`; base values untouched.
- Gate: `node --test infra/platform/observability/tests/e2-dashboards.test.mjs` 32/32 PASS (6 positive, 26 mutation rejections); `git diff --check` clean. Extra, not assigned: all `infra/platform/observability/tests/*.test.mjs` 520/520 PASS; eslint on the new test clean.
- Limits (source-tier only): the test is static. It does not evaluate PromQL, so the fresh/old/missing-KSM, parked, absent-optional, Redis-down, real-zero and residual E/F stale-owner semantics are asserted only as exact-query equality plus guard presence and ordering (`Current target down` precedes match, mismatch and unknown for E/F). Semantic evaluation on the pinned engine is NOT RUN (08), as is the native Grafana table output (13).
- Presentation choices outside the frozen contract: panel type (stat, table, timeseries), grid layout, titles derived from interpretation text, row and text panels (ids 1000+), variables `namespace`, `workload`, `node` from KSM label values. Because every frozen query is copied unmodified, the variables carry scope through links only and do not filter panels. Explore links use the legacy `/explore?left=` URL form, to be confirmed on the pinned Grafana by 13.
- Not run: Helm render or ConfigMap size (dashboards total 698,681 bytes before YAML indentation against the 1 MiB ConfigMap limit; 08 verifies), promtool, Grafana load, any live operation.
- Joint obligations transferred to the Design INTEGRATION: 08 `--set-file` descriptor, provider mount and home render, size and POST transport; pinned PromQL syntax and fixture evaluation; 13 native query acceptance and operator walkthrough.
