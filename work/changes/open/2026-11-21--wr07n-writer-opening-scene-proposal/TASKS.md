# WR07N | Three bounded tasks

**READY.** Start `change/wr07n-writer-opening-proposal` linked worktree from *live* `undertaking/storyteller-workshop` HEAD. One parent, serial T01→T02→T03. Composer Standard. No other package source writes.

### T01 | Versioned final proposal with real scene body (PATCH)
Read/write `packages/storyteller/src/tasks/writer-mission.ts:writerSceneProposalSchema,writerRoundDecisionSchema`, read `packages/contracts/src/{stories,interactions}.ts:passageContentSchema,interactionSpecificationSchema`; write focused `packages/storyteller/test/writer-mission.test.ts` fixtures. Preserve old v1 final fields and duplicate hash/source citation refinements exactly. Add v2 final with required `scene:{content,interaction}` and version-2 literal. Preserve strictness and all bounds. Prove valid original-world scene+choice, v1 acceptance, no required character, v2 missing/invalid content/duplicate choices rejected. No source/cost permission inference.

### T02 | Capture-scoped validation and wire output (PATCH)
Read/write `packages/storyteller/src/tasks/writer-mission.ts:validateWriterRoundDecisionForCapture` and `writer-round-request.ts:writerRoundOutputJsonSchema` only if Zod JSON schema inference needs adjustment. Do not edit `writer-loop.ts` owned by engine. Reject mixed capture/proposal versions, preserve all tool/budget checks and old `writer-round.v1` JSON/oracle hash. Prove opening capture → v2 opening scene; old capture → v1; crossed pairs denied. Output JSON includes exact scene content schema. Do not add new provider transport.

### T03 | Focused build, tests and closure (VERIFY/PATCH)
`pnpm --filter @offscreen/storyteller build`, `pnpm --filter @offscreen/storyteller test`, focused lint/format; verify no old receipt schema changed. Archive, update ledger/docs, squash-integrate to undertaking with serial merge, delete clean worktree and Change branch. No main or provider spend.
