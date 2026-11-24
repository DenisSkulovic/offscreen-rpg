# INF06 | Normalize the Kind cluster foundation

**Status: Ready / owner-commissioned source implementation. Kind: implementation. Profile: CONTRACT.** Baseline undertaking/storyteller-workshop@21aac7809bfb91fdbdf3d28b1173f3833f5e9e6c; INF01–05 integrated. No overlapping active cluster writer; one infrastructure parent. No further planner release. No live cluster operations authorized.

[Selected implementation](EXECUTION.md) · [Tasks](TASKS.md) · [Infrastructure atlas](../../../../infra/README.md)

## Outcome
One cluster foundation owner under infra/clusters/kind; authoritative dev/release kind.yaml, common read-only probes and bounded creation primitive; separate environment-specific namespace assembly and explicit destructive release reset. Preserve existing public commands, context/cluster identities, node topology, storage behavior and tenant state. Correct misplaced release owned-app-resources.json. No Helm/Kustomize, new nodes, replication, suspension, runtime rename or broad controller rewrite.

## Acceptance
Deterministic tests for both profiles, actual command vectors, topology source, preflight refusal, context restoration on failure, exact reset authorization and foreign resource preservation. Existing shell platform/verification guards remain supported. No live test, cluster recreation, Docker prune or data mutation. Separate worktree and branch: node scripts/repo-tools/change-branch-guard.mjs --change INF06 --target undertaking/storyteller-workshop. Integrate focused source receipt; retire branch. Owner starts subsequent work. No acceptance credit for live behavior.
