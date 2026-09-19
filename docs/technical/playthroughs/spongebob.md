# SpongeBob: an actual short session

Companion to the pineapple benchmark in the [agency/taste feature](../../features/2026-09-19--00-26--storyteller-agency-and-taste/FEATURE.md). Read the [status legend](README.md#how-to-read-a-claim). Current mechanics come from [character seeds](../../../packages/application/src/campaign/fixtures/content/mechanical-openings.json) and the [scripted Storyteller](../../../packages/storyteller/src/fixtures/mechanical.ts), not a live model.

The desired feeling is a small absurd episode in which the player can be curious, cautious or simply get on with the day. It should not become a combat game because something rattles, or a slot machine where pressing Persuasion repeatedly eventually makes Gary comply.

## Fixture sheet

Current SpongeBob has Charisma 14, Wisdom 14, Dexterity 12, Intelligence 10; Persuasion and Perception proficiency +2; HP 10. Initial character facts are `gary-alert=true`, `under-cover=false`, `location=pineapple`. The generated-plan opening is the path traced here; the seed file also contains authored plans with different keys/wording. Do not accidentally combine their offers into one menu.

For SB-01 through SB-05, the current source resolves every selected action immediately and keeps the campaign tick at 0. This is a known gap against [deliberate action time](../committed-time.md), not the intended conversation behavior. Reader/model time must remain free, but selected in-world exchanges must acquire admitted durations when that feature lands. The activity extension below uses the shared campaign clock. Its numeric event/resume ticks also need adjusting for the selected conversation durations; repair/tidying must not earn labor during those exchanges.

## SB-01: wake up and see actual options — current

Opening:

> You wake in the pineapple. Gary is bristling beside the window while a damp parcel rattles against the outside sill. There is furniture nearby that could provide cover.

Public offer O1:

| Intention | What the player knows | Private supported resolution |
| --- | --- | --- |
| Slip behind the sofa | Put furniture between you and the delivery | Automatic; requires alert Gary and no current cover; sets `under-cover=true` |
| Talk Gary down | Clumsy reassurance may deepen his alarm | Charisma/Persuasion DC 12; success sets `gary-alert=false`; failure has no effect |
| Call from the doorway | Distance is safer but his signal may be unclear | Automatic descriptive outcome, no current mechanical effects |

One opening task creates this proposal. Start admits its exact reviewed plans. There is no check for waking up, no new activity and no requirement to spend tokens before displaying an already captured result. The third option currently changes prose more than state; that is a limited fixture, not proof that all three are equally strong gameplay choices.

## SB-02: a failed reassurance — current

The player selects “Talk Gary down.” Command `c2` references O1 and that choice, not a client-supplied DC or intended success. The server records d20 = 5. Total = 5 + 2 + 2 = 9; failure. Receipt R2 has no effects and no declarations. Gary remains alert. O1 is consumed; a second request against O1 cannot earn a second roll.

The consequence task receives R2 and the still-alert state. The current scripted result can say Gary remains tense; it returns the same opening-plan family because alert/cover facts are unchanged. It does not implement a durable loss of trust just because the risk text mentions deepened alarm.

**Design gap:** a consequence should make the failed attempt matter in the next situation or available approach, not repeatedly serve an identical Persuasion invitation. Possible target fixes include a supported “reassurance tried” state with changed approach/eligibility, or a genuinely different grounded next plan. Merely changing the label or pretending Gary is calmer is not a fix. Choosing the right small state effect belongs to the agency/taste slice; this atlas does not claim it exists.

Target prose example:

> Gary's eyestalk follows your reassuring hand instead of the window. You haven't convinced him. The parcel knocks twice, as though impatient with both of you.

A target next offer could emphasize cover, indirect observation or disengagement. It should explain why further reassurance needs a changed circumstance. No compulsory confrontation is necessary.

## SB-03: change approach — current

The player selects “Slip behind the sofa” from the fresh offer. No roll: the admitted circumstances make taking that cover assured. Receipt R3 sets `under-cover=true`. Tick remains 0. A consequence task narrates that committed movement and offers:

- “Watch the window from cover”: Wisdom/Perception DC 12, with the obstructed angle as its difficulty basis.
- “Come out beside Gary”: automatic `under-cover=false`; the public risk says the character gives up cover.

This is a meaningful menu change already present in the fixture. Cover is not a decorative adjective that the model forgets on its next call.

## SB-04: learn something — current

Choose “Watch the window from cover.” Draw 10 + 2 Wisdom + 2 proficiency = 14, meeting DC 12. The receipt declares story fact `delivery-at-window=rattling-parcel`, backed by the current passage evidence. No object is added to inventory. The model must not say the parcel has been opened, secured or found harmless.

The next consequence proposes “Hook the parcel closer” or “Leave it outside.” Hooking uses Dexterity DC 12 and, on success, declares `parcel-secured=true`; its existing text does not inspect the contents. Leaving declares `parcel-left-outside=true` automatically. These are different intentions, not two routes that secretly force the same explosion.

## SB-05: choose a quiet resolution — current, with a limit

Choose “Leave it outside.” The new receipt declares that decision. A consequence task describes the closed window and returns no further plans for the resolved parcel. It cannot later claim the player opened it. Tick remains 0, HP 10, Gary still alert, SpongeBob still under cover unless another admitted action changes that.

The empty offer is a fixture endpoint/held state, **not yet a functioning continuing daily life**. A production-quality quiet outcome needs a deliberate route back to feasible everyday intentions, or an explicit end of the episode. “Nothing else is implemented” must not masquerade as satisfying calm gameplay.

Current-path ledger: O + 4D = five generation tasks. Offline execution uses no provider calls. Under the hypothetical one-call live envelopes, this path would total 24k–48k input and 4.4k–9.6k output tokens. None of those five calls earns simulated time or labor. That is why adding persistent quiet life matters more than making each paragraph longer.

## SB-06: ordinary life resumes — target extension

This extension would replace the empty follow-up at SB-05 with a supported choice such as “Tidy the kitchen,” alongside other admitted intentions. It is not a hidden new option in today's fixture.

Fixture terms: household tidying requires four contribution points. Every ten eligible ticks, Dexterity DC 10 with the existing +1 modifier earns two on success, zero on failure. It is simple tidying, not a claim that SpongeBob has an undeclared cooking proficiency. One tick is displayed as one fictional minute and costs one real second at this demo pace. Completion sets an admitted `kitchen-tidy` fact; it does not pay wages or spawn tools. Follow-up is factual-only, then idle.

| World tick | Player/readable state | Simulation | Storyteller |
| ---: | --- | --- | --- |
| 0 | “Tidying the kitchen; estimated completion depends on progress” | Capture work K at 0/4, bind current actor/target, validate capacity | None after the accepted plan exists |
| 10 | “One counter cleared; 2/4” | Draw 11 + 1 = 12; +2 contribution | None |
| 15 | Player pauses the campaign | Settle eligible partial time, persist pause; no premature second attempt | None |
| 15 | Player returns after two real minutes and resumes | Remove manual hold only; two wall minutes did not earn work | None |
| 20 | “Still working; 2/4” | Draw 4 + 1 = 5; +0 | None |
| 30 | “Kitchen tidied” | Draw 14 + 1 = 15; reach 4/4; apply completion once | None under this policy |

The player waited 30 active real seconds, plus the voluntary pause. An ETA is a forecast; the failed attempt changed actual completion time. Replay of the tick-30 wake must not set another reward or enqueue a surprise scene. Quiet success is a valid ending to this sequence.

## SB-07: an unexpected event instead — alternate target branch

Alternative fixture: K has a scheduled occurrence check at tick 20, after the contribution attempt. `d20 <= 3` triggers a bounded interruption; the fixed draw is 2. It establishes only the supported disturbance/hold specified by that policy. It does not let the model decide retroactively that the kitchen exploded.

At 2/4 progress, an event task produces an admitted comic scene:

> The kettle whistles Gary's name. Gary answers. From inside the kettle, something answers him back.

Possible target intentions: “Unplug it and leave it alone” (assured safety step if supported), “Listen without touching” (information check with admitted stakes), or “Ask Gary to translate” (only if that capability is established). The third option must be omitted otherwise. Being funny is not permission to invent a translator skill.

The selected supported resolution commits first; one D task can narrate it and offer resumption. The same K resumes with 2/4 at world tick 20; at tick 30 the next successful attempt completes. No event-time labor accrues while the solo decision hold is active. No second kitchen instance replaces the original.

This alternate branch adds E + D to SB-06, not an event after every household chore. The fully quiet branch remains Q. The absurd fiction changes, but work authority, held time, receipt identity and permitted options do not.

## What would convince the owner

They can read the scene, understand the risks, take a cautious path that stays cautious, and choose ordinary work without being forced into another episode. Failure changes the situation or method rather than demanding another click on the same button. Elapsed time matters when work starts, not because every sentence waits behind a timer. Refreshing, pausing or reopening the app does not erase these distinctions.
