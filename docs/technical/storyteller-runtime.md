# Storyteller runtime and model routing

The storyteller is application code, versioned instructions, selected context, model inference and validated tools working together. Database rows hold preferences, facts and run records; they are not by themselves an agent. Likewise, adding LangGraph does not define a coherent storyteller.

## Initial orchestration

The implemented `@offscreen/ai/opening` component prepares and validates an opening request without database, HTTP, provider or workflow dependencies. It accepts a saved draft with a nonblank premise and captures its exact content and source revision. A blank title or direction is allowed. Saving an incomplete draft remains valid; preparing it for inference has a stronger prerequisite.

The request has stable application instructions and a separate JSON-encoded user message containing only title, premise and direction. Draft identity, ownership and revision are not sent to the model. This separation prevents application code from promoting player text into system instructions; it does not prove that a model will resist prompt injection or faithfully follow the premise.

The first output contract is one bounded, nonblank plain-text `opening` (at most 6,000 UTF-16 code units). It describes the character and immediate situation in prose. It accepts no extra fields: the model cannot supply lifecycle, source revision, effects or deadlines. `openingOutputSchema` supplies both runtime validation and JSON Schema for the eventual adapter. Structural validation does not verify narrative quality, premise fidelity or content suitability. Render the text literally, never as HTML.

The captured input has `inputVersion: 1` and `promptVersion: opening.v1`. Changing generation instructions requires changing the prompt version. Version labels do not themselves preserve old execution behavior: before durable retries are connected, retain the exact request artifact or implement version-aware reconstruction. The current component has no persisted attempts, provider call, repair loop or generated preview UI.

This textual preview is a building block for review, not a startable gameplay proposal. Starting requires the first decision/interval and selected play policies described below. Do not manufacture timers, stats, possessions or autonomous choices to fill that gap. Authorization, quotas, immutable persistence and stale-result checks belong to the application operation that will invoke this component.

Use bounded TypeScript steps within Temporal orchestration. Database/context I/O, provider requests and commits execute as Activities, with compact artifact references returned to the workflow:

```text
create operation -> load snapshot -> assemble context -> reserve budget
  -> generate proposal (optional bounded retrieval tools)
  -> validate structure and domain references
  -> bounded repair if eligible
  -> conditionally commit or mark stale/blocked
```

An initial recommendation is at most one repair attempt after the primary proposal, with a total operation budget and wall-time limit. Exact limits are runtime configuration, not scattered constants. Any tool round or model fallback consumes that same operation allowance.

Keep provider-call boundaries explicit so completing a later validation step does not require paying for an earlier successful call again. Store result artifacts before returning from the Activity and look up the operation/attempt on retry. A timeout with unknown provider outcome is a reconciliation case, not an automatic second request. Configure Temporal retry limits alongside SDK limits under the same budget. [Activity timeouts and retries](https://docs.temporal.io/develop/typescript/activities/timeouts).

World creation can require a richer bounded sequence: interpret premise/preferences, draft the local starting cast and situation, validate references, produce a preview. Do not launch one agent per person, faction or location. A single coherent structured proposal may outperform an elaborate multi-agent generation tree in both cost and consistency.

Some work needs no inference: waiting, displaying a stored passage, enforcing a deadline, validating quantities and applying an accepted transition. New narrative judgment, unusual intervention and a consequential continuation usually need generation. A cheaper model is not automatically suitable for validating another model's subtle mistakes.

## Where LangGraph fits

Begin without LangGraph. Temporal supplies durable orchestration; plain TypeScript defines the bounded model/tool steps. LangGraph may become useful for a sufficiently complex agent graph, but persistence alone is not a reason to add another execution engine. [LangGraph overview](https://docs.langchain.com/oss/javascript/langgraph/overview).

Keep model/context logic behind narrow functions used by Activities, so a later graph abstraction does not replace domain contracts. If a graph is introduced, define its bounded invocation and map every billable internal call to the same operation/attempt records. Retrying an outer Activity must not replay already paid inner calls blindly. Do not run a separate graph checkpointer as a competing authority for story progression.

Any graph state would concern a bounded generation operation, not the lifetime of the story. Long waits and player input remain in Temporal, and committed inventory/facts remain in PostgreSQL. LangGraph platform hosting is not part of the design.

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

The primary proposal separates what happens now from what may happen after a wait. Its schema must make those different fields, not depend on prose interpretation:

| Proposal part | Contract |
| --- | --- |
| Current passage and effects | Narration and typed changes to commit together for this resolution. |
| Next state | One of a decision, a quiet interval or an ending; not an arbitrary combination. |
| Decision | Choices with eligible actors and apparent intent/risk; fallback must fit the supplied autonomy policy. |
| Interval | Fictional duration and a suggested narrative boundary. Code maps that to real time under the chosen pacing policy. |
| Optional prepared continuation | A bounded future passage/effect packet with activation assumptions, stored privately until validated at publication. |

For “set out toward the tower,” departure can be current and arrival future. For “accept the apple,” becoming trapped can be immediate. A completed future packet cannot charge coins, change location or reveal an encounter before its activation. Limit the first horizon to one prepared continuation rather than an unbounded tree.

The application supplies permanent IDs, policy/permissions, response deadlines and authoritative random results. After accepting the current proposal, bind future material to its resulting revision and mapped entity IDs. Validate shape, reference scope, ownership, quantities and generation preconditions before commitment, and validate future material again on publication. A schema-valid lie can still contradict the story; evaluation and relevant context remain necessary.

Autonomy governs choosing for an absent player, while storyteller risk preferences govern which consequences may be introduced. They are not the same setting. A permitted “wait” fallback cannot by itself authorize any imaginable permanent consequence. Supply the applicable policy to generation and validate declared consequential changes against it; if the policy is unspecified, hold or request player input instead of pretending the prompt solves that product decision.

Begin by rendering the complete validated result. Show progress while generation is running. If later streaming prose improves perceived latency, label it provisional or stream a presentation of an already committed result. Never stream a private tool response or let partial prose decide inventory changes. Streaming tokens is distinct from SSE publishing committed application updates.

Useful initial tools are read-only: fetch a story-scoped entity, retrieve relevant passages and inspect a constrained current fact. Prefer supplying obvious relevant facts directly so the model does not waste a round asking for them. Bound tool count, result size and call depth. No arbitrary SQL, filesystem, outbound browsing or provider credentials belong in the storyteller's tool surface.

The model proposes effects; one application operation commits them. If chance rules are adopted, authoritative rolls are drawn once per resolution/check key and stored, then supplied to generation. A repair or retry must not roll again until it gets a desirable outcome.

Player text, retrieved passages and fictional dialogue are untrusted content, not authority to change system instructions or tool permissions. Bind story identity and authorization server-side instead of accepting them from model arguments. Render generated text through a restricted Markdown/text renderer; do not execute embedded HTML or fetch arbitrary model-supplied asset URLs. These boundaries are part of using generated content in a real application.

## Failure and provider behavior

Classify refusals, invalid outputs, timeouts, provider errors and stale inputs separately. A refusal is not a signal to keep searching providers until one accepts the same request. Validate that selected providers can support the intended tone and content before promising unrestricted generation.

Fallback routes must satisfy the original schema, data-policy and budget constraints. A cheaper failed call plus an expensive repair may cost more than a strong first attempt. Measure cost per accepted coherent continuation and latency to committed output, not just advertised tokens per second.

Provider outages, exhausted budget or repeated invalid proposals produce an explained hold if no valid prepared continuation exists. A template can report that fact; it cannot replace novel story judgment with a fabricated success.
