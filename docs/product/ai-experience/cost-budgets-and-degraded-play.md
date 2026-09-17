---
id: DOC-AI-BUDGET
layer: product
status: draft
domains: [ai-experience]
tags: [affordability, autonomy, offline-play, continuity]
updated: 2026-09-17
relations:
  - type: derives_from
    target: DOC-PRODUCT-PRINCIPLES
  - type: depends_on
    target: DOC-TIME-AUTONOMY
  - type: depends_on
    target: DOC-KNOWLEDGE-BELIEFS
---

# AI contribution, spending and degraded play

Confirmed goals remain affordable unattended life and configurable spending. D064 reopens the earlier division between substantial per-activity logic and selective models: lightweight story progression may depend more heavily on model adjudication. The scope/cost consequences must be evaluated rather than assumed away. Denis's examples range from a few cents to roughly a dollar or somewhat more for a week away. They express a desired affordability range, not an accepted budget or measured feasibility result. All contracts and numbers below are proposals.

This document owns when expenditure is justified and what the player experiences. Provider integration, algorithms, data structures and specific model selection remain technical work for later.

## Three responsibilities

**Story judgment:** interpret an intention, assess plausible duration and consequences, generate options and continue the story. The proposed lightweight version gives models more of this work instead of requiring specialized mechanics for each activity. Preserve character knowledge, campaign permissions and any adopted check result.

**Consistency and execution:** the application maintains authoritative committed facts, verifies relevant quantities/constraints, resolves adopted rolls once, schedules due changes and honors pause/cancellation. Models may propose contextual changes; they do not directly bypass this contract. Structural checks cannot guarantee semantic coherence.

**Presentation:** express actual outcomes, current choices and recaps. Combine compatible narration and adjudication work where useful; do not use a second call merely to paraphrase every result. A prepared narrative is not proof its future event has happened.

## Candidate decision nodes

| Node | Possible model contribution | No-model behavior |
| --- | --- | --- |
| Opening | Premise, relevant facts and initial intentions | Use a valid prepared example only if explicitly presented as such |
| Selected next story segment | Contextual adjudication, duration, options and bounded conditional continuation | Execute an existing still-valid segment; no new novel outcome is implied |
| Due checkpoint, clock, accepted transfer or adopted roll | Usually none | Check eligibility and apply the permitted result once |
| Player redirection or unexpected choice | Interpret and judge the changed situation | Offer valid prepared choices or disclose that new generation is needed |
| Autonomous continuation | Short prepared default or budgeted new judgment | Follow valid authorized prepared behavior; block visibly if none exists |
| Recap | Optional prose synthesis of relevant recorded facts | Factual current-state/history view remains available |

These are responsibilities, not one mandatory call or service per row. A single bounded request may prepare a short segment and its options, but generating every option's entire future wastes work when the player chooses only one.

## When to spend more

Reuse relevant context/content and still-valid planned outcomes. Call a model for actual new judgment or meaningful expressive value, not to check the clock or decide every minute whether a model call is necessary. Bound response size, tools, repair attempts and planning horizon together. Discarding invalidated pre-generation is part of real cost, not a free operation.

Higher budget may affect narrative variety and adjudication; it is not permission to change character capabilities, rewrite history or exceed gameplay limits. Repeated comparable judgments may vary even across identical models; evaluate this explicitly. Spending allowance is a ceiling, not a target to exhaust.

## Proposed spending contract

| ID | Draft behavior |
| --- | --- |
| AI-COST-001 | Player spending limits bind narration, autonomous choices, generation, retries and fallback models together. A character's personality cannot bypass them. |
| AI-COST-002 | Show unattended and active-play allowances separately, plus an overall limit, currency, accounting interval and reset behavior. Budget periods use real time, independent of campaign acceleration. |
| AI-COST-003 | Before admitting a paid request, its bounded potential cost must fit remaining allowance, accounting for outstanding calls and retries. If cost cannot be bounded, that route cannot satisfy a strict cap. Actual billed usage remains visible. |
| AI-COST-004 | Reaching a limit stops optional generation. Still-valid prepared continuation and implemented generic fallbacks may execute; arbitrary novel story judgment cannot be promised without a call. When no legitimate continuation fits, pause at the unresolved boundary and explain the generation block. This proposed policy and actual fallback coverage still need agreement. |
| AI-COST-005 | No automatic paid upgrade, unlimited repair loop, or later burst of unrequested background narration. At most a bounded retry/fallback allowance chosen for the node. |
| AI-COST-006 | A delayed or rejected model response cannot retroactively change resolved play. A retry cannot award a second reward or spend the same fictional resource twice. |
| AI-COST-007 | Distinguish reduced presentation, paused progression and ongoing logical simulation. Never imply the character has continued living if progression stopped. |
| AI-COST-008 | Changing provider/model preserves campaign facts and accepted rule authority. Unsupported capabilities trigger an explicit fallback instead of silently changing the game contract. |

Automatic top-ups, exact reset intervals, caps and notifications are unselected. A hard API ceiling is not a promise about total hosting/electricity/storage cost. Provider fees and billable reasoning, cache operations, request charges or other services must be included where applicable; do not estimate only the visible response words.

## The unresolved fairness choice

Richer narration can vary without changing mechanical results. Richer decision-making can change which valid action is selected and therefore the story and survival odds. “All tiers use the same rules” does not eliminate that difference.

AI-F01 is reopened by D064. In a model-adjudicated game, spending/model choice can affect consequential judgments, not just prose. Recommend shared hard limits and any adopted check semantics, with model-dependent variation disclosed and evaluated. A mechanically identical inexpensive/rich outcome guarantee is not credible without a separate deterministic resolution system, which is no longer assumed.

The user explicitly welcomes hybrid logic/LLM nodes; this fork asks how far the resulting behavioral difference should go, not whether hybrid handling is permitted in principle.

## Cost arithmetic: a feasibility envelope, not a quote

Illustrative price profiles only: economical input/output at $0.25/$1.25 per million tokens, and richer at $3/$15. These are deliberately hypothetical, not a vendor recommendation or current model price. Assume 3,000 input tokens and 300 billable output tokens per call; no cache discounts, extra reasoning, tools, request fees or retries. Each call costs $0.001125 or $0.0135 respectively.

| Workload over seven real days | Calls | Economical profile | Richer profile |
| --- | ---: | ---: | ---: |
| Selected moments plus recaps | 40 | $0.045 | $0.54 |
| One call every hour | 168 | $0.189 | $2.268 |
| One call every minute | 10,080 | $11.34 | $136.08 |
| 100 NPCs, one call each per hour | 16,800 | $18.90 | $226.80 |

Forty calls is an illustrative total workload, not a promise that all campaigns fit it. On the same assumptions, a $0.50 cap admits at most 444 economical or 37 richer calls before other charges. A reasonable target to investigate is a quiet unattended week below $0.10 with a selectable $0.50 ceiling; both remain proposals. A disruptive week must fit the cap by reduced generation or an explicitly reported pause, not by secretly spending more.

Active conversation has a different envelope. One hundred interactions at 6,000 input and 600 output tokens each would cost $0.225 or $2.70 under those same hypothetical rates. Multiple calls per interaction multiply that. A longer campaign must not require sending its entire history on every turn; identify only the established facts needed for the node. Later technical work chooses how.

## Providers and qualification

Research checked 2026-09-16: OpenRouter documents model fallbacks and provider routing with price, latency and throughput preferences. Its provider `max_price` is a unit-price filter, not our campaign's weekly expenditure policy; performance preferences are not guaranteed response times. This supports considering it as an integration candidate, without choosing it. [Provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), [model fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks).

Its pricing page currently lists a 5.5% pay-as-you-go platform fee; exact checkout and billing terms should be checked when selecting a route. Our arithmetic excludes that fee. [Pricing](https://openrouter.ai/pricing).

Qualify models by role using the same small scenario set: valid permitted actions, respect for hidden information, portrayal of traits, consistency, useful prose, actual latency, all-in cost, and fallback rate. Fast/cheap/smart/vivid are separate properties. A model that frequently needs repair may be poor value despite low token prices. No live paid benchmark or account setup was performed for this review.

## What must be decided next

Opening generation and novel continuation have separate workload profiles. A cheap unattended-week budget must not silently authorize expensive setup or pre-generation. Reuse established context and valid short continuations; do not require generated executable mechanics to tell a new kind of scene. The [preparation contract](../worlds/starting-worlds-and-content.md#mechanical-variety-and-simple-setup) owns how unsupported mechanics are disclosed. A scale transition does not automatically authorize generating every newly relevant microscopic entity or repeatedly asking a model for physical laws.

Resolve AI-F01, actual setup/active/unattended limits and the explicit essential-no-fallback policy. Ordinary supported continuation is the current direction; browser/computer-closed progression and phone contact are already selected by D038, not an unresolved availability choice. Use [reference scenarios](../validation/reference-campaigns-and-journeys.md) to expose the experience before choosing infrastructure.

## Caching and an achievable web MVP

Distinguish three optimizations: reuse already generated world content; reduce/reuse repeated model input where a provider supports prompt caching; and manage inference KV/prefix caches when operating a model-serving runtime. They solve different problems. A cache is not the authoritative campaign state or a substitute for retrieving the correct current facts.

Official OpenRouter documentation describes provider-dependent prompt caching. That is a candidate for hosted inference; cache eligibility, routing, lifetime and charges need validation. [Prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching), checked 2026-09-16. vLLM documents prefix caching that reuses KV state for shared prefixes; this is a serving-runtime capability, not control over a hosted provider's GPU from the web application. [vLLM prefix caching](https://docs.vllm.ai/en/v0.9.2/features/automatic_prefix_caching.html), versioned documentation checked 2026-09-16.

Recommend generated-content reuse, bounded per-node context, actual usage visibility and provider-supported caching where beneficial for the initial app. Treat self-hosted GPU serving/KV optimization as a later experiment unless a measured workload justifies it. Do not promise a GPU cost saving without comparing operating expense and maintenance. Clock checks, applying a valid prepared outcome or explicit transfer, and factual notifications need no model call. Novel progress/outcome judgment may require one; no specialized movement/wage engine is presumed.

World creation may dominate a short demo's inference cost; frequent active dialogue could dominate a longer campaign. Measure setup and ongoing usage separately. Omitting dialogue in the first release is a valid proposed saving, not proof of a particular weekly bill. In an account-hosted web platform, do not share private campaign context or generated responses across users through an incorrectly scoped cache.

## Generation and director inference envelopes

For D043, distinguish world preparation, occasional director deliberation, actor choice and narration. They may share a model or use different models; none requires an always-running LLM process. Recommend logic to identify eligible decision opportunities, with a bounded real-time allowance and campaign pacing policy for model use. Accelerating fictional time must not multiply paid calls without limit. Skipping an optional director call preserves ordinary simulation; it does not silently skip an already admitted event's mechanical consequences.

Generation context should include the premise, supported constraints and established facts needed by the current responsibility. Director context should include relevant places/actors, current consequential state, selected unresolved threads, recent outcomes, authority limits and applicable policy. Actor context must respect that actor's knowledge. Do not send the whole world/history to every node, and do not let a summary replace authoritative facts. Later technical design chooses retrieval, versioning, reusable prefixes and invalidation.

Record the purpose, bounded allowance, admitted/rejected result and actual usage of each call sufficiently to evaluate it. Bound tool steps, retries and delegation as part of the same allowance. Compare the director with a procedural baseline for coherent consequences, useful variety, contradiction rate, latency and cost. If richer selection changes world events, disclose that behavioral effect; AI-F01's fairness choice also applies to directing. A cheap unattended week remains a cost target to measure, not guaranteed by calling a component an agent.

## Storyteller styles share an inference contract

D045–D046 intend LLM-based incident creation/selection across selectable styles. A preset is behavioral configuration, not necessarily a separate agent process or model. Supply the active style, allowed incident/effect space, relevant state, recent incidents and selected unresolved threads. Use logic for eligibility, pacing ceilings and budgets; use the model where creative selection and connections add value. Ordinary simulation and admitted consequences remain independent of whether the next optional call is affordable. Procedural fallback or deferred optional incidents must be explicit degraded behavior, not a claim that an LLM is still directing. Evaluate preset differences in actual event choices/cadence and coherence as well as prose; test that switching cannot reset spend or bypass limits.

## Long-gap continuity without population inference

For D047–D048, context selection must find relevant established entities, object transfers, relationships and unresolved obligations, not merely recent prose. A storyteller that recalls Bob but forgets that his spear was destroyed is not consistent. Use compact current facts plus relevant history as requirements; exact retrieval, indices and memory mechanisms remain technical choices. Summaries and caches are aids, not authority. Dormant entities need no recurring model refresh. Measure continuity across long gaps and cost against relevant context size, separately from total lore size and active simulation load.

## Technical handoff: storyteller context and tool experiments

For v0.01, derive a small, inspectable context/tool contract from these product boundaries. This is an assistant design recommendation, not a selected framework or tool schema.

- Context separates binding campaign facts, character-visible knowledge, last observations, unresolved threads and nonbinding storyteller plans. Relevant old connections must be retrievable beyond recent prose.
- Read access and creative proposals are distinct from committing mechanical changes. A proposed incident can contain new entities and supported effects, but validation and current permissions decide admission.
- Generated prose, user world descriptions and retrieved lore are content, not authority to change budgets, policies or tool permissions. The narrator cannot execute arbitrary code or obtain unrestricted database access merely because a story asks for it.
- Bound model calls, context size, tool steps and repair attempts per responsibility. Demonstrate a quiet interval without calling a model to decide every tick whether another call is needed.
- Inspect input context, proposed output, admission/rejection reason, resulting facts and usage in a development view. Keep hidden world facts out of the player-facing recap; diagnostic access is not character knowledge.
- Evaluate a small repeatable set: valid incident, contradictory identity/custody, omitted old obligation, hidden-fact leakage, unsupported effect, stale response, exhausted budget and nonresponse fallback. Keep mocked runs distinguishable from paid live evaluation.

Do not turn this into a second product specification or a mandatory multi-agent design. The experiment should reveal where retrieval, constraints or creative variety fail and guide the next small change.

## Measuring the simplified version

D064's reduced code complexity changes the inference workload. Measure calls per meaningful continuation, per active intervention and per real day, separating quiet compressed intervals, frequent decisions, long-gap context and canceled plans. Compare short preparation with generating at every boundary. Do not use the hypothetical pricing table as proof that a model-adjudicated week will meet its target.

Quiet intervals can summarize several ordinary actions without one call per action, and the application can publish valid prepared content later. However, preparing a full unattended week in advance sacrifices responsiveness and may waste tokens after the first interruption. Test a short horizon first. A model outage/budget limit exposes the real amount of autonomy supported by prepared content; disclose it instead of quietly adding the removed activity engine back into scope.
