# K8S11 | Composer tasks: real Next/Nest same-origin edge

**Baseline:** 584b594. **Verify SHA:** `ec73a535`. **State:** Proposed/unselected; **T01 VERIFY PASS** (2026-11-20); **not Done**; **no live edge claimed**. **Default model:** Composer Standard. **Deep existing planner notes:** [TURN02 SOURCE-MAP](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn02-compose-real-kubernetes-application-release/SOURCE-MAP.md), [TURN02 TASKS](https://github.com/DenisSkulovic/offscreen-rpg/blob/34e2b4fd8d9d9967e13311da3a938460b1a02244/work/changes/archive/2026-11/distributed/2026-11-19--turn02-compose-real-kubernetes-application-release/TASKS.md). Do not build a competing edge architecture or duplicate image work.

**Source facts:** `apps/web/package.json` Next start binds 127.0.0.1 by default; `apps/api/src/config.ts` API_HOST also defaults loopback. `apps/web/next.config.ts` rewrites /api using build-sensitive API_PROXY_ORIGIN, while `src/server/api-origin.ts` uses API_INTERNAL_ORIGIN for SSR. `apps/api/src/modules/auth/config.ts` APP_ORIGIN accepts HTTPS or HTTP localhost; `apps/api/src/modules/stories/story-update-hub.ts` emits SQL-driven SSE hints. Existing `infra/kubernetes/lab/gateway/` routes synthetic backends, not real Next and Nest.

## T01 | Real Next production rewrite and SSR origin probe | VERIFY PASS (`ec73a535`)
**Write:** focused production-build test/integration in apps/web or app-release test owner only; coordinate TURN02 T03 image build. **Positive:** behind one local trusted reverse proxy, browser /api and SSR read the **same** Nest Service DNS with cookie forwarding and no cache leak. **Negative:** SSR wrong-owner, build-time rewrite localhost despite new runtime env and disconnected Nest fail closed. Use proper auth test fixture, not fake signed session in production. No K8s mutation required to characterize rewrite.

**Result (2026-11-20):** `node --test infra/kubernetes/lab/app-release/verify-production-rewrite.test.mjs` — **5/5**, 0 fail. No cluster apply, no live Gateway, no browser E2E.

| Label | Basis |
| --- | --- |
| **Proven** | Release-build rewrite destination must **not** be loopback; lab Nest Service DNS is accepted for release characterization |
| **Proven (dev path)** | Existing local `.next` `routes-manifest.json` rewrite remains loopback — expected default dev build, not edge proof |
| **NOT-RUN** | Same-origin reverse-proxy E2E; cookie forwarding E2E; cache leak under proxy; SSR wrong-owner through proxy; disconnected Nest at edge; production-baked `routes-manifest.json` with lab DNS **in this workspace** |

**Blocker for T01 closure at edge tier:** proxy/Gateway join remains T03; this task proves characterize-only tests only.

## T02 | Existing SSE/GET client behavior | UNIT PASS (prior); GATEWAY NOT-RUN
Read `story-update-hub.ts`, `apps/web/src/features/play/` source and `apps/web/src/server/nest-reader.ts`. Test one committed version hint causes GET; missing/out-of-order SSE never POSTs or displays uncommitted 202 as scene; logout/owner switch clears private Query state. A front-end unit test cannot prove Gateway streaming. **Negative:** stale version ignored and no second operation on reconnect.

**Result (prior receipt, not re-run this slice):** focused `apps/web` unit/client suite **27/27**. **Gateway SSE:** NOT-RUN (front-end unit cannot prove lab-edge EventSource through HTTPRoute).

## T03 | Real edge join | GATED ON TURN02 T04 + GA
One coordinator applies the real Next/Nest HTTPRoute to lab-edge; proves signed-in SSR HTML, actual EventSource through port-forward, same-origin cookie and GET from a fresh browser plus 401/403 and private GA no-route. **Stop:** synthetic backend responds; never label it K8S11 PASS. Record same commit/image digest and NOT-RUN auth steps when OAuth can't work. **No Grok required.**

**Overlap (source-observed on MAIN):** standalone Next production image wiring already lands elsewhere; K8S11 does not duplicate TURN02 Dockerfile/image integrator work. **Blocker:** TURN02 **T04** gateway join prerequisite not satisfied; do not claim live edge or K8S11 PASS until T03 runs under GA selection.
