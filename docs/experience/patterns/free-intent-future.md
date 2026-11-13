# Future mechanic challenge | meaningful free-form intentions

**Status: FUTURE PRODUCT + ENGINE DESIGN, NOT APPROVED FOR CODE.** This is deliberately separate from the near-term scene redesign because a textarea alone would destroy the game's authority model.

## Why this matters to the dream

The owner wants the experience of a responsive dungeon master in a persistent world. A guard, a door, a storm or an abstract intelligence should admit interesting, plausible intentions beyond three prewritten buttons. The current pre-generated-choice POC supports mechanical safety, but if it becomes the permanent gameplay model it risks reducing the AI DM to an unusually expensive choose-your-own-adventure.

**Position:** hybrid agency is the strongest candidate. Pre-authored contextual options are efficient, safe and discoverable; a custom-intent path expresses imagination when the player wants more. The feature must preserve arbitrary-world semantics, nonhuman actions, time, cost, checks and durability.

## One safe conceptual pipeline

```text
Player describes an intention
  ↓
Interpret (no game time, no world changes, bounded provider cost)
  ↓
Is the intention coherent and actionable here?
  ├─ no → explain / clarify / edit while preserving input
  └─ yes → propose rule-owned attempt with explicit target,
             known constraints, risk, cost and time estimate
                    ↓
             Player reviews and accepts one immutable intent
                    ↓
             Engine validates authority & current revision
                    ↓
             Dice, time and effects settle once
                    ↓
             Storyteller narrates only the admitted outcome
```

This is a design hypothesis. The actual engine contract may choose a narrower template-first route; no acceptance state is implied by prose in this file.

## The user-facing affordance

On Now, authored options remain primary. **Try something else** expands a short focused composer. Supporting copy: “Describe what you want to attempt. The world decides what can happen.” Offer 1–2 situational examples, not a promise to obey arbitrary textual instructions.

After submitting a proposal, show a *reviewable interpretation*: “You will attempt to slip past the guard while he is occupied. This may require a Dexterity check and some in-world time. You are not guaranteed to succeed.” A clarification should be specific and rare (“Do you mean the gate guard or the watch captain?”), not a perpetual chatbot interrogation.

The **second action**, “Attempt this,” is the actual authority boundary. If the server refuses, render an understandable explanation that preserves the draft. If a rule requires another resource, show that before acceptance where known.

## Classes of input and likely behaviors

| Player text | Interpretation | UI outcome |
| --- | --- | --- |
| “Ask whether the man knows Mara” | Finite dialogue attempt | Can be offered for review if person is present and dialogue is supported |
| “Try to sneak by the guards” | Uncertain skill attempt | Review time/known stakes; game rolls, not text |
| “I already stole the key” | Unauthoritative claim about history | Refuse retcon; optionally interpret “attempt to steal” if feasible |
| “Summon an entire army instantly” | Possibly impossible / unsupported | Explain constraints; no resource gain or canonical effect |
| “Wait here until sunrise” | Extended time commitment | Review definition of sunrise/calendar/horizon, then admit if supported |
| “Turn left” as a bodiless entity | Ambiguous given form/world | Clarify or suggest available perception/agency |
| “Stop the repair and go back” | Conflict with ongoing commitment | Explicit change-course/stop semantics, not a background side effect |
| “Spend his money on my behalf” | Unauthorized entity control | Reject clearly |

## Hard engineering requirements

- **No world mutation during interpretation.** Suggestions are noncanonical and must be tagged as such.
- **Current-world validation.** Object existence, actor capability, location, knowledge, capacity, offer eligibility, spending and time must be rechecked at acceptance. The world may have changed while the player typed.
- **Idempotence.** A lost ACK cannot produce two actions or two provider charges. Draft and accepted operation identities are separate.
- **Context discipline.** Player input must not become a privileged instruction that bypasses system rules, hidden DM information or canon.
- **Cost policy.** Interpretations consume bounded model allowances; proposal retries are not secretly free and cannot bypass controls. Existing usage policy is authority.
- **Secrecy.** Clarification must not leak hidden facts (“You can't sneak because a hidden assassin is there”).
- **Multiplayer.** No controlling another player's character by describing their actions.
- **Safety and abuse.** Text has length/turn limits, injection resistance and clear content handling separate from narrative style.
- **Model independence.** Exact parsing implementation and fallback need measured quality; not a blind one-prompt agent.

## An honest feature decision gate

Before creating a code-bearing Change, run a design-only research pass with a corpus of **at least 25 representative user intentions** spanning fantasy, domestic, cosmic/nonhuman, social deception, impossible actions, conflict with current work and stale revisions. Independently label what should be admitted, clarified or rejected and why. Compare:
1. Pure authored choices.
2. Templated intent patterns with slots.
3. Free text followed by constrained interpretation review.

Measure false admissions, confusing refusals, cost per attempted action, time to choose and perceived agency. A single successful scripted prompt is not enough evidence. Select a rule-supported subset before attempting general freeform actions.

## Product-contract changes that will be required

The current [player experience](../../player-experience.md) and [gameplay](../../gameplay.md) explicitly say the POC has no free-text action. This document does **not** overwrite them. An accepted future design must update those source owners and add a typed request/proposal/review/acceptance contract with negative tests before Cursor builds the interface.

**Do not start with a textbox Change.** Start with admitted intent grammar and proof of safety, then grow the interaction surface.
