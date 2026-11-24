# Domain ownership | retirement of horizontal contracts

**Final-wave conditional commission (2026-11-24):** Owner commissioned DO06 and DO07 now. DO06 may execute after DO05 integrates (DO03 already integrated); DO04 need not land first. DO07 may execute only after all six extractions integrate and no live residual module remains. Each assigned parent checks predecessor receipts and exact source/export postconditions on latest undertaking HEAD before editing; if they pass, no further ChatGPT release or approval is needed. Genuine semantic contradictions remain stop conditions. Coordinate joins with DO04 wave B custodian while active; otherwise the sole remaining parent owns its join. No global queue change, no new proof or completion credit.

**Wave B release (2026-11-24):** DO01–DO05 integrated source-only. DO04 was the wave B custodian. Wave B is joined. Separate linked worktrees, local lockfiles, no independent undertaking pushes. Shared files: residual contracts manifest, lockfile, ESLint config, graph rules and shared docs; merge by owned keys/rules, regenerate lockfile and run combined affected proofs. No mapped direct consumer file overlap. DO05 must remove its two remaining Storyteller old imports and manifest dependency before adding the transitional reverse edge from residual evaluation. DO04 owns private protocol guard; DO05 owns narrow residual evaluation exception. DO06 and DO07 are conditionally commissioned; their execution gates are DO05 and all six respectively. No cluster, provider, DB mutation, Documents or CACHE scope.

Owner decision 2026-11-24: no `@offscreen/contracts` workspace in end state. Target integration `undertaking/storyteller-workshop`. Baseline archive `ed0837d0531be4050b40d9b2485b5759ef479fea`; no current Git checkout, no tests run. LIB07 and LIB05 integrated; owner admitted DO01–DO03 after source refresh at `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e`. No edits to Documents or object-storage here. Existing Workshop overview ~40% overall / ~60% remaining, architecture/dev ~70% (subjective), no implementation credit. This program extends existing MONOREPO-MODULE-OWNERSHIP design, not MA06/MA09 runtime extraction. Existing queue unchanged. Owner explicitly placed DO01–DO07 in open as near-term work, not execution authorization. Live branch placement check at `7e2b554fbaaede28cbdbbf536c44c44a9ac511e5`; source maps retain their immutable inspected baseline.

## Target dependency law

- Player interface -> game and `@offscreen/documents/schema`, plus Zod. No direct storage/backend/provider imports. Existing Documents→object-storage manifest edge is baseline, not a newly introduced dependency. Admin, Identity, Usage and cache-port leaves independently owned; no cross-domain utility dependency.
- Authority protocol -> story-interface; server-only. Storyteller -> story-interface/usage-policy/game, never engine. Story Engine -> story-interface/usage-policy/cache-port/Storyteller/db/settled Documents. Admin implementation -> admin-interface and campaign hold model/db as currently required, not Story Engine for types. Lab interface -> story-interface/game; Lab support -> lab-interface/Story Engine/Storyteller as needed. Outer hosts compose. No new service or database.
- Public wire leaf naming is domain-specific; do not make new generic shared package. Keep internal types local and enforce exact import boundaries, including type-only. Retain existing restrictions and no new cycles.
- Documents contract: `@offscreen/documents/schema` still exports startPackageReferenceSchema, worldPackageReferenceSchema and StartPackageReference at the refreshed baseline. No document/storage scope.

## Parallel program

| Change | Dependency | Status |
| --- | --- | --- |
| [DO01 Cache port](../../../changes/archive/2026-11/platform-operations/2026-11-24--do01-cache-port/CHANGE.md) | None | Done, source-only |
| [DO02 Admin / identity / usage](../../../changes/archive/2026-11/platform-operations/2026-11-24--do02-admin-identity-usage/CHANGE.md) | None | Done, source-only |
| [DO03 Story interface](../../../changes/archive/2026-11/platform-operations/2026-11-24--do03-story-interface/CHANGE.md) | Documents settled | Done, source-only |
| [DO04 Authority protocol](../../../changes/archive/2026-11/platform-operations/2026-11-24--do04-authority-protocol/CHANGE.md) | DO03 | Done, source-only |
| [DO05 Storyteller / engine](../../../changes/archive/2026-11/platform-operations/2026-11-24--do05-storyteller-engine-ownership/CHANGE.md) | DO02 + DO03 | Done, source-only |
| [DO06 Lab ownership](../../../changes/open/2026-11-24--do06-lab-ownership/CHANGE.md) | DO03 + DO05 | Commissioned / Ready after DO05 |
| [DO07 Retire contracts](../../../changes/open/2026-11-24--do07-retire-contracts/CHANGE.md) | DO01–DO06 | Commissioned / Ready after all six |

[Coordination and serialized join rules](DO-PARALLEL-EXECUTION.md). Wave A runs three parents at once; DO04 follows DO03; DO05 follows DO02 and DO03 because residual evaluation imports would otherwise create a contracts↔Storyteller cycle. DO06 follows DO03 and DO05. DO07 is the final join. No implicit successor commission outside the expressly commissioned DO06/07 scope.

## Ownership map

| Former module | Destination | Import |
|---|---|---|
| `read-cache` | `packages/cache-port/src/read-cache.ts` | `@offscreen/cache-port/read-cache` |
| `admin` | `packages/admin-interface/src/admin.ts` | `@offscreen/admin-interface/admin` |
| `terminal-auth` | `packages/identity-interface/src/terminal-auth.ts` | `@offscreen/identity-interface/terminal-auth` |
| `usage-policy` | `packages/usage-policy/src/usage-policy.ts` | `@offscreen/usage-policy/usage-policy` |
| `stories` | `packages/story-interface/src/stories.ts` | `@offscreen/story-interface/stories` |
| `campaign` | `packages/story-interface/src/campaign.ts` | `@offscreen/story-interface/campaign` |
| `interactions` | `packages/story-interface/src/interactions.ts` | `@offscreen/story-interface/interactions` |
| `drafts` | `packages/story-interface/src/drafts.ts` | `@offscreen/story-interface/drafts` |
| `openings` | `packages/story-interface/src/openings.ts` | `@offscreen/story-interface/openings` |
| `story-launch` | `packages/story-interface/src/story-launch.ts` | `@offscreen/story-interface/story-launch` |
| `storytellers` | `packages/story-interface/src/storytellers.ts` | `@offscreen/story-interface/storytellers` |
| `campaign-holds` | `packages/story-interface/src/campaign-holds.ts` | `@offscreen/story-interface/campaign-holds` |
| `game-authority` | `packages/game-authority-protocol/src/game-authority.ts` | `@offscreen/game-authority-protocol/game-authority` |
| `storyteller-task-custody` | `packages/game-authority-protocol/src/storyteller-task-custody.ts` | `@offscreen/game-authority-protocol/storyteller-task-custody` |
| `writer-round-private-custody` | `packages/game-authority-protocol/src/writer-round-private-custody.ts` | `@offscreen/game-authority-protocol/writer-round-private-custody` |
| `writer-scene-round-control` | `packages/game-authority-protocol/src/writer-scene-round-control.ts` | `@offscreen/game-authority-protocol/writer-scene-round-control` |
| `story-retrieval` | `packages/storyteller/src/context/story-retrieval.ts` | `@offscreen/storyteller/context/story-retrieval` |
| `creative-exploration` | `packages/storyteller/src/context/creative-exploration.ts` | `@offscreen/storyteller/context/creative-exploration` |
| `storyteller-kinds` | `packages/story-engine/src/generations/storyteller-kinds.ts` | `relative internal` |
| `storyteller-notices` | `packages/story-engine/src/generations/storyteller-notices.ts` | `relative internal` |
| `current-authority` | `packages/story-engine/src/storyteller/dispatch-authority-policy.ts` | `relative internal` |
| `chamber` | `packages/lab-interface/src/chamber.ts` | `@offscreen/lab-interface/chamber` |
| `qa` | `packages/lab-interface/src/qa.ts` | `@offscreen/lab-interface/qa` |
| `chamber-lab` | `packages/lab-support/src/interfaces/chamber-lab.ts` | `relative internal` |
| `live-evaluation` | `packages/lab-support/src/interfaces/live-evaluation.ts` | `@offscreen/lab-support/interfaces/live-evaluation` |
| `memory-evaluation` | `packages/lab-support/src/interfaces/memory-evaluation.ts` | `relative internal` |
| `creative-exploration-evaluation` | `packages/lab-support/src/interfaces/creative-exploration-evaluation.ts` | `relative internal` |

## Admission review

At `f28085e3e5cbf15bb32f430bd3b0b833f7429c6e`, comparison from the inspected snapshot returned 142 changed paths; no original contracts module changed. DO01 and DO02 mapped consumers unchanged; DO03 five changed consumers rechecked, imports retained. Owner released DO01–DO03; target ownership law ratified in [technical topology](../../../../docs/technical/platform/topology.md#code-organization). Shared-file overlap is explicitly controlled by separate worktrees and serialized joins. Local branch guard and worktree inspection remain required; implementation tests NOT RUN. DO04–DO07 remain dependency-gated, not commissioned. See [parallel coordination](DO-PARALLEL-EXECUTION.md) for source-refresh receipt and exact merge ownership.
