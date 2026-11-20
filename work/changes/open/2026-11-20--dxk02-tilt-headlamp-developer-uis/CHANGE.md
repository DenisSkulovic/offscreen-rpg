# DXK02 | Tilt source-watch and Headlamp GUI integration

**State:** Ready for bounded source implementation when named dependencies hold; not selected, not tested, not Done.
**Kind:** implementation. **Date:** 2026-11-20.
**Program:** [Kubernetes-first developer experience](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/README.md) · [planner source map](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/SOURCE-MAP.md) · [parent Cursor waves](../../../designs/open/kubernetes-first-developer-experience-2026-11-20/CURSOR-HANDOFF.md).
**Inspected source:** attached 13bcd6cf + connected GitHub main through 8796daaa on 2026-11-20; unpushed Cursor changes NOT inspected.
**Owner selected destination:** Kubernetes-only app development on kind, 1-command run, visual Tilt + Headlamp, no active Compose after all DXK Changes pass. Selection is via work/QUEUE.md, not this heading.

## Goal, ownership, dependencies

Tilt source-watch and Headlamp GUI integration. **Own/edit:** Tiltfile (new), infra/kubernetes/lab/dev/tilt/ (new), scripts/repo-tools/dev*.mjs (new), docs/runbooks/kubernetes-developer-ui.md (new); root pnpm dev coordinated with DXK04.

**Source and technical authority:** TURN02 app-release Dockerfile.{web,api,game-authority}, image build scripts, infra/kubernetes/lab/gateway/routes.yaml and DXK01 lifecycle. **Prerequisites:** DXK01 owns stable stack lifecycle and TURN02 provides actual application images. Headlamp is an external desktop app, not an extra privileged Pod by default.

**Avoid duplicate writers:** TURN02 alone owns real app image manifests, Kubernetes resource integrations and one Gateway; TURN03/BOOT03/STORY03 own mechanics/fork/real worker correctness. This Change must consume verified upstream work, not build a second fake app stack. Another selected DXK packet cannot edit this packet's named owner files concurrently.

## Cursor first-screen route card

**DEPTH:** PATCH-M per task except PATCH-L where explicitly stated; default Composer 2.5 Standard. **Start:** read this Change and **one** T-ID from [TASKS.md](TASKS.md), then the first 2-5 source anchors that T-ID names, not the entire wiki/program dossier. Confirm git status and actual HEAD. Patch named owner files, focused positive and discriminating negative, then run targeted tests. No paid provider call, cluster reset, foreign context mutation or secret log. Exact scope and test matrix are in TASKS.md.

**What fails acceptance:** a green unit smoke masking non-working Kubernetes or fabricated app readiness; silent mutation of existing DB/campaign; broad 0.0.0.0 host bind; losing unrelated volumes; an unobserved browser/cluster claim; resurrecting Compose as a second blessed boot path. Stop on a newly discovered authority conflict or failed prerequisite with precise source evidence; do not force a PASS by dropping a necessary assertion.

## Executable plan and proofs

- **T01 | Tilt as canonical live developer orchestrator (PATCH-M):** Create Tiltfile pinned to dedicated kind-offscreen-lab context and named app resources. For each actual Next/Nest/GA/worker image, use real pinned build source and manifests, resource dependencies and at most guarded live-update paths. Start with full rebuild on risky changes to Dockerfiles, pnpm-lock, generated code or DB schema; don't assume arbitrary JS files can hot-swap. Tilt must never read Compose config or deploy test skeleton as game.

- **T02 | pnpm dev and stable localhost URLs (PATCH-M):** Wire root pnpm dev to guarded stack preflight + Tilt. Own one loopback public origin to game and /control and Tilt dashboard localhost:10350. Coordinate port-forward lifecycle so Ctrl-C/restart doesn't leave stale forwarded ports. Output URLs only after real readiness. Negative: wrong kind context, unavailable port and failed worker prevent misleading game-ready status.

- **T03 | Headlamp desktop from Windows/WSL kubeconfig (VERIFY/PATCH):** Document and, if useful, provide read-only setup helper to expose only kind-offscreen-lab kubeconfig to Windows Headlamp desktop; never copy ServiceAccount tokens into repo or host a publicly reachable Headlamp. Test selecting namespaces/Pod, viewing logs/events, Exec if image shell exists, deleting one labeled app Pod and seeing Deployment replacement; verify another user/foreign cluster is not accidentally targeted. Desktop app install is explicit prerequisite; optional automated launch only if reliably portable.

**Verification tiers:** focused static/unit tests may be run before real kind. For a live acceptance tier, use exact current cluster context, actual Pods/Jobs/SQL/S3 and browser; record PASS/FAIL/NOT-RUN for normal and negative cases separately. Repeated runs must be safe. Finish CHANGE.md receipt with executed command, current SHA/image digests/context, failures and residual gaps. Update actual technical docs/STATUS and link health only for changed truths, not guesses. Close/archive only after the bounded goal is proved, then update catalog and work selector without skipping dependent work.

## Planned impact | planned-impact.v1

| Plane | Intended delta | Proof and no-op |
| --- | --- | --- |
| Product | No change to accepted game rules, content rights or player intent | Demo/release may not invent gameplay or broaden staff privileges |
| Technical | Local Kubernetes orchestration/developer workflow under docs/technical/platform/deployment-and-compatibility.md and relevant runbook | Consistent single origin, owner context, no false multi-Pod correctness |
| Code | Tiltfile (new), infra/kubernetes/lab/dev/tilt/ (new), scripts/repo-tools/dev*.mjs (new), docs/runbooks/kubernetes-developer-ui.md (new); root pnpm dev coordinated with DXK04 | Discriminating normal + negative from TASKS.md, not guessed execution |
| Related | work catalogs, active README/runbooks and source routes as actually impacted | Links/document check, evidence tier, truthful STATUS claims |

## Reconciliation ledger | fill before Done

| Affected selected owner | Observed source SHA/files | Positive and negative exact commands/result | Docs/evidence reconciled | Remaining |
| --- | --- | --- | --- | --- |
| Not executed / planning packet | 13bcd6cf + GitHub main inspected, local HEAD pending | NOT-RUN; code not changed by this packet | Implementation plan only | All T01-T03 pending |
