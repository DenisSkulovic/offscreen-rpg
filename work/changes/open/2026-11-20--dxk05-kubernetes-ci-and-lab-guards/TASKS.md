# DXK05 | bounded Composer tasks

**Status:** Planned tasks, none executed by author. **Program:** [DXK program](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). Select the Change via work/QUEUE.md and only one named T-ID at a time. **Baseline:** 13bcd6cf + GitHub main 8796daaa; verify exact local HEAD and existing TURN02/BOOT03 work before any code. One live-cluster operator; do not escalate into paid broad source analysis.


## T01 | CI lanes without Compose | source PATCH 2026-11-20; GitHub Actions run NOT-RUN

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** .github/workflows/code.yml; scripts/repo-tools/ci-change-scope.mjs; scripts/repo-tools/ci-change-scope.test.mjs; infra/kubernetes/lab/temporal/install.sh. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Replace code job docker compose config, infrastructure compose up/down/logs, and identity Temporal compose up/down with Kubernetes manifest static validation and narrow provider-free runtime proof. Keep existing native GitHub service Postgres for cheap DB/auth tests if suited; Temporal test service may use scoped explicit container or a bounded kind harness, never Compose. Preserve ci_gate required job semantics, timeout and failure logs; no paid LLM or cost-exploding full cluster on docs-only PRs.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T02 | Remove hard dependency on historical named volumes | unit PASS 2026-11-20; live smoke NOT-RUN

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/cnpg/install.sh; infra/kubernetes/lab/temporal/smoke.sh; infra/kubernetes/lab/content-bootstrap/smoke.sh. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Edit cnpg/{install,smoke}.sh, temporal/{install,smoke}.sh, object-storage/smoke.sh, content-bootstrap/smoke.sh and document-access/smoke.sh. Eliminate required docker volume inspect of offscreen-rpg_postgres-data and offscreen-rpg_temporal-data, including post-checks. Reuse lab/lib.sh to snapshot all pre-existing Docker volume names and foreign kubectl contexts before operations and assert no unrelated loss afterward. Prove cold clone with zero legacy volumes, while fault-injected unrelated-volume deletion is caught.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T03 | CI scoping and failure probes

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** .github/workflows/code.yml; scripts/repo-tools/ci-change-scope.test.mjs; infra/kubernetes/lab/gateway/install.sh. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Update ci-change-scope.mjs/test.mjs to watch Tiltfile, infra/kubernetes dev/release and app Dockerfiles instead of legacy Compose names; preserve docs-only selection. Run scope tests, static manifest tests, code CI smoke and one explicitly authorized local kind image/deployment path. Fail on invalid YAML, missing image pin, context mistake or stale compose command. Don't label expensive cluster integration PASS if skipped due runner/resources.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
