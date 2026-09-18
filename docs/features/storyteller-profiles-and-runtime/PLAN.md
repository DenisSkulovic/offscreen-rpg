# Implementation plan

Feature: [Selectable storytellers](FEATURE.md).

## Authorization and ownership

The owner explicitly authorized Codex implementation on 2026-09-18 and asked to batch checks after the code. No agents were delegated. Paid inference remains disabled under the repository spending rule; this authorization covers local implementation and offline verification only.

## Implemented phases

1. Profile/task contracts: JSON definitions, public metadata projection, strict private schema, task-specific instructions and frozen request artifacts are implemented.
2. Creation: draft reference, captured candidate/profile, Start preservation, nullable legacy fields and browser selection are connected.
3. Durable runtime: new kind/topic, source execution outside transactions, saved output before publication, stale fencing and distinct publication failure are implemented. Existing workflow names and legacy decoders remain usable.
4. Composition and tests: default authored rehearsal plus injected provider/source boundaries; profile/source display and third-profile data-only unit case are present.

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
