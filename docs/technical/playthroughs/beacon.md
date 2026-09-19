# Beacon: exact labor, interruption and return

This is the most source-grounded activity trace and the proposed first mechanical anchor. [Current fixture](../../../packages/storyteller/src/fixtures/mechanical.ts), [rule resolver](../../../packages/game/src/activities.ts), [application settlement](../../../packages/application/src/campaign/activities.ts). Rolls below are deliberately selected examples, not recorded execution.

## BC-01: accepted terms — current

Mara has Intelligence 14, repair proficiency +2 and an admitted repair-tools modifier +2. Required contribution is 9; attempts occur every five activity ticks. Intelligence/repair DC 13 earns 3 on success, 0 on failure. Total modifier is +6, so an ordinary d20 of 7 or above succeeds: 14/20 = 70%.

An uninterrupted forecast from zero is three successes / 0.7 × five ticks ≈ 21.43 eligible ticks. It is neither a guarantee nor a deadline. No tools means the current fact requirement rejects the start; it does not merely add a few minutes to the ETA. A future eligibility policy may permit another method, but “every actor can do every job slowly” is not assumed.

Every ten activity ticks, an independent event check succeeds on `d20 <= 8`. The success branch commits `stranger-at-beacon=true` and interrupts. Completion sets `beacon-damaged=false` and grants four harbor credits. No credit is granted just for starting.

The public choice is “Begin restoring the beacon,” with visible risk that failed attempts consume time and trouble may interrupt. It should not promise “done in twenty minutes.” For the tables only, choose one tick per real second and no fictional calendar mapping; tick is displayed as tick. This rate is an illustrative demonstration setting, not inferred from source labels.

## BC-02: ordinary progress — current mechanics

| World tick / A cursor | Recorded resolution | Work A | Other effects | Generation |
| --- | --- | --- | --- | --- |
| 0 / 0 | Start admitted | 0/9, running | No reward | No resolution roll at start |
| 5 / 5 | d20 9 + 6 = 15 ≥ 13 | 3/9 | None | No boundary narration while running |
| 10 / 10 | d20 4 + 6 = 10 < 13 | Still 3/9 | None from contribution | Still no call just because the attempt failed |
| 10 / 10 | Event d20 6 ≤ 8 | Encounter/suspended work | Stranger fact committed | Consequence task requested |

Contribution settles before scheduled checks at a coincident boundary. The stranger is now a committed mechanical fact, not an optional LLM suggestion. A failed/invalid consequence cannot erase the arrival or repair the beacon instead.

The player sees incomplete repair and a stranger at the landing, not a repaired beacon with a dramatic paragraph tacked on. One E-shaped scene is needed for interaction; currently this is represented by the consequence task. Model input includes the rolls/effects, 3/9 retained progress through the relevant application context where supplied, current character/facts and committed narrative evidence. Do not assume today's payload already contains the full proposed activity/participation packet described in the atlas.

## BC-03: deal with the stranger — current choice, design problem exposed

The current fixture offers:

- “Challenge the stranger”: Wisdom DC 11, no proficiency. Mara's Wisdom 12 gives +1. Our draw 12 gives 13, success; set `stranger-at-beacon=false`.
- “Bar the beacon door”: described as waiting until the stranger leaves; currently automatic, sets the same fact false and advances **zero ticks**.

The second option is an actual content/mechanics mismatch. Its risk claims extra time but its plan does not spend any. Target choices are either an immediate “bar the door” that only establishes a barrier, with departure still unresolved, or a supported waiting activity whose future outcome clears the stranger. A textual “until” cannot implement waiting. Do not use this option as evidence that elapsed waits already work.

The main trace selects Challenge successfully. The action receipt commits at world tick 10. Its D task offers return to repair or “Secure the repair tools.” A is not completed by winning the conversation.

## BC-04: B actually advances before A resumes — partly current, target chronology

Select tool-securing work B. Its existing fixture requires three points, cadence five, Intelligence DC 8 with tool modifier +2, no proficiency. Draw 8 + 2 + 2 = 12 earns all three points. A remains at 3/9 while B works.

The intended complete sequence is:

| World tick | Active work and local cursor | Result | A progress |
| ---: | --- | --- | ---: |
| 10 | Start B, cursor 0 | Suspend A; release/reassign capacity under target allocation policy | 3/9 |
| 15 | B cursor 5 | B completes once; any own completion effects settle | 3/9 |
| 15 | Resume exact instance A, cursor still 10 | Validate target/tools/current availability; no work earned while on B | 3/9 |
| 20 | A cursor 15 | Draw 11 + 6 = 17; add 3 | 6/9 |
| 25 | A cursor 20 | Draw 9 + 6 = 15; add 3; event draw 17 > 8, no interruption | 9/9 |
| 25 | Complete A | Set damaged=false; harbor credit 0→4 exactly once | Terminal |

**Current gap:** `startTick + cursorTick` can set the campaign back to 15 at the target world-tick-20 settlement. The retained A row does not prove correct shared chronology. Current resume matching also uses reusable action identity rather than explicitly choosing the exact instance. The existing integration shortcut manually finishes B and restores an offer; it does not demonstrate this full sequence. See [activity phase 1](../../features/2026-09-18--16-48--activity-processes-and-progress/PLAN.md).

The target clock correction must show A's next effort due at world 20 without rewriting historical receipts. A fresh offer should select the exact A instance and explain if tools or target state changed. It must not resume whichever matching definition happens to be first in a query.

## BC-05: completion and follow-up are separate — target policy

Current non-running settlement requests consequence narration. The same completed A must eventually support all of these accepted configurations:

1. **Quiet:** factual “Beacon restored; +4 harbor credit,” no generation task, idle or next admitted chain entry.
2. **Report and continue:** optional generated account of the restored light; already-accepted successor can start; report cannot grant a second reward or open current choices.
3. **Interactive:** new scene is required; progress/reward already committed, but relevant continuation holds pending validated publication and response.

A terminal completion cannot be replayed as a new attempt just to obtain another ending or reroll the last check. Different reporting does not change the physics of the repair.

For the proposed report-only task and late-publication race, use [RM-04](red-mountain.md#rm-04-the-gate-three-different-configurations).

## BC-06: collisions and controls

If the final contribution and stranger arrival both succeed at A cursor 20, today's order interrupts before applying completion. The work may have 9/9 contribution but no completion effects yet. The [selected solo contract](../solo-gameplay-contract.md#equal-tick-resolution-and-goal-reaching-interruption) preserves contribution→occurrence→completion ordering: show completion pending, then settle it on explicit eligible resumption without another contribution/occurrence draw. “100%” is not evidence that harbor credit already exists. Target invalidation before resume follows its admitted rule instead of silently granting success. This is a proposed fix, not current runtime evidence.

Additional target branches:

- Pause halfway to an attempt: retain the campaign's exact rational clock remainder and the work's eligible whole-tick effort under the new quantized clock contract; paused wall time earns nothing. Do not duplicate the fraction across A and B. Other loss policies must be captured explicitly.
- Cancel B before it completes: no completion effect merely because most of its time elapsed. A can still be retained; choosing A is a separate admitted action.
- Abandon A: terminal instance, history and spent effort remain. Starting a new repair must follow the declared world-progress policy, not resume an abandoned row by mistake.
- Tools disappear while A is suspended: resume blocks or offers a new admitted method. A clever paragraph cannot satisfy missing eligibility.
- Retry tick 25 or the completion outbox: return existing receipts/follow-up identities, not new credits, draws or scenes.

## BC-07: why shared work is a real extension

Future second worker joins the same beacon instance at world 15. Their own skill/tools/cadence determine their subsequent attempts; they do not receive credit for work before joining. If Mara leaves, the beacon's established work remains according to its retention policy. The target is the beacon, the performer is Mara/another worker, and the reward beneficiary is a separately captured identity. Replacing the worker cannot redirect harbor credit by accident.

A role that requires assistance during an entire attempt must prove overlapping participation; another actor arriving at the final tick cannot retroactively help. No need for a per-NPC life simulator or generic executable workflow language to support this distinction.

## Cost and acceptance

An illustrative current-style path with opening, encounter, challenge consequence, B completion and A completion is O + 4D: five tasks, all free under scripted execution. Exact resumption/task sequencing must be demonstrated through the real application path rather than inferred from this ledger. The redesigned quiet completion path can omit B/A completion model calls when no scene is needed; mechanical public resumption must then exist without requiring generated prose to expose it.

The core proof is concrete: 25 eligible world ticks, five spent on B, A earning 3+0+3+3 across four contribution attempts, one stranger occurrence, no rewind, and one four-credit award. Count four A contribution attempts and one B attempt; do not confuse an occurrence roll with labor. If the owner cannot explain why repair took that long from the receipts, the POC is not yet legible.
