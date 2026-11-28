# **Durable Execution E1 | Independent architecture committee**

## **REVISE AND RE-DEFEND**

Localized correction

The shared Temporal runtime architecture is sound. One localized contradiction in qualification namespace custody prevents unconditional acceptance of the complete E1 evolution.

Critical

# **0**

High

# **1**

Medium

# **2**

Low

# **0**

**Recommendation:** Retain the selected architecture, resolve the namespace admission contradiction, perform one targeted re-review and proceed. There is no justification for another comprehensive design cycle, additional architectural layers or preliminary native experiments.

## **1. Review identity and provenance**

| Field            | Verified value                         |
| ---------------- | -------------------------------------- |
| Repository       | `DenisSkulovic/offscreen-rpg`          |
| Candidate branch | `main`                                 |
| Review date      | 2026-11-28                             |
| Review role      | Independent architecture reviewer      |
| Review depth     | Focused evolutionary subsystem review  |
| Dossier          | `work/designs/open/durable-execution/` |
| Intended receipt | `committee/pass-01.md`                 |

**Exact reviewed main HEAD:**

`e5015a1103d630a5bd821bc80068def32efebeee`

**Design investigation baseline:**

`c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6`

**Observed parallel Observability E2 HEAD:**

`a3c91373d0823c04c4e4463af9a4a2b71971e310`

The candidate is one commit ahead of its investigation baseline. That commit modifies only the Durable Execution dossier and design catalog. The relevant implementation source has not changed between those two revisions.

Sources: [reviewed candidate](https://github.com/DenisSkulovic/offscreen-rpg/tree/e5015a1103d630a5bd821bc80068def32efebeee?utm_source=chatgpt.com), [E1 dossier](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/work/designs/open/durable-execution/README.md?utm_source=chatgpt.com), [baseline comparison](https://github.com/DenisSkulovic/offscreen-rpg/compare/c8dab5c47f5a8d638122c9321230f6bb4bfd0ac6...e5015a1103d630a5bd821bc80068def32efebeee?utm_source=chatgpt.com).

Applied the current repository instructions, including the severity and progressive-resolution policies in `AGENTS.md`, the ChatGPT adapter, the design-led engineering rules, repository workflow, planner investigation standard and durable knowledge requirements.

This review does not reopen Agent Core acceptance, Observability E2 architecture or the existing Temporal infrastructure architecture.

## **2. Architecture verdict by boundary**

| Boundary                              | Verdict                        |
| ------------------------------------- | ------------------------------ |
| Minimal native Temporal host          | DEFENDED                       |
| Package placement and ownership       | DEFENDED                       |
| Connection and Worker lifecycle       | DEFENDED                       |
| Plain synthetic execution             | DEFENDED                       |
| Agent Core preservation               | DEFENDED                       |
| Retry, replay and execution identity  | DEFENDED                       |
| Observability integration             | DEFENDED                       |
| Legacy compatibility                  | DEFENDED                       |
| Fresh qualification namespace custody | REVISION REQUIRED              |
| Native joint qualification            | Evidence outstanding by design |

The High finding affects qualification admission, not the shared host architecture. Unaffected conclusions may be reused during the next review.

## **3. Selected architecture assessment**

Selected E1 ownership model

**Plain execution probe**

Deterministic native specimen

**Agent Core harness**

Existing synthetic mission suite

**@offscreen/temporal-runtime**

Node-only host · connection custody · Worker lifecycle

Native Client

Native Worker

**Temporal platform**

History · scheduling · dispatch · retries · timers

**Independent observability**

Fixture spans → existing Collector → Tempo/GrafanaNative service metrics → Prometheus/Grafana

**Preserved outside E1**

Legacy Workers, RPG workflows, SQL authority, outbox, providers and financial custody

### **3.1. Necessity and minimalism — DEFENDED**

The new package is justified by actual duplication and deficiencies in existing source, rather than an anticipated need for a generic workflow platform.

The current Agent Core `createHarness()` directly owns:

- Two Temporal connections and the native client.
- Worker construction, startup, shutdown and replacement.
- Synthetic plugin and Activity registration.
- Scenario observations, history inspection and qualification policy.

These concerns are unnecessarily coupled. In particular, partial connection acquisition can strand resources, and the asynchronous Worker failure is recorded in `runError` without actively interrupting scenario waits.

Extracting technical custody while leaving fixture and execution policies with the consumer is a coherent improvement.

The plain probe is also justified. It provides an independent control against which Agent Core behavior can be distinguished from native Temporal behavior.

| Alternative                              | Assessment                                                                             |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Repair only the Agent Core harness       | Smaller immediate edit, but no reusable custody boundary or independent native control |
| Adopt the selected thin host             | Appropriate balance of reuse, isolation and learning value                             |
| Introduce a generic workflow engine      | Premature abstraction that would duplicate native SDK semantics                        |
| Migrate existing application Workers now | Unnecessary compatibility and historical execution risk                                |

**The selected architecture is proportionate to E1.** It establishes reusable plumbing without prematurely determining how future products must use it.

Source: [existing Agent Core qualification host](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/packages/ai/agent-core/test/qualification.mjs?utm_source=chatgpt.com).

### **3.2. Package and authority boundaries — DEFENDED**

The proposed workspace is correctly placed:

```
packages/
├── ai/
│   └── agent-core/
├── platform/
│   └── temporal-runtime/    # New E1 workspace
└── workflows/              # Existing owner, unchanged
```

The current `pnpm-workspace.yaml` already admits `packages/platform/*`. The distinct workspace identity avoids collision with `@offscreen/workflows`.

The selected responsibilities are consistent with the current technical execution contract.

| Responsibility                                 | Authority                   |
| ---------------------------------------------- | --------------------------- |
| Workflow semantics and deterministic decisions | Consumer                    |
| Activity registration and plugins              | Host composition            |
| Worker and connection lifecycle                | Temporal Runtime            |
| Execution history and retry scheduling         | Temporal                    |
| Agent admission, limits and tool policy        | Agent Core                  |
| Committed business facts                       | PostgreSQL/domain owner     |
| Delivery and effect idempotency                | Existing application owners |

The test-only dependency from Agent Core to Temporal Runtime preserves its public and Workflow-safe boundaries.

No additional workspace, generic registry, production dependency or shared Workflow abstraction is necessary.

### **3.3. Connection and Worker custody — DEFENDED**

The proposed lifecycle addresses concrete defects while retaining the native SDK.

Conceptual lifecycle, not a prescribed implementation state enum. Failure permits only safe cleanup or bounded process termination, not another Worker generation.

The design appropriately selects synchronous admission, serialized lifecycle operations, one Worker generation at a time, observable termination and independently attempted connection cleanup.

Particularly important guarantees are preserved:

- Worker startup is not falsely represented as polling readiness.
- Successful graceful shutdown establishes the boundary for replacement.
- Failed Worker execution cannot become successful merely because cleanup succeeds.
- Uncertain quiescence prevents native connection closure and Worker replacement.
- The host does not install infrastructure, discover environments or globally shut down the SDK.

Existing Worker cleanup already supplies a useful precedent in `createCloseOnce()` and `closeWorkerConnections()`.

The exact native TypeScript signatures and injected lifecycle tests are legitimate construction-stage obligations. They do not require another architecture investigation now.

Source: [legacy connection cleanup](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/apps/worker/src/runtime/connections.ts?utm_source=chatgpt.com).

### **3.4. Retry, identity and recovery semantics — DEFENDED**

The selected plain specimen separates the important native Temporal behaviors.

Normal execution

Workflow

Activity #1

Completed

Retry once

Attempt 1 fails

1s backoff

Attempt 2 succeeds

Same Workflow execution. One logical Activity, two physical attempts.

Worker replacement

Activity settled

Worker stopped

New Worker

Signal & finish

Same Run ID. Previously settled Activity must not execute again.

| Selected bound             | Value      |
| -------------------------- | ---------- |
| Activity start-to-close    | 5 seconds  |
| Activity schedule-to-close | 15 seconds |
| Initial retry interval     | 1 second   |
| Maximum attempts           | 2          |
| Workflow execution timeout | 60 seconds |
| Workflow-level retry       | None       |

These are suitable fixture-specific limits, not production defaults.

The design correctly distinguishes Activity retry, Workflow replay, Worker replacement, duplicate execution admission and application-level idempotency.

There is no claim of exactly-once external effects. There is no database mutation, provider spend or other uncertain external effect to reconcile.

The existing Agent Core native policies remain separate, including its stricter retry restrictions.

**No production retry or transactional-delivery design is required to accept this synthetic scope.**

### **3.5. Agent Core preservation — DEFENDED**

The proposed integration preserves the accepted Agent Core architecture rather than introducing a second agent execution system.

The existing source already contains the necessary distinctions:

| Existing component            | E1 disposition                                |
| ----------------------------- | --------------------------------------------- |
| `mission.workflow.ts`         | Preserve deterministic mission composition    |
| `qualification-scenarios.mjs` | Preserve native scenario assertions           |
| `qualification-recovery.mjs`  | Preserve replay and Worker replacement tests  |
| `fixtures/model.mjs`          | Preserve synthetic model behavior             |
| `fixtures/tools.mjs`          | Preserve tool admission and synthetic effects |
| `qualification.mjs`           | Replace technical host custody                |
| Public Agent Core exports     | Unchanged                                     |

The pinned Temporal SDK `1.24.0` and native Vercel integration `2.0.0` are confirmed in the existing package manifest. The workspace overrides already align the relevant Temporal dependencies.

The previous owner acceptance explicitly distinguished source acceptance from native qualification. Durable Execution E1 correctly retains that distinction.

The shared host must not silently inherit production authority, introduce real provider registration or change mission retry restrictions.

Relevant sources: [Agent Core owner acceptance](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/work/designs/archive/agent-core-monorepo-map/OWNER-ACCEPTANCE.md?utm_source=chatgpt.com), [Agent Core technical contract](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/docs/technical/platform/agent-core.md?utm_source=chatgpt.com).

### **3.6. Observability integration — DEFENDED**

The selected integration is compatible with the existing developer telemetry admission contract.

I inspected the actual Collector configuration on main and the observed Observability E2 branch. **The developer Collector overlay has an identical Git blob on both reviewed revisions:**

`7302fff5237afbe24d66e87f6b42970963caf22b`

| Admission property | Selected E1 value             | Compatible |
| ------------------ | ----------------------------- | ---------- |
| Service            | `offscreen-agent-poc`         |            |
| Namespace          | `offscreen`                   |            |
| Environment        | `development`                 |            |
| Scope              | `offscreen.operational.v1`    |            |
| Span names         | Static dotted identifiers     |            |
| Run correlation    | Lowercase hex16               |            |
| Candidate          | `vercel` or absent            |            |
| Outcome            | Bounded existing enum         |            |
| Retry              | Integer within admitted range |            |
| HTTP forwarding    | Loopback port 14318           |            |

Source: [developer Collector configuration](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/infra/platform/observability/values/profiles/dev/collector.yaml?utm_source=chatgpt.com).

The design correctly treats the producer allowlist as a privacy obligation rather than relying exclusively on Collector filtering.

It also correctly requires actual Tempo retrieval. An HTTP success from the Collector does not establish that a span survived admission or arrived at the backend.

The distinction between the two visibility systems is particularly sound:

| Temporal infrastructure metrics               | Execution traces                         |
| --------------------------------------------- | ---------------------------------------- |
| Native server and infrastructure observations | Instrumented fixture observations        |
| Aggregated health and behavior                | Specific execution correlation           |
| Owned by Observability E2                     | Owned by Durable Execution E1            |
| Prometheus and Grafana                        | Tempo and Grafana                        |
| No individual Workflow attribution promised   | Exact run/trace mapping retained locally |

The owner-selected sequential delivery after E2 integration is reasonable. It is a coordination dependency, not an inherent source-code dependency.

No Observability E2 architecture changes are required.

## **4. Findings**

### **DE-E1-AR-H01 — Fresh namespace custody contradicts the existing registration adapter**

HIGH

Blocking scope: qualification admission

**Evidence**

Section 5 of the Durable Execution design requires the operator to create one new isolated qualification namespace through the existing dev owner adapter. Existing or ambiguous namespaces must be refused.

However, the current implementation of `createTemporalNamespace()` in:

`infra/platform/temporal/namespaces.mjs`

explicitly tolerates `NamespaceAlreadyExists` and matching same-name errors.

Its existing test suite deliberately verifies that behavior:

```
test('registration tolerates only explicit same-name already-exists race', ...)
```

Sources: [namespace adapter](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/infra/platform/temporal/namespaces.mjs?utm_source=chatgpt.com), [namespace tests](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/infra/platform/temporal/tests/namespaces.test.mjs?utm_source=chatgpt.com).

**Counterexample**

1. Qualification owner observes the chosen namespace as absent.
2. Another operation registers the same namespace.
3. The E1 owner attempts registration.
4. Temporal returns `NamespaceAlreadyExists`.
5. The existing adapter tolerates that result.
6. E1 cannot establish that it created the namespace.

A subsequent successful describe and matching retention do not establish creation ownership. They only establish the identity and configuration of the observed namespace.

Randomized naming makes this race improbable, but it does not satisfy the explicitly selected refusal contract.

The same adapter remains present on the inspected Observability E2 revision, so the reviewer cannot assume E2 resolves this contradiction.

**Required architectural correction**

Select an explicit strict-create admission route through the existing Temporal namespace owner, preserving the existing tolerant behavior for consumers that intentionally require idempotent registration.

The qualification contract must distinguish:

| Registration result                                                              | E1 disposition |
| -------------------------------------------------------------------------------- | -------------- |
| Confirmed absence followed by successful creation and matching verified identity | Admit          |
| Namespace already exists before creation                                         | Refuse         |
| Already-exists response during creation                                          | Refuse         |
| Creation timeout or ambiguous result                                             | Refuse         |
| Failed identity or retention verification                                        | Refuse         |
| Unreadable or malformed response                                                 | Refuse         |

No automatic adoption, deletion, retry or repair of uncertain state.

The exact additive helper signature may be determined during packet preparation. The architecture must explicitly select the strict behavior and assign its source owner.

**Closure criteria:** Reconcile the dossier with the existing adapter, preserve ordinary tenant registration semantics and assign focused negative proof for the strict qualification route.

**Severity rationale:** High, rather than Critical. This is a confirmed contradiction in an essential ownership guarantee for an isolated synthetic environment. It does not invalidate the host architecture, and no live exposure or damage has occurred.

**Durable owner:** `infra/platform/temporal/README.md` and `docs/runbooks/kubernetes-temporal.md`.

### **DE-E1-AR-M01 — Existing recovery assertions are weaker than the selected E1 proof**

MEDIUM

Nonblocking

The dossier requires the Agent Core replacement scenario to retain the same Run ID and demonstrate exactly two model calls and one completed tool.

That is a correct acceptance requirement.

However, the existing `runRecovery()` assertions are not quite as strong as the dossier's statement that these properties are already asserted:

- History verifies two model Activity schedules and one tool Activity schedule.
- The physical observations verify that the first generation performed model and tool work.
- The replacement generation must perform model work and no tool work.
- The assertion does not explicitly require exactly two physical model starts across both generations.
- It does not explicitly compare the final Run ID against the initial described Run ID.

Source: [qualification-recovery.mjs](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/packages/ai/agent-core/test/qualification-recovery.mjs?utm_source=chatgpt.com).

The selected design already requires the stronger result, so this is not an unresolved architectural decision.

**Disposition:** Preserve existing assertions and make the exact physical counts and Run ID equality explicit in the construction and joint qualification obligations. Do not weaken the selected proof to match the older implementation.

**Durable owner:** Agent Core package README and maintained qualification suite.

### **DE-E1-AR-M02 — Physical observation completeness needs careful preservation**

MEDIUM

Nonblocking

The existing synthetic model and tool fixtures provide physical observation records suitable for the proposed telemetry producer.

However, not every possible failure path necessarily provides a matched start and terminal observation. For example, the model fixture records a `started` observation before calling `decideFixture()`, which can itself throw.

The design correctly prohibits inventing missing physical outcomes from Temporal history. Its telemetry adapter must preserve that distinction.

Source: [synthetic model fixture](https://github.com/DenisSkulovic/offscreen-rpg/blob/e5015a1103d630a5bd821bc80068def32efebeee/packages/ai/agent-core/test/fixtures/model.mjs?utm_source=chatgpt.com).

**Disposition:** At construction, distinguish actual physical start observations, actual terminal observations and client-observed Workflow outcomes. An incomplete observation must not be silently converted into a successful span or a fabricated Activity completion.

Where instrumentation is added, preserve fixture behavior and error propagation. Telemetry incompleteness remains a separate qualification result.

This is a bounded instrumentation concern, not grounds for designing a general-purpose telemetry SDK.

**Durable owner:** `docs/technical/observability/telemetry-and-diagnostics.md` and the new runtime package's qualification documentation.

## **5. Joint acceptance assessment**

The selected acceptance matrix is proportionate and sufficiently discriminating for architecture-stage approval.

**Host custody**

Offline lifecycle and failure-path proof

NOT RUN

**Workspace integration**

Build, exports, lockfile and four-app compatibility

NOT RUN

**Native control**

Normal, retry, duplicate refusal and replacement

NOT RUN

**Agent Core**

Preserved native qualification and replay

NOT RUN

**Visibility**

Retrieved spans, Temporal history and bounded E2 metrics

NOT RUN

**Final acceptance**

Exact revision, receipts, custody and owner acceptance

NOT RUN

No implementation or runtime tests were executed during this review. The listed gates are future obligations, not failed tests.

The construction/qualification split is accepted:

- Offline source construction and isolated design-branch integration may precede joint native qualification.
- Live qualification requires separate operator authorization and verified resource custody.
- Final main integration requires the selected joint acceptance, including the preserved relevant Agent Core obligations.

No new architecture gate is warranted merely because the implementation does not yet exist.

## **6. Deferred capabilities and preservation**

The following exclusions are safe and intentional.

| Deferred capability                   | Reactivation trigger                   |
| ------------------------------------- | -------------------------------------- |
| Real application Workflow migration   | An identified product consumer         |
| Durable external-effect idempotency   | First real external mutation           |
| Provider retry and financial custody  | Guarded paid-provider integration      |
| Database-backed execution receipts    | Durable transaction/delivery evolution |
| Workflow versioning and migration     | Supported long-lived histories         |
| Hard process-loss and server failover | A selected recovery evolution          |
| Generic application telemetry         | Multiple real instrumented consumers   |
| Production deployment and scaling     | Production topology design             |

None constitutes a finding against the selected E1 scope.

Preserve their limitations in the existing technical execution owner and the new runtime package README during promotion. Agent Core's outstanding historical proof remains with its existing technical owner.

## **7. Recommended progression**

1. **Resolve H01**

   Next

   Select strict qualification namespace admission.
2. **Targeted committee re-review**

   Verify H01 and affected acceptance obligations only.
3. **Owner ratification**

   Accept E1 and promote its bounded technical contract.
4. **Observability E2 integration**

   Reconcile the updated main baseline and developer telemetry boundary.
5. **Host construction**

   New workspace, connection custody, Worker lifecycle and offline proof.
6. **Consumer construction**

   Native probe, Agent Core rehosting and bounded trace producer.
7. **Joint qualification and closure**

   Authorized native proof, exact receipts and final integration.

The proposed two construction Changes and one concentrated qualification/closure stage remain a sensible delivery envelope. This review does not prescribe additional Changes or require implementation-ready packets before architecture acceptance.

## **8. Final committee disposition**

| Review state                                       | Result                   |
| -------------------------------------------------- | ------------------------ |
| Independent analysis                               | Complete                 |
| Overall verdict                                    | **REVISE AND RE-DEFEND** |
| Unaffected architecture                            | **DEFENDED**             |
| Critical findings                                  | 0                        |
| High findings                                      | 1                        |
| Nonblocking findings                               | 2                        |
| Comprehensive re-review required                   | No                       |
| Additional architecture-stage experiments required | No                       |
| Verdict delivered                                  | Yes                      |
| Repository persistence                             | Pending custodian        |
| Owner ratification                                 | Pending                  |
| Implementation commission                          | Not granted              |
| Live operations                                    | None                     |

This verdict is bound exclusively to:

`e5015a1103d630a5bd821bc80068def32efebeee`

Deliver this receipt to:

`work/designs/open/durable-execution/committee/pass-01.md`

The review was conducted through read-only repository source inspection. No local checkout, pinned SDK compilation, runtime qualification or repository mutation was performed. The receipt is delivered inline for authorized custodian persistence.

## **Committee conclusion**

**The architectural direction is accepted. The remaining correction is small and localized.**

The design successfully avoids building a framework around an existing framework. Temporal retains execution authority, Agent Core retains agent policy, and the new runtime owns only the technical machinery necessary to operate them.

This is an appropriate next evolution of the internal monorepo foundations. Correct H01, verify its closure, and stop designing this iteration. The remaining engineering knowledge should come from building and exercising the actual system.