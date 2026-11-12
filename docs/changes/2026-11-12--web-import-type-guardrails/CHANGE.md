# Change W13: Next/React/TanStack ESLint and enforceable client/server boundaries

> **Cursor first look (current source ≠ selected target):** [Server/client boundary map](../../../apps/web/src/lib/README.md) → the **one** owning symbol. **Primary contract:** [F14](../../engineering/targets/react-next.md#f14-type-module-and-dependency-hygiene).  
> **Pre-investigated trap:** Existing strict TS/root ESLint already ban backend imports; add only missing React/Next/TanStack guards.  
> **Context rule:** read remaining scope/negative test in this packet; **not** the full audit, target, old minutes or adjacent Change folders.


**State: Done.** Owner authorized via continue after W11. All technology, behavior and security decisions are governed by the **[selected React/Next target](../../engineering/targets/react-next.md)**. **Audited source:** post-W11 `main` (`676f2e8`). CI web lint gate is `pnpm lint:web` (+ negatives); full-repo `pnpm lint` still carries unrelated script/tool debt.

**Depends on:** W02 W15 W06. W01 establishes test command.  
**Destination:** [F1–F15 selected architecture](../../engineering/targets/react-next.md), **F1 F7 F10 F14**. **Source evidence:** [November 12 target-to-code audit](../../engineering/audits/react-next-gap-2026-11-12.md), **G26 G32 G21**.

## Code outcome and owners

**Measurable code/test/config change:** Next/React/TanStack ESLint and enforceable client/server boundaries.  
**Start at:** `eslint.config.mjs` and quality config, `apps/web/tsconfig.json`, Next server-only reader, feature model/api/ui modules, existing `.github/workflows/code.yml`.

## Binding technical design

Keep existing TypeScript **strict**, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` and Prettier. Add compatible **eslint-config-next**, **eslint-plugin-react-hooks** and **@tanstack/eslint-plugin-query** recommended query/exhaustive-deps/stable-client rules, with type-aware rules where they prove actual error paths. Enforce `server-only` reader exclusion from client graph and feature cross-import boundaries; prevent browser imports of `@offscreen/db`/application/storyteller/workflows and cross-feature constants. Avoid linting unrelated monorepo code through incompatible plugin configs: scope React/Next/TanStack overrides to `apps/web/**`. Current `eslint.config.mjs` already bans many backend imports; extend, don't discard. CI existing workflow remains, provider-free.

## Bounded implementation steps

1. Add scoped plugins/rules with exact dependency lock, validate TS/import paths and no-circular cross-feature policy.
2. Add deliberate negative import/query-hook cases that static/build check rejects; fix only affected migration debt.
3. Wire lint/test/build to current CI and record baseline/passes, refusing blanket disable comments or all-source churn.

## Acceptance and verification

- **Normal outcome:** Web passes targeted React/Next/TanStack lint and strict typecheck/build with correctly scoped imports.
- **Discriminating negative case:** Client -> server cookie reader, unstable Query key and inappropriate cross-feature Client screen import are rejected with useful diagnostics.
- **Safe proof and evidence:** Targeted lint/build/typecheck, negative fixture, existing CI local dry run where permitted.
- **Must preserve / exclude:** No global style-reformat rewrite, new monorepo framework, forced React compiler, arbitrary rules unrelated to app.

## Handoff and stop rule

Cursor must apply this design and [frontend engineering skill](../../../.agents/skills/frontend-engineering/SKILL.md) without choosing replacement libraries, new gameplay behavior, a different UI design or another state authority. Typecheck/build and the smallest truthful normal+negative tests should run when explicitly authorized and safe. Inspect destructive integration scripts before any disposable DB reset. If source contradicts an approved invariant, report evidence rather than silently reinterpret the target. Return files/diff, tests actually run, failures, performance/side effects when relevant and next dependency. No automatic provider spend or deployment.
