# Repository entrypoint

Read [.agents/rules/working-agreement.md](.agents/rules/working-agreement.md) and [.agents/rules/spending.md](.agents/rules/spending.md) at the start of work. These rules apply across tools.

Before implementing or reviewing code, read [Code quality](docs/engineering/code-quality.md). Before running checks, read [Verification](.agents/rules/verification.md). Documentation, navigation and rule changes use [Documentation maintenance](.agents/rules/documentation.md); further task triggers are in the working agreement.

For significant features, cross-component changes or substantial reworks, use [feature-workflow](.agents/skills/feature-workflow/SKILL.md). Routine fixes and documentation edits do not require a feature folder.

Before tuning Storyteller quality, profiles, prompts, context or model routes, use [storyteller-tuning](docs/skills/storyteller-tuning/SKILL.md). Diagnose the owning layer and preserve a baseline before changing behavior.

Run `pnpm repo:brief` for Git/current-state/route orientation; add `--checkpoint` when resuming the selected gameplay plan. Its orientation comes directly from [Progress](docs/progress.md), so do not reread that same section. Read the coverage table only when relevant. Use the [documentation map](docs/README.md) for rediscovery and [code navigation](docs/engineering/code-navigation.md) to locate one flow and package guide. The brief does not replace required rule reads. The rules index and repeated-operation commands are in [.agents/README.md](.agents/README.md). Do not load every rule, skill, feature or large source file into context.
