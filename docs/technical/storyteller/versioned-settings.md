# Versioned story settings and clock policy

**Selected contract (binding).** Every published scene can identify the effective creative guidance, writing-skill revisions and typed mechanics/clock policy that governed it. Creative guidance follows historical/fork semantics; runtime authorization and spend permissions are freshly checked and are never inherited merely because a document says so. A settings save writes a new revision for work prepared after it; it never changes a task, offer, plan or arrival that already captured an earlier revision, and it grants no permission, money or provider call.

**What is realized today.** [Current adapters](#current-adapters) records the shipped routes, the editor boundary and the known gaps. Canon-invention ceilings, story overrides and the tag/world editor are selected design, not active behavior. Read the selected headings below as policy and persisted-format compatibility, and Current adapters as the dated realization record.

Design and current implementation boundary for [editable presets](../../product/storyteller/profiles-and-settings.md). Existing story/task profile snapshots remain provenance; explicit settings commands add subsequent revisions. Preserve that initial snapshot as provenance while adding explicit subsequent revisions; do not mutate old generation artifacts.

**Route:** [what a later edit may change](#captured-revision-and-a-later-edit) · [revision command and authorities](#data-and-commands) · [canon invention policy (selected, not active)](#canon-invention-policy) · [clock and speed](#clock-and-speed) · [current adapters and editor limits](#current-adapters). Effective spending stays in [Distinct authorities](../platform/spending-and-entitlements.md#distinct-authorities).

## Captured revision and a later edit

Admission copies the settings revision the task may use. A later save writes a new revision for work prepared after that save.

| Work already in progress | What the later save may change |
| --- | --- |
| An existing offer, an admitted model task, its retry, a mechanical plan, or a prepared arrival | Nothing. Each keeps the revision captured with it. |
| A valid in-flight result | Nothing. The save does not discard it or regenerate it for a new tone. |
| The next task prepared after the save | The new revision, including creative fields that revision actually stores. |

[Changes during play](../../product/storyteller/profiles-and-settings.md#changes-during-play) owns the player meaning. [Data and commands](#data-and-commands) owns the revision command. [Current adapters](#current-adapters) says canon-invention ceilings and the tag editor are not active, so [Canon invention policy](#canon-invention-policy) stays selected design. Pace stays in [Pace](../../product/gameplay/time-and-autonomy.md#pace). A settings save does not reserve money or open a provider call.

Negative: a changed creative profile does not override the permissions captured for an existing attempt, and a settings save never rewrites the plan an admitted task captured.

## Data and commands

Versioned settings are split by authority instead of collapsed into one JSON profile.

- **Creative profile:** voice, taste, pacing preferences, narrative initiative and other writer-facing guidance. A historical scene pins the effective revision.
- **Writing skills:** optional versioned craft procedures/examples available to the Storyteller. A mission records which skill revisions materially informed the work where useful for audit/history.
- **World/rule configuration:** typed capability and mechanics packages selected for the story. These constrain executable effects and are not editable by prompt text.
- **Clock/autonomy policy:** typed authority for time, holds, accepted plans and unattended progression.
- **Resource/spend policy:** operational authorization for provider/tool/delegation use. This is checked for each new mission/branch and is not a creative document.

Prepared-experience customization produces a captured effective configuration. A fork retains the historical creative/rule pins needed to understand the selected scene while obtaining fresh account/security/spend authorization for new work.

## Canon invention policy

**Status: selected design, not implemented** (see [Current adapters](#current-adapters)). Absence of a stored permission is not a grant: where no matrix is captured, no domain is treated as `broad-invention`, and the missing control is a known evaluation blocker, not a default.

Store a typed five-domain matrix on the story settings revision using the ordered permissions `reference-only`, `compatible-additions` and `broad-invention`. The domains are `characters-and-agents`, `places-and-routes`, `groups-and-institutions`, `world-elements` and `history-and-cosmology`. These categories classify descriptive authority only; they do not define a universal entity model or imply that every world contains each kind.

Each pinned world package supplies maximum permissions. A package-free custom foundation stores an explicit world ceiling with its accepted setup; there is no engine-wide fallback permission. A start package may narrow the ceiling, and the story settings revision supplies the player's requested permissions. Resolve the effective matrix by taking the strictest value per domain. Multiple mounted worlds must agree explicitly; package order is not authority. A setting update may narrow or later widen the story request only within the still-pinned ceilings, subject to the existing settings lock. It affects tasks prepared after the revision and never rewrites current canon.

Every Storyteller task captures the effective matrix and the settings/world revisions that produced it in a stable context section. Do not translate it into temperature. Exploration allowances control how much evidence may be inspected; they do not widen invention permission. If a reference-only task lacks a consequential fact, retrieval may load it, otherwise the result must avoid depending on it or hold.

The first admission slice should require every newly created descriptive document to declare its invention domain and whether it is sourced promotion, compatible addition or broad invention. The provider-facing schema can remove disallowed declarations from the task interface, while ordinary semantic validation remains defense in depth. A sourced promotion may register a subject already established by supplied evidence without consuming invention permission. An invented durable record cites the passage that established it and records the effective permission used; it never fabricates a world-library source. Revisions of existing records remain constrained by current canon and their own evidence rather than being treated as fresh invention.

This structure cannot prove by string inspection that narration contains no unsupported fact. Do not parse prose or pretend a validator can establish semantic truth. Prompt contracts, document-change admission, exact packet inspection and contrasting long-run evaluation provide progressively stronger evidence. A strict-policy anti-example should deliberately tempt the model with famous but unloaded lore; an open original-world contrast should require useful local invention. Both use the same engine and mechanical authority.

## Clock and speed

One scheduler step is fixed at one real second and speed selects fictional seconds per eligible real second. The [fictional-time contract](../engine/ticks-and-tags.md#fixed-real-second-scheduling-and-fictional-time) owns conversion and rescheduling.

Represent pace as `{kind: rate, fictionalSeconds, realSeconds}` or explicit `instant`. Canonical action durations, cadence, horizons and world obligations use fictional seconds. Current UI choices map those fictional seconds onto fixed real-second scheduling; optional calendars remain content projections. The [chronology contract](../engine/chronology-and-activities.md) gives in-world actions explicit durations and gates advancement on accepted execution. Menu navigation, reading and excess model latency consume no fiction. Event density and response deadlines are separate policies.

For an active mechanical execution, anchor earned fictional seconds to database real time, with held/running state and a control revision. Only the application commits elapsed progress and effects. On an authorized speed change, lock the story, settle eligible elapsed boundaries under the old rate, retain whole game seconds plus a reduced rational remainder, then set the new anchor/rate and recompute the next wake. Increment control revision so stale timers cannot advance twice. Paused time earns no game time; changing speed while paused only changes the rate used after resume.

A creative preset change and a clock reschedule are separate commands. Default settings saves leave active waits alone. The speed UI explicitly says whether it changes the current mechanical activity. Narrative prepared waits are a separate current protocol and retain their announced due time.

Instant processes supported mechanics to the next meaningful decision, interruption or completion; it cannot bypass costs, checks, permissions, provider budgets or holds. It is not permission for endless unattended play. Response windows in the POC hold fiction and use a separate real-time allowance where present; changing speed never shortens an already published response deadline. Combat rounds/reactions need their own later scheduling policy, not a universal activity cadence.

See [mechanics and capabilities](../engine/mechanics-and-capabilities.md) for due-segment execution. Existing timing descriptions remain accurate for their fixed-duration protocol; the new mechanical activity clock is implemented alongside that protocol.

## Current adapters

Authenticated routes: `PUT /stories/:id/settings/:operationId`, `GET /stories/:id/settings`, `PUT /stories/:id/actions/:operationId`, and `PUT /stories/:id/activity-controls/:operationId`. Private preset save/list and public-default projections are under authenticated `/stories/presets` routes. Start accepts optional campaign configuration; explicitly selected pineapple and microbe content enable their captured character/action menus. No old narrative story is automatically enrolled in mechanics.

Creative task context captures the full settings revision separately from the compiled profile. Private preset application uses its saved profile snapshot. Catalogue defaults replace creative settings only; typed risk/rules remain the nonlethal subset. The lock currently fixes all creative fields and speed as one explicit choice; per-field lock editing and full Ironman remain later scope. Initial pace is selectable before Start. In-play speed controls reschedule an active mechanical activity and set the subsequent default; narrative prepared waits keep their own deadlines.

The tag/editor portion remains incomplete: the existing global emphasis/surprises fields and id/description pairs do not satisfy [the definition/application contract](../engine/ticks-and-tags.md). Canon-invention ceilings, story overrides, task capture and document-change classification are also not implemented. Do not use this document as evidence that those semantics are active. Old campaigns are inspectable without rewriting their settings into the new pace schema.

### Recorded legacy product observation: editor boundary

*Provenance: transferred from [Profiles and settings, Current implementation boundary](../../product/storyteller/profiles-and-settings.md#current-implementation-boundary) (PD05). This is a recorded legacy product observation of the shipped live-story editor, not newly verified UI behavior and not a feature qualification. The product page keeps its own copy until the product successor step.*

The live-story editor supports catalogue presets, private saved presets, emphasis, encounter frequency, up to 16 custom narrative tags and four guidance snippets. Settings history exposes the latest 20 revisions. Existing profiled stories project their original settings until the first explicit update persists revisions. New stories can lock creative and speed settings before Start; pause remains available.

The offline source does not improvise from arbitrary text: creative configuration is stored and included in bounded generated-task context, including the mechanical consequence task. Its offline narrator repeats saved outcomes; it has no special profile voice or absurd-comedy tag branch. Unknown custom tags carry no mechanical effect. Mechanical modifiers and event thresholds belong to captured action content; a world-tag editor is not implemented. Mid-activity pace changes are separate controls.

The current editor does not yet expose narrative initiative, a campaign narrative-direction revision or canon-invention permissions. Existing emphasis, encounter-frequency and guidance fields are not silently reinterpreted as any of those authorities. Current tasks therefore receive canonical material without a captured per-domain answer for how freely gaps may be filled; this is a known blocker before meaningful long-run evaluation in a private or sparsely documented world. No per-domain permission exists today, and this page selects no new defaults.

**Source scope.** `GET /stories/:id/settings` and `PUT /stories/:id/settings/:operationId` exist in `apps/api/src/modules/stories/controllers/story-reads.ts` and `story-commands.ts`. Their existence shows the revision route is present; it does not establish that the whole editor, preset catalogue or lock behavior above is qualified.
