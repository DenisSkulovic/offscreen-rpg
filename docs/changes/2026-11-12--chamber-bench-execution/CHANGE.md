# Change CH02 | Instant Bench lane using real pure rules

> **Cursor first look:** [developer tool source map](../../../packages/application/src/developer-tools/README.md) and actual `@offscreen/game` pure policy exports. **Target:** [C03/C04/C12/C16](../../engineering/targets/chamber-laboratory.md#11-verifiable-acceptance-c01c16), [protocol 2](../../technical/chamber-lab-protocol.md#2-architecture-and-drivers), [audit H03/H14](../../engineering/audits/chamber-gap-2026-11-12.md#4-ranked-gaps). **Trap:** never write a Chamber-only imitation of the game resolver.

**State:** Specified/Proposed, not executable without owner selection. **Depends on:** CH01. **Source baseline:** `470a5df`; source must be rechecked, tests have not run.

## One code-bearing outcome

Implement an in-process **Bench driver** that executes typed named scenarios directly against **real pure production game policies** and exposes a fast `pnpm chamber:bench -- <scenarioId> --seed=N` CLI (or an equivalently short command). No PostgreSQL, Nest, Temporal, Next, Chromium or provider network required.

## Design

Start with two source-grounded, meaningful pure cases: one calendar/time projection, one currently implemented finite-action/eligibility/check policy. Use schema-validated minimal inputs and injected clock/entropy at real policy seams; record the input, observed output, failing/passing assertion and reproducibility seed. No generic plugin engine, arbitrary executable code from the console or new global test runner. A Bench is a developer tool over a production policy, **not** a second source of mechanical authority. CH06 will own multi-step orchestration; CH09 owns persistent run reports.

## Proof

**Normal:** a single command returns a current real-policy result plus clear assertion with no full-stack startup; same seed/fixture/version reproduces structural state.  
**Negative:** unsupported or contradictory input fails; a deliberate production-policy counterexample is caught (tests must not assert a copied fake calculation).  
**Verification:** fast provider-free pure tests, one CLI smoke; measure cold/warm time only if actually run. **Preserve:** existing `pnpm chamber` flags, game rules and spend boundaries.

## Handoff

Cursor starts at one real `@offscreen/game` exported policy/test and CH01 registry; implements small Bench adapter/CLI without scanning all mechanics. Return diff, actual tests, no paid work and precise discovered contradiction if policy cannot be isolated.
