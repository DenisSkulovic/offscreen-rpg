# Vision-first behavioral traces and falsification tests

**Status:** candidate design examples, 2026-11-21, **not executions, source contents or live-model output**. Read [vision-first target](VISION-FIRST-TARGET.md). These cases test what the product must be able to do; their shape is not constrained by current API or file schemas.

## T1: one complicated continuation, with actual research

**Scenario:** the player reencounters Mira after 200 scenes. Scene 18 established a promise about an old brass key; scene 89 recorded a rumor blaming Mira's faction for a disappearance; scene 144 contained an eyewitness account contradicting part of that rumor. The current scene asks the Storyteller to write the reunion naturally. Those are *illustrative fictional fixtures*, not claims about existing production lore.

**Initial context:** current player's action; one exact Library root and world-state frontier; current profile core and task; a tiny index/orientation; tool/skill catalogue and bounded cost. **Not** the full 200 passages.

**Possible tool/agent trace (illustrative, not mandatory script):**
```text
Storyteller:
  library.search("Mira brass key promise") -> candidate passage handles
  library.read(exact passage from scene 18) -> original promise evidence

  delegate.research(
    question="Which later events actually change Mira's obligation?",
    root=currentPinnedRoot, allowedScope=story-private, budget=bounded
  )
  delegate.research(
    question="Separate established faction activity from the rumor",
    root=currentPinnedRoot, allowedScope=story-private, budget=bounded
  )

  skill.open("continuity-and-unreliable-testimony") -> short versioned craft procedure
  library.read(exact selected scene-89, scene-144 evidence) -> contradictions
  workdesk.stage("private/reunion-direction.md", source-linked tentative note)
  workdesk.read("private/reunion-direction.md") -> revise/reject any overclaim

  submit_scene(
    fiction="Mira responds without resolving what she cannot know...",
    choices=distinct valid intentions,
    proposedLibraryChanges=useful small delta only
  )
```

The two research assistants have **independent contexts**, not imagined dialogue roles. They may run concurrently, each against the exact same frozen root. Returned claims must cite immutable source handles and indicate uncertainty. The parent remains responsible for synthesis and final artistic choices; a private possibility is never asserted as admitted fact merely because one assistant likes a twist.

**Commit:** validate narrative invention authority and any mechanical effects; select one Library root (containing new passage and admitted relevant edits), exactly matching game state and relevant choice meanings. The staged draft alone was not public canon.

**Follow-up:** Player rejects Mira's request. Next invocation reconstructs source-relevant facts and the new scene, rather than replaying the whole model conversation or reusing stale parent notes.

**Falsify if:** full history must be stuffed into the prompt; assistants read different/latest roots; tool search cannot lead to exact passages; the model confuses rumor with admitted fact; draft is visible as canon before submission; restart loses staged work; scene 201 is published with the wrong state; using two children is strictly worse than parent-only under controlled evaluation.

## T2: fork from an *active* scene without cloning a universe

Scene 37: the player is aboard a ship on a ten-hour passage, two hours are complete, a promise to the navigator exists, a warning message is still unconfirmed, and one choice is on screen. Later the parent reaches scene 80, where the ship has arrived and new facts have been discovered.

**The scene-37 boundary must pin:**
- Library root from scene 37, including then-admitted private possibilities, original conversation and writing guidance;
- world-state root with ship, settled journey progress, **remaining** fictional duration, active semantic action and exact clock state;
- displayed choice plus its admitted meaning, independent of the parent's provider attempt;
- source world/rule/profile/skills and causal parent.

On **Fork scene 37**:
1. Verify ownership and selected historical commit; make a new branch ID with scene-37 ancestry.
2. **Point** the new branch at the same immutable Library/version and appropriate semantic-state root. No document-by-document clone, no replay of 37 past scenes.
3. Rehome the remaining eight fictional hours and any deadline under a *new branch-owned scheduler/operation identity*, preserving settled facts and appropriate time policy. The parent's worker, billing and provider attempts remain with the parent.
4. Offer the inherited choice in the new branch using its preserved exact intention. Its future decisions create new immutable root successors. Scene 80's later arrival and secrets **must not** leak in.
5. Review of scene 37 remains the exact historical scene even after the child has reached its own scene 20.

**Falsify if:** the fork borrows current parent inventory/clock/private notes; it physically copies all Library documents; it rerolls an established outcome; it submits the choice by borrowing the parent's generation row; it schedules the same parent task twice; or it claims forkability while omitting the unfinished journey.

**Key end-state constraint:** *active* fictional state is no excuse to make a published scene unforkable. We must make its meaning portable before we publish the scene. There may be transient in-flight jobs between committed boundaries; those are not player-facing scenes until an admitted state exists.

## T3: a prepared experience with its own writer's desk

A prepared start carries a pinned story invitation plus `START.md`, `STORYTELLER_PROFILE.md`, two identities, a private speculation note and background material. The player presses **Play**, without filling out a wizard or selecting a rule package.

The writer receives core prompt/profile/orientation by deterministic resolution; it can inspect additional source files through tools. It **should not** pay a separate preparation model call just to restate a complete package. It may still perform research or draft notes as part of composing the opening.

If the player customizes the prompt, the original package stays immutable. The effective accepted user intent is pinned separately. Contradictions between custom prompt and authored setting need explicit source/creator policy, not accidental last-string-wins.

**Falsify if:** the generated campaign must pre-clone every package document; a missing human character stops Play; private speculation appears as fact; changing the package later alters an in-flight task; default profile lookup consumes a paid research round.

## T4: `BAH` and the conscious galaxy

`BAH` is a valid minimal **original-world** creative invitation. It grants a creative invention scope (policy-defined), not arbitrary mechanical world powers, endless budget or guaranteed narrative genre. A model can write an immediate concrete situation instead of forcing the user through setup forms. Additional lore files are **not mandatory**.

A conscious galactic perspective may perceive distant signals, select attention and allow civilizations to rise or fall. It doesn't automatically acquire a body, Strength score, inventory, godlike star manipulation or a real-time billion-year timer. A narrative-only action can be meaningful. The chosen clock semantics are explicit and separate from prose pacing.

**Falsify if:** the game engine only initializes with `srd-5.2.1-subset`, character name/HP and preplanned quests; the creative setup produces an encyclopedia before the first scene; or a nonhuman choice is made executable through hallucinated physical capabilities.

## T5: two-stage creative work and failure without Frankenstein state

The writer's mission may stage a note, read it, call a research assistant and then fail before final scene submission. A durable operation checkpoint identifies its **exact** source roots, tool responses, draft revisions, budget and settled provider attempts. Resume should reconstruct the Workdesk and continue safely; it should not invent new source handles or repurchase a response with uncertain delivery.

The scene is published **only after** the authority has all valid proposals and a coherent post-publication state. Orphaned provisional objects can be reclaimed under retention policy. The player does not see half-published choices or a partly accepted Library.

**Falsify if:** workdesk notes silently become canonical by writing to storage; restart loses an accepted stage while claiming success; a child reads another branch's private future; a scene appears without the active state needed to fork; or a retry charges a model twice after a known settlement.

## Quality and cost: what must actually be compared

**Provider-free functional proofs:** run scripted agent/tool traces on pinned content; demonstrate independent child contexts, exact handles, staged/reviewed notes, failure recovery, root/canon isolation and efficient fork references. A fake/scripted child can prove orchestration semantics but **cannot** prove creative usefulness.

**Controlled funded model trial (later approval required):** compare (a) grounded single model + exact source reads, (b) tool-using writer with appropriate skills, (c) writer + one or two scoped research children. Score opening *and next scene* for fidelity, handling of contradictory testimony, narrative pacing, agency, nonhuman compatibility, surprise and hallucinated facts. Record total billed input/output tokens, tool calls, wall latency, source-read precision, failure rates and user preference.

**Failure of sophistication:** a complex agent that merely rearranges a giant context, creates redundant notes, repeats source material, or spends 4× more without materially improving scenes **does not satisfy** the target despite its tool graph. Likewise, a one-shot candidate passing cheap schema tests does not demonstrate the target's research/fork capabilities.

## Decision separation

**Requirements we should be willing to accept as product constraints:** genuine Library-oriented agency; meaningful arbitrary-story support; exact scene-time versioning/forkability, including active fictional commitments; no full Library clone; clean user entrance.

**Implementation choices still open:** physical Merkle index structure, state persistence strategy, specific LLM round topology, subagent orchestration mechanism, skill content format/selection, tool schemas, path precedence, exact resource budgets and legacy migration strategy.

**Next useful task:** write a small *end-state acceptance rubric* tied to these five traces and explicitly compare the existing code only as an adapter candidate. Do not merely issue “implement the current explorer plus three tools” as the ultimate architecture. The POC must demonstrate these real activities, even if later production implementation is more capable.
