# MA05 | mandatory future proof; no tests executed during planning

**Graph:** run `pnpm repo:module-graph --json` against post-MA04 + relevant WR HEAD. Demand zero forbidden `stories/campaign core → storyteller runtime` and `→ developer-tools` imports (including type-only where they defeat package separability), zero newly introduced runtime SCC; explicitly classify legitimate outer composition edges. Check new package edges if introduced later.

**Correctness matrix before readiness:** capture baseline test commands and exact fixtures:
- resolution replay: same operation + matching submission returns existing result/no extra generation/outbox; changed submission/revision refuses with conflict; race under SQL story lock deterministic;
- start: invalid candidate owner/draft revision and staged checkpoint state fail without committing a story; retry with same input remains idempotent;
- continuity notes: publish in caller's story transaction only, stale generation/notes/base rejected and no separate committed notes;
- historical report/action narration: no generation/task without its transactional campaign report/hold/outbox owner; failed capture rolls back;
- provisional capture: no second notice topic after promotion/replay, frozen durable topic selected under same tx;
- retry: stale owner, wrong retry identity/failed generation denied without double reserve or duplicate outbox;
- publication: stale source/document root, invalid receipt and fork revision denied without canonic story mutation;
- privacy/spend: owner denied paths remain privacy 404, no provider dispatch as an effect of package extraction.

**Build/proof:** API/GA/worker/application/compiler and changed-file quality tests; authorized disposable SQL integration for story start/resolution/retry/capture and publication; no live model/provider cost. Distinguish source assertion, test-pass and live DB/proof. A new typed callback that only makes the graph green is not sufficient if it moves a SQL transaction boundary.

**Current status:** major port contracts and exact test commands **not yet fixed**. This file records what must be proved, not permission to claim any PASS.
