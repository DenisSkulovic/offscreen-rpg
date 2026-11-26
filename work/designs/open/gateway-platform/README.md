# Gateway platform renewal — R0 workshop

Owner: architecture planner with repository owner. Integration baseline `7d073df9066ff7b618e9e22ae26ed0680def9bf0` on main. Status: PROPOSED; no self-defense, committee acceptance, implementation or live mutation authorization.

## Intent and posture
Evolutionary renewal: retain native Gateway API and official Traefik Helm chart if pinned artifacts and live behavior support them. One local release edge, HTTP/ClusterIP and loopback-only host access; ordinary dev slots need no gateway by default. Future TLS/hostname/replica support through native configuration, not a service mesh, external API management or bespoke routing controller. Application authentication and webhook verification remain application responsibilities.

## Source findings
- `infra/platform/gateway/{install.sh,values.yaml,gateway.yaml}`: chart 42.4.1, proxy v3.7.19 digest, Gateway API v1.6.3 standard CRD checksum; one HTTP listener on 8000, allowedRoutes Same, dashboard and alternate providers disabled, ClusterIP.
- `infra/environments/platform-plan.mjs` lines 52–53, 121, 380–381, 434–493, 565–570 duplicates image pin and host Docker/Helm repository preflight; installer separately checks host image even though nodes pull pinned image. Investigate removing this redundant requirement, not weakening artifact verification.
- `infra/environments/infra-cli.mjs` 499–516 hardcodes deployment and Gateway identities. `infra/environments/release/game-edge-route.yaml` owns game routing; `infra/workloads/profiles/release.yaml` couples edge namespace and API proxy origin. Preserve compatibility until complete caller/identity audit.
- Existing smoke fixture in `infra/verification/smoke/gateway/` separates synthetic routes/backends from platform. Historical run in `docs/runbooks/kubernetes-gateway.md` demonstrated 0.901-second SSE, loopback, spoofed header rejection and absent-backend 503; not current runtime proof or long-stream proof. Existing route list deliberately enumerates API prefixes; do not replace with blanket /api without checking Next.js ownership.

## Alternatives and decision register
- Retain Traefik versus new controller (Envoy Gateway or other): no identified unmet requirement justifying switch. Provisional retain.
- Release-only versus shared development edge: release-only default proposed, independently selectable dev edge deferred pending use case.
- Existing same-namespace attachment versus label-selected namespaces: retain existing identity and restriction for initial compatibility; future cross-namespace design must explicitly authorize attachment and backend references. No automatic namespace renaming or broadening.
- Installer versus native artifact composition: prefer pinned upstream chart, checksum-verified CRDs and small environment-owned orchestration; exact structure TBD after artifact and consumer audit.
- 10s write timeout versus streaming-aware policy: evidence-gated. Current values read 10s/write 10s/idle 30s. Need pinned-version behavior and actual application SSE ownership/heartbeat/reconnect contract; no arbitrary increase or blanket infinite timeout yet.

## External evidence
- https://artifacthub.io/packages/helm/traefik/traefik/42.4.1 — pinned chart listing; CRDs independently managed. Verify actual chart archive/render.
- https://doc.traefik.io/traefik/routing/entrypoints/ — write timeout limits response writes; current documentation is not proof of pinned version semantics. Inspect v3.7.19 source/docs and render before selecting configuration.
- Current chart master exposes options not necessarily present in 42.4.1; do not copy master values.

## Next evidence and proof tiers
Read-only operator inventory: kind contexts, Helm releases, GatewayClass/Gateway/HTTPRoute conditions, Services, EndpointSlices, Traefik deployment image and arguments, exposure and pinned chart render. No install, apply, delete, port-forward or secret reads in this checkpoint.
Source proof: artifact pin consistency, rendered controller/provider/listener/service, explicit context, ownership/refusal, status generation and route conditions. Local live proof: owned fresh install/repeat ensure, route match, denied attachment, missing endpoints, streaming beyond previous 10s, no unauthorized publication; fixture isolation from actual game. Application integration and hosted TLS/public exposure separately gated. Exact proof commands/fixtures and cleanup remain to be designed.
Next: interpret operator inventory, inspect pinned artifact and consumer map, draft concrete specimen and formal self-defense. No Change packet.
