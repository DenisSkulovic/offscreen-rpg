# OBSERVABILITY-DEVELOPER | practical developer telemetry

**State:** Proposed / PLANNER BLOCKER (D1 safe admission, D2 connection ownership, D3 occupied transition).
**Kind:** implementation.
**Approval and owner:** Owner requested packet creation and active planning 2026-11-27. ChatGPT planner + human owner; no implementation commission or live mutation authority.
**Baseline:** main 5f5750eca2f31d92fac6bfa478d1cae7203e1815. Planning branch design/observability-developer. Implementation branch/worktree to be selected after defense and promotion.
**Design:** [active workshop](../../../designs/open/observability-developer/README.md).
**Parallel execution:** serial with OBSERVABILITY-NATIVE on shared observability source, proofs, and live dev target. Human owner integration custodian. No global queue change.

## Cursor first-screen brief
NOT DISPATCHABLE. Existing authority is native observability infrastructure, synthetic-only admission and install-only lifecycle. Proposed outcome is developer-accessible application-shaped telemetry without destructive reinstall. Do not reinterpret this proposal as permission to remove privacy filters, upgrade live Helm releases or enroll producers. Planner must resolve D1–D3 and finish source mapping, tests, defense and owner ratification first.

## Outcome and motivation
Enable the three scripted Agent Core POCs to submit safe operational traces/logs/metrics from WSL into the existing dev platform, query them in Grafana/backends, and disconnect cleanly. Preserve the existing five services, three PVCs and Grafana credentials. Retain synthetic diagnostics and explicitly track the older acceptance debt rather than asserting it passed.

## Authority and baseline
- Product: no player-facing change.
- Technical: [native observability](../../../../docs/technical/platform/observability-native-infrastructure.md), existing [OBSERVABILITY-NATIVE](../2026-11-26--observability-native/CHANGE.md). Proposed amendments only.
- Evidence: see design dossier for actual observed health, installation, image identity, transport failure, admitted OTLP and broken query/harness paths.
- Unknowns: safe producer vocabulary, pipeline topology, session API, config revision identity, upgrade failure/rollback semantics, actual POC instrumentation compatibility.

## Candidate scope
- Collector development receiver accessibility, explicit trusted local producer admission and sanitization; preserve release semantics.
- Scoped WSL connections and deterministic cleanup.
- Explicit owned dev Collector configuration evolution without PVC/credential deletion; no implicit upgrade during ensure.
- Functional proof harness repairs, meaningful source regression tests and actual developer round trip.
- Exclude new cluster for ordinary tests, generic upgrade framework, public exposure, paid calls, changes to Agent Core dossier, unrelated tenant or release mutations, hosted/hostile tenant certification, new backend technology.
- Preserve digest pinning, bounded reads/writes and queues, pending fences, data retention, no secrets in logs or receipts.

## Planned specification and implementation delta | planned-impact.v1
| Plane | Candidate authority and change/no-op | Related owners | Evidence/decision |
| --- | --- | --- | --- |
| Product | unchanged because developer tooling only | Agent Core POCs | no player contract change |
| Technical | native observability infrastructure: dev admission, access, occupied transition and proof; exact headings after defense | local developer platform/runbook | owner ratification pending |
| Code | infra/platform/observability/{specimens,artifacts.mjs,identity.mjs,inventory.mjs,readiness.mjs,install.mjs,custody.mjs,tests}; infra/verification/smoke/observability/; connection/CLI paths TBD by D2/D3 | shared platform CLI and existing lifecycle | no implementation until mapped; negative proof of unsafe producer, changed UID, wrong digest, pending fence |
| Related | existing OBSERVABILITY-NATIVE acceptance ledger and active Change catalog | Agent Core experiment qualification | preserve or explicitly transfer each unrun gate |

## Acceptance and discriminating negative proof
Provisional gates in design dossier. Required: WSL actual application-shaped all-signal query and correlated trace, no secret content or high-cardinality labels, repeat no-op, preserve exact storage/credential identities, unauthorized/wrong target/foreign pending refusal, cleanup only owned session. Existing original gate debts remain open. Focused source tests Cursor; heavy acceptance ChatGPT/owner. No destructive or release permission.
 
## Planning checkpoint
Resolve D1 producer contract first, then D2 access, D3 transition. Freeze precise source anchors/algorithm/ordered T-IDs and proof commands only after defense. No TASKS.md with speculative Ready work. Reconciliation ledger not yet applicable: no source edits, no acceptance claim.
