# Independent committee pass 02 | historical receipt

Custodian import of the complete owner-supplied reviewer text below. Reviewed candidate: `0e731739c8a97e6e83896612acec40f89a26516f`; predecessor candidate: `7451b840978b7cf11926ff4d7252d193b43459c8`. Reviewer text preserved with trailing whitespace normalized only; its persistence and ratification statements describe the review at delivery. Current disposition is in [README](../README.md).

Independent architecture committee | Observability E2 | Pass 02
ARCHITECTURE VERDICTDEFENDED
E2-AR-H01 is closed. The corrected lifecycle and artifact compatibility architecture is sufficiently determined. No further architecture correction cycle is required.
Critical open0

High open0

Medium retained4

New findings0



Architecture review complete

G1–G4 evidence gates remain open

G5 construction and qualification remain outstanding


Recommendation: Persist this verdict, obtain owner ratification, resolve the bounded native evidence gates and proceed toward the complete implementation batch. Do not convene a third committee merely to revisit the settled architecture.

1. Review identity and provenance
Attribute	Verified value
Repository	DenisSkulovic/offscreen-rpg
Branch	main
Date	2026-11-28
Review type	Independent, impact-based second review
Authority	Read-only
Investigation depth	Evolutionary subsystem development

Reviewed candidate, verified current main HEAD:

0e731739c8a97e6e83896612acec40f89a26516f

Previous reviewed candidate:

7451b840978b7cf11926ff4d7252d193b43459c8

Original investigation baseline:

c3900da1e15bba456c71dcb799698fe2a0f7db5f
c3900da
Original investigation baseline


7451b84
Pass 01: one High finding


0e73173
Pass 02: High finding closed


The GitHub comparison establishes that the current candidate is exactly one commit ahead and zero commits behind the pass-01 candidate.
Correction footprint
Four modified design documents and one added historical receiptINTEGRATION.md

+45

−6




EVIDENCE.md

+17

−2




TARGET.md

+2

−2




README.md

+2

−1





committee/pass-01.md

+487

Historical review import, not an architectural expansion.
No intervening implementation changes invalidate the unaffected source evidence from pass 01.

Repository evidence:

Current candidate commit · Exact correction diff · Historical pass-01 verdict

The current AGENTS.md, CHATGPT.md, applicable workflow, planner investigation and independent design committee rules were consulted. The current impact-based review and severity policies have been applied.
2. E2-AR-H01 closure assessment
CLOSED
Artifact consumers and lifecycle compatibility

The original finding identified an architectural ambiguity between retaining the historical E1 artifact selector and introducing E2 as the normal operational target.

The revised dossier resolves that ambiguity through an explicit separation of artifact identity, operational admission, desired convergence, historical proof applicability and mutation authority.
Closure criterion	Result
Operation-to-artifact routing	Satisfied
Operational E1 predecessor compatibility	Satisfied
Exact Helm revision/history matrix	Satisfied
Retained manifest verification	Satisfied
Helm storage bijection	Satisfied
Disruptive proof refusal	Satisfied
Pending-state admission	Satisfied
Affected acceptance predicates	Satisfied

These are architecture-review results, not executed implementation tests.

Primary evidence: INTEGRATION.md at the reviewed SHA.
2.1. Operation-to-artifact routing
The revised architecture correctly establishes four immutable artifact identities and two separate selection purposes.
Selected architecture. Release routing remains separately profile-bound; the historical partial-install command is refused on the E2-enabled tree.
The important decision is that loadObservabilityVariants() retains its historical meaning. E2 does not globally redefine the existing desired member.

This is the appropriate correction to the actual source coupling observed in install.mjs, connect.mjs, readiness.mjs and upgrade.mjs.

Normal consumers must retain the matched artifact descriptor and history throughout the operation rather than re-resolving a default later.

Finding disposition: satisfied.
2.2. Operational predecessor compatibility
The corrected design separates structural readiness from desired-artifact convergence.

This allows an existing E1 developer installation to remain usable before its explicitly authorized E2 upgrade.
Dev operation admission matrix
Selected future behavior, not current implementation	E1 base	E1 dev	E2
Status recognized
Desired convergence
Connect
Historical upgrade
E2 upgrade
Health/signals
Developer proof
Persistence/outage
Legacy resource proof

Admitted
Upgrade
No-op
Not admitted/satisfied


Pending, foreign, mixed, ambiguous and unreadable installations remain refused regardless of their apparent workload readiness.

The current connect.mjs directly consumes variants.desired for classification and forwarding. The corrected design explicitly addresses both uses, including the subsequent identity and Grafana admin Secret UID checks.

The change is therefore sufficient to prevent E2 from accidentally rendering the existing connection command unusable.

Source: connect.mjs.

Finding disposition: satisfied.
3. Exact Helm history and retained storage
The revised matrix enumerates all supported final histories rather than admitting arbitrary revision-two releases.
Supported final Helm histories
Each installation must match both revisions and exact artifact content.Installation	Collector	Prom.	Grafana
E1 base	1	1	1
E1 developer fresh	1	1	1
E1 developer upgraded	1 2	1	1
E2 fresh	1	1	1
E2 from fresh E1	1	1 2	1 2
E2 from upgraded E1	1 2	1 2	1 2
Release E1	1	1	1

Grey: retained superseded revision. Green: deployed revision. Loki and Tempo remain at revision 1 in every row.
Several legitimate installations have identical revision tuples. The design correctly requires distinct exact manifest and history identities to distinguish them.

In particular, the revised contract requires:
- Exact current and retained predecessor manifests against immutable artifact descriptors.
- Contiguous revision histories with exactly one latest deployed revision.
- Exact chart and application version pins.
- A bijection between expected Helm revisions and actual storage Secrets, including metadata, ownership, namespace, release key and termination checks.
- Preservation of previously observed storage Secret UIDs during upgrade, with distinct identities for newly created records.
This directly resolves the original concern in verifyHelmRevisionMatrix() and verifyHelmStorageBijection().

The current source treats retained Collector revision 1 as a special case. The revised architecture requires both verifiers to consume the same explicit history row, rather than independently generalizing that exception.

Similarly, collectInventory() is directed to fetch actual retained Prometheus and Grafana manifests only for the applicable bounded revision-two cases. It must not infer predecessor content from revision numbers.

Source anchors: readiness.mjs and inventory.mjs.

Finding disposition: satisfied.
4. Pending-state admission and transition safety
The corrected design now defines which exact states may be recognized inside the authorized upgrade operation.
Occupied E2 transition
C = existing Collector revision, either 1 or 2.Exact E1 developer
(C, 1, 1)
Preflight, custody, preservation and markers
Persist prometheus-intent

Prometheus upgraded

(C, 2, 1)

Exact owned intermediate, never publicly ready
Verify and persist grafana-intent

Grafana upgraded

(C, 2, 2)

Exact final shape, still fenced by pending
Persist final-verification, prove preservation

Clear owned pending record

Operational E2 admission


Failure at any mutation boundary

Retain the pending fence, stop subsequent writes, report the exact observed state. No automatic resume, rollback, adoption or deletion.



Pending phase	State admitted for mutation	State admitted for advancement
prometheus-intent	Exact E1	Exact intermediate
grafana-intent	Exact intermediate	Exact final E2
final-verification	No further upgrade mutation	Exact final E2 and successful proof

Crucially, recognizing a known intermediate phase does not constitute permission to resume an interrupted operation.

The architecture preserves the existing custody protocol, introduces a distinct versioned pending operation, retains old-reader refusal and prohibits public admission of a completed-looking installation while pending remains present.

This is sufficient at architecture level. The exact schema, phase verifier and supervised process integration belong to bounded construction and focused verification, not another architecture decision.

Source anchors: custody.mjs and upgrade.mjs.

Finding disposition: satisfied.
5. Disruptive proof refusal
This was the most consequential safety aspect of H01.

I independently confirmed that proof-host.mjs branches into persistence, outage and other specialized proof runners before reaching the generic health observation. A check placed exclusively in the health admission path would therefore be insufficient.

The revised contract explicitly addresses this source behavior.
Entry point	Required E2 behavior
Persistence dispatcher	Refuse
runPersistenceProof()	Refuse before mutation
Outage dispatcher	Refuse
runOutageProof()	Refuse before mutation
Legacy resources proof	Refuse incompatible budget contract
Historical partial-install proof	Refuse on E2-enabled tree
Direct lower-level mutation helpers	No admission bypass
Health/signals/developer	Use matched operational descriptor

The E1-only disruptive proof paths must establish eligibility before dispatch and repeat admission under exclusive custody before any pending write or platform mutation.
Required negative acceptance predicate
0
Cluster mutations

0
Pending writes

0
Rollouts / scale operations

0
Probe creations


For an unsupported E2 disruptive-proof invocation. These are required future test results, not observed results.
The isolated partial-install disposition is also acceptable. Its historical specimen and wrapper invoke the E1 installation contract, whereas the new normal installer targets E2. Explicit refusal is safer than pretending those contracts remain interchangeable.

A new E2-specific partial-install campaign is not an architectural prerequisite when the selected fresh-install, failure-fixture and fail-closed lifecycle obligations remain intact.

Source anchors: proof-host.mjs, disruptions.mjs, and partial-install.mjs.

Finding disposition: satisfied.
6. Affected acceptance predicates
The revised acceptance matrix is sufficiently falsifiable and covers the material failure modes identified in pass 01.
Required verification	Architecture coverage
Positive classification of every supported history	Specified
Correct revisions but wrong manifests	Negative specified
Missing, extra or altered historical storage records	Negative specified
Final shape with pending still present	Negative specified
Status versus desired convergence	Specified
Matched forwarding descriptor	Specified
Historical upgrade invoked against E2	Refusal specified
E2 upgrade invoked against E1 base	Refusal specified
Direct and dispatched disruptive proof invocation	Zero-mutation negative specified
Old/new pending compatibility	Specified
Retained backend data	Positive marker proof specified
Release isolation	Regression predicate specified

The correction does not rely on generic assertions such as successful Helm execution or all Pods being Ready.

The proof contracts distinguish structural identity, historical continuity, actual data preservation and operational usability.

The joint acceptance architecture remains defended.
7. Medium finding preservation
All four Medium findings from pass 01 remain discoverable, retain their original meaning and have explicit durable destinations.
E2-AR-M01

Medium · Nonblocking
KSM inventory freshness

The revised contract distinguishes a successful scrape of cached inventory from current Kubernetes API state. List/watch degradation and recovery remain qualification concerns.

Preserved and incorporated.
Durable owner: native observability technical contract and dashboard/runbook coverage documentation.

E2-AR-M02

Medium · Nonblocking
Effective Kubernetes permissions

The joint acceptance matrix now includes practical effective-authorization negatives for both monitoring identities where feasible, without adopting or modifying unrelated RBAC.

Preserved and incorporated.
Durable owner: permission contract and native acceptance fixtures.

E2-AR-M03

Medium · Nonblocking
Custody-compatible preservation markers

Positive unique markers are queried before and after transition using bounded primitives within the existing exclusive upgrade session. No recursive top-level custody acquisition.

Preserved and incorporated.
Durable owner: upgrade.mjs and observability runbook.

E2-AR-M04

Medium · Nonblocking
Effective metrics retention

The existing 7-day / 3 GB policy is explicitly distinguished from achievable historical duration under increased ingestion. Representative measurement is required; premature storage expansion is not.

Preserved and incorporated.
Durable owner: native observability resource and retention contract.

The finding disposition register in EVIDENCE.md explicitly identifies these destinations.

Transfer into permanent owners remains a reconciliation obligation before Design retirement. It is not a new architecture review gate.

No Medium finding is promoted to High. No additional correction cycle is required for them.

8. Remaining evidence gates
The distinction between a defended architecture and established native feasibility remains essential.
G1

Immutable helper image pins
OPEN · Evidence gateResolve KSM and Redis exporter registry digests and platform identity.
Affects: E2-I and Redis enrollment respectively.


G2

Kubelet serving trust
OPEN · Native evidence gateVerify actual certificates, SANs, direct HTTPS and scoped authorization on both nodes.
Affects: E2-R.


G3

Native component endpoints
OPEN · Native evidence gateVerify ports, selectors, metric families, protocols, labels and Redis exporter behavior.
Affects: applicable E2-S components.


G4

SeaweedFS owner transition
OPEN · Owner and evidence gateEstablish the guarded metrics-listener transition and retained object-storage proof.
Affects: SeaweedFS domain metrics only.


G5

Construction and qualification
OUTSTANDING · Implementation acceptanceExact Helm renders, promtool, source fixtures, live transition, preservation, coverage and operational proof.
Affects: final implementation and operational acceptance.


G1–G4 gate only their affected scope. G5 is downstream construction and qualification evidence and must not be demanded as proof of architectural correctness before the implementation exists.

I do not select a reduced E2 artifact on the owner's behalf. Any exclusion of resource or service coverage requires explicit owner ratification and honest unsupported-coverage semantics.
9. Final architecture dispositions
Architectural boundary	Pass 01	Pass 02
Five-release topology	Defended	Defended
KSM structural inventory	Defended	Defended
Kubernetes permissions and trust	Defended	Defended
Kubelet resource collection	Evidence-gated	Evidence-gated
Native service enrollment	Evidence-gated	Evidence-gated
Grafana provisioning	Defended	Defended
Occupied transition	Defended	Defended
Artifact selection and compatibility	Revision required	Defended
Service-owner separation	Defended	Defended
Release isolation	Defended	Defended
Joint acceptance	Conditional	Defended

Unaffected architectural conclusions from pass 01 are carried forward without repeating their investigation.
Capability-specific verdicts
E2-I · Inventory and dashboards

DEFENDED
KSM image pin and owner ratification remain prerequisites to affected execution.


Shared E2 lifecycle architecture

DEFENDED
H01 closed. No outstanding architectural blocker.


E2-R · Resource metrics
EVIDENCE-GATED
Selected architecture remains sound; G2 determines native feasibility.


E2-S · Service metrics
EVIDENCE-GATED
Selected enrollment architecture remains sound; applicable G1/G3/G4 evidence is outstanding.


Overall architecture verdict: DEFENDED, with explicitly bounded evidence-gated capability scopes.

Full E2 execution readiness and operational certification are not asserted.
10. Recommended progression
Independent architecture review
Pass 02 completed; H01 closed


Persist verdict and obtain owner ratification
Exact reviewed candidate


G1 · Image pins
Independent evidence

G2 · Kubelet trust
Independent evidence

G3 · Endpoints
Independent evidence

G4 · SeaweedFS
Independent evidence



Freeze selected artifact scope
Promote contracts and prepare complete Change batch

Metrics foundation
Frozen native contracts

Dashboards
Parallel where independent



Lifecycle integration
Classifier fixtures may start earlier; final join consumes frozen inventories.

G5 · Joint qualification
Authorized proof, preservation and final acceptance

The evidence gates may proceed independently where their permissions and dependencies permit. Settled architecture does not need to be reconsidered while those facts are established.

Only a material contradiction discovered during evidence gathering, or a material revision of the selected architecture, warrants another affected-scope architecture review.

Ordinary source details, implementation failures and Medium/Low assurance refinements do not warrant reopening this committee.
11. Formal committee receipt
Review obligation	Disposition
Current main HEAD verification	Completed
Applicable governance inspection	Completed
Previous verdict inspection	Completed
Exact candidate comparison	Completed
H01 impact-based re-review	Completed
M01–M04 preservation review	Completed
Consolidated findings	Delivered
Verdict persistence	Pending custodian
Owner ratification	Pending
Implementation commission	Not granted
Native operational proof	NOT RUN
Repository mutations	None
Live operations	None

Evidence limitations: This review inspected the committed dossier, exact Git comparison, applicable repository instructions and affected lifecycle/proof source through read-only GitHub access. Unaffected pass-01 conclusions were reused deliberately. No live cluster state, registry manifests, kubelet certificates, native metrics endpoints, Helm renders or executable tests were independently verified during pass 02. These limitations remain assigned to the existing evidence and qualification gates.

Intended receipt location:

work/designs/open/observability-infrastructure-visibility/committee/pass-02.md

The authorized custodian should persist this verdict against candidate 0e731739c8a97e6e83896612acec40f89a26516f, preserving the historical pass-01 receipt.

Final judgment
The author has adequately corrected the sole High finding without expanding the selected evolution or weakening existing E1 safeguards.

The revised design is specific enough to prevent ambiguous artifact selection, unsupported disruptive operations, arbitrary Helm history acceptance and unsafe admission of interrupted upgrades.

The remaining work is evidence acquisition, bounded planning, implementation and qualification.

E2-AR-H01: CLOSED.

Architecture: DEFENDED.

Further comprehensive architecture review: not warranted.