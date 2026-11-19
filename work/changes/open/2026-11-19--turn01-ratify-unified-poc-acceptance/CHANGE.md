# TURN01 | Ratify one complete forkable-turn acceptance fixture and scorecard

**State:** Ready for owner-selected reconciliation (2026-11-19)  
**Kind:** documentation  
**Execution:** Not in the active Cursor batch; owner or authorized orchestrator must select this Change separately.  
**Program:** [D5 full release and acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

## Precisely bounded outcome

Ratify one complete forkable-turn acceptance fixture and scorecard. This Change exists to join the previously planned bounded slices, not to reimplement them under new names.

**Prerequisites:** D1–D4 proposed contracts and the existing DIST06/BOOT04/STORY04/DATA04 scopes; no cluster required for this design packet.

## Source-based implementation / documentation work

Ratify [D5](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) as the acceptance program. Inventory the actual existing REAL01/REAL02 fixture/candidate and selected D&D-lite mechanics; choose one source-supported scripted opening and one supported outcome. Specify a single test data seed; fixture identities, story/operation/generation IDs, source pins, scene1/scene2 states and corresponding canon roots, expected canonical descriptive patch and a noncurrent historical fork. Require a real branch-independent continuation, not just fork creation. Specify which existing test suites/scripts can be reused, which new fixture helpers are needed, and a machine-readable PASS/FAIL/BLOCKED/NOT-RUN ledger. Do not copy D5 into permanent docs: publish only exact acceptance claims, links and verified source differences under current owners. Set explicit status of prerequisite probes and per-gate stop-on-failure rules.

**Owned source and canonical documents:** Existing REAL01/REAL02 fixture references and their test owners; docs/product/experience/ relevant journal and creation pages only if actual ambiguity; docs/technical/platform/{topology,execution-and-delivery,data-and-persistence}.md; existing observability/evaluation evidence conventions; no executable files.

**Preserve existing source responsibilities:** `apps/web` Next SSR/React + client SSE, `apps/api` Nest authenticated HTTP, `packages/application` existing admitted commands, `packages/documents` immutable local/S3 formats, `packages/db` SQL authority and outbox, `packages/workflows` Temporal workflows, `packages/storyteller` bounded validated DM tasks. Do not duplicate these modules merely to make a new harness. All source files and migrations must be rechecked at latest HEAD before implementation; current repo state may have changed on Cursor branches.

## Acceptance / negative proofs

A reviewer can take one deterministic authored fixture and derive every expected publication hash/state/root transition and fork outcome. Explicit FAIL if any jump uses local/Compose shortcut or a fake DB succeeded row. Distinguish source-backed current capability versus selected future; no live model request.

No Pod Ready, mocked adapter-only test or local Compose smoke may be represented as a complete kind E2E unless the source and command logs demonstrate it. Report exact commands, IDs, state and object hashes, source commit/image digests, integration status and not-run tests.

## Parallel scheduling and collision control

Read-only source/fixture study and acceptance table may run alongside K8S/DATA/STORY code changes. Shared canonical docs and test fixture naming need one join owner.

Shared SQL migration sequences, Kubernetes Gateway, canonical docs and final acceptance fixtures require a single integration owner. Worktrees isolate independent research/builds, not override prerequisites. No automatic successor; Proposed means not authorized.

## Out of scope

Image generation, live multiplayer, Stripe/subscription billing, production customer usage reconciliation, Cognee/vector/graph adoption, arbitrary Code Mode, full ruleset implementation, paid provider access except when TURN04 is individually authorized, cloud HA and full chaos/load program. The complete fake POC **includes** historically forkable scenes and source-faithful canonical state; do not relax this to “two passages displayed”.

## planned-impact.v1

| Plane | Intended owner and effect | Closure requirement |
| --- | --- | --- |
| Product | Existing text-first D&D DM, scene history and branchable fork acceptance; no new gameplay | Source-faithful criteria, no economy or image requirement |
| Technical | Validated cross-runtime ownership, release and explicit POC evidence under existing technical owners | Exact normal/negative contract and runtime facts |
| Code | No executable changes | Documentation-only semantic diff |
| Related | Queue pointers, operations runbook, evidence/STATUS and reconciled authoritative docs | Wiki/link guards and truthful status |

## Reconciliation ledger (complete before Done)

| Claim / document | Delta or no-op | Source SHA and diff | Positive evidence | Negative evidence | Link/status |
| --- | --- | --- | --- | --- | --- |
| Product acceptance | unchanged | Pending | Pending | Pending | Pending |
| Runtime and service owners | review/reconcile | Pending | Pending | Pending | Pending |
| Data/Storyteller/fork | review/reconcile | Pending | Pending | Pending | Pending |
| Test/runbook/status | design only | Pending | Pending | Pending | Pending |

Complete ledger, run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, archive only actual results, and repair inbound links. No automatic next Change.
