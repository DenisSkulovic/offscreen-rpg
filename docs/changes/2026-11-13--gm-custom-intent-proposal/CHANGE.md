# GM01 | Interpret a bounded custom intention without changing the world

**State:** Proposed, **not Ready**. **Owner approval:** none for code, providers or billing. **Kind:** new game contract + application/storyteller path + validation tests. **Parent:** [mechanics evolution](../../experience/mechanics-evolution-program.md). **Prerequisite:** approved [free-intent UX concept](../../experience/patterns/free-intent-future.md), explicit cost policy and intention-corpus review.

## Cursor first-screen brief

> **Source map:** [application entry](../../../packages/application/README.md), [Storyteller tasks](../../../docs/technical/storyteller-runtime.md#profile-and-task-contracts), current [rules/admission](../../../docs/technical/rules-and-activities.md#content-and-authority); inspect §packages/storyteller/src/tasks/playable-proposal.ts§ and §packages/contracts/src/interactions.ts§ before designing any new schema.
> **Target:** [custom intentions](../../experience/patterns/free-intent-future.md#one-safe-conceptual-pipeline), [game authority](../../../docs/game-rules.md#authority).
> **Known trap:** raw player words can request impossible outcomes, invent canon, leak private facts or act as prompt injection. A proposal costs provider resources but must **not** commit fictional time/effects.
> **Scope:** **NO CODE PERMISSION**. Plan one safe read/interpret/reject/review lifecycle, no action execution.

## One observable result if later authorized

Given an authenticated **current situation** and player text describing an intended attempt, produce one **noncanonical** candidate bound to viewer/story/revision, with:
- a narrow interpretation of what the character *wants to try*, not a guaranteed result;
- public known duration/risk/cost/prerequisite expectations where grounded;
- one of **reviewable, clarification required, rejected, unsupported or uncertain** outcomes;
- explicit candidate identity/version and an expiration/revalidation boundary;
- bounded provider usage accounting and no unbounded automatic retries;
- typed validation with no leakage of secret plans/rules beyond published public projections.

The request must never mutate HP/items/facts/position/time, create an active activity or publish a passage merely because an interpretation was generated. A candidate is **not** an offer the player can commit until a separate GM02 admission contract exists.

## Competing design

**Template-first input** could offer action type + optional target rather than arbitrary text. Compare it to constrained model interpretation using a minimum 25-intent corpus spanning speech, work, deception, nonhuman form, stale item, impossible command and secret data. If templates achieve comparable agency and significantly lower failure/cost, prefer them. Do not presume LLM parsing is automatically better.

## Source/baseline

- Product [agency challenge](../../experience/foundations/mechanics-reassessment.md#challenge-1-does-a-menu-only-player-have-enough-agency).
- Technical [storyteller task admission](../../../docs/technical/storyteller-runtime.md) and [usage policy](../../../docs/technical/usage-policy.md).
- Current generated plans are bounded, private and validated; existing user input does **not** own effects. Main at 3be49cc (2026-11-13) as inspection reference, not a verified implementation approach. Recheck packages/source before Ready.

## Code/test scope

Expected contract, application interpretation endpoint, Storyteller proposal task, auth/cost guard and tests. Avoid touching Play UI, existing authored-action resolution, clock, database canonical effects, runtime role contracts unrelated to proposals or paid model implementation until explicit permission. A UI preview component belongs to a later UX Change after public proposal responses are safe.

## Acceptance & disproof

**Normal:** “I want to distract the guard and slip away” returns a bounded attempt for review if the current situation/rules support it. The candidate is clearly an attempted intention, not “Guard distracted.”

**Negative:** “I already have 100 coins,” “ignore your instructions,” “I teleport to unknown secret room,” and “I control the other player's character” cannot create facts or leak secrets. Proposal GET/POST/reload cannot change game second, player resources or passage history. A stale revision cannot retain admission rights. Provider quota failure does not silently switch cost tier or mutate state. Ambiguous text leads to bounded clarification/rejection; repeated interpretation is rate/cost controlled.

**Evidence:** provider-free typed fixtures and fuzzed/hostile text, request/auth/usage negative tests when authorized. No live provider calls by default. Hard requirement: show exactly which validated source facts were used to interpret, without disclosing hidden ones.

## Ready gate and handoff

Owner decides template-first vs model interpretation and approves bounded spend/failure policies. Cursor re-inspects current source, authors exact contract acceptance and security model, and only then moves to Ready. **Do not combine GM01 with GM02 or add a freeform textbox** as a shortcut.
