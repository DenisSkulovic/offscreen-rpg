# TURN04 | Optionally confirm one paid LLM turn through the same distributed pipeline

**State:** Proposed; requires separate explicit owner spending authorization (2026-11-19)  
**Kind:** implementation  
**Execution:** Not in the active Cursor batch; paid call specifically requires new explicit authorization even if a batch is approved.  
**Program:** [D5 full release and acceptance](../../../designs/open/distributed-turn-poc/D5-RELEASE-AND-ACCEPTANCE.md) · [DISTURN](../../../designs/open/distributed-turn-poc/README.md) · [GAPS](../../../designs/open/distributed-turn-poc/GAPS.md)

## Precisely bounded outcome

Optionally confirm one paid LLM turn through the same distributed pipeline. This Change exists to join the previously planned bounded slices, not to reimplement them under new names.

**Prerequisites:** TURN03 has passed same-commit provider-free acceptance and the user explicitly approves model, spend ceiling and single-run scope. Not selected by bundle authorization.

## Source-based implementation / documentation work

Use existing generation/storytellerAttempt/operation/funding/dispatch review ledgers to authorize exactly one real provider continuation on the *same* frozen task/read/proposal/GA publication path. Persist request/attempt/usage policy and model/price selection, reserve hard microusd and token cap, perform a single reviewed send, capture reportable response validity and actual/uncertain provider liability, then publish only if admissible. Do not auto-retry unknown-send, do not assume retry of Temporal is free, do not allow Stripe or subscription to stand in for preapproved test budget. Redact keys/secret content from result ledger. Produce a distinct optional acceptance receipt; real model behavior may fail and must not invalidate the already proven provider-free architecture.

**Owned source and canonical documents:** Existing storyteller budget, dispatch-review, provider adapter and attempt ledger source owners, user-controlled local run script/evidence, technical provider-spending and Storyteller publication docs only where actual contract changes.

**Preserve existing source responsibilities:** `apps/web` Next SSR/React + client SSE, `apps/api` Nest authenticated HTTP, `packages/application` existing admitted commands, `packages/documents` immutable local/S3 formats, `packages/db` SQL authority and outbox, `packages/workflows` Temporal workflows, `packages/storyteller` bounded validated DM tasks. Do not duplicate these modules merely to make a new harness. All source files and migrations must be rechecked at latest HEAD before implementation; current repo state may have changed on Cursor branches.

## Acceptance / negative proofs

Owner-approved exact cap and provider/model recorded before send; one provider request or explicit refusal; recorded tokens/charge or uncertain state; no second attempt on lost ACK; valid proposal follows same GA publication and scene root rules, invalid result held rather than fake success. No provider keys in evidence.

No Pod Ready, mocked adapter-only test or local Compose smoke may be represented as a complete kind E2E unless the source and command logs demonstrate it. Report exact commands, IDs, state and object hashes, source commit/image digests, integration status and not-run tests.

## Parallel scheduling and collision control

Do not run concurrently with POC load/chaos or another provider test. Read-only preparatory review may run early; executable provider call requires standalone approval after TURN03.

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
