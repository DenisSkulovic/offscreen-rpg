# AD04 operator shell evidence | 2026-11-14

**Change:** [AD04](../../changes/2026-11-14--admin-operator-shell/CHANGE.md). Provider spend: none.

## Commands run

- `pnpm --filter @offscreen/web exec vitest run src/features/admin/safe-control-destination.test.ts src/features/admin/player-lookup.test.tsx` → 5/5 pass.
- Player `safe-entry-destination` suite still green (control paths remain outside that allowlist).

## Behaviors proved (Vitest)

| Case | Result |
| --- | --- |
| `/control`, `/enter`, `/players`, `?ref=` allowlisted | accepted |
| External / `//` / `/stories` / path-traversal ref | rejected → `/control/enter` |
| Lookup authorized id | renders summary; commercial unsupported |
| Lookup unauthorized id | “No authorized match”; no token leak |

## Not claimed / residual

Production-like Playwright SSR/HTML privacy for `/control` not re-run: `@offscreen/web` `next build` typecheck still fails on pre-existing demo/presentation files. Nest Admin APIs remain covered by AD01–AD03 disposable suites.
