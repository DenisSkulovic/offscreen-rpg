# Story creation

Creation turns a chosen story foundation into a small, playable beginning. It
should invite imagination without asking the player to design a world database,
understand canonical-file internals or fill in a long character sheet.

## Creation information architecture

The player makes decisions in dependency order. A later screen must not reveal
an earlier decision or silently reinterpret earlier answers:

1. **Choose a foundation.** Pick a prepared experience, choose a reusable world,
   or create a world/story from scratch. A prepared experience such as the Seyda
   Neen prisoner arrival is a cohesive bundle: it identifies its world, rules,
   starting situation and role constraints. It is not an “opening seed” attached
   after an unrelated premise has been written.
2. **Establish the player role.** Accept or customize the compatible character
   and immediate circumstances. Fixed facts supplied by the foundation are
   explained rather than asked again. A prepared prisoner arrival therefore
   does not ask the player to choose a contradictory location; a blank world can
   ask broader questions.
3. **Choose how it is told.** Select a Storyteller profile and the small number
   of experience-defining preferences: tone/direction, narrative initiative and
   pace. Also choose an understandable canon-invention preset within the
   selected world's limits: canon-bound, grounded expansion or open world.
   Advanced per-domain invention, autonomy, risk and cost controls remain
   progressively disclosed.
4. **Review one setup summary.** Show the foundation, player role, Storyteller,
   important rules and expected generation cost. Editing returns to the owning
   step. Generation never begins merely by visiting the review.
5. **Create the opening.** Show an honest, recoverable generation state. Success
   presents the actual first playable situation; validation failure, provider
   rejection, timeout and uncertain billing are different states with different
   recovery actions. A retry is never implied by a generic waiting label.

This is a short staged flow, not one long settings form. Each step contains only
choices meaningful under the selected foundation. Draft persistence spans the
whole flow, and returning resumes the last incomplete step. Prepared and custom
creation converge on the same reviewed campaign-start contract, but their setup
questions need not be identical.

For the current POC, the first screen can offer only two honest routes:

- **Seyda Neen prisoner arrival** — a prepared experience with pinned
  Vvardenfell, rules, expected participants and starting constraints;
- **Create your own story** — a freeform route that asks for the world, player
  role and starting circumstances together until reusable-world selection is
  implemented.

Do not show a one-option world picker inside the prepared route, call developer
fixtures “seeds,” or expose a prepared experience in the custom-story preview.
When the library grows, cards may first group prepared experiences by world,
but the player should select a playable promise rather than navigate storage
packages.

## Premise and characters

A private creation draft owns the incomplete choices from every creation step.
Explicit Save keeps an incomplete idea without generating prose or starting
time. The stories page lists drafts separately from playable stories. Editing a
foundation, role or Storyteller choice makes an older generated opening visibly
stale. Starting uses exactly the opening the player reviewed; it never silently
regenerates it.

If another tab changes a draft, keep the player's unsaved text and offer comparison with the saved version. A failed save or expired session must leave the text available to retry. Drafts are not shared merely because the eventual story will support several players.

Let the player describe who they want to be and the starting circumstances, or adapt an example. Examples demonstrate variety rather than hard-code supported professions or worlds: a wizard on a journey, a creature in a tank, a crew member aboard a ship.

The generated beginning establishes the character, immediate surroundings, a few relevant connections and a reason for something to happen next. Develop distant places and incidental people when the story needs them. Richness should come from specificity and continuity rather than the volume of material generated before play.

World setup is broader than terrain generation. An apartment, an underwater town, a star system and an abstract shadow realm all need meaningful places and ways to reach them, but need not share geography or physical scale. Start by establishing the immediate places, contents, connections and relevant constraints; choose an optional map representation that fits them. Do not ask the player to select a terrain generator before describing their story.

A familiar setting generated from model memory is an interpretation, not a promise of geographical or canonical accuracy. Faithful reconstruction of an existing place would require suitable reference material and separate verification. The first version should not imply that a recognizable name guarantees an accurate world.

For a shared story, invited players need a way to establish characters that fit the common premise before the story starts. The creator can see who has joined and whether the group is ready. Invitations, readiness and starting authority need simple explicit rules; there is no requirement for public matchmaking.

## Storytelling direction

Keep the premise separate from how it is told. The same underwater character could lead a gentle comedy or a frightening survival story. Offer understandable starting styles, with concise descriptions of tone, intensity and unpredictability. Names and the exact set of styles are still to be designed.

Customization should let players express the desired experience without requiring expertise in prompting. A descriptive field may complement presets. Saving reusable custom storytellers is an extension, not necessary for the first creation flow.

Pace and availability also matter: how long someone expects to wait, whether unattended characters may make consequential decisions, and how they want to hear about developments. Use sensible visible defaults and a short summary rather than exposing every possible setting up front. In a shared story, participants should be able to see the common play expectations before joining.

Creation should also establish how much narrative initiative the Storyteller has. The player need not outline a plot: they may ask the Storyteller to cultivate a larger direction, allow occasional proactive developments, or explicitly choose an emergent ordinary-life experience with no grand narrative. This is independent of incident frequency and danger. “No grand narrative” can still contain consequences and small surprises; “directed” does not promise a railroad or a particular ending.

Separately, creation establishes how much missing world material the Storyteller may invent. A prepared world declares ceilings for characters, places, groups, world elements and deep lore; the story may choose stricter values but cannot exceed them. Show simple presets first and the [per-domain matrix](storyteller-settings.md#canon-invention-policy) only as an advanced control. This setting governs factual authorship, not prose quality or initiative: a canon-bound Storyteller may be highly proactive using supplied material, while an open-world Storyteller may remain quiet.

When a start contains a hoped-for arc, antagonist move or reveal, preserve it as Storyteller-private noncanonical direction or possibilities. Only scheduled facts that really must become due are admitted as executable obligations. The opening may seed either kind without presenting a future possibility as already true.

## Before starting

Present a concise preview: premise, characters, storytelling direction, pace and unattended behavior, followed by the opening situation. Allow corrections to a misunderstanding without requiring an entirely new world. Changes that require regeneration should be explicit rather than triggered on every keystroke.

If someone changes their character or the shared setup, make clear when the preview no longer matches. Starting must use the opening the participants actually reviewed. Returning after closing the page should recover the saved draft and any completed preview, without charging for a fresh generation automatically.

Creating an opening and starting its real-time progression are different user actions. The story must not begin consuming response windows while the creator is still reviewing setup or waiting for a friend. Show useful progress during generation and allow recovery from failure without duplicate stories or duplicate spending.

## First playable scope

Support a written premise, a few editable examples, basic storyteller preferences, a solo start or a small invited group, and a coherent opening. Defer exhaustive world generation, a preset marketplace, public discovery and elaborate character construction. World generation quality and cost remain important demonstrations even with a deliberately small initial world.

For the connected POC, creation may also offer a maintained authored start
whose exact world, rules and initial campaign documents are inspectable before
or after Start. Selecting a familiar setting does not authorize the model to
fill missing lore from memory: the opening is grounded in the pinned package,
and anything outside its coverage follows the captured invention policy rather
than the model's confidence. This authored route complements freeform creation;
it does not make fantasy geography or seeded NPCs mandatory for other stories.

## Progressive people and other entities

Creation should not pre-generate a database record and full statistics for
every noun in a large world. It should seed stable records for the player,
immediate places and people whose expected participation or continuity is part
of the selected start. Incidental mentions may remain only in lore or passage
evidence until the player interacts meaningfully, a future turn depends on
them, or a supported mechanic needs current state. At that boundary the
application admits a stable registration or promotion with source provenance.

This is a continuity boundary, not a humanoid ontology. A nonhuman or abstract
story may register organisms, signals, collectives or nothing analogous. Full
mechanical state is introduced only when needed by supported rules; a spoken
name alone does not invent combat statistics.

## Selected profile and captured candidate

Creation saves an optional catalogue reference while a draft is incomplete. Generating a playable storyteller candidate requires a selected profile. An admitted candidate captures the exact profile and execution policy. Start freezes that captured configuration onto the story; subsequent catalogue changes do not alter it. New profiles are data files, not resolvers.

## Planned campaign settings

Creation will select a storyteller preset and editable versus locked settings, with a visible summary of fixed fields before Start. Editable stories can later switch presets or customize narrative tags/guidance without losing their character. Initial settings are provenance, not a lifetime prohibition on changes. See [storyteller settings](storyteller-settings.md) and [D&D rules](game-rules.md). These controls are planned; the current UI selects only a catalogue profile.
