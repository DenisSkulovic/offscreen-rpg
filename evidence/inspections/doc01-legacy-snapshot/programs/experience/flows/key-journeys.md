# Critical user journeys | narrative paths before pages

**Purpose:** end-to-end behavioral design fixtures for evaluation and Change acceptance. These are **proposed journeys**, not claims of existing feature completeness. Each path tests emotional comprehension and authoritative behavior.

## J1. The 60-second visitor

**Entry:** first visit, no account. **Desire:** understand why this is not “ChatGPT tells you an adventure.”  
**Flow:** Welcome → interactive scripted moment → choice → simulated preview of waiting → consequence/return digest → explanation of real persistent version → Create/Stories.  
**Pass:** visitor can explain the distinction between intent, elapsed time and committed outcome. **Fail:** marketing text, signup wall or an unlabeled reset-on-refresh prototype.

## J2. The inhabitant, present

**Entry:** opening scene published. **Desire:** observe, speak, inspect or leave.  
**Flow:** story context → short prose → meaningful offered action → accept → receiving/settling state → actual result → next choice, possibly within the same scene.  
**Pass:** no forced “next chapter,” no false confirmation, prose remains readable. **Fail:** options treated like chat replies that immediately dictate success.

## J3. The quiet worker

**Entry:** a supported repeatable local opportunity. **Desire:** repair, study or work for earned progress.  
**Flow:** inspect → preview time/known costs → commit → durable activity → close browser → reopen → verified earned progress → decide whether to continue/stop.  
**Pass:** same progress after reload; a failed check consumed time but did not earn units. **Fail:** click yields reward before completion; browser clock becomes source of truth.

## J4. The interruption

**Entry:** repairing beacon, 3/5 units earned. **Desire:** respond to a stranger without losing work.  
**Flow:** active commitment → event boundary → hold and narrative scene → contextual choice → finite action/check → new passage → supported resumption/revalidation or explicit continued suspension.  
**Pass:** earned 3/5 remains, no hidden working during the hold, no roll repeats. **Fail:** event is a toast on top of a still-running progress bar.

## J5. The return after three days

**Entry:** accepted small itinerary with bounded horizon. **Desire:** immediately know what happened.  
**Flow:** Stories card attention label → Now compact return digest → current situation → Journal only for deeper explanation → respond if needed.  
**Pass:** factual summary includes completed, blocked and pending entries with provenance. **Fail:** thirty unordered log cards or fabricated summary.

## J6. The nonhuman story

**Entry:** a sentient weather pattern in a mechanical vessel. **Desire:** experience a coherent world without invalid body/economy assumptions.  
**Flow:** create from scratch → define perception and role → choose style → opening → contextual options → World/You adapt to actual concepts.  
**Pass:** no required humanoid form, map, inventory, coins or D&D action that cannot apply. **Fail:** fantasy starter UI with labels relabeled but incompatible semantics.

## J7. Recovery without losing trust

**Entry:** accept action; HTTP response lost while server may already have committed it.  
**Flow:** freeze local intention → show “checking” → read durable operation receipt/current snapshot → render existing committed outcome or a safe failure path.  
**Pass:** one accepted action, one roll/effect, no accidental provider charge. **Fail:** generic Retry resubmits new operation, or UI declares it failed without evidence.

## J8. A genuinely quiet evening

**Entry:** no active commitment and Storyteller has offered no immediate danger.  
**Flow:** Now states that time is not advancing → local opportunities if offered, otherwise clear lack of current action → optional Journal reading.  
**Pass:** screen feels intentional, not broken. **Fail:** invented auto-progression, idle activity or compulsory plot event.

## J9. A hypothetical custom intent (future)

**Entry:** scene offers two authored choices, neither matches intent.  
**Flow:** “Try something else” → draft intention → interpretation preview → player acceptance or correction → rule admission → actual outcome.  
**Pass:** typed text cannot assert world effects or hidden truths; clarification and rejection preserve the player's input. **Fail:** free text becomes an omnipotent system prompt.  
**Dependency:** new verified domain contract and explicit approval; not a near-term frontend-only slice.

## Design evaluation sequence

Review J2, J3 and J4 as the **core product loop** before spending time on animations. Review J1 for portfolio conversion and truthful signaling, J5 for the unique long-term promise, J6 for world neutrality and J7/J8 for trust. Only after those function should J9 become a code-bearing Change.

A test suite can verify many mechanical invariants; **a human must still watch unfamiliar people navigate these paths**. A perfect DOM tree is not evidence that the character feels alive.
