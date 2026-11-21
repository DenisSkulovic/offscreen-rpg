# CQ05 | executable acceptance matrix (offline)

| Fixture | Expected |
| --- | --- |
| 34 direct TS source files + tests/fixtures in one directory | no direct-file threshold crossing |
| 35 direct TS source files (and no children) | directory review signal |
| 63 flat files in `packages/application/src/storyteller` | reported hotspot, not default command failure |
| 1,199-line file → 1,201 | new severe threshold crossing under `--strict-new --base` |
| Already-large 1,500-line file → 1,510 | warning, **not** newly crossed severe threshold |
| 600-line file → 780 lines (+180, +30%) | significant growth regression |
| 600-line file → 730 (+130) | not a 150-line growth regression; still ordinary size warning |
| Missing or shallow/unresolvable baseline | `baselineAvailable:false` and nonzero exit for strict-new, not success |
| Deleted tracked file | absent; don't count or read nonexistent pathname |
| Untracked legitimate new TS source | included; ignored/generated files excluded |
| Path containing spaces/non-ASCII | `-z` Git enumeration round-trip intact, no shell injection |
| Multi-line nested arrow, switch and try | AST function length/control-flow nesting measured, not regex brace estimation |
| Typed `as`, non-null assertion and `any` | counts distinguish TS syntax, no security finding automatically |
| Repeated invocation on same snapshot | stable order, same JSON counts, no filesystem changes |
| Repository root without Git | explicit failure, no misleading zero findings |

**Local test sequence:** `pnpm repo:code-health:test`; `pnpm repo:code-health`; `pnpm repo:code-health --json` (assert schema/direct count); `pnpm repo:code-health --base undertaking/storyteller-workshop`; `pnpm --filter @offscreen/application typecheck` only if affected source changed (not expected); changed-file Prettier / quality ESLint for the new scripts. No Docker, provider or network required. Keep fixtures local/temp and delete safely.
