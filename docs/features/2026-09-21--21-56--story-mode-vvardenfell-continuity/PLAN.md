# Implementation plan

Feature: [Story mode Vvardenfell continuity](FEATURE.md).
Execution scope: the approved local Story, maintained-start and continuity phases. The current route is S3; inspecting old sessions does not authorize another provider call.
Implementation owner: Codex for the owner-requested implementation; one owner per slice.

## Phases

### S1 — Honest local Story mode — implemented

Loopback Story mode uses ordinary player pages/APIs, fixed local identity and dedicated persistent database/document storage without Chamber controllers or OAuth setup. Headless commands support explicit creation, selection, observation and retry. Model execution policy is independent; mutating play commands require explicit live confirmation.

### S2 — Maintained Vvardenfell start library — implemented

The pinned world/start/rule packages include immediate geography, Sellus/Socucius identities, release thread and private direction. Generic application code consumes those documents and the mechanical seed without scenario-name branches. Start creates an inspectable campaign root.

### S3 — Progressive entity continuity — current

The intended boundary remains mention → registered identity → continuity-relevant state → mechanically active state. Materialize only what future correctness needs, with source-linked changes admitted atomically with passages. The microbe/abstract benchmark must remain valid without people, geography or social state.

**Ready slice: canonical dependencies on mechanical plans.**

1. Extend the private plan/result contract with a bounded dependency sidecar analogous to narrative-choice references. Accept captured existing document handles and same-result document-change indices.
2. At publication, validate and resolve those references to stable story-scoped document IDs. Never persist task-local handles as durable identity. Reject unknown handles and stale/unresolved change indices.
3. Carry the selected action's dependencies into consequence admission; load exact current document versions under existing caps and expose omissions/failure honestly. Empty dependencies remain valid.
4. Exercise a source-linked identity/relationship/thread change, a later dependent mechanical action and its captured consequence. Then drive the maintained Socucius interaction through unrelated play, departure and return.

| Boundary | Inspect first | Why |
| --- | --- | --- |
| Existing narrative handoff | Application `stories/resolution.ts`, Storyteller `tasks/index.ts` | Reuse the established handle/change-reference semantics, not a second scheme |
| Mechanical plan shape/admission | Game `immediate-actions.ts`, Storyteller `tasks/index.ts` and `tasks/document-changes.ts` | Separate provider proposal from persisted identity and mechanical authority |
| Atomic publication | Application `storyteller/publication.ts`, `campaign/persistence.ts` | Resolve same-result identities with the root/passage commit |
| Selection → consequence | Application `campaign/actions.ts`, `campaign/narration.ts`, `storyteller/context.ts` | Transfer selected dependencies and load current canonical bodies |
| Connected evidence | Existing ordinary story/API harness, [QA journeys](../../engineering/qa-journeys.md) | Prove the application path without direct state mutation or paid generation |

Use [canonical files](../../technical/canonical-files.md), [runtime](../../technical/storyteller-runtime.md) and [memory/retrieval](../../engineering/long-story-memory-and-retrieval.md) as the design owners. Update the relevant contracts before implementing the sidecar.

Exit evidence: the later exact task contains the updated record, unknown/unresolved references fail admission, empty social-free dependencies work, and a leave/return flow uses current state instead of merely the still-active transcript. This enables dependency carriage; it does not infer biographies from every noun. Required controlling state must be supplied or fail closed, not silently dropped as optional texture. Remaining promotion/state requirements in FEATURE still apply after the sidecar lands.

### S4 — Connected play and evidence — waiting on S3

Drive at least five turns through ordinary commands with selected choices, mechanics, elapsed time, canonical change and later recall. Scripted evidence establishes wiring only. After structural evidence, separately admitted live play resumes the [10–15-turn POC proof](../../engineering/connected-poc-proof.md), with per-attempt reconciliation and no silent scripted fallback.

The fixed-second implementation's remaining live acceptance is owned here: exercise meaningful timed work and continuation under one captured profile and a legitimate contrasting profile, preserving exact duration/reward authority. Owner enjoyment and profile adherence remain unproved; consolidating the completed timing implementation does not waive them. Compare bounded exploration only when a turn actually lacks useful evidence.

Keep the compact evidence ledger in the permanent proof/QA owners. When all scoped acceptance is met, fold durable limits into permanent docs and remove this folder.

## Current checkpoint

- **Phase:** S3. Next implement the bounded mechanical-plan canonical dependency sidecar described above; no provider call is needed.
- **Source:** Gameplay baseline `fc00d13` (2026-09-24), reoriented on 2026-10-23 by source/trajectory inspection only. This maintenance pass changes documentation/navigation, not gameplay.
- **Evidence:** [Latest v16 proof](../../engineering/connected-poc-proof.md#latest-evidence--2026-09-24) records correct 1,800-second work, one six-septim payment and coherent clerk exchanges, but no durable clerk/mystery record before scene restart.
- **Acceptance:** publication resolves captured handles/change indices to stable IDs; action selection loads their exact current versions; invalid references reject; empty dependencies work for abstract play. Then prove Socucius interaction → unrelated play → departure/return. Sidecar success alone does not complete progressive materialization.
- **Verification:** existing September runtime results are historical. October rediscovery inspected source and saved JSONL; no gameplay tests, server, database reset or provider dispatch. Use focused provider-free evidence if needed under optional-check policy.
- **Blocker:** no external blocker to S3; sustained live acceptance depends on durable continuity. Do not resume prompt/profile iteration to work around missing state.
- **Spend:** no calls in rediscovery. Historical charges/balances belong to the dated evidence owner; current external balance is unverified.
