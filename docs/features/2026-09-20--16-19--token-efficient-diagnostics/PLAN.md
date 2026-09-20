# Token-efficient diagnostics plan

Feature: [Token-efficient diagnostics](FEATURE.md)
Status: Phase 1 implemented and verified offline; later phases wait for real playthrough evidence.

## Phase 1 — Packet map and bounded drill-down

Extend the existing offline Storyteller request audit rather than creating another packet builder.

- Add section kind, item count, character count and SHA-256 to the existing byte manifest.
- Add explicit `case-id:section-key` selection with a shared positive byte cap.
- Keep selected contents in a separate artifact and preserve the default content-free manifest.
- Test structural metadata, exact selection and oversize rejection.
- Document the command and the distinction between bytes, tokens and provider cache evidence.

Exit: request composition can be inspected map-first and section-second with zero provider transport.

## Phase 2 — Compact playthrough failure digest

After deterministic Chamber T3 evidence exists, inventory the QA-run export and correlated durable records. Define one concise failure digest containing outcome, first failing stage, identifiers, recent typed events, artifact index and supported before/after changes. Expose selectors for failure-only, changed-only and bounded event neighborhoods.

Do not duplicate authoritative rows into a generic trace blob. Do not implement this phase before a real debugging run demonstrates which fields answer the first diagnosis questions.

Exit: a failed scripted run can be triaged from a compact digest, then expanded deliberately.

## Phase 3 — Cross-run comparison

Use stable artifact/section hashes and correlation identities to compare two runs. Default to changed sections and changed outcomes. Exact content remains opt-in and byte-capped.

Exit: a regression can be localized without loading both full traces.

## Checkpoint

- Existing assets: exact request construction, packet hashes/bytes, evidence handles, QA identities, Chamber dispatch-review artifact and a prepared trace-explorer contract.
- Deliberate restraint: no generic logging platform, rich trace UI, provider call or full-flow run is part of Phase 1.
- Phase 1 evidence: the focused Storyteller build and all 33 package tests passed. A one-case CLI rehearsal produced a 3,548-byte content-free manifest and a separate 27-byte `currentState` selection; provider transport remained disabled. A later consequence audit exposed the full saved roll/outcome in a 1,074-byte changing-state section and showed that its 19,721-byte response schema, rather than story state, dominates the 25,438-byte packet.
- Representative consequence fixture: it now contains a coherent committed success receipt and matching threat facts. The offline scripted raw result narrates that saved outcome and validates two evidence-linked next plans (`read-the-stranger` and `bar-the-door`) without rerolling or applying effects directly. Packet inspection caught and removed an earlier contradictory absent-stranger fact that structural validation alone accepted.
- Next action: first isolate the persisted consequence audit from the large nested Storyteller integration fixture. A trial selector reached a pre-audit story-start conflict even after the disposable test database was reset, so no artifact was claimed and the unreliable command was removed. Once isolated, capture packet → raw result → validation → admitted offer → publication/state diff and use that concrete trace to shape Phase 2; do not build a generic trace platform or send a provider request merely to obtain the artifact.
