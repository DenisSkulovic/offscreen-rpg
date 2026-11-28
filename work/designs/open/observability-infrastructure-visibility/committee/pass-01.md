# Independent committee pass 01 | historical receipt

Custodian import of the owner-supplied complete reviewer text below. Reviewed candidate: `7451b840978b7cf11926ff4d7252d193b43459c8`; baseline: `c3900da1e15bba456c71dcb799698fe2a0f7db5f`. This receipt is not a verdict on the subsequent correction. Reviewer text preserved verbatim; its persistence statements describe the review at delivery.

Independent architecture review | Observability E2
COMMITTEE VERDICTREVISE AND RE-DEFEND
The selected collection, infrastructure visibility and dashboard architecture is sound. One consequential lifecycle integration boundary requires correction. The remaining native feasibility gates are appropriately bounded.

Critical0

High1

Medium4

Low0



Recommended next action: One consolidated lifecycle correction, targeted re-review, and parallel closure of the existing evidence gates. No comprehensive redesign or repeated architecture committee is warranted.

1. Review identity and provenance
Attribute	Verified value
Repository	DenisSkulovic/offscreen-rpg
Branch	main
Review date	2026-11-28
Candidate	7451b840978b7cf11926ff4d7252d193b43459c8
Investigation baseline	c3900da1e15bba456c71dcb799698fe2a0f7db5f
Candidate divergence	1 commit ahead, 0 behind
Investigation depth	Evolutionary subsystem development
Reviewer	Independent architecture reviewer
Authority	Read-only

The baseline-to-candidate comparison confirms exactly four affected files, all within the E2 dossier. No intervening implementation changes invalidate the author's source baseline.

Reviewed the current AGENTS.md, CHATGPT.md, applicable workflow, progressive-resolution and planner standards, repository structure, status and work selection instructions.

Applied the current severity policy: only Critical and High findings block affected scope. Missing indispensable native evidence is classified separately from architectural defects.
2. Architecture disposition

Sound architecture

Gated or correction required

Preserved infrastructure


Architectural boundary	Review disposition
Five-release topology	DEFENDED
KSM structural inventory	DEFENDED
Kubernetes RBAC and local trust model	DEFENDED
Direct authenticated kubelet collection	EVIDENCE-GATED
Fixed native service enrollment	EVIDENCE-GATED
Grafana dashboard provisioning	DEFENDED
Occupied upgrade and preservation strategy	DEFENDED
Artifact selection and lifecycle consumers	REVISION REQUIRED
Service-owner separation	DEFENDED
Release isolation	DEFENDED
Joint acceptance architecture	DEFENDED with H01 closure

These dispositions concern the architecture, not implementation or operational certification.

3. Consolidated findings
E2-AR-H01 | Incomplete artifact-consumer and lifecycle compatibility contract
HIGH
Shared E2 integration boundary
Established finding: The dossier correctly introduces four distinct artifact variants:
- dev-e1-base
- dev-e1-developer
- dev-e2
- release-e1
However, it does not completely settle how existing consumers select and use those variants.

The current implementation does not isolate loadObservabilityVariants() to the historical Collector upgrade.
Existing consumer	Actual dependency
connect.mjs	Loads variants.desired and classifies against it
readiness.mjs	observeObservability() loads desired and predecessor through the same API
upgrade.mjs	Uses the historical desired/predecessor Collector transition
proof.mjs	Uses observeObservability() to admit operational proofs
disruptions.mjs	Uses owned final-shape verification with revision and preservation assumptions
partial-install.mjs	Uses loadArtifacts() for its installation specimen

Source evidence: connect.mjs, readiness.mjs, artifacts.mjs, proof.mjs, disruptions.mjs.

The design explicitly preserves the historical variant API for the E1 upgrade, but normal observation and connection also depend on it.

Two unsafe or incorrect implementation interpretations consequently remain possible:
1. Preserve the old API everywhere, causing the newly installed E2 stack to be rejected by normal connection and observation.
2. Globally redefine desired as E2, accidentally changing the historical upgrade or admitting existing disruptive proof operations under preservation assumptions that have not been evolved for E2.
The second interpretation is especially consequential because the proof infrastructure contains actual backend restart and outage operations.

This is not a request to recertify those operations. It is a requirement to define their applicability after the architecture changes.
Required correction
Add one compact operation-to-variant contract to INTEGRATION.md, settling at least the following:
Operation	Required design decision
Fresh dev ensure	Install approved E2 artifact
Normal status	Recognize all supported E1/E2 states
Normal connect	Explicitly select the admitted operational artifact; preserve intended predecessor usability
Historical Collector upgrade	E1-only; refuse E2
Explicit E2 upgrade	Exact E1 developer predecessor to exact E2
Non-disruptive health/signal proofs	Use the matching supported artifact and proof contract
Persistence/outage proofs	Explicitly adapt to E2 or refuse E2 before mutation pending separate qualification
Isolated partial-install proof	Explicitly identify which evolution is being exercised
Release operations	Existing E1 contract unchanged

Also freeze the supported revision/history combinations rather than treating E2 as a single Helm revision shape.
Expected legitimate Helm revision combinations
Installation history	Collector	Prom.	Grafana
Fresh E1 developer	1	1	1
Upgraded E1 developer	2	1	1
Fresh E2	1	1	1
E2 from fresh E1	1	2	2
E2 from upgraded E1	2	2	2

Revision numbers are necessary but insufficient. Exact current and retained predecessor manifests, storage records, history and ownership remain required.
Current verifyHelmRevisionMatrix() and verifyHelmStorageBijection() contain special handling for the existing Collector transition. That special handling cannot simply become a generic acceptance of revision-two releases.

Closure criterion: One unambiguous consumer-routing and revision-history contract, including safe refusal of unsupported disruptive proof operations and negative acceptance predicates.

Affected scope: Shared lifecycle integration and operational activation. Independent metrics and dashboard architecture remains valid.

Durable owner: docs/technical/platform/observability-native-infrastructure.md and infra/platform/observability/.

E2-AR-M01 | KSM scrape freshness is not Kubernetes inventory freshness
MEDIUM · Nonblocking
The dossier correctly distinguishes missing metrics, failed scrapes and confirmed absence. It also proposes using KSM list/watch counters to detect degraded inventory.

There is nevertheless a residual limitation: KSM may continue exposing cached object state while its underlying watch is delayed or interrupted. A fresh successful Prometheus scrape does not independently establish that every cached object reflects current API state.

The selected local architecture remains appropriate. A second inventory database or custom Kubernetes poller is unnecessary.

Disposition: Retain the distinction between exporter availability and inventory confidence. Validate practical list/watch degradation semantics during qualification, document their limitations, and avoid claiming strongly consistent absence detection.

Durable owner: Observability technical contract and dashboard coverage documentation.
E2-AR-M02 | Effective RBAC privileges deserve explicit negative proof
MEDIUM · Nonblocking
The selected ClusterRoles are appropriately narrow for the trusted-local environment. However, inspecting the rendered rules establishes declared privileges, not necessarily effective privileges in an occupied Kubernetes cluster.

An existing foreign binding could grant additional authority to a monitoring ServiceAccount independently of the E2-owned bindings.

Disposition: Extend the existing authorization-negative evidence to both monitoring identities where feasible. Check effective permissions without enumerating, modifying or adopting unrelated cluster RBAC.

This is defense in depth, not a demand to implement hostile-tenant isolation.

Durable owner: Observability permission contract and native acceptance fixtures.
E2-AR-M03 | Upgrade markers need explicit custody-compatible execution
MEDIUM · Nonblocking
The selected occupied upgrade correctly requires positive historical markers across all three backends and verifies retained data under exclusive custody.

Existing proof operations have their own session and custody mechanisms. Invoking a separate top-level proof command while holding exclusive upgrade custody could produce self-contention or incompatible pending-state admission.

Disposition: Reuse suitable query and probe primitives within the authorized upgrade session. Do not launch a second independently acquiring mutation session. Use unique markers and successful positive queries, not arbitrary historical data.

The architecture already establishes exclusive custody, so this is a bounded execution refinement.

Durable owner: infra/platform/observability/upgrade.mjs and the observability runbook.
E2-AR-M04 | Increased metrics ingestion may shorten effective history
MEDIUM · Nonblocking
E2 preserves the existing Prometheus retention configuration:
Time retention7 days

Size retention3 GB

Persistent volume5 GiB


Kubernetes and native service metrics will increase ingestion. The size retention constraint may therefore remove older data before seven days.

This does not invalidate data preservation during the transition. It does mean preservation of the retention policy is not equivalent to guaranteeing the same effective historical duration.

Disposition: Measure actual TSDB growth and effective retention during representative use. Document the distinction without prematurely increasing storage allocations.

Durable owner: Observability resource and retention contract.

4. Kubernetes permissions and trust boundaries
The selected trust architecture is defensible for the project's local Kind environment.
Selected authority distribution
Identity	Permitted authority
KSM	List/watch selected Kubernetes objects, including PVs
Prometheus	Bounded Pod discovery; node discovery and nodes/metrics when selected
Grafana	No Kubernetes API token
Redis exporter	No Kubernetes API token; fixed Redis endpoint
Collector	Existing E1 authority unchanged


 Explicitly excluded

Secrets and ConfigMap reads, Kubernetes mutation, exec, node proxy, CSR approval, wildcard grants, arbitrary annotation-controlled scraping and privileged host collection.

The important positive finding is that the design distinguishes discovery filtering from authorization. Namespace selectors do not make a cluster-wide Pod read permission namespace-restricted.

The design openly acknowledges access to Pod specifications, including potentially sensitive literal environment values. That is a deliberate local trust decision rather than an accidental security claim.

I accept the selected cluster-wide Pod read trade-off. Requiring namespace-specific Roles would introduce additional coupling to optional service installation and namespace lifecycle without an established requirement for adversarial tenant isolation.
Kubelet access
The selection of direct authenticated HTTPS rather than nodes/proxy is correct.
Prometheus
Verified HTTPS :10250
Scoped token + serving CA/SAN
Kubelet


API server nodes/proxy access

TLS verification disabled

Automatic approval of serving certificates


The current Kind configuration establishes two nodes but does not establish a trustworthy kubelet serving certificate configuration.

That is correctly handled by G2. I do not regard it as a defect in E2-I or the selected E2-R direction.

If the trust prerequisite fails, the resource collection scope remains gated. Observability must not silently weaken Kubernetes security or recreate the existing cluster.

5. Native service metrics enrollment
The decision to prefer native endpoints over custom polling services is appropriate.
Component	Selected mechanism	Review
Kubernetes inventory	KSM	Sound
Node/container resources	Kubelet	G2
PostgreSQL	CNPG exporter	G3
Temporal	Native per-Pod metrics	G3
RabbitMQ	Aggregate native endpoint	G3
Redis	Dedicated fixed-target exporter	G1, G3
SeaweedFS	Native metrics listener	G4
Observability components	Native self-metrics	G3
Platform operators	Inventory-first, richer metrics where verified	Sound
Future application Pods	Automatic structural/resource coverage	Sound
Release Traefik	Explicitly outside dev E2	Sound

Two service-owner decisions are particularly important.

Redis: The current Redis configuration uses an unauthenticated local service. The proposed exporter's restricted command behavior does not constitute server-enforced read-only authority.

The dossier correctly acknowledges this limitation. Exact tagged exporter flags, command behavior and emitted label verification remain essential G3 evidence. I do not require a Redis authentication redesign for this evolution.

SeaweedFS: The current Deployment and Service expose only S3 on port 8333.

Adding a native metrics listener changes the object-store owner's workload contract. The selected separate guarded transition, retained data path and storage identities, controlled restart and independent object marker proof are appropriate.

Observability must not acquire implicit authority to restart data services merely because monitoring would benefit from it.
6. Dashboard provisioning and operational semantics
DEFENDED. Repository-owned Grafana provisioning is the appropriate mechanism.
Offscreen Overview
Proposed dashboard information architecture

Cluster inventory
Nodes, namespaces, Pods

Resource utilization
CPU, memory, capacity

Workload health
Replicas, restarts, failures

Coverage and freshness
Expected vs observed targets



Provisioned drill-down dashboardsKubernetes


Nodes


PostgreSQL


Temporal


Object storage


Messaging & cache


Observability



Design representation only. No live measurements or dashboard implementation are asserted.
The existing Grafana values already provision stable datasource UIDs. Extending that mechanism with native dashboard provisioning maintains the existing architecture and avoids introducing unnecessary runtime dependencies.

The most valuable feature is not the number of dashboards. It is the explicit distinction between these operational states:
State	Interpretation
Healthy	Applicable, fresh and positively verified
Unhealthy	Present but failing an applicable condition
Stale / unknown	Evidence is insufficient or no longer fresh
Absent	Trusted inventory confirms absence
Parked	Existing workload intentionally scaled to zero
Unsupported	Capability not enrolled or established
Zero	A real, valid measured value

The rejection of indiscriminate or vector(0) is correct. It prevents a disconnected monitoring system from presenting a reassuring collection of zeroes.

There is no architectural need for an external dashboard service, a custom status database or a new application UI.

7. Occupied E1-to-E2 transition
The selected transition strategy is sound, subject to H01.
Guarded occupied transition
Exact E1 developer state
Identity, artifacts, storage, memory, marker evidence

Acquire custody and persist intent
prometheus-intent

Upgrade Prometheus
Retained TSDB and PVC, exact helper and RBAC inventory

Verify phase and persist next intent
grafana-intent

Upgrade Grafana
Existing identity, admin Secret and datasource UIDs

Joint final verification
final-verification

Exact E2 state
Clear owned pending record after successful proof

Failure at any mutation boundary
Retain the pending fence, stop subsequent writes and report the observed phase. No automatic rollback, uninstall, forced adoption or destructive recovery.



The existing source already establishes the correct underlying custody pattern. The E2 extension is evolutionary rather than a competing lifecycle architecture.

Inspected relevant source includes:
- upgrade.mjs, with explicit authorization, preservation projections and guarded mutation.
- custody.mjs, including existing operation-specific pending validation.
- inventory.mjs, including namespace observation and Helm inventory.
- readiness.mjs, including absent, predecessor and pending-state classification.
Data preservation
Resource	Required result
Observability namespace	Same identity
Three existing PVCs/PVs	Same identities and bindings
Metrics, logs and traces	Positive retained-marker evidence
Loki, Tempo, Collector	No deliberate rollout
Prometheus	Same release, Service, Deployment and storage identity
Grafana	Same release, Service, Deployment and admin Secret
Helm history	Retained exact predecessor records
New RBAC	Exact named, owned E2 objects
Release profile	No mutation; unchanged parsed artifacts

The decision not to build automatic recovery in E2 is acceptable. Fail-closed pending state with owner-directed recovery is safer than introducing an inadequately specified recovery engine for this local evolution.

That exclusion does not justify an unsafe intermediate state, and the dossier does not make that mistake.
8. Explicit evidence gates
The author's evidence-gated approach is appropriate. These gates should not be converted into vague implementation investigations or treated as five new architecture defects.
G1

Immutable helper image pins
KSM and Redis exporterRegistry manifest and platform identity

OPEN

G2

Kubelet serving trust
E2-R onlyBoth nodes, verified TLS and scoped authorization

OPEN

G3

Native endpoint contracts
Affected E2-S componentsActual ports, selectors, protocols, metric families and labels

OPEN

G4

SeaweedFS owner transition
Object-store metrics onlyGuarded transition and retained-object proof

OPEN

G5

Construction and joint qualification
Final selected artifactHelm render, promtool, preservation and authorized native acceptance

OPEN


G1 through G4 contain factual uncertainties which must be resolved before dispatch of the affected construction work.

G5 is predominantly implementation and acceptance evidence. It is not a requirement to implement the system before accepting its architecture.
Capability-specific verdicts
Capability	Selected architecture	Remaining prerequisite
E2-I: Inventory and dashboards	DEFENDED	KSM pin; shared H01 lifecycle correction
E2-R: Resource metrics	EVIDENCE-GATED	G2; shared lifecycle contract
E2-S: Service metrics	EVIDENCE-GATED	Applicable G1/G3/G4 closures
Combined E2 artifact	REVISE AND RE-DEFEND	H01, selected evidence closure and owner ratification

A smaller initial artifact is architecturally acceptable if explicitly owner-ratified. It must not silently masquerade as full E2 coverage.

9. Joint acceptance and E1 continuity
The acceptance strategy is proportionate. It combines source verification with concentrated operational proof rather than demanding a live test campaign after every construction Change.
Acceptance hierarchy
1

Architecture
H01 corrected; selected gates and scope frozen



2

Artifact construction
Exact render, permissions, images, config and inventory



3

Focused verification
Variant classification, custody, failure and refusal fixtures



4

Occupied transition
Authorized upgrade, retained storage and positive markers



5

Operational visibility
Real inventory, metrics, dashboard queries and negative states



6

Owner acceptance
Evidence limits, reconciliation and durable findings


The existing E1 owner acceptance explicitly distinguishes usable local infrastructure from comprehensive A/V certification.

That distinction survives E2.

I do not require repetition of unrelated E1 persistence, outage, synthetic privacy or isolated failure campaigns merely to defend E2 architecture. Relevant changed mechanisms still require proportionate regression evidence. Historical NOT RUN dispositions must remain discoverable.

No findings are raised against the absence of centralized application logging, application tracing, alerting, external hosting or production-grade tenant isolation. Those capabilities are outside the selected evolution.
10. Required next iteration
The remaining architectural work is small relative to the overall design.

The subsequent reviewer should reuse this review's unaffected architectural conclusions.

Re-review only H01, the resulting changed lifecycle contracts, affected consumer routing, historical revision classification and newly submitted evidence relevant to the selected scope.

The four Medium findings are nonblocking and should be transferred to their durable owners. They must not create another mandatory design iteration.

11. Formal committee receipt
Review obligation	Disposition
Repository and HEAD verification	Completed
Candidate and baseline comparison	Completed
Independent architecture analysis	Completed
Consolidated findings	Delivered
Verdict persistence	Pending authorized custodian
Owner ratification	Pending
Implementation commission	Not granted
Native operational proof	Not run
Repository mutations	None
Live operations	None

Evidence limitations: I independently inspected the committed dossier, applicable governance, E1 contracts and affected repository source through read-only GitHub access. I did not independently unpack the vendored Helm archives, resolve registry manifests, inspect live certificates, query native endpoints or execute Helm renders. The relevant chart and upstream observations remain author-supplied evidence where not independently reproduced. No local runtime state or uncommitted work was inspected.

Suggested receipt location:

work/designs/open/observability-infrastructure-visibility/committee/pass-01.md

The custodian should verify the reviewed candidate and available receipt filename before persistence.
Final judgment
Observability E2 is a good evolutionary architecture with one incomplete integration contract, not a failed design.

Its major technical choices are coherent: native Kubernetes inventory, verified kubelet resource collection, fixed service enrollment, Git-owned dashboards and a guarded upgrade of existing infrastructure.

The remaining High finding is concentrated in artifact selection and compatibility with existing operational consumers. Correct that boundary once, close the applicable factual gates, and proceed toward implementation.

There is no justification for another comprehensive architectural investigation of Observability E2.