# SA12 | Owner-controlled live Storyteller comparison tooling and full POC evidence

**State: Proposed / needs explicit owner approval for actual paid runs, 2026-11-14.** Dependencies SA11 provider-free baseline, SA01 trace, pinned route/cost policy. This Change's **code-bearing tooling** can be implemented with zero provider calls first; live evaluation is a separately authorized step, not automatic.

## Cursor first-screen brief

> **Outcome:** a small reusable evaluator can compare two versions of a frozen task/profile/prompt/retrieval policy under exactly one explicit model, source and funding envelope, report actual accepted output/evidence-use/cost/latency, and let the owner judge whether a real multi-turn campaign is worth continuing.
>
> **Authority:** [bounded live comparison](../../storyteller-architecture/evaluation-and-playability.md#b-small-live-provider-evaluation-only-after-owner-approves-spend), [spent vs inferred cost](../../storyteller-architecture/effort-cost-and-lifecycle.md), [historic connected POC](../../engineering/connected-poc-proof.md).
>
> **Source:** `packages/application/test/live-evaluation.test.mjs`, `application/src/storyteller/execution.ts`, `packages/storyteller/src/providers/openrouter.ts`, existing `story:play` and `story:inspect` scripts and credential-free request audit.

## Code scope, before any paid calls

1. Create/extend a guarded evaluation runner that **defaults to dry-run** and requires explicit configured route/model/endpoint, captured source/task versions, permitted owner/test identity, immutable frozen candidate variants, total cost in microusd, max dispatch count and deadlines. Validate and show exact expected worst-case cost before dispatch; missing policy fails closed.
2. Permit a controlled one-variable comparison: same story current actor/receipts/root/time, vary a selected prompt version, recipe or approved route **one dimension at a time**. If two versions both produce model responses, account for each and preserve original current story; a diagnostic fork cannot overwrite live canon.
3. Save versioned redacted trial manifest: request SHA/bytes/schema/version, rounds/tool handles, source inclusion and candidate validation, actual provider reported input/output/reasoning/cache-write/cached tokens, latency and charged microusd, publication eligibility; missing metrics marked unknown.
4. Explicit stop policy: hard cash cap, max model rounds, output/repair ceiling, no automatic fallback or retry after uncertain spend, source/root mismatch terminates, no double-funded operation, no automatic POC start from script fixture.
5. Produce a human-review worksheet for profile faithfulness, narrative originality, old promise recall, mechanically earned consequence, quietness and next-choice appeal. Never fill satisfaction with an LLM-generated guess.
6. After explicit **per-run owner approval** of actual paid model, maximum dollars, account/story, reproducible environment and data retention, a bounded connected test may run; a 10–15-turn owner-play POC is separate human acceptance, not assumed by two trial requests.

## Acceptance / negatives

**Normal tooling:** dry-run prints exact frozen identity and limits, uses no provider and emits a valid comparison packet. A later legitimately authorized run records actual charges and independently accepted/malformed/refused responses, with the owner's real quality assessment or marked unobserved.

**Negative:** no allow-flag, unknown pricing/route, expired authority, missing source, insufficient funding, stale story, output schema incompatibility, uncertain attempted provider dispatch, hostile input prompting tool escalation or private prompt leakage all block new paid calls. Running CI or unit tests can **never** spend actual money by accident.

**Proof:** provider-free CLI validation, mocked OpenRouter transport, funding/status tests, exact dry-run output. **Explicit live spend and disposable SQL approval required separately**; no implicit production DB, reset, new billing provider or migration. Include actual run credentials only in protected local environment, never docs/Git.

**Exclusions:** always-on eval bot, automated model judge, unlimited multi-agent search, switching user's game to a different model during live play, authorizing public free trial grants, changing game time or user ownership. Completing this packet's harness does not itself mean connected POC passed.
