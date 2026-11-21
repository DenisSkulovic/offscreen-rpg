# WR07N | Source and readiness proof

Inspected `writerMissionCaptureV2OpeningSchema`, `writerRoundDecisionSchema`, `writerSceneProposalSchema` in `packages/storyteller/src/tasks/writer-mission.ts` after WR07M. `writer-loop.ts` calls `acceptWriterSceneProposal` with `WriterSceneProposal`; WR07N **only changes pure package**, so the downstream Story Engine acceptance adapter will require a follow-up version-aware narrow edit in WR07 backend (not delegated to this contract child). `writer-round-request.ts` derives output schema using Zod, no hardcoded provider schema. Original Writer tests and v1 round hash oracle present. Source inspection only, no tests run by planner.

G0 PASS: WR07M integrated, owner commissioned new contract.
G1 PASS: exact source, existing test, incoming and outgoing types inspected.
G2 PASS: v1 unchanged, v2 requires playable content and capture-version match, no provider budget changes.
G3 PASS: T01 contract, T02 authorization of output shape, T03 focused proof, each 2–3 direct anchors.
G4 PASS: first dispatch T01, no OpenAI/Cursor architectural investigation.
G5 PASS: WR05P2 owns Documents+Engine, WR07N owns pure Storyteller tasks/test. Shared docs merge serial.
G6 Specified, runtime UNRUN: valid v2 scene, mixed-version denial, invalid content/choices, v1 replay hash, build.
G7 PASS: no new package, DB, outbox, provider or stubs.
**Verdict: READY / OWNER-COMMISSIONED**. A downstream TypeScript consumer that exhaustively branches on proposal.version and fails typecheck needs a narrow union narrowing/call-site fix, but no behavioral redesign. Such a genuinely required compile adjustment may be coordinated in WR07N before acceptance without changing existing spending/publication behavior.
