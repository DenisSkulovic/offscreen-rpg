# Exact operator compatibility | CNPG 1.30.2 / Kubernetes 1.37

Proposed structural contract, 2026-11-26. This supersedes earlier provisional operator field lists. Owner uploaded postgres-operator-evidence.tar.gz (746390 bytes), containing the exact vendor YAML and three complete live JSON inventories. Python parsed the original YAML, verified SHA256 ea4cc355b394e10661d30c6b409cefb19029dd973bccb76b1ed8c789985bc68c, compared all 26 identities per environment and recursively compared complete declarative objects. No Secrets requested or stored here. Raw uploaded live snapshots are not committed. Evidence is source-derived from that archive, not a production comparator run.

## Observed results

After removing only top-level status and metadata uid/resourceVersion/creationTimestamp/generation/managedFields, each existing inventory matches clean proof on 23/26 objects exactly. The remaining three have exactly 11 differing leaves: 9 webhook certificate bundles (4 mutating, 5 validating) and Service spec.clusterIP and spec.clusterIPs[0]. No additional labels/annotations, RBAC, CRD schema, config, deployment, routing, or Service port differences. All 33 CRDs (11 per environment) NamesAccepted and Established True; all three Deployment Available True; no deletionTimestamp. Clean proof versus vendor has only the following observed default/controller additions (no changed vendor-authored values). This enables a compact reference algorithm from verified vendor bytes plus explicit defaults, avoiding a duplicate 1.3MB normalized schema fixture.

## Selected normalization

For each exact vendor identity (apiVersion, kind, namespace, name), construct expected effective object from vendor declaration plus the exact additions below. Never obtain expected values from arbitrary live state. Compare object key sets and typed values recursively; key order irrelevant, list order preserved (no generic reordering or extra-key allowance). Identical RBAC ordering observed in all three environments; conservative refusal for reordered rules is acceptable for this pin, not a privilege equivalence claim. Before comparison require nonempty live UID, no deletionTimestamp; metadata.uid/resourceVersion/creationTimestamp/generation/managedFields and top-level status are separately observed or excluded only for declarative equality. All other metadata keys including finalizers/ownerReferences, labels and annotations must match expected unless explicitly normalized below. Missing, unexpected or mismatched field refuses with identity and JSON pointer, no raw values. The policy applies only to this pin and observed Kubernetes version/defaulting family; unsupported versions or changed vendor digest require reviewed reference renewal, not live learning.

### Fixed additions to vendor

| Kind / path | Exact expected addition |
| --- | --- |
| All 11 CRDs /spec/conversion | {"strategy":"None"} |
| Namespace /metadata/labels/kubernetes.io~1metadata.name | cnpg-system |
| Namespace /spec | {"finalizers":["kubernetes"]} |
| Deployment /metadata/annotations/deployment.kubernetes.io~1revision | Variable positive decimal revision string, excluded from equality only after validating; observed 1 |
| Deployment /spec/progressDeadlineSeconds | 600 |
| Deployment /spec/revisionHistoryLimit | 10 |
| Deployment /spec/strategy | {"rollingUpdate":{"maxSurge":"25%","maxUnavailable":"25%"},"type":"RollingUpdate"} |
| Deployment /spec/template/spec/containers/0/env/1/valueFrom/fieldRef/apiVersion | v1 |
| Deployment container 0 livenessProbe and readinessProbe | failureThreshold=3, periodSeconds=10, successThreshold=1, timeoutSeconds=1 (add only these absent vendor fields) |
| Deployment container 0 startupProbe | successThreshold=1, timeoutSeconds=1 |
| Deployment container 0 terminationMessagePath / terminationMessagePolicy | /dev/termination-log / File |
| Deployment /spec/template/spec | dnsPolicy=ClusterFirst, restartPolicy=Always, schedulerName=default-scheduler, serviceAccount=cnpg-manager (serviceAccountName remains vendor-authored) |
| Service /spec | internalTrafficPolicy=Cluster, ipFamilies=["IPv4"], ipFamilyPolicy=SingleStack, sessionAffinity=None, type=ClusterIP |
| Service /spec/ports/0/protocol | TCP |
| Each of 9 webhooks | clientConfig.service.port=443, matchPolicy=Equivalent, namespaceSelector={}, objectSelector={}, rules/0/scope="*", timeoutSeconds=10 |
| Each of 4 mutating webhooks | reinvocationPolicy=Never |

No defaults added to ServiceAccount, ConfigMap, ClusterRoles or ClusterRoleBinding. Preserve exact values of all authored fields; the additions above never override a vendor field. On pin change, fail if an addition collides with authored field and require review. For readiness pending before CNPG initializes certificates/revision, only those two controller-generated fields may be absent; do not classify ready until present and valid. All other additions required for existing objects. Never accept missing security fields.

### Exactly two variable families

Service: only spec.clusterIP and spec.clusterIPs vary. Require valid nonzero IPv4 unicast address, singleton clusterIPs equal to clusterIP, unchanged type ClusterIP, SingleStack, IPv4, exact selector and port 443→9443/TCP. Reject headless, extra addresses, NodePort/LoadBalancer, external IP or any extra spec key. Address allocation is not proof of service routing; separately observe exact ready endpoint and manager owner chain.

Webhook: exact 9 paths /webhooks/i/clientConfig/caBundle may vary, but not routing, selectors, Fail policy, rules or other fields. Important correction: each observed caBundle decodes to **one leaf certificate, BasicConstraints CA=false**, not a CA certificate. All nine bundles are identical within each environment; each leaf has exact DNS SAN cnpg-webhook-service.cnpg-system.svc, CN of same name, issuer CN=cnpg-ca-secret, OU=cnpg-system. Proof certificate validity 2026-11-26 to 2027-02-24; dev 2026-11-22 to 2027-02-20; release 2026-11-24 to 2027-02-22. Require strict base64, exactly one parseable PEM certificate, exact DNS SAN, valid time interval at observation, same bundle across all nine, CA=false for this pinned shape. Node X509Certificate can validate parse, validity and checkHost with subject fallback disabled; additionally require exact SAN list. Do not require a CA=true flag or read signing Secrets. Rotation mismatch can be bounded pending observation, never accepted as ready; stable invalid bundle refuses. This is shape/identity validation, not cryptographic trust proof by itself.

To prove API server actually reaches the pinned fail-closed Cluster admission routes, perform one bounded server-side dry-run CREATE of the rendered Cluster with a reserved fresh probe name in the verified owned target namespace once Active, even on healthy reuse. No persistent write; classify as an explicit dry-run request, not a GET. Use same spec, compare response to trusted profile reference exactly (including rendered count); reject unexpected result, AlreadyExists, timeout or admission error. Never create namespace merely to run this probe on plan/status. Fresh operator before namespace exists is only structurally ready, not fully verified; after authorized namespace create and before durable Cluster create, require probe. Existing namespace/Cluster unchanged. Plan/status can report structural compatibility and readiness observation without executing admission dry-run; ensure needs final successful probe. This tests Cluster admission, not every webhook route. No claim of complete TLS cryptographic provenance or protection against a malicious API server.

## Acceptance and limits

Operator exact-object projection is now decided with clean reference and both existing inventories; no generalized partial recovery. Ordinary partial inventory refuses. Tests must use pinned YAML plus reviewed additions, assert all captured normalization paths, and reject extra RBAC rule, CRD schema, webhook failurePolicy/route, sidecar/volume, metadata selector and wrong/expired certificate. Pending missing controller fields cannot authorize Cluster create. Verify both fresh install and zero persistent writes on reuse, including bounded dry-run, live UID and endpoint/SQL proof. Actual future comparator and full runner not implemented or tested. Existing operator inventory snapshots are point-in-time and do not prove broader cluster security, extra unlisted objects, or all webhook endpoint behavior. Competing CNPG discovery and explicit scope whitelist remain required. No new live mutation authorized.
