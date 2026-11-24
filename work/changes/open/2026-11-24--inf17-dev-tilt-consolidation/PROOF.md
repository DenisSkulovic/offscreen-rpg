# INF17 | proof

Source-only. Actual local Helm when chart changes; fake runners for external commands. Verify exact retired paths absent and current executable callers updated; retain historical proof. No live cluster/Tilt/Docker operations or tenant mutations. 

- T01 Collapse slot loader entrypoint: run concrete tests in EXECUTION T01; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.
- T02 Dev-only sync/rebuild contract: run concrete tests in EXECUTION T02; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.
- T03 Single root Tilt graph: run concrete tests in EXECUTION T03; negative assertions must distinguish stale/unreadable/foreign or unsafe paths from success.

Record test commands/counts, bash -n/node --check, changed-source format/quality and pnpm repo:docs-health. Required missing proof NOT-RUN, not PASS. Archive/integrate only after source acceptance. Live NOT-RUN.

## Receipt 2026-11-24

Worktree `/home/dskul/projects/offscreen-rpg-inf17`, branch `change/inf17-dev-tilt-consolidation`, base `05d37eb4`.

- T01: `node --test infra/images/development/tests/load-dev-slot-image.test.mjs` — 14 pass. Negative: mismatched slot does not clear a foreign receipt; malformed refs refuse before fake Docker.
- T02: `node --test infra/images/development/sync-plan.test.mjs` — 13 pass. Negative: release-only and docs paths are `none`; dependency source is rebuild, not sync.
- T03: moved tilt tests, `tools/dev-environments/test/dev-tiltfile-split.test.mjs`, sync-plan, and loader tests — 59 pass. Negative: root Tiltfile has no warm-release fallback, no nested include, one render before `k8s_yaml`.
- Live Kubernetes/Tilt/Docker: NOT-RUN.
- Archive and squash into `undertaking/storyteller-workshop`: NOT-RUN. Packet names the human owner as integration custodian; INF15 still has an open worktree.
