# Kubernetes developer UI

Loopback developer surfaces for the **kubernetes-first** local stack: Tilt for build/deploy/watch, browser for the game, and **Headlamp on Windows** for read-mostly cluster browsing. This path is separate from the [educational kind lab](kubernetes-lab.md). Compose is not a boot path. `pnpm stack:acceptance` is the read-only gate for that claim; it was unit-tested and was not run as a fresh-clone browser session.

The disposable educational cluster in [kubernetes-lab.md](kubernetes-lab.md) is **not** the game application. Do not confuse `kind-offscreen-release` probe namespaces with the Tilt-managed lab edge stack.

## Front door and loopback URLs

From the repository root:

```bash
pnpm dev
```

`pnpm dev` is the Tilt front door for the owned dev slot. It runs the stack preflight, then `tilt up` against the `kind-offscreen-dev` context. It does not create the cluster, and it does not print the URLs below until the dev-slot workloads are Available. The root Tiltfile is the dev graph only: one workspace image, `live_update` for source, and the warm release script only for lockfile, manifest, Dockerfile, and migration changes. Immutable **release** acceptance is explicit image build plus stack apply: `bash infra/images/release/build-release-images.sh`, then `pnpm stack:up` from the repository root. Operator loopback access to the release lab edge (when the cluster is already up) may use:

```bash
kubectl --context kind-offscreen-release -n lab-edge port-forward --address 127.0.0.1 svc/game-web 3000:3000
```

Worker dev pods need about 2Gi; three `tsc-watch` processes abort below that. Kind image loads on this WSL host must be one node at a time. On 2026-11-20, release-lab `tilt ci` (historical release Tiltfile, Tilt v0.35.2) exited 0 against the existing `offscreen-release` cluster and reported all workloads healthy; that graph is retired—current release work uses the build script and `pnpm stack:up` instead.

| Surface | URL | Notes |
| --- | --- | --- |
| Tilt UI | http://127.0.0.1:10350/ | Build, resource, and log state |
| Game | http://127.0.0.1:3000/ | Player loopback origin |
| Staff | http://127.0.0.1:3000/control | Staff control loopback |

All of these bind to **loopback** only. Do not publish them on `0.0.0.0` or `[::]`.

## Headlamp (Windows desktop)

Headlamp is a **Windows desktop application**, not a privileged Pod in the cluster. Install it on the desktop yourself; this repository does **not** install Headlamp, does **not** delete Pods automatically, and does **not** bind Headlamp to a public interface.

Point Headlamp only at a kubeconfig file that contains **solely** the `kind-offscreen-release` context. Never copy a ServiceAccount token into the repository. Never deploy Headlamp as a publicly reachable Service or port-forward it to `0.0.0.0`.

### Generate a Headlamp-only kubeconfig

With the cluster up and `kubectl` already configured for your user environment (`KUBECONFIG` unchanged), from the repository root:

```bash
node scripts/repo-tools/headlamp-kubeconfig.mjs --context kind-offscreen-release --out "$HOME/.kube/offscreen-release-headlamp.config"
```

Defaults:

- Context: `kind-offscreen-release` (any other `--context` exits **1** without writing).
- Output: `~/.kube/offscreen-release-headlamp.config` (outside the git tree).

The helper runs `kubectl config view --context kind-offscreen-release --minify --flatten`, then keeps only that context, its cluster, and its user. It **refuses** to write under the repository root.

The file is the existing kind admin identity for that one cluster. It does not add a second context, and it is not a separate least-privilege account, so kubectl can list every namespace in `offscreen-release`.

**WSL path from Windows:** `\\wsl$\<distro>\home\<user>\.kube\offscreen-release-headlamp.config` (adjust distro and user). Select that file in Headlamp settings. Headlamp stays a desktop app. This repository does not launch it.

On 2026-11-20 the helper wrote `/home/dskul/.kube/offscreen-release-headlamp.config`. `kubectl --kubeconfig` with that file showed one context, `kind-offscreen-release`, and server `https://127.0.0.1:6443`. It listed the lab namespaces. It deleted `game-web` Pod UID `49db9567-175e-4c29-96de-1ec4852733ee`. The Deployment replaced it with UID `a7f5eb92-0de3-4c56-aab4-a0286e8d0844`, Ready, owned by ReplicaSet `game-web-664bc85fc6`.

## Headlamp desktop session

Opening Headlamp, reading a log, using its terminal, and deleting a Pod from the desktop UI remain a manual operator check. The acceptance harness records that click as not run unless a replacement Pod UID and story continuity are supplied. That desktop session was **not** run when the harness was added. A developer can point Headlamp at the file above when that session happens.

Do not target another user’s kubeconfig, a foreign context, or a non-lab cluster.

## Refusals and safety

| Check | Behavior |
| --- | --- |
| `--context` other than `kind-offscreen-release` | Exit 1; **no file written** |
| `--out` inside the git repository | Rejected; **no file written** |
| ServiceAccount token in repo | **Forbidden** — use user kubeconfig export only |
| Headlamp on `0.0.0.0` | **Forbidden** — desktop app on loopback kubeconfig only |

## Related runbooks

- [Kubernetes lab](kubernetes-lab.md) — disposable two-node educational cluster (`lab-a` / `lab-b` probes), API `127.0.0.1:6443`, context `kind-offscreen-release`.
- [Local platform topology](../technical/platform/topology.md) — how Compose, kind, and deployment targets relate.