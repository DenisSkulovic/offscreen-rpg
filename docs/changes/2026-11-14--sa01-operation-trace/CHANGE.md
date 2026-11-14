# SA01 | One redacted Storyteller operation trace from cause to publication

**State: Proposed / design-complete 2026-11-14. No code authorization.** **Program:** [SA queue](../../storyteller-architecture/implementation-program.md). **Why first:** absent a complete causal trace, we cannot know whether bad prose came from missing evidence, omitted final context, invalid output, a rejected plan or a model choice. This is an observable instrumentation/test-code Change, **not** evaluation-only paperwork.

## Cursor first-screen brief

> **Outcome:** a provider-free test/run can emit **one redacted, versioned, source-linked trace** from admitted game cause to captured task, actual final provider packet, optional tool rounds, validator, publication and funding/latency state, with explicit absent/not-run fields.
>
> **Authority:** [code trace](../../storyteller-architecture/evidence/current-flow-audit-2026-11-14.md), [evidence pipeline](../../storyteller-architecture/context-and-retrieval.md#end-to-end-retrieval-contract-and-proof), [evaluation levels](../../storyteller-architecture/evaluation-and-playability.md).
>
> **Source:** `packages/application/src/storyteller/execution.ts::createStorytellerExecution`, `memory-exploration-controller.ts::runMemoryExploration`, `packages/storyteller/src/providers/openrouter.ts::inspectOpenRouterRequest`, `application/storyteller/publication.ts::publishStorytellerResult`, existing `scripts/repo-tools/storyteller-request-audit.mjs` and nearest `packet-lab` tests. Read current source before editing.

## Intended delta

1. Define a compact private `storyteller-operation-trace.v1` record with parent `storyId`, source revision/root, purpose, generation/operation/attempt identities, captured prompt/recipe/route versions and state transitions. Span IDs connect nested source-selection, context-pack, provider round, validation, publication, retry and cost.
2. Include measured **actual** request and per-section serialized bytes/hashes, required/selected/omitted/final-included source handles, real read counts/bytes and time. `inputTokens`, `cacheHit`, actual charge or provider duration must be **null/not-run** unless externally reported. Correlate settled microusd and uncertain reservation with original operation, no invented zeros.
3. Reuse the current request-inspection and dispatch-review facilities; do **not** build a parallel token ledger or log full raw prompts to console. Allow a private opt-in raw artifact only through established guarded developer evidence storage.
4. Fixture-backed reports for **opening**, **ordinary consequence**, **memory exploration** (request→read→final), **historical report**, **failed/uncertain** and **stale publication**; distinguish simulated from real provider.
5. Stable redacted JSON output plus concise Markdown receipt with causal missing-stage reason. No new global telemetry framework or public endpoint.

## Acceptance and negatives

**Normal:** one deterministic memory fixture yields a trace linking source `S` to final packet and valid publication. One ordinary single-shot yields 0 reads. An interrupted generation has no fake published scene.

**Negative:** a source was loaded then omitted from final packet => trace says omitted; duplicate delivery doesn't invent new paid round; no prompt/source body leaks into service log; story B can't appear in story A's trace; missing provider usage stays unknown; no cache discount inferred from common prefix.

**Proof:** `pnpm storyteller:packet-audit`; nearest targeted application/test and `pnpm --filter @offscreen/storyteller build` with unit tests, entirely provider-free. Use explicit disposable SQL permission **only** if testing persisted generator/outbox state requires it; otherwise mocks. Never run actual model, production DB, cloud or destructive reset.

**Out:** Storyteller policy rewrite, new tool, long-memory index, new asset, account/billing UI, ENG03 lock refactor. **Exit:** exact trace JSON/schema, redaction negative, user-readable evidence/sample and list of actual unknowns. Stop for owner critique before SA02.
