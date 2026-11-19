# TURN03 | Prove one complete forkable distributed Storyteller turn on a cold kind cluster

**State:** Proposed, final provider-free POC gate (2026-11-19)  
**Kind:** implementation  
**Execution:** Not in the active Cursor batch; owner or authorized orchestrator must select this Change separately.  
**Program:** [D5 full release and acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

## Precisely bounded outcome

Prove one complete forkable distributed Storyteller turn on a cold kind cluster. This Change exists to join the previously planned bounded slices, not to reimplement them under new names.

**Prerequisites:** TURN01 and TURN02; working BOOT03/04, DATA03/04/05/06, DIST03/04/05/06, STORY02/03/04 and required K8S services. Must verify source evidence, not trust packet Done labels alone.

## Source-based implementation / documentation work

Use the TURN01 selected **single** scripted golden fixture and TURN02 release profile. Run authenticated draft/candidate, start through Nest→GA, scene1 SQL checkpoint/canon source, one supported command, one SQL outbox→Rabbit→Temporal handoff, distinct Storyteller executor bounded S3 read, saved validated fake proposal/attempt, GA game consequence/publication of scene2, SSE hint + GET and UI update, historical GET of scene1 and noncurrent fork with independent branch state+canon. Verify a new continuation on fork does not import parent future. Collect one correlation ledger from browser to DB/S3 and branch. Execute negatives from D5 covering owner/cookie rejection, duplicate notices/commands/publications, S3 outage, stale root, missed SSE, worker restart, and unavailable Temporal; mark not-run truthfully. Any skipped mandatory gate means POC NOT complete. Reuse/coordinate existing DIST06, BOOT04, STORY04 and DATA04 fixtures rather than build parallel harnesses.

**Owned source and canonical documents:** Existing api-integration/playability tests plus new connected E2E runner under established test/script owner, infra/kubernetes lab runner, repo observability/evaluations evidence and runbook; code changes only for source-demonstrated integration faults, otherwise raise a bounded follow-up Change.

**Preserve existing source responsibilities:** `apps/web` Next SSR/React + client SSE, `apps/api` Nest authenticated HTTP, `packages/application` existing admitted commands, `packages/documents` immutable local/S3 formats, `packages/db` SQL authority and outbox, `packages/workflows` Temporal workflows, `packages/storyteller` bounded validated DM tasks. Do not duplicate these modules merely to make a new harness. All source files and migrations must be rechecked at latest HEAD before implementation; current repo state may have changed on Cursor branches.

## Acceptance / negative proofs

Same commit/image digests for all hops, scene1 and scene2 source/state/root hashes verified across restarts, fork scene1 excludes later parent item/lore, branch advances independently, no unauthorized read or duplicate effect, no live provider calls. Genuine multi-Pod execution proven via causal logs and trace. Report FAIL/BLOCKED rather than archive if mandatory gate unavailable.

No Pod Ready, mocked adapter-only test or local Compose smoke may be represented as a complete kind E2E unless the source and command logs demonstrate it. Report exact commands, IDs, state and object hashes, source commit/image digests, integration status and not-run tests.

## Parallel scheduling and collision control

Build test harness and failure fixtures in independent worktree while implementations progress. One coordinator runs cold cluster and final test once dependencies integrated. No parallel mutation of shared DB or kind during acceptance.

Shared SQL migration sequences, Kubernetes Gateway, canonical docs and final acceptance fixtures require a single integration owner. Worktrees isolate independent research/builds, not override prerequisites. No automatic successor; Proposed means not authorized.

## Out of scope

Image generation, live multiplayer, Stripe/subscription billing, production customer usage reconciliation, Cognee/vector/graph adoption, arbitrary Code Mode, full ruleset implementation, paid provider access except when TURN04 is individually authorized, cloud HA and full chaos/load program. The complete fake POC **includes** historically forkable scenes and source-faithful canonical state; do not relax this to “two passages displayed”.

## planned-impact.v1

| Plane | Intended owner and effect | Closure requirement |
| --- | --- | --- |
| Product | Existing text-first D&D DM, scene history and branchable fork acceptance; no new gameplay | Source-faithful criteria, no economy or image requirement |
| Technical | Validated cross-runtime ownership, release and explicit POC evidence under existing technical owners | Exact normal/negative contract and runtime facts |
| Code | Bounded deployment/test/provider work described above, not a parallel rewrite of existing implementation Changes | Source tests, integration evidence and no silent skipped gates |
| Related | Queue pointers, operations runbook, evidence/STATUS and reconciled authoritative docs | Wiki/link guards and truthful status |

## Reconciliation ledger (complete before Done)

| Claim / document | Delta or no-op | Source SHA and diff | Positive evidence | Negative evidence | Link/status |
| --- | --- | --- | --- | --- | --- |
| Product acceptance | unchanged | Pending | Pending | Pending | Pending |
| Runtime and service owners | review/reconcile | Pending | Pending | Pending | Pending |
| Data/Storyteller/fork | review/reconcile | Pending | Pending | Pending | Pending |
| Test/runbook/status | actual executable run | Pending | Pending | Pending | Pending |

Complete ledger, run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, archive only actual results, and repair inbound links. No automatic next Change.
