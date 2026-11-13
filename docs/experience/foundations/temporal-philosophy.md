# Time and being alive | three competing product models

**Status:** explicit product decision study, **not** a rule change. Current engine's deliberate-time invariant remains binding until a separate approved mechanics Change. This challenges the current design rather than treating it as sacred.

## The original emotional contract

A character lives in a world where a shift may take a real hour, a journey ten real hours, and an earned possession may be lost. The player can go away, return, and discover meaningful progress or interruption. The fantasy is **not** that “a progress bar has advanced”; it is that another life accumulated continuity independent of constant clicking.

The tension: the current engine only advances through **accepted player commitments**, and stops without one. That is a rational safeguard, but it can yield a bad first impression: “I left for a day and my character did nothing.” It might also be a feature when a player deliberately wants to retain control. We need to distinguish products instead of pretending both expectations are satisfied.

## Model A | Strict commitment-bound time (current maintained contract)

**Rule:** no accepted action/plan, no fictional clock. Browser presence is irrelevant. A paused or held story doesn't drift. A selected activity advances only its admitted scope and stops at its horizon or decision boundary.

**Strengths:** predictability; no surprise injury/loss; finite provider spend; coherent deterministic checks; easier debuggability and consent. Perfect for deliberate strategy and experimental stories.

**Weakness:** the premise “your character lives while you are gone” can become “your character waits forever unless you configure a plan.” The user may experience inactivity after a missed click or an unattended completed job, which feels more like workflow orchestration than existence.

**UI if retained:** say the truth clearly and offer an unobtrusive “Continue while away” handoff at suitable moments. Treat no-plan return honestly, never camouflage inactivity with ambient counters.

## Model B | World time always advances (The Longing-like)

**Rule:** once the story starts, fictional time continues regardless of player intention. NPC/world developments and hazards may accrue across absence, even with no accepted active task.

**Strengths:** tangible world independence; genuine suspense; leaving has unavoidable consequences; easier emotional impression of a living world.

**Weaknesses:** unbounded choices while player absent, starvation/injury/death risks, radically higher content interpretation and compute cost, player may return to an incomprehensible irreversible world, multiplayer coherence becomes far harder. How much world simulation occurs without player input? A clock alone doesn't create life.

**UI if selected:** explicit account/story consent and clear consequences of ongoing time, visible next meaningful boundaries, offline safety policies, and a very strong return summary. In-world “pause” becomes consequential and potentially unavailable.

**Recommendation:** **do not choose this as the core near-term model** merely to create a lively timer. It compromises earned, player-owned progress unless the engine has thorough autonomous policy.

## Model C | Bounded standing life (recommended long-term direction)

**Rule:** the player can define an understandable **standing intention or habitual role** within the currently known world, with bounds and intervention rules. During absence, admitted routine activities advance through deterministic checks; the game can invoke Storyteller judgment only on meaningful nominated developments and only within captured budget/authority. It stops safely at horizons, incompatible surprises or decisions lacking an approved fallback. No standing intention: the world does not advance by default in the existing solo policy.

**Example fantasy:** “I am staying in this town, repairing equipment each morning and talking with villagers when I have time. Stop if a serious stranger appears. Don't risk my life or spend my savings on my behalf.”

This is **not** a cron editor. It requires a role with authored rules, realistic eligibility, time horizons and a clear distinction between routine/response. It may be many episodes of quiet work and only one fresh narrative scene.

**Strengths:** offscreen life feels earned and individual; repeating an ordinary routine can have emotional weight; bounded consent and cost; fits different worlds if routines are *world-authored*, not generic jobs.

**Risks:** a standing intention could become secretly unlimited autoplay; a “talk to villagers” habit may require unbounded improvisation and new relationships; if actions never surprise, it feels scripted; if they surprise too often, it feels unfair. Future engine design must classify safe routine, possible event, requiring response and delegation default precisely.

**Recommendation:** choose this as the **north-star autonomy concept for future game-mechanics research**, while shipping current bounded commitments truthfully as the first proof. It resolves the original promise more convincingly than global passive ticking, but only after gameplay evidence.

## Agency continuum, not one autonomy slider

| Level | Player promise | What may happen while absent | UI copy that must exist |
| --- | --- | --- | --- |
| **Present choice** | “Wait for my next response” | None beyond already admitted action | “Your decision is required” |
| **One task** | “Work/travel until this bound or interruption” | Deterministic outcomes/known checks on that task | “Repairing; stop at an encounter” |
| **Short itinerary** | “Do A then B under these limits” | Conditional next steps revalidated | “Rest then patrol until dawn; stop for decisions” |
| **Standing routine** (**future**) | “Maintain this life pattern within rules” | Repeated lawful routine + bounded event handling | “Your routine is active until [horizon]” |
| **Delegated character discretion** (**future**) | “Make certain specified choices on my behalf” | Only eligible, approved classes of action/default | “You may choose to retreat, but not attack” |
| **Unbounded autoplay** | “Do whatever” | Undefined authority and spending | **Not an acceptable implicit default** |

A single Auto/Manual checkbox collapses distinct levels of risk, cost, time and narrative authorship and should be rejected.

## Life after completing a routine

This is a decisive UX/engine problem: a player accepts a 30-minute shift, then leaves for eight hours. Work finishes after 30 minutes. What happens for the remaining 7.5 hours?

- Under A, nothing further occurs without accepted successor. **Truthful**, but may feel inert.
- Under short itinerary, previously accepted steps may begin if still eligible. The player can see pending entries and horizon beforehand.
- Under C, an explicitly admitted standing routine could lead to another small, pre-authorized action after revalidation, up to its hard bound.
- Under B, global world clock would continue and might generate all sorts of unrelated facts, but only if an actual world policy exists.

**Design acceptance:** player must correctly predict which result happens before closing the page. “I thought my life was running for eight hours” vs “I authorized only one shift” is a product defect, not a matter of wording.

## How relationships become part of time

Time investment should lead to **opportunities for meaningful contact**, not passive +1 affection points every fictional hour:
- The character returns to the same stall, workshop or neighbor over several real days.
- Context and identity are preserved.
- An interaction may become possible because the person is present and the world recognized an earlier effort.
- The player can choose how to behave; repeated conversations shouldn't auto-upgrade a relationship.
- An unattended routine never silently declares love, betrayal, agreement or irreversible social commitment without a supported policy.

A world-neutral version might track familiarity between a microbe and an environmental signal, or a sentient network and another pattern. Avoid hard-coded "NPC affection" mechanics.

## Cost and narrative availability

The character's routine can be mechanically resolved without a paid model call for every check. When an unusual event requires interpretation, capture the exact scene, state and hold. If provider budget runs out, do not backfill fabricated drama. The player may still review verified changes and allowed quiet activity. Any stored autonomous policy must be independently cost-bounded and revocable where rules permit.

## What could disprove the recommendation

- Players consistently prefer full control and find even bounded routines psychologically unsettling.
- A single paid Storyteller scene per meaningful development cannot maintain coherent continuity at acceptable cost.
- Future standing routines consistently hit blocking states and create no extra feeling of life.
- Routine repetition produces boring ledger progress without meaningful world relationships.
- Multiplayer temporal authority makes standing routines inherently unfair in shared stories.

## Required design experiment before mechanics are changed

Build **three offline, deterministic prototypes** for one setting: strict one-task, two-step itinerary and bounded standing routine. Simulate leaving for 8 real hours, one interrupted shift, and return. Show all player commitments clearly; do not fake hidden model intelligence. Ask participants:
1. What did you expect the character to be doing at hour 6?
2. Which risks did you believe you accepted?
3. Was the return surprising but fair?
4. Would you leave the game alone for a day with this policy?

Compare correct predictions and desire to return. Do not select the fanciest autonomy architecture without this evidence.

## Decision requested from the owner in later design review

**Recommendation:** retain deterministic time authority; evolve toward **bounded standing life** as a first-class future experience. Do **not** treat strict no-idle as automatically the final dream, and do **not** enable unrestricted world ticking merely to simulate life. This is a **design direction**, not permission to modify `docs/time-and-autonomy.md`, schemas or runtime.
