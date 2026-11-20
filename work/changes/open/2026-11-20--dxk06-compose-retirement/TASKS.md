# DXK06 | bounded Composer tasks

**Status:** Planned tasks, none executed by author. **Program:** [DXK program](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). Select the Change via work/QUEUE.md and only one named T-ID at a time. **Baseline:** 13bcd6cf + GitHub main 8796daaa; verify exact local HEAD and existing TURN02/BOOT03 work before any code. One live-cluster operator; do not escalate into paid broad source analysis.


## T01 | Delete operational Compose entrypoints

**DEPTH=PATCH-M.** **Initial source route:** apps/api/src/modules/stories/game-authority-client.ts StoryAuthorityConfig/readStoryAuthorityConfig/createLocalStorySeam; apps/api/src/app.ts; apps/api/test/{game-authority-client,game-authority-seam}.test.mjs; tools/api-integration/test/helpers/turn03-distributed-poc-proof.ts. Then inspect exact caller/consumer and most directly affected tests; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Delete compose.yaml and scripts/repo-tools/compose.mjs; remove infra:up/down/infra wrapper/legacy repair advice after their callers use pnpm dev/stack:*. Replace obsolete docs/.env examples and current agent/runbook startup text with one Kubernetes path. Don't touch archives/dated evidence or user Docker volumes. Negative: scripts no longer call docker compose and clone from scratch requires no historical named volume.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T02 | Rename internal legacy compose runtime mode without changing authorities

**DEPTH=PATCH-M.** **Initial source route:** compose.yaml, scripts/repo-tools/compose.mjs, obsolete compose-specific scripts and docs; apps/api/src/modules/stories/game-authority-client.ts config and focused tests; legacy mode references; cleanup scanner. Then inspect exact caller/consumer and most directly affected tests; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** In game-authority-client.ts replace literal mode 'compose' with clearly scoped 'embedded' (or 'in-process' consistently); keep 'distributed' as **only** Kubernetes release mode and fail closed if missing in app manifest. Change readStoryAuthorityConfig default intentionally for host test use, but no Kubernetes missing-env fallback; update app.ts, seam tests, integration helper and config docs. Reject now-retired 'compose' env value instead of silent alias. Preserve existing direct local test seam only for unit/integration use. Do not remove distributed auth/custody or change gameplay logic.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## T03 | Active-tree zero-remnant guard and acceptance

**DEPTH=PATCH-M.** **Initial source route:** compose.yaml, scripts/repo-tools/compose.mjs, obsolete compose-specific scripts and docs; apps/api/src/modules/stories/game-authority-client.ts config and focused tests; legacy mode references; cleanup scanner. Then inspect exact caller/consumer and most directly affected tests; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Build a scoped structural scan that fails tracked active config/scripts/CI/current docs for compose.yaml, docker compose invocations, old volume identity assumptions, GAME_AUTHORITY_MODE=compose, root infra:up/down old commands or legacy only-local start path. Exclude true historical archived work/evidence and natural function names containing compose. Check references, help text, scripts, README, .env.example, tests, flow; run baseline tests, build and wiki links. Only archive DXK06 when zero active orchestrator/era dependencies remain.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.


## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
