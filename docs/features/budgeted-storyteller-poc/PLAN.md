# Implementation plan

Feature: [Budgeted solo POC](FEATURE.md).

## Authorization and ownership

The owner explicitly authorized Codex implementation on 2026-09-18 and asked to batch checks after the code. No agents were delegated. Paid inference remains disabled under the repository spending rule; this authorization covers local implementation and offline verification only.

## Implemented phases

1. Accounting: persistent account/run/attempt reservations, shared limits, global uncertain stop, integer settlement and immutable attempt policy are implemented. No real allowance is provisioned.
2. Provider/recovery: explicit OpenRouter adapter with fake transport tests, durable dispatch, no fallback/automatic paid retry, saved-output publication retry and explicit intention recovery are connected.
3. Solo entry/return: owned live list, profile/source metadata, saved history, pending/error/retry states and 20-second quick-play waits are connected.
4. Live evaluation: deliberately deferred. Requires owner spending authorization, verified remaining allowance and current route/pricing, explicit funding/run provisioning and an operator reconciliation procedure. No operator UI/CLI or real route is supplied in this slice. A valid mocked result is not live POC acceptance.

## Current checkpoint

- Baseline: `0a5f26064bb21829acdca8a1e9f7ca0cd992be30`; uncommitted implementation spans the three storyteller features and owning specifications. Preserve the existing generated earned-time path.
- Current phase: implemented offline scope; focused verification passed. Retain this checkpoint for review and the separately gated live evaluation.
- Build: `corepack pnpm exec turbo run build --filter=@offscreen/api --filter=@offscreen/web --concurrency=1` passed; affected API dependency closure rebuilt after publication validation changes.
- Unit checks: AI 21, contracts 7, worker 4 passed with no provider calls.
- Integration: `node --test --test-concurrency=1 apps/api/dist/test/storyteller.integration.js apps/api/dist/test/story-start.integration.js apps/api/dist/test/story-resolution.integration.js` passed all 21 checks against disposable `offscreen_auth_test`. Includes saved-result publication recovery, deferred arrival notes and browser pause/restart/reopen. Processes shut down normally.
- Checks: documentation links (45 files) and Git whitespace passed. Scoped formatting was applied. The last quality-lint finding was corrected, but final lint was not rerun; the owner explicitly asked to stop pursuing minor issues and conserve usage.
- Exact next action: try the offline pineapple rehearsal through `pnpm chamber` then `/stories`. Do not expand minor cleanup. Before any real generation, agree the bounded live evaluation and provision verified limits/reconciliation.
- Follow-up limits: mandatory-context overflow currently fails closed with a generic request error; improve its player-facing explanation later. Full narrative quality and operational provisioning remain unverified.
- Limits: no live provider/account compatibility, actual balance, narrative quality or full repository-suite certification. The local launcher remains offline even if a credential exists.
- Spend: $0 provider spend; cumulative OpenRouter usage unverified. No provider credentials read.
