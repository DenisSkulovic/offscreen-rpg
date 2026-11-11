# Config: shared TypeScript compilation policy

`@offscreen/config` exports one reusable TypeScript configuration at [typescript/base.json](typescript/base.json), referenced through `@offscreen/config/typescript/base`. It is **developer tooling configuration**, not runtime settings, secrets, player configuration or inference/model policy.

The shared baseline enables strict typing, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, ES2023 target and other compiler safety options. Package-specific `tsconfig.json` files choose their own module resolution, root/output directories and included files.

**Change discipline:** a compiler-setting change affects many workspaces. Inspect the actual consumers and their scripts first, agree the project-wide reason, then run proportionate checks. Don't weaken strictness to silence an unrelated code error or add a package README-sized manifesto inside JSON.

This package has **no build/test scripts**; it is imported by other packages as configuration. The [code-quality standard](../../docs/engineering/code-quality.md) and [coding-agent harness](../../.agents/HARNESS.md) distinguish coding rules from compile-time enforcement.
