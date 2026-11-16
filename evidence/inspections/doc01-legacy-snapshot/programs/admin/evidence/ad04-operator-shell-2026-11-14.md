# AD04 operator shell evidence | 2026-11-14

**Change:** [AD04](../../../../work/changes/archive/2026-11/admin/2026-11-14--admin-operator-shell/CHANGE.md). Provider spend: none.

## Commands run

- `pnpm --filter @offscreen/web exec vitest run src/features/admin/safe-control-destination.test.ts src/features/admin/player-lookup.test.tsx` → 5/5 pass.
- Player `safe-entry-destination` suite still green (control paths remain outside that allowlist).
- `pnpm test:focus admin-control-ssr` → 7/7 pass (disposable `offscreen_auth_test`, production `next start` + Nest + Playwright).

## Behaviors proved (Vitest)

| Case | Result |
| --- | --- |
| `/control`, `/enter`, `/players`, `?ref=` allowlisted | accepted |
| External / `//` / `/stories` / path-traversal ref | rejected → `/control/enter` |
| Lookup authorized id | renders summary; commercial unsupported |
| Lookup unauthorized id | “No authorized match”; no token leak |

## Behaviors proved (V3 SSR / Playwright)

| Case | Result |
| --- | --- |
| Anonymous `/control` | 307 → sign-in; no Command overview / Player 360 markers |
| Player-only `/control` | 307 → `/control/enter`; enter HTML has “Enter staff mode” only |
| Staff `/control` | 200, `Cache-Control: no-store`, Command overview + Player 360 link; Admin cookie value not echoed |
| Staff `/control/players?ref=` authorized | SSR includes “Authorized summary for” + scoped player id |
| Staff `/control/players?ref=` unauthorized | no authorized summary / player heading (typed ref may remain in input) |
| Foreign player + stolen Admin cookie | no privileged HTML |
| Playwright staff / player-only / post-exit | staff sees overview; player lands on enter; exit clears SSR privilege |

## Residual

Full V3 matrix items beyond this suite (stale-tab revocation races, keyboard a11y sweep, soft-nav Query isolation) remain optional follow-up. Nest Admin APIs remain covered by AD01–AD03 disposable suites.
