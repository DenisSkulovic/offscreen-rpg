# The Storyteller's UX | a beautiful shell cannot rescue empty agency

**Status:** game-experience quality destination; not a prompt rewrite, model-selection rule or runtime authorization. Domain sources: [storytelling](../../storytelling.md), [gameplay](../../gameplay.md), [continuity](../../continuity-and-consequences.md), [agency/rules](../../game-rules.md). A separate engine/content Change is needed whenever the target calls for new adjudication or durable facts.

## Product promise, not model glamour

The player's partner is a Storyteller capable of responding to a specific world and character, not a generic assistant spraying lore. The desired feeling is: **my decisions affect a coherent life which is still there when I return**.

LLM generation quality is therefore an integral UX concern, not an invisible backend concern. Perfect React layouts, graceful timers and attractive illustrations can still leave a boring game if choices are indistinguishable, NPCs forget interactions or failure simply repeats the same button.

## Eight player-experience standards for storytelling

### 1. Situation specificity

A scene should establish **where/what matters now**, who/what is present and why the immediate options arise. Concise ordinary detail is valuable, but the player must not search six paragraphs for the one relevant decision.

**Good:** the boat officer asks why the beacon is dark while an unfinished repair physically blocks the landing.  
**Bad:** generic “A mysterious figure appears. What do you do?” every few minutes.

### 2. Distinct, plausible agency

An offered choice must represent a **meaningfully different intention**. Distinctness can be tactical, informational, moral, emotional, social, temporal or simply deliberate restraint.

Not every action needs a stat reward. A quiet dismissal of a stranger can matter because it changes future access or trust. Some choices may legitimately converge, but a repeated prompt that changes no relevant state risks choice theater.

**Fatal case from current atlas:** the SpongeBob/Gary fixture can repeatedly propose essentially the same Persuasion attempt after an unchanged failure. Renaming the button doesn't fix this. The next offer should change in relation to attempted persuasion or newly known context, subject to actual admitted facts.

### 3. Outcome fidelity

Once the engine records a die, quantity, location, time or item transfer, narration must reflect it. The model cannot soften failure into success because that makes a nicer story, or state the character arrived before a ten-hour route ended.

An evocative paragraph is **not authority**. On contradiction, the correct response is a **held/repaired narration path** under captured provider/contract policy, not a casual client correction that changes canon.

### 4. Remember the right things

Not every noun becomes a database record. But the stranger's identity, a borrowed item, a promise, repeated meetings, a failed attempt and an interruption can become consequential. A later scene should be able to reference relevant original evidence without inventing a past.

A summary can highlight a previously quiet event later. It cannot rewrite the original passage. Character beliefs and unreliable narration remain distinct from engine facts.

### 5. Respect the player's character

The Storyteller may describe sensory impressions and the consequences of actions, but must not arbitrarily assign the player character's private motivations or feelings when the player owns that perspective. A reserved player may react to an insult differently from an impulsive one.

If the campaign explicitly authorizes bounded character discretion during absence, the selected autonomous intention can be described; that permission is not an excuse to take irreversible actions outside its terms.

### 6. Rhythm fits the chosen experience

Quiet story: can stay quiet for hours, let work/rest complete without new prose, and still be meaningful.  
Fast drama: can contain several short actions in one conversation without an activity menu between each.  
Dangerous story: can risk real loss within the captured risk policy; does not secretly scale threats to produce engagement.  
Absurd story: remains coherent even if the setting is strange.

The engine should not force every quiet completion to open a drama scene, nor block a rapid dialogue behind an unnecessary long timer.

### 7. Repetition is compact; novelty is earned

A routine may repeat without model calls and without 300 identical words each time. Novel content belongs at meaningful new context, not as a scheduled content drip to fill the page. A player who reads the same task description eleven times may stop caring long before the rule system runs out of ticks.

### 8. The Storyteller acknowledges small history

A remembered ordinary gesture can be more emotionally convincing than a new epic reveal. An NPC remembering a favor, a shopkeeper changing their greeting, or an abstract signal responding differently can demonstrate continuity. Do not manufacture generic relationship meters merely to simulate attachment.

## Agency quality checklist for every generated offer

Before publication (in a future engine-level evaluator, or manually via fixture inspection), ask:

1. Are the actions currently feasible and compatible with the actor's form, knowledge, location and existing commitments?
2. Do different labels correspond to genuinely different intentions, not paraphrases?
3. Does each action have admitted time/rule semantics without a guaranteed result it doesn't own?
4. Are known risks shown honestly while hidden facts remain hidden?
5. Does a returning failed action require changed conditions/method to reroll, rather than the same exploit button?
6. Is **doing nothing** a real deliberate choice only where it changes the situation/time, not a decorative fourth button?
7. If there is only one meaningful action, why show three fake options?
8. Does the resulting passage acknowledge prior consequential facts rather than a generic model-friendly story trope?

These questions belong to product design and later authoring/quality evidence; they are **not permission** for the frontend to invent or hide legal offers.

## One worked red-team example: repeated persuasion

**Current fixture:** SpongeBob tries to reassure Gary. D20=5, total=9 vs DC 12, failed; Gary remains alert. If the next published offer simply says “Talk Gary down” again, the player can repeat until luck wins. That is mechanically tempting but dramaturgically poor.

**A stronger target** (requires actual supported fact/effect and Storyteller choice revision):
- Record that this *approach* was attempted and failed, possibly with changed social context.
- Offer a different grounded tactic (“Observe the parcel from cover”) or a later persuasion only after a change that makes it meaningful (new evidence, different timing).
- If a repeated identical action is truly allowed by the rule, disclose the time/resource cost and adapt narrative to growing frustration or changed circumstances; do not pretend every repetition is a fresh scene.
- On failure, do not fake an “invisible trust penalty” unless admitted. An expressive consequence may still be possible without hard numerical loss.

The UX may better compose the new choices but cannot fix a broken authoring contract by visual rearrangement.

## Semantic quality gates (manual now, testable later)

| Target | Evaluation scenario | Failure evidence |
| --- | --- | --- |
| Distinctness | List all options after an NPC refuses | Two or more labels produce no meaningful difference |
| Fidelity | Fixed failed roll and saved effect | Prose narrates success, reward or altered canon |
| Durability | Leave and return after several stored changes | Character loses relevant item/relationship memory |
| World-neutrality | Microbe and abstract intelligence | Model proposes humanoid behavior despite unavailable ability |
| Rhythm | Five quiet checks, no dramatic event | Mandatory model scene every check |
| Fast scene | Three dialog decisions | Generic activity menu forced between each |
| Long wait | Ten-hour journey | Arrives because client ETA reached zero, without rule settlement |
| Agency | Player accepts optional action | Model invents an unchosen irreversible decision |
| Cost | Repeated harmless menu inspection | Storyteller is invoked/charged despite no content need |
| Consequence | Borrowed item appears later | Prior transfer isn't reflected or item duplicated |

## A better model of "fun" than narrative volume

Don't count paragraphs, options or animations as proxies for fun. Ask:
- **Curiosity:** would I willingly come back to find out what happened?
- **Agency:** can I articulate why I chose this action and what changed?
- **Trust:** did the world respect effort, time, rolls, and memory?
- **Attachment:** do modest relationships, objects and routines acquire meaning?
- **Surprise with fairness:** was an event unexpected without feeling random or cheating?
- **Rhythm:** did the Storyteller earn my attention when it interrupted routine?

Use blind playthrough review of an actual multi-day fixture before deciding a Storyteller preset is compelling.

## Near-term vs later

**Near-term UI can:** present meaningful already-authorized options clearly, make settled effects inspectable, and preserve current scene, progress and return.  
**Engine/Storyteller change must:** improve plan distinctness, avoid repeated exploit offers, handle free-form intentions, persist relationships/canon, choose appropriate event frequency, and produce meaningful long-story memory.

A Head of UX should report when the product's problem is **the mechanic or the writing**, not keep adding labels and components to compensate.
