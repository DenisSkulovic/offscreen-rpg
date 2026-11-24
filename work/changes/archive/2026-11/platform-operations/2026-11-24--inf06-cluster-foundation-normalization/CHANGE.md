# INF06 | Normalize the Kind cluster foundation

**Status: Done. Kind: implementation. Profile: CONTRACT.** Integrated on `undertaking/storyteller-workshop`. Baseline at commission was `21aac7809bfb91fdbdf3d28b1173f3833f5e9e6c`; implementation started at `047714682a24a3b12135ea369be0d308ac3d2f09`. Source-only. Live cluster NOT-RUN. No acceptance credit for live behavior.

## Reconciliation ledger

| Affected claim | Authority | Target delta | Source | Evidence tier | Negative proof | Map |
| --- | --- | --- | --- | --- | --- | --- |
| Kind topology and create ownership | `infra/README.md` Cluster foundation (INF06); `docs/technical/platform/deployment-and-compatibility.md` Local stack commands | changed: one manager create primitive; `kind.yaml` stays the topology source; `stack:reset` calls `destroy.sh` with `kind-offscreen-lab` | `infra/clusters/kind/manager/lifecycle.mjs`; `infra/clusters/kind/release/up.sh`; `scripts/repo-tools/stack-lifecycle.mjs` | source-inspected; focused node tests 73 pass | failed create restores context; foreign inventory issues no kind command; destroy without confirmation exits before probes; `stack:down` allowlist unchanged | `infra/README.md` Cluster foundation (INF06) |
| Release namespace and storage paths | `docs/runbooks/kubernetes-lab.md` volume provisioner row; `docs/technical/platform/deployment-and-compatibility.md` Local stack commands | changed: namespaces and owned-app-resources live under `infra/environments/release/`; storage under `infra/clusters/kind/common/` | those paths; byte-identical to pre-move manifests | source-inspected | wrong or missing destroy confirmation does not call docker or kind | runbook path updates |
| Runtime identities and product play | product docs | unchanged because cluster names, contexts, ports, node images, and allowlist keys were not renamed and no product rule was edited | same source | source-inspected | live cluster, Docker prune, and data mutation NOT-RUN | no product page edited |
| Dated 2026-11-20 lab observation | `docs/technical/platform/deployment-and-compatibility.md` Observed disposable lab | unchanged because that paragraph records the historical `down.sh` run | same heading | source-inspected | the historical sentence still names `down.sh` | N/A for history |

[Selected implementation](EXECUTION.md) · [Tasks](TASKS.md) · [Infrastructure atlas](../../../../../infra/README.md)

## Outcome
One cluster foundation owner under infra/clusters/kind; authoritative dev/release kind.yaml, common read-only probes and bounded creation primitive; separate environment-specific namespace assembly and explicit destructive release reset. Preserve existing public commands, context/cluster identities, node topology, storage behavior and tenant state. Correct misplaced release owned-app-resources.json. No Helm/Kustomize, new nodes, replication, suspension, runtime rename or broad controller rewrite.

## Acceptance
Deterministic tests for both profiles, actual command vectors, topology source, preflight refusal, context restoration on failure, exact reset authorization and foreign resource preservation. Existing shell platform/verification guards remain supported. No live test, cluster recreation, Docker prune or data mutation. Separate worktree and branch: node scripts/repo-tools/change-branch-guard.mjs --change INF06 --target undertaking/storyteller-workshop. Integrate focused source receipt; retire branch. Owner starts subsequent work. No acceptance credit for live behavior.
