# Tick and tag contracts

Status: exact arithmetic and the campaign-owned application clock are implemented. Activity receipts now map retained effort onto monotonic world ticks across A → B → A; persisted/runtime acceptance remains narrower than the full connected session. Tag correction pending. Creative settings still contain hard-coded `emphasis` and `surprises` enums and underspecified tags. Renaming those fields or moving those enums into a catalogue would not satisfy this contract.

## Target: one real-second tick

The [product requirement](../time-and-autonomy.md) now fixes one tick to one real second. Speed is fictional seconds advanced per eligible tick, not a configurable tick period. This section is the unimplemented redesign contract; the following simulation-clock section describes current code, not the target definition of tick.

Keep canonical elapsed game time, admitted durations, cadence and deadlines in a stable fictional coordinate with explicit units. In-game seconds are available without a calendar; choose exact subsecond representation for microscopic cases before implementation. The Storyteller proposes fictional effort/duration under the world/rule context, never real wait or tick count. Code validates the proposal and derives waiting from speed.

For remaining fictional duration D and speed S fictional seconds per tick, estimated active real seconds are D/S; a whole-tick display can use ceil(D/S). Rounding a display must not add fictional effort or push settlement through an earlier event. At a speed change, settle earned fictional progress at the old rate, preserve its fractional remainder, then derive the remaining wait at the new rate. Store fictional targets, not immutable real-tick completion targets. An example thirty-minute action at 360 fictional seconds per tick takes five real seconds; at 180 it takes ten, with the same fictional deadline/check boundaries.

Accepted-execution permission, pause/decision/generation holds, no idle catch-up, exactly-once consequences and early/late narration rules remain unchanged. Paused or ineligible seconds contribute no fiction. A one-second tick does not require a database write, RNG draw, model request or background job every second; ordered boundary scheduling may batch elapsed time. Instant mode, subsecond completion rounding and the smallest accepted fractional unit need an explicit decision in the implementation slice, not accidental inheritance from old fields.

The next design slice must trace mechanical openings and consequences, narrative `gameDurationMs` intervals, activities and accepted plans, calendar/world obligations, persisted anchors, settings/speed changes, worker wakes and public estimates. Replace disposable prototype schemas together; do not merely rename `durationTicks` while retaining its old meaning. Contrast Seyda travel/dialogue, an interrupted work commitment and calendar-free microscopic activity. A stronger model does not fix the missing contract.

## Simulation clock — current implementation

The current authoritative position is an integer simulation tick. Action durations, recurrence cadences, fictional deadlines and committed receipt positions use ticks. Its fictional scale, where supplied, stays fixed within the campaign independently of pace. This existing coordinate is not one real second. Finite action timing and eligibility are implemented under [committed time](committed-time.md). The target above replaces these unit semantics without discarding execution authority.

Keep three separate contracts:

- Simulation: tick position, due tick, action duration, check cadence and interruption boundaries.
- Scheduling: a captured positive rational rate of ticks per real-time duration, real timestamp anchors, pause/hold state and retained fractional tick progress. Milliseconds are legitimate here because this measures the player's actual wait.
- Calendar/duration interpretation: optional content-owned fixed units or date rules and an epoch. Custom months are not a fixed multiplier. Without a definition, display elapsed ticks/cycles. Never infer an hour from species, prose or an action name. [Calendars and world time](calendars-and-world-time.md) owns conversion; consequential seasons/deadlines are separate admitted world obligations.

Progression additionally requires accepted execution. No active commitment means no projection from elapsed wall time, even with an empty hold list. One-second countdown refreshes may display progress but grant no additional checks or time. See the committed-time contract for boundary caps and preparation latency.

Settle earned progress at the old rate before changing pace. Preserve the fractional remainder explicitly; repeated pause/resume or speed changes must neither discard it nor earn it twice. Process due checks in deterministic order, stopping at the first interruption. A batch-size cap limits work per transaction, not the duration of fiction. Real response allowances remain real deadlines, separate from simulation targets.

This pre-POC codebase supports one current clock contract. Obsolete schemas and compatibility decoders are removed rather than carried forward; development databases may be reset. The new real-second tick must remain distinct from the canonical fictional-time coordinate and optional calendar presentation.

Supported mechanical formats are the current strict schemas in `packages/game/src/activities.ts` and `immediate-actions.ts`; version fields fence malformed or stale local data, not maintained backward compatibility. The next clock/identity slice replaces disposable prototype formats rather than maintaining older versions.

New pace data is `{kind: 'rate', ticks, realMs}` or `{kind: 'instant'}`. Persist earned whole ticks plus a reduced rational tick remainder (decimal integer strings), independently of the resolved-boundary cursor. Integer arithmetic preserves that remainder across any supported rate changes. If a control encounters a backlog beyond one batch, commit that batch, continue catch-up and return a conflict/refresh instead of acknowledging an unapplied control. No speed change can discard that backlog or grant completion effects ahead of it. Only an actual interruption discards earned progress beyond its boundary. Real scheduler wakes may be capped for platform timer limits without capping simulation duration.

## Tag definitions and applications

A tag definition has a namespaced identity, revision, display label, description, supported target scopes and explicit semantics. A tag application identifies its target and captures the definition revision plus any validated value. Definitions and applications are separate: the meaning of a tag is not the identity of the entity carrying it.

Supported scopes are architectural target kinds, such as storyteller, character, location and activity. They are not a closed list of story themes. The POC editor may initially expose storyteller scope while the contract keeps scope explicit. A saved preset carries definition snapshots and applications; changing a catalogue later cannot alter an existing campaign.

There are two authority classes:

- Narrative guidance: meaning, task applicability and optional values supplied to the relevant storyteller task. It can express tone, interests, rhythm or preferences. Custom definitions are allowed within input budgets. The name or description does not mutate world state.
- Mechanical annotation: a reference to an implemented, versioned rule with a validated parameter schema and declared applicable targets. Unsupported references are rejected. A custom narrative tag cannot promote itself into this class or acquire tool permissions.

Parameter shape belongs to a definition, not to global fields such as `surprises`. A definition may be valueless, textual, numeric or a declared choice. Numeric ranges, units and choices must be explicitly defined where applicable. Do not implement every possible parameter editor merely to claim extensibility; unsupported shapes remain unavailable rather than being coerced into strings.

Catalogue and private custom definitions use the same application contract. Editing a definition creates a revision; revising catalogue content privately creates a private definition. Store the full accepted snapshot. Reject duplicate applications, unsupported scopes, malformed parameters and declared incompatibilities. Conflict groups belong to definitions. Arbitrary semantic contradictions in free text cannot be proven absent by a validator.

Preset defaults and explicit campaign overrides must have a stated merge rule: overrides replace matching definition applications, removals suppress inherited applications, and unrelated applications coexist. Applying a preset shows the resulting effective configuration before saving. It does not replace clocks, permissions or established facts implicitly.

## Context compilation and authority

Compile only definitions applicable to the task and target. Preserve their identity, revision and meaning in the captured task context. Application invariants, supported rules and authoritative state outrank narrative preferences. Tags never select executable functions by their names. Tool availability remains application-owned.

A preference for fewer disruptions is guidance to the DM. It is not automatically an encounter probability. A mechanical probability policy is separate, explicit content with an implemented rule. This distinction must appear in the editor; a text preference cannot be labelled as a working encounter-frequency control.

## Acceptance traces

- Human routine: authored calendar presentation may call an interval five hours; its plan and receipts still use ticks.
- Microbe: short environmental cycles use the same tick contract with no mandatory calendar or wallet.
- Distributed consciousness: long or parallel fictional processes do not imply a human time scale or one model call per tick.
- Mid-story tone change: revised narrative applications affect newly admitted task context without changing committed facts, pending rolls or captured tasks.
- Custom tag: its scoped meaning reaches the intended task; unknown mechanical semantics cannot change effects.

The tick slice now changes persistence, admission, arithmetic, context and UI coherently. Pure arithmetic checks do not certify the connected application flow. The tag acceptance traces remain design requirements, not implemented behavior.
