# Life activities | spending time is how the player authors a life

**Status:** UX target and game-design diagnostic, not a new work/relationship subsystem. The player is not a workforce scheduler; the game uses time to create attachment. Related: [time models](../foundations/temporal-philosophy.md), [autonomy](../patterns/autonomy-and-absence.md), [interaction grammar](../patterns/interaction-grammar.md).

## The central insight

Time spent is itself a meaningful choice. A day working, four evenings studying, helping a stranger, exploring a ruin, or remaining inside a microbial colony shape the life. This is not inherently a **reward treadmill**, and no universal career, quest, combat or trading systems are required.

Sources worth studying: [Citizen Sleeper's creator on decisions expressed by how time is spent](https://news.xbox.com/en-us/2023/03/14/citizen-sleeper-episode-3-purge/), [Failbetter on short repeatable content](https://www.failbettergames.com/news/narrative-snippets-pacing), and [80 Days postmortem on tasks becoming chores](https://www.gamedeveloper.com/business/postmortem-inkle-s-i-80-days-i-).

## Four types of opportunities (player distinctions, not necessarily runtime enums)

| Type | Player question | Meaning | Typical UI |
| --- | --- | --- | --- |
| **Explore** | “What can I learn without committing yet?” | Menu navigation, existing known-information inspection | Small links/disclosures, no fictional time |
| **Immediate attempt** | “What can I try right now?” | One supported in-world action with its admitted duration/check | Direct contextual intention |
| **Sustained commitment** | “How will I invest the next hours?” | Durable work/travel/recovery/wait with costs, boundaries, interruption | Task proposition with clear real/fictive time |
| **Bounded life plan** | “What should I keep doing while absent?” | Several conditionally admitted next intentions and horizon | Separate **While away** review, not buttons attached to each action |

None of these categories grants authoring authority over world facts. A Storyteller may offer no meaningful local opportunities, especially in danger.

## The player-facing quiet-life composition

Scenario: an authored port with repair, watch, social opportunity and waiting already admitted. Show the situation first, not a job board:

```text
THE HARBOR IS QUIET
Morning. The customs office is open, and the
beacon still stands dark across the water.

HOW WOULD YOU LIKE TO SPEND YOUR TIME?

  Work on the beacon
  Repair progress: 3/9 earned, same saved commitment
  [Continue work]   (when reauthorized)

  Visit the watchhouse
  See what the officer wanted to discuss
  [Go there]        (only if current scene genuinely offers it)

  Watch the water
  Spend a bounded interval without working
  [Wait]

  [Review what I know]       [Plan while away] (when supported)
```

**Note:** visually this is *not* a dense 4-column catalogue of tasks with icons, percentages and priority flags. A relationship/social direction may lead to a conversation scene, a task to a commitment, and observation to supported waiting.

If the current scene explicitly authorizes **only repair**, show repair. Don't generate generic “rest, explore, trade, fight” options from capabilities; preserve Storyteller authorship and rule admission.

## Distinguish selecting a direction from beginning an action

A category such as **Visit somewhere** might expand to a few known places without fictional time. The actual **Go to watchhouse** action consumes its admitted duration and requires location/eligibility revalidation. The choice must communicate which stage is harmless exploration vs irrevocable commitment.

Likewise **Spend time with Mara** is not one magical control that silently produces +2 affection. It may open a current supported conversation, initiate an admitted short social activity, or be unavailable due to known circumstances.

## Repeated activities: don't turn the game into click labor

First time at a new task: fuller orientation, known stakes, why this action matters.  
Second and later within same authorization: compact remembered choice, preserved progress, one clear commit action.  
On meaningful change (new risk, new tool, changed relationship, world event): new contextual explanation and potentially revised offer.  
On quiet completion: compact factual outcome, optional sourced report, permitted next step.

An experienced player should **not** reread the exact same 300-word text twelve times to repair twelve objects. Yet the player can revisit relevant details when curious.

Repeated opportunity semantics are **backend rules**, not purely presentational optimization: ensure a repeatable definition doesn't bypass eligibility, reset the encounter cooldown or award the same one-time reward. The UI must use the current authorized offer/revision, not copy a stale button.

## Time investment and people

A character can become familiar with an innkeeper because the player repeatedly visits, helps, listens and shows up. A new significant passage may reference that shared history later. The engine doesn't need a universal +1 Friendship mechanic: continuity can emerge from saved interactions and relevant durable identities, with explicit rules where state changes require them.

Good examples:
- Worked at a shop several times, so the shopkeeper recognizes you.
- Spent time studying with a colleague, opening a later cooperative option.
- Kept watch during a festival, remembers who passed by.
- A microorganism stays near a stable nutrient source and responds to familiar environmental patterns.
- A distributed mind maintains an existing signal link while attempting another.

Not allowed without explicit authority:
- Automatically “befriended” someone because an unrelated idle clock ticked.
- Guaranteed romance from a repeatable visit.
- New NPC/possessions invented by a UI progress display.
- Habit automatically executing irreversible interactions when offline.

## What a long task card needs (without turning into a form)

Only decision-critical information:
- **Attempt:** “Repair the damaged signal.”
- **Known expense:** “Uses your repair tool” only if actually consumed/worn according to rules.
- **Time:** “Several work intervals; completion uncertain,” real estimate if supported.
- **Known risk:** “A storm may interrupt,” only if that hazard is known, without spoiling hidden triggers.
- **Interruption:** “Your existing patrol would be suspended” if currently applicable.
- **Consent:** “Start work” and, optionally, “Continue while away” under a supported plan.

Don't show a generic checklist of 15 action properties. If most actions need only an action label, let them stay simple.

## The role of playfulness and atmosphere

During quiet work, subtle world texture helps:
- current situation and a small piece of relevant descriptive fiction;
- optionally a location motif or a static environmental scene;
- recorded milestone and its actual consequence;
- quiet stretch with no artificial event quota;
- possibility of interruption, communicated through **known** expectations.

Avoid constant paid ambient text generation on every refresh. A silent scene can be evocative with original typography and a meaningful next horizon.

## Worlds without jobs or time units familiar to humans

For a microbe, opportunity may be **absorb energy**, **follow a gradient**, **contract away** or **wait through one environmental cycle**. No professions, gold, calendar days or “Next shift at 9:00.” A bodiless mind may **maintain link**, **extend awareness** and **listen for a signal**. UI uses the same intention / commitment / consequence semantics, with content-specific labels.

## Design acceptance scenarios

1. Player spends 30 real minutes of admitted time repairing; only saved successful contributions increment earned progress.
2. Player selects a social opportunity 3 times across a week; the game retains significant interactions and can reference them later without guaranteed reputation points.
3. Storyteller publishes a tense encounter; routine activities are **not** automatically present behind the scene.
4. Repeated one-time opportunity disappears when completed; reuse cannot refarm reward.
5. Two consecutive accepted quiet activities require no extra “Continue” if the second was already authorized.
6. Fictional time is still when there is no active commitment. The UI should not call this “waiting for a server tick.”
7. The same composition works for the microbe and a quiet domestic setting without a generic fantasy inventory.
8. Long tasks are enjoyable enough to commit to even when the UI offers no artificial fireworks.

## Mechanics redesign implication

If real multi-day life is the dream, the most impactful future mechanics are probably **safe routine reuse, durable relationships, richer consequences and bounded offscreen intention**, not the tenth progress-bar variant or a universal crafting tree. Those need separate rules and Storyteller evidence. UX must be an invitation into that game, not a substitute for it.
