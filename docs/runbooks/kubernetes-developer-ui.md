# Kubernetes developer UI

Loopback developer surfaces for the **kubernetes-first** local stack: Tilt for build/deploy/watch, browser for the game, and **Headlamp on Windows** for read-mostly cluster browsing. This path is separate from the [educational kind lab](kubernetes-lab.md). Compose remains available for other workflows; this runbook does not remove it.

The disposable educational cluster in [kubernetes-lab.md](kubernetes-lab.md) is **not** the game application. Do not confuse `kind-offscreen-lab` probe namespaces with the Tilt-managed lab edge stack.

## Front door and loopback URLs

From the repository root:

```bash
pnpm dev
```

`pnpm dev` is the Tilt front door. It runs the stack preflight, then `tilt up` against the existing `kind-offscreen-lab` context. It does not create the cluster, and it does not print the URLs below until `game-web`, `game-api`, `game-authority`, `game-control`, `game-executor`, and `game-relay` are Available. Image updates are full rebuilds through the app-release scripts; there is no `live_update` hot swap. On 2026-11-20, `tilt ci` (same Tiltfile, Tilt v0.35.2) exited 0 against the existing `offscreen-lab` cluster and reported all workloads healthy. `pnpm dev` itself was not the process observed.

| Surface | URL | Notes |
| --- | --- | --- |
| Tilt UI | http://127.0.0.1:10350/ | Build, resource, and log state |
| Game | http://127.0.0.1:3000/ | Player loopback origin |
| Staff | http://127.0.0.1:3000/control | Staff control loopback |

All of these bind to **loopback** only. Do not publish them on `0.0.0.0` or `[::]`.

**Host package watchers** (`pnpm dev:host`) watch local packages on the host. They are **not** the cluster deploy path. Use `pnpm dev` when you need Tilt and the in-cluster stack.

## Headlamp (Windows desktop)

Headlamp is a **Windows desktop application**, not a privileged Pod in the cluster. Install it on the desktop yourself; this repository does **not** install Headlamp, does **not** delete Pods automatically, and does **not** bind Headlamp to a public interface.

Point Headlamp only at a kubeconfig file that contains **solely** the `kind-offscreen-lab` context. Never copy a ServiceAccount token into the repository. Never deploy Headlamp as a publicly reachable Service or port-forward it to `0.0.0.0`.

### Generate a Headlamp-only kubeconfig

With the cluster up and `kubectl` already configured for your user environment (`KUBECONFIG` unchanged), from the repository root:

```bash
node scripts/repo-tools/headlamp-kubeconfig.mjs --context kind-offscreen-lab --out "$HOME/.kube/offscreen-lab-headlamp.config"
```

Defaults:

- Context: `kind-offscreen-lab` (any other `--context` exits **1** without writing).
- Output: `~/.kube/offscreen-lab-headlamp.config` (outside the git tree).

The helper runs `kubectl config view --context kind-offscreen-lab --minify --flatten`, then keeps only that context, its cluster, and its user. It **refuses** to write under the repository root.

The file is the existing kind admin identity for that one cluster. It does not add a second context, and it is not a separate least-privilege account, so kubectl can list every namespace in `offscreen-lab`.

**WSL path from Windows:** `\\wsl$\<distro>\home\<user>\.kube\offscreen-lab-headlamp.config` (adjust distro and user). Select that file in Headlamp settings. Headlamp stays a desktop app. This repository does not launch it.

On 2026-11-20 the helper wrote `/home/dskul/.kube/offscreen-lab-headlamp.config`. `kubectl --kubeconfig` with that file showed one context, `kind-offscreen-lab`, and server `https://127.0.0.1:6443`. It listed the lab namespaces. It deleted `game-web` Pod UID `49db9567-175e-4c29-96de-1ec4852733ee`. The Deployment replaced it with UID `a7f5eb92-0de3-4c56-aab4-a0286e8d0844`, Ready, owned by ReplicaSet `game-web-664bc85fc6`.

## Headlamp desktop session

Opening Headlamp, reading a log, using its terminal, and deleting a Pod from the desktop UI are the final operator check in [DXK07 T02](../../work/changes/open/2026-11-20--dxk07-clean-clone-acceptance/TASKS.md). That click was **not** run for the Tilt and kubeconfig integration. A developer can point Headlamp at the file above when that session happens.

Do not target another user’s kubeconfig, a foreign context, or a non-lab cluster.

## Refusals and safety

| Check | Behavior |
| --- | --- |
| `--context` other than `kind-offscreen-lab` | Exit 1; **no file written** |
| `--out` inside the git repository | Rejected; **no file written** |
| ServiceAccount token in repo | **Forbidden** — use user kubeconfig export only |
| Headlamp on `0.0.0.0` | **Forbidden** — desktop app on loopback kubeconfig only |

## Related runbooks

- [Kubernetes lab](kubernetes-lab.md) — disposable two-node educational cluster (`lab-a` / `lab-b` probes), API `127.0.0.1:6443`, context `kind-offscreen-lab`.
- [Local platform topology](../technical/platform/topology.md) — how Compose, kind, and deployment targets relate.