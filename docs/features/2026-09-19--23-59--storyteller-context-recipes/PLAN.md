# Implementation plan

Feature: [Storyteller request purposes and active-scene continuity](FEATURE.md).
Execution scope: prepared for the owner's next coding turn. Backend and offline artifacts only. Commit/push each coherent phase. No model calls, new agents or UI work.

## R1 — Request-purpose inventory and reproducible packet audit

Status: implemented; pending only the later batched command/test execution. No canonical-storage dependency.

Outcome: one command captures comparable packets for every implemented purpose, with explicit task/template/context identities and zero provider transport. This is the immediate continuation of the held-opening work, before larger gameplay development resumes.

Owners to read:

- `packages/storyteller/src/tasks/index.ts`, `tasks/resources.ts`: purpose schemas, instructions, one-round envelope.
- `packages/storyteller/src/context/index.ts`: projection and bounded selection.
- `packages/storyteller/src/providers/openrouter.ts`: exact packet builder and inspection.
- `packages/application/src/storyteller/context.ts`, `openings.ts`, `dispatch-review.ts`: captured evidence, admission and hold.
- `tools/chamber/src/main.ts`: existing API-only opening probe and temporary export.
- `packages/application/src/developer-tools/qa-catalog.ts`: maintained acceptance catalogue.
- Relevant Storyteller tests and the memory Phase 1 plan.

Bounded edits:

1. Define an explicit, typed purpose description beside task composition: intended input, allowed output, applicable prompt fragments and context-policy version. A small exhaustive mapping or functions suffice; no plugin registry or generalized agent framework. Preserve existing task kinds and accounting identities. Future purposes are documentation only.
2. Extract the API-only packet probe into a cohesive module. Allow explicit case/profile selection and generation-specific output paths. Do not overwrite the only previous artifact. Retain normal authentication, origin checks, immutable admission, hold and zero-attempt assertion. Browser imports/startup and web builds must not be prerequisites of the backend command.
3. Add local snapshot cases for narrative opening, mechanical opening, continuation, consequence and report. Mark pure task captures versus HTTP/worker captures honestly; do not claim a hand-built snapshot proves end-to-end gameplay.
4. Export a machine-readable manifest and concise readable comparison: source revision, purpose, prompt/context/schema versions and hashes, request/message/schema bytes, loaded/omitted evidence and reasons, exact common-prefix bytes for comparable messages. Compare content by stable evidence handle; do not infer tokenizer identity from bytes. Preserve unknown token/cost/cache-hit fields.
5. Construct a chronological fifteen-turn confrontation fixture with early required clue, attributed false claim, changed holder and unresolved intention; include a nonhuman variation. Establish expected/forbidden evidence independently of the selector. Initially report the existing six-optional-passage loss as a known failing acceptance condition, not a successful continuity test.
6. Correct prior audit claims: `current` is a valid opening-note source in the original validator. Removing all opening notes is an intentional functionality change, not a necessary consequence of absent previous passages. Document the current restriction and assess restoring useful opening memory under the purpose contract; do not silently discard notes to make schemas smaller.
7. Add/version backend QA coverage and explain the audit command in development docs. Keep raw story artifacts private/local; sanitized summaries may be committed if they contain only authored fixtures.

Evidence: focused pure checks for deterministic comparison and source coverage, plus the existing API held-opening probe when useful. No broad suite needed. Capture current failures explicitly; checks remain optional under repository policy.

Exit: the next maintainer can reproduce current request shapes and long-scene context loss without a browser or provider, and has a bounded R2 acceptance oracle.

## R2 — Preserve the active scene within a bounded request

Status: implemented in source; deferred audit/runtime evidence remains for the later batched verification pass.

Dependencies: R1 oracle. Coordinate with memory Phase 1 for provenance/body separation and duplicate-current removal. Those representation fixes may be extracted from its storage-dependent scope for existing passages; update that plan rather than build two selectors. Canonical publication and archived retrieval still depend on C1/C2.

Owners: application context loading and capture, Storyteller context selection/manifest, generation admission and QA. Use existing persistence for exact source references; no second history store.

Introduce versioned context scope containing story revision, active source range and explicit required handles. Scope is private continuity metadata; only application admission may accept or replace it. Initial fixtures provide explicit scope; production defaults conservatively retain a bounded recent interaction and never infer a scene ended from passage count alone. Automatic semantic boundary inference remains unimplemented and must be labelled as such.

Load the declared range within strict candidate/byte limits rather than querying seven rows and hoping later selection recovers omitted sources. Preserve required active material and current exact state; select optional older evidence under the same request envelope. Source selection includes accepted intentions/outcomes, not just disconnected prose or opaque response IDs. Chronology claims remain attributed; hidden future material is excluded.

When a declared range is too large, hold with coverage diagnostics. Never truncate the query and present partial coverage as complete. A future condensed segment requires source coverage, version and unresolved-detail retention; this phase does not create paid summaries. Scope updates use the current story revision and existing publication transaction; a late result cannot reset scope or drop a newer fact. Preparation/retry cannot reroll mechanics.

Exit: fifteen-turn confrontation and microbe traces preserve their required continuity within a declared envelope; overflow, stale scope, missing source and restart produce precise outcomes. No claim of unlimited scenes or live quality.

## R3 — Stable context layout and cache-aware evidence

Dependencies: R2 stable selection and source manifest. Owners: request composer, provider inspector and cost evidence; use the existing bounded-cost ledger.

Order stable instructions, task contract and profile deterministically, then stable scene background/history where applicable, then changing state and selected intention. Preserve chronological meaning and instruction hierarchy. A profile/rule revision intentionally invalidates affected prefix reuse. Do not keep stale state, pad requests or mix incompatible task schemas for caching.

Report potential reusable-prefix growth across the fixture sequence and cold cumulative input bounds. Actual hits and cache-write prices remain unknown until the chosen provider supports and reports them. Route-specific controls and pricing belong to a separately verified live configuration; no provider switch or live cache-warming probe in this phase.

Exit: deterministic assembly preserves useful common material across rapid turns; artifacts distinguish potential reuse from billed savings and account for all request purposes.

## Current checkpoint

- Base reviewed: `3c58776`. R1 is active. The typed request-purpose inventory and pure exact-packet comparison are implemented for narrative/mechanical openings, continuation, consequence and report without changing persisted task identity.
- Implemented evidence: request inspection now reports purpose, input/output contract, prompt fragments, prompt/context-policy versions, message/schema hashes and exact UTF-8 common-prefix bytes. Unknown token and observed cache-hit values remain null rather than inferred from byte counts. The focused Storyteller build and all 30 tests pass.
- API probe structure: the normal HTTP/worker opening probe is now a cohesive backend module; it still uses authenticated admission and durable review, asserts one held review and zero provider attempts, and writes generation-scoped evidence without overwriting an earlier run. The Chamber launcher only owns environment lifecycle.
- Exact next action: begin R3 by making stable/changing request sections explicit and extending the audit sequence to measure potential reusable-prefix bytes without claiming provider cache hits. R2 now has durable anchors, complete range loading, fail-closed coverage/overflow, revision-fenced restart-at-current, nonhuman/human oracles and single current-body projection. Deferred command/tests remain one later batch.
- Known gaps: existing/unprofiled stories without an anchor still use six optional recent passages. Current prose is now projected once, but non-current note sources remain mandatory raw input; broader provenance/body separation stays with memory Phase 1. There is no automatic scene-boundary inference, tool/multi-round runtime or paid condensation. Opening-note removal needs semantic review before optimizing further.
- Verification: the existing 30 Storyteller tests passed at the earlier checkpoint but were not rerun. After scope/replacement integration, the Storyteller build and focused application typecheck passed; current-body deduplication passes focused Storyteller typecheck. Earlier DB/contracts builds also pass. No migration, audit command, runtime or broad suite was executed. Authored captures do not prove multi-purpose HTTP gameplay.
- Model spend: $0 application-provider spend; cumulative account usage unverified.
