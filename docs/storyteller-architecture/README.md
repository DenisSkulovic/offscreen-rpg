# Storyteller architecture renewal | a creative mind anchored to earned life

**Design initiative, 2026-11-14.** **Status: selected analysis and proposed end-state; owner review before code authorization.** No application code, model spending, database reset, production deployment or current Change selection is implied. **The original [game vision](../vision.md) is the constitution**; implementation history is evidence, not an authority to narrow the dream. The [engine target](../engine-architecture/product-derived-requirements.md), [gameplay vocabulary](../concepts.md), [Storyteller preferences](../storyteller-settings.md), and [time/usage policies](../technical/context-and-cost.md) remain companion authority.

## The fundamental question

Can a long-lived, highly personalized Storyteller preserve a character's actual history, investigate the right evidence, cultivate world-appropriate possibilities, and produce coherent next situations under bounded rules, time, latency and money? **Without** manufacturing the claim that a model is a persistent autonomous character, treating narrative creativity as mechanical authority, or demanding one model call for every background minute.

The target is **a bounded, task-adaptive Storyteller operating system around disposable model work**, not an unlimited chat thread, universal agent framework or a model pretending to run a whole world from prose. A character's life persists in authoritative mechanics and versioned narrative/source memory; each Storyteller operation reconstructs exactly the relevant working context, optionally investigates, proposes, validates and publishes.

This initiative reopens product-level Storyteller **capabilities** and their quality, rather than another blind code quality overhaul. If current implementations contradict the desired design, the end-state wins; migration must still preserve successful committed state, source evidence, payer authority and old in-flight tasks.

## Start here in under five minutes

| Question | Document |
| --- | --- |
| What must the system ultimately deliver, and where may engineering be ambitious? | **[Vision-derived acceptance constitution](vision-and-quality-constitution.md)** |
| What does the current code actually do, from a new campaign to a paid turn and publication? | **[Source-grounded execution traces](evidence/current-flow-audit-2026-11-14.md)** |
| Is this an agent, how real is its loop, where are the weaknesses? | **[Agent capability and risk audit](evidence/agent-capability-audit-2026-11-14.md)** |
| What is the preferred desired architecture independent of code? | **[Target Storyteller operating model](target-operating-model.md)** |
| How should a Storyteller discover truth, use memory, and prepare context? | [Context and retrieval design](context-and-retrieval.md) |
| What should prompts, tools, model routes, caching and disposable task conversations look like? | [Prompt, tool and transport design](prompt-tools-and-models.md) |
| How should tiers, effective budgets, latency, retries, availability and cost interact? | [Effort, money and lifecycle design](effort-cost-and-lifecycle.md) |
| How do we prove gameplay, not merely unit green tests or valid JSON? | [Evaluation and experiments](evaluation-and-playability.md) |
| Which exact code Changes can Cursor implement, and in what order? | **[SA01–SA12 implementation program](implementation-program.md)** |

The permanent target documents own architecture, the dated evidence pages own *inspected current source*, and each `docs/changes/2026-11-14--sa*` packet owns a future independently verifiable code delta. Do not treat an old historical doc's “implemented” badge as new proof.

## Immediate executive verdict

| Aspect | Source-backed state | Product/design assessment |
| --- | --- | --- |
| Durable Storyteller job identities, SQL/Temporal, publication and immutable source | Real; source-backed | **Keep**; serious correctness foundation |
| Default ordinary task | One model call, optional single repair; no tools | **Keep as cheap fast lane**, but not the universal best lane |
| Agentic exploration | Real persisted `memory-exploration.v1` controller with `ask_memory/read_memory`; 2–3 model rounds, max 6 reads | **Real narrow agent**, not broad investigative Dungeon Master |
| Evidence/context selection | Current SQL, recent/scene passages, notes, bounded canonical documents and library sections; deterministic omission | Strong foundations, but selection/coverage/final visibility need work |
| Retrieval quality | Indexed OR-lexical source index, current-root validated; synthetic 9/12 retrieval cases at 200/2k, 6/12 assembled | A measurable baseline, not reliable long-term narrative memory |
| Task/effort tuning | Effective policy + resource recipe; ordinary tasks default exploration OFF; preset profiles are creative text guidance | Need **task-need classifier, independent effective policy dimensions and observable quality/cost tradeoffs** |
| Model and cache | OpenRouter one-shot/rounds, strict schemas, cost audit and cached-token telemetry; reasoning forcibly off in request | Need route capability reviews, prefix discipline and measured cache outcomes before optimizing |
| Narrative strategy over weeks | Profile, notes, selected documents, private possibility patches | Not a tested policy-driven longitudinal narrator, especially quiet/ordinary life |
| Sustained gameplay quality | Historical six-generation connected sample, not 10–15-turn owner-accepted POC | **Not proven**. Must evaluate real consequences, continuity, style and enjoyment |
| Production scale and bill protection | Strong per-attempt funding/windows, but some context/index work rebuilds under per-turn load | Requires lifecycle/performance evidence, not extra model workers by default |

**Most dangerous failure mode:** the engine can be mechanically correct while the model creates bland, repetitive, ungrounded or incoherent play. Conversely, beautiful prose can mask invented mechanics or unearned progress. We must measure both independently and together.

## Scope and non-goals

**Within Storyteller initiative:** task classification, prompt/evidence architecture, retrieval, memory preservation, tool boundaries, resource recipes, provider/route capabilities, caching experiments, model-operation lifecycle, private narrative direction (future, with captured player choice), professional observability and playable quality evaluation.

**Separate programs, no stealth changes:** ENG03 lock-capture refactor, ENG05 shared CAS, GM01/02 custom-intent admission, GM03 standing routines, GM04 failed-offer distinctness, GM05/06 Journal public event cursor, GM07 delegated decisions, PW01 published appearance, PF public platform, commercial billing and operator UI. Storyteller may need their read/intent contracts but **does not implement their mechanics**.

**Rejected defaults:** LangChain/multi-agent conversion for appearances, one NPC agent per fictional person, unbounded chains, hidden automatic fallback to a more costly model, infinite model-only narrative simulation, repeated “summarize everything” calls, assumed cache hit savings, silent context trimming of required evidence, opaque compaction as canonical memory and 100 speculative feature folders before measuring gameplay.

## Recommended implementation selection

First build a credible **evaluation and observability lane** on the existing code. Next correct source/prompt drift, context packing and retrieval efficiency. Then introduce selected adaptive search/effort as **an explicit option inside the existing durable generation boundary**. A richer planning/director lane comes only after actual long-turn and varied-profile evidence shows its value. Finally run a deliberately budgeted connected story evaluation with your approval.

See [implementation program](implementation-program.md). Every packet is **Proposed / design-complete** until you explicitly ask Cursor to select one as Ready, authorize any throwaway SQL, and approve any real provider spend. `Current change: none` is valid.

## Inspection provenance

Source audited on GitHub branch `design/storyteller-agent-architecture-2026-11-14` based on 2026-11-14 `main`, including application Storyteller execution/controller/SQL/context, pure Storyteller tasks/prompts/OpenRouter, canonical documents/retrieval, usage budget/recovery, creation/campaign/action/publication, historical connected evidence and original player vision. No runtime tests or model calls were executed by this design pass. Findings describe inspected source and separately identified historical measurements, not newly demonstrated production capabilities.

**Working test:** the *same* code should support a long quiet life, a sharp dangerous encounter, a strange nonhuman awareness and a return to an old personal promise using **different captured creative directions and bounded task recipes**, while all mechanical truths, spending and privacy remain identical in authority.
