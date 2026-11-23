# Domain ownership | retirement of horizontal contracts

Owner decision 2026-11-24: no `@offscreen/contracts` workspace in end state. Target integration `undertaking/storyteller-workshop`. Baseline archive `ed0837d0531be4050b40d9b2485b5759ef479fea`; no current Git checkout, no tests run. Documents redesign completes before execution readiness; no edits to Documents here. Existing Workshop overview ~40% overall / ~60% remaining, architecture/dev ~70% (subjective), no implementation credit. This program extends existing MONOREPO-MODULE-OWNERSHIP design, not MA06/MA09 runtime extraction. Existing queue unchanged. Owner explicitly placed DO01–DO07 in open as near-term work, not execution authorization. Live branch placement check at `7e2b554fbaaede28cbdbbf536c44c44a9ac511e5`; source maps retain their immutable inspected baseline.

## Target dependency law

- Player interface -> game and settled document model only, plus Zod. No storage/backend/provider. Admin, Identity, Usage and cache-port leaves independently owned; no cross-domain utility dependency.
- Authority protocol -> story-interface; server-only. Storyteller -> story-interface/usage-policy/game, never engine. Story Engine -> story-interface/usage-policy/cache-port/Storyteller/db/settled Documents. Admin implementation -> admin-interface and campaign hold model/db as currently required, not Story Engine for types. Lab interface -> story-interface/game; Lab support -> lab-interface/Story Engine/Storyteller as needed. Outer hosts compose. No new service or database.
- Public wire leaf naming is domain-specific; do not make new generic shared package. Keep internal types local and enforce exact import boundaries, including type-only. Retain existing restrictions and no new cycles.
- Documents contract: consume existing selected model, not AWS adapter. Post-Documents actual name is the single unresolved external input; ChatGPT maps imports before commission.

## Serial program

- [DO01 cache-port](../../../changes/open/2026-11-24--do01-cache-port/CHANGE.md)
- [DO02 admin-identity-usage](../../../changes/open/2026-11-24--do02-admin-identity-usage/CHANGE.md)
- [DO03 story-interface](../../../changes/open/2026-11-24--do03-story-interface/CHANGE.md)
- [DO04 authority-protocol](../../../changes/open/2026-11-24--do04-authority-protocol/CHANGE.md)
- [DO05 storyteller-engine-ownership](../../../changes/open/2026-11-24--do05-storyteller-engine-ownership/CHANGE.md)
- [DO06 lab-ownership](../../../changes/open/2026-11-24--do06-lab-ownership/CHANGE.md)
- [DO07 retire-contracts](../../../changes/open/2026-11-24--do07-retire-contracts/CHANGE.md)

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

G0 UNVERIFIED post-Documents HEAD/branch and actual live worktrees; G1 baseline module/consumer/test inventory complete for current 27 sources, not latest successor; G2 selected structural mapping above, Documents export binding pending; G3 task cards and generated caller maps exist, final line drift unverified; G4 parent sequence explicit but no commission; G5 serial, one manifest/lock owner; G6 planned proof, none executed; G7 archive/integration boundary explicit. Verdict: Proposed until ChatGPT verifies actual post-Documents HEAD, canonical docs, scope and graph. No paid executor architectural discovery.
