# SA02 | A profile-faithful task prompt without universal taste defaults

**State: Proposed / design-complete 2026-11-14. No code authorization.** [SA program](../../storyteller-architecture/implementation-program.md). Focused compiler/validator change, **not** an engine rules expansion.

## Cursor first-screen brief

> **Outcome:** task-specific prompts preserve selected creative profile and captured mechanical authority without hardcoded “2–5 exciting options”, immortal characters, or irrelevant schema/instructions in report tasks; old `storyteller.v16` tasks still decode and publish.
>
> **Authority:** [constitution](../../storyteller-architecture/vision-and-quality-constitution.md), [prompt layers and tensions](../../storyteller-architecture/prompt-tools-and-models.md#prompt-errors-to-remove-from-common-authority), [versioned task source](../../storyteller-architecture/evidence/current-flow-audit-2026-11-14.md#trace-d-actual-storyteller-task-construction-and-what-the-model-sees).
>
> **Source:** `packages/storyteller/src/tasks/index.ts::requestFor/prepareStorytellerTask`, `packages/storyteller/src/tasks/result-validation.ts::validateStorytellerResult`, `packages/storyteller/src/profiles/index.ts`, `packages/storyteller/src/tasks/task-contracts.ts`, existing `packages/storyteller/test/storyteller.test.ts`.

## Chosen design / implementation scope

1. Replace universal text saying character can *never* die with “Respect the **currently captured and supported** nonlethal/risk policy; don't invent a lethal result.” **Do not add a lethal policy or change game capabilities**. Tests prove existing nonlethal mechanics unchanged and guard against future eternal life prompt contradiction.
2. Remove general always-2–5 choice pressure, let valid next choices match current task/authorized contract. Retain strict schema constraints; do not accidentally allow a current scene with zero **mechanically required** player offers. A legitimate quiet/held state must use existing supported semantics, not fake empty menu.
3. Deduplicate task prompt into small role-specific authority/creative/result instructions, preserving stable important common rules and all current exact evidence/plan effect restrictions. Historical report has no current choice planner; one-shot vs memory-read tool policy stated explicitly.
4. Do not smuggle user tier into tone, or make one profile default funny/sad by common rule. Preserve exact chosen profile, prompt hash and output schema version; consider a **new prompt version (e.g. v17)** if serialization changes. Old pending/succeeded v16 tasks use their stored compiled request, not recompiled by new defaults.
5. Add provider-free gold packets: quiet, comic, nonhuman, failed persuasion, post-receipt, report, no-choice-held and old v16 replay. Measure packet bytes and schema sections to catch universal prompt inflation.

## Acceptance / negative

**Normal:** identical mechanics with different profile produce task packets expressing intended creative direction; one reasonable next action allowed where safe; historical report cannot offer current action; old task output remains valid.

**Negative:** no accidental permission for death, inventory gift, reroll or instant earning; schema cannot be loosened to pass quiet fixture; instructions from fictional source cannot override system; creative profile doesn't create new paid tool privilege; old v16 does not regenerate unexpectedly.

**Proof:** `pnpm --filter @offscreen/storyteller build`; `pnpm --filter @offscreen/storyteller test`; `pnpm storyteller:packet-audit`; no model/DB required. Show exact prompt diff, output-schema hash and legacy compatibility tests. **Out:** GM04 option anti-spam mechanics, new actor/risk model, full prompt quality A/B paid calls, native tools.
