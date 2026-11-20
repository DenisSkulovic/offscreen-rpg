# DXK07 | bounded Composer tasks

**Status:** Planned tasks, none executed by author. **Program:** [DXK program](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). Select the Change via work/QUEUE.md and only one named T-ID at a time. **Baseline:** 13bcd6cf + GitHub main 8796daaa; verify exact local HEAD and existing TURN02/BOOT03 work before any code. One live-cluster operator; do not escalate into paid broad source analysis.


## T01 | Cold/warm command acceptance harness

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** docs/runbooks/local-development.md; docs/runbooks/kubernetes-lab.md; work/changes/open/2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Create safe read-only/default automated smoke commanding pinned prerequisites, app startup, Job/S3/SQL/POD health, stable origin and meaningful player/role checks. Test cold setup on owned disposable context and warm repeated pnpm dev with preserved story/identity/checkpoint; print elapsed durations and peak memory. Reset test only with explicit owner approval and exact cluster ownership. Wrong context, missing Pod, broken migration and port conflict must all fail visibly.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T02 | Real browser, UI and restart proof

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** tools/api-integration/package.json; apps/web/package.json; infra/kubernetes/lab/chaos/README.md; docs/runbooks/kubernetes-lab.md. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Use real Playwright/browser acceptance to sign in as local user, start/action/continue/read/fork supported deterministic campaign, inspect admin /control and forbid wrong actor. Observe Tilt rebuild failure and recovery; Headlamp desktop Pod/log/terminal and one app-Pod deletion via UI are manual steps in final operator Task, corroborated by captured Pod UID + replacement + continuity. A smoke that only sees green /health returns FAIL, not success. **Ownership:** DXK02 supplies the single-context kubeconfig and already replaced one `game-web` Pod with kubectl. This T02 still owns the manual Headlamp desktop session. That click is not a DXK02 exit gate.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T03 | Canonical onboarding and measured evidence

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** docs/runbooks/local-development.md; docs/technical/platform/deployment-and-compatibility.md; STATUS.md; README.md. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Replace default docs/runbooks/local-development.md with Kubernetes-only clone/prereq/pnpm dev/open game/open /control/open Tilt/open Headlamp path; link troubleshooting, existing lab educational-only distinction, safe down/reset, nonprovider default and real Oauth alternative. Reconcile README.md, STATUS.md and deployment/compatibility technical owner **from observed evidence only**. Record exact SHA, OS/WSL/Docker/kind/kubectl/Tilt versions, Pods/images, first/second times, memory and unrun cases. Validate wiki/document links and zero-active-Compose guard.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
