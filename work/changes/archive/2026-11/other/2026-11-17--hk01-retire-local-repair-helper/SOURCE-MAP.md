# HK01 | operator parity investigation: what the old CLI uniquely does

**Inspected:** 584b594, 2026-11-20. **Security level:** sensitive local settlement code; **no CLI execution, DB mutation, saved response replay or model call** in this audit.

## Unique current local command behavior

`scripts/repo-tools/reconcile-storyteller-response.mjs` accepts three positional arguments (generationId, attemptId, relative saved-response JSON) and restricts the file under `data/story-local-evidence` with `.json` extension. It **hardcodes the persistent local database** `offscreen_story_local`, reads generation/attempt together and refuses unless generation.state=uncertain, generation.attempt_id equals named attempt and attempt.state=uncertain. It parses `storytellerTaskSchema`, requires `task.resources.recipe.version='repairable-turn.v1'`, reads the file and parses `evidence.raw` into a provider envelope, checks HTTP 200, provider response ID, model, choice content and usage, model/provider equality to frozen task execution policy and token arithmetic (`total = prompt + completion`). It calls `normalizeOpenAiStrictOutput` and `diagnoseStorytellerResult`; **valid** model result is refused here because this old CLI only handles invalid-output *repair* with a diagnostic. It calculates cost via `usdToMicrousd` and calls `createStorytellerBudget(database).settle` with complete usage/telemetry and generationOutcome `failed, invalid_output, repairCandidate, repairDiagnostic`. It prints an audit-like summary on success.

This is much more than “a saved response helper”, and deleting it before replacing those checks destroys a unique recovery path.

## Newly added function is necessary but not equivalent

`packages/application/src/storyteller/saved-response-settlement.ts:settleUncertainAttemptFromSavedResponse` accepts a **caller-supplied** already validated `savedResponse` containing usage/telemetry and explicit state strings. It refuses absent payload, already settled, wrong generation/attempt state and then delegates to budget.settle; it does **not** open a trusted file, verify frozen provider/model/repair envelope, lock the actual DB record, establish persistent operator audit, check numeric provider usage or verify that the response was truly saved for this attempt. Hence **not yet an operator replacement** despite pure tests.

## Safe replacement plan, fully bounded by invariant

1. **Read-only parser:** in separate module, accept a *provided already-read* evidence blob and a trusted frozen task, validate HTTP/body/route/model/provider/token/cost/invalid-output repair with existing parser/normalizer. Return a typed immutable `ValidatedSavedRepairEvidence` with a canonical digest. No I/O, no budget, unit positive+malformed negatives.
2. **Read-only identity preflight:** retrieve generation/attempt under approved local connection, validate attempt binding and states, compare saved evidence provenance/hash against the named attempt and record. Do not trust the CLI's positional strings to authorize DB writes.
3. **One short approved settle:** call existing `settleUncertainAttemptFromSavedResponse` using *derived* usage/telemetry/generationOutcome under budget's idempotency and SQL state checks. Do not settle after failure to find an authoritative saved response; do not allow two simultaneous operator invocations to settle twice.
4. **Operator interface and runbook:** create a read-only `--plan` plus explicit `--execute` for local-only, validated saved result, with reviewed command, audit identity, no secrets, no model send. Only then replace old script, with exact negative parity tests. Never run against `offscreen_story_local` without explicit authorization; use disposable DB.
5. **Removal:** Git delete only after replacement proves all old positive and negative cases and runbooks stop naming the old command. “Unused by package scripts” is not enough: it is an operator path.

**Critical source status:** legacy script **cannot** be assumed a broadly safe product API: it hardcodes a local DB credential and evidence path, so replacing it is also hardening. But that is not permission to delete a rare financial recovery route before a safer equivalent exists. [TASKS](TASKS.md) keeps this distinction.

## 2026-11-20 provenance clarification (planning only)

`tools/chamber/src/story-provider.ts` creates an ignored `provider-response-*.json` using `recordResponse` and `wx`; the provider hook includes `requestSha256`, raw response, status, provider ID and purpose. `packages/application/src/storyteller/dispatch-review.ts` records an attempt-specific `storyteller_dispatch_review.packetSha256` **before dispatch**, and requires actual provider wire equality with that digest. This supplies an existing request-association join, reducing the replacement to bounded validator + read-only operator preview + guarded audited budget settlement. It does **not** prove a local file was not edited or disambiguate multiple identical-wire sends; such cases must HOLD. See [decision](DECISION-2026-11-20.md). No runtime DB/provider tests performed by this source audit.
