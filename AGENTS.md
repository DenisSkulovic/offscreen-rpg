# Repository entrypoint

Read [.agents/rules/working-agreement.md](.agents/rules/working-agreement.md) and [.agents/rules/spending.md](.agents/rules/spending.md) at the start of work. These rules apply across tools.

Before implementation or review, read [Code quality](docs/engineering/code-quality.md). Before running checks, read [Verification](.agents/rules/verification.md).

For significant features, cross-component changes or substantial reworks, use [feature-workflow](.agents/skills/feature-workflow/SKILL.md). Routine fixes and documentation edits do not require a feature folder.

Before tuning Storyteller quality, profiles, prompts, context or model routes, use [storyteller-tuning](docs/skills/storyteller-tuning/SKILL.md). Diagnose the owning layer and preserve a baseline before changing behavior.

Run `pnpm repo:brief` for compact Git/current-route/checkpoint orientation, then read [Progress](docs/progress.md) and use [Code navigation](docs/engineering/code-navigation.md) to locate the relevant flow and package guide. The brief supplements these sources; it does not replace required rule reads. Read only the relevant product and technical documents. The rules index and repeated-operation commands are in [.agents/README.md](.agents/README.md). Do not load every rule, skill and feature into context.
