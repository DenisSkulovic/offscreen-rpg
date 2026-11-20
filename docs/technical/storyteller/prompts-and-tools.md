# Storyteller prompts and tools

**Target contract:** prompts describe a writer mission; tools provide scoped capabilities. Neither prompt text, Library content nor a writing skill can mint permissions. The authoritative tool surface is provider-independent and rooted in the mission's captured Library/state view.

**Owns:** task recipes, what a model may read, when it must stop, and what a prompt is forbidden to grant.  
**Selected target** below. Task roles stay separate, and the compilation heading records the 2026-11-19 task pack. **Not implemented.** The landed runtime still uses versioned task artifacts and a narrower tool surface; see [step status](operation-and-controller.md#step-status) and [request context and cost](request-context-and-cost.md). Tool rights, versioned input capture, stopping, and refusal stay the sections below. This page adds no tool entitlement. This page does not implement the packer.  
**Product:** [behavior](../../product/storyteller/behavior-and-quality.md), [memory](../../product/storyteller/memory-and-continuity.md).

## Orthogonal authorities

A profile sets how the Storyteller tells and initiates. It does not set the payer budget or the model. A task recipe sets how much investigative and composition work is eligible. It does not decide whether a character can die. A model route sets technical capacity and price. It does not set the game rules. Account entitlement limits the whole operation and cannot define the fiction. These intersect at task admission. A richer tier never has less authority constraint: more funding buys attention, evidence and style, not free inventory, unauthorized actor decisions, or better dice.

## Task roles

One Storyteller identity serves the campaign. Each role below is a separate recipe: one purpose, canonical input, permitted tools, output schema, publication target, latency class, and failure semantics. The application selects the recipe from the accepted game transition, the evidence that transition requires, and the captured budget. A recipe's instructions stay out of every other request.

A normal scene is one well-packed composition call. It is not a chain of mandatory models. Evidence investigation is a bounded phase of that same operation. Continuity notes can be a section of the same consequence result. A distinct model call is admitted only when a special role must return a short typed, source-linked artifact for the composer. Both prompts and both transmissions share one captured operation budget. Role text does not change dice, payer permissions, world or branch authority, or source visibility.

This heading names the recipes. It does not implement the packer. Today's code does not assemble P0–P3 this way. Landed admission still uses opening, continuation, consequence, and report tasks. See [Current prototype runtime](operation-and-controller.md#current-prototype-runtime). The pack those roles receive is [Selected compilation and tool contract](#selected-compilation-and-tool-contract).

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

Default subagent policy is **none**. No recursive delegation, no private story data crossing scope, and no child budget recharge. Optional narrative direction is not an automatic second model call.

## Stopping

At admission, compute the effective budget as the **intersection** of platform cap, account grant, payer window, story-selected optional work, task minimum and maximum, route capabilities, and the operation's remaining resources. Select the smallest adequate versioned recipe: deterministic-only, one-shot, one-shot plus limited repair, or evidence-seeking for two or three rounds. A model round whose only job is to decide whether a model round is needed is not the default. Use a cheap deterministic need check first: named known entities, unresolved source identity, provenance conflict, long absence, missing continuity, known-versus-hidden ambiguity.

The model may request another read inside a preauthorized recipe. It cannot upshift its own route, allowance, creativity policy or latency. Preserve a final-answer reserve before optional research. At the budget threshold, stop exploring and produce the final answer if required source is present; otherwise return a typed hold. Every repair and optional specialist consumes the same envelope.

Stop states are distinct: completed valid candidate, no further evidence needed, exact source not found, tool or coverage incomplete, context too large, round or deadline exhausted, provider refusal, bounded invalid output, uncertain charged attempt, stale revision, or required authority unavailable. None of them is an unbounded "still thinking."

## What the prompt must not grant

The model may decide emphasis, wording, silence, admissible grounded opportunities, and descriptive text inside the captured canon-invention policy. It may propose finite plans, effects, transfers, obligations and time. Code must admit those against actor, rules, source and permission. Those admissions stay inside [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) and [Canon invention policy](../../product/storyteller/profiles-and-settings.md#canon-invention-policy).

The model must not decide dice, a forced player response, the scheduler, the provider key, the payer, retry eligibility, an unknown factual outcome, secret future state as public fact, permission escalation, SQL mutation, or destruction of canon.

**Negative:** a zero-call interval is a successful recipe when accepted work needs no narration. A missing memory search returns partial or no-match. It does not fabricate a remembered sentence. The current hardcoded nonlethal limit is a present capability gap, not a constitutional ban that a more imaginative prompt may lift.

### Contract dependencies

| This claim | Relation | Governing claim | Why a change triggers review |
| --- | --- | --- | --- |
| What the prompt must not grant | constrained-by | [What it must not do](../../product/storyteller/behavior-and-quality.md#what-it-must-not-do) | If the product allows invented success, a reroll, an unearned reward, a private plan as fact, or an action for the player, this prompt would grant a decision code must currently reject |
| What the prompt must not grant | constrained-by | [Canon invention policy](../../product/storyteller/profiles-and-settings.md#canon-invention-policy) | Descriptive text is allowed only inside the captured domain ceiling; if a domain permission starts allowing executable mechanics, a fabricated citation, or a player choice, admission would accept prose that policy forbids |

## Selected compilation and tool contract

The controller compiles a small mandatory mission pack, then exposes a semantic tool facade. Exact wire names may change; these capability boundaries do not.

**Mandatory injected pack:** mission purpose; story/branch/scene; captured Library root and world-state frontier; effective creative profile/skills/rules pins; current intent and visible present; granted resource policy; compact orientation to the Library/tool surface.

**Library discovery and evidence**
- orient/browse logical paths, roles and source metadata under the captured root;
- find candidates using lexical/semantic/index aids;
- read an exact source revision or bounded section;
- compare exact source revisions/claims and inspect provenance.

**Craft and Workdesk**
- load a versioned writing skill or focused example;
- stage a new/changed private document or scene draft;
- reread the staged result and inspect diff;
- revise or discard staged material.

**Delegated research**
- start a bounded assistant context with a frozen allowed root, narrow question and explicit allowance;
- receive claims, uncertainty and source handles or an isolated draft proposal;
- parent adoption is explicit. Child output is never directly published canon.

**Submission**
- submit one scene proposal with prose, visible choices plus stored intent, cited source handles and proposed document changes. Submission does not itself mutate SQL, clocks, inventory, billing or canon.

The facade must not expose arbitrary shell, SQL, host filesystem or unrestricted network access. Search indexes are rebuildable aids; a result outside the captured root or visibility scope is invalid even if its vector similarity is excellent.

No fixed `maxReads=6`, `maxRounds=3`, 2–5 option count or mandatory child agent is part of the target contract. Numeric limits are route/resource policy and can evolve without redefining the Storyteller.
