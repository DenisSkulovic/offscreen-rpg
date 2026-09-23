# Storyteller presets and customization

Implemented for profiled solo stories, with offline rehearsal limits described below. A storyteller is an editable preset over shared DM capabilities. The owner can change it during a continuing solo story: spend a real week earning, trading and studying, invite more adventure, then return to quiet life. A melancholic fishing evening can acquire comic possibilities without replacing its fisherman, undoing debts or forcing an immediate joke.

Shared application behavior is creatively neutral. It provides the same bounded narrative and mechanical capabilities to radically different profiles but does not supply a fallback taste for excitement, restraint, humor, option density or pace. Effective creative direction is the resolved combination of the selected profile, campaign direction, opening and established fiction. Evaluation must first ask whether a result fulfilled those captured commitments; reviewer enjoyment is a separate observation and cannot silently redefine the engine's defaults.

## Settings with distinct meanings

| Setting | Representation and meaning |
| --- | --- |
| Tone and themes | Tags and bounded player-written guidance: melancholy, absurd comedy, domestic life, exploration. |
| Activity emphasis | Weighted preferences or ordered categories: economy, growth, social life, adventure. These guide opportunities, not compulsory character actions. |
| Dramatic rhythm | Named policy and guidance for quiet stretches, scene density and transitions. |
| Narrative initiative | Named policy and bounded guidance for whether the Storyteller should merely respond, cultivate occasional larger developments or actively maintain a directed narrative. It may explicitly select no grand narrative. |
| Surprise frequency | A supported policy for how often eligible incidents are checked/triggered; independent of their severity. |
| Surprise character | Descriptive guidance for how conventional or strange developments may be. Not a replacement for the random-number generator. |
| Risk permissions | Typed limits on allowed consequences and unattended decisions. Creative text cannot override them. |
| Pace | Explicit game-time/real-time mapping, separate from dramatic rhythm and response allowances. |

Not every control is a number. Expose a small understandable editor first, with advanced bounded text and tags, rather than dozens of unexplained sliders. Saving a preset stores data, not another agent implementation. Applying a different preset replaces its creative defaults; show the effective result before saving and preserve separate campaign clock/risk choices unless the user explicitly changes them.

Narrative initiative is not another name for surprise frequency. A rare meteor can be part of deliberate long-range direction rather than a random incident, while a high-surprise slice-of-life campaign may contain many small disruptions and no central arc. Initiative grants the Storyteller permission to cultivate pressure; it does not make an uncommitted possibility true or choose the player's response. Explicit campaign choice—including “no grand narrative”—overrides a preset default.

Resource controls are separate from creative presets. [Account usage policy](technical/usage-policy.md) defines allowed models, context/output sizes, exploration effort, optional narration/maintenance allocations, spending windows and recovery settings. Players may lower their limits; creative guidance or a dramatic-rhythm setting cannot enlarge account authority. Keep a few understandable presets backed by independently bounded controls, not a single “eagerness” slider that secretly increases every kind of spending. This resource-policy layer is prepared, not yet implemented in the editor.

## Canon invention policy

How freely the Storyteller may fill gaps in supplied world material is a separate campaign permission, not a temperature setting, model tier, narrative-initiative level or personality trait. A strict historical reconstruction and an improvisational sandbox may use the same Storyteller profile while granting very different authority to establish new people, places and lore.

Use a small matrix rather than one creativity slider. The initial domains are:

| Domain | Includes |
| --- | --- |
| Characters and agents | People, creatures, intelligences and other acting subjects. |
| Places and routes | Rooms, camps, caves, stations, regions and connections between them. |
| Groups and institutions | Families, factions, cultures, governments, companies and organized collectives. |
| World elements | Species, ecology, artifacts, technology and magic as descriptive setting material; executable capabilities still require supported rules. |
| History and cosmology | Past events, origins, metaphysics and laws of the fictional world. |

Each domain selects one of three permissions:

- **Reference only:** use supplied or already admitted campaign facts. Connective prose and immediate sensory texture may be inferred when they establish no new reusable subject or world claim. If a missing fact matters, retrieve it, avoid relying on it or hold honestly.
- **Compatible additions:** create minor or local campaign additions that fit supplied material, such as an incidental traveler, roadside camp or unnamed service corridor. Do not answer an unresolved major-lore question or redefine the world's structures.
- **Broad invention:** establish substantial campaign-local additions compatible with current canon and campaign direction. This still cannot contradict established facts, fabricate a citation, retcon history, choose for the player or create executable mechanics through prose.

A fact crossing multiple domains must satisfy every applicable permission. These permissions govern what may become true, not how dramatic, strange or frequent developments should be.

The world package declares a maximum permission for each domain. A new foundation with no reusable package records an explicit world ceiling during creation rather than inheriting a hidden engine default. A prepared start may narrow or lock that ceiling, and the story owner selects an equal or stricter policy. Storyteller guidance cannot widen the effective intersection. This lets a carefully maintained setting forbid new cosmology while permitting minor local characters, and lets an original sandbox grant much broader invention without making that the engine default.

Creation should present a few understandable presets before advanced overrides:

- **Canon-bound:** reference only in every domain.
- **Grounded expansion:** compatible additions for characters, places and local world elements; reference only for institutions and deep lore unless the world grants more.
- **Open world:** broad invention in every domain up to the world's declared ceilings.

Anything invented and worth remembering becomes campaign canon only through ordinary publication and provenance. Passing texture need not become a file. Changing this setting affects future uncommitted Storyteller tasks; it never rewrites established campaign facts or an already captured result.

## Tags and custom content

Provide reusable tags with an identity, description, scope and revision. Narrative tags express meaning to the DM. Mechanical tags reference supported rule definitions, such as difficult terrain, and cannot gain numeric effects from their names alone. A user-created `wealthy` or `invincible` tag is creative guidance, not authority to mint money or grant immunity. Unsupported mechanical behavior needs a real rule definition.

Allow private custom narrative tags and prompt snippets, with bounded length/count and clear scope (storyteller, character, location or activity). POC editing starts with storyteller scope; the same distinction guides later world/entity content without requiring a universal tag database now. Catalogue tags are suggestions, not the limit of creative expression. Do not expose hidden system instructions, credentials, executable tools or funding controls through this editor.

Compile guidance from application invariants, campaign permissions, applicable mechanical facts, explicit player overrides and preset defaults in that order. Explicit typed overrides replace defaults; tags supplement rather than secretly overwrite fields. Reject mutually exclusive typed settings; show unresolved semantic tensions in descriptive guidance without claiming arbitrary prose can be validated perfectly. Existing world facts outrank a new tonal preference. Editing `the cat has already paid me 100 coins` must never apply that claim as an effect.

## Changes during play

Save a new immutable settings revision with an understandable effective boundary. Default: creative changes govern the next uncommitted action; already admitted actions and their retry artifacts retain their captured settings. An existing menu remains an honest offer. Its selection uses its captured mechanical commitments while the next resolution can use the newly active creative settings. A pending generation and a prepared arrival are not discarded or regenerated merely to adopt a new tone. Explain when an existing activity finishes under earlier settings.

Settings can be saved while an activity runs, but cannot undo its outcomes or reroll its checks. Later hourly segments of that activity keep its captured rule/encounter plan. A new style applies after completion or a supported interruption. This predictable first implementation avoids continuously invalidating paid preparation. Immediate interruption/replanning can be a later explicit action; it is not implicit in a settings save.

## Free and locked campaigns

At creation, distinguish editable play from a campaign whose declared settings are locked. The lock records exactly which fields are fixed: rule version, risk, storyteller customization and allowed speed controls. Accessibility, sound and private notification preferences remain personal. POC lock is enforced server-side, cannot be silently disabled, and does not imply anti-cheat certification or an implemented permadeath system. A future fork into an editable campaign must be visibly a new continuation, not a rewritten locked record.

Ironman may eventually bundle permadeath and other commitments; do not equate a settings lock with that entire mode. For the initial feature, label it **Locked settings**, with a visible summary before Start.

See [game rules](game-rules.md) and [settings execution](technical/story-settings.md).

## Current implementation boundary

The live-story editor supports catalogue presets, private saved presets, emphasis, encounter frequency, up to 16 custom narrative tags and four guidance snippets. Settings history exposes the latest 20 revisions. Existing profiled stories project their original settings until the first explicit update persists revisions. New stories can lock creative and speed settings before Start; pause remains available.

The offline source does not improvise from arbitrary text: creative configuration is stored and included in bounded generated-task context, including the mechanical consequence task. Its offline narrator repeats saved outcomes; it has no special profile voice or absurd-comedy tag branch. Unknown custom tags carry no mechanical effect. Mechanical modifiers and event thresholds belong to captured action content; a world-tag editor is not implemented. Mid-activity pace changes are separate controls.

The current editor does not yet expose narrative initiative, a campaign narrative-direction revision or canon-invention permissions. Existing emphasis, encounter-frequency and guidance fields are not silently reinterpreted as any of those authorities. Current tasks therefore receive canonical material without a captured per-domain answer for how freely gaps may be filled; this is a known blocker before meaningful long-run evaluation in a private or sparsely documented world.
