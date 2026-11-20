# DXK02 | bounded Composer tasks

**Status:** Done (2026-11-20). `tilt ci` exit 0. Headlamp kubeconfig proved with kubectl. Desktop GUI remains DXK07 T02. **Program:** [DXK program](../../../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md). Select the Change via work/QUEUE.md and only one named T-ID at a time. **Baseline:** 13bcd6cf + GitHub main 8796daaa; verify exact local HEAD and existing TURN02/BOOT03 work before any code. One live-cluster operator; do not escalate into paid broad source analysis.


## T01 | Tilt as canonical live developer orchestrator

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/app-release/Dockerfile.web; infra/kubernetes/lab/app-release/Dockerfile.api; infra/kubernetes/lab/app-release/build-web.sh; infra/kubernetes/lab/gateway/routes.yaml. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Create Tiltfile pinned to dedicated kind-offscreen-lab context and named app resources. For each actual Next/Nest/GA/worker image, use real pinned build source and manifests, resource dependencies and at most guarded live-update paths. Start with full rebuild on risky changes to Dockerfiles, pnpm-lock, generated code or DB schema; don't assume arbitrary JS files can hot-swap. Tilt must never read Compose config or deploy test skeleton as game.

**Positive:** the named behavior is demonstrated against the correct tier, with real process or Pod evidence where requested. **Negative:** the named failure case discriminates against the old/misleading path and returns nonzero/denial without collateral changes. **Stop:** source drift, unsafe context/secret/volume, unproven predecessor, impossible system assumption or failure after bounded error-directed investigation. **Receipt:** focused test command/count, source SHA, scope, env, redacted IDs, observed failure, NOT-RUN clauses.

**Status (2026-11-20):** Root `Tiltfile` pins `kind-offscreen-lab`, builds the four images through the app-release scripts, applies the three overlays, and forwards `127.0.0.1:3000` for `game-web`. `node --test infra/kubernetes/lab/tilt/tiltfile.test.mjs` 7 pass / 0 fail. `tilt ci` on the existing cluster exit 0. `pnpm dev` NOT-RUN.


## T02 | pnpm dev and stable localhost URLs

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** package.json; apps/web/next.config.ts; infra/kubernetes/lab/kind.yaml; scripts/repo-tools/process.mjs. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Wire root pnpm dev to guarded stack preflight + Tilt. Own one loopback public origin to game and /control and Tilt dashboard localhost:10350. Coordinate port-forward lifecycle so Ctrl-C/restart doesn't leave stale forwarded ports. Output URLs only after real readiness. Negative: wrong kind context, unavailable port and failed worker prevent misleading game-ready status.

**Status (2026-11-20):** Root `pnpm dev` calls `scripts/repo-tools/dev-tilt.mjs`. `pnpm dev:host` keeps `turbo run dev`. `node --test scripts/repo-tools/dev-tilt.test.mjs` 7 pass / 0 fail. URLs stay null for foreign preflight, foreign port 3000, missing tilt, and unready `game-executor`. Live process NOT-RUN.

## T03 | Headlamp desktop from Windows/WSL kubeconfig

**DEPTH=PATCH-M.** **Initial source route (2-4 anchors):** infra/kubernetes/lab/kind.yaml; docs/runbooks/kubernetes-lab.md; infra/kubernetes/lab/lib.sh. Inspect only direct caller/consumer and focused test; use planner SOURCE-MAP.md only when source disagrees. **Implementation/verification contract:** Document and, if useful, provide read-only setup helper to expose only kind-offscreen-lab kubeconfig to Windows Headlamp desktop; never copy ServiceAccount tokens into repo or host a publicly reachable Headlamp. Test selecting namespaces/Pod, viewing logs/events, Exec if image shell exists, deleting one labeled app Pod and seeing Deployment replacement; verify another user/foreign cluster is not accidentally targeted. Desktop app install is explicit prerequisite; optional automated launch only if reliably portable.

**Status (2026-11-20):** Helper tests 5 pass / 0 fail, including nested user credentials. `~/.kube/offscreen-lab-headlamp.config` has only `kind-offscreen-lab` and server `https://127.0.0.1:6443`. kubectl using that file listed namespaces and replaced one `game-web` Pod (`49db9567-175e-4c29-96de-1ec4852733ee` → `a7f5eb92-0de3-4c56-aab4-a0286e8d0844`, Ready, same ReplicaSet). The kind identity can see every namespace in that one cluster. Headlamp desktop GUI NOT-RUN; DXK07 T02 owns that click.

## Close conditions

Do not report DONE for successful source edits alone. Reconcile actual source/config tests, durable Change receipt, canonical documentation, root navigation, no duplicate ownership, safety gates and a coherent commit. Then and only then archive this Change, update the single work selector, and stop for the next finite batch selection.
