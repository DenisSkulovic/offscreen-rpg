# Observability E2 | Consolidated readiness review 07

**Owner-supplied independent review; original text preserved below with trailing whitespace normalized.**

Observability E2 | Consolidated readiness review
Scope: OBS-E2-08 through OBS-E2-13. Independent, read-only implementation-readiness review.
1. Candidate and review authority
Implementation branch verified

Exact match

implementation/observability-infrastructure-visibility

b681cdcfb4cd10f5db2a1ea6d10ebcdc6f66b8d2

Main HEAD verified

c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6

Reviewed implementation revision · Main revision · Current Change register

The requested candidate matches the current remote implementation HEAD. The review is bound to that revision, not main.

The current repository instructions explicitly support construction-first integration, readiness before dependency satisfaction, proportionate verification and blocking only on material Critical or High findings.
Accepted baseline
Previously accepted scope	Disposition
E2 architecture	DEFENDED; not reopened
OBS-E2-01–07	Archived and joined
OBS-E2-PG01	Archived and joined
G1–G4 selected native evidence	Accepted
Bounded native metric coverage	Owner-ratified
E2-IR-H03	CLOSED
G5 joint qualification	Outstanding

The latest register records 07's 32/32 static dashboard test result and explicitly transfers Helm integration, PromQL execution and native operator proof downstream. That is the correct evidence boundary: successful dashboard construction is not yet evidence of successful live observability.
2. Joined artifact input verification
I inspected the actual joined artifact loader, history table, kubelet trust implementation, Prometheus and Grafana overlays, helper locks, dashboard assets and frozen coverage declarations.
Dashboard assets8
Repository-owned JSON files

Coverage declarations139
Metric panel mappings

Overview table20/20
Exact frozen target equality

Final history rows7
Plus two non-public intermediate histories


Dashboard ConfigMap capacity
I retrieved all eight actual JSON assets and calculated their UTF-8 byte sizes.
698,681 bytes

66.6% of 1 MiB






Overview JSON

Other dashboards

Remaining capacity


Overview


426.9 KiB

PostgreSQL


65.3 KiB

Observability


48.5 KiB

Messaging/cache


39.2 KiB

Storage


33.5 KiB

Kubernetes


32.8 KiB

Nodes


20.4 KiB

Temporal


15.8 KiB

Raw dashboard asset sizes measured from the reviewed Git revision, not rendered Kubernetes object or Helm release Secret sizes.
The current assets leave 349,895 bytes of raw ConfigMap capacity. The comparatively enormous overview dashboard does not itself require a different provisioning architecture.
Frozen contract equality
Check	Result
Native-services coverage vs frozen candidate	PASS
SeaweedFS coverage vs frozen candidate	PASS
Overview panel 108 vs frozen target array	PASS
Overview transformations vs frozen contract	PASS
Combined component declarations	20
Combined metric panel mappings	139
Separate KSM and Redis helper digest locks	Present
Dev Grafana file-provider configuration	Present
Actual integrated Helm rendering	NOT RUN
Pinned Prometheus execution	NOT RUN

The equality checks above were performed programmatically against the actual JSON files at the reviewed SHA. I did not reopen the accepted PromQL semantics or H03.

The remaining five inventory/resource/Redis component declarations also match their exact frozen JSON rows in NATIVE-INPUTS.md, including the revised M03 resource query. All four coverage fragments therefore have exact source-to-frozen-input equality.
3. Consolidated verdict
Critical0

High2

Medium3

Low0



E2-08
Exact E2 artifacts

READY

E2-09
Inventory and history

BLOCKED

E2-10
Normal consumers

BLOCKED

E2-11
Occupied upgrade

BLOCKED

E2-12
Proof admission

READY · gated

E2-13
Joint qualification

READY · gated


Release OBS-E2-08 for owner commission immediately. Correct the two localized interface and caller findings while 08 is being constructed.

Neither finding requires new architecture decisions, native experiments, or reconsideration of the accepted metric coverage.

4. Blocking findings
E2-IR-H04 | Owned history verification lacks an explicit custody capability
HIGH
Directly affects 09 and 11
Evidence

The frozen group interface specifies:
verifyOwnedHistoryShape(
  snapshot,
  artifactSet,
  {
    historyId,
    operationId,
    phase,
    namespaceUid
  }
)


The current source distinguishes actual ownership from mere observation of a pending record:
Existing interface	What it establishes
readPending()	Pending existence and validity
inspectPendingRecord()	Parsed record and file identity
custody.assertOwnPending()	Actual session ownership, record equality, file identity and custody authority
verifyOwnedFinalShape()	Explicitly requires and invokes the custody capability

Current collectInventory() returns only pending and pendingValid. Neither those booleans nor an operation ID supplied by a caller establish ownership.

The new interface omits the actual custody capability, despite being responsible for admitting the otherwise forbidden intermediate Helm states.

Consequence: 09 and 11 could independently implement incompatible understandings of owned verification. More importantly, an observed valid pending record must never become sufficient authority to advance an occupied transition.

Required correction

Extend the shared interface additively:
verifyOwnedHistoryShape(
  snapshot,
  artifactSet,
  {
    custody,
    historyId,
    operationId,
    phase,
    namespaceUid
  }
)


The verifier must invoke the existing custody.assertOwnPending() capability and validate the returned record's operation, operation ID, phase, namespace identity, predecessor history and target against the exact requested history shape.

Keep the distinction between:
- Public classification, which always refuses pending state.
- Read-only pending inspection, which confers no mutation authority.
- Owned phase verification, which requires the actual exclusive session capability.
Require negatives for a valid but foreign pending record, missing capability, mismatched phase and a replaced pending record.

Correction ownership: Group frozen interface §2, 09 T03 and 11 T01/T03.

No changes to the seven final history rows or the accepted occupied transition architecture are necessary.

Current custody source · Existing owned verifier · 09 task contract
E2-IR-H05 | Normal-consumer migration misses explicit historical callers
HIGH
Directly affects 10
Evidence

The current install.mjs contains more than the ensure implementation:
Source anchor	Existing behavior
runObservabilityPlan, L219	Explicitly resolves historical variants
runObservabilityStatus, L260	Delegates to historical plan
buildWorkerReceipt, L64	Projects a fixed receipt schema
structuralObservationReceipt, L179	Omits new artifact/convergence fields
Ensure final observation, L770–805	Supplies explicit artifacts to observation and uses historical owned final-shape verification

10 T02 changes the default observation wrapper while expressly preserving explicit historical descriptor routing. But runObservabilityPlan() already supplies explicit historical descriptors.

Consequently, changing the default wrapper does not migrate that caller.

Additionally, 10 T01 must ensure that its E2 finalization path does not accidentally enter the historical explicit-descriptor compatibility route that T02 is instructed to preserve.
Current missed routing edge
Required correction

Assign the following explicitly to 10:
- Migrate runObservabilityPlan() and consequently status to the operational observation route.
- Carry artifactId, historyId, structuralReady and desiredConverged through the worker receipt and affected diagnostic/status projections.
- Route E2 ensure finalization through the exact owned E2 fresh-install history verification, not the historical compatibility wrapper.
- Preserve explicit historical callers, existing receipt guarantees and release behavior.
- Exercise the actual plan/status entrypoints for exact E1 developer, exact E2, unavailable trust and pending state.
install.mjs is already within 10's Change-level ownership. This correction requires only proper task-level assignment and source anchors, not new cross-Change ownership.

Plan/status source · Worker receipt · 10 task contract

5. Individual Change assessments
OBS-E2-08 | Exact E2 artifacts
READY
Review dimension	Assessment
Four explicit artifact identities	Settled
Historical resolver preservation	Settled
Separate helper locks	PASS
Helm argument authority	Settled
Cluster-bound CA injection	Settled
Exact inventory ownership	Settled
Frozen coverage equality	PASS
Dashboard capacity	Raw input fits
Actual render and negative fixtures	Assigned to 08
Pinned promtool execution	Assigned to 13

The actual helper lock contains exactly the two selected roles:
Helper	Immutable digest prefix
kube-state-metrics	sha256:01171220c7c0
redis-exporter	sha256:d16780dcfefc

The existing helmValuesArgv() is an appropriate single authority for deterministic arguments shared by rendering, installation and upgrade.

The G2 trust contract sufficiently specifies the independent cluster binding, exact JSON injection, immutable ConfigMap, mount, historical rejection and desired-unavailable behavior. It does not leave the executor to invent a trust mechanism.

The Grafana overlay specifies a file provider, stable dashboard directory, disabled UI updates and the provisioned overview home path. The selected dashboard mechanism is consistent with 08's deterministic --set-file construction.

Importantly, T02 prohibits blindly blessing the rendered output by regenerating expected inventory. The render must satisfy an independently selected inventory and permission contract.

Task disposition: T01 → T02 → T03 is ready.

08 packet · Artifact loader
OBS-E2-09 | Inventory and operational history
PLANNER-BLOCKED · H04
The actual joined ARTIFACT_HISTORY_ROWS implements the required seven final histories.
Frozen final Helm revision matrixHistory	C	P	G
E1 base fresh	1	1	1
E1 developer fresh	1	1	1
E1 developer upgraded	2	1	1
E2 fresh	1	1	1
E2 from developer fresh	1	2	2
E2 from developer upgraded	2	2	2
Release E1	1	1	1

C = Collector, P = Prometheus, G = Grafana. Loki and Tempo retain revision 1. Equal revision numbers do not establish equal artifact identities.
The existing source confirms why 09 is necessary:
- Inventory currently uses namespaced keys and fetches retained revision-one manifests specifically for Collector.
- The current non-Collector manifest verifier compares resource identities rather than the complete intended E2 document content.
- Helm storage verification is specialized around the historical Collector transition.
- The new classifier explicitly replaces these assumptions with one shared exact history row, retained manifests, storage-record bijection, scoped RBAC and workload membership.
These are correctly mapped construction edits, not unresolved architecture.

The E1 developer structural-readiness versus desired-convergence distinction is also adequately settled.

H04 is the only blocking correction identified for 09. After closure and 08's verified join, T01 → T02 → T03 can proceed.

History source · Inventory source
OBS-E2-10 | Normal consumers
PLANNER-BLOCKED · H05
The selected operational behavior itself is correct and sufficiently determined.
Installed state	Ensure	Connect
Absent, valid trust	Install E2	Refuse
Absent, unavailable trust	Refuse	Refuse
Exact E1 base	Upgrade required	Refuse
Exact E1 developer	Upgrade required	Admit
Exact E2	Nonmutating no-op	Admit
Pending, mixed, foreign or unknown	Refuse	Refuse

The existing forwarding layer already accepts an artifact descriptor. Consequently, T03 can migrate the caller without replacing the forwarding architecture or competing with 11's new internal marker-forward capability.

The material issue is the incomplete caller migration identified in H05, not the selected behavior.

After H05 correction and the 08/09 joins, all three tasks can execute within the existing ownership boundaries.
OBS-E2-11 | Occupied upgrade
PLANNER-BLOCKED · H04
The occupied transition algorithm and preservation authority are otherwise sufficiently specified.
1. Exact E1 developer admission

   Exclusive custody, validated identity and trust, capacity admission, preservation baseline.
2. Positive historical markers

   Submit and positively observe metrics, logs and traces inside the same exclusive session.
3. Persist prometheus-intent

   Upgrade Prometheus only. Verify P2/G1, preserved objects, retained records and markers.
4. Persist grafana-intent

   Upgrade Grafana only. Verify P2/G2 and preservation.
5. Persist final-verification

   Verify final exact history, unchanged trust binding, positive coverage and retained data.
6. Clear owned pending

   Only after successful final verification.

Any uncertain write or failed postcondition

Retain pending, stop subsequent writes, preserve evidence. No automated rollback, restart or resume.



I verified the existing signal-probe.py replay mechanism. It reuses the original run, trace, parent, child, marker and timestamp identifiers, skips the POST branch and performs historical positive queries.

This supports the selected same-session retention proof without invoking another top-level proof process.

The existing openForwards() correctly restricts diagnostic forwarding to proof custody. The packet explicitly assigns a narrow internal E2 upgrade adapter rather than weakening that public restriction.

Preservation and mutation sequencing are accepted for readiness, subject to H04. 11 must consume the corrected capability-based owned verifier.

Upgrade source · Forwarding source · Marker replay source
OBS-E2-12 | Proof admission
READY · dependency-gated
The proof-entry mapping corresponds to the actual source. runProofOperationSession() contains specialized branches before the generic health observation, meaning a check exclusively in the latter would indeed be insufficient.

The packet addresses this at both dispatcher and direct-runner boundaries.
Proof	E1 developer	E2
Health	Admit	Admit
Signals	Admit	Admit
Developer	Admit	Admit
Persistence	Admit	Refuse
Outage	Admit	Refuse
Legacy resources	Admit	Refuse
Legacy partial-install on E2-enabled source	Refuse	Refuse

Admissions remain subject to existing identity, custody and authorization checks.

The direct-entry requirements include guarded rollout, scale and restoration helpers. The negative tests explicitly assert zero mutations, pending writes and probe creation for unsupported paths.

12 does not need 11's implementation to exist before construction. Unknown pending records already fail closed, and the shared future pending discriminator is settled. Compatibility must hold before live activation, not before independent source construction.

Task disposition: T01 → T02 → T03, following 09's join.

Proof dispatcher · 12 task contract
OBS-E2-13 | Joint qualification
READY · dependency-gated
13 is sufficiently specified as a concentrated qualification Change. The indispensable evidence has an owner, and the packet does not substitute source fixtures for native proof.
Qualification stage	Assigned verification
T01	Joined source regression and exact artifact verification
T02	Authorized occupied transition and preservation
T03	Actual coverage, trust, permissions and dashboard experience
T04	Durable documentation, evidence and final acceptance

The pinned Prometheus proof explicitly includes both:
promtool check config
promtool test rules


The second command is materially important. Parsing rendered YAML or checking dashboard JSON cannot establish the PromQL behavior of the accepted overview contract.

The task includes all residual H03 regression obligations: partial stale ownership, missing global ownership families, both Temporal ownership-chain sides, confident match/mismatch and current-down precedence.

The native acceptance boundary preserves the distinction between actual occupied-upgrade qualification, current telemetry coverage, fresh-install qualification and historical E1 proof.

Fresh-install proof requires a separately authorized specimen or later fresh deployment. If not run, the packet must preserve that limitation rather than manufacture certification.

No additional native experiments are required to establish planning readiness for 13.

13 tasks · Qualification proof

6. Nonblocking findings
These are recorded under the existing severity policy. None warrants another review cycle.
ID	Finding	Disposition
E2-IR-M07	Dashboard capacity is satisfactory at the raw input level, but the rendered ConfigMap size and encoded Helm release storage size should have explicit assertions.	08 T03; retain in artifact verification tests.
E2-IR-M08	signal-probe.py emits nanosecond timestamps as JSON integers. A new JavaScript marker adapter should avoid unnecessary lossy numeric round trips and retain only the intended sanitized evidence from private probe files.	11 T02; retain in preservation adapter tests.
E2-IR-M09	G5 cost comparison requires a pre-upgrade baseline, and the conditional KSM list/watch, Job and degradation obligations deserve explicit receipt entries. The integration matrix already establishes their authority.	13 T02/T03; retain in qualification receipt and canonical observability documentation.

M09 is particularly inexpensive to address before occupation changes: the acceptance lead should not discover after upgrading Prometheus that the intended E1 comparison baseline was never captured.

Preserve all previous Medium and Low dispositions. Do not reopen archived constituents to resolve these three refinements.

7. Parallel ownership and dispatch order
Construction dependency graph. Changes 10, 11 and 12 remain independently eligible after their own prerequisites are satisfied.
Parallel-write assessment
Pair	Disposition
08 / planner corrections	Safe with disjoint source and packet ownership
08 / 09	Sequential dependency
09 / 10	Sequential dependency
10 / 11	Parallel after corrections; 11 owns forward implementation
10 / 12	Parallel
11 / 12	Parallel; shared contract, separate implementation
10 / 11 / 12 joins	Serialized
13 / other live operations	Exclusive qualification custody

The potential forward.test.mjs collision is already explicitly handled by the group register. Prefer 11's separate e2-upgrade.test.mjs fixture.

There is no justified reason to serialize the complete 10–12 wave.
Exact release sequence
Order	Change	First task	Release condition
1	08	T01	Owner commission
Parallel	Planner	H04/H05	Localized packet corrections
2	09	T01	08 joined; H04 closed
3A	10	T01	09 joined; H05 closed
3B	11	T01	09 joined; H04 closed
3C	12	T01	09 joined
4	13	T01	All constituents joined
Final	Design integration	G5 acceptance	Required evidence and owner acceptance

A delay in correcting H05 must not prevent otherwise eligible 11 or 12 construction.

No live E2 activation until 10, 11 and 12 have all joined.

8. Readiness gate summary
Gate	08	09	10	11	12	13
G0 Authority
G1 Source truth
G2 Contracts
G3 Task context
G4 Dispatch
G5 Concurrency
G6 Proof ownership
G7 Cost and closure

Readiness PASSCorrection required

These are packet-readiness gates, not executed software tests or native certification results.
9. Evidence limits
The review established remote branch identities, inspected the six Change front doors and all 19 task cards, traced high-impact source interfaces, inspected the frozen integration and acceptance contracts, calculated dashboard asset sizes and performed exact JSON equality checks.

The following remain outside this review:
- Actual integrated E2 Helm render, rendered ConfigMap capacity and encoded Helm storage capacity.
- Executed Prometheus configuration and synthetic expression tests.
- Actual Kubernetes, Prometheus and Grafana qualification.
- Local worktree cleanliness and live resource custody, which cannot be established from remote GitHub inspection.
- Exhaustive execution of every task's future implementation and fixtures.
No repository mutations, implementation, live operations or new native experiments were performed.

The two blocking corrections are recommendations from this independent review. They refine the existing interface and caller contracts without selecting new architecture.

10. Final review receipt
Field	Result
Review	Consolidated readiness review 07
Repository	DenisSkulovic/offscreen-rpg
Candidate	b681cdcfb4cd10f5db2a1ea6d10ebcdc6f66b8d2
Critical findings	0
High findings	2
Medium findings	3
Ready	08
Ready, dependency-gated	12, 13
Planner-blocked	09, 10, 11
Architecture disposition	DEFENDED, unchanged
G1–G4	Accepted, unchanged
H03	CLOSED
G5	NOT RUN
Main integration	Not authorized by this review

Final verdict: PARTIAL RELEASE.

OBS-E2-08 is READY at the exact reviewed SHA. Commission it without waiting for the remaining packet corrections.

Correct H04 and H05 concurrently with 08 construction, then perform one narrow impact-based re-review of those corrections. Reuse every unaffected conclusion from this review.

The remaining engineering programme is coherent. The two findings are localized planner-contract defects, not reasons to reopen Observability E2 or delay its implementation as a whole.
