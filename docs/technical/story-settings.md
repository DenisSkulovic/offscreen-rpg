# Versioned story settings and clock policy

Design and current implementation boundary for [editable presets](../storyteller-settings.md). Existing story/task profile snapshots remain provenance; explicit settings commands add subsequent revisions. Preserve that initial snapshot as provenance while adding explicit subsequent revisions; do not mutate old generation artifacts.

## Data and commands

Store immutable story settings revisions, an active revision reference and the creation-time lock policy. Capture the preset identity/revision, resolved creative fields, custom tag definitions/snippets and separate typed mechanical/clock policies. Copy referenced catalogue content into the revision so a catalogue edit cannot change a saved story. Store private reusable presets under owner identity; another story receives its own snapshot when one is applied.

Use a story-owned settings update command with a stable operation ID and expected settings revision. Under the existing story lock, check owner and lock policy, validate the complete effective configuration, write a new revision and receipt, and increment view version without inventing a narrative passage. Repeated identical commands return the saved result; mismatched reuse or stale edits conflict. Show a settings history entry outside fictional prose, including the effective boundary. Public DTOs expose the owner's editable guidance and effective settings, not runtime system prompts or provider policy.

Initial editor limits: 16 narrative tags, descriptions up to 400 characters, 4 custom guidance snippets up to 1,200 characters each, with the compiled request still subject to its existing 48 KiB cap. Known mutually exclusive tags use declared conflict groups. Custom tags remain descriptive; mechanical rule references must come from supported definitions. Store structured fields, not one concatenated prompt. Compile only relevant settings into each task, with fixed task rules above player guidance. No dynamic tool permissions from tag text.

Creative revisions affect newly prepared storyteller tasks after the settings save. Existing offered mechanical terms remain pinned; admitted model tasks, retries, mechanical plans and prepared arrivals retain their captures. A later consequence narration is a separate task and captures the then-current creative revision. A settings update does not stale a valid in-flight result by itself: source fences must separate settings revision from narrative/world revision. A setting cannot mutate another field indirectly (for example comedy cannot enable death or accelerate the clock). A future explicit refresh may replace an untouched menu, but the initial editor does not generate on save.

Profiled stories initialize settings revision 1 from the saved snapshot, never the latest catalogue definition. Separate narrative fixtures use their explicit contracts. Incompatible pre-POC data is reset instead of decoded through compatibility paths. Locked settings are chosen at Start and enforced on every write path.

## Clock and speed

Represent pace as `{kind: rate, ticks, realMs}` or explicit `instant`. Simulation ticks have no universal fictional scale; any campaign mapping is independent of speed. Current UI choices are one tick per real minute, one tick per real second, ten ticks per real second, and instant. Calendar-based presentation requires explicit content data and is not implemented. The [committed-time correction](committed-time.md) gives short in-world exchanges explicit durations and gates all advancement on accepted execution; current immediate actions still spend zero ticks. Menu navigation, reading and excess model latency consume no fiction. Event density and response deadlines are separate policies.

For an active mechanical activity, anchor earned simulation ticks to database real time, with held/running state and a control revision. Only the application commits elapsed progress and effects. On an authorized speed change, lock the story, settle eligible elapsed boundaries under the old rate (bounded batches, holding further changes until catch-up completes), retain whole ticks plus a reduced rational tick remainder, then set the new anchor/rate and recompute the next wake. Increment control revision so stale timers cannot advance twice. Paused time earns no game time; changing speed while paused only changes the rate used after resume.

A creative preset change and a clock reschedule are separate commands. Default settings saves leave active waits alone. The speed UI explicitly says whether it changes the current mechanical activity. Narrative prepared waits are a separate current protocol and retain their announced due time.

Instant processes supported mechanics to the next meaningful decision, interruption or completion; it cannot bypass costs, checks, permissions, provider budgets or holds. It is not permission for endless unattended play. Response windows in the POC hold fiction and use a separate real-time allowance where present; changing speed never shortens an already published response deadline. Combat rounds/reactions need their own later scheduling policy, not a universal activity cadence.

See [rules and activities](rules-and-activities.md) for due-segment execution. Existing timing descriptions remain accurate for their fixed-duration protocol; the new mechanical activity clock is implemented alongside that protocol.

## Current adapters

Authenticated routes: `PUT /stories/:id/settings/:operationId`, `GET /stories/:id/settings`, `PUT /stories/:id/actions/:operationId`, and `PUT /stories/:id/activity-controls/:operationId`. Private preset save/list and public-default projections are under authenticated `/stories/presets` routes. Start accepts optional campaign configuration; explicitly selected pineapple and microbe content enable their captured character/action menus. No old narrative story is automatically enrolled in mechanics.

Creative task context captures the full settings revision separately from the compiled profile. Private preset application uses its saved profile snapshot. Catalogue defaults replace creative settings only; typed risk/rules remain the nonlethal subset. The lock currently fixes all creative fields and speed as one explicit choice; per-field lock editing and full Ironman remain later scope. Initial pace is selectable before Start. In-play speed controls reschedule an active mechanical activity and set the subsequent default; narrative prepared waits keep their own deadlines.

The tag/editor portion remains incomplete: the existing global emphasis/surprises fields and id/description pairs do not satisfy [the definition/application contract](ticks-and-tags.md). Do not use this document as evidence that those semantics are implemented. Old campaigns are inspectable without rewriting their settings into the new pace schema.
