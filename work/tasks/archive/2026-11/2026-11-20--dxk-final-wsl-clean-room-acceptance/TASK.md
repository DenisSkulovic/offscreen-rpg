# DXK-FINAL | clean Windows/WSL clone, graphical Pod operations and game proof

**State:** Cancelled by owner 2026-11-27; never executed. Old topology and TURN03 scripted gameplay acceptance retired. No dispatch, live mutation or PASS. General infrastructure safety and verification remain in the [capability catalog](../../../../../infra/verification/CAPABILITIES.md) and [bootstrap acceptance](../../../../../docs/runbooks/fresh-clone-bootstrap-acceptance.md). Historical procedure below is not executable. Original: `5f5750eca2f31d92fac6bfa478d1cae7203e1815:work/tasks/open/2026-11-20--dxk-final-wsl-clean-room-acceptance/TASK.md`.
**Linked program:** [Kubernetes-first development](../../../../designs/archive/kubernetes-first-developer-experience-2026-11-20/README.md). **Evidence destination:** evidence/runs/<date>--dxk-clean-room/ with redacted textual logs and version/pod/image/commit inventory; do not record secrets, sessions or private story contents.

## Exact environment and permission

User-owned Windows 11 / WSL2 Linux checkout, Docker Desktop, Node24/pnpm11, kind, kubectl, Tilt and Headlamp desktop as installed and verified. All Pod and SQL tests must use *kind-offscreen-lab* and owned application namespaces. A truly clean second checkout or explicitly disposable fresh cluster is preferred; **never** delete existing user cluster, Docker volumes, SQL/S3 or kubeconfig to simulate clean. Any destructive reset requires separate explicit approval with name and impact. No live LLM/provider calls and no paid infra.

## Procedure

1. Read-only preflight git SHA/clean state, host resources, tool versions, cluster/context inventory, Docker volume names and occupied ports. Stop if ownership ambiguous.
2. Install pinned app dependencies, issue one **pnpm dev**, capture cold runtime, resulting Pods/jobs/images, URLs, Tilt readiness and resource budget. Confirm browser at loopback localhost game, /control and Tilt dashboard.
3. Through real local auth: create/open seeded campaign, issue permitted deterministic action, observe resulting scene, refresh/load history and supported fork; check role-based admin access and wrong-user denial. Collect redacted SQL/S3/Temporal/Pod evidence. Zero paid model calls.
4. In Windows Headlamp use the actual kubeconfig: select correct cluster and namespace, inspect logs/events of app Pod, open Exec if shell exists, delete exactly one confirmed application Deployment-owned Pod. Corroborate old and new Pod UID and application/game continuity. Do not delete stateful database/S3/Temporal Pods for this verification.
5. Stop dev watcher without deleting claims. Restart with pnpm dev and verify user/campaign/story roots and login preserved; capture warm time and source-change rebuild. Exercise one bounded failure scenario without secret exposure.
6. Run DXK07 acceptance harness and DXK06 active-tree Compose-remnant guard, list any NOT-RUN checks, reconcile docs and status. No script edits in this Task.

## Acceptance and negatives

**PASS only if:** cold/warm complete real stack, deterministic playable game + /control, genuine Headlamp logs/Pod terminal where supported and labeled app Pod replace/recovery, Tilt rebuild/status, zero live providers, no Compose runtime needed, no collateral state loss, positive and negative auth/health proof. A green Pod list, mocked API response or synthetic fixture alone fails.

**Fail/stop:** missing shell in image is an accurately documented expected limitation rather than shell-install permission; failed kubeconfig bridge, unexplained Pod ownership, wrong context, insufficient RAM, corrupt S3 pin, unsafe reset or attempted non-loopback port are immediate stops with evidence. Any missing code/tool remains with DXK07 or a newly justified Change, not a silent Task mutation.

## Receipt

Record exact commands, before/after contexts and volumes, git SHA/dirty state, tool versions, Pod/image digests, memory peak, cold/warm duration, URL checks, real UI/browser scenario identity (redacted), error/denial, PASS/FAIL/NOT-RUN and linked evidence. Archive Task only after executed results and reconciled permanent docs. No speculative Done state.
