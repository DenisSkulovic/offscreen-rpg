# Storytelling

The storyteller supports both ordinary continuing life and dramatic developments. Caring for a character over several real days can be the main experience: familiar places, earning and spending, practice, quiet observation and occasional conversations are worthwhile without an approaching twist. It portrays people, offers possible responses and interprets consequences. It can introduce a raid without simulating a distant bandit leadership hierarchy. Once that raid matters to the story, its participants and consequences must remain coherent.

## What guides it

Its judgment draws on the premise, storytelling preferences, current situation, relevant history, character capabilities and player intentions. Tone, dramatic intensity and unpredictability are related but different: horror can unfold slowly, and a comic story can still have meaningful consequences.

Frequency of unusual incidents and severity when an incident occurs are separate preferences. A mostly peaceful life with rare dangerous developments should be possible; low incident frequency must not mean that character progress stops. Conversely, routine repetition must not force escalating danger merely to keep the plot busy. Precise controls and unattended-risk permissions still need design; permission for a severe incident is not implied by permission to continue an ordinary routine.

Player availability, notifications and spending limits are operational constraints, not measures of how much misfortune a character deserves. Paying for a stronger model should improve the quality of interpretation, not purchase a better chance of success.

## Developments and choices

The storyteller can compress an uneventful afternoon into a short passage or stay close to a conversation that needs immediate responses. It should mix ordinary life, discoveries and consequences rather than escalate danger at every opportunity.

Choices express different intentions, not merely different wording for a predetermined outcome. Their descriptions should communicate what the character is attempting and any apparent commitment or risk, without revealing hidden information. A surprising consequence is allowed; routinely ignoring a player's intention is not.

An inactive response such as waiting is still a meaningful choice. It can establish a period of quiet, expose the character to a developing threat or give another character time to act. It does not require a special waiting subsystem.

The storyteller may prepare an interruption when an intention is selected. That future is conditional. If the party turns back, an encounter planned further along the abandoned path must be reconsidered rather than presented as if nothing changed.

## Authority and limits

The storyteller invents within the fiction; the application enforces ownership of player actions, timing, budgets and consistent application of outcomes. Model prose alone cannot authorize spending the same coins twice or applying an already resolved action again.

Established traits and facts constrain plausible outcomes. D&D-style checks are mandatory for supported uncertain actions; the DM proposes challenges and code resolves them under the [game rules](game-rules.md). Story pacing and action success are separate judgments: finding an encounter is not automatically failing a travel check.

In shared play, interpret characters' intentions together where they interact. Do not let the fastest player dictate every other character's behavior. The method of collecting conflicting intentions is to be chosen before implementing shared decision resolution.

## Continuity and endings

Return to people, objects and unresolved situations when relevant. Callbacks should follow remembered facts, not resemble familiar names attached to unrelated inventions. Consequences can introduce new possibilities without erasing prior choices.

Continuing life is a target experience: a character can remain in the same world for real months, with minimal dramatic intervention and no compulsory ending. Individual adventures and relationships can reach a satisfying resolution without ending the playable life. Not every character must die, and constant cliffhangers are not a substitute for resolution. The creation controls for finite adventures versus continuing life remain to be designed. A deliberately finished story remains readable and does not keep scheduling new developments.

## First playable scope

Demonstrate contextual choices, ordinary intervals, a meaningful interruption, consequences, a remembered detail and a coherent conclusion. Use a few understandable storytelling styles. Multiple autonomous agents are a possible implementation technique, not a product requirement or a reason to add extra calls.

## Selected storyteller POC contract

The approved solo POC selects a versioned storyteller profile before opening generation. Profiles are JSON content over shared task preparation and execution. Opening and continuation are separate bounded tasks, each proposing a coherent scene/offer and source-backed continuity changes in one result. The narrative rehearsal uses 2–5 distinct offered intentions. Mechanical openings and consequences instead use zero to four admitted plans: zero is a visible held state, one is valid when the situation is genuinely constrained, and larger sets must differ in intended approach rather than wording. Public plans communicate the attempted commitment and concise apparent risk without revealing DCs or unused outcomes. There are no free-text gameplay actions or automatic life endings. Inactivity admits no new generation; an accepted prepared interval may finish once. Implementation status remains in progress.md.

## Evolving the DM during play

[Storyteller settings](storyteller-settings.md) define switching presets, custom tags and guidance, effective boundaries and locked campaigns. Presets guide a shared DM runtime; they are not permanent character identities or permission to rewrite history. The [rules and activity pipeline](technical/rules-and-activities.md) separates adjudication, dice, effects and narrative/option composition without requiring one agent per responsibility.
