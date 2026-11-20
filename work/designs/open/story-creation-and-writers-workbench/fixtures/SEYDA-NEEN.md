# Fixture S | Seyda Neen prepared experience: use what the author wrote

**Type:** real checked-in development source plus hypothetical next-generation contract. **NOT a cleared public preset**, and the candidate profile/prompt files below do **not** presently exist in its package. See [Fixture lab](README.md).

## Actual authored inputs (source-verified)

`content/starts/seyda-neen-prisoner/start-package.json` pins one Vvardenfell world root and an `srd-5.2.1-subset` rule adapter. It declares **five** source documents:

| Path | Kind | Authority / visibility |
| --- | --- | --- |
| `START.md` | orientation | canon / player-known |
| `identities/socucius-ergalla.md` | identity | canon / player-known |
| `identities/sellus-gravius.md` | identity | canon / player-known |
| `threads/release-processing.md` | narrative-thread | canon / player-known |
| `possibilities/larger-vvardenfell-pressure.md` | private-possibility | noncanonical / storyteller-private |

`START.md` says the transported prisoner is arriving for census-and-excise release; immediate purpose is identity/release and player freedom without assuming a mandatory grand plot. `threads/release-processing.md` says the process is not complete and must not be fabricated as complete. Socucius is an official, not an NPC with automatically invented combat stats. The possible larger Vvardenfell pressure is **not canon** merely because a private file mentions it.

**Important negative:** the source currently has **no** `STORY_PROMPT.md`, **no** `STORYTELLER_PROFILE.md`, and no published proof that those path-based hooks work. Today the task uses a separately selected JSON profile. We are testing a future package convention, not claiming the source already satisfies it.

## Proposed target source additions (authoring exercise only)

A future properly authored preset could add:
- `STORY_PROMPT.md`: the source author's playable invitation, e.g. “You are a newly released prisoner arriving at Seyda Neen. Begin with the release procedure and allow the player to decide their own direction.” This is a sample proposal, **not verbatim current source** and not a replacement for pinned world facts.
- `STORYTELLER_PROFILE.md`: a bounded Markdown creative voice, perhaps “Grounded, curious, restrained. Let modest choices matter. Do not preordain grand destiny.” These are illustrative author instructions, **not executable privileges**.
- Both sources get explicit kinds, visibility and revisions in the authored package manifest. A creator override is still subordinate to pinned setting accuracy and admitted engine/safety/budget rules.

The current `START.md` and a future `STORY_PROMPT.md` have different jobs: source orientation versus inviting creative intent. They should not be concatenated into two competing mutable truths. On campaign creation, the generated campaign `START.md` must coexist with the source package's remapped `start/package.md`.

## Expected proposed launch trace

1. **Play:** accept the exact pinned authored source package and current player identity. No title, character field, profile dropdown or review step.
2. **Capture:** source root, world/rule references, authored intent if present, chosen default/effective profile, initial owner/source permissions, budget and first-story ID. Assert they remain unchanged after a mid-launch package update.
3. **Seed Workdesk deterministically:** ensure source orientation is present, preserve the five documents including private visibility, inject only the relevant small effective-profile core and necessary immediate scene material. No paid “preparation” round just to restate what's already there.
4. **Compose:** ask for a first situation *within* the prisoner's arrival, with distinct plausible intentions. Example only: cooperate with the registrar, ask about the release papers, or attempt an uncooperative departure. Do not force a quest or promise any action's success.
5. **Admit:** validate the scene and supported interaction. Preserve the release thread as unresolved and the larger pressure as private possibility. A mechanically admitted option is not an LLM-permission slip to transfer goods or bypass rules.
6. **Publish:** select one campaign root with accurate provenance and one first passage; attach a valid checkpoint only when supported by actual initial state. Do not declare historical forking available solely because a packet is archived or a root exists.
7. **Scene 2:** if the player obstructs release, the Storyteller reads the *current* committed release status, not just the original package's prose, and evolves the situation without inventing completed paperwork.

## Acceptance and negative checks

**Pass:** source profile (when authored and valid) is injected with exact hash, with **no profile-selection UI and no unnecessary tool read**. Source private possibility is never shown to the player as a fact. A successful launch contains one passage/source root even under identical request retry.

**Fail:** pre-opening prep fills a library with redundant lore; presented scene asserts “the player already received the papers”; model invents a destined hero; source/private files leak into public view; profile copied without source pin; “Play” still requires a typed character name or a separate review click.

**Historical collision:** existing start instantiation remaps source `START.md` to `start/package.md` when a generated campaign orientation already exists. The target resolver must explicitly know the source namespace before and after activation. A file called `STORYTELLER_PROFILE.md` cannot win by directory ordering if a campaign overlay has the same name.

## Suggested cost/quality outcome

For this fixture, **no model setup call should be the default**. The package author already supplied the scene constraints and immediate participants. Give the creative round an adequate source-grounded context. If a two-round process substantially improves the first two scenes *despite* this complete package, that is evidence to reconsider, not permission to spend twice everywhere.
