# Native Helm lifecycle results | 2026-11-26

Owner-operated proof of candidate d36502aada06510b714c46b8e8401324a4c803d6, on main b6d128061fd0eb4d30296589d9393a277b09477a. Helm v3.22.1, local kind-offscreen-release. Wall time reported 46s. Python py_compile, chart lint and template passed. Namespace offscreen-redis-proof-a6a53464a965, UID 1ed8bdde-630e-43d2-9376-83819648e714, created and confirmed deleted. No baseline mutations requested.

| Scenario | Observed result |
| --- | --- |
| Fresh good release | exit 0; revision 1, Pod and endpoint UID ceca02e9-cca2-4d68-abf8-b000851abad0, PONG |
| Repeat | no-op, same release revision and all three resource UIDs, same Pod and endpoint UID, PONG |
| Matching-metadata orphan | refused before invoking Helm; original UID/resourceVersion/data unchanged; no collision release or Deployment/Service |
| Readiness fault | native Helm exit 1, context deadline exceeded; failed release retained with three objects |
| Repeat fault | refused partial state; original fault UIDs and revision preserved |
| Healthy pool after fault | same revision and Pod/endpoint UID; PONG |
| Legacy release Redis | Deployment, Service, ConfigMap UIDs unchanged |
| Cleanup | UID/resourceVersion-preconditioned namespace deletion requested; wait confirmed namespace gone |
| Final receipt | PASS lifecycle specimen (not production acceptance) |

The successful runtime checks also assert effective Redis config, observed imageID, ownership annotations, singleton selector, ConfigMap checksum and Deployment -> ReplicaSet -> Pod UID chain. The protocol probe originates in the Redis Pod via its Service. This does not establish cross-Pod client reachability, actual ACL/network isolation, complete effective object compatibility, arbitrary writer safety, lost-response recovery, cold-cluster or dev lifecycle. Namespace deletion was expressly authorized for the unique fixture only. No production migration or deployment was performed.

Disposition: select native Helm for fresh local pools as the candidate architecture; move to integration/cutover design. Full production observer and ordinary ensure must be specified before self-defense. No committee acceptance yet.
