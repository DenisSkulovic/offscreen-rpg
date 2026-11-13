# First-run and story creation | from curiosity to a living opening

**Status:** design destination. Existing creation logic and draft persistence are implementation evidence, not reasons to keep the current forms. Product source: [story creation](../../story-creation.md).

## Visitor path: prove the fantasy before demanding configuration

**Outside:** visitor sees a concise promise (“A character's life carries on between your visits”) and a large **Try a moment** action. The sample is original or appropriately licensed, complete enough to establish place and situation, with one interesting decision and a clear representation of a longer offscreen wait.

**Demo truth:** if this is a scripted browser demonstration, say so discreetly but clearly: “Interactive preview · progress here is simulated and resets on refresh.” A simulated time jump may demonstrate “leave and return” without asking a visitor to wait hours. The demo must not masquerade as a live, durable account. A signed-in **Create your story** action can follow the taste of play, not precede it.

### Desired short demonstration

1. Enter a specific scene immediately, without OAuth or a wall of explanatory features.
2. Choose an intention such as asking a stranger or repairing a beacon.
3. See a real *simulated example* of commitment vs outcome, including how a longer wait would be expressed.
4. Experience an interruption or consequential response and a concise return digest.
5. Exit with an accurate mental model: real stories persist and progress only under admitted actions. Demo is a preview, not proof of that runtime.

**Provisional test target:** a first meaningful interaction in under 45 seconds for an unfamiliar visitor; validate with observation, not a performance claim.

## The creation pattern: guided imagination, not a form

### Step A: Choose a beginning

Two genuine routes in the near-term content inventory:
- **Start with a prepared experience**: a card that promises a *playable situation*, not a database “start package.” E.g., an authored prisoner arrival in a strange port. Existing internal Seyda Neen/Vvardenfell content can support local testing; public showcase content should have original/cleared rights.
- **Imagine your own**: start with one story premise and who/what the player is, supported by short examples (wizard, ship, microbe, bodiless mind). Do not force terrain, race, class, economy or career fields unless the selected foundation truly requires them.

Prepared and custom routes may have different questions; both converge on a reviewed opening.

### Step B: Establish your perspective

Show **Who are you in this story?** and only the mutable information actually supported by the selected foundation. Show fixed facts rather than asking for contradictory data. A reusable character example can be chosen and adapted; a nonhuman premise never sees “Select human profession” as a compulsory step.

Plain-language constraints: “You begin as a prisoner in the harbor; this beginning fixes your starting location.” Do not expose the term `canonical snapshot`.

### Step C: Choose the kind of experience

Offer a small set of meaningful **Storyteller directions**, each with a short example sentence demonstrating tone. Candidate display names are editorial proposals, not hardcoded engine modes:

| Direction | Player-facing promise | Example |
| --- | --- | --- |
| **The Quiet Observer** | Everyday detail, relationships, room for silence | “The baker remembers the debt, but says nothing yet.” |
| **The Restless World** | More proactive developments, with breathing room | “A letter arrives while you are still at work.” |
| **The Unforgiving Road** | Consequences and uncertainty when the rules permit them | “The guard does not overlook the stolen pass.” |
| **Your own direction** | A short description of desired tone / narrative initiative | Player text informs *creative style*, not immediate game authority |

**Important:** tone, narrative initiative, danger/risk, canonical invention, character autonomy, response deadlines, pace and spending are **different controls**. A “dangerous” storytelling direction cannot silently enable permanent death if the captured game risk is nonlethal. A quiet story can still contain consequential risk. Present essential commitments (pace, unattended behavior, risk and cost) in a plain-language summary, with advanced customization disclosed separately.

### Step D: Review before generation

One coherent summary: premise/foundation, role, Storyteller direction, meaningful fixed rules, expected real wait semantics, absence behavior, any explicit spend consent. Every edit goes back to its owning step without losing unrelated answers.

**Generate an opening** is an explicit action. It may have cost; show allowance and recovery separately from gameplay time. The generated candidate is not yet a running life.

### Step E: Review the actual opening, then Start

Present the first scene and important starting constraints as a **readable story excerpt**, not a 50-field debug package. A misinterpreted role or wrong canon premise can be edited and regenerated knowingly. If inputs change, label the old candidate **out of date**; it cannot silently become the starting scene.

**Start story** is a distinct authority boundary. Only the reviewed candidate is admitted. Generation preview and saved draft do not start the clock, activate response windows, or spend more money when the user revisits the page.

## Recovery in the flow

| Condition | Correct player behavior |
| --- | --- |
| New visitor, no draft | One clear route to begin, a few inspiring examples, optional demo |
| Returning incomplete draft | Resume same step and preserved text; edits are not lost |
| Other tab saved a newer draft | Preserve local unsaved text, show safe comparison; never silently overwrite |
| Opening generation pending | Show which foundation and input are being used; no repeated generation on navigation |
| Provider rejected / timed out | Show distinct failure and allowed retry; never claim “opening created” |
| Billing result uncertain | Explain uncertainty, check durable receipt and never auto-spend again |
| Opened old candidate after editing premise | Show explicit stale warning; require regenerate/review before Start |
| Start ACK uncertain | Recover existing start operation; do not duplicate a story |
| Invited player not ready (future) | Do not start a shared game by accident; show roles/authority clearly |

## Creation UX guardrails

- Provide a visible “Save draft” if autosave cannot be proven reliable; autosave needs clear saved/unsaved states and conflict recovery.
- Avoid 10 optional textareas and sliders just to show off configuration depth.
- No giant dropdown of technical Storyteller profiles with API model names.
- Help the person express *imagination* first; advanced rules and usage details appear at the point of real consequence.
- Avoid opaque generation placeholders that look like the character is already alive.
- The opening should be valuable as content even with no illustration. If art loads late, do not block reading or Start.

## End-to-end acceptance walk

A visitor chooses the custom premise “I am a sentient electrical storm trapped inside a ship,” sees no human-body requirements, selects a quieter Storyteller, chooses a known pace/risk/autonomy policy, previews an opening, revises one fact, observes that preview go stale, regenerates intentionally and Starts once. On return/reload, that story begins from **exactly the approved candidate**, and the user can immediately orient in Now.

Alternate walk: prepared port arrival asks no redundant world/starting-location questions. A third walk fails generation and retains the draft unchanged. These are **design fixtures** until actual features/test evidence exist.
