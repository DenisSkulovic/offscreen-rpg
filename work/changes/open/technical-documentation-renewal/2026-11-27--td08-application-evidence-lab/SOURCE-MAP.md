# TD08 | source and claim map

Inspected frozen main `4b621ec9708361a2304efdcff4d34bb7da2b6c88`. Heading inventory and source anchors below identify the actual owners; source existence is not live qualification. Read-only source checks, no runtime or provider operations.

## T01 | Evidence graph and capture

Owned existing headings:

- `docs/technical/observability/identities-and-evidence.md`: 1: Evidence graph | Typed, durable, historically faithful data; 5: Owner map; 21: 1. Decision: no mega-GameData blob, no telemetry-as-history; 36: Turn Evidence Capsule; 62: 2. Core identity graph; 87: Required stable IDs; 105: 3. EvidenceEnvelopeV1: small, indexable, purpose-scoped; 165: 4. ArtifactRefV1: byte-precise typed input/output; 202: 5. Every node must carry an explanation of “where did this come from?”; 236: 6. Data-capture checkpoint matrix; 255: 7. Read and reconstruction; 270: Contract dependencies; 277: Folded invariants from the 2026-11 essays; 290: 8. Open technical decisions before execution

- `docs/technical/observability/capture-and-provenance.md`: 1: Committed transition capture V1 | One real mechanic, one atomic forensic source; 5: Owner map; 19: 1. Pilot before universal rollout; 32: 2. Exact causal state and historical frontier; 92: 3. Per-story sequence correctness; 104: 4. Hook locations and transactional boundaries; 128: 5. What about stochastic inputs and deterministic replay?; 141: 6. Crash and concurrency proof matrix; 161: 7. Scaling and rollout acceptance; 174: Folded invariants from the 2026-11 essays


Controlling/evidence anchors: `packages/story-engine/src/campaign/action-executions.ts`; `packages/db/migrations/0016_obs00_current_authority.sql`. Selected transformation and negative in TASKS T01.

## T02 | Forensic access and retention

Owned existing headings:

- `docs/technical/observability/investigation-and-reconstruction.md`: 1: Forensic access and read contract V1 | Role-specific truth without a universal data leak; 5: Owner map; 21: 1. Five increasingly sensitive disclosures; 35: 2. Capability taxonomy, proposed separate from existing AD01–AD08; 58: 3. Server-side authorization algorithm; 82: 4. Purpose-bound disclosure and read audit; 97: 5. Authoritative read models, not raw table endpoints; 119: 6. Cache/SSR and UI security; 128: 7. Erasure, expiry and legitimate forensic retention; 136: 8. Negative acceptance suite; 156: Reconstruction steps

- `docs/technical/observability/retention-and-access.md`: 1: Replay, retention and privacy | Time travel without rewriting history; 5: Owner map; 21: 1. Four replay modes (do not call them all “replay”); 34: 2. The historical frontier is a committed ledger position; 54: 3. Record transition deltas, not a game object every second; 82: Checkpoint cadence; 95: 4. Player playback: a game feature, not an incident debugger; 107: 5. Deterministic test replay: what has to be recorded; 122: 6. Retention classes, with explicit trade-offs; 144: 7. Storage engineering and privacy safeguards; 157: 8. Costs and reliability; 172: 9. Acceptance probes


Controlling/evidence anchors: `docs/technical/admin/investigation-and-privacy.md`; `docs/product/admin/ai-engineering-and-investigation.md`. Selected transformation and negative in TASKS T02.

## T03 | Operational diagnostics

Owned existing headings:

- `docs/technical/observability/telemetry-and-diagnostics.md`: 1: Runtime telemetry and operational reliability | OpenTelemetry + pragmatic Grafana stack; 7: Owner map; 21: 1. Platform choice; 46: 2. Reality of current source; 52: 3. Telemetry is three cheap signals plus one durable evidence spine; 63: 4. Trace context and span design; 89: 5. Recommended metric vocabulary; 116: 6. Logging policy: less volume, more signal; 130: 7. Sampling, reliability and backpressure; 140: 8. Operational objectives and proof; 153: 9. Tool choice verdict; 159: Folded invariants from the 2026-11 essays


Controlling/evidence anchors: `infra/platform/observability/install.mjs`; `packages/runtime-logging/src/index.ts`; `packages/db/src/telemetry/runtime.ts`. Selected transformation and negative in TASKS T03.

## T04 | Chamber specimen and proof

Owned existing headings:

- `docs/technical/lab/chamber-and-fixtures.md`: 1: Chamber | reproducible developer laboratory target; 7: Quick route; 23: Story response capability boundary; 27: 1. Operating model; 39: Proof tiers; 53: Signature developer journey; 59: 2. State specimens and checkpoints; 72: 3. Scenario protocol and API; 97: 4. Time, entropy and delivery control; 107: 5. Controlled failure and concurrency; 124: 6. Interactive workbench; 134: 7. Inspection, causality and evidence; 143: 8. Mechanics catalogue and evolution; 159: 9. Authority, safety and cost; 168: 10. Architecture and maintainer boundaries; 191: 11. Verifiable acceptance C01–C16; 212: 12. Architectural challenges and decisions; 229: 13. Convergence and evidence discipline; 235: Editorial comprehension pass

- `docs/technical/lab/experiment-protocol.md`: 1: Chamber laboratory | implementation protocol and authority; 5: Cheap reading route; 18: 1. Contract and command semantics; 59: 2. Architecture and drivers; 79: 3. Semantic fixtures and isolation; 89: 4. Time and randomness; 98: 5. Fault cut points; 107: 6. Observations, assertions and reports; 119: Proof tiers; 129: 7. Client API and workbench; 139: 8. Safety and lifecycle; 147: 9. Catalogue evolution and handoff


Controlling/evidence anchors: `packages/lab-support/src/chamber.ts`; `packages/lab-interface/src/chamber.ts`; `scripts/repo-tools/testlab-target-guard.mjs`. Selected transformation and negative in TASKS T04.
