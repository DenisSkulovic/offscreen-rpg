# TURN04 | Optionally confirm one paid LLM turn through the same distributed pipeline

**OBS00/architecture dependency clarification (2026-11-20):** [OBS00-B's independent grant/SQL dispatch recheck](../../archive/2026-11/observability/2026-11-15--obs00-live-provider-custody/CHANGE.md) is **Done for provider-free security** on the SQL-owning path; that is not operator-approved paid activation. OBS00-C exact review→transport wire equality was already Done separately. The current distributed executor `apps/worker/src/activities/storyteller-distributed-execution.ts` **explicitly refuses provider-mode tasks**, and giving it DB credentials or a callback is not authorized. TURN04 therefore additionally needs an explicit **separate distributed paid-executor custody design and owner spending approval** after provider-free TURN03 passes; OBS00-B alone does not silently enable this route. No paid dispatch or entitlement grant in the zero-provider release.

**Composer microtask entry (2026-11-20):** [TASKS.md](TASKS.md) contains bounded subagent assignments and exact failure/stop tests; [all-open audit](../../COMPOSER-QUEUE-AUDIT-2026-11-20.md) reconciles dependencies and program order. **Default Cursor parent and child: Composer 2.5 Standard.** This packet's delegation: provider-disabled safety preparation only; actual send owner-locked. Existing state, owner selection and spend/cluster gates remain authoritative; no automatic Grok escalation or broad child research. A prepared task is not a passing proof.

**State:** Proposed; requires separate explicit owner spending authorization (2026-11-19). **T01 VERIFY PASS** at `ec73a535` (2026-11-20): zero-spend OBS00/budget overlap **23/23**, zero sends; `storyteller-provider-budget` **3/3**; `storyteller-provider-recovery` **4/4** (`dispatchAuthority` null → refuse, `unsentCalls===0`). **T02 PLANNER-BLOCKED.** **T03 live continuation NOT AUTHORIZED.** Packet open; **not Done**; paid live dispatch **DENIED**.  
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
| Test/runbook/status | T01 zero-spend slices @ `ec73a535`; hidden price / untrusted usage / dedicated TURN04 fixture **NOT-RUN** | `ec73a535` | Overlap 23/23 + budget 3/3 + recovery 4/4, zero sends | Live send, T03, full T01 negative matrix | Open |

Complete ledger, run `pnpm wiki:change-guard --mode plan` and `--mode close` where supported, archive only actual results, and repair inbound links. No automatic next Change.
