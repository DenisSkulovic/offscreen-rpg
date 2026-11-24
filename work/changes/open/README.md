# Open Changes | current and near-term

**Final-wave conditional commission (2026-11-24):** Owner commissioned DO06 and DO07 now. DO06 may execute after DO05 integrates (DO03 already integrated); DO04 need not land first. DO07 may execute only after all six extractions integrate and no live residual module remains. Each assigned parent checks predecessor receipts and exact source/export postconditions on latest undertaking HEAD before editing; if they pass, no further ChatGPT release or approval is needed. Genuine semantic contradictions remain stop conditions. Coordinate joins with DO04 wave B custodian while active; otherwise the sole remaining parent owns its join. No global queue change, no new proof or completion credit.

## Cache platform parallel waves

[Full catalog](../README.md#cache-platform-redesign) · [Frozen contracts and ownership](../../undertakings/storyteller-workshop/CACHE-PARALLEL.md). All eight owner-commissioned; DO07 and Documents predecessors verified. CACHE01 and CACHE02 are Done source-only. CACHE03/CACHE05 remain wave 1. CACHE04/CACHE06A/CACHE06B wait for joined wiring. CACHE07 waits for consumers and disposable resource authorization. The CACHE02 parent remains custodian. No further release required when gates pass. No queue change.

## Near-term domain ownership sequence (2026-11-24)

**Wave B release (2026-11-24):** DO01–DO05 integrated source-only. DO04 was the wave B custodian. Wave B is joined. Separate linked worktrees, local lockfiles, no independent undertaking pushes. Shared files: residual contracts manifest, lockfile, ESLint config, graph rules and shared docs; merge by owned keys/rules, regenerate lockfile and run combined affected proofs. No mapped direct consumer file overlap. DO05 must remove its two remaining Storyteller old imports and manifest dependency before adding the transitional reverse edge from residual evaluation. DO04 owns private protocol guard; DO05 owns narrow residual evaluation exception. DO06 and DO07 are integrated source-only. The contracts workspace is removed. No cluster, provider, DB mutation, Documents or CACHE scope.

| Change | Dependency | Status |
| --- | --- | --- |
| [DO01 Cache port](../archive/2026-11/platform-operations/2026-11-24--do01-cache-port/CHANGE.md) | None | Done, source-only |
| [DO02 Admin / identity / usage](../archive/2026-11/platform-operations/2026-11-24--do02-admin-identity-usage/CHANGE.md) | None | Done, source-only |
| [DO03 Story interface](../archive/2026-11/platform-operations/2026-11-24--do03-story-interface/CHANGE.md) | Documents settled | Done, source-only |
| [DO04 Authority protocol](../archive/2026-11/platform-operations/2026-11-24--do04-authority-protocol/CHANGE.md) | DO03 | Done, source-only |
| [DO05 Storyteller / engine](../archive/2026-11/platform-operations/2026-11-24--do05-storyteller-engine-ownership/CHANGE.md) | DO02 + DO03 | Done, source-only |
| [DO06 Lab ownership](../archive/2026-11/platform-operations/2026-11-24--do06-lab-ownership/CHANGE.md) | DO03 + DO05 | Done / source-only |
[Retirement program](../../designs/open/code-architecture-health/DOMAIN-OWNERSHIP-RETIREMENT.md) · [Parallel execution rules](../../designs/open/code-architecture-health/DO-PARALLEL-EXECUTION.md).

**Purpose:** Keep this directory small. An entry is here only because it is being implemented, is intended for the next few days, or has already started and needs an honest completion/cancellation decision. **A folder in open is not necessarily Ready or automatically commissioned.** The one global default selector is [work/QUEUE.md](../../QUEUE.md); explicit owner commissions can exist separately.

[Backlog by domain](../backlog/README.md) · [Change catalog](../README.md) · [Terminal archive](../archive/README.md) · [Storyteller undertaking](../../undertakings/storyteller-workshop/OVERVIEW.md)

## Current / immediate work

**2026-11-23 source-only commissions:** [TURN03-R2C scripted player-smoke composition](../archive/2026-11/storyteller/2026-11-23--turn03-r2c-scripted-smoke-composition/CHANGE.md) is archived Done at injected-trace tier, 9/9. [TURN03-R2D](../archive/2026-11/storyteller/2026-11-23--turn03-r2d-causal-sql-observer/CHANGE.md) is archived Done at injected-query tier, 6/6. Neither produces cross-Pod PASS. R2A and R2B remain archived Done at source-only tier. Parent TURN03 and its real operator stay OPEN.


**2026-11-23:** [TURN03-R2A secure HTTP transport](../archive/2026-11/storyteller/2026-11-23--turn03-r2a-secure-http-transport/CHANGE.md) is Done as an injected fake-fetch check. It is not a live login or cross-Pod PASS. [TURN03-R2B pinned fixture verifier](../archive/2026-11/storyteller/2026-11-23--turn03-r2b-pinned-fixture-verifier/CHANGE.md) is Done as an injected read-only check. [TURN03-R2D causal SQL observer](../archive/2026-11/storyteller/2026-11-23--turn03-r2d-causal-sql-observer/CHANGE.md) is Done as an injected read-only query check, 6/6. It is not a live database read or cross-Pod PASS. Parent [TURN03](2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) stays OPEN.


| Change | Why it remains open |
| --- | --- |
| [DXK09 isolated parallel development stacks](2026-11-22--dxk09-isolated-parallel-development-stacks/CHANGE.md) | Promoted near-term; source-mapped but **planner-held** until tenant provisioning and auth route are fully specified. No Cursor implementation yet. |
| [WR10 private Writer protocol](2026-11-22--wr10-private-writer-round-protocol/CHANGE.md) | Commissioned wave / GA–Worker provider boundary |
| [MA12 API Lab isolation](2026-11-22--ma12-production-api-lab-isolation/CHANGE.md) | Commissioned wave / production API workspace closure |
| [TURN03 cold distributed game proof](2026-11-19--turn03-full-distributed-forkable-turn-proof/CHANGE.md) | Commissioned proof, true cold-kind gates unresolved |
| [K8S10 bounded fault proof](2026-11-19--k8s10-distributed-fault-and-load-harness/CHANGE.md) | Immediate dependent on TURN03; real one-Pod mutation still separately authorized |
| [CL01 terminal player](2026-11-22--cl01-terminal-player-client/CHANGE.md) | Next-wave dependent on MA12 source rebase |

## Existing incomplete or terminal-reconciliation obligations

| Change | Why NOT moved to backlog/archive blindly |
| --- | --- |
| [DIST03 Game Authority seam](2026-11-19--dist03-game-authority-private-boundary/CHANGE.md) | Partly implemented, outstanding acceptance/closure decision |
| [K8S11 live Next/Nest edge](2026-11-19--k8s11-next-nest-live-edge-integration/CHANGE.md) | Focused tests landed, live proof still NOT RUN |
| [WR05 umbrella publication](2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | Superseded by smaller Done slices; requires genuine terminal reconciliation rather than false Done |
| [WR09 umbrella Writer runtime](2026-11-21--wr09-provider-ready-writer-runtime/CHANGE.md) | Split into successor implementations, original scope not proven complete; needs reconciliation |

**Promotion:** a future [backlog](../backlog/README.md) Change moves here only after an actual near-term commission and updated source/dependency/readiness review. **Retirement:** only verified Done/Cancelled moves to [archive](../archive/README.md) with required evidence/ledger. Do not keep a permanent queue of speculative ideas here, and do not delete or auto-archive a partially executed folder just to make this page short.

- [LIB08 bounded local object reads](../archive/2026-11/platform-operations/2026-11-24--lib08-local-object-bounded-read/CHANGE.md): Done, source-only.
