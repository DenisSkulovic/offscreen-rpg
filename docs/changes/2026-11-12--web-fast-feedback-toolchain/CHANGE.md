# Change W20: Fast local frontend feedback and correct Turbo task caching

> **Cursor first look (current source ≠ selected target):** [Package/testing route](../../../apps/web/README.md) → the **one** owning symbol. **Primary contract:** [F10](../../engineering/targets/react-next.md#f10-evidence-and-maintainability).  
> **Pre-investigated trap:** Create separate `test:fast` graph; preserve old dist-dependent `test` semantics.  
> **Context rule:** this packet is the complete implementation authority; read its remaining scope/negative test, **not** the entire audit, target, old minutes or adjacent Change folders.


**Status:** Done (2026-11-12). **Purpose:** reduce real workstation and Cursor iteration cost without weakening important proof. **Dependency:** W01 Done. Evidence in minutes §27: dry-run excludes `@offscreen/web#build`; warm `pnpm test:fast` was FULL TURBO.

**Target:** F10, F14, F15 in [React/Next target](../../engineering/targets/react-next.md); [execution economics playbook](../../engineering/frontend-execution-playbook.md#3-local-toolchain-facts-already-investigated-source-inspected-only). **Observed sources:** `turbo.json`, root and `apps/web/package.json`, `packages/{game,application,documents}/package.json`, `apps/web/tsconfig.json`.

## Source-grounded problem

`turbo.json` has `test.dependsOn:["build"]`: the test in a package runs after that same package's production build. This would force `next build` before fast web Vitest if Cursor simply adds a web `test` script. Several legacy library test scripts also call their own `pnpm run build`. Blindly changing the shared task to `^build` risks stale `dist`, duplicate builds or CI regressions. `build.outputs` includes `.next/**` except `.next/cache/**`, and should exclude `.next/dev/**` to avoid caching runtime dev output.

## Binding design

1. **Preserve legacy `test` semantics** until explicitly proved otherwise. Add a *separate* `test:fast` Turbo task with `dependsOn:["^build"]`, `outputs:[]`. W01 creates `@offscreen/web test:fast` using Vitest. The no-build inner-loop path is directly invoking Vitest with `pnpm --filter @offscreen/web exec vitest run <actual-test-file>` after workspace dependencies are already built.
2. Add a root alias only if it measurably removes friction. Confirm `turbo run test:fast --filter=@offscreen/web --dry=json` has dependency builds but **not** `@offscreen/web#build`. Keep required workspace build order.
3. Keep Next 16's built-in Turbopack dev caching; **no new bundler or experimental flags**. Reuse pnpm store, `node_modules`, `.turbo`, `dist`, `.next/dev` and TypeScript incremental artifacts across normal edits. Do not clean/install without demonstrated corruption or dependency change.
4. Preserve pinned Node 24.19/pnpm 11.19 and cross-platform scripts. No forced CPU worker limit. Only selectively add ESLint disk cache after evidence it saves time and invalidates correctly.
5. Minimize complexity. A small Turbo/config/script delta is superior to a custom task runner.

## Bounded implementation and verification

- Edit `turbo.json`, root/web package scripts (post-W01) and only minimal documentation/tool script as needed. No application behavior changes.
- Confirm existing dist-dependent `pnpm test` still runs as before, and the new web test path avoids producing a Next production build.
- **Normal case:** focused Vitest runs quickly without booting Next/Nest/DB/Temporal; warm rerun uses correct dependency cache.
- **Negative case:** changing a contracts package invalidates relevant builds; an unrelated React test edit does not rebuild Next; legacy dist tests do not use stale emitted JavaScript.
- **Evidence:** compare dry-run task graph and actual cold/warm timings/cache hits; record unrun status honestly. No provider work, destructive DB reset, Docker startup or CI billing.

**Cursor handoff:** use exact paths above and the [fast command cookbook](../../engineering/frontend-execution-playbook.md#5-command-and-cache-cookbook). One measured local task graph correction, no general monorepo migration or source-format churn.
