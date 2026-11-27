# Durable execution | Temporal and observable workflows

**Standing:** Open exploration, not a selected architecture or implementation commission. **Owner:** repository owner, supported by the designer. **Baseline:** main `b29a9d09bf42f0ce57c6c48b32f6fce343f3d8f2` (clean exported snapshot, 2026-11-27). **Next review:** 2026-11-28, or the next owner design/study session if later. **Next decision:** select the first useful, observable durable-execution evolution and its ownership boundary. No new Change, branch, live operation or spending is authorized by this dossier.

## Direction

Build durable execution as an understood engineering mechanism, not as a collection of RPG-specific jobs. Learn Temporal through the working system: inspect actual execution, deliberately exercise a bounded failure, observe what survives, and let the results inform the next evolution. Theory should support these experiments rather than become a prerequisite course before implementation.

Posture: clean-slate for the proposed new application execution foundation; evolutionary for its integration with the existing Temporal and observability infrastructure. Existing application code is a source of lessons, constraints and compatibility obligations, not the target architecture. Preserve production callers, persisted data, live Workflow identities and histories until a separate migration is selected. No wholesale rewrite or cutover is implied.

The working hypothesis is that workflows express the process owned by their domain or application, while reusable host, connection, delivery and diagnostic mechanisms have distinct technical owners. Prefer native Temporal semantics and small composition boundaries over building a second workflow engine or wrapping the entire SDK. A central Workflow package, domain-owned entrypoints, or a hybrid remain alternatives until inspected and compared. Do not select a new workspace name or move `@offscreen/workflows` merely for organizational symmetry.

## Starting evidence and ownership

| Area | Starting point | Meaning for this investigation |
| --- | --- | --- |
| Agent Core | [Package](../../../../packages/ai/agent-core/README.md), [technical contract](../../../../docs/technical/platform/agent-core.md), [bounded owner acceptance](../../archive/agent-core-monorepo-map/OWNER-ACCEPTANCE.md) | Generic mission runtime composes a native AI SDK loop in a Temporal Workflow. Synthetic host only; source accepted, not full native qualification or production adoption. |
| Temporal platform | [Infrastructure contract](../../../../docs/technical/platform/temporal-infrastructure.md), [runbook](../../../../docs/runbooks/kubernetes-temporal.md), [source](../../../../infra/platform/temporal/README.md) | Retain the existing server/platform ownership; investigate application-level integration above it. |
| Current application workflow code | [Workflows](../../../../packages/workflows/README.md), [Worker](../../../../apps/worker/README.md), [outbox relay](../../../../packages/outbox/src/relay.ts) | Existing deterministic RPG orchestration, host composition and delivery mechanisms to examine, not automatically carry forward. |
| Durable application contracts | [Execution and delivery](../../../../docs/technical/platform/execution-and-delivery.md), [persistence](../../../../docs/technical/platform/data-and-persistence.md), [spend](../../../../docs/technical/platform/spending-and-entitlements.md) | Temporal history is control-flow truth, not authority over committed application facts, access or money. Existing transaction, delivery and uncertain-effect safeguards remain binding. |
| Observability | [Native platform](../../../../docs/technical/platform/observability-native-infrastructure.md), [instrumentation owner](../../../../docs/technical/observability/telemetry-and-diagnostics.md), [developer foundation acceptance](../../archive/observability-developer/OWNER-ACCEPTANCE.md) | Local Grafana access and checks observed; not complete stack certification or existing application instrumentation. |
| Package organization | [Package map](../../../../packages/README.md) | `platform/workflows` is a candidate, not selected; physical moves and new workspace activation need separate decisions. |

Start the source study at `packages/ai/agent-core/src/runtime/execute.ts`, `test/mission.workflow.ts`, `test/qualification.mjs` and `test/qualification-recovery.mjs` in that package. Then trace `packages/workflows/src/index.ts`, `contracts.ts`, `apps/worker/src/runtime/{index,connections}.ts`, `apps/worker/src/outbox/dispatch.ts` and `packages/outbox/src/relay.ts`. These are investigation anchors, not delegated implementation instructions. The archived Agent Core qualification matrix and failed/unrun evidence stay intact; do not assume retirement of that dossier cleared those obligations.

## Candidate first evolution (E1, not frozen)

A small, provider-free durable execution specimen, running on the existing local development Temporal platform, with observable lifecycle from its very first working iteration. Prefer reusing or narrowly adapting the maintained Agent Core fixture host where it actually answers the question; introduce a simpler non-AI specimen if needed to distinguish native Temporal behavior from AI SDK behavior. Do not manufacture another runtime if the existing one suffices. The outcome should be a maintained, repeatable learning and engineering surface, not a throwaway collection of scripts.

A useful first slice would demonstrate starting a uniquely identified Workflow on an owned isolated queue, running a bounded synthetic Activity, inspecting history and results, and observing a waiting or recoverable execution across an owned Worker restart. Select the exact failure boundary and required proof after inspecting the existing fixture and qualification receipts. Compare a repeated start and/or a bounded retry/cancellation case with the normal run so the experiment can disprove a mistaken durability assumption. No real provider, game mutation, financial effect, user data, release queue or production Worker registration in this first slice.

The target gap is not another Temporal installation. It is the absence of a selected, understood and visibly demonstrated application execution foundation. If an existing maintained specimen already meets part of the target, reuse its evidence and implement only the missing part.

## Observable from the first working implementation

Owner direction: observability is part of each meaningful implementation slice, not a later instrumentation phase. We should be able to see what the mechanism does while learning and developing it. The first working evolution is not complete with only green tests or terminal success.

Use two complementary views:

- **Temporal Web UI / history:** actual Workflow identity, status, Activity scheduling and completion, waiting, failure, retry or cancellation when exercised. History is the execution evidence; a dashboard is not a replacement for it.
- **Grafana / existing local OTLP stack:** a useful, repeatable view of the supported execution lifecycle. Design static, bounded operational spans/events and safe metrics where meaningful; show actual backend query results, not merely successful OTLP submission or an empty dashboard. Prefer a small reproducible dashboard or documented query set, with clear units and meanings, over a speculative monitoring suite.

Select the telemetry contract alongside the execution mechanism. The accepted native developer lane currently admits only enrolled service names (`offscreen-agent-poc`, `offscreen-developer-proof`), scope `offscreen.operational.v1`, bounded attributes and three agent metric names with single-writer constraints. It does not automatically admit arbitrary Temporal SDK signals, new metric names or concurrent producers. Reuse this contract only where its semantics fit; if a new execution producer or metric is needed, explicitly evolve the relevant observability owner and prove admission rather than bypassing the filter or mislabeling agent metrics. Keep changes local to development unless separately accepted.

Correlate a synthetic execution to its telemetry via safe identifiers and a documented lookup, not by putting unbounded Workflow IDs in metric labels. No raw prompts, tool inputs/results, secrets, user identifiers or exception payloads. Telemetry failure must not change business correctness or become execution authority. No duplicate telemetry on replay claim without evidence: separate replay-safe Workflow observations from Activity/host-side export and account for repeated attempts and lossy delivery. The exact instrumentation points, correlation scheme, signal set and exporter ownership remain design decisions.

## Learn and design together

Use this sequence as a flexible investigation route, not a schedule of separate approval gates.

1. Trace a simple Agent Core mission: Workflow entrypoint, native loop, Activity boundary, trusted bindings and result. Inspect existing tests and receipts; learn Workflow, Activity, Worker, Client, namespace and task queue in context.
2. Observe a real synthetic run in Temporal UI. Read the event history, distinguish replay from a new execution, and understand the boundary at which an Activity may run again. Compare actual Worker restart behavior with the recorded history.
3. Examine host lifecycle, identity and delivery in existing Worker/outbox code. Identify which mechanisms should stay native, which have genuine shared ownership, and which are specific to legacy story workflows.
4. Select the smallest next architecture and its observable experiment. Research pinned upstream SDK behavior only where it resolves decisions; make discriminating specimens and iterate from actual evidence. Then freeze the bounded target, review at the appropriate risk depth, promote accepted meaning and implement it under the repository workflow.

## Decisions before freezing the first evolution

- Which concrete execution specimen is useful and minimal, and what already exists? What native proof remains necessary for reused Agent Core behavior?
- Who owns Workflow entrypoints, Activity contracts, host registration and lifecycle, client/start identity and queue selection? Does any new package actually need to exist?
- What retry, timeout, cancellation, replay and restart semantics are supported in this slice? What is the duplicate-delivery boundary, and how are unsafe effects excluded?
- Which telemetry is useful, safe and supported by the existing stack; where do instrumentation, correlation and reproducible dashboard/query artifacts belong?
- What is the compatibility boundary with current Worker, queues, histories and app closure? What evidence permits source integration without implying production readiness?

Before implementation, resolve these decisions against actual source and pinned upstream evidence, specify the chosen behavior, scope and exact proof, and apply the repository's proportionate design review. Before accepting the evolution, demonstrate the selected normal and diagnostic negative cases with actual history/results, observe the matching admitted telemetry in its backend/Grafana view, and preserve the exact revision, environment, limitations and owned-resource cleanup evidence. No telemetry-only proof of execution correctness and no source-only claim of live qualification.

## Later candidates, deliberately unresolved

Transactional delivery/outbox renewal; domain-owned workflows and migration/versioning of live histories; production Worker topology, concurrency and task routing; richer workflow interaction (signals, queries, updates, child workflows and long-running lifecycle); real-effect idempotency and uncertain-result reconciliation; production inference, spend authorization and persistent agent state. These need concrete consumers and appropriate safety proof, not speculative modules in E1.
