---
id: DOC-REFERENCE-SCENARIOS
layer: product
status: draft
domains: [validation]
tags: [offline-play, autonomy, time-cost, affordability, continuity]
updated: 2026-09-16
relations:
  - type: verifies
    target: DOC-AI-BUDGET
  - type: relates_to
    target: DOC-RELEASE-SCOPE
  - type: depends_on
    target: DOC-GAME-SYSTEMS
---

# Reference campaigns and mechanical stress cases

These are product thought experiments and future acceptance cases, not executed game tests. Numerical fixtures are deliberately synthetic, not adopted D&D rules or balance. The purpose is to force exact questions without pretending they have been answered. Requirements remain owned by their topic documents.

## v0.01 reading and test scope

[DOC-RELEASE-SCOPE](../foundations/scope-and-release-plan.md#completion-checks) owns completion checks. Use SCN-010 for routine life, SCN-011–015 for storyteller/continuity/intervention, and SCN-016–018 for agency/return. Combine these in one small supported campaign rather than implementing a separate game for each example.

SCN-004 combat and SCN-008 cross-scale worlds are later design stress cases, not first-build gates. SCN-007 is a sparse-state comparison, not a required population benchmark. Alternate hold-mode cases apply only if that policy is implemented. All cases remain unexecuted.

## SCN-001 — A quiet week that still has a life

Fixture: one character, one employer, lodging, recurring expenses, two personally relevant NPCs, and a nearby route. The campaign runs at one fictional hour per real hour for this case. The player delegates for 168 hours, then returns. Use supported logical routines, with at most 40 optional generation calls across the case as a cost illustration; the player's money cap remains controlling.

An illustrative ledger makes actual behavior checkable: start with 20 currency units; five planned 8-hour shifts at 1 unit per completed work hour; seven daily expenses of 3 units. Four shifts complete and one stops halfway, giving 36 performed hours. If the chosen agreement pays completed hours immediately, closing cash is 20 + 36 - 21 = 35. If payment is due later, 36 is a receivable, not cash. If partial attendance invalidates pay, a different explicit agreement must say so before the result is calculated. None of these wage contracts is yet adopted.

Useful change is not necessarily a disaster: an obligation, an acquaintance's request, a work interruption or a new opportunity can make the return interesting. A full week of identical income lines is evidence to reconsider the loop, even if accounting is correct. Do not manufacture a dramatic calamity merely to make every recap exciting.

Expected evidence: actual work, paid versus owed wages, expenses, location, current activity, the cause of the half-shift, consequential personal developments, number of model calls and total modeled spend. No story is needed for each meal or hour. A recap must not invent an off-screen conversation that already changed a relationship without a corresponding resolved event.

Decisions exposed: work agreement, recurrence, bodily needs, meaningful social change, action incompatibility and what makes the player want another week. Owners: [DOC-EMPLOYMENT](../activities/employment-crafting-and-trade.md), DOC-ROUTINES and DOC-GOALS-ORDERS. Detailed relationship mechanics still need their planned owner.

## SCN-002 — Travel interrupted by a world event

Fixture: a 24 km route, 4 km/hour effective speed, no rest requirement within the initial six-hour journey. These numbers test accounting only. After two hours the character is 8 km along the route. A closure then matters at a known position.

The next outcome depends on where the closure is and how the traveler learns of it. Instant knowledge of a distant closure is not automatic. A traveler who encounters the obstacle may wait, turn back or use a defined alternative; they cannot simply appear at the destination. A detour changes arrival time and supplies. A messenger's arrival, the closure's occurrence and discovery can have different times.

Re-run with accelerated passage. It must not grant the six-hour arrival before considering the two-hour interruption. Re-run with a two-hour manual pause: no movement, depletion or closure progression during the paused interval. Re-run with an unrelated distant town: its existence alone should add no local travel work.

Expected evidence: position before/after interruption, elapsed fictional time, reachable choices, supply use, information available and cause of any revised arrival estimate. Prose cannot settle contradictory geography.

Decisions exposed: route representation, interruption boundaries, knowledge propagation, concurrent travel/conversation and supplies. Owner: [DOC-TRAVEL](../worlds/places-travel-and-distance.md); constraints from DOC-TIME-AUTONOMY, DOC-WORLD-EVENTS and DOC-KNOWLEDGE-BELIEFS.

## SCN-003 — A fallible choice without arbitrary stupidity

Fixture: an impulsive character intends to work but receives a tempting invitation. The invitation is actually available, known to the character and compatible with their location. The character may abandon work, with consequences under the employment agreement. The product must be able to explain the relevant motive and circumstances without inventing a guaranteed compliance rate.

Compare a hungry character with no money against the same character with savings and no urgent obligation. A trait need not determine one action in every situation. Nor should a cheap model's misunderstanding be relabeled as impulsivity.

Repeat eligibility checking at one-minute and one-hour computational intervals. Mere polling frequency must not multiply the temptation probability. For perspective, a hypothetical independent 1% dangerous-event chance per hour produces an 81.5% chance of at least one such event over 168 hours; per day it gives about 6.8% over seven days. These are not proposed encounter rates. They show why danger must be defined against meaningful fictional exposure rather than engine ticks or number of prompts.

Expected evidence: permitted information, legal alternatives, character motives, what could vary, what remains forbidden, and the consequences actually applied. Compare cheap/richer handling without claiming equal seeds will make different models choose identical actions.

Decisions exposed: disobedience versus hard authority, stable characterization, risk exposure and permitted spending-profile effects. Owners: DOC-CHARACTER-IDENTITY, DOC-GOALS-ORDERS, DOC-AUTONOMOUS-RISK and AI-F01.

## SCN-004 — A small combat inside the same world clock

Fixture: four combatants, several rounds, selected supported equipment/abilities. No invented D&D round duration or action economy is prescribed here; adopt them from the selected source baseline. Each actor's choice and the mechanical resolution are separate. Position, reach/range, available actions, resource costs and legal effects must be explicit enough to resolve the encounter without a narrator inventing them.

While the player reads or the model responds, what happens elsewhere in the campaign? Under an explicitly selected later combat decision-pause style, the entire world waits. This is not the v0.01 delegated-play default. Once an action/round advances fictional time, concurrent effects advance consistently with that duration. Do not let an employer finish an hour of production merely because a combat reply took an hour of wall time during global pause.

A model can describe a confirmed blow or choose among legal tactics. It cannot add a second attack, restore a used resource or turn a late intervention into a different resolved action. A thirty-second service delay must not quietly become thirty seconds of enemy attacks unless that explicit play style has been chosen.

Expected evidence: legal choice set, action ordering, affected entities, resources and clock changes, plus a plain factual result if narration fails. Resolve limited supported magic before calling the encounter complete if the chosen character has it.

Decisions exposed: edition/coverage, combat geometry, action granularity, direct-play pause, retreat and defeat. Owners: [DOC-DND-BASELINE](../rules/dnd-baseline-and-coverage.md), [DOC-COMBAT](../rules/combat-and-initiative.md) and TIME-F01. Detailed health and separate clock/pause topics remain planned.

## SCN-005 — Money or model access runs out during absence

Fixture: unattended allowance is nearly spent, routine work continues, then an event arrives. Run three variants: an optional recap; an event with a valid logical choice policy; an event requiring unresolved creative adjudication with no permitted fallback.

Proposed outcomes under AI-COST-004: skip optional prose; continue supported mechanics; pause globally before the unsupported decision. A paused week is reported as a partial week of progression, not a whole week survived. No borrowing from active-play allowance without an explicit shared-budget policy. No extra retries hidden outside the cap.

If a response arrives after the situation changed, it cannot spend fictional resources or publish a contradictory outcome. On return the player sees the pause/reduced-generation reason and actual elapsed fictional time.

Tradeoff: a pause at unsupported danger can alter difficulty. Label this as degraded availability, not successful survival. A strict mode needs a predetermined supported fallback or explicit pause semantics; it cannot invent a lethal outcome just to discourage budget exhaustion.

Expected evidence: spent/committed/remaining allowance, accepted or skipped calls, valid fallback, clock state and player-facing explanation. Owner: DOC-AI-BUDGET; exact implementation verification is later.

## SCN-006 — The computer is off for a week

D038 now selects the browser-closed service/phone experience for the first web release. The two options below remain a useful broader comparison; local-only catch-up is no longer sufficient for SCN-009 or an unresolved alternative to that selected initial experience.

User direction D032 favors configurable autonomy/contact as circumstances change, not a permanently fixed lifestyle. The comparison below isolates availability guarantees, which those preferences alone cannot supply. It does not require both execution options in the first release.

Two materially different availability models can be compared; continuous availability is selected for the finished first phone loop. **Continuous availability:** world progress and timely invitations can occur while the player's computer is off, requiring some available runtime and its operating cost. **Catch-up on return:** the game resolves elapsed permitted time when running again; no claim of timely midweek invitations, and catch-up must stop at configured decision boundaries.

Both can portray a persistent life. They do not offer the same interaction contract. Catch-up must be bounded enough to return to play promptly; if it cannot finish, the user needs a clear progress/pause state. Neither option may charge for a week of unrequested narrative playback on reopening.

Test clock restart, manual pause before shutdown, an event that stops progression midway, and return on another device. Choose the intended experience before selecting hosting technology.

Also switch from frequent invitations to muted contact while a choice is pending. Define whether its original deadline remains, whether autonomy is separately changed, and whether any change pauses the world. A notification preference must not silently grant new authority or retroactively erase an invitation's already-resolved outcome. These transition semantics are still proposals.

## SCN-007 — Small world, larger world, same relevant story

Use the bounded campaign from DOC-RELEASE-SCOPE. Optionally add remote lore or synthetic dormant records and compare the same relevant local scenario; this is a test fixture, not a requirement to generate 1,000 residents. Names alone should not require thinking, relationship updates or model calls. Add one actual remote supplier relationship: now a distant closure may need to affect local stock, wages or opportunity at a plausible time.

A world of 10,000 actors updated once per second implies 6.048 billion actor updates in a real week. An all-pairs relationship scan has 49,995,000 unordered pairs per pass before storing beliefs or dialogue. These are arithmetic warnings, not runtime benchmarks. Ordinary logic is much cheaper than repeated hosted inference, but it is not costless at arbitrary scale.

Changing detail must preserve established possessions, debts and consequences. A store cannot sell the same last item locally and remotely because two levels of detail disagree. A region first described on entry must not retroactively invalidate a prior known supply or travel consequence.

Measure later: work per consequential event, retained state, catch-up duration, model requests, total spend and consistency across detail boundaries. Product-level promise: consequential continuity without requiring every inhabitant to enact every action explicitly. Owner: DOC-WORLD-DETAIL.

## SCN-008 — A wizard, asteroid miner and microscopic traveler

Denis's cross-domain illustration: a powerful wizard travels by spaceship to mine an asteroid, is reduced to microscopic scale and confronts viruses. This is a fantasy stress case, not a claim that viruses behave like human combatants, a scientifically accurate simulation, or bundled franchise content. Biological behavior and combat abstractions need an explicit campaign interpretation.

At creation, establish the actor's starting capabilities rather than forcing a weak starting character. Identify what the ship can do, the route/time requirements, environmental protection, mining prerequisites, yield and storage limits. A magical shortcut must follow its adopted costs and restrictions; the model cannot waive travel or mining rules by enthusiastic description.

At transformation, identify the trigger, affected actors and equipment, new form/size, retained or changed powers, environmental compatibility, location/containment and whether the current mining activity stops. Decide how strength, sensing, reach and relevant units change. The same ship and asteroid remain part of history. The game cannot delete cargo or duplicate equipment by changing scale.

At microscopic scale, identify reachable targets, means of sensing and interaction, applicable hazards, and what the imagined confrontation actually means mechanically. Decide whether viruses are agents, hazards or another kind of entity in this campaign; not every threat needs intentions or an LLM. Resolve actions against defined capabilities and effects. If external actors can intervene, define cross-scale influence and time relationships. Global pause still freezes the campaign.

At return to the prior scale, reconcile location, equipment, effects, elapsed time, resources and interrupted commitments. A return summary describes resolved history, not a newly invented explanation for missing state.

Cheap handling: supported travel, mining, resource updates and encounter resolution use rules. Models may help prepare the profile, portray interaction and describe unusual experiences. Unknown mechanics require explicit extension or disclosed approximation, not one paid improvisation for every tick. Setup and extension budgets are separate from unattended-operation allowances.

Companion check: play a bird using the same conceptual contracts. It must not require hands, wages, spoken conversation, a human diet or an arbitrary conversion of all behavior into a combat class. Success means the abstraction preserves meaningful differences, not that every life has identical verbs or statistics.

Open: the D&D adoption/extension boundary, valid cross-scale interactions, simple setup versus mechanical completeness, and which supported combinations belong in the initial slice. Owners: DOC-STARTING-WORLDS, DOC-GAME-SYSTEMS and the eventual relevant rules/adaptation topics. This thought experiment has not been implemented or validated as gameplay.

## SCN-009 — Generated miner life through the web and phone

This is the first-release reference journey from D038. Kwama mining, Vvardenfell, Vivec and septims are the user's premise, not verified setting facts or mandatory content for other worlds. Times and money below are fixture values. This case supersedes requiring dialogue or a complete combat encounter before the first app is useful.

**Create:** Submit the premise through the world builder. Receive a bounded square map, a home, reachable mine and city/tavern destinations with abstract interiors, relevant NPCs and organizations, with incidental residents abstract. Starting clothing/resources and a valid work agreement exist as persistent game facts. Setup validates references, reachability and eligibility before play; a pretty map without executable actions fails.

**Leave:** Choose travel to the mine and authorize work on arrival. Close the web app. Progress uses the selected game speed while the service is available. An arrival message may also report that work started; it does not imply a separate player approval was received. The resident NPCs retain their locations/routines rather than respawn on each map visit.

**Work and pay:** In this fixture, the agreement pays five currency units on completing a ten-fictional-hour shift. At 10×, that takes one real hour of running time. Travel uses that same speed: if it took one real hour, its fictional duration was ten hours, unless an explicit speed change occurred. Resolve any interruption under the agreement before awarding pay. Increment actual spendable currency once; distinguish earned-but-unpaid money if different payment terms are selected.

**Phone decision:** Send a factual completion/payment update. Open the mobile app at current choices: another authorized activity, travel to the city, or pause. Under the D057 baseline the authorized routine continues, and the phone shows the current situation rather than an obsolete invitation. A hold-mode variation is optional, not the baseline. Choose city travel, then enter the tavern through its access connection. Inspect clothes, tools, currency and current location. No dialogue or model call is needed to display this state.

**Optional trade:** Buy an available item at a posted price from the candidate simple merchant. Currency and stock change consistently. Repeat submission or reopening the notification must not duplicate the purchase or wages.

**Failures:** Test denied/muted push, delayed delivery, an expired/resolved choice, a duplicate click, zero remaining model budget, a restart mid-journey and an interrupted shift. Show actual outcomes and pending decisions. Repeated ticks cannot multiply progress or event risk. A generation or notification outage cannot invent completed work.

**Evidence to collect later:** setup completion/repair results and cost; actual progress timing; consistent inventory/history; absence of routine inference calls; delivery behavior on the chosen phone; and successful recovery without duplicated effects. No measurements have been performed. Owners: DOC-STARTING-WORLDS, DOC-TRAVEL, DOC-EMPLOYMENT, DOC-INVENTORY, DOC-ORGANIZATIONS, DOC-INTERVENTION and DOC-AI-BUDGET.

## Validation limits

No gameplay, latency, fun, model quality or compute performance has been measured. The cases expose missing contracts and provide a shared test vocabulary. Elaborate the owning mechanic, walk through the case by hand, and only later build an executable test when implementation is authorized. Avoid adding a giant scenario catalogue before these connected cases have definite answers.

## SCN-010 — Unattended routine and portfolio demonstration

Generic first-release reference under D040–D042; a proposed acceptance scenario, not an executed test. Generate a small world from a supported profile, with reachable places, relevant actors and a usable starter routine. Present supported activities and setup/ongoing budgets. Configure a sequence with time, resource and permission constraints, run it unattended and inspect actual outcomes. The fisherman in Seyda Neen is a replaceable illustration: fishing, markets and lodging are not required core mechanics or committed launch content.

Let the player edit/authorize the routine, run at a stated speed and close the browser. Where viable, advance 30 fictional days with no required model call per tick, actor or routine occurrence. Deliver configured phone digests and surface genuine unresolved choices. Show completed activities, actual goods and a reconcilable income/expense history. A controlled accounting fixture with opening cash zero, 100 received and 90 paid must close at 10; ordinary stochastic campaigns need not achieve those totals.

Exercise an activity producing no output, an unavailable destination or required resource, capacity limits, changed routine, duplicate outcome application, service restart, global pause, disabled phone delivery and exhausted model budget. Production/trade examples can instantiate these as no catch, closed market or duplicate sale; the generic checks do not require those specific mechanics. Verify progress stops or falls back as specified, rather than generating missing money or retroactive successes. Distinguish a successful accelerated test from a month-long real deployment.

Portfolio evidence should connect the working responsive UI, generation validation and bounded repair, progression/recovery, cost traces, meaningful automated checks and reproducible launch to the release-quality bar in DOC-RELEASE-SCOPE. Capture actual elapsed simulation time, background processing, model calls/tokens/spend and failure outcomes under stated population/load conditions. No current measurement or implementation is implied.

## SCN-011 — Generated connections and bounded world direction

Proposed portfolio scenario for D043–D044; not an executed test or mandatory kidnapping feature. Generate a small supported world with connected places, actors, activities and an unresolved tension. Inject an invalid reference or incompatible activity during preparation and verify bounded repair or an explained failure before play.

Run an authorized routine. At an eligible opportunity, compare a procedural development with a DM-proposed variation. Verify admission against current state, actual mechanical consequences, knowledge-appropriate presentation and a usable decision/default. Allow the development to fail or diverge; narration must follow resolution.

Exercise a pending model response during pause, player action, speed change and restart. Revalidate or discard stale proposals; never duplicate admitted effects. Exhaust the director allowance and confirm ordinary supported progression continues under policy. Compare accelerated and normal runs for bounded real-time inference spending, without asserting identical stories. Verify an unattended allowed outcome versus a policy that pauses before it; disabled notifications cannot change those permissions.

Capture cost, time, validation failures and the difference between proposed and committed events. Bandit capture can be a later instance only when its complete consequences and exit actions are supported. This scenario requires generic event authority and policy correctness, not any particular profession or storyline.

## SCN-012 — Storyteller origination and contrasting styles

Start with a sparse supported world containing no pre-simulated organization for the chosen incident. Admit a storyteller-authored incident and its compatible participants; verify it needs no simulated leadership decision or hidden economy. Check references, entry constraints, identity and resulting persistent state. Reject a contradictory introduction while permitting genuinely unspecified content.

Compare proposed calm and unpredictable configurations across multiple controlled opportunities, recording actual cadence, selections, continuity and cost rather than expecting one stochastic run to prove the distinction. Test switching styles during an admitted incident: preserve state/history, pending consequences and budget; do not reset protections or accumulate a burst. Muted notifications and higher spend must not silently broaden unattended danger. No particular raid, profession or preset name is required. These are unexecuted acceptance scenarios.

## SCN-013 — Persistent connection across dormant days

Establish a character and a distinctive item through a completed transfer, then remove the character from active simulation for several fictional days. Introduce an unrelated remote settlement with no individually generated residents. Reintroduce the known character in a supported encounter, retrieving the same identity, item and relevant relationship beyond the recent narration window. No daily schedule or simulated faction history is needed, and the remote settlement must not create resident-update work merely by existing in lore.

Repeat with an intervening authoritative transfer or destruction of the item, a known death, a pending obligation and a misleading rumor. Reject conflicting reappearance; retain valid consequences and character knowledge boundaries. Compare active-work counts with and without additional dormant lore/entities, while measuring retrieval cost separately. This is an unexecuted acceptance scenario. Bob, the golden spear and a later attack illustrate it; none is required content, and a noncombat reunion can test the same continuity.

## SCN-014 — Quiet report, timed interruption and character fallback

Run a supported routine and report actual activity without a major incident. Introduce a supported storyteller event under timed autonomy. Offer a real-time window (fifteen minutes as an illustrative fixture) and show allowed choices plus fallback policy. Compare player response with expiry: personality and a defined roll influence the permitted automatic action, whose outcome resolves separately.

Under the D057 running-window baseline, verify that permitted fictional progress continues, invalidated choices are marked honestly and only one response/fallback resolves. If an optional timed-hold policy is implemented, separately verify its freeze and resumption. Check game-speed changes, manual pause/resume with remaining time, a response at the deadline, duplicate submissions, delayed/denied push, service restart/outage, no eligible fallback and model-budget exhaustion. A manual pause cannot expire into autonomous consequences. Record what happened, whether the action was chosen by the player or fallback and why. These checks are unexecuted; exact duration, invalidation and recovery defaults still need selection, while continued delegated progression is settled. Setting, profession and incident examples are interchangeable.

## SCN-015 — Brief intervention, later consequence, new decision

Build familiarity through a routine and an established connection. Introduce a supported incident, accept one player instruction and resume authorized fictional progression. Later resolve a permitted consequence and offer a new stage with a fresh decision window. Verify that the first action was not treated as guaranteed safety or incident completion. The new report distinguishes irreversible completed facts from current threats and choices; earlier notifications cannot invoke stale actions.

Exercise default delegation, manual pause, the running-window baseline, restart between stages and exhausted model budget. Test an alternate hold policy only if implemented. Verify a promised response window is honored or explicitly marked superseded under its stated policy, never silently misrepresented. Use any supported persistent consequence; injury, family death, space creatures and exact minute values are illustrative rather than required test content. Check that narration intensity changes cannot invent extra mechanical consequences. This is an unexecuted scenario.

## SCN-016 — Current scene, player initiative and long-break recap

Open an uneventful ongoing journey. Show present activity, relevant known circumstances and contextual actions without a full world dashboard. Interrupt travel with a supported player-initiated action, then distinguish stopping the actor from pausing the campaign. Verify ordinary supported resource/exposure consequences advance independently of storyteller calls. An optional storyteller development can change circumstances but must not erase prior effects.

Pause explicitly, model a five-month real absence and return. Show unchanged fictional state plus a focused chronology, current purpose, relevant relationships/items and available actions; do not auto-resume while presenting the recap. Test unavailable inference/imagery and hidden-fact leakage. If messaging is selected, issue the same decision on messaging/web and verify one result across duplicate/stale/unauthorized responses. Exact setting, teleportation, heat injury and rescue are not required test content. No integration or gameplay test has yet been executed.

## SCN-017 — Companion during an office day

Create a character, observe ordinary life over several fictional periods and receive an occasional amusing update. Later deliver a supported incident in the selected messaging surface, with recognizable character context, clear committed/current facts, a few actions and a deadline/default. The player responds briefly and returns to another task. Repeat while the player ignores the invitation: permitted autonomy resolves once and a later recap explains what happened.

Check notification cadence, discreet previews, in-channel versus browser consistency, stale choices and delegation of follow-on stages. Evaluate whether a new invitation is understandable without rereading chat history and whether unattended play actually remains viable. Slack is the reference channel, not a selected integration; no workplace message is sent by this scenario. Underwater characters, creature attacks, exact deadlines and option counts are interchangeable examples. No user test or implementation is claimed.

## SCN-018 — Variable intensity and optional agency

Begin with a quiet activity, introduce a small development, then a supported incident with multiple consequential stages, followed by aftermath/quiet continuation. Vary report cadence within contact settings. Let the player act at one stage and ignore later invitations; permitted autonomous choices must carry the story forward without routine global pauses. Explicit pause still stops progression and pending windows.

Compare contextual-choice and, if implemented, free-text/hybrid interactions for distinct supported intentions: purposeful, evasive, social, absurd or deliberately ineffective as appropriate. Verify differences in action/time/resource outcomes rather than synonymous buttons. Check stale actions, changing eligibility and limits on model interpretation. Do not require ten-minute notifications, fifteen options, battle, looting or limb mechanics. Earlier SCN-014 hold-mode checks remain optional-policy tests; continuous progression is the D057 baseline. No gameplay evaluation has yet been run.
