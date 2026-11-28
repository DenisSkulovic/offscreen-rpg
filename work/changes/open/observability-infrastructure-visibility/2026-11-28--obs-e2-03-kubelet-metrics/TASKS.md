# OBS-E2-03 | task queue
Base: `8cb05ff2841d548e52c75cd6dae0e666081f810b`; refresh against recorded Design integration branch. State: READY for construction, independent review 03; dispatch only after owner ratification/commission and synchronization. Shared contracts: [G2 construction freeze](../NATIVE-INPUTS.md#g2-construction-freeze-candidate--direct-https-and-cluster-bound-trust).
Tasks: T01 → T02 → T03; selected: none. 02 must have joined before overlay edits; 05/04 overlay ownership serialized. No new native investigation by workers.

## T01 | Capture verified cluster-bound public trust | PROPOSED
DEPTH=PATCH
Requires: ratified G2 construction freeze, verified branch. Independent of overlay writes but packet starts after 02 per group schedule.
May write: infra/platform/observability/kubelet-trust.mjs; tests/kubelet-trust.test.mjs.
Read: identity.mjs::captureIdentity, recheckIdentity, readControlPlaneTuple, runObservabilityReadCommand; G2 trust capture contract (only first subsection).
Algorithm: implement exactly the bounded read-only `readDevKubeletTrust` interface and stable canonical digest, validated two-node Docker/Node/CA provenance, no remote trust, no bearer access, no writes. Reuse identity runner and deadlines; private temporary public certificate files removed on all paths. Separate injectable read/crypto dependencies for deterministic fixtures; production must use real validated inputs. Verify same-root leaf renewal stable; exact changed root/node/cluster/disk leaf/expired/CN-only/wrong role or network/remote Docker refusal. No caching across operation boundaries.
Test: node --test infra/platform/observability/tests/kubelet-trust.test.mjs
Stop: source contract contradiction or trust validation failure. No alternate certificate discovery or node mutation.
Receipt: actual focused checks and interface postcondition; no live proof claim.

## T02 | Add direct authenticated jobs and trust mount | PROPOSED
DEPTH=PATCH
Requires: T01 source postcondition, 02 joined, exclusive overlay ownership.
May write: infra/platform/observability/values/profiles/dev/prometheus.yaml
Read: 02 dev overlay; G2 Helm integration and exact scrape contract; vendored Prometheus 31.0.0 templates/extra-manifests.yaml and templates/deploy.yaml.
Algorithm: add exact release-owned ConfigMap template and read-only mount, require two values passed by 08, append to existing extraManifests rather than replace. Preserve 02/05 objects and previous RBAC. Add narrow nodes discovery + nodes/metrics get and explicitly enable the dedicated Prometheus server Pod SA token mount (M04; no KSM permission expansion; 04 owns Pod discovery permissions), fixed two HTTPS DNS targets and SA file, exact paths/limits/families and filters from G2. Resource is sole CPU/RAM source; cAdvisor network conditional only, no raw id/image/name labels. No other jobs or historical base changes. Render integration waits for 08; no production placeholder CA.
Test: source gate, T03 fixtures, 08 exact Helm render/promtool, 13 native.
Stop: chart anchor mismatch, forbidden RBAC or unsafe TLS/label policy.
Receipt: exact overlay postcondition.

## T03 | Freeze resource coverage and prove boundaries | PROPOSED
DEPTH=PATCH
Requires: T02 postcondition.
May write: infra/platform/observability/coverage/inventory.json; tests/e2-collection.test.mjs.
Read: G2 exact scrape and JSON rows only, 02 coverage and existing collection fixture.
Algorithm: append exact two G2 rows; assert unique panels, no duplicate CPU/RAM sources, fixed DNS/node filter, bounded labels/jobs, explicit no arbitrary metadata, conditional network unsupported/no positive panel, mount/ref/SA rules. Fixtures reject wrong name/address/CA reference/insecure/proxy/arbitrary family and duplicate aggregation; 08 owns actual rendered CA injection and 13 owns live uniqueness and target freshness. No native calls.
Test: node --test infra/platform/observability/tests/kubelet-trust.test.mjs infra/platform/observability/tests/e2-collection.test.mjs
Stop: mismatch with frozen input or assigned check failure. No implementation of 08 or live deployment.
Receipt: exact diff and actual results; transfer downstream proof, archive before join only after own gate.
