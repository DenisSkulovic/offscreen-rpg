# OBSERVABILITY-DEVELOPER | developer telemetry

**State:** Proposed; dispatch held pending packet readiness review and commission.
**Kind:** Implementation.
**Owner:** ChatGPT planner and human owner; human integration custodian.
**Integration:** main; dedicated change/observability-developer branch and linked worktree from current main upon commission. Original compatibility baseline: 76e28a45dbddbbc551c7a3efb35691e7ba23c379.

## Outcome

Provide safe application-shaped traces, logs and metrics from WSL into the existing development observability platform, query them through the backends, and disconnect cleanly. Preserve existing storage, credentials, diagnostic admission and release behavior.

## Authority

- [Accepted design](../../../designs/open/observability-developer/README.md): R5 defended in pass 02, owner accepted and promoted.
- [Canonical technical contract](../../../../docs/technical/platform/observability-native-infrastructure.md).
- [Archived predecessor](../../archive/2026-11/observability/2026-11-26--observability-native/CHANGE.md): superseded, not certified Done. All remaining A1–A12 obligations transfer to this Change.
- No product behavior change. Agent Core P0/P1 remains telemetry-free under its own contract.

## Scope

1. Normalize maintained Helm artifacts into values/, locks/ and root expected-inventory.json; retain existing vendor archives and exact baseline render parity.
2. Add native dev Collector overlay with separate diagnostic and trusted-local application admission.
3. Strengthen identity, custody, classification and preservation checks.
4. Add foreground WSL connection and explicit dev-only Collector configuration upgrade.
5. Repair actual signal queries, health and resource observation, disruption and isolated certification proof paths.
6. Integrate focused tests, permanent documentation and owner acceptance tools.

Preserve pinned artifacts, three claims, Grafana credentials, bounded reads/writes, pending fences, no secrets in receipts and owned cleanup. Exclude actual SDK enrollment, generic upgrades, hosted or hostile tenant isolation, release mutation, public exposure, paid calls and unrelated workload changes.

## Execution

| Document | Responsibility |
| --- | --- |
| [TASKS.md](TASKS.md) | Ordered implementation cards T01–T12 |
| [INTERFACES.md](INTERFACES.md) | Exact cross-task implementation contracts |
| [SOURCE-MAP.md](SOURCE-MAP.md) | Source anchors and evidence |
| [PROOF.md](PROOF.md) | Acceptance predicates, executor allocation and commands |
| [READINESS.md](READINESS.md) | Current unresolved decisions and readiness gates |

One serial implementation owner. T05 and T11 are parent milestones; dispatch their numbered child cards individually and require their milestone joins. Once commissioned, execute dependency-gated cards without repeated approval. Cursor owns source implementation and focused tests. ChatGPT and owner own heavy acceptance. No live mutation is authorized by this packet.

## Acceptance

Require focused positive and negative tests, actual application-shaped all-signal query, sensitive-canary exclusion, bounded metric labels, exact retained storage and credential identity, repeat no-op, wrong-target and foreign/pending refusal, and owned connection cleanup. Retain the complete transferred native acceptance matrix; no prior observation is promoted to PASS.

## Current authorization

All dispatch remains held. No source implementation or successor acceptance has run. Outstanding deadline, proof and metric timestamp allocation decisions require the disposition recorded in READINESS.md and PROOF.md before commission. No independent packet readiness claim is made here.

Historical commission and repair records remain in [the pre-consolidation revision](https://github.com/DenisSkulovic/offscreen-rpg/blob/dee29c6653b873b741197b04f84761d64b35824e/work/changes/open/2026-11-27--observability-developer/CHANGE.md).
