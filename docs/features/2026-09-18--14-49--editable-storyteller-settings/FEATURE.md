# Mid-story storyteller customization and locked settings

Status: Connected authored slice implemented; broader feature acceptance remains partial. Checks not run. See the shared repair checkpoint.
Approval: On 2026-09-18 the owner authorized implementation of all four features and delegated the D&D baseline choice. Use SRD 5.2.1 (revised fifth edition), with explicitly authored activity extensions.

## Intended outcome

Allow the owner to switch DM presets or edit narrative tags/guidance while continuing the same character and world. Separate narrative preferences, mechanical permissions and clock controls. Support creation-time locked settings as an explicit alternative.

## Representative flow

After a quiet fishing evening, add absurd comedy or apply its preset. Review effective settings and save. History and earnings remain intact. The next uncommitted action uses the new creative revision; an already running activity finishes under its captured terms. A future cat encounter may adopt the comic style but is not guaranteed by the settings save. Return to melancholy later. A locked campaign explains which controls cannot change.

## Scope and boundaries

Versioned settings commands, preset application, private saved custom presets, catalogue/custom narrative tags, bounded guidance, precedence and lock enforcement. POC tag editing is storyteller-scoped; world/entity tag editor and instant mid-action creative replanning are deferred. Locked settings does not claim full Ironman/permadeath implementation. Provider selection, spend caps and tool permissions are not creative settings.

## Acceptance

- Editing/switching is available inside a live editable story and never rewrites earlier rolls, passages or admitted artifacts.
- Catalogue updates do not mutate saved custom settings; owner presets are private.
- Save shows effective values and when they apply, including in-flight activity/generation boundaries.
- Duplicate saves are idempotent; stale edits conflict; server enforces the creation-time lock.
- Custom narrative text never grants mechanical effects, executable tools or budget overrides.

## Decisions still needed

The proposed [playable DM loop](../2026-09-18--17-21--playable-dm-adjudication-loop/FEATURE.md) owns generated immediate adjudication. SRD 5.2.1 is selected; this is a subset, not a claim of full compatibility. Broader combat, autonomy and shared-world policies are outside these features.

## Owning specifications

- [D&D rules and agency](../../game-rules.md)
- [Storyteller customization](../../storyteller-settings.md)
- [Rules and activities](../../technical/rules-and-activities.md)
- [Settings and clock](../../technical/story-settings.md)
