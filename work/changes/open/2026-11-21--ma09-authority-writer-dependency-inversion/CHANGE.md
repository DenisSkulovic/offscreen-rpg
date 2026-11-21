# MA09 | Authority → Writer dependency inversion without moving transaction boundaries

**State: PLANNED, CONDITIONAL ON WR09 INTERFACES; NOT YET DISPATCHABLE.** This is a complete source/transaction algorithm and task packet for the accepted logical boundary, with a hard integration trigger: WR09's final captured Writer mission APIs must be stable before executing T01–T05. Baseline original code `e122d080`, MA07 `4168db58`; integration `undertaking/storyteller-workshop`. It is a deliberately **one substantial Change**, not an open-ended redesign.

## Selected architectural rule

Story Authority (`story-engine/src/stories` and `campaign`) owns authoritative story clock, holds, game actions, receipts, publication, root/permission fences, and the existing transaction. Writer runtime (`story-engine/src/storyteller`) owns context preparation, provisional generation, materialization and mission scheduling. **Writer capture called inside an existing SQL transaction remains inside that exact transaction**, but through a host-composed callback. No after-commit best-effort substitute, no default global singleton, no extra outbox path, no new DB schema and no new paid provider request.

Define two narrow **structural collaborator contracts** in Story Engine:
- `stories/storyteller-resolution-contract.ts` already owns `PrepareStorytellerResolution`; make `createStoryResolution` accept an explicit function dependency. `createStoryResolutionCore` already has the port and must remain unchanged except caller wiring. Writer implementation `storyteller/admission.ts:prepareStorytellerResolution` remains the adapter; the engine's outer `stories/index.ts:createStories` binds it.
- `campaign/writer-capture-port.ts` owns `CampaignWriterCapturePort` with typed methods for: pending action narration, committed action narration, activity consequence, world obligation consequence, interrupted action consequence, pending capture materialization, historical report and writer-continuation scheduling. **Each callback accepts the SAME existing `Transaction`, `StoryRecord`, `CampaignRecord` and request/receipt arguments as the existing concrete function**; no `any`, no opaque serialized SQL, no new provider or ownership bypass. Writer implementation `storyteller/authority-writer-adapter.ts:createCampaignWriterCapturePort` imports the existing eight functions and delegates without semantic changes. Outer composition `stories/index.ts` supplies one immutable port instance to constructors and transactional workers. For direct internal exported helper callers and tests, pass the same port as an explicit final parameter; a missing port throws a narrow configuration error *before* state mutation.

## Must remove these actual backedges

1. `stories/resolution.ts` → `storyteller/admission.ts`.
2. `campaign/narration.ts` → `storyteller/context-capture.ts`, `storyteller/capture-materialization.ts`.
3. `campaign/reports.ts` → `storyteller/context-capture.ts`.
4. `campaign/narrative-intent-settlement.ts` → `storyteller/writer-continuation.ts`.
5. Preserve no-write-without-port; all transitive paths in `campaign/{actions,action-executions,activities,follow-up-intents,world-obligations}.ts` receive the port through existing service construction, not global fallback.

These are **authority/runtime edges only**; the `generations/scripted-openings.ts` → Storyteller relationships are outer generation orchestration and can be resolved by MA10 graph policy, not mechanically forced into this transactional Change.

## Failure and no-regression contract

On missing port: deny before mutation. Inside transaction: callback rejection rolls back action/receipt/hold/intent/version update as formerly; expected-root, owner, operation ID and generation ID unchanged. No capture/materialization CAS I/O introduced under lock. For callbacks already running after commit, preserve precisely their off-lock location and bounded replay behavior. Campaign consequence first captures generation and then writes its id under one lock; the historical report sourceKey uniqueness and generation relation are atomic; narrative-intent clock settlement and Writer continuation wake are one transaction. No two-stage best-effort materialization.

**Other Change interactions:** MA08 owns lab-support moves and manifests; do not run simultaneous implementation/edit of shared `story-engine/package.json`, worker tests or ledgers. WR09 may change `writer-continuation.ts` and mission capture. Freeze actual WR09 exported interfaces, then do this structural injection with no money-path changes. Full implementation remains blocked until that integration handoff; ChatGPT, not Cursor, reconciles any contract drift.

Source details [SOURCE-MAP](SOURCE-MAP.md) · settled behavior [EXECUTION](EXECUTION.md) · [TASKS](TASKS.md) · [PROOF](PROOF.md).
