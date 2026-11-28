# DE-E1-01 | task queue

Serial T01 → T02 → T03. Coordinator does focused gate and receipt; no live calls.

## T01 | Activate workspace
May write new package manifest, tsconfig, src/index.ts, src/host.ts skeleton/interface, README, lockfile. Read `packages/ai/agent-core/package.json`, `tsconfig.json`, `pnpm-workspace.yaml`, `turbo.json`, [Host interface](EXECUTION.md#host-interface). Use exact pinned deps, no additional root exports or changes to application manifest. Establish interface and file layout for T02; update lockfile with pnpm lockfile-only, preserve existing importers. README records selected vs unimplemented. Source postcondition, T02 owns compile. Stop on missing pinned dependencies or conflicting identity; no SDK upgrades.

## T02 | Implement native custody
Requires T01. May write src/host.ts, src/index.ts, `test/host.test.mjs`, workspace README. Read [Host interface and lifecycle](EXECUTION.md#host-interface) (through Lifecycle and failure), `apps/worker/src/runtime/connections.ts` cleanup helpers, existing `createHarness` acquisition/start/stop. Implement exact state/termination/cleanup contract; use deferred injected fakes for overlap, run rejection, cleanup failures and partial acquisition. Compile and run focused host tests per PROOF. No native calls, no generic retry/registry/OS hooks. Stop on material pinned SDK mismatch. Receipt: actual command/result and API postconditions.

## T03 | Add strict owner admission
Requires T02 source. May write `infra/platform/temporal/namespaces.mjs`, `infra/platform/temporal/tests/namespaces.test.mjs`, owner README/runbook strict route status only. Read `namespaceCommand`, ordinary describe/parse/create; `assertPlatformTarget`, `runPlatformCommand`; [Strict namespace owner](EXECUTION.md#strict-namespace-owner). Implement additive guarded raw command path, process-local receipt/assertion, refusal fixtures including exact absence vs bare token, wrong name, race, timeout, mismatched ID/retention and target drift. Count calls; no extra create/delete/adopt. Preserve ordinary registration tests unchanged. Run namespace tests per PROOF. Stop on owner transport contradiction; no live commands or altered normal behavior. Receipt: tests + strict interface and known unrun native verification. Coordinator owns catalog/package map reconciliation.
