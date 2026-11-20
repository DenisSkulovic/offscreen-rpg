# DXK01 | bounded Composer tasks

**Status:** Planned tasks, none executed by author. **Program:** [DXK program](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). Select the Change via work/QUEUE.md and only one named T-ID at a time. **Baseline:** 13bcd6cf + GitHub main 8796daaa; verify exact local HEAD and existing TURN02/BOOT03 work before any code. One live-cluster operator; do not escalate into paid broad source analysis.


## T01 | Guarded preflight and ownership

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/up.sh; infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/kind.yaml; work/changes/open/2026-11-19--turn02-compose-real-kubernetes-application-release/TASKS.md. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Read infra/kubernetes/lab/{up.sh,lib.sh,kind.yaml} and TURN02 T04. Implement one Node24 CLI/bootstrap runner that verifies pinned prerequisites, Docker daemon, kind context ownership, WSL available memory, loopback port availability and resource profile. Do not switch foreign contexts or delete volumes. Negative tests: wrong context and occupied port refuse before mutations.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T02 | Idempotent reconciler and lifecycle

**DEPTH=PATCH-L.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/down.sh; infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/content-bootstrap/importer-job.yaml; infra/kubernetes/lab/app-release/build.sh. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Implement stack:up, stack:status, stack:down and explicitly confirmed stack:reset against the **single** selected app release; no duplicate manifests. Reapply stable resources and wait for migration/import Jobs with pinned roots, preserve SQL/S3 on warm startup, no orphan port-forward process or false URL on detached run. Stop/down default only touches labeled owned resources, preserve cluster data; reset demands exact context and explicit typed confirmation. Wrong-root/migration-failure reports nonzero.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T03 | Three-layer health and disaster negatives

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/lib.sh; infra/kubernetes/lab/temporal/install.sh; infra/kubernetes/lab/content-bootstrap/smoke.sh; scripts/repo-tools/import-pinned-fixture.mjs. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Report cluster, service and playable fixture readiness separately, with actionable namespace/Pod/Job/log diagnostics. Inject missing pinned object, dead GA/worker, failing migration and repeat start; check no READY on failed gameplay, no data reset, no external port. Record WSL memory and cold/warm durations. Only claim kind proofs when actual Pods used.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
