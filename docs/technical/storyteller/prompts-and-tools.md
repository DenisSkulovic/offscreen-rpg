# Storyteller prompts and tools

**Owns:** task recipes, what a model may read, when it must stop, and what a prompt is forbidden to grant.  
**Selected target** below, dated 2026-11-14. **Not implemented** as a general adaptive loop. The landed runtime still uses versioned task artifacts and a narrower tool surface; see [current prototype runtime](operation-and-controller.md#current-prototype-runtime) and [request context and cost](request-context-and-cost.md).  
**Product:** [behavior](../../product/storyteller/behavior-and-quality.md), [memory](../../product/storyteller/memory-and-continuity.md).

## Orthogonal authorities

A profile sets how the Storyteller tells and initiates. It does not set the payer budget or the model. A task recipe sets how much investigative and composition work is eligible. It does not decide whether a character can die. A model route sets technical capacity and price. It does not set the game rules. Account entitlement limits the whole operation and cannot define the fiction. These intersect at task admission. A richer tier never has less authority constraint: more funding buys attention, evidence and style, not free inventory, unauthorized actor decisions, or better dice.

## Task roles

Each role has one purpose, canonical input, permitted tools, output schema, publication target, latency class and failure semantics. Do not invoke every role on every turn.

| Task | Mandatory truth | Must not publish |
| --- | --- | --- |
| Opening composer | Reviewed premise, package, rules, starting actor | A started clock |
| Immediate consequence narrator | Exact attempt, receipt, elapsed time, item and actor facts | A second mechanical outcome |
| Contextual continuation | Current scene, prior accepted intention, known history | Item ownership the player did not accept |
| Controlling interruption | Cause, retained earned progress, permitted conditions | A success receipt the interruption removed |
| Historical reporter | Frozen source event and chronology | A replacement for Now |
| Evidence investigator | Root, version, question, visibility, remaining budget | Story text; private packet only |
| Continuity curator | Source passage and existing record | Mechanical statistics for a mentioned name |
| Narrative director | Only if a future policy explicitly accepts initiative | Any automatic world effect |

Evidence investigation is usually a bounded subphase inside the same generation, not a second funded bot. Continuity curation can initially be the notes section of the same consequence result. Default subagent policy is **none**. No recursive delegation, no private story data crossing scope, and no child budget recharge.

## Stopping

At admission, compute the effective budget as the **intersection** of platform cap, account grant, payer window, story-selected optional work, task minimum and maximum, route capabilities, and the operation's remaining resources. Select the smallest adequate versioned recipe: deterministic-only, one-shot, one-shot plus limited repair, or evidence-seeking for two or three rounds. A model round whose only job is to decide whether a model round is needed is not the default. Use a cheap deterministic need check first: named known entities, unresolved source identity, provenance conflict, long absence, missing continuity, known-versus-hidden ambiguity.

The model may request another read inside a preauthorized recipe. It cannot upshift its own route, allowance, creativity policy or latency. Preserve a final-answer reserve before optional research. At the budget threshold, stop exploring and produce the final answer if required source is present; otherwise return a typed hold. Every repair and optional specialist consumes the same envelope.

Stop states are distinct: completed valid candidate, no further evidence needed, exact source not found, tool or coverage incomplete, context too large, round or deadline exhausted, provider refusal, bounded invalid output, uncertain charged attempt, stale revision, or required authority unavailable. None of them is an unbounded "still thinking."

## What the prompt must not grant

The model may decide emphasis, wording, silence, admissible grounded opportunities, and descriptive text inside the captured canon-invention policy. It may propose finite plans, effects, transfers, obligations and time. Code must admit those against actor, rules, source and permission.

The model must not decide dice, a forced player response, the scheduler, the provider key, the payer, retry eligibility, an unknown factual outcome, secret future state as public fact, permission escalation, SQL mutation, or destruction of canon.

**Negative:** a zero-call interval is a successful recipe when accepted work needs no narration. A missing memory search returns partial or no-match. It does not fabricate a remembered sentence. The current hardcoded nonlethal limit is a present capability gap, not a constitutional ban that a more imaginative prompt may lift.

## Selected compilation and tool contract

**Selected desired architecture, 2026-11-14.** This is not a claim that the general adaptive loop is live. The landed runtime remains the narrower controller described in [operation and controller](operation-and-controller.md#current-prototype-runtime).

Compile layers from stable to changing: world truth the profile cannot buy (P0); versioned task contract (P1); captured creative identity, distinct from the payer (P2); pinned rules and world (P3); the frozen present (P4); optional source-linked past (P5); operation-local investigation feedback (P6). Stable instruction may sit where prefix caching helps. A bloated universal system prompt is not justified by cache overlap.

Prompt defects to remove from common authority: a blanket “never end the character's life” is the present nonlethal gap, not eternal policy; a compulsory 2–5 options rule contradicts a quiet or single-attempt scene; “cannot execute tools” forbids game mutations, not an explicitly admitted read-only memory phase. The model still cannot reach SQL, the shell, the web, or another player's account.

**Initial approved read vocabulary**, when a recipe admits investigation:

- `ask_memory(question, intent)`: at most two concise queries per round; returns leads, current-root source ids, snippet, relevance and coverage.
- `read_memory(handle)`: one exact approved current-root record or published passage, bounded bytes, proven source identity.

Optional later reads (a pinned rule section, a known identity, a contradiction between two attributed sources) stay proposed until a measured need. Never expose arbitrary SQL, file read, web search, shell, item transfer, dice, grants or a subagent spawn. A read is not a player action.

Each accepted game event builds a **new** captured task. Investigation snapshots are operation-local for two or three rounds. There is no permanent model transcript and no model session while the story is quiet. Compaction is off by default. A model summary is never canon. Subagents default to none.

A route manifest records provider, model, endpoint, schema strictness, context and output ceilings, timeout, price categories, and whether a capability is enforced. Current OpenRouter calls keep reasoning disabled, with no web or context-compression plugin and provider fallback denied. A route policy that mentions a reasoning budget does not enable reasoning. The model does not pick the route or the payer.

Three caches stay distinct: canonical source bytes (immutable, still permission-checked), a provider prefix discount (only when the bill reports it), and identical-response replay (only the same accepted work). A shared prefix is not a cache hit.

Model text is data. It cannot raise round, read, money or latency allowance, publish private knowledge, reroll mechanics, or submit a player command. Bounded repair stays inside the same admitted operation. A sent-but-uncertain attempt is not a free rerun. Public narrative does not expose evidence packets, private directions or raw prompts.

**Negative:** injected instructions inside a canonical document cannot mint tools or reveal private policy. Native function-calling and a JSON envelope are transports, not different permissions. Different narrative directions may change the scene and must not change the dice, clock or item outcome.
