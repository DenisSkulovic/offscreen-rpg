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
