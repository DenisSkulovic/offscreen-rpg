# GATEWAY-NATIVE | Native local gateway renewal

Status: **ACCEPTED — STRUCTURAL INTEGRATION.** Existing release and isolated fresh installation, repeat ensure, quick/long SSE and attachment refusal passed. See ACCEPTANCE-OBSERVATIONS.md. Disposable specimen cleanup remains separately controlled.

Authority: [R5 design](../../../../work/designs/archive/gateway-platform/README.md) and [local gateway target](../../../../docs/runbooks/kubernetes-gateway.md). [Tasks](TASKS.md) · [Execution and source map](EXECUTION.md) · [Proof](PROOF.md).

Outcome: checksum-verified vendored native chart/bundle, one installer, no host Docker image/Helm alias prerequisite, local streaming-compatible defaults, truthful readiness, repeat-safe bundle reuse. Preserve lab-gateway/gateway-system, lab-traefik, lab-edge/lab-edge, listener web and Service port 80, same namespace attachment, application routes and DNS. No production hosting, dev gateway, namespace rename, controller upgrade or application edits.

Parent: check latest main, active worktrees and competing platform-plan/status edits; run repository branch guard for GATEWAY-NATIVE; dispatch T01 then T02 then T03 then T04. Run focused source proofs and real Helm render. Source-only join may be proposed after passing proofs and shared-file reconciliation; HOLD actual join until owner accepts source receipt and live upgrade timing. Keep Change open until accepted live scope or explicit owner disposition. No live proof claims. No sibling auto-start.

Source receipt (2026-11-26): T01–T04 are implemented on this branch and not joined. `node --test` of the gateway installer tests, platform-plan, infra-cli, infra-cli-operation, and gateway smoke tests passed 85/85, including the real local Helm render and the corrupt-checksum refusal. Shell syntax and `backend.py` compile passed. Live install, upgrade, and the 45s stream were not run.


Current owner/planner acceptance checkpoint supersedes older source-only status and execution ownership: [ACCEPTANCE-CORRECTIONS.md](ACCEPTANCE-CORRECTIONS.md). Cursor implements only the named corrective tasks and cheap checks, then commits and stops for owner/ChatGPT heavy acceptance. Existing scope and integration gates remain.
