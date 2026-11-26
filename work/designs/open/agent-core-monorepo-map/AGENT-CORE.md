# Agent Core | illustrative responsibility tree R5

Outer package placement follows the owner-selected R2 grouping convention; the internal subfolder tree is illustrative, not a selected API, dependency graph or implementation. Generic machinery for bounded agent execution, independent of Storyteller. Preserve earlier conceptual distinction between definition, instance, mission, runtime and durable execution state; whether persistent instances are mandatory remains open.

```text
packages/ai/agent-core/
  README.md
  src/
    identity/
    missions/
    runtime/
    loop/
    context/
    tools/
    compaction/
    delegation/
    execution-state/
    policy/
    telemetry/
  test/
```

| Area | Responsibility | Boundary |
|---|---|---|
| identity | Definition, instance/configuration semantics and version references | No account authentication or DB schema decision |
| missions | Objective, inputs, bounded execution envelope, output and stop criteria | Domain decides meaning of mission |
| runtime | Assemble execution environment from supplied capabilities | Host composes actual adapters |
| loop | Integrate established SDK loop, enforce local semantics, stopping and yielding | Borrow-first; no bespoke loop unless demonstrated need |
| context | Assemble messages, history, references, token allowances and selected tools | Domain supplies relevant knowledge and policy; no Library internals |
| tools | Registry, discovery, eligibility, exposure, schema validation, dispatch and result handling | Concrete tools and resource authorization remain with capability owners |
| compaction | Optional bounded history/context reduction with provenance and fidelity constraints | Never silently replace authoritative history; need not implement initially |
| delegation | Bounded child missions, supervision, cancellation, scoped result contracts | Children cannot amplify grants or funding |
| execution-state | Generic checkpoints, pending action identity and resume semantics | Postgres vs Temporal truth/transaction boundary unresolved |
| policy | Enforce execution ceilings, current authority, budget and capability decisions supplied by owners | Not commercial entitlement or ledger authority |
| telemetry | Agent lifecycle events and correlation | Process/exporter owns flushing; no raw private prompt logging by default |
| test | Deterministic fake model/tool/runtime scenarios | No paid inference implied |

## Cross-cutting considerations
Reasoning effort: mission chooses desired effort, model capability constrains it, provider translates wire representation, financial authority admits spending. Agent loop can consume model-selection and inference interfaces without owning their catalogs or transports. No Redis caching logic in core. Storage-neutral contracts only as justified by consumers; do not invent abstract persistence layers prematurely.

## R3/R4 runtime direction
See [current technology-selection dossier](technology-selection/README.md) and [initial research](AGENT-RUNTIME-RESEARCH.md). Vercel, OpenAI Agents and Strands are primary experiment candidates; no chosen dependency. The folders are responsibilities, not a custom implementation quota. SDK-provided loops, delegation, compaction and state machinery may shrink or eliminate folders. Temporal-native integration is promising but must pass custody and authorization experiments. Host owns Worker configuration; Workflow-safe orchestration and Activity-side effects must be separated. No agent framework owns Library authority, billing, or durable financial custody.

## R5 execution hypothesis
See [execution architecture comparison](technology-selection/EXECUTION-ARCHITECTURES.md). SDK loop in deterministic Workflow, effectful Activities outside it, one admitted mission per Workflow binding, custody-aware guarded inference and explicit child admission. This is a common candidate shape, not selected runtime or transaction contract.

## Questions before design selection
- Can a framework provide loop/tool/message machinery without taking over our authority, durable custody and lifecycle semantics? Compare custom TS, suitable current agent SDKs/frameworks, and Temporal-centered/hybrid execution via official docs and specimens; no framework selected.
- What is durable instance vs definition vs mission? What are the retention, identity and concurrency boundaries for persistent and temporary agents?
- Which effects need idempotency or uncertain-result hold rather than retry? How do grants and cost reservations survive crash and revocation?
- Which context/compaction/delegation mechanisms are necessary for the first real Storyteller outcome, and which can be omitted?
- What belongs in reusable AI invocation outside agents (including image/video)? Avoid overgeneralizing.
- Who owns durable execution truth between SQL and orchestration? Select independently of cache and document storage.

Later proof specimens: direct non-agent inference and agent sharing a route; fake model/tool loop with denied tool and crash after effect; child cannot exceed parent grant; versioned document reconstructs exact historical Markdown without Library concepts; Library cross-root access denial; telemetry failure cannot lose billing facts. These are investigation prompts, not frozen acceptance or executable tasks.
