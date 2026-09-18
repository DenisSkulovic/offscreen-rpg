# Implementation plan

Feature: [Situation-dependent options and meaningful agency](FEATURE.md).
Execution scope: all phases authorized by the owner on 2026-09-18.
Implementation owner: Codex, explicitly assigned by the owner.

## Next implementation: bounded DM planning agent

Dependencies: tick action contract, isolated durable preparation, tag definition/application compilation. Mechanical selection/settlement stays authoritative. This is required POC work; the current consequence narrator only copies authored offers.

### Implemented immediate planning slice

The consequence task now selects a contextual subset of server-admitted immediate actions and supplies situation-specific labels and intentions. Validation rejects invented/duplicate action IDs and duplicate labels. Publication maps each selected ID back to its authoritative captured action and persists a fresh offer atomically with the narrated consequence. The offline source exercises the same contract by removing the just-selected action when alternatives exist. This creates an actual generation → offer → selection → mechanical consequence → fresh generated offer loop without extending the rejected duration model.

This is not yet the richer tool-using agent below. The complete current scene, character, receipts and admitted candidates are essential input and therefore require no retrieval tool. Additional evidence/rule inspection tools become useful when a planning task may need information outside that bounded capture.

### Phase 1: task and capabilities

Own a separate planning task with captured scene/revision, character capabilities/facts, selected intention, committed receipts, rules version and task-relevant creative guidance. Assemble essentials without tool round trips. Propose zero, one or several plausible intentions with declared constraints/evidence; no mandatory count or fake numeric agency score.

Enable bounded, story-scoped tools to retrieve additional committed passage evidence, inspect an implemented rule's schema/meaning, and validate proposed action packages. Application code owns schemas, executors and authority. Results carry evidence identities and the captured revision. No SQL, filesystem, arbitrary executable names, live dice tool or direct world-state writes. The resolver rolls once after the player selects admitted terms, never repeatedly during planning.

The output proposes prose plus typed immediate/timed plans and separately admitted scene facts. Validate provenance, prerequisites, supported rule/effect vocabulary, durations/cadences and fact introductions before publication. Prose alone cannot establish mechanically relevant state. Fact introduction needs an explicit proposal boundary: current fact-set effects only modify declared facts.

### Phase 2: durable bounded execution

Use an agent runner with a task-specific tool allowlist, persisted model/tool steps and finite round/tool/output budgets. Start with at most three model rounds and six read/validation tool calls per task, as execution policy rather than storyteller content. No model router, critic swarm or framework merely to name something an agent.

Every model round reserves and settles through the existing persistent run allowance. Persist responses before following steps; recover outputs and never resend an ambiguous paid request. Duplicate read tools are harmless; publication is scene-revision fenced. Invalid proposals, exhausted bounds or failures hold with explicit recovery, not hidden extra calls. A scripted transport supplies tool calls/results through the same runner and is labelled offline; it does not establish model behavior.

### Phase 3: connected game loop

Replace the authored-only handoff with validated planning output. Capture offered action terms, support read-only submenu navigation and submit offer/path identity. Immediate/timed resolution produces durable dice/effects and the next planning task, which adapts options to changed circumstances. Long activities remain deterministic between meaningful boundaries.

Exit: broad ordinary freedom, constrained threat, one viable response and legitimate hold use the same task/publication contract. Microbes require no money or mandatory location. Selection reaches committed consequence and a freshly proposed choice or activity. Quality still requires a later authorized live evaluation; valid JSON is not evidence of enjoyable play.

## Current checkpoint

The immediate generated-option loop is implemented on `main`. Contracts and AI build; the focused storyteller test passes 6/6, including selection plus fabricated/duplicate-ID rejection. Server typechecking reaches only two existing `story-command-policy.ts` exact-optional provenance errors after rebuilding database declarations; this pass does not chase them. Next, exercise the loop locally and then add the bounded evidence/rule-inspection runner only for planning cases that cannot be answered from the captured essentials. Do not generate timed work, travel or waiting plans until [activity processes and world-defined progress](../2026-09-18--16-48--activity-processes-and-progress/FEATURE.md) is approved and implemented. Provider spend is $0; cumulative usage is unverified.
