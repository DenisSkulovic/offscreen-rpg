# Observability experiment evidence ledger
Owner-operated disposable cluster only. Recorded 2026-11-26. Original source baseline 2138ae4a4a188c5dce54e2f77d4211d6ab4f1ed3; current integration compatibility a81e275821496e478ba55ae3dce5e72cf63d5dfd. Experimental cluster obs-e03-oexbycbn, dedicated kubeconfig /tmp/offscreen-obs-runtime.oeXByCBN/kubeconfig. Paths are owner workstation paths, not repository artifacts. Evidence is transcribed from owner terminal receipts; no credentials, kubeconfig contents or raw application payloads committed.

| Gate | Result | Receipt / revision | Bounded evidence |
|---|---|---|---|
| E01 | PASS | /tmp/offscreen-obs-render.q139bx8j; R7 | 10/10 dev/release chart renders and structural assertions; revised Grafana values require final rerender |
| E02 | PASS | /tmp/offscreen-obs-binary.Uk6GUVeH; R12 | 5/5 image digests, 8/8 binary config validations; Grafana runtime separately E03 |
| E03 | PASS | /tmp/offscreen-obs-runtime.oeXByCBN; R13–R15 | Five ready workloads, zero current Pod restarts, matching image IDs, 3/3 PVCs bound, authenticated 3/3 datasource health; Grafana 256Mi OOMKilled exit137 six restarts, corrected to request512Mi limit1Gi; node snapshot 2.219GiB / 19.53GiB, CPU10.07% |
| E04-A | PASS | /tmp/offscreen-obs-signals.niM9JW7H; R18 | OTLP HTTP through Service DNS, exact correlated log, counter7, parent/child trace; initial trace404 then retrieved |
| E04-B | PASS | /tmp/offscreen-obs-persistence.eErZtOtu; R20 | 12/12 query checks baseline and after each graceful backend replacement; same PVC UID/PV names; no resubmission |
| E04-C | PASS | /tmp/offscreen-obs-outage.qrD4YRjZ; R22 | 8/8 required signal queries, Tempo zero Pods/no ready endpoints, healthy log/metric delivery, fresh trace recovery, same Collector Pod UID and PVC identities |
| E04-D1 | PASS | /tmp/offscreen-obs-resources.GemmwCCu; R24 | 12 samples/container; combined working set mean 469.4MiB, range 462.0–476.6MiB; Collector scrape UP, queue capacity 4MiB each, accepted 10 spans/sent 8/failed export 2; no capacity or exact loss-accounting claim |
| E04-D2 | PENDING | not authored | Privacy/identity admission contract and negative tests |
| Final specimen validation | PENDING | revised Grafana memory | Rerender both profiles and validate revised candidate |
| Defense / implementation | PENDING | none | No acceptance or authorization implied |

## Immutable evidence identifiers
E04-A run 20085945b332ff38, trace 2062fd8592b3426d6dac58626f6993bc, parent 5c32a25f8d896186, child 18d053c3af603818, timestamp 1795719676589730186. E04-B reuses this exact identity. Claims: obs-prometheus UID fa6a7b16-9a73-464a-a955-56fc4daf6ea0; storage-obs-loki-0 UID 8aad28e8-be27-4621-9511-d349c33c1fb4; storage-obs-tempo-0 UID d8820374-5fbf-45ee-8fce-760f40d478d3. Each bound PV name is pvc- plus claim UID. E04-C identities in R22. Python probe digest sha256:191083cdf6c7bda8c76158983163ead5d5cf7b77cf3033e805bb0f5296f51b4b; workload digests in specimens/image-lock-candidate.tsv.

## Negative findings retained
R5–R7 chart/template and null-annotation corrections; R9–R11 Docker bind transport, stdin, tar permissions and Tempo CLI flag corrections; R14 Grafana memory failure; R16 probe Python syntax failure; R17 port-forward loopback refused because Collector listens on Pod IP (preserved binding; switched to in-cluster restricted Pod); R19 shell terminator failure after query-only baseline; R21 null EndpointSlice assertion failure and successful restoration. These are experiment findings, not erased by successful reruns.
## Explicit exclusions
No Helm lifecycle acceptance, fresh release runtime, occupied legacy migration, real application instrumentation, gRPC ingress proof, actual Grafana visualization, hostile tenant isolation, privacy acceptance, saturation, crash/node-loss durability, or sustained capacity guarantee. No permanent dev/release mutation. No real telemetry until admission policy is approved. Resource requests 1408Mi, limits 2816Mi, PVCs 15Gi; whole-node memory includes Kubernetes overhead. R24 separately measures per-container working sets; neither is a sustained capacity proof.
