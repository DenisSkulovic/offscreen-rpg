# UX06 | Guided imagination, not a creation form

**State:** Proposed. **Approval:** no code is authorized; Cursor only after owner explicitly selects. **Kind:** frontend flow/refactor and tests. **Parent:** [experience program](../../experience/implementation-program.md), M2. **Dependency:** UX01.

## Cursor first-screen brief

> **Current-source map:** [Stories owner](../../../apps/web/src/features/stories/README.md); inspect draft-editor.tsx, draft-content.ts, opening-preview.tsx, storyteller-select.tsx and current draft routes.
> **Primary target:** [guided creation](../../experience/flows/creation-and-first-run.md#the-creation-pattern-guided-imagination-not-a-form).
> **Known trap:** Draft RHF fields can be dirty while Query has newer server values; a 409 cannot wipe the player's work. Opening generation and Start are separate captured, possibly costly durable commands.
> **Scope:** Proposed only. No paid model invocation, automatic generation, broad backend mechanics or destructive tests.

## Target and alternative

The user should choose **prepared story or custom premise → who/what they are → storyteller direction and meaningful play commitments → review → explicitly generate opening → review generated actual beginning → explicitly Start**. Prepared prisoner arrivals shouldn't demand contradictory starting locations. A sentient electrical storm should not be asked for a human race, profession or backpack.

Alternative: one enormous flexible configuration form, technically general but poor at evoking a life. A fully AI-interviewed creation flow is an interesting future idea but needs separate cost/latency contracts.

## Observable code result

1. Cohesive foundation choices and custom premise entry, using only **actually supported** start content.
2. Conditional perspective/role questions; fixed facts shown, not asked again.
3. Human-readable storyteller direction, while risk, initiative, canon invention, pace, autonomy and cost are kept semantically separate.
4. Concise review with edit-back navigation and explicit Save draft behavior.
5. Generated opening rendered as a readable preview; edits invalidate older candidate. Generation never starts merely by entering preview.
6. **Start** admits precisely the reviewed candidate and captured settings; no implicit clock running beforehand.
7. Failure and conflict recovery: draft dirty conflicts, stale candidate, lost acknowledgment, generation uncertainty and cross-tab updates.

Do not render a fake fully configurable risk or multiplayer option if the backend only admits current fixed policies.

## Authority and baseline

[Product story creation](../../story-creation.md), [Storyteller settings](../../storyteller-settings.md), [cost policy](../../technical/usage-policy.md), [UX flow](../../experience/flows/creation-and-first-run.md), [selected React form and command architecture](../../engineering/targets/react-next.md#5-forms-components-and-accessibility).

Expected code: apps/web/src/features/stories/draft-editor.tsx, opening-preview.tsx, storyteller-select.tsx, source-local components, Storybook/tests, existing route surfaces. Main baseline 8c91618 inspected 2026-11-13: RHF/Zod, expectedRevision save, frozen generation/Start intent, GET-first Start recovery. Reinspect current source before Ready.

**Preserve:** authenticated SSR, RHF dirty state and 409 recovery, frozen paid commands and existing candidate/Start identity. **Exclude:** character generator, new world simulation, model-on-input, spontaneous Storyteller calls, destructive integration runs and an unapproved back-end schema expansion.

## Acceptance and negative proof

**Normal:** a nonhuman character starts with no irrelevant human fields; prepared port arrival fixes its place; draft survives reload; user changes a role and candidate becomes stale; regeneration and Start are distinct explicit actions; no duplicate story on network recovery; 375px view and keyboard usable.

**Negative:** multi-tab save conflict doesn't erase unsaved text; preview reload doesn't spend generation again; an old candidate can't Start after a draft change; a lost Start ACK retrieves original story/receipt without new Start body; changing pace while Start uncertain can't mutate its frozen payload; storyteller intensity cannot secretly enable lethal risk.

**Evidence:** focused RTL state tests, Storybook long form/stale/error states, real browser narrow/wide inspection with keyboard, provider-free by default.

## Handoff

Owner reviews target and selected supported fields. Cursor maps destination steps to actual DTOs and reports unsupported settings before Ready; one bounded implementation, normal/negative proof and rendered screenshots.