# AD05 | Permission-safe campaign and AI operation drilldown

**State: Proposed, NOT Ready.** Code-bearing redacted diagnostics. **Depends on:** AD02–AD04; source API reads can be developed after AD03. **Parent:** [Admin program](../../admin/implementation-program.md).

## Cursor first-screen

> **Outcome:** permitted staff can follow Player 360 → legacy-owned campaign → actual generation/attempt/publication status, with meaningful source coverage, without receiving raw private narration, model prompts or noncommitted proposals.
>
> **Authority:** [Game forensics](../../admin/gameplay-worlds-product.md), [AI operations](../../admin/ai-engineering-operations-product.md), [V1 DTO](../../admin/technical/core-v1-contracts.md), [read/source policy](../../admin/technical/read-models-and-privacy.md).
>
> **Start/revalidate:** `packages/db/src/schema/{stories,campaign,generations,storyteller}.ts`, `packages/application/src/stories/{reads,public-events}.ts`, `apps/api/src/modules/stories/controller.ts`, and AD03 Admin app/API. For UI use the AD04 Admin feature map, not ordinary player Play.
>
> **Do not:** read source document bytes for summary, expose `generation.input/output`, invoke Chamber developer mode, add model calls, modify story mechanics, or infer that a model attempt equals a committed passage.

## Intended code delta

1. Create strict V1 campaign metadata and redacted operation response schemas with safe status/coverage. Current `story.ownerId` is explicitly a legacy ownership relation, **not** multiplayer membership/payer.
2. Add bounded Admin application read functions: `GET /api/admin/players/:id/campaigns`, `GET /api/admin/campaigns/:id/operations`, and `GET /api/admin/operations/:id` with independent staff resource/sensitivity scope checks.
3. Correlate legitimate story/campaign revision, known pending/settled action status, generation/attempt/publication state and source timing where supported. Label `unknown` or `since-enabled` when coverage is incomplete.
4. Add a small drilldown from Player 360 with links and explicit unknown/denied/failed states. Keep saved/linked IDs permission-aware.
5. Tests confirm no private prompt/document/passage/hidden plan content in source or response, no cross-owner discovery and no game writes/provider dispatch on GET.

## Normal and discriminating negative

**Normal:** staff with named campaign scope opens metadata and a generation that has an evidenced `running` or `failed` status; UI shows task versus publication status and original account/campaign identity without confusing them.

**Negative:** an unrelated campaign, raw prompt JSON, canonical source bytes, other participant's private passages, uncommitted generated prose and secret Storyteller strategy remain unavailable. Model `succeeded` without published passage does not appear as published. Unknown source coverage does not become a fabricated full history.

**Proof:** Zod schema and projection unit tests; disposable DB/Nest dual-account tests; browser drilldown with revocation mid-navigation. Explicit zero provider calls and zero state writes.

## Excluded / risk

No full historical repair browser, fake autonomous agent trace, live model simulation, pricing tier data, internal generation replays or player write impersonation. The model source may have sensitive JSON; use an explicit field allowlist, **not** regex redaction after serialization.

**Ready gate:** AD03/04 completed, source state rechecked, owner selects; no broad source access or costs. **Return:** source refs, negative JSON tests, actual database/API/browser evidence, no external spend.
