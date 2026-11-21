# WR02–WR08 | Composer handoff readiness audit (2026-11-21)

**Integration:** `undertaking/storyteller-workshop`; `main` untouched. **Source checked:** current committed tree at `f2e0b237` before planning docs; user-reported local Cursor WR02 changes are **not** visible/inspected. **Evidence tier:** real code-symbol and contract inspection + GitHub Markdown commits; **NO runtime tests executed**. **Readiness meaning:** `PLANNER-READY` means task algorithm is specified against documented/inspected baseline, not implementation complete, dependency satisfied, environment granted, or automatic Change selection. No task authorizes billable providers or non-disposable DB/cluster.

## Per-packet gate and low-investigation handoff

| Change | Packet contents | Handoff/selection | Specific verified seam & dependency guard |
|---|---|---|---|
| [WR02](open/2026-11-21--wr02-persistent-library-and-source-identity/CHANGE.md) | 8 Composer tasks + source/algorithm/proof | **Selected.** T01 is first task after dirty-worktree/source check | v1 `documentManifestSchema` whole arrays, `documents.ts:admit` SQL root fence, `forks.ts:writeBranchManifest` copy; selected paired trie in EXECUTION |
| [WR03](open/2026-11-21--wr03-agentic-writers-workdesk/CHANGE.md) | 7 tasks + companions | Proposed, AFTER WR02 | `execution.ts:createStorytellerExecution` custody; `memory-exploration-controller.ts`; OpenRouter `prepareOpenRouterWire` strict JSON decision transport; WR03 creates named mission/step tables |
| [WR04](open/2026-11-21--wr04-delegated-writer-research/CHANGE.md) | 5 tasks + companions | Proposed, AFTER WR03 | Child context uses same WR03 step ledger with distinct context ID; finite reservation under parent's `storytellerOperation`, not new money pool |
| [WR05](open/2026-11-21--wr05-coherent-scene-publication/CHANGE.md) | 6 tasks + companions | Proposed, AFTER WR02+WR03; serialize GA owners | v1 quiescent schema; `continuation.ts` stages before `publishStorytellerNotes` mutation; v2 post-state complete projection and SQL selector |
| [WR06](open/2026-11-21--wr06-fork-active-fictional-state/CHANGE.md) | 6 tasks + companions | Proposed, AFTER WR05 | current fork refuses active work, then initializes empty fields; explicit child campaign/offer/activity/obligation and id mapping |
| [WR07](open/2026-11-21--wr07-one-prompt-launch-backend/CHANGE.md) | 6 tasks + companions | Proposed, AFTER WR03+WR05 | current candidate Start uses `StoriesController`; embedded/distributed `StorySeam` and `apps/game-authority/src/server.ts:routeFor` both require new launch/status paths |
| [WR08](open/2026-11-21--wr08-one-prompt-client-and-integrated-acceptance/CHANGE.md) | 7 tasks + companions | Proposed, AFTER WR04+WR06+WR07 | current `/stories/new` renders `DraftEditor`; `useStartStory` talks to old candidate Start; new launch hook/query key and as-of history are defined |

**Total:** 45 narrow T-ID instructions. Each T-ID names a code delta, initial files, algorithm, test, diagnostic negative, stop and evidence receipt. Some future T-IDs cannot execute until predecessor APIs exist; that is a **ChatGPT source refresh gate**, not permission for Cursor to design.

## Parent's only first dispatch

1. Check local `git status --short`, branch ancestry and in-flight Cursor implementation. Fetch latest `undertaking/storyteller-workshop`; incorporate planning additions into the existing WR02 worktree **without discarding edits**. No forced reset.
2. Read [WR02/TASKS.md](open/2026-11-21--wr02-persistent-library-and-source-identity/TASKS.md#t01--define-canonical-v2-rootnode-schemas--planner-ready) and [WR02/EXECUTION.md](open/2026-11-21--wr02-persistent-library-and-source-identity/EXECUTION.md). Dispatch **only WR02 T01** with Composer 2.5 Standard. T02 only after T01 proof and parent checkpoint.
3. Treat any **unplanned architecture question** as `STOP -> file:symbol, assumption, reproduction, missing decision -> ChatGPT`. No broad repo scan, model upgrade, arbitrary design or hidden regression waiver.
4. On bounded batch proof, integrate/reconcile into undertaking branch (not main), update actual STATUS/docs, archive only on accepted full Change, and stop before next independently selected Change.

## What remains unproved

- No new v2 trie, Workdesk loop, child agent, active-world checkpoint/fork, Launch backend/UI has been implemented or runtime-tested by these *planning* commits.
- Future WR03/WR05 implementation may expose different actual exports/migrations than planned. ChatGPT checks those differences **before** releasing dependent tasks. A generic executor is not tasked with resolving cross-service architecture.
- GitHub-linked source inspection does not see local uncommitted Cursor work. Do not label physical code readiness from the documentation alone.
- All runtime test command examples in PROOF are **plans**, not PASS claims.

**Policy:** [CHATGPT.md](../../CHATGPT.md) · [Composer standard](../../.agents/references/composer-first-execution.md) · [Planner investigation standard](../../.agents/references/planner-investigation-standard.md).
