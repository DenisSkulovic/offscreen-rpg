# LangChain / LangGraph

## Fit
Distinguish high-level LangChain createAgent (prebuilt loop) from low-level LangGraph state/control-flow runtime. We do not need to design a graph manually merely to gain tool calling. [LangChain 1.6.8 source](https://github.com/langchain-ai/langchainjs/tree/a22d0d0c4cb8ec345c2650e1a8aaec8a6a751f74), [middleware](https://github.com/langchain-ai/langchainjs/blob/a22d0d0c4cb8ec345c2650e1a8aaec8a6a751f74/libs/langchain/src/agents/middleware.ts#L144-L210) exposes wrapToolCall and wrapModelCall. These are useful control seams, but their exact coverage must be proven. MIT; Node >=20. LangChain manifest depends on LangGraph ^1.7.2 and checkpoint ^1.2.2, plus LangSmith. Do not conflate LangGraph wrapper package version with core version.

## Durability trade-off
[LangGraph pinned runner](https://github.com/langchain-ai/langgraphjs/blob/61aad39ef67051aa04cacd57b75a60538c5fd72d/libs/langgraph-core/src/pregel/runner.ts) executes graph tasks and saves pending writes to checkpointer; [persistence docs](https://docs.langchain.com/oss/javascript/langgraph/persistence) distinguish thread checkpoints and cross-thread stores. Interrupt/replay state is separate from external effect completion. No TypeScript LangGraph plugin in inspected Temporal integration tree; Python integration is not TS evidence.
Three possible boundaries:
1. LangGraph is durable engine for agent, Temporal schedules one coarse mission Activity. Agent checkpoint ownership explicit; retry whole Activity must resume exact run, not launch fresh graph; still requires effect ledger.
2. Temporal owns durability, use LangChain runtime within Workflow only if deterministic sandbox compatibility proved. No native TS bridge shown; custom integration cost high.
3. Run LangGraph non-durable loop in Activity; simpler but loses per-round replay unless application persists progress. Inadequate default for our stated requirements.
Avoid two authorities for same execution state. Graph checkpoints are not historical scene forks or Library roots.

## Specimen
Only if graph expressiveness or middleware coverage proves superior: fake model + tool through LangChain wrapModelCall/wrapToolCall with checkpointed resume; crash after graph checkpoint vs effect; identity, revision and budget checks; ensure LangSmith tracing disabled unless explicitly configured. Compare coarse Temporal boundary and graph resume semantics, concurrency of same thread, cancellation, schema upgrades and checkpoint retention. Need exact release and source compatibility. No tests run.

## Assessment
Credible alternative if we need complex graph-shaped agents or intentionally choose LangGraph as agent durability authority. For initial iterative Storyteller, likely unnecessary second execution engine. Do not reject based on fashion or assume Python integration can be imported into TS. Defer experimental spend pending primary cohort.
