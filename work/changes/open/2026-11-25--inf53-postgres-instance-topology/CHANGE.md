# INF53 | Shared PostgreSQL instance topology

**Status: Ready with explicit limits / owner-commissioned source-only. Kind: implementation. Profile: RELEASE.** Baseline c5a3e2d28c33d863a8d8168997bc33ce74fd59c3; target main. [Selected topology](../../../../docs/technical/platform/database-infrastructure.md#local-cnpg-topology-selected-2026-11-25) · [TASKS](TASKS.md) · [PROOF](PROOF.md).

Outcome: shared explicit baseline scaling for dev/release, configurable chart count, normal bootstrap retains existing compatible count. No new operator installer. Shared dev baseline is not a per-slot database; ordinary agents must never resize it. No independent cluster creation until INF54. Existing one-instance pod replacement smoke remains intentionally single-instance.

Dedicated Change branch and linked worktree from current main; `node scripts/repo-tools/change-branch-guard.mjs --change INF53 --target main`. One Composer Standard child at a time. Parent serializes catalog/docs join; no live actions, provider calls, existing tenant mutation or destructive operations during implementation. Owner executes live experiments separately. Source proof and live NOT-RUN recorded separately. Stop on material contract/ownership contradiction; do not redesign. No global queue change.
