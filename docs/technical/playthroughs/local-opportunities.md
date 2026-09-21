# Seyda Neen: choose local life without waking the Storyteller

Status: partly implemented. The maintained `seyda-neen-arrival.v1` mechanical
opening is the first bounded POC slice: it uses the existing generic facts,
checks, quantities and clock-based activity contracts for conversation, local
work and travel. The richer dormant local-opportunity lifecycle below remains
target design. This extends the [Vvardenfell trace](vvardenfell.md) with the
owner's distinction between prepared local opportunities and a preselected
queue. Exact values are fixtures. The reusable contract lives in [rules and
activities](../rules-and-activities.md#prepared-local-opportunities-proposed).

The POC seed deliberately does not introduce a warehouse subsystem, a Tamriel
calendar or a universal job board. `location`, `warehouse-shift-available` and
similar identifiers are content-authored facts interpreted through generic
requirements and effects. A different world may supply different facts or no
calendar, settlement, employment or travel concepts at all.

## LO-01: prepare the relevant place, not every possible future

The Storyteller establishes the current Seyda Neen situation and proposes a small, versioned package with supporting declared state. The server validates supported mechanics/targets and publishes it atomically with the scene. Preparation may use an opening or arrival generation, but general package generation is a proposed result-contract extension, not a capability already proven by the current opening task.

Example public scene:

> The harbor is quiet. There is a fishing spot by the lighthouse, a tavern where people linger, and a bed you have permission to use. Nothing demands an immediate answer.

This prose alone grants nothing. Its corresponding admitted opportunities might be:

| Local intention | Eligibility in this fixture | Routine result | Possible Storyteller wake |
| --- | --- | --- | --- |
| Fish by the lighthouse | Access to that spot, admitted suitable equipment/method and available capacity | Supported catch attempts, including no catch | Selected occurrence or significant finding |
| Chitchat in the tavern | Tavern access, appropriate capability, no controlling scene | Bounded social downtime/previously prepared observations; no compulsory relationship reward | Admitted contact or scene trigger |
| Listen discreetly for rumors | Access, supported sensing/stealth method and captured risk | Reveal one eligible prepared rumor or learn nothing | Being noticed, a selected lead, or another supported event |
| Sleep in the available bed | Permission, access and an admitted safe-rest condition | Clock-based rest under this ruleset | Only its selected hooks; sleep does not require periodic narration |

No one starts merely because their button exists. The player did not accept an overnight plan. This is the Storyteller's explicit selection for this situation, not a command queue or an engine-generated list of everything mechanically possible. Even if the character owns an apple, “Eat apple” is absent unless the Storyteller includes it. A different situation can select none of these activities.

The Storyteller becomes dormant: no scheduled model poll, no call on opening the menu, no new task just to render facts or decide whether those conditions still hold.

## LO-02: two separately chosen activities, zero further calls

Fixture clock: one tick = one fictional minute, at one tick per real minute. The player chooses a thirty-tick fishing attempt, finishes, then independently chooses thirty ticks of tavern downtime. They did not prequeue both before the model became dormant.

Fishing uses an admitted applicable +2 modifier against DC 12 every fifteen ticks. Draw 4 gives 6: no catch. Draw 10 gives 12: one supported catch effect. At tick 30, complete and publish factual results. No fresh prose, no generation task. A new eligible public offer is composed from the local package with fresh state/command fencing; it does not resurrect the consumed offer.

The tavern activity completes at tick 60 with the selected quiet outcome and no new reward. The character may choose fishing again, rest, or listen for rumors if still eligible. Repeating fishing creates fresh work/draw receipts and rechecks resources. It does not repeat the old catch receipt or require regenerated fishing instructions.

Moving between these activity sites must itself follow the supported position/access abstraction. For this narrow fixture they are already within one accessible local scene, with assured immediate repositioning explicitly admitted. This is not permission to turn travel between towns into a menu click; a broader spatial model would introduce its own movement work.

## LO-03: three real hours gathering rumors

Start at tick 60, select a 180-tick bounded listening routine. It makes one information check every thirty ticks, Wisdom plus an admitted skill for a total +3 against DC 12. There is one prepared rumor R1: an explicitly unverified statement, not world truth. Its revelation is allowed once per character under these captured terms. Further successful checks may learn nothing new; they do not fabricate six fresh conspiracies.

An independent event-occurrence check follows each information check: `d20 <= 2` requests a special development. These are separate draws, and a failed information check need not cause an event.

| World tick | Active listening time | Information draw +3 | Factual result | Occurrence draw |
| ---: | ---: | --- | --- | --- |
| 90 | 30 min | 11 → 14, success | Reveal prepared R1, marked rumor, once | 18: none |
| 120 | 60 min | 4 → 7, failure | Nothing new | 9: none |
| 150 | 90 min | 14 → 17, success | No other prepared finding; nothing new | 11: none |
| 180 | 120 min | 6 → 9, failure | Nothing new | 15: none |
| 210 | 150 min | 12 → 15, success | Nothing new | 7: none |
| 240 | 180 min | 3 → 6, failure | Nothing new | Quiet branch 12: none; event branch 1: candidate |

Quiet branch: work completes and the eligible local menu remains available. No reward or generated closing paragraph is required. The character spent time and heard one prepared rumor; this routine does not guarantee progress or drama. Stopping/restarting cannot reset R1's reveal state or redraw a committed occurrence boundary.

Event branch: at tick 240, settle the final check and record the candidate once. Its configured interactive follow-up takes precedence over returning to ordinary local choices. The current solo proposal holds while the required next interaction is prepared; available spending and candidate fallback are governed by the accepted policy. If a different rule had already committed a hazard, that hazard could not be discarded on provider failure.

The wake packet supplies these receipts, R1's claim status, relevant history, the current local package and revisions, active/retained work and supported capabilities. A proposed event might be an NPC challenging the listener about their interest. It cannot treat R1 as confirmed or retroactively say a failed information check succeeded.

After the admitted scene and player response, the Storyteller explicitly supplies the next situation's choices and activity authorization. It might carry forward fishing but exclude discreet listening, or offer only the next scene's intentions. The engine must not restore the previous tavern menu simply because the response completed. If the Storyteller reauthorizes a quiet selection, the game can become dormant again without regenerating every definition. Not every wake means a fight or a compulsory return to routine play.

The quiet situation does not remove Storyteller initiative. Under a directed campaign, the private narrative direction might contain an approaching celestial threat. Fishing can continue for several admitted intervals, then a bounded world development makes the daylight strangely red and requests a Storyteller turn. That turn may reveal the meteor and still offer “continue fishing” alongside investigation, warning others or shelter when supported. The Storyteller authored a larger pressure; it did not choose the player's response. Under an explicit no-grand-narrative campaign, the same quiet fishing may remain the story indefinitely unless player choices, established causality or separately admitted incidents change it. Neither branch is the universal default.

## LO-04: a dramatic situation closes ordinary opportunities

Separate Red Mountain fixture: entry into a declared confrontation phase establishes unsafe rest and closed exit routes. Its validated scene policy excludes incompatible routine starts. Do not copy Seyda Neen's bed or fishing opportunities into this scope, and do not append universal sleep/travel buttons underneath the scene.

- A stale previously visible sleep/travel command is rejected before a draw, debit or activity start.
- A continuously required safe-rest condition changing interrupts incompatible ongoing rest at the admitted boundary; hiding the button alone would leave the exploit running.
- A supported action that opens a route can restore departure without generation only when that conditional choice is already in the current Storyteller-authored selection. Mechanical access alone never creates a travel button. If the destination/path has never been established, new preparation is also required.
- A retreat or shelter option can exist when the Storyteller offers it and the rules support it. The Storyteller can instead present a focused sequence with no routine access, without pretending that every omitted activity is physically impossible.
- Campaign pause/authorized stop remain controls, not story opportunities that the model may censor away. No sleep in this fixture does not mean sleep is impossible everywhere called Red Mountain.

The important idea is a deliberately authored interaction, not automatic exposure of all physical possibilities. Public explanations can say “No safe place to rest here” or “The exits are sealed” when actually established; do not fabricate such facts to explain a focused menu. Resolving a decision removes its hold, not every other hold and not the Storyteller's current choice boundary.

For example, one rapid branch can run: the chamber shudders → choose to shield an ally or investigate the mechanism → resolve the supported immediate action → the next scene reveals the consequence and offers a fresh decision → another immediate response → another scene. Each scene explicitly authorizes no routine starts. An apple remains in inventory throughout but produces no eating button; clearing one threat does not make sleep appear. These turns add no artificial activity wait, while model preparation latency remains real. Only a later Storyteller-authored transition offers a respite or travel. The opposite branch can explicitly offer the extended journey from Vivec toward Gnisis, governed by its real work/time terms rather than rapid-scene timing. Both rhythms belong to the same game.

## LO-05: nonhuman contrast and cost

A microbe's Storyteller-authored selection could offer absorption, migration or protective contraction. Loss of nutrient access disables the selected absorption option; regaining access can restore it only while that same authorization remains valid. A new threat scene may offer only immediate reactions even if nutrients remain. An abstract consciousness's connection phase can do the same without geography. These use the same authored-choice/eligibility boundary, not a mandatory village, bed or job board.

After preparation, LO-02 and the quiet LO-03 branch admit **zero generation tasks and zero provider calls**, even though the player makes several fresh choices. Event branch adds an E-shaped preparation and, if one response requires narration, D; budget nominally 11k–22k input and 1.9k–4.2k output under the [planning envelopes](storyteller.md#illustrative-token-envelopes). Initial package generation must be counted separately: its schema/content may exceed the existing opening envelope and has not been tokenized or implemented. Prepared text disclosure is not generated dialogue; genuinely novel exchanges incur their own calls.

Acceptance: complete one activity, independently select another and repeat an eligible activity while the Storyteller stays dormant; then change a controlling condition and prove stale/new starts cannot bypass it. Compare quiet and event branches without altering the reusable rules or adding scenario-name branches. This is a stronger proof than a hardwired A → B queue reaching its endpoint.
