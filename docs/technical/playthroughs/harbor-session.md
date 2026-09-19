# Gold session: quiet work, rapid scenes, deliberate return

Status: new **target fixture**, not the current beacon script or a recorded run. This combines the owner's desired rhythms into one connected session. BC-01 through BC-04 remain the source-grounded contribution arithmetic; this fixture deliberately changes the event dialogue and follow-ups. Rules/contracts belong to the [solo integration contract](../solo-gameplay-contract.md).

## Prepared content and initial state

Mara uses the existing beacon abilities: Intelligence 14, Wisdom 12, repair proficiency +2, admitted tool modifier +2. Repair A needs nine points, cadence five eligible ticks, DC 13, +3 success/+0 failure. Its occurrence schedule is every ten work ticks with d20 at most 8. B secures tools: three points, cadence five, Intelligence/tool total +4 against DC 8. W is a genuine ten-tick wait, not a contribution counter.

This fixture additionally declares bounded facts before play: stranger-present=false, stranger-claim-heard=false, stranger-credible=false, badge-inspection-attempted=false, work-area-clear=true, location=harbor-beacon. They are authored state, not dynamically invented capabilities. The declared local scene includes the adjacent harbor shelter; assured immediate withdrawal there is not general intertown travel. No general NPC actor model is needed to represent this narrow interaction. Repair completion grants four harbor credits once. W grants nothing. Carrying a declared apple quantity exercises the negative-option case; its presence creates no eating choice.

At opening H0 the Storyteller explicitly offers repair, the tool-securing opportunity and W, each with stated requirements/repeatability. A disappears after its target is repaired; B is not infinitely rewarded; W can repeat under its accepted terms. The first actor has one advancing work slot. The scene is an authored quiet situation, not an engine-generated action catalogue.

Demo rate: one tick per real second, no fictional-minute label. Longer campaign rates can use identical rules. Real time spent reading/generating required scenes is held, so the fixture's 35 active ticks do not predict a 35-second total human session.

## GS-01: begin and leave

Scene sample:

> The signal beacon is dark. The exposed tools are still where the last keeper left them. You can begin the repair, secure the tools first, or spend a little time watching the harbor.

The player selects repair at world tick 0. A starts at 0/9. No initial reward/check and no new model task merely to start. Tick 5: draw 9 + 6 = 15, A becomes 3/9. Tick 10: draw 4 + 6 = 10, still 3/9. Occurrence draw 6 then commits stranger-present=true and work-area-clear=false, interrupts A and establishes a controlling hold at world tick 10.

The player can leave the browser before tick 10. Reopening cannot credit further work past the hold. Preparation receives the committed arrival and A's actual state, not a model-authored prediction that repair probably finished during absence.

## GS-02: first rapid scene, no routine menu

H1, prepared from that receipt:

> Someone in a soaked harbor coat has climbed onto the landing. He stops short of the mechanism. “Is the light being repaired?”

Authored choices include “Ask whom he represents” (automatic: hear the prepared claim; set stranger-claim-heard=true) and a supported cautious withdrawal that preserves unfinished work instead of forcing conversation. No repair, wait, sleep, eating or generic travel option is exposed. H1's activity authorization is explicitly none.

Main branch chooses the question. Receipt I1 commits at tick 10; no die is needed for an assured exchange of prepared information. One D task narrates it and supplies the next scene. Selecting the same consumed offer again returns/rejects under normal command identity rules; it never repeats the exchange as a new effect.

The cautious alternative sets location=harbor-shelter, keeps the stranger/work-area facts and A's progress, and resolves the immediate confrontation by withdrawing. Its consequence explicitly offers only the shelter-bound form of W; A remains retained but not resumable there. It does not force the same interrogation, claim the stranger left, or award progress. The prepared wait definition is bound to the selected local spot by an admitted opportunity; the engine does not infer that binding from prose.

## GS-03: second rapid scene, information matters

H2:

> He says he was sent by the harbor watch. Beneath the wet coat you can just make out a badge. His claim is not yet proof.

The options are “Study the badge from the doorway” (Wisdom DC 11, failure leaves credibility unresolved) and “Keep your distance and decline further contact” (supported safe disengagement, no invented identification). The first requires the heard claim. Routine authorization remains none even though the character still owns tools and an apple.

Main branch draws 12 + 1 = 13; I2 sets stranger-credible=true and badge-inspection-attempted=true. One D task describes the admitted recognition, not a different success chosen for drama. The check requires inspection-attempted=false. On failure it sets only inspection-attempted=true; the next authored scene cannot offer the same inspection again. Its bounded safe continuation is withdrawal to the shelter as above, retaining incomplete work. This deliberately narrow failed branch is a fixture, not a universal ban on retrying with changed methods. It gives the coding model an exact rejection/state oracle for the anti-reroll concern exposed by SB-02; owner review may later improve the scene's range of intentions.

## GS-04: third rapid scene, still no automatic work

H3:

> The badge is genuine. He can pass the warning from the boat; he does not need to stand beside the exposed mechanism.

Authored choices: “Ask him to return to the boat” (automatic under recognized-authority terms: stranger-present=false, work-area-clear=true) or “Have him wait clear of the mechanism” (stranger-present remains true, work-area-clear=true). The second changes remembered circumstances rather than pretending he left. Neither choice itself starts repair or awards time/credit. These are fixture-specific supported fact effects, not a general persuasion-free command over every NPC.

Main branch selects return to boat. I3 commits at tick 10. Its D task publishes H4, which explicitly reauthorizes exact A resumption, B and W under their current prerequisites. In this target fixture, A/B require a clear work area, not absence of every bystander; the alternative lets a nonblocking stranger remain without cheating that predicate. The old quiet authorization was not restored by removing the stranger flag. Three player responses and their consequence scenes have happened with no activity ticks and no ambient routine menu.

This is the exact boundary to inspect: if W appears between H1 and H3, even though technically possible, the implementation violates Storyteller authorship. If H4 cannot explicitly reuse A/B/W without recreating their work/content, it violates reusable preparation.

## GS-05: B, then the same A

At H4 the player chooses B, not a prequeued successor. Start at world tick 10; A stays at effort cursor 10 and contribution 3/9. Tick 15: B draw 8 + 4 = 12 completes it. Its quiet policy records the result and reprojects only H4's still-valid authored selection. No generation task. B's completed goal is not offered again as fresh rewarded work.

The player immediately selects exact A. Tick 20: A draw 11 + 6 = 17 yields 6/9. Tick 25: draw 9 + 6 = 15 reaches 9/9, and occurrence draw 17 does not interrupt. Completion sets the beacon repaired and credits 0→4 once. These receipts are world ticks 20/25 despite A's old local start. A now has four contribution draws; B has one. Neither a menu refresh nor provider completion adds another.

If the player waits five more active ticks before resuming A, its attempts shift to world 25/30 instead. Idle time is not backfilled as work. This is a separate branch, not part of the 35-tick main ledger.

## GS-06: narration without taking over the present

Select one accepted repair-completion policy before play:

- Quiet branch: factual completion only, no generation task; H4's remaining authorized choices are filtered mechanically.
- Main reported branch: queue one optional report from tick 25, but do not change H4's authorization or hold routine play. The player independently selects W at tick 25; it is not an unaccepted automatic action.
- A separate interactive-completion variant can request a new scene and hold instead. Do not combine that controlling scene with unconditional W start.

In the reported branch, complete W at world tick 35. Delay report delivery until tick 37, during idle time. Example report: “The repaired beacon was shining by the end of the watch.” Attach it to the tick-25 completion. Current state stays idle at world 37 with four credits; the report cannot show an old repair choice as current, change the menu, grant credits or rewrite W's history.

An optional report failure leaves the factual completion intact; the fixture selects omission, not repeated automatic regeneration. A required scene failure instead leaves an explained hold. A manual pause during either kind of generation is not cleared by its eventual result.

## GS-07: outcome, return and exact ledger

The player should be able to say: “I made one sound repair, someone interrupted me, I handled that conversation, secured the tools, returned to the same repair and finished. I earned four credits. Then I waited because I chose to.”

| Boundary | World tick | A effort / contribution | B | W | Current authority |
| --- | ---: | --- | --- | --- | --- |
| Start | 0 | 0 / 0 | Not started | Not started | H0 quiet selection |
| First attempt | 5 | 5 / 3 | — | — | H0 |
| Arrival | 10 | 10 / 3, interrupted | — | — | Controlling hold; H1 when published |
| I1, I2, I3 | 10 | Unchanged | — | — | H1→H2→H3, each no routine access |
| H4 handoff | 10 | Retained | Start by player | — | Explicit new quiet selection |
| B complete | 15 | Unchanged | Complete | — | H4, filtered; exact A offered |
| A attempt | 20 | 15 / 6 | Complete | — | H4 scope, actor occupied |
| A complete | 25 | 20 / 9, complete | Complete | Start by player | H4 remaining selection |
| W complete | 35 | Complete | Complete | Complete | H4 remaining selection, idle |
| Late report | 37 | Unchanged | Unchanged | Unchanged | Historical annotation only |

O + E + 3D = five task calls in the nominal interactive path, plus optional R in the reported branch. Using the existing rough envelopes: 25k–50k input, 4.5k–9.8k output without R; add 2k–5k input and 0.2k–0.7k output for R. Expanded authorization/definition context must be measured later; these are not tokenized payloads or prices. All executions during development are scripted, with zero provider spend. Starts/resume/quiet B/W settlements create no generation tasks.

A no-occurrence replay from H0 instead keeps one quiet authorization across work: A succeeds at ticks 5/15/20 with the tick-10 failure, and occurrence draws at 10/20 both exceed 8. It completes at world 20. This branch does not include B or any three-scene detour. Record its separate totals; do not average incompatible histories into one alleged successful session.

## Rejections and contrasts required before calling the flow implemented

- Apple exists, but no authored eating option: no engine-added button at H1–H3.
- Old H0 start/resume after H1: reject before new effects; no queued work can sneak around the controlling hold.
- Duplicate boundary/publication: one result, one follow-up identity, no duplicate credits or new occurrence draws.
- Goal reached and event at the same tick: pending completion, then authorized revalidation without a fifth contribution draw; see the integration contract.
- Optional report delayed/failed versus required scene failed: different continuation behavior, equally honest receipts.
- Microbe absorption/migration uses the same authority, tick and exact-instance resumption boundary (NH-03), with no required tools, money or human anatomy.
- Repeat/reentry proves production paths and current snapshots. Directly marking B complete or restoring an old offer in SQL does not satisfy this trace.

The script demonstrates system control, not that a live model produces enjoyable dialogue. Owner review still needs to challenge the three-scene sample: if its choices feel padded or uninteresting, improve those intentions rather than adding timers or more scenes to make the trace look impressive.
