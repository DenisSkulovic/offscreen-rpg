# Tick and tag contracts

Status: exact tick arithmetic implemented; per-activity application chronology still needs the [shared-clock correction](solo-gameplay-contract.md#clock-correction-the-nearest-implementation-boundary), including world receipts across A → B → A. Tag correction pending. Creative settings still contain hard-coded `emphasis` and `surprises` enums and underspecified tags. Renaming those fields or moving those enums into a catalogue would not satisfy this contract.

## Simulation clock

The authoritative position is an integer tick. Action durations, recurrence cadences, deadlines inside the simulation and committed receipt positions use ticks. Zero-duration actions are explicit. A tick has no universal fictional duration and is not a demand to run code, persist a row or call a model on every tick.

Keep three separate contracts:

- Simulation: tick position, due tick, action duration, check cadence and interruption boundaries.
- Scheduling: a captured positive rational rate of ticks per real-time duration, real timestamp anchors, pause/hold state and retained fractional tick progress. Milliseconds are legitimate here because this measures the player's actual wait.
- Presentation: optional content-owned mappings and labels for fictional calendars or scales. Without a mapping, display ticks. Never infer an hour from species, prose or an action name.

Settle earned progress at the old rate before changing pace. Preserve the fractional remainder explicitly; repeated pause/resume or speed changes must neither discard it nor earn it twice. Process due checks in deterministic order, stopping at the first interruption. A batch-size cap limits work per transaction, not the duration of fiction. Real response allowances remain real deadlines, separate from simulation targets.

This pre-POC codebase supports one current clock contract. Prototype millisecond/hour schemas, decoders and data transitions are deleted instead of carried forward. Development databases may be reset when this schema changes. Never add a universal one-tick-equals-one-second assumption as a substitute for content-owned presentation.

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
