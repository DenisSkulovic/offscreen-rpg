# Storyteller runtime and model routing

The storyteller is application code, versioned instructions, selected context, model inference and validated tools working together. Database rows hold preferences, facts and run records; they are not by themselves an agent. Likewise, adding LangGraph does not define a coherent storyteller.

## Initial orchestration

Start with an explicit bounded workflow in TypeScript:

```text
claim operation -> load snapshot -> assemble context -> reserve budget
  -> generate proposal (optional bounded retrieval tools)
  -> validate structure and domain references
  -> bounded repair if eligible
  -> conditionally commit or mark stale/blocked
```

An initial recommendation is at most one repair attempt after the primary proposal, with a total operation budget and wall-time limit. Exact limits are runtime configuration, not scattered constants. Any tool round or model fallback consumes that same operation allowance.

World creation can require a richer bounded sequence: interpret premise/preferences, draft the local starting cast and situation, validate references, produce a preview. Do not launch one agent per person, faction or location. A single coherent structured proposal may outperform an elaborate multi-agent generation tree in both cost and consistency.

Some work needs no inference: waiting, displaying a stored passage, enforcing a deadline, validating quantities and applying an accepted transition. New narrative judgment, unusual intervention and a consequential continuation usually need generation. A cheaper model is not automatically suitable for validating another model's subtle mistakes.

## Where LangGraph fits

LangGraph JS is a candidate for the bounded generation workflow when branching retrieval, repair or checkpointed intermediate work earns its complexity. It supports graph orchestration and persistence; checkpointing still requires disciplined side effects and correct integration. [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview), [persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence).

Implement the first pipeline behind one `StorytellerRunner` interface. Evaluate it with plain TypeScript first or a small LangGraph spike; select one implementation before expanding, not two permanent engines. If the flow is one structured call and validation, retain plain TypeScript. If resumable multi-step work materially saves completed calls or clarifies branches, use LangGraph inside the worker.

If adopted, each graph thread corresponds to a generation run, not the entire lifetime of a story. PostgreSQL domain state and schedules remain authoritative. Checkpoint references point to immutable inputs/results; they do not become a second inventory or deadline system. Do not leave a graph invocation sleeping for five real hours waiting for a player: finish the operation and let the application schedule the next one. LangGraph platform hosting is not required merely to use the library.

## OpenRouter and LiteLLM

Use OpenRouter as the initial hosted gateway, accessed only from workers through a narrow TypeScript adapter. Its routing controls include provider ordering, capability requirements, price limits and data-policy restrictions. Select those explicitly rather than assuming every endpoint supports the same structured-output and tool features. [OpenRouter provider routing](https://openrouter.ai/docs/guides/routing/provider-selection).

OpenRouter offers access to a range of model prices; it does not make the same inference intrinsically cheaper. Its pricing page lists platform fees as well as model access. Compare actual billed cost, quality, latency and retry rate, including fees, before picking a route. Do not depend on free endpoints for reliable timed gameplay. [OpenRouter pricing](https://openrouter.ai/pricing).

LiteLLM provides a separate SDK/proxy layer for accessing models and managing gateway concerns. It is not required to use OpenRouter. Running its proxy would add an operated service and overlapping routing/budget behavior. Introduce it only if multiple applications, direct-provider credentials or centralized gateway administration justify it; otherwise the application adapter is enough. [LiteLLM overview](https://docs.litellm.ai/docs/).

Use a maintained TypeScript client behind the adapter after verifying usage reporting, aborts, schema support and provider metadata. A direct HTTP client is also viable. Do not simultaneously introduce a gateway proxy, a broad AI SDK and framework model wrappers without assigning each a necessary responsibility.

## Configuration and quality profiles

Resolve a model policy from task kind, story quality preference, funding entitlement, remaining budget, required capabilities and measured route health. A user-facing “fast” or “richer” preference is relative to that story's allowed tier. It is not a model ID and does not override spending or privacy constraints.

Illustrative policy shape, with no selected model names or prices:

```ts
type ModelPolicy = {
  version: string;
  task: 'create' | 'continue' | 'summarize';
  candidates: Array<{
    modelId: string;
    allowedProviders: string[];
  }>;
  maxInputTokens: number;
  maxOutputTokens: number;
  maxAttempts: number;
  timeoutMs: number;
  maxCostMicrousd: string;
  requireStructuredOutput: boolean;
};
```

Store an effective immutable policy version with each run and the actual model/provider with each attempt. Admins may change the active policy for future runs without redeploying domain code. Validate and allowlist configuration; players cannot supply arbitrary provider URLs, credentials or executable prompts. Restrict user-created storyteller prose to preference data below application instructions.

Start with a few evaluated routes, not an LLM that selects another LLM on every call. In shared stories, one agreed funding scope and policy governs a resolution. Commercial tier names, subscription prices and the payer rule are product decisions still to make; implement development quotas without building a payment system first.

## Structured output, tools and streaming

These are separate dimensions. Structured output describes the expected result format. Tool calling lets the model request specific application operations. Streaming delivers output incrementally. A model can stream structured content, but partial JSON is not a valid committed transition. OpenRouter structured output support depends on the model/provider. [Structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

The primary proposal contains player-facing narration, constrained state changes, next choices, time estimates and optional conditional continuation. The application supplies IDs, permissions, deadlines and any authoritative random results. Validate shape, reference scope, ownership, quantity rules and generation preconditions before commitment. A schema-valid lie can still contradict the story; evaluation and relevant context remain necessary.

Begin by rendering the complete validated result. Show progress while generation is running. If later streaming prose improves perceived latency, label it provisional or stream a presentation of an already committed result. Never stream a private tool response or let partial prose decide inventory changes. Streaming tokens is distinct from SSE publishing committed application updates.

Useful initial tools are read-only: fetch a story-scoped entity, retrieve relevant passages and inspect a constrained current fact. Prefer supplying obvious relevant facts directly so the model does not waste a round asking for them. Bound tool count, result size and call depth. No arbitrary SQL, filesystem, outbound browsing or provider credentials belong in the storyteller's tool surface.

The model proposes effects; one application operation commits them. If chance rules are adopted, authoritative rolls are drawn once per resolution/check key and stored, then supplied to generation. A repair or retry must not roll again until it gets a desirable outcome.

Player text, retrieved passages and fictional dialogue are untrusted content, not authority to change system instructions or tool permissions. Bind story identity and authorization server-side instead of accepting them from model arguments. Render generated text through a restricted Markdown/text renderer; do not execute embedded HTML or fetch arbitrary model-supplied asset URLs. These boundaries are part of using generated content in a real application.

## Failure and provider behavior

Classify refusals, invalid outputs, timeouts, provider errors and stale inputs separately. A refusal is not a signal to keep searching providers until one accepts the same request. Validate that selected providers can support the intended tone and content before promising unrestricted generation.

Fallback routes must satisfy the original schema, data-policy and budget constraints. A cheaper failed call plus an expensive repair may cost more than a strong first attempt. Measure cost per accepted coherent continuation and latency to committed output, not just advertised tokens per second.

Provider outages, exhausted budget or repeated invalid proposals produce an explained hold if no valid prepared continuation exists. A template can report that fact; it cannot replace novel story judgment with a fabricated success.
