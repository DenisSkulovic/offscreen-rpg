# OBSERVABILITY-DEVELOPER | practical developer telemetry

**State:** Proposed / R5 designer DEFENDED; independent defense pass 02 pending.
**Kind:** implementation.
**Approval and owner:** Owner requested packet creation and active planning 2026-11-27. ChatGPT planner + human owner; no implementation commission or live mutation authority.
**Baseline:** main 5f5750eca2f31d92fac6bfa478d1cae7203e1815. Planning branch design/observability-developer. Implementation branch/worktree to be selected after defense and promotion.
**Design:** [active workshop](../../../designs/open/observability-developer/README.md).
**Parallel execution:** single successor implementation owner after ratification; OBSERVABILITY-NATIVE stays open and yields overlapping source ownership, A1–A12 successor proof required before joint closure. Human owner integration custodian. No global queue change.

## Cursor first-screen brief
NOT DISPATCHABLE. Existing authority is native observability infrastructure, synthetic-only admission and install-only lifecycle. Proposed outcome is developer-accessible application-shaped telemetry without destructive reinstall. Do not reinterpret this proposal as permission to remove privacy filters, upgrade live Helm releases or enroll producers. R5 design addresses committee findings, baseline census and re-defense complete; planner must finish implementation mapping, tests and packet after committee approval and owner ratification.

## Outcome and motivation
Enable safe application-shaped traces/logs/metrics from WSL into the existing dev platform, query them in Grafana/backends, and disconnect cleanly. P0/P1 currently exports no telemetry by its own contract; do not change that dossier or block base runs on full observability certification. Preserve the existing five services, three PVCs and Grafana credentials. Retain synthetic diagnostics and explicitly track the older acceptance debt rather than asserting it passed.

## Authority and baseline
- Product: no player-facing change.
- Technical: [native observability](../../../../docs/technical/platform/observability-native-infrastructure.md), existing [OBSERVABILITY-NATIVE](../2026-11-26--observability-native/CHANGE.md). Proposed amendments only.
- Evidence: see design dossier for actual observed health, installation, image identity, transport failure, admitted OTLP and broken query/harness paths.
- R4 selects producer vocabulary, topology, session API, revision identity and failure semantics. Actual implementation/live acceptance NOT RUN; actual POC instrumentation excluded.

## Candidate scope
- Owner-required retirement of executable specimens terminology: values/, locks/, root expected-inventory.json, unchanged vendor/; no behavioral delta in naming slice.
- Foreground owned WSL connection session rather than new daemon; dev-only explicit Collector configuration upgrade candidate.
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
| Code | infra/platform/observability/{specimens,artifacts.mjs,identity.mjs,inventory.mjs,readiness.mjs,install.mjs,custody.mjs,tests}; infra/verification/smoke/observability/; connection/upgrade/verification paths frozen in R5-GEOGRAPHY | shared platform CLI and existing lifecycle | no implementation until mapped; negative proof of unsafe producer, changed UID, wrong digest, pending fence |
| Related | existing OBSERVABILITY-NATIVE acceptance ledger and active Change catalog | Agent Core experiment qualification | all A1–A12 mapped to successor, transfer source custody only after owner ratification |

## Acceptance and discriminating negative proof
Provisional gates in design dossier. Required: WSL actual application-shaped all-signal query and correlated trace, tested prohibited canary exclusion and bounded metric labels (trusted producer scope), repeat no-op, preserve exact storage/credential identities, unauthorized/wrong target/foreign pending refusal, cleanup only owned session. Existing original gate debts remain open. Focused source tests Cursor; heavy acceptance ChatGPT/owner. No destructive or release permission.
 
## R5 consolidated design
[Target](../../../designs/open/observability-developer/TARGET.md) · [Source map](../../../designs/open/observability-developer/SOURCE-MAP.md) · [Acceptance](../../../designs/open/observability-developer/ACCEPTANCE.md) · [Self-defense](../../../designs/open/observability-developer/SELF-DEFENSE.md). [Lifecycle](../../../designs/open/observability-developer/LIFECYCLE.md). These supersede earlier conflicting candidates; [Proof ownership/freshness](../../../designs/open/observability-developer/R5-PROOF-CONTRACT.md), [certification continuity](../../../designs/open/observability-developer/R5-CERTIFICATION.md), [geography](../../../designs/open/observability-developer/R5-GEOGRAPHY.md). Pass 01 rejected R4; R5 baseline census complete and designer DEFENDED; independent pass 02 pending. No commission.

## Planning checkpoint
[R2 design checkpoint](../../../designs/open/observability-developer/DESIGN-R2.md) records narrowed producer scope, foreground access, occupied upgrade state machine and source gaps. Chart-port/render, OTTL behavior and predecessor evidence recorded; R4 lifecycle refined by R5 proof, certification and geography amendments, all four pass 01 findings dispositioned by designer. Independent pass 02 next. Freeze precise source anchors/algorithm/ordered T-IDs and proof commands only after defense. No TASKS.md with speculative Ready work. Reconciliation ledger not yet applicable: no source edits, no acceptance claim.
