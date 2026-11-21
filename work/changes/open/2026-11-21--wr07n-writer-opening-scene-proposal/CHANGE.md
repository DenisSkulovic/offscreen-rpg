# WR07N | Validated Writer opening-scene proposal

**READY / OWNER-COMMISSIONED.** Target `undertaking/storyteller-workshop` (never `main`). Independent parallel partner to WR05P2. Kind: implementation, profile CONTRACT. Source inspected live after WR07M integrated/archived 2026-11-21. **Write-only ownership:** `packages/storyteller/src/tasks/{writer-mission,writer-round-request}.ts` and `packages/storyteller/test/writer-mission.test.ts`, plus packet documents. WR05P2 writes Documents/Story Engine and related tests, not these files. Integrations serialized; no provider spend.

## Why this must exist

`writerMissionCaptureV2OpeningSchema` now pins reserved story/passage IDs without fake history, but `writerSceneProposalSchema` only returns a summary, staged hashes and citations. None is a validated first-scene passage. A direct Play backend must **not** promote the summary or an arbitrary Workdesk document to playable scene text.

## Decided contract and API

- Preserve `writerSceneProposalSchema` **v1 unchanged** for old Writer missions/attempt receipts. Add `writerOpeningSceneProposalV2Schema` discriminated on `version:2`, retaining v1's `summary,stagedObjectHashes,sourceEvidence` and requiring `scene:{content: passageContentSchema, interaction: interactionSpecificationSchema.nullable()}`. Import the existing schemas from `@offscreen/contracts/{stories,interactions}`, already permitted by the Storyteller package dependencies.
- Export `writerSceneProposalSchema` as the **versioned union**? To preserve existing named v1 usage, instead export `writerSceneProposalV1Schema` for the unchanged old parser, export `writerOpeningSceneProposalV2Schema`, and export `writerSceneProposalSchema = z.discriminatedUnion('version',[v1,v2])`. Export inferred `WriterSceneProposal` union and narrow `WriterOpeningSceneProposal`. Do not silently switch parsing of saved v1 objects.
- `writerRoundDecisionSchema` accepts both versioned proposals in its `kind:'final'` branch; output JSON schema derived via `z.toJSONSchema` includes both. `validateWriterRoundDecisionForCapture(capture,decision)` enforces **v2 opening capture ⇒ v2 opening proposal** and **v1 capture ⇒ v1 proposal**; reject mixed versions with explicit error. Keep tool-call grants, bounded rounds and tools unchanged.
- The proposed opening scene is *candidate content only*. No SQL mutation, Game Authority permissions, model dispatch or billing authorization here. Later WR07 backend will validate source-root and accept only into a committed v2 first-scene publication with the two reserved identities. V1 writer proposal replay remains byte- and hash-identical.

## Implementation tasks and proof

[TASKS](TASKS.md). Positive: original v1 Writer mission and final proposal still parse, v2 opening capture accepts v2 scene with title/paragraphs and optional choice; v2 output visible in generated JSON schema; hash of old v1 request and old fixture unchanged. Negative: v2 opening with v1 final; v1 with v2 final; blank/oversized content, forged interaction option IDs, unknown keys, missing scene, ungranted tool call, malformed citation. Scripts: `pnpm --filter @offscreen/storyteller build`; `pnpm --filter @offscreen/storyteller test`; changed-file formatter/lint. No network/provider/SQL execution.

**Closure:** finish T01–T03, archive, ledger reconcile, squash-integrate into undertaking in coordination with WR05P2 custodian, retire clean worktree/branch. Stop only for a concrete source-incompatible v1-replay assertion or schema mismatch, not broad redesign.
