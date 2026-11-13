# Screen composition experiments | four real alternatives, one selected direction

**Status:** designer's comparative decision document. No rendered A/B tests or human validation have occurred. **Purpose:** avoid replacing a CRUD dashboard with the exact same CRUD layout in a fancy font.

## The problem a layout must solve

A game screen must carry *simultaneously*:
- the story's present fictional situation and context;
- player agency if a decision is available;
- a truthful ongoing commitment if the player has already acted;
- optional relevant knowledge (item, relationship, danger, prior event);
- an obvious path to history and settings;
- a sense of a **world**, not an assistant conversation or enterprise tool.

A single static arrangement may not be ideal for both a forty-second conversation and a ten-hour journey. Nevertheless, navigation, focus, status meanings and visual rhythm should remain consistent enough for the player to recognize one game.

**Inputs for comparison:** real long passage, one short dialogue, 3/9 repair interrupted, 10-hour journey, empty quiet life, no physical body/map. [Reference case studies](../evidence/comparative-game-research.md) motivate tests but do not determine the winner.

## Candidate A | Literary Reader

**Concept:** a beautifully composed text page with contextual action rows underneath and almost no persistent chrome.

\`\`\`text
┌──────────────────────────────────────────┐
│ ← Stories                   Journal · ...│
│                                          │
│            THE WATCH'S CLAIM             │
│                                          │
│    He says he was sent by the harbor     │
│    watch...                              │
│                                          │
│    ─── What will you do? ───────────     │
│    [Inspect the badge]                   │
│    [Decline further contact]             │
│                                          │
└──────────────────────────────────────────┘
\`\`\`

**Strengths:** high reading comfort; easy accessible order; works for unusual worlds with zero imagery. Low component debt.  
**Weaknesses:** may look like a prose publishing website; sense of place and earned time require stronger identity. A ten-hour activity can feel like a static article with a countdown.  
**Best use:** long dialogue, quiet introspection and narrow screens.  
**Reversal evidence:** if exploratory testers identify it as "novel with buttons" and fail to notice the actual ongoing world.

## Candidate B | Living Situation Stage (**recommended**)

**Concept:** one contextual *stage* whose foreground shifts between scene, activity and return. Text is still the center, but a **situation band** and optional atmospheric area suggest the world. Relevant facts are promoted only when actually useful. No permanent 3-column admin chrome.

\`\`\`text
┌──────────────────────────────────────────────────────────────┐
│ Stories ▾   THE BEACON LANDING         Decision waiting  ⋯  │
├──────────────────────────────────────────────────────────────┤
│        optional atmospheric scene / motif when provided     │
│        (never an empty image slot or primary game authority)│
├──────────────────────────────────────────────────────────────┤
│ THE STRANGER'S ARRIVAL                                     │
│                                                            │
│ The stranger stops short of the lens...                   │
│ Another paragraph anchors the immediate situation.        │
│                                                            │
│ [Repair suspended · 3/9 earned] [Inspect relevant context]  │
│ ────────── WHAT WILL YOU DO? ──────────────────────────────  │
│ [Ask who sent him]                 [Withdraw to shelter]    │
│                                                            │
│                               Journal  ·  Relevant details │
└──────────────────────────────────────────────────────────────┘
\`\`\`

**Strengths:** maintains narrative focus while creating a recognizably game-specific stage; the **same location/situation** changes authentically; supports short and long states; works without artwork. A concise context strip can preserve an interrupted commitment without a second dashboard.  
**Weaknesses:** still at risk of feeling like stacked cards if every block gets a border and button. Long text and mobile keyboard require careful composition.  
**Use:** default **Now** for scene, activity, interruption and return; adapt the center without remaking navigation.

**Important correction to first pass:** a **permanent context sidebar is not selected as an invariant**. The first design proposed a restrained shelf, but a fixed right rail may recreate the SaaS feel. Treat shelf as *one responsive optional embodiment* of known context. Prefer a single situational detail strip or expandable context if sufficient.

## Candidate C | Spatial Atlas + Narration

**Concept:** a place-first canvas, with map/illustration and narrative drawer.

\`\`\`text
┌──────────────────────────────────────────────────────────────┐
│ World/path/navigation overview               Condition     │
│ [large spatial region / map / vector character scene]       │
│ ──────────────────────────────────────────────────────────── │
│ An arrival. A description. Current offers in a lower pane.  │
└──────────────────────────────────────────────────────────────┘
\`\`\`

**Strengths:** powerful for spatial travel, route choices, relationship networks, recognizable destinations; can feel like a premium game.  
**Weaknesses:** requires asset/model/geometry investment, map truth and world-knowledge permissions; fails for a microbe, bodiless mind or purely social domestic story. Risks making the *map* drive the experience instead of the Storyteller.  
**Use:** optional World or geography-specific travel experiment, not default engine shell.

## Candidate D | Operations Dashboard (explicitly rejected)

**Concept:** permanent columns for history, status, progress, plan builder, inventory, notification, latest passage and actions.

**Strengths:** developer observability, QA and advanced rule inspection.  
**Weaknesses:** the player becomes the supervisor of a distributed job system; no sense of inhabiting fiction; costs a huge share of attention even when no action is needed.  
**Use:** developer Chamber and technical inspector only.

## Evaluation matrix (designer hypothesis, not measurement)

Score each dimension 1–5 (5 = stronger). These are provisional design judgments; change scores after real prototypes.

| Criterion | Weight | A Reader | B Stage | C Atlas | D Dashboard |
| --- | ---: | ---: | ---: | ---: | ---: |
| Immediate narrative legibility | 25% | 5 | 5 | 3 | 2 |
| Real-time commitment comprehension | 20% | 3 | 5 | 4 | 5 |
| Unusual-world neutrality | 20% | 5 | 5 | 2 | 3 |
| Felt “game-ness” without fake assets | 15% | 2 | 4 | 5* | 1 |
| Accessible responsive behavior | 10% | 5 | 4 | 2 | 2 |
| Maintainable with small team | 10% | 5 | 4 | 1 | 2 |
| **Weighted total** | 100% | **4.05** | **4.65** | **2.95** | **2.65** |

\`* C\` presupposes expensive spatial assets not currently justified. If unavailable, its score falls. The quantitative table is *a forcing function for trade-offs*, not empirical usability evidence. A human study can reverse B.

## Responsive composition for selected B

### Wide desktop, meaningful scene

- Minimal site/story header, situation strip (status), stage content, plain prose/action separation.
- Optional art/motif occupies controlled space only when actual relevant media exists.
- Optional contextual detail may appear as a *small shelf* if the player is deciding with multiple critical known facts, but not as default across all scenes.
- Keep long-form prose to comfortable reading measure, not a fixed 760 px CSS dogma. Actual typography dictates measure.

### Medium width

- Collapse the optional detail shelf into an inline disclosure or side sheet.
- Do not squash prose and choice rows into half-column cards.
- Keep the current decision near the narrative ending; meaningful status stays visible at top.

### Narrow phone

- One column. Story identity and state, short scene/motif if any, prose, relevant fact strip, explicit action region.
- Details/Journal are an accessible labelled sheet or route. Closing restores focus/reading position.
- No sticky action dock that blocks prose, unless a measured long-passage navigation task justifies one.
- Screen-reader reading order equals the actual task order, rather than a CSS visual reorder that contradicts DOM.

## Different states should *not* look like separate applications

| State | How the middle of B changes | What stays put |
| --- | --- | --- |
| Scene/decision | Published narration + clear choice region | Story identity, status semantics, contextual nav |
| Quiet place | Situation + **meaningful local opportunities** | Same narrative voice and action grammar |
| Ongoing work | Commitment presence + earned/forecast information; short scene context | Same story identity and truth labels |
| Journey | Known location/route/milestones and forecast; optional spatial cue | Same semantics for progress and risk |
| Interruption | Decision scene takes foreground; prior work collapses to saved strip | Same identity; no endless background bar |
| Return | Verifiable recent developments then actual present | No separate “inbox application” |
| Paused/blocked | Preserved last truth + exact hold explanation | No modal that erases the story |
| Nonhuman | Abstract situation and appropriate conditions | No obligatory map/portrait/body |

## Visual hierarchy tests before a single pixel of polish

1. At a glance, can you find the **current decision**, not just the narrator's last paragraph?
2. Is the work bar **stopped** when the scene is interrupted?
3. Does the image/motif (if provided) deepen the situation, or is it decorative filler?
4. Can you understand the scene with all imagery disabled?
5. Does a giant journal or world graph take over when the user only wants to ask one question?
6. Can the same shell represent an abstract consciousness without hidden fantasy defaults?
7. Does the design still feel like a **game** with long periods of quiet and no new prose?

## Before choosing an art direction

Prototype B with:
- Gold beacon H0, work, interruption and return.
- Microbe chemical gradient with no 3D geography.
- Long Morrowind-style journey that truly lasts hours.
- Ordinary conversation with almost no mechanical detail.

Then obtain real screen captures and a 5-person unprompted walkthrough. Ask not “Do you like it?” but “What will happen if you close this page now?” and “Which action would you take?” That is the first serious acceptance gate.
