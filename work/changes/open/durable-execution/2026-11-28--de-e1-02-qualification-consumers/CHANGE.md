# DE-E1-02 | Maintained native qualification consumers

**Kind:** implementation (source construction). **Standing:** PROPOSED, dependency-gated; independent readiness pending, no commission. **Base:** `826adbc548b8acff9e49767389848c857432b497`; target `implementation/durable-execution`. Requires DE-E1-01 archived/joined with exact host and strict admission APIs. [Group](../README.md), [source map](../SOURCE-MAP.md), [Design](../../../../designs/open/durable-execution/README.md).

**Outcome:** both maintained integration suites use one reusable host and one strict qualification namespace per joint run; real native behavior checked later by 03. No new production workflow or agent implementation. Only test tooling, Agent Core dev dependency and lockfile, related READMEs and runbook route. Do not change Agent Core `src`, mission.workflow.ts, legacy app/workflow definitions, Vercel plugin, fixture semantics, existing limits/retries or any product/domain authority. No provider/network calls in offline tests. No E2 source edits.

[Tasks](TASKS.md) T01 → T02 → T03 → T04 → T05 (serial; shared harness/telemetry wiring). [Execution](EXECUTION.md), [Proof](PROOF.md). 03 owns joint proof; source gate compile, focused suites and refusal/trace fixtures. Archive after passing own gate; transfer every native and broader integration obligation. No main merge or live operations.
