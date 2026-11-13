# ENG07 | A remembered promise reaches the actual final Storyteller request

**State:** Cancelled / superseded on 2026-11-13 after source review. **Kind:** evidence-use diagnostics/test harness (not required). **Authority:** [Storyteller and memory](../../engine-architecture/storyteller-and-memory.md), [verification strategy](../../engine-architecture/evidence/verification-strategy.md).

## Why cancelled

Existing provider-free tests already prove the packet’s technical outcome: a buried, source-linked promise is retrieved, packed, and present in the **actual serialized final-round provider request body**, with typed mandatory overflow and no private/dev false paths.

**Superseding evidence (ran):** `packages/application/test/long-story-memory-evaluation.test.mjs`

- Greywake 200-scene corpus materializes; lexical/search recall selects `relationships/mira-vale-favor.md` / patient-tide sources.
- Exact reads return bodies matching `/promised Mira Vale a quiet favor/` and `/still owes Mira Vale/`.
- `packMemoryExplorationEvidence` retains those strings and excludes developer-private false paths.
- `inspectMemoryExplorationProviderRequest(..., round: 2)` with `finalAnswerReserveRounds: 1` and `canRequestContext: false` asserts `transportPerformed === false`, byte budget hold, and `JSON.stringify(providerPreview.inspection.body.messages)` matches `/still owes Mira Vale/` — inclusion in the final serialized request, not only an intermediate pack.
- Related: packing mandatory-overflow, `validateMemoryEvidenceUse` required omissions, storyteller `old mandatory evidence survives recent-window selection, overflow holds`.

## What this Change would have added

A compass/Mara holder narrative specimen and extra request-audit correlation. That is a richer fixture, not a missing runtime gap. Do not duplicate the harness. A future Continuity evaluation corpus may reuse Greywake + ENG01 holder facts without reopening ENG07 as a code packet.

## Original brief (historical)

> One player promise buried hundreds of passages earlier is retrieved by identity/source, appears in the actual final serialized provider request, and omitted required sources are typed holds — not silent amnesia.
