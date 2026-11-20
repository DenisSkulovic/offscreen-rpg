# Fixture G | The conscious galaxy: perspective ≠ player control ≠ mechanics

**Type:** proposed custom prompt / abstract-world stress test. No real galactic gameplay or model quality evaluation was run. See [Fixture lab](README.md).

## Verbatim user intent for the design vector

```text
I am the consciousness of an ancient galaxy. Civilizations rise and disappear
within me, sometimes unnoticed. Tell a beautiful, occasionally tragic story
about the patterns I perceive. No body, inventory, predetermined destiny or
mandatory hero's quest. Let time pass in ways appropriate to this scale.
```

This is a **sample authored design input**, not text from the user pasted into a live game.

No fixed world, authored rule set, human actor or prescribed ancient civilization. The creative request establishes the *perspective and taste*, but it does not establish mechanical omnipotence.

## A useful decomposition without another form

| Dimension | What the prompt supports | What it does NOT grant |
| --- | --- | --- |
| Viewpoint | A conscious galactic awareness perceiving large-scale phenomena | A human-like protagonist body or dialogue |
| Agency | Potentially choose attention, interpretation, curiosity or other fiction-supported responses | Automatically rearranging stars, creating life or forcing civilization outcomes |
| Fictional time | Huge historical scales can be narrated, summarized or skipped dramatically | A billion real-time seconds, arbitrary changes to the exact simulation clock or invalid timestamp arithmetic |
| Creative taste | Beauty, melancholy, occasional tragedy and no imposed destiny | Guaranteed grief, plot armor, an unchangeable future |
| Long-term memory | Useful source facts/observations and private thematic directions | Mandatory character sheets, wealth ledgers, health, towns or a complete galactic encyclopedia |

The player might be an **observer/controller of attention** rather than the cause of every event. Decide whether this qualifies as a playable interactive mode based on meaningful choices, not on whether the subject has hands.

## Proposed seed and Storyteller preparation

Deterministic: pin exact `STORY_PROMPT.md`, default/derived effective profile and typed launch restrictions. Do not silently choose an SRD ruleset or an Earth-calendar month.

Optional bounded preparation might establish:
- A small descriptive `premise` capturing that the viewpoint is conscious galactic-scale perception, with provenance to the user prompt and a warning against inferred physical agency.
- A private direction note: favor emergent connections and changes of attention rather than a fixed grand plot.
- A provisional first observable phenomenon or unanswered question, **only if useful** to opening composition.

It should NOT generate full star systems, factions, life histories or a scientifically rigorous cosmological simulation before the first scene. Future documents can be created when a particular civilization, orbit or conflict becomes relevant.

## Example opening *shape*, not guaranteed prose

A faint patterned radio silence appears along a distant arm. It is impossible yet to know whether the signal has ceased, shifted frequencies or never belonged to an intelligent species. The galactic consciousness notices it.

Distinct possible intentions:
- Turn attention toward the quiet arm and search for a pattern.
- Compare that silence with an older remembered signal.
- Let the event pass and attend to another region.

These are **choices of attention**, not promises of deterministic physical effects. The model may propose a different opening. Do not make a galaxy “walk to the office”, spend credits, roll Strength or put on a coat.

## What the current engine can and cannot honestly support

- `playableProposalSchema` permits narrative choices/intention text without a mandatory character object, **so a non-mechanical opening can potentially express this**.
- `campaignStartSchema` defaults `mechanics=false` and uses an elapsed-time definition. That is less anthropomorphic than a named calendar, but ordinary narrative time-scale semantics still need careful validation.
- Prepared start-package manifests currently **require** a rule-package reference, and campaign settings still carry `rules: 'srd-5.2.1-subset.v1'`. Do not treat a successful narrative opening as proof of a generalized galaxy rule adapter.
- `docs/technical/engine/selected-architecture.md#world-neutral-capability-kernel` states the desired optional-capability target but explicitly says it is **not a finalized schema or permission to refactor Character**.

Therefore define the first scope carefully: **abstract narrative opening with meaningful intentions and no unsupported mechanical effects**. A future mechanical galaxy simulation is a separate feature, not a condition for eliminating the creation wizard.

## Essential time invariant

The galaxy may be ancient *at the fictional beginning*. The campaign's elapsed simulation origin can still be `0`; it means “elapsed since this playable starting state”, not “galaxy created a second ago”. Any instruction to skip millennia needs an explicit story-time interpretation and admitted time/projection path. If the player says “let aeons pass”, the Storyteller may narratively summarize, but it cannot invent an unbounded clock jump by changing prose.

Prefer a launch that shows the first meaningful situation promptly. Background time should not accrue invisibly while the player has not received scene 1.

## Negative tests

- Reject a profile/skill that insists all stories require named human characters, D&D stats, money, inventory or a terrain map.
- Reject options that claim the player can physically alter stars without an admitted power or supported narrative rule.
- Do not turn the cosmic perspective into a standard space pilot merely to reuse existing UI forms.
- Do not assert all physics and cosmic history facts as **source canon** from the model's pretrained knowledge. Distinguish fiction-world assumptions from grounded historical/source evidence.
- Do not force an authored rule adapter into a new custom prompt because a prepared-preset schema requires it.
- Do not treat the lack of a conventional body as lack of meaningful narrative agency.
- On scene 2, remember which phenomenon was attended to and what was actually observed rather than implicitly resolving uncertainty into an unearned revelation.

## What would persuade us preparation is worth paying for?

A separate preparation round improves the next *two* scenes' coherence without making the galaxy generic, anthropomorphic or pre-plotted, and that improvement is large enough to outweigh latency/cost. A preparation note that simply repeats the prompt fails the experiment. A one-round opening that works well is evidence **against** mandating B.
